import type { FfmpegErrorCode, MappedFfmpegError } from '../types';

interface ErrorPattern {
  code: FfmpegErrorCode;
  test: (msg: string) => boolean;
  title: string;
  explanation: string;
  likelyCause: string;
  recommendedAction: string;
}

const ERROR_PATTERNS: ErrorPattern[] = [
  {
    code: 'canceled_by_user',
    test: (m) => /cancel|abort|sigkill|stopped by user/i.test(m),
    title: 'Conversion canceled',
    explanation: 'You stopped this export before it finished.',
    likelyCause: 'Canceled or paused manually.',
    recommendedAction: 'Click Start or Retry whenever you are ready to export again.',
  },
  {
    code: 'file_not_found',
    test: (m) => /enoent|no such file|file not found|does not exist|cannot find the file/i.test(m),
    title: 'Source file could not be found',
    explanation: 'Vimora could not locate the original media file on your device.',
    likelyCause: 'The file was moved, renamed, deleted, or is on a disconnected drive.',
    recommendedAction: 'Re-import the file using "Choose files" or drag it directly into Vimora.',
  },
  {
    code: 'disk_space',
    test: (m) => /enospc|no space left|disk full|not enough space/i.test(m),
    title: 'Not enough disk space',
    explanation: 'Your drive ran out of free space while writing the exported file.',
    likelyCause: 'The output folder drive is nearly full.',
    recommendedAction: 'Free up space on your drive or pick a different output folder in Settings.',
  },
  {
    code: 'permission_denied',
    test: (m) => /eacces|eperm|permission denied|access is denied|read-only file system/i.test(m),
    title: 'Cannot write to output folder',
    explanation: 'Your operating system blocked Vimora from saving to the selected destination.',
    likelyCause: 'The destination folder is protected, read-only, or the file is open in another app.',
    recommendedAction: 'Close any player using that file, or choose a writable folder like Downloads or Videos.',
  },
  {
    code: 'ffmpeg_missing',
    test: (m) => /ffmpeg.*not found|spawn ffmpeg|not recognized as an internal|binary missing|incompatible ffmpeg/i.test(m),
    title: 'FFmpeg engine is missing or unavailable',
    explanation: 'Vimora could not launch the local FFmpeg transcoder.',
    likelyCause: 'FFmpeg is not installed on PATH or the bundled binary is blocked by antivirus software.',
    recommendedAction: 'Check FFmpeg status in Settings or reinstall FFmpeg / Vimora Desktop.',
  },
  {
    code: 'gpu_unavailable',
    test: (m) => /nvenc|cuda|qsv|amf|videotoolbox|cannot load.*dll|no capable devices found|driver does not support/i.test(m),
    title: 'GPU hardware encoder unavailable',
    explanation: 'Your graphics driver or GPU rejected the requested hardware encoder.',
    likelyCause: 'Outdated GPU drivers, unsupported codec (e.g., HEVC/AV1 on older GPU), or concurrent NVENC session limit.',
    recommendedAction: 'Retry with CPU encoding (or toggle Hardware Acceleration off in Settings) and update GPU drivers.',
  },
  {
    code: 'corrupt_media',
    test: (m) => /invalid data found|moov atom not found|corrupt|could not find codec parameters|end of file/i.test(m),
    title: 'Media file appears corrupted or incomplete',
    explanation: 'FFmpeg could not read valid video/audio frames from this file.',
    likelyCause: 'An interrupted download, unfinished screen recording, or damaged container header.',
    recommendedAction: 'Try playing the source file in VLC or re-downloading it before converting.',
  },
  {
    code: 'unsupported_codec',
    test: (m) => /unknown encoder|encoder .* not found|unsupported codec|could not find tag for codec|invalid pixel format/i.test(m),
    title: 'Unsupported codec or container combination',
    explanation: 'The selected output format does not support this video or audio codec.',
    likelyCause: 'Mixing incompatible codecs and containers (for example, VP9 inside MP4 or FLAC in certain streams).',
    recommendedAction: 'Switch to a standard MP4 (H.264 + AAC) preset and retry.',
  },
  {
    code: 'target_size_impossible',
    test: (m) => /target size.*impossible|bitrate too low|cannot fit.*mb/i.test(m),
    title: 'Requested file size is too small',
    explanation: 'This video is too long to fit under the requested MB limit without breaking playback.',
    likelyCause: 'Extremely low bitrate budget for the clip duration.',
    recommendedAction: 'Increase the target MB, reduce resolution to 720p/480p, or lower FPS to 24.',
  },
  {
    code: 'invalid_destination',
    test: (m) => /invalid argument|invalid filename|filename too long|enametoolong|einval/i.test(m),
    title: 'Invalid output filename or path',
    explanation: 'The output file path contains unsupported characters or exceeds OS length limits.',
    likelyCause: 'Special characters or deeply nested folders in the destination path.',
    recommendedAction: 'Use a shorter filename or choose a simpler output directory in Settings.',
  },
];

export function mapFfmpegError(rawError: unknown): MappedFfmpegError {
  const rawMessage =
    rawError instanceof Error
      ? rawError.message
      : typeof rawError === 'string'
      ? rawError
      : 'An unexpected error occurred during local conversion.';

  for (const pattern of ERROR_PATTERNS) {
    if (pattern.test(rawMessage)) {
      return {
        code: pattern.code,
        title: pattern.title,
        explanation: pattern.explanation,
        likelyCause: pattern.likelyCause,
        recommendedAction: pattern.recommendedAction,
        technicalDetails: rawMessage,
      };
    }
  }

  return {
    code: 'unknown',
    title: 'Export did not complete',
    explanation: 'The local encoder stopped unexpectedly while processing this file.',
    likelyCause: 'Incompatible stream metadata, temporary hardware glitch, or system resource limit.',
    recommendedAction: 'Click "Retry with different settings" and try a standard H.264 MP4 preset.',
    technicalDetails: rawMessage,
  };
}
