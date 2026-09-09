import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';

const execFileAsync = promisify(execFile);

function getFfmpegBinary(): string {
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
  try {
    const body = await req.json();
    let inputPath = body.inputPath || '';

    if (!inputPath) {
      return NextResponse.json({ error: 'inputPath is required' }, { status: 400 });
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
      for (const loc of searchLocations) {
        if (fs.existsSync(loc)) {
          inputPath = loc;
          break;
        }
      }
    }

    if (!fs.existsSync(inputPath)) {
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
    }

    const ffmpegBin = getFfmpegBinary();
    let rawOutput = '';

    try {
      const { stderr } = await execFileAsync(ffmpegBin, ['-hide_banner', '-i', inputPath], { timeout: 4000 });
      rawOutput = stderr;
    } catch (err: any) {
      // ffmpeg -i returns exit code 1 when no output file specified; stderr contains full stream info
      rawOutput = err.stderr || err.stdout || '';
    }

    let width: number | undefined;
    let height: number | undefined;
    let fps: number | undefined;
    let videoCodec: string | undefined;
    let audioCodec: string | undefined;
    let durationSeconds: number | undefined;

    // Parse Duration: 00:01:23.45
    const durationMatch = rawOutput.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}\.\d+)/);
    if (durationMatch) {
      const h = parseFloat(durationMatch[1]);
      const m = parseFloat(durationMatch[2]);
      const s = parseFloat(durationMatch[3]);
      durationSeconds = h * 3600 + m * 60 + s;
    }

    // Parse Video Stream: Stream #0:0... Video: h264 ..., 1920x1080 ..., 60 fps
    const videoStreamMatch = rawOutput.match(/Stream\s+#\d+:\d+.*?: Video:\s*([\w\d]+)[^,\n]*,\s*[^,\n]*,\s*(\d{3,5})x(\d{3,5})/i);
    if (videoStreamMatch) {
      videoCodec = videoStreamMatch[1];
      width = parseInt(videoStreamMatch[2], 10);
      height = parseInt(videoStreamMatch[3], 10);
    }

    // Parse FPS: 60 fps or 29.97 fps
    const fpsMatch = rawOutput.match(/([\d.]+)\s*fps/i);
    if (fpsMatch) {
      const parsedFps = parseFloat(fpsMatch[1]);
      if (!isNaN(parsedFps) && parsedFps > 0) {
        fps = Math.round(parsedFps);
      }
    }

    // Parse Audio Stream: Stream #0:1... Audio: aac ..., 48000 Hz
    const audioStreamMatch = rawOutput.match(/Stream\s+#\d+:\d+.*?: Audio:\s*([\w\d]+)/i);
    if (audioStreamMatch) {
      audioCodec = audioStreamMatch[1];
    }

    return NextResponse.json({
      success: true,
      width,
      height,
      fps,
      videoCodec,
      audioCodec,
      durationSeconds,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Probe failed' }, { status: 500 });
  }
}
