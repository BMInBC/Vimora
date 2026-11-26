import type {
  ConversionOptions,
  EntitlementResult,
  PlanType,
} from '../types';

export const FREE_TIER_LIMITS = {
  maxBatchFiles: 3,
  maxResolutionHeight: 1080,
  maxCustomPresets: 1,
  maxHistoryEntries: 20,
  gpuAccelerationIncluded: true,
  watermark: false,
} as const;

export const PRO_TIER_LIMITS = {
  maxBatchFiles: Infinity,
  maxResolutionHeight: 4320, // 8K UHD
  maxCustomPresets: Infinity,
  maxHistoryEntries: Infinity,
  gpuAccelerationIncluded: true,
  watermark: false,
} as const;

export function getPlanLimits(plan: PlanType | boolean) {
  const isPro = plan === true || plan === 'pro';
  return isPro ? PRO_TIER_LIMITS : FREE_TIER_LIMITS;
}

export function checkBatchLimitEntitlement(
  isPro: boolean,
  currentBatchCount: number,
  addingCount = 1
): EntitlementResult {
  if (isPro) return { allowed: true };
  if (currentBatchCount + addingCount > FREE_TIER_LIMITS.maxBatchFiles) {
    return {
      allowed: false,
      upgradeTrigger: 'batch_limit',
      reason: `Free plan supports up to ${FREE_TIER_LIMITS.maxBatchFiles} files per batch. Upgrade to Pro for unlimited batch queues and parallel processing.`,
    };
  }
  return { allowed: true };
}

export function checkResolutionEntitlement(
  isPro: boolean,
  resolution?: string
): EntitlementResult {
  if (isPro || !resolution) return { allowed: true };
  const parts = resolution.split('x');
  if (parts.length !== 2) return { allowed: true };
  const w = parseInt(parts[0], 10);
  const h = parseInt(parts[1], 10);
  if (isNaN(w) || isNaN(h)) return { allowed: true };

  const minSide = Math.min(w, h);
  const maxSide = Math.max(w, h);
  // 1080p landscape (1920x1080) or vertical (1080x1920) is allowed on Free; >1080p (1440p/4K/5K/8K) requires Pro
  if (minSide > 1080 || maxSide > 1920) {
    return {
      allowed: false,
      upgradeTrigger: 'resolution_4k',
      reason: `Exporting above 1080p (${resolution}) is a Vimora Pro feature. Free includes unlimited 1080p exports with no watermark.`,
    };
  }
  return { allowed: true };
}

export function checkCustomPresetEntitlement(
  isPro: boolean,
  existingCustomCount: number
): EntitlementResult {
  if (isPro) return { allowed: true };
  if (existingCustomCount >= FREE_TIER_LIMITS.maxCustomPresets) {
    return {
      allowed: false,
      upgradeTrigger: 'custom_preset_limit',
      reason: `Free plan includes ${FREE_TIER_LIMITS.maxCustomPresets} custom preset. Upgrade to Pro for unlimited custom presets.`,
    };
  }
  return { allowed: true };
}

/**
 * Shared entitlement guard used by both UI and backend /api/convert route.
 */
export function checkConversionRequestEntitlement(
  isPro: boolean,
  options: ConversionOptions
): EntitlementResult {
  const resCheck = checkResolutionEntitlement(isPro, options.resolution);
  if (!resCheck.allowed) return resCheck;

  if (!isPro && options.presetId === 'archive_master') {
    return {
      allowed: false,
      upgradeTrigger: 'archival_codec',
      reason: 'Archive-Quality Master is a Vimora Pro workflow.',
    };
  }

  return { allowed: true };
}
