import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function POST(req: NextRequest) {
  try {
    const { filePath } = await req.json();
    if (!filePath || typeof filePath !== 'string') {
      return NextResponse.json({ error: 'filePath is required' }, { status: 400 });
    }

    if (process.platform === 'win32') {
      // Reveal in explorer safely
      const normalized = path.normalize(filePath);
      execFile('explorer.exe', ['/select,', normalized]);
    } else if (process.platform === 'darwin') {
      execFile('open', ['-R', filePath]);
    } else {
      execFile('xdg-open', [path.dirname(filePath)]);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}