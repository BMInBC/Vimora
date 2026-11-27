import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isSupportedMediaFilename,
  filterMediaFiles,
  extractFilesFromDataTransfer,
} from '../../media/fileDrop';

test('isSupportedMediaFilename & filterMediaFiles: filters valid media and skips 0-byte/non-media entries', () => {
  assert.equal(isSupportedMediaFilename('clip.mp4'), true);
  assert.equal(isSupportedMediaFilename('voice.MP3'), true);
  assert.equal(isSupportedMediaFilename('desktop.ini'), false);
  assert.equal(isSupportedMediaFilename('notes.txt'), false);

  const mockFiles = [
    { name: 'video1.mp4', size: 1024, type: 'video/mp4' },
    { name: 'Bulk Processing', size: 0, type: '' }, // Raw directory blob on drop
    { name: 'desktop.ini', size: 120, type: 'text/plain' },
    { name: 'audio1.wav', size: 2048, type: 'audio/wav' },
  ] as unknown as File[];

  const filtered = filterMediaFiles(mockFiles);
  assert.deepEqual(
    filtered.map((f) => f.name),
    ['video1.mp4', 'audio1.wav']
  );
});

test('extractFilesFromDataTransfer: traverses nested directories and files together', async () => {
  const fileA = { name: 'intro.mp4', size: 5000, type: 'video/mp4' } as File;
  const fileB = { name: 'song.mp3', size: 3000, type: 'audio/mpeg' } as File;
  const junk = { name: 'readme.txt', size: 100, type: 'text/plain' } as File;

  const dirEntry = {
    isFile: false,
    isDirectory: true,
    name: 'Bulk Processing',
    createReader: () => {
      let called = false;
      return {
        readEntries: (cb: (entries: any[]) => void) => {
          if (!called) {
            called = true;
            cb([
              {
                isFile: true,
                isDirectory: false,
                name: 'song.mp3',
                file: (ok: (f: File) => void) => ok(fileB),
              },
              {
                isFile: true,
                isDirectory: false,
                name: 'readme.txt',
                file: (ok: (f: File) => void) => ok(junk),
              },
            ]);
          } else {
            cb([]);
          }
        },
      };
    },
  };

  const fileEntry = {
    isFile: true,
    isDirectory: false,
    name: 'intro.mp4',
    file: (ok: (f: File) => void) => ok(fileA),
  };

  const mockDataTransfer = {
    items: [
      { webkitGetAsEntry: () => fileEntry },
      { webkitGetAsEntry: () => dirEntry },
    ],
    files: [fileA],
  } as unknown as DataTransfer;

  const result = await extractFilesFromDataTransfer(mockDataTransfer);
  assert.deepEqual(
    result.map((f) => f.name),
    ['intro.mp4', 'song.mp3']
  );
});
