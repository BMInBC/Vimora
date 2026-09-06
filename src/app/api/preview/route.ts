import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { buildSafeFfmpegArgs } from '@/lib/ffmpeg/converter';
import { ConversionOptions } from '@/lib/types';
import { getFfmpegBinary } from '../convert/route';

const execFileAsync = promisify(execFile);

export async function POST(req: NextRequest) {
  let tempInputPath: string | null = null;
  let tempOutputPath: string | null = null;

  try {
    const contentType = req.headers.get('content-type') || '';
    let inputPath = '';
    let options: ConversionOptions;
    let startTimeSeconds = 0;
    let durationSeconds = 5;

    const stagingDir = path.join(os.tmpdir(), 'vimora_staging', 'previews');
    if (!fs.existsSync(stagingDir)) {
      fs.mkdirSync(stagingDir, { recursive: true });
    }

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const optionsRaw = formData.get('options') as string | null;
      const startRaw = formData.get('startTimeSeconds') as string | null;
      const durationRaw = formData.get('durationSeconds') as string | null;

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      options = optionsRaw ? JSON.parse(optionsRaw) : { outputFormat: 'mp4', quality: 'balanced' };
      if (startRaw) startTimeSeconds = parseFloat(startRaw) || 0;
      if (durationRaw) durationSeconds = Math.min(15, Math.max(3, parseFloat(durationRaw) || 5));

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      tempInputPath = path.join(stagingDir, `preview_in_${Date.now()}_${safeName}`);

      const arrayBuffer = await file.arrayBuffer();
      fs.writeFileSync(tempInputPath, Buffer.from(arrayBuffer));
      inputPath = tempInputPath;
    } else {
      const body = await req.json();
      inputPath = body.inputPath;
      options = body.options || { outputFormat: 'mp4', quality: 'balanced' };
      startTimeSeconds = parseFloat(body.startTimeSeconds) || 0;
      durationSeconds = Math.min(15, Math.max(3, parseFloat(body.durationSeconds) || 5));

      if (!inputPath || !fs.existsSync(inputPath)) {
        return NextResponse.json({ error: 'Invalid or missing inputPath' }, { status: 400 });
      }
    }

    // Always output a web-friendly MP4 for fast in-browser HTML5 preview playback
    const previewOptions: ConversionOptions = {
      ...options,
      outputFormat: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
    };

    const outFileName = `preview_out_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.mp4`;
    tempOutputPath = path.join(stagingDir, outFileName);

    const ffmpegBin = getFfmpegBinary();
    const args = buildSafeFfmpegArgs({
      inputPath,
      outputPath: tempOutputPath,
      options: previewOptions,
      enableGpu: false, // Use fast CPU ultrafast preset for preview snippet
      startTimeSeconds,
      durationSeconds,
    });

    // Enforce fast preset for crisp visual quality and snappiness
    const presetIdx = args.indexOf('-preset');
    if (presetIdx !== -1 && presetIdx + 1 < args.length) {
      args[presetIdx + 1] = 'fast';
    } else {
      args.splice(args.length - 1, 0, '-preset', 'fast');
    }

    await execFileAsync(ffmpegBin, args, {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30000, // 30 sec limit for preview
    });

    if (!fs.existsSync(tempOutputPath)) {
      throw new Error('Preview clip was not generated');
    }

    const stat = fs.statSync(tempOutputPath);

    // Clean up temporary staged input file
    if (tempInputPath && fs.existsSync(tempInputPath)) {
      try { fs.unlinkSync(tempInputPath); } catch {}
    }

    return NextResponse.json({
      success: true,
      previewUrl: `/api/download?path=${encodeURIComponent(tempOutputPath)}`,
      durationSeconds,
      outputSizeBytes: stat.size,
      resolution: options.resolution || (options.enhance?.upscaleTarget === '4k' ? '3840x2160' : options.enhance?.upscaleTarget === '1080p' ? '1920x1080' : 'Original'),
      format: options.outputFormat,
    });
  } catch (err: any) {
    if (tempInputPath && fs.existsSync(tempInputPath)) {
      try { fs.unlinkSync(tempInputPath); } catch {}
    }
    console.error('Preview error:', err);
    return NextResponse.json(
      { success: false, error: err.stderr || err.message || 'Failed to generate preview' },
      { status: 500 }
    );
  }
}
