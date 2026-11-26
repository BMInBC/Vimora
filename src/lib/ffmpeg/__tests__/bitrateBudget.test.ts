import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTargetSizeBudget,
  validateTargetSizeOutput,
} from '../bitrateBudget';
import {
  buildSafeFfmpegArgs,
  buildTwoPassFfmpegArgs,
  shouldUseCpuTwoPass,
} from '../converter';
import { CREATOR_PRESETS, DESTINATION_GROUPS, QUICK_ACTIONS } from '../presets';

test('calculateTargetSizeBudget: allocates audio first and fits 60s 1080p clip under 16 MB for WhatsApp', () => {
  const budget = calculateTargetSizeBudget({
    targetSizeMb: 16,
    durationSeconds: 60,
    width: 1920,
    height: 1080,
    fps: 30,
    outputFormat: 'mp4',
    videoCodec: 'h264',
    keepAudio: true,
    qualityPreference: 'balanced',
  });

  assert.equal(budget.isAchievable, true);
  assert.ok(budget.audioBitrateKbps >= 96 && budget.audioBitrateKbps <= 192);
  assert.ok(budget.videoBitrateKbps > 1000);
  assert.ok(budget.estimatedOutputMb <= 16);
  assert.equal(budget.feasibility, 'moderate');
});

test('calculateTargetSizeBudget: flags impossible target and provides recovery actions', () => {
  // 2-hour 1080p video squeezed into 10 MB is impossible without extreme quality loss
  const budget = calculateTargetSizeBudget({
    targetSizeMb: 10,
    durationSeconds: 7200,
    width: 1920,
    height: 1080,
    fps: 60,
    outputFormat: 'mp4',
    videoCodec: 'h264',
    keepAudio: true,
    qualityPreference: 'balanced',
  });

  assert.equal(budget.feasibility, 'impossible');
  assert.equal(budget.isAchievable, false);
  assert.ok(budget.warning);
  const actionTypes = budget.recoveryActions.map((a) => a.type);
  assert.ok(actionTypes.includes('increase_size'));
  assert.ok(actionTypes.includes('reduce_resolution'));
  assert.ok(actionTypes.includes('reduce_fps'));
  assert.ok(actionTypes.includes('remove_audio'));
  assert.ok(actionTypes.includes('efficient_codec'));
});

test('calculateTargetSizeBudget: frees audio bitrate when keepAudio is false', () => {
  const withAudio = calculateTargetSizeBudget({
    targetSizeMb: 10,
    durationSeconds: 120,
    width: 1280,
    height: 720,
    outputFormat: 'mp4',
    keepAudio: true,
  });

  const muted = calculateTargetSizeBudget({
    targetSizeMb: 10,
    durationSeconds: 120,
    width: 1280,
    height: 720,
    outputFormat: 'mp4',
    keepAudio: false,
  });

  assert.equal(muted.audioBitrateKbps, 0);
  assert.ok(muted.videoBitrateKbps > withAudio.videoBitrateKbps);
});

test('calculateTargetSizeBudget: flags lossless WAV format as unable to constrain MB', () => {
  const budget = calculateTargetSizeBudget({
    targetSizeMb: 5,
    durationSeconds: 180,
    outputFormat: 'wav',
  });

  assert.equal(budget.isLosslessFormat, true);
  assert.equal(budget.isAchievable, false);
});

test('validateTargetSizeOutput: distinguishes hit, warning, and missed states', () => {
  const hit = validateTargetSizeOutput(15.2 * 1024 * 1024, 16);
  assert.equal(hit.status, 'hit');

  const warn = validateTargetSizeOutput(16.8 * 1024 * 1024, 16);
  assert.equal(warn.status, 'warning');

  const missed = validateTargetSizeOutput(20.5 * 1024 * 1024, 16);
  assert.equal(missed.status, 'missed');
});

test('buildSafeFfmpegArgs: uses budgeted -b:v / -maxrate / -bufsize and omits truncating -fs flag', () => {
  const args = buildSafeFfmpegArgs({
    inputPath: 'C:/videos/input.mp4',
    outputPath: 'C:/videos/output.mp4',
    options: {
      outputFormat: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
      resolution: '1280x720',
      targetSizeMb: 16,
      quality: 'balanced',
    },
    durationSeconds: 60,
    enableGpu: false,
  });

  assert.ok(args.includes('-b:v'));
  assert.ok(args.includes('-maxrate'));
  assert.ok(args.includes('-bufsize'));
  assert.ok(args.includes('-b:a'));
  assert.equal(args.includes('-fs'), false, 'Should not include -fs which truncates video streams');
});

test('CREATOR_PRESETS: every preset belongs to a valid destination group and defines compatibilityLabel', () => {
  const validGroups = new Set(DESTINATION_GROUPS.map((g) => g.id));
  assert.ok(CREATOR_PRESETS.length >= 12);
  for (const preset of CREATOR_PRESETS) {
    assert.ok(validGroups.has(preset.destinationGroup), `Invalid group for ${preset.id}`);
    assert.ok(preset.description.length > 0);
    assert.ok(preset.compatibilityLabel.length > 0);
  }
});

test('Discord preset and quick action target 20 MB', () => {
  const discordPreset = CREATOR_PRESETS.find((p) => p.id === 'discord_compress');
  const discordAction = QUICK_ACTIONS.find((a) => a.id === 'discord');
  assert.equal(discordPreset?.maxFileSizeMb, 20);
  assert.equal(discordAction?.defaultTargetSizeMb, 20);
});

test('NVENC target-size encoding uses hardware-native VBR + multipass + VBV', () => {
  const args = buildSafeFfmpegArgs({
    inputPath: 'C:/videos/input.mp4',
    outputPath: 'C:/videos/output.mp4',
    options: {
      outputFormat: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
      resolution: '1280x720',
      targetSizeMb: 20,
      quality: 'balanced',
      strictTwoPass: false,
    },
    gpuCaps: {
      hasGpu: true,
      type: 'nvenc',
      displayName: 'NVIDIA NVENC',
      supportedVideoEncoders: ['h264_nvenc', 'hevc_nvenc'],
      fallbackEncoder: 'libx264',
    },
    enableGpu: true,
    durationSeconds: 60,
  });

  assert.ok(args.includes('h264_nvenc'));
  assert.ok(args.includes('-rc'));
  assert.ok(args.includes('vbr'));
  assert.ok(args.includes('-multipass'));
  assert.ok(args.includes('fullres'));
  assert.ok(args.includes('-b:v'));
  assert.ok(args.includes('-maxrate'));
  assert.ok(args.includes('-bufsize'));
});

test('CPU 2-pass triggers when GPU unavailable or strictTwoPass is enabled', () => {
  const nvencCaps = {
    hasGpu: true,
    type: 'nvenc' as const,
    displayName: 'NVIDIA NVENC',
    supportedVideoEncoders: ['h264_nvenc'],
    fallbackEncoder: 'libx264',
  };

  assert.equal(
    shouldUseCpuTwoPass({
      options: { outputFormat: 'mp4', targetSizeMb: 20, strictTwoPass: false },
      gpuCaps: nvencCaps,
      enableGpu: true,
      durationSeconds: 60,
    }),
    false
  );

  assert.equal(
    shouldUseCpuTwoPass({
      options: { outputFormat: 'mp4', targetSizeMb: 20, strictTwoPass: true },
      gpuCaps: nvencCaps,
      enableGpu: true,
      durationSeconds: 60,
    }),
    true
  );

  const twoPass = buildTwoPassFfmpegArgs(
    {
      inputPath: 'C:/videos/input.mp4',
      outputPath: 'C:/videos/output.mp4',
      options: {
        outputFormat: 'mp4',
        videoCodec: 'h264',
        audioCodec: 'aac',
        targetSizeMb: 20,
        strictTwoPass: true,
      },
      gpuCaps: nvencCaps,
      enableGpu: true,
      durationSeconds: 60,
    },
    'C:/temp/passlog',
    'NUL'
  );

  assert.ok(twoPass.pass1Args.includes('libx264'));
  assert.ok(twoPass.pass1Args.includes('-pass'));
  assert.ok(twoPass.pass1Args.includes('1'));
  assert.ok(twoPass.pass1Args.includes('-an'));
  assert.ok(twoPass.pass1Args.includes('null'));
  assert.equal(twoPass.pass1Args[twoPass.pass1Args.length - 1], 'NUL');

  assert.ok(twoPass.pass2Args.includes('libx264'));
  assert.ok(twoPass.pass2Args.includes('-pass'));
  assert.ok(twoPass.pass2Args.includes('2'));
  assert.ok(twoPass.pass2Args.includes('-c:a'));
  assert.equal(twoPass.pass2Args[twoPass.pass2Args.length - 1], 'C:/videos/output.mp4');
});
