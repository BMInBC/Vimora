import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const target = body.filePath || body.folderPath || body.path;

    if (!target || typeof target !== 'string') {
      return NextResponse.json({ error: 'filePath or folderPath is required' }, { status: 400 });
    }

    const normalized = path.normalize(target);

    if (process.platform === 'win32') {
      if (fs.existsSync(normalized) && fs.statSync(normalized).isDirectory()) {
        execFile('explorer.exe', [normalized]);
      } else if (fs.existsSync(normalized)) {
        execFile('explorer.exe', [`/select,${normalized}`]);
      } else {
        const parentDir = path.dirname(normalized);
        if (fs.existsSync(parentDir)) {
          execFile('explorer.exe', [parentDir]);
        } else {
          execFile('explorer.exe', [normalized]);
        }
      }
    } else if (process.platform === 'darwin') {
      if (fs.existsSync(normalized) && !fs.statSync(normalized).isDirectory()) {
        execFile('open', ['-R', normalized]);
      } else {
        execFile('open', [normalized]);
      }
    } else {
      const dir = fs.existsSync(normalized) && !fs.statSync(normalized).isDirectory()
        ? path.dirname(normalized)
        : normalized;
      execFile('xdg-open', [dir]);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}