import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { buildSafeFfmpegArgs } from '@/lib/ffmpeg/converter';
import { ConversionOptions } from '@/lib/types';

const execFileAsync = promisify(execFile);

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

export async function POST(req: NextRequest) {
  let tempInputPath: string | null = null;
  let outputPath = '';

  try {
    const contentType = req.headers.get('content-type') || '';
    let inputPath = '';
    let outputDirectory = '';
    let options: ConversionOptions;
    let customFileName = '';

    if (contentType.includes('multipart/form-data')) {
      // Browser file upload mode (local staging on disk)
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const optionsRaw = formData.get('options') as string | null;
      outputDirectory = (formData.get('outputDirectory') as string) || '';
      customFileName = (formData.get('customFileName') as string) || '';

      if (!file) {
        return NextResponse.json({ error: 'No file provided in form data' }, { status: 400 });
      }

      options = optionsRaw ? JSON.parse(optionsRaw) : { outputFormat: 'mp4' };

      // Write uploaded file into a temporary local file for FFmpeg to process
      const stagingDir = path.join(os.tmpdir(), 'vimora_staging');
      if (!fs.existsSync(stagingDir)) {
        fs.mkdirSync(stagingDir, { recursive: true });
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      tempInputPath = path.join(stagingDir, `${Date.now()}_${safeName}`);
      
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(tempInputPath, buffer);

      inputPath = tempInputPath;
    } else {
      // JSON mode (Tauri desktop / direct path mode)
      const body = await req.json();
      inputPath = body.inputPath;
      outputDirectory = body.outputDirectory || '';
      options = body.options;
      customFileName = body.customFileName || '';

      if (!inputPath) {
        return NextResponse.json({ error: 'inputPath is required' }, { status: 400 });
      }

      // If inputPath is not an absolute existing path, search common user folders (Downloads, Videos, Documents)
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
    }

    const ffmpegBin = getFfmpegBinary();
    const parsedInput = path.parse(inputPath);
    
    // Choose output directory: specified output dir, or original folder, or User Videos/Downloads
    let outDir = outputDirectory && fs.existsSync(outputDirectory) ? outputDirectory : '';
    if (!outDir) {
      if (tempInputPath) {
        // In browser upload mode, save converted file to user's Downloads or staging output
        outDir = path.join(os.homedir(), 'Downloads');
        if (!fs.existsSync(outDir)) {
          outDir = path.join(os.tmpdir(), 'vimora_staging');
        }
      } else {
        outDir = parsedInput.dir || process.cwd();
      }
    }

    const baseName = customFileName || `${parsedInput.name.replace(/_converted$/, '')}_converted`;
    outputPath = path.join(outDir, `${baseName}.${options.outputFormat}`);

    // Build safe argument array
    const args = buildSafeFfmpegArgs({
      inputPath,
      outputPath,
      options,
      enableGpu: true,
    });

    const startTime = Date.now();

    const child = await execFileAsync(ffmpegBin, args, {
      maxBuffer: 20 * 1024 * 1024,
      timeout: 600000, // 10 min
      signal: req.signal,
    });

    const elapsedSeconds = (Date.now() - startTime) / 1000;
    const stats = fs.existsSync(outputPath) ? fs.statSync(outputPath) : null;

    // Clean up temporary staged input file
    if (tempInputPath && fs.existsSync(tempInputPath)) {
      try {
        fs.unlinkSync(tempInputPath);
      } catch {}
    }

    return NextResponse.json({
      success: true,
      outputPath,
      fileName: path.basename(outputPath),
      outputSizeBytes: stats?.size || 0,
      durationSeconds: elapsedSeconds,
      downloadUrl: `/api/download?path=${encodeURIComponent(outputPath)}`,
      stdout: child.stdout?.substring(0, 500),
    });
  } catch (err: any) {
    // Clean up temporary staging file on failure or abort
    if (tempInputPath && fs.existsSync(tempInputPath)) {
      try {
        fs.unlinkSync(tempInputPath);
      } catch {}
    }

    // If request was aborted by client (pause / cancel), delete partial output
    if (req.signal.aborted || err.name === 'AbortError') {
      try {
        if (outputPath && fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
      } catch {}
      return NextResponse.json(
        {
          success: false,
          aborted: true,
          error: 'Conversion paused or cancelled by user.',
        },
        { status: 499 }
      );
    }

    console.error('Conversion execution error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.stderr || err.message || 'Conversion failed',
      },
      { status: 500 }
    );
  }
}