import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveEncoderForCodec, parseEncoderOutput } from '../detector';
import {
  generateOutputFilename,
  sanitizeFilenameSegment,
  isDuplicateJob,
} from '../filenamePattern';
import { mapFfmpegError } from '../errorMapper';
import { getPlannedChanges, estimateConversionSeconds } from '../changes';
import {
  checkBatchLimitEntitlement,
  checkResolutionEntitlement,
  checkCustomPresetEntitlement,
  checkConversionRequestEntitlement,
} from '../../entitlements';
import { getPresetById } from '../presets';

test('resolveEncoderForCodec: selects supported GPU encoder and falls back safely to CPU', () => {
  const nvenc = parseEncoderOutput('V..... h264_nvenc\nV..... hevc_nvenc');
  assert.equal(nvenc.type, 'nvenc');

  const h264 = resolveEncoderForCodec('h264', nvenc, true);
  assert.equal(h264.encoder, 'h264_nvenc');
  assert.equal(h264.isGpu, true);

  // AV1 is NOT in supportedVideoEncoders -> must fall back to CPU honestly
  const av1 = resolveEncoderForCodec('av1', nvenc, true);
  assert.equal(av1.encoder, 'libsvtav1');
  assert.equal(av1.isGpu, false);
  assert.ok(av1.fallbackReason);

  // Force CPU preference
  const forcedCpu = resolveEncoderForCodec('h264', nvenc, true, 'cpu');
  assert.equal(forcedCpu.encoder, 'libx264');
  assert.equal(forcedCpu.isGpu, false);
});

test('generateOutputFilename: handles tokens, Unicode, special chars, and collisions', () => {
  const preset = getPresetById('tiktok_vertical');
  const name1 = generateOutputFilename({
    originalFileName: 'My: Video* "Café" 2026?.mov',
    outputFormat: 'mp4',
    preset,
    resolution: '1080x1920',
    pattern: '{original_name}-{preset}-{resolution}.{ext}',
  });
  assert.equal(name1, 'My Video Café 2026-tiktok-vertical-1080x1920.mp4');

  const name2 = generateOutputFilename({
    originalFileName: 'clip.mov',
    outputFormat: 'mp4',
    preset,
    resolution: '1080x1920',
    existingNames: ['clip-tiktok-vertical-1080x1920.mp4'],
  });
  assert.equal(name2, 'clip-tiktok-vertical-1080x1920_1.mp4');
  assert.equal(sanitizeFilenameSegment('***???'), 'export');
});

test('isDuplicateJob: prevents duplicate queued jobs for same file and settings', () => {
  const existing: any[] = [
    {
      id: 'j1',
      status: 'queued',
      file: { path: 'C:/videos/demo.mp4', name: 'demo.mp4' },
      options: { outputFormat: 'mp4', presetId: 'tiktok_vertical', resolution: '1080x1920' },
    },
  ];
  assert.equal(
    isDuplicateJob(existing, 'C:/videos/demo.mp4', {
      outputFormat: 'mp4',
      presetId: 'tiktok_vertical',
      resolution: '1080x1920',
    }),
    true
  );
  assert.equal(
    isDuplicateJob(existing, 'C:/videos/demo.mp4', {
      outputFormat: 'mp3',
      presetId: 'high_res_mp3',
    }),
    false
  );
});

test('mapFfmpegError: translates common FFmpeg and OS errors into plain-English guidance', () => {
  assert.equal(mapFfmpegError('ENOENT: no such file or directory').code, 'file_not_found');
  assert.equal(mapFfmpegError('No space left on device (ENOSPC)').code, 'disk_space');
  assert.equal(mapFfmpegError('EACCES: permission denied').code, 'permission_denied');
  assert.equal(mapFfmpegError('Cannot load nvcuda.dll / NVENC driver does not support').code, 'gpu_unavailable');
  assert.equal(mapFfmpegError('moov atom not found / Invalid data found').code, 'corrupt_media');
  assert.equal(mapFfmpegError('Unknown encoder libx999').code, 'unsupported_codec');
  assert.equal(mapFfmpegError('spawn ffmpeg ENOENT / ffmpeg binary missing').code, 'file_not_found');
  assert.equal(mapFfmpegError('binary missing: incompatible ffmpeg').code, 'ffmpeg_missing');
  assert.equal(mapFfmpegError('Conversion canceled by user').code, 'canceled_by_user');
});

test('entitlements: enforces Free tier (3-file batch, 1080p, 1 custom preset) and Pro unlocks', () => {
  assert.equal(checkBatchLimitEntitlement(false, 2, 1).allowed, true);
  assert.equal(checkBatchLimitEntitlement(false, 3, 1).allowed, false);
  assert.equal(checkBatchLimitEntitlement(true, 100, 50).allowed, true);

  assert.equal(checkResolutionEntitlement(false, '1920x1080').allowed, true);
  assert.equal(checkResolutionEntitlement(false, '1080x1920').allowed, true);
  assert.equal(checkResolutionEntitlement(false, '3840x2160').allowed, false);
  assert.equal(checkResolutionEntitlement(true, '3840x2160').allowed, true);

  assert.equal(checkCustomPresetEntitlement(false, 0).allowed, true);
  assert.equal(checkCustomPresetEntitlement(false, 1).allowed, false);
  assert.equal(checkCustomPresetEntitlement(true, 10).allowed, true);

  assert.equal(
    checkConversionRequestEntitlement(false, {
      outputFormat: 'mp4',
      resolution: '3840x2160',
    }).allowed,
    false
  );
  assert.equal(
    checkConversionRequestEntitlement(false, {
      outputFormat: 'mp4',
      resolution: '1920x1080',
    }).allowed,
    true
  );
});

test('getPlannedChanges & estimateConversionSeconds: produces before->after diffs and ETA', () => {
  const tiktok = getPresetById('tiktok_vertical')!;
  const changes = getPlannedChanges(
    {
      id: 'f1',
      name: 'vlog.mov',
      path: '/tmp/vlog.mov',
      sizeBytes: 180 * 1024 * 1024,
      format: 'mov',
      width: 1920,
      height: 1080,
      fps: 60,
      videoCodec: 'prores',
      durationSeconds: 60,
      hasVideo: true,
      hasAudio: true,
    },
    {
      outputFormat: 'mp4',
      presetId: tiktok.id,
      resolution: '1080x1920',
      videoCodec: 'h264',
      audioCodec: 'aac',
      fps: 30,
      targetSizeMb: 16,
    },
    tiktok,
    {
      hasGpu: true,
      type: 'nvenc',
      displayName: 'NVIDIA NVENC',
      supportedVideoEncoders: ['h264_nvenc'],
      fallbackEncoder: 'libx264',
    }
  );

  const resItem = changes.find((c) => c.id === 'resolution');
  const aspectItem = changes.find((c) => c.id === 'aspect');
  const sizeItem = changes.find((c) => c.id === 'target_size');
  assert.equal(resItem?.value, '1920×1080 → 1080×1920');
  assert.equal(aspectItem?.value, '16:9 → 9:16');
  assert.ok(sizeItem?.value.includes('180 MB →'));

  const gpuEta = estimateConversionSeconds(60, true, false, false);
  const cpuEta = estimateConversionSeconds(60, false, false, true);
  assert.ok(gpuEta !== null && cpuEta !== null && gpuEta < cpuEta);
});
