import type { ConversionJob, ConversionOptions, CreatorPreset } from '../types';

export const DEFAULT_FILENAME_PATTERN = '{original_name}-{preset}-{resolution}.{ext}';

/**
 * Strips characters disallowed in Windows/macOS/Linux filenames while preserving Unicode letters & spaces.
 */
export function sanitizeFilenameSegment(input: string, maxLength = 80): string {
  const cleaned = input
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\.+$/, '');
  if (!cleaned) return 'export';
  return cleaned.slice(0, maxLength).trim() || 'export';
}

export interface GenerateFilenameParams {
  originalFileName: string;
  outputFormat: string;
  preset?: CreatorPreset;
  resolution?: string;
  pattern?: string;
  existingNames?: Set<string> | string[];
}

export function generateOutputFilename(params: GenerateFilenameParams): string {
  const {
    originalFileName,
    outputFormat,
    preset,
    resolution,
    pattern = DEFAULT_FILENAME_PATTERN,
    existingNames,
  } = params;

  const baseOriginal = sanitizeFilenameSegment(
    originalFileName.replace(/\.[^/.]+$/, ''),
    70
  );
  const ext = sanitizeFilenameSegment(outputFormat.toLowerCase(), 10).replace(/^\.+/, '') || 'mp4';
  const presetSlug = sanitizeFilenameSegment(
    preset?.id || 'custom',
    30
  ).replace(/_/g, '-');
  const resSlug = sanitizeFilenameSegment(resolution || 'original', 20);
  const dateSlug = new Date().toISOString().slice(0, 10);

  let rendered = pattern
    .replace(/\{original_name\}/gi, baseOriginal)
    .replace(/\{preset\}/gi, presetSlug)
    .replace(/\{resolution\}/gi, resSlug)
    .replace(/\{date\}/gi, dateSlug)
    .replace(/\{ext\}/gi, ext);

  // Ensure the extension is present
  if (!rendered.toLowerCase().endsWith(`.${ext}`)) {
    rendered = `${rendered}.${ext}`;
  }

  // Collapse double dashes/spaces
  rendered = rendered.replace(/--+/g, '-').replace(/-\./g, '.');

  const existingSet =
    existingNames instanceof Set
      ? existingNames
      : new Set((existingNames || []).map((n) => n.toLowerCase()));

  if (!existingSet.has(rendered.toLowerCase())) {
    return rendered;
  }

  const stem = rendered.slice(0, -(ext.length + 1));
  let counter = 1;
  while (existingSet.has(`${stem}_${counter}.${ext}`.toLowerCase())) {
    counter++;
  }
  return `${stem}_${counter}.${ext}`;
}

export function isDuplicateJob(
  existingJobs: ConversionJob[],
  filePathOrName: string,
  options: ConversionOptions
): boolean {
  const normPath = filePathOrName.trim().toLowerCase();
  return existingJobs.some((job) => {
    if (job.status === 'completed' || job.status === 'cancelled') return false;
    const sameSource =
      job.file.path.trim().toLowerCase() === normPath ||
      job.file.name.trim().toLowerCase() === normPath;
    if (!sameSource) return false;
    return (
      job.options.outputFormat === options.outputFormat &&
      (job.options.presetId || '') === (options.presetId || '') &&
      (job.options.resolution || '') === (options.resolution || '') &&
      (job.options.targetSizeMb || 0) === (options.targetSizeMb || 0) &&
      (job.options.outputDirectory || '') === (options.outputDirectory || '')
    );
  });
}
