import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import {
  buildSafeFfmpegArgs,
  buildTwoPassFfmpegArgs,
  shouldUseCpuTwoPass,
} from '@/lib/ffmpeg/converter';
import { checkConversionRequestEntitlement } from '@/lib/entitlements';
import { ConversionOptions } from '@/lib/types';

export function getFfmpegBinary(): string {
  const candidates = [
    'C:\\Users\\USER\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.1-essentials_build\\bin\\ffmpeg.exe',
    'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
    'ffmpeg'
  ];
  for (const c of candidates) {
    if (c !== 'ffmpeg' && fs.existsSync(c)) {
      return c;
    }
  }
  return 'ffmpeg';
}

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  let tempInputPath: string | null = null;
  let outputPath = '';
  const url = new URL(req.url);
  const wantsStream = url.searchParams.get('stream') === 'true' || 
    (req.headers.get('accept') || '').includes('application/x-ndjson');

  try {
    const contentType = req.headers.get('content-type') || '';
    let inputPath = '';
    let outputDirectory = '';
    let options: ConversionOptions;
    let customFileName = '';
    let originalBaseName = '';
    let clientDurationSeconds = 0;

    if (contentType.includes('multipart/form-data')) {
      // Browser file upload mode (local staging on disk)
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const optionsRaw = formData.get('options') as string | null;
      outputDirectory = (formData.get('outputDirectory') as string) || '';
      customFileName = (formData.get('customFileName') as string) || '';
      const durStr = formData.get('durationSeconds') as string | null;
      if (durStr) {
        clientDurationSeconds = parseFloat(durStr) || 0;
      }

      if (!file) {
        return NextResponse.json({ success: false, error: 'No file provided in form data' }, { status: 400 });
      }

      options = { outputFormat: 'mp4', quality: 'high' };
      if (optionsRaw) {
        try {
          options = JSON.parse(optionsRaw);
        } catch {
          console.warn('[convert] optionsRaw was invalid JSON, using defaults');
        }
      }

      // Write uploaded file into a temporary local file for FFmpeg to process
      const stagingDir = path.join(os.tmpdir(), 'vimora_staging');
      if (!fs.existsSync(stagingDir)) {
        fs.mkdirSync(stagingDir, { recursive: true });
      }

      originalBaseName = path.parse(file.name).name.replace(/_converted$/, '');
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      tempInputPath = path.join(stagingDir, `${Date.now()}_${safeName}`);

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(tempInputPath, buffer);

      inputPath = tempInputPath;
    } else {
      // JSON mode (Tauri desktop / direct path mode)
      let body: any = {};
      try {
        body = await req.json();
      } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
      }
      inputPath = body.inputPath || '';
      outputDirectory = body.outputDirectory || '';
      options = body.options || { outputFormat: 'mp4', quality: 'high' };
      customFileName = body.customFileName || '';
      clientDurationSeconds = typeof body.durationSeconds === 'number' ? body.durationSeconds : 0;

      if (!inputPath) {
        return NextResponse.json({ success: false, error: 'inputPath is required' }, { status: 400 });
      }

      if (!fs.existsSync(inputPath)) {
        const userHome = os.homedir();
        const searchLocations = [
          path.join(userHome, 'Downloads', inputPath),
          path.join(userHome, 'Videos', inputPath),
          path.join(userHome, 'Documents', inputPath),
          path.join(userHome, 'Desktop', inputPath),
          path.join(process.cwd(), inputPath),
        ];

        let foundPath: string | null = null;
        for (const loc of searchLocations) {
          if (fs.existsSync(loc)) {
            foundPath = loc;
            break;
          }
        }

        if (foundPath) {
          inputPath = foundPath;
        } else {
          return NextResponse.json(
            {
              error: `Input file not found on disk: "${inputPath}". When using browser mode, the file must be sent via form data.`,
            },
            { status: 404 }
          );
        }
      }
      originalBaseName = path.parse(inputPath).name.replace(/_converted$/, '');
    }

    const ffmpegBin = getFfmpegBinary();
    const parsedInput = path.parse(inputPath);

    // Choose output directory
    let outDir = outputDirectory && fs.existsSync(outputDirectory) ? outputDirectory : '';
    if (!outDir) {
      if (tempInputPath) {
        outDir = path.join(os.homedir(), 'Downloads');
        if (!fs.existsSync(outDir)) {
          outDir = path.join(os.tmpdir(), 'vimora_staging');
        }
      } else {
        outDir = parsedInput.dir || process.cwd();
      }
    }

    const baseName = customFileName || `${originalBaseName || 'converted'}_converted`;
    outputPath = path.join(outDir, `${baseName}.${options.outputFormat}`);

    // Avoid overwriting existing files by appending counter if needed
    let counter = 1;
    while (fs.existsSync(outputPath)) {
      outputPath = path.join(outDir, `${baseName} (${counter}).${options.outputFormat}`);
      counter++;
    }

    // If clientDurationSeconds is not provided, quickly probe duration for accurate target size bitrate calculation
    if (!clientDurationSeconds && fs.existsSync(inputPath)) {
      try {
        const probeProc = spawn(ffmpegBin, ['-hide_banner', '-i', inputPath]);
        let probeStderr = '';
        probeProc.stderr.on('data', (d) => { probeStderr += d.toString(); });
        await new Promise((resolve) => {
          probeProc.on('close', resolve);
          setTimeout(resolve, 1500);
        });
        const dMatch = probeStderr.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/);
        if (dMatch) {
          const h = parseFloat(dMatch[1]);
          const m = parseFloat(dMatch[2]);
          const s = parseFloat(dMatch[3]);
          clientDurationSeconds = h * 3600 + m * 60 + s;
        }
      } catch {}
    }

    // Backend entitlement enforcement (never rely solely on UI checks)
    const isProClient = req.headers.get('x-vimora-plan') === 'pro';
    const entitlement = checkConversionRequestEntitlement(isProClient, options);
    if (!entitlement.allowed) {
      return NextResponse.json(
        { success: false, error: entitlement.reason || 'This export setting requires Vimora Pro.' },
        { status: 403 }
      );
    }

    // Only run 2-pass CPU when the user explicitly opts into strictTwoPass;
    // otherwise use fast single-pass VBV rate control so progress streams immediately.
    const useCpuTwoPass = Boolean(
      options.strictTwoPass &&
      shouldUseCpuTwoPass({
        options,
        enableGpu: false,
        durationSeconds: clientDurationSeconds,
      })
    );

    const passLogPrefix = useCpuTwoPass
      ? path.join(os.tmpdir(), `vimora_2pass_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`)
      : null;

    const cleanupPassLogs = () => {
      if (!passLogPrefix) return;
      for (const suffix of ['-0.log', '-0.log.mbtree', '-0.log.temp', '.log']) {
        const candidate = `${passLogPrefix}${suffix}`;
        if (fs.existsSync(candidate)) {
          try { fs.unlinkSync(candidate); } catch {}
        }
      }
    };

    const singlePassRawArgs = buildSafeFfmpegArgs({
      inputPath,
      outputPath,
      options,
      enableGpu: !options.strictTwoPass,
      durationSeconds: clientDurationSeconds,
    });

    const insertProgress = (raw: string[]) => {
      const idx = raw.length - 1;
      return [...raw.slice(0, idx), '-progress', 'pipe:1', raw[idx]];
    };

    const args = insertProgress(singlePassRawArgs);
    const startTime = Date.now();

    // If streaming progress is requested (NDJSON stream)
    if (wantsStream) {
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          const sendLine = (obj: any) => {
            try {
              controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
            } catch {}
          };

          let activeChild: ReturnType<typeof spawn> | null = null;
          let aborted = false;

          const onAbort = () => {
            aborted = true;
            try { activeChild?.kill('SIGKILL'); } catch {}
            cleanupPassLogs();
            if (tempInputPath && fs.existsSync(tempInputPath)) {
              try { fs.unlinkSync(tempInputPath); } catch {}
            }
            if (outputPath && fs.existsSync(outputPath)) {
              try { fs.unlinkSync(outputPath); } catch {}
            }
            sendLine({ type: 'aborted', message: 'Conversion cancelled' });
            try { controller.close(); } catch {}
          };

          if (req.signal.aborted) {
            onAbort();
            return;
          }
          req.signal.addEventListener('abort', onAbort);

          const runFfmpegPass = (
            passArgs: string[],
            minPct: number,
            maxPct: number,
            stagePrefix?: string
          ): Promise<{ code: number | null; lastStderr: string }> =>
            new Promise((resolve) => {
              const child = spawn(ffmpegBin, passArgs);
              activeChild = child;
              let totalDuration = clientDurationSeconds > 0 ? clientDurationSeconds : 0;
              let currentPercent = Math.max(1, minPct);
              let currentSpeed = '1.0x';
              let currentFps = 0;
              let lastStderr = '';

              child.stderr?.on('data', (chunk: Buffer) => {
                const str = chunk.toString();
                lastStderr = str.slice(-1000);
                if (!totalDuration) {
                  const match = str.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/);
                  if (match) {
                    totalDuration =
                      parseFloat(match[1]) * 3600 +
                      parseFloat(match[2]) * 60 +
                      parseFloat(match[3]);
                  }
                }
              });

              let stdoutBuf = '';
              child.stdout?.on('data', (chunk: Buffer) => {
                stdoutBuf += chunk.toString();
                const lines = stdoutBuf.split('\n');
                stdoutBuf = lines.pop() || '';

                let hasNewProgress = false;
                for (const line of lines) {
                  const trimmed = line.trim();
                  if (trimmed.startsWith('out_time_us=')) {
                    const us = parseInt(trimmed.substring(12), 10);
                    if (!isNaN(us)) {
                      const curSec = us / 1000000;
                      const rawPct =
                        totalDuration > 0
                          ? Math.min(99, Math.max(1, (curSec / totalDuration) * 100))
                          : Math.min(95, currentPercent + 1);
                      currentPercent = Math.round(minPct + (rawPct / 100) * (maxPct - minPct));
                      hasNewProgress = true;
                    }
                  } else if (trimmed.startsWith('speed=')) {
                    const spd = trimmed.substring(6).trim();
                    if (spd && spd !== 'N/A') currentSpeed = spd;
                  } else if (trimmed.startsWith('fps=')) {
                    const f = parseFloat(trimmed.substring(4).trim());
                    if (!isNaN(f) && f > 0) currentFps = Math.round(f);
                  }
                }

                if (hasNewProgress && !aborted) {
                  sendLine({
                    type: 'progress',
                    percent: Math.min(99, Math.max(1, currentPercent)),
                    speed: stagePrefix ? `${stagePrefix} • ${currentSpeed}` : currentSpeed,
                    fps: currentFps,
                  });
                }
              });

              child.on('close', (code) => resolve({ code, lastStderr }));
              child.on('error', (err) => resolve({ code: 1, lastStderr: err.message }));
            });

          // Initial stage notification (sent immediately so UI leaves "Preparing...")
          sendLine({
            type: 'stage',
            stage: 'encoding',
            message: useCpuTwoPass ? 'Starting Pass 1/2...' : 'Starting FFmpeg encoding...',
          });

          let finalResult: { code: number | null; lastStderr: string };
          if (useCpuTwoPass && passLogPrefix) {
            const nullTarget = process.platform === 'win32' ? 'NUL' : '/dev/null';
            const { pass1Args, pass2Args } = buildTwoPassFfmpegArgs(
              {
                inputPath,
                outputPath,
                options,
                enableGpu: false,
                durationSeconds: clientDurationSeconds,
              },
              passLogPrefix,
              nullTarget
            );
            const p1 = await runFfmpegPass(insertProgress(pass1Args), 1, 45, 'Pass 1/2');
            if (aborted) return;
            if (p1.code === 0) {
              finalResult = await runFfmpegPass(insertProgress(pass2Args), 45, 99, 'Pass 2/2');
            } else {
              cleanupPassLogs();
              finalResult = await runFfmpegPass(args, 1, 99);
            }
          } else {
            finalResult = await runFfmpegPass(args, 1, 99);
          }

          if (aborted) return;
          req.signal.removeEventListener('abort', onAbort);
          cleanupPassLogs();
          if (tempInputPath && fs.existsSync(tempInputPath)) {
            try { fs.unlinkSync(tempInputPath); } catch {}
          }

          if (finalResult.code === 0 && fs.existsSync(outputPath)) {
            const elapsedSeconds = (Date.now() - startTime) / 1000;
            const stats = fs.statSync(outputPath);
            if (stats.size > 0) {
              sendLine({
                type: 'complete',
                success: true,
                outputPath,
                fileName: path.basename(outputPath),
                outputSizeBytes: stats.size,
                durationSeconds: elapsedSeconds,
                downloadUrl: `/api/download?path=${encodeURIComponent(outputPath)}`,
              });
            } else {
              try { fs.unlinkSync(outputPath); } catch {}
              sendLine({
                type: 'error',
                success: false,
                error: finalResult.lastStderr || 'FFmpeg finished but produced an empty (0-byte) file.',
              });
            }
          } else {
            if (outputPath && fs.existsSync(outputPath)) {
              try {
                if (fs.statSync(outputPath).size === 0) fs.unlinkSync(outputPath);
              } catch {}
            }
            sendLine({
              type: 'error',
              success: false,
              error: finalResult.lastStderr || `FFmpeg process exited with code ${finalResult.code}`,
            });
          }

          try {
            controller.close();
          } catch {}
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'application/x-ndjson; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
        },
      });
    }

    // Fallback: non-streaming execution
    return await new Promise<NextResponse>((resolve) => {
      const child = spawn(ffmpegBin, args);
      let stderrOut = '';

      child.stderr.on('data', (d) => { stderrOut += d.toString(); });

      const onAbort = () => {
        try { child.kill('SIGKILL'); } catch {}
        if (tempInputPath && fs.existsSync(tempInputPath)) {
          try { fs.unlinkSync(tempInputPath); } catch {}
        }
        if (outputPath && fs.existsSync(outputPath)) {
          try { fs.unlinkSync(outputPath); } catch {}
        }
        resolve(NextResponse.json({ success: false, aborted: true, error: 'Conversion aborted' }, { status: 499 }));
      };

      if (req.signal.aborted) {
        onAbort();
        return;
      }
      req.signal.addEventListener('abort', onAbort);

      child.on('close', (code) => {
        req.signal.removeEventListener('abort', onAbort);
        if (tempInputPath && fs.existsSync(tempInputPath)) {
          try { fs.unlinkSync(tempInputPath); } catch {}
        }

        if (code === 0 && fs.existsSync(outputPath)) {
          const stats = fs.statSync(outputPath);
          resolve(NextResponse.json({
            success: true,
            outputPath,
            fileName: path.basename(outputPath),
            outputSizeBytes: stats.size,
            durationSeconds: (Date.now() - startTime) / 1000,
            downloadUrl: `/api/download?path=${encodeURIComponent(outputPath)}`,
          }));
        } else {
          resolve(NextResponse.json({
            success: false,
            error: stderrOut || `FFmpeg process exited with code ${code}`,
          }, { status: 500 }));
        }
      });

      child.on('error', (err) => {
        req.signal.removeEventListener('abort', onAbort);
        if (tempInputPath && fs.existsSync(tempInputPath)) {
          try { fs.unlinkSync(tempInputPath); } catch {}
        }
        resolve(NextResponse.json({ success: false, error: err.message }, { status: 500 }));
      });
    });

  } catch (err: any) {
    if (tempInputPath && fs.existsSync(tempInputPath)) {
      try { fs.unlinkSync(tempInputPath); } catch {}
    }
    if (req.signal.aborted || err.name === 'AbortError') {
      try {
        if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      } catch {}
      return NextResponse.json({ success: false, aborted: true, error: 'Cancelled' }, { status: 499 });
    }
    console.error('Conversion execution error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Conversion failed' }, { status: 500 });
  }
}