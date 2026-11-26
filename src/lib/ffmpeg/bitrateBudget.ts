import type {
  OutputFormat,
  QualityPreset,
  TargetSizeBudget,
  TargetSizeFeasibility,
  TargetSizeRecoveryAction,
  TargetSizeValidationResult,
  VideoCodec,
} from '../types';

export interface TargetSizeBudgetInput {
  targetSizeMb: number;
  durationSeconds?: number;
  sourceSizeBytes?: number;
  width?: number;
  height?: number;
  fps?: number;
  outputFormat: OutputFormat;
  videoCodec?: VideoCodec;
  keepAudio?: boolean;
  hasAudio?: boolean;
  qualityPreference?: QualityPreset;
}

const AUDIO_ONLY_FORMATS: OutputFormat[] = ['mp3', 'wav', 'aac', 'flac', 'ogg'];
const LOSSLESS_FORMATS: OutputFormat[] = ['wav', 'flac'];

const MIN_VIDEO_BITRATE_KBPS = 120;
const MAX_VIDEO_BITRATE_KBPS = 50000;
const MIN_AUDIO_BITRATE_KBPS = 32;
const MAX_AUDIO_BITRATE_KBPS = 320;

export function getContainerOverheadFraction(format: OutputFormat): number {
  switch (format) {
    case 'mp4':
    case 'mov':
      return 0.055;
    case 'webm':
      return 0.045;
    case 'mp3':
    case 'aac':
    case 'ogg':
      return 0.025;
    case 'wav':
    case 'flac':
      return 0.01;
    default:
      return 0.055;
  }
}

export function getQualitySafetyFactor(quality?: QualityPreset): number {
  switch (quality) {
    case 'smaller':
      return 0.90;
    case 'high':
      return 0.97;
    case 'balanced':
    case 'custom':
    default:
      return 0.94;
  }
}

function parsePixelArea(width?: number, height?: number): number {
  if (width && height && width > 0 && height > 0) {
    return width * height;
  }
  return 1920 * 1080; // Assume 1080p if unprobed
}

function getCodecEfficiencyFactor(codec?: VideoCodec): number {
  switch (codec) {
    case 'hevc':
    case 'av1':
    case 'vp9':
      return 1.35;
    case 'h264':
    default:
      return 1.0;
  }
}

function getResolutionBitrateThresholds(
  width?: number,
  height?: number,
  fps?: number,
  codec?: VideoCodec
): { optimalKbps: number; moderateKbps: number; tightKbps: number } {
  const area = parsePixelArea(width, height);
  const fpsFactor = fps && fps > 45 ? 1.25 : fps && fps <= 24 ? 0.85 : 1.0;
  const eff = getCodecEfficiencyFactor(codec);

  let baseOptimal = 4500;
  let baseModerate = 1800;
  let baseTight = 650;

  if (area <= 854 * 480 + 20000) {
    // 480p and below
    baseOptimal = 1400;
    baseModerate = 600;
    baseTight = 220;
  } else if (area <= 1280 * 720 + 50000) {
    // 720p
    baseOptimal = 2800;
    baseModerate = 1100;
    baseTight = 420;
  } else if (area <= 1920 * 1080 + 100000) {
    // 1080p (landscape or 1080x1920 vertical)
    baseOptimal = 4800;
    baseModerate = 1800;
    baseTight = 700;
  } else {
    // 1440p / 4K+
    baseOptimal = 14000;
    baseModerate = 6000;
    baseTight = 2200;
  }

  return {
    optimalKbps: Math.round((baseOptimal * fpsFactor) / eff),
    moderateKbps: Math.round((baseModerate * fpsFactor) / eff),
    tightKbps: Math.round((baseTight * fpsFactor) / eff),
  };
}

function reserveAudioBitrateKbps(
  totalBitrateKbps: number,
  keepAudio: boolean,
  hasAudio: boolean,
  isAudioOnly: boolean
): number {
  if (!keepAudio || !hasAudio) return 0;

  if (isAudioOnly) {
    return Math.min(MAX_AUDIO_BITRATE_KBPS, Math.max(MIN_AUDIO_BITRATE_KBPS, totalBitrateKbps));
  }

  if (totalBitrateKbps < 200) return 48;
  if (totalBitrateKbps < 380) return 64;
  if (totalBitrateKbps < 750) return 96;
  if (totalBitrateKbps < 1600) return 128;
  if (totalBitrateKbps < 3500) return 160;
  return 192;
}

export function calculateTargetSizeBudget(input: TargetSizeBudgetInput): TargetSizeBudget {
  const targetSizeMb = Math.max(1, Number(input.targetSizeMb) || 1);
  const durationSeconds = input.durationSeconds && input.durationSeconds > 0 ? input.durationSeconds : 0;
  const format = (input.outputFormat || 'mp4').toLowerCase() as OutputFormat;
  const isAudioOnly = AUDIO_ONLY_FORMATS.includes(format);
  const isLosslessFormat = LOSSLESS_FORMATS.includes(format);
  const keepAudio = input.keepAudio !== false;
  const hasAudio = input.hasAudio !== false;
  const overhead = getContainerOverheadFraction(format);
  const safetyFactor = getQualitySafetyFactor(input.qualityPreference);

  // Lossless containers cannot be compressed to an arbitrary bitrate budget
  if (isLosslessFormat) {
    const estMb = durationSeconds > 0 ? Number(((durationSeconds * 1411 * 1000) / 8 / (1024 * 1024)).toFixed(1)) : targetSizeMb;
    return {
      targetSizeMb,
      durationSeconds,
      containerOverheadPercent: Math.round(overhead * 1000) / 10,
      totalBitrateKbps: 1411,
      videoBitrateKbps: 0,
      audioBitrateKbps: 1411,
      estimatedOutputMb: estMb,
      feasibility: 'impossible',
      isAchievable: false,
      qualityImpactLabel: 'Lossless audio cannot be constrained to a target MB',
      warning: `${format.toUpperCase()} is lossless and ignores bitrate caps. Switch to MP3 or AAC to hit a target file size.`,
      recoveryActions: [
        {
          type: 'increase_size',
          label: `Allow ~${Math.max(targetSizeMb, Math.ceil(estMb))} MB`,
          description: 'Increase target size to fit uncompressed audio.',
          recommendedTargetMb: Math.max(targetSizeMb, Math.ceil(estMb)),
        },
      ],
      isAudioOnly,
      isLosslessFormat: true,
    };
  }

  // If duration is not yet known, return an honest provisional estimate
  if (durationSeconds <= 0) {
    const provisionalAudio = isAudioOnly ? 192 : keepAudio && hasAudio ? 128 : 0;
    const provisionalVideo = isAudioOnly ? 0 : 1800;
    return {
      targetSizeMb,
      durationSeconds: 0,
      containerOverheadPercent: Math.round(overhead * 1000) / 10,
      totalBitrateKbps: provisionalVideo + provisionalAudio,
      videoBitrateKbps: provisionalVideo,
      audioBitrateKbps: provisionalAudio,
      estimatedOutputMb: Number((targetSizeMb * safetyFactor).toFixed(1)),
      feasibility: 'moderate',
      isAchievable: true,
      qualityImpactLabel: 'Add a file (or enter duration) for exact bitrate budgeting',
      recoveryActions: [],
      isAudioOnly,
      isLosslessFormat: false,
    };
  }

  // Available payload bits after reserving container overhead and quality safety margin
  const usableBytes = targetSizeMb * 1024 * 1024 * safetyFactor * (1 - overhead);
  const totalBitrateKbps = Math.max(32, Math.floor((usableBytes * 8) / durationSeconds / 1000));

  const audioBitrateKbps = reserveAudioBitrateKbps(totalBitrateKbps, keepAudio, hasAudio, isAudioOnly);

  if (isAudioOnly) {
    const rawAudioKbps = Math.floor((usableBytes * 8) / durationSeconds / 1000);
    const estBytes = ((audioBitrateKbps * 1000 * durationSeconds) / 8) / (1 - overhead);
    const estimatedOutputMb = Number((estBytes / (1024 * 1024)).toFixed(2));

    let feasibility: TargetSizeFeasibility = 'optimal';
    let qualityImpactLabel = 'High-clarity audio — plenty of bitrate headroom';
    let warning: string | undefined;
    const recoveryActions: TargetSizeRecoveryAction[] = [];

    if (rawAudioKbps < MIN_AUDIO_BITRATE_KBPS) {
      feasibility = 'impossible';
      qualityImpactLabel = 'Target too small for this audio duration';
      const minMb = Math.ceil(((64 * 1000 * durationSeconds) / 8 / (1 - overhead)) / (1024 * 1024) / safetyFactor);
      warning = `At ${Math.round(durationSeconds / 60)}m duration, even 32 kbps audio will exceed ${targetSizeMb} MB.`;
      recoveryActions.push({
        type: 'increase_size',
        label: `Increase target to ${Math.max(targetSizeMb + 1, minMb)} MB`,
        description: 'Ensures intelligible 64 kbps audio for this duration.',
        recommendedTargetMb: Math.max(targetSizeMb + 1, minMb),
      });
    } else if (audioBitrateKbps < 96) {
      feasibility = 'tight';
      qualityImpactLabel = 'Voice-only quality — music may sound compressed';
      warning = `Audio will be encoded at ${audioBitrateKbps} kbps to fit under ${targetSizeMb} MB.`;
    } else if (audioBitrateKbps < 160) {
      feasibility = 'moderate';
      qualityImpactLabel = 'Balanced audio compression — clean for sharing';
    }

    return {
      targetSizeMb,
      durationSeconds,
      containerOverheadPercent: Math.round(overhead * 1000) / 10,
      totalBitrateKbps: audioBitrateKbps,
      videoBitrateKbps: 0,
      audioBitrateKbps,
      estimatedOutputMb,
      feasibility,
      isAchievable: feasibility !== 'impossible',
      qualityImpactLabel,
      warning,
      recoveryActions,
      isAudioOnly: true,
      isLosslessFormat: false,
    };
  }

  // Video + Audio budget
  const rawVideoKbps = totalBitrateKbps - audioBitrateKbps;
  const videoBitrateKbps = Math.min(MAX_VIDEO_BITRATE_KBPS, Math.max(MIN_VIDEO_BITRATE_KBPS, rawVideoKbps));
  const combinedKbps = videoBitrateKbps + audioBitrateKbps;
  const estimatedBytes = ((combinedKbps * 1000 * durationSeconds) / 8) / (1 - overhead);
  const estimatedOutputMb = Number((estimatedBytes / (1024 * 1024)).toFixed(2));

  const thresholds = getResolutionBitrateThresholds(
    input.width,
    input.height,
    input.fps,
    input.videoCodec
  );

  let feasibility: TargetSizeFeasibility = 'optimal';
  let qualityImpactLabel = 'Minimal quality loss — sharp, clean export';
  let warning: string | undefined;
  const recoveryActions: TargetSizeRecoveryAction[] = [];

  if (rawVideoKbps < MIN_VIDEO_BITRATE_KBPS || estimatedOutputMb > targetSizeMb * 1.03) {
    feasibility = 'impossible';
    qualityImpactLabel = 'Target too small for this duration — extreme quality loss';
    warning = `Fitting ${Math.round(durationSeconds)}s of video into ${targetSizeMb} MB drops video bitrate below ${MIN_VIDEO_BITRATE_KBPS} kbps. Choose one of the fixes below.`;
  } else if (rawVideoKbps < thresholds.tightKbps) {
    feasibility = 'tight';
    qualityImpactLabel = 'Heavy compression — visible softness or blocking likely';
    warning = `Video bitrate (${videoBitrateKbps} kbps) is very tight for this resolution and duration.`;
  } else if (rawVideoKbps < thresholds.moderateKbps) {
    feasibility = 'moderate';
    qualityImpactLabel = 'Moderate compression — suitable for WhatsApp & Discord';
  } else if (rawVideoKbps < thresholds.optimalKbps) {
    feasibility = 'moderate';
    qualityImpactLabel = 'Balanced compression — good visual clarity';
  }

  // Build actionable recovery suggestions when tight or impossible
  if (feasibility === 'tight' || feasibility === 'impossible') {
    // 1. Recommend increasing target size to reach comfortable moderate bitrate
    const targetBitrateForModerate = thresholds.moderateKbps + audioBitrateKbps;
    const neededBytes = ((targetBitrateForModerate * 1000 * durationSeconds) / 8) / (1 - overhead) / safetyFactor;
    const recommendedMb = Math.max(targetSizeMb + 2, Math.ceil(neededBytes / (1024 * 1024)));
    recoveryActions.push({
      type: 'increase_size',
      label: `Increase target to ${recommendedMb} MB`,
      description: 'Gives the encoder enough headroom for clean video quality.',
      recommendedTargetMb: recommendedMb,
    });

    // 2. Recommend reducing resolution if currently > 480p
    const area = parsePixelArea(input.width, input.height);
    if (area > 1280 * 720 + 50000) {
      recoveryActions.push({
        type: 'reduce_resolution',
        label: 'Reduce resolution to 720p',
        description: 'Cuts pixel count by ~55% so the same MB budget looks sharper.',
        recommendedResolution: '1280x720',
      });
    } else if (area > 854 * 480 + 20000) {
      recoveryActions.push({
        type: 'reduce_resolution',
        label: 'Reduce resolution to 480p',
        description: 'Ideal for long WhatsApp or email clips under tight MB caps.',
        recommendedResolution: '854x480',
      });
    }

    // 3. Recommend reducing FPS if > 24
    if (!input.fps || input.fps > 24) {
      recoveryActions.push({
        type: 'reduce_fps',
        label: 'Lower frame rate to 24 FPS',
        description: 'Gives each video frame more bits without changing resolution.',
        recommendedFps: 24,
      });
    }

    // 4. Recommend removing audio if audio is currently kept
    if (keepAudio && hasAudio) {
      recoveryActions.push({
        type: 'remove_audio',
        label: 'Remove audio track',
        description: `Frees ${audioBitrateKbps} kbps directly for video quality.`,
      });
    }

    // 5. Recommend HEVC if currently using H.264
    if (!input.videoCodec || input.videoCodec === 'h264') {
      recoveryActions.push({
        type: 'efficient_codec',
        label: 'Use HEVC (H.265) codec',
        description: 'Delivers ~30% better visual quality at the same file size.',
        recommendedCodec: 'hevc',
      });
    }
  }

  return {
    targetSizeMb,
    durationSeconds,
    containerOverheadPercent: Math.round(overhead * 1000) / 10,
    totalBitrateKbps: combinedKbps,
    videoBitrateKbps,
    audioBitrateKbps,
    estimatedOutputMb,
    feasibility,
    isAchievable: feasibility !== 'impossible',
    qualityImpactLabel,
    warning,
    recoveryActions,
    isAudioOnly: false,
    isLosslessFormat: false,
  };
}

export function validateTargetSizeOutput(
  actualSizeBytes: number,
  targetSizeMb: number
): TargetSizeValidationResult {
  const actualSizeMb = Number((actualSizeBytes / (1024 * 1024)).toFixed(2));
  const deltaMb = Number((actualSizeMb - targetSizeMb).toFixed(2));

  if (actualSizeMb <= targetSizeMb) {
    return {
      status: 'hit',
      actualSizeMb,
      targetSizeMb,
      deltaMb,
      message: `Target met: ${actualSizeMb} MB (under your ${targetSizeMb} MB limit).`,
    };
  }

  const overPercent = ((actualSizeMb - targetSizeMb) / targetSizeMb) * 100;
  if (overPercent <= 10) {
    return {
      status: 'warning',
      actualSizeMb,
      targetSizeMb,
      deltaMb,
      message: `Slightly over target: ${actualSizeMb} MB vs ${targetSizeMb} MB limit (+${deltaMb} MB). Try Smallest quality or lower resolution.`,
    };
  }

  return {
    status: 'missed',
    actualSizeMb,
    targetSizeMb,
    deltaMb,
    message: `Output (${actualSizeMb} MB) exceeded the ${targetSizeMb} MB target by ${deltaMb} MB. Reduce resolution, lower FPS, or increase the target size.`,
  };
}
