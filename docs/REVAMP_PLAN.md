# Vimora Revamp Plan — Creator-First Local Export & Compression Workstation

> **Core Positioning:** Convert and compress video locally for TikTok, Reels, YouTube, WhatsApp, Discord, and X — no uploads, no watermark, no technical settings.

**Last Updated:** 2026-11-26  
**Current Status:** All 10 Phases Complete — Verified with automated unit tests, TypeScript check, and Next.js production build.

---

## Guiding Principles

1. **Local-first by default:** Media files, metadata, conversion history, and settings stay on the user's device.
2. **No watermarks** on free exports.
3. **Useful free plan:** Do not paywall basic conversion or GPU acceleration.
4. **Fast first export:** Import → Choose destination → Review → Export in under 60s for a short clip.
5. **Pre-conversion clarity:** Always show output container, resolution, codec, bitrate, estimated size, aspect-ratio treatment, and encoder before starting.
6. **Progressive disclosure:** Sensible defaults first; technical controls collapsed by default.
7. **Target-size compression as a flagship feature** (10 MB, 16 MB WhatsApp, 20 MB Discord, 50 MB, 100 MB, custom).
8. **Automatic, visible GPU acceleration** available to free users, with honest CPU fallback.
9. **Human-readable errors** with causes and recovery actions instead of raw FFmpeg logs.
10. **Preserve trust:** No fake progress, no fake file sizes, no silent video truncation (`-fs` removed).

---

## Codebase Audit & Architecture Summary

- **Stack:** Next.js `16.3.4` (App Router + Turbopack), React `19.2.8`, Tailwind CSS v4, TypeScript 5, Tauri v2 (`src-tauri/src/main.rs`), local FFmpeg/ffprobe.
- **Dual Build Modes:** Local Next.js server mode + static export (`NEXT_EXPORT=true`) for Tauri desktop packaging. (Avoid unguarded `useSearchParams()` without `<Suspense>`.)
- **Core FFmpeg Layer (`src/lib/ffmpeg/`):**
  - `presets.ts` — Destination groups, creator presets, quick actions.
  - `bitrateBudget.ts` — Target-size bitrate budgeting, feasibility warnings, recovery actions, post-conversion size validation.
  - `converter.ts` — Safe FFmpeg command builder, GPU multipass VBR (NVENC `-rc vbr -multipass fullres`), CPU 2-pass (`buildTwoPassFfmpegArgs`), Lanczos + BT.709 scaling.
  - `detector.ts` — Automatic GPU detection (NVENC, Intel QSV, AMD AMF, Apple VideoToolbox) + CPU fallback.
  - `changes.ts` — Pre-conversion diff / planned changes summary.
- **Desktop Bridge (`src/lib/desktop/tauriBridge.ts`):** Native file/folder picking, `ffprobe` metadata probing, real output `stat()` file sizing, streaming conversion progress, cancellation, and folder reveal.
- **Test Runner:** Native Node 24 test runner (`npm test` → `node --import ./scripts/ts-test-loader.mjs --test src/lib/ffmpeg/__tests__/*.test.ts`).

---

## Phased Checklist

### [x] Phase 1 — Product Architecture & Information Design
- [x] Refactor workflow around 5 clear steps: Import → Choose destination → Review changes → Convert → Export & reuse (`WorkflowStepper.tsx`)
- [x] Add visible local-privacy & honest GPU status strip (`WorkstationStatusStrip.tsx`)
- [x] Conversion-first workspace (`/converter`) with drag-and-drop, **Choose files**, **Choose folder** (`pickDesktopFolderFiles` + `webkitdirectory`), and Recent Conversions strip
- [x] 8 Quick-Action cards (`QuickActionGrid.tsx`): TikTok/Reels, YouTube, WhatsApp, Discord, X/Twitter, Extract MP3, Compress to target size, Custom export
- [x] Destination-first presets grouped into 6 categories (`DESTINATION_GROUPS`, 18 presets in `presets.ts`, `DestinationPresetPicker.tsx`)
- [x] Dedicated `/presets` and `/history` screens; updated `Sidebar.tsx` navigation
- [x] Progressive disclosure: collapsed custom container/format override by default
- [x] Enable GPU acceleration & honest GPU status for free users
- **Verified:** `npx tsc --noEmit` & `npm run build` passed (26/26 routes).

### [x] Phase 2 — Target-Size Compression
- [x] Bitrate budgeting engine (`src/lib/ffmpeg/bitrateBudget.ts`): container overhead, audio-first reservation, resolution/FPS/codec floors, feasibility scoring (`optimal`, `moderate`, `tight`, `impossible`), recovery suggestions
- [x] Post-conversion output size validation (`validateTargetSizeOutput`) + real desktop output sizing via `getDesktopFileSize()` (`stat()`)
- [x] Removed truncating `-fs` flag from `converter.ts`
- [x] Two-pass & GPU rate-control strategy:
  - GPU: Hardware-native multipass VBR (`-rc vbr -multipass fullres -b:v -maxrate -bufsize` on NVENC; VBV on QSV/AMF/VideoToolbox)
  - CPU: Standard FFmpeg 2-pass (`shouldUseCpuTwoPass`, `buildTwoPassFfmpegArgs`) wired into both Tauri desktop (`converter/page.tsx`) and local web API (`/api/convert/route.ts`)
  - UI switch: **Strict 2-pass size accuracy (CPU)** in `TargetSizePanel.tsx`
- [x] Flagship `TargetSizePanel.tsx` with quick choices: **10 MB, 16 MB (WhatsApp), 20 MB (Discord), 50 MB, 100 MB, Custom**, quality preference (**Smallest file / Balanced / Best quality**), optional duration preview, live budget breakdown, and one-click recovery buttons
- [x] Unit tests (`src/lib/ffmpeg/__tests__/bitrateBudget.test.ts`) — **10/10 passing**
- **Verified:** `npm test`, `npx tsc --noEmit`, and `npm run build` passed.

### [x] Phase 3 — Smart Vertical & Platform-Ready Exports
- [x] Landscape-to-vertical detection (`detectSourceOrientation`, `estimateCropLossPercent`) when selecting TikTok, Reels, YouTube Shorts, or other vertical presets
- [x] Visual framing choice with interactive 9:16 preview (`SmartVerticalPanel.tsx`): Crop to fill, Blurred background, Black bars, Keep original aspect ratio
- [x] Subject focus control: Center, Top, Bottom, Manual horizontal/vertical sliders wired into FFmpeg `crop` filter expressions (`buildVideoFilterExpression`)
- [x] Preserve BT.709 colorimetry + Lanczos scaling; warn when cropping removes visual content (~68% for 16:9 → 9:16)
- [x] Pre-export platform validator (`src/lib/ffmpeg/platformValidator.ts`): aspect ratio, resolution, duration range, max file size, audio channels/muted track, codec/container compatibility, unusual FPS warnings (non-blocking)
- [x] Unit tests (`src/lib/ffmpeg/__tests__/smartVertical.test.ts`) for aspect-ratio/crop filter generation and platform validation

### [x] Phase 4 — Better Conversion Intelligence
- [x] Enhanced pre-conversion review (`ConversionChangesPreview.tsx` & `changes.ts`) with predicted output filename, quality badge, and before→after diffs (`1920×1080 → 1080×1920`, `16:9 → 9:16`, `H.264 → H.264`, `180 MB → ~15.1 MB`, audio summary, honest encoder)
- [x] Estimated conversion time (`estimateConversionSeconds`, `recordLocalBenchmark`) backed by local speed benchmarks
- [x] Advanced technical settings collapsed by default

### [x] Phase 5 — GPU Acceleration & Performance
- [x] Hardware detection caching + manual **"Re-check hardware"** action in `WorkstationStatusStrip.tsx` and `/settings` (`detectGpuCapabilities({ forceRefresh: true })`)
- [x] Codec-validated encoder resolver (`resolveEncoderForCodec`) with honest CPU fallback (never claims GPU when CPU ran)
- [x] Dedicated Performance & Workstation Settings page (`/settings`): concurrent jobs, max CPU threads, GPU preference, hardware acceleration toggle, default output directory, filename pattern builder with live preview, keep original file, auto-rename collisions
- [x] Unit tests for encoder priority & fallback logic

### [x] Phase 6 — Batch Queue & Job Reliability
- [x] Safe sanitized filename pattern generator (`filenamePattern.ts`) with `{original_name}`, `{preset}`, `{resolution}`, `{date}`, `{ext}` tokens and collision avoidance (`_1`, `_2`)
- [x] Duplicate job prevention (`isDuplicateJob`)
- [x] **"Retry with different settings"** action on failed jobs
- [x] Unit tests for filename generation, sanitization, and deduplication

### [x] Phase 7 — History, Reuse & Templates
- [x] Custom presets CRUD (`customPresets.ts` + `/presets`): create, duplicate, delete, and 1-click use templates
- [x] Rich History filters (`/history`): status (completed/failed), media type (video/audio), date range (24h/7d/30d/all), search, and 1-click Rerun with preset + target MB
- [x] Export/Import settings & custom presets as JSON (`/settings`)
- [x] Local-only metadata privacy notice

### [x] Phase 8 — Free Tier & Monetization
- [x] Fair Free vs. Pro model in `src/lib/entitlements/index.ts` and `/pricing`:
  - Free: Unlimited MP4/MP3, no watermark, 1080p, GPU acceleration included, target-size compression, up to 3 files/batch, last 20 history entries, 1 custom preset
  - Pro: Unlimited batch & parallel processing, 4K/5K/8K, archival codecs, unlimited custom presets & history, watch folders & multi-output
- [x] Shared entitlement checks enforced in both UI and backend (`/api/convert/route.ts`)
- [x] Contextual, non-intrusive `<UpgradePromptBanner />` respecting first-conversion completion (`hasCompletedFirstConversion`)

### [x] Phase 9 — Error Handling & Trust
- [x] Centralized FFmpeg error mapper (`src/lib/ffmpeg/errorMapper.ts`) covering all 10 failure classes (file not found, disk space, permission denied, missing FFmpeg, GPU unavailable, corrupt media, unsupported codec, target size impossible, invalid destination, canceled by user)
- [x] Plain-English `<ErrorDisplayCard />` with title, explanation, likely cause, recommended fix, expandable technical details, and Retry action
- [x] Unit tests for error mapping

### [x] Phase 10 — UI/UX Polish & Accessibility
- [x] Clean creator-tool aesthetic, accessible ARIA roles (`role="alert"`, `role="status"`, `role="switch"`, `role="listbox"`, `aria-current="step"`, `aria-expanded`), descriptive labels, and teaching empty states
- [x] Full automated unit test suite (`npm test`), TypeScript check (`npx tsc --noEmit`), and Next.js production build (`npm run build`) verified

---

## Risks & Assumptions Log

- **Static export constraint:** Tauri packaging uses `output: "export"`, so client pages read URL params via `window.location.search` in `useEffect` rather than unguarded `useSearchParams()`.
- **Local web vs. Desktop parity:** Browser uploads stage temporarily in `os.tmpdir()/vimora_staging` and clean up on completion/abort; Tauri desktop operates directly on local file paths with zero staging overhead.
- **Testability:** Pure FFmpeg logic (`bitrateBudget.ts`, `converter.ts`, `presets.ts`, and upcoming validators/mappers) is kept framework-agnostic so Node's native test runner executes tests in milliseconds.
