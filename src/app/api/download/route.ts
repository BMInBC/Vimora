import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filePath = searchParams.get('path');

  if (!filePath || !fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const fileStat = fs.statSync(filePath);
  const fileStream = fs.createReadStream(filePath);
  const fileName = path.basename(filePath);

  // Return streamed file download
  const headers = new Headers();
  headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
  headers.set('Content-Type', 'application/octet-stream');
  headers.set('Content-Length', fileStat.size.toString());

  // @ts-ignore
  return new NextResponse(fileStream, { headers });
}