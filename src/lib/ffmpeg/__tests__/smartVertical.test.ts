import test from 'node:test';
import assert from 'node:assert/strict';
import { buildVideoFilterExpression } from '../converter';
import {
  detectSourceOrientation,
  estimateCropLossPercent,
  validateForPlatform,
} from '../platformValidator';
import { getPresetById } from '../presets';

test('detectSourceOrientation: classifies landscape, portrait, square, and unknown', () => {
  assert.equal(detectSourceOrientation(1920, 1080), 'landscape');
  assert.equal(detectSourceOrientation(1080, 1920), 'portrait');
  assert.equal(detectSourceOrientation(1080, 1080), 'square');
  assert.equal(detectSourceOrientation(undefined, undefined), 'unknown');
});

test('estimateCropLossPercent: detects ~68% horizontal crop loss for 16:9 to 9:16', () => {
  const loss = estimateCropLossPercent(1920, 1080, '1080x1920');
  assert.ok(loss >= 65 && loss <= 70, `Expected ~68% crop loss, got ${loss}%`);
  assert.equal(estimateCropLossPercent(1080, 1920, '1080x1920'), 0);
});

test('buildVideoFilterExpression: generates Lanczos + BT.709 crop_fill with subjectFocus modes', () => {
  const centerVf = buildVideoFilterExpression({
    outputFormat: 'mp4',
    resolution: '1080x1920',
    aspectRatioMode: 'crop_fill',
    subjectFocus: 'center',
  });
  assert.ok(centerVf?.includes('flags=lanczos+accurate_rnd'));
  assert.ok(centerVf?.includes('out_color_matrix=bt709'));
  assert.ok(centerVf?.includes('crop=1080:1920:(iw-ow)/2:(ih-oh)/2'));

  const topVf = buildVideoFilterExpression({
    outputFormat: 'mp4',
    resolution: '1080x1920',
    aspectRatioMode: 'crop_fill',
    subjectFocus: 'top',
  });
  assert.ok(topVf?.includes('crop=1080:1920:(iw-ow)/2:0'));

  const bottomVf = buildVideoFilterExpression({
    outputFormat: 'mp4',
    resolution: '1080x1920',
    aspectRatioMode: 'crop_fill',
    subjectFocus: 'bottom',
  });
  assert.ok(bottomVf?.includes('crop=1080:1920:(iw-ow)/2:ih-oh'));

  const manualVf = buildVideoFilterExpression({
    outputFormat: 'mp4',
    resolution: '1080x1920',
    aspectRatioMode: 'crop_fill',
    subjectFocus: 'manual',
    cropPositionX: 25,
    cropPositionY: 75,
  });
  assert.ok(manualVf?.includes('crop=1080:1920:(iw-ow)*0.25:(ih-oh)*0.75'));
});

test('buildVideoFilterExpression: supports blur_pad, pad_black, and keep_original', () => {
  const blurVf = buildVideoFilterExpression({
    outputFormat: 'mp4',
    resolution: '1080x1920',
    aspectRatioMode: 'blur_pad',
  });
  assert.ok(blurVf?.includes('boxblur=25:5'));
  assert.ok(blurVf?.includes('overlay=(W-w)/2:(H-h)/2'));

  const padVf = buildVideoFilterExpression({
    outputFormat: 'mp4',
    resolution: '1080x1920',
    aspectRatioMode: 'pad_black',
  });
  assert.ok(padVf?.includes('pad=1080:1920:(ow-iw)/2:(oh-ih)/2'));

  const keepVf = buildVideoFilterExpression({
    outputFormat: 'mp4',
    resolution: '1080x1920',
    aspectRatioMode: 'keep_original',
  });
  assert.ok(keepVf?.includes('force_original_aspect_ratio=decrease'));
  assert.ok(keepVf?.includes('trunc(iw/2)*2:trunc(ih/2)*2'));
  assert.equal(keepVf?.includes('crop='), false);
  assert.equal(keepVf?.includes('pad='), false);
});

test('validateForPlatform: warns on landscape crop loss, long duration, and codec mismatch without blocking', () => {
  const reelsPreset = getPresetById('instagram_reel')!;
  const report = validateForPlatform(
    {
      id: 'f1',
      name: 'interview.mov',
      path: '/tmp/interview.mov',
      sizeBytes: 120 * 1024 * 1024,
      format: 'mov',
      width: 1920,
      height: 1080,
      fps: 120,
      durationSeconds: 300,
      hasVideo: true,
      hasAudio: true,
    },
    {
      outputFormat: 'webm',
      presetId: reelsPreset.id,
      resolution: '1080x1920',
      aspectRatioMode: 'crop_fill',
    },
    reelsPreset
  );

  assert.equal(report.sourceOrientation, 'landscape');
  assert.equal(report.isVerticalTarget, true);
  assert.equal(report.hasWarnings, true);
  const categories = report.issues.map((i) => i.category);
  assert.ok(categories.includes('crop_loss'));
  assert.ok(categories.includes('duration'));
  assert.ok(categories.includes('codec'));
  assert.ok(categories.includes('fps'));
});
