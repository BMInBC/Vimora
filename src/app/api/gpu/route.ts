import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { parseEncoderOutput, getFallbackCapabilities } from '@/lib/ffmpeg/detector';

const execFileAsync = promisify(execFile);

export async function GET() {
  try {
    // 1. Try finding ffmpeg path
    let ffmpegPath = 'ffmpeg';
    
    // Check common locations if not in PATH
    const possiblePaths = [
      'ffmpeg',
      'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
      'C:\\Users\\USER\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.1-essentials_build\\bin\\ffmpeg.exe'
    ];

    let encodersOutput = '';
    for (const p of possiblePaths) {
      try {
        const { stdout } = await execFileAsync(p, ['-encoders'], { timeout: 4000 });
        encodersOutput = stdout;
        ffmpegPath = p;
        break;
      } catch {}
    }

    if (encodersOutput) {
      const caps = parseEncoderOutput(encodersOutput);
      return NextResponse.json(caps);
    }
  } catch (err) {
    console.warn('FFmpeg probe failed:', err);
  }

  // Fallback to CPU
  return NextResponse.json(getFallbackCapabilities());
}