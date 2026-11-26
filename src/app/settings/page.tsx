"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/firebase/authContext';
import { Logo } from '@/components/Logo';
import {
  getAppSettings,
  updateAppSettings,
} from '@/lib/storage/localHistory';
import {
  exportSettingsBundleJson,
  importSettingsBundleJson,
} from '@/lib/storage/customPresets';
import { detectGpuCapabilities } from '@/lib/ffmpeg/detector';
import {
  DEFAULT_FILENAME_PATTERN,
  generateOutputFilename,
} from '@/lib/ffmpeg/filenamePattern';
import {
  isDesktopApp,
  pickDesktopOutputDirectory,
} from '@/lib/desktop/tauriBridge';
import type { AppSettings, GpuCapabilities, GpuEncoderType } from '@/lib/types';
import {
  Settings as SettingsIcon,
  Cpu,
  Zap,
  RefreshCw,
  FolderOpen,
  FileOutput,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Sliders,
  User,
  ShieldCheck,
} from 'lucide-react';

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(getAppSettings());
  const [gpuCaps, setGpuCaps] = useState<GpuCapabilities | null>(null);
  const [isRechecking, setIsRechecking] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSettings(getAppSettings());
    detectGpuCapabilities().then(setGpuCaps).catch(() => {});
  }, []);

  const handleUpdate = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const next = updateAppSettings({ [key]: value });
    setSettings(next);
  };

  const handleRecheckHardware = async () => {
    setIsRechecking(true);
    try {
      const fresh = await detectGpuCapabilities({ forceRefresh: true });
      setGpuCaps(fresh);
      setNotice({
        type: 'success',
        text: fresh.hasGpu
          ? `Hardware verified: ${fresh.displayName}`
          : 'Hardware check complete: CPU software encoding active.',
      });
    } finally {
      setIsRechecking(false);
    }
  };

  const handlePickOutputFolder = async () => {
    if (isDesktopApp()) {
      const picked = await pickDesktopOutputDirectory();
      if (picked) {
        handleUpdate('defaultOutputDirectory', picked);
      }
    }
  };

  const handleExportJson = () => {
    const json = exportSettingsBundleJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vimora-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setNotice({ type: 'success', text: 'Settings and custom presets exported as JSON.' });
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const res = importSettingsBundleJson(text);
    if (res.success) {
      setSettings(getAppSettings());
      setNotice({
        type: 'success',
        text: `Imported settings and ${res.importedPresetsCount} custom preset(s).`,
      });
    } else {
      setNotice({ type: 'error', text: res.error || 'Import failed.' });
    }
    e.target.value = '';
  };

  const filenamePreview = generateOutputFilename({
    originalFileName: 'Vacation Clip 2026.mov',
    outputFormat: 'mp4',
    resolution: '1080x1920',
    pattern: settings.filenamePattern || DEFAULT_FILENAME_PATTERN,
  });

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 font-sans pb-16">
      <header className="bg-white/85 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {!loading && !user && (
              <Link href="/" className="flex items-center gap-2 shrink-0">
                <Logo size={28} priority />
              </Link>
            )}
            <div className="flex items-center gap-2">
              <SettingsIcon className="w-4 h-4 text-[#0B6FFB]" />
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900">
                Workstation & Performance Settings
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/user"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
            >
              <User className="w-3.5 h-3.5" />
              <span>Account</span>
            </Link>
            <Link
              href="/converter"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Converter</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-8 space-y-6">
        {notice && (
          <div
            role="status"
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-xs font-semibold ${
              notice.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {notice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{notice.text}</span>
          </div>
        )}

        {/* Hardware & GPU Acceleration */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0B6FFB] flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">
                  GPU Acceleration & Local FFmpeg Engine
                </h2>
                <p className="text-xs text-slate-500">
                  Hardware encoding is automatic and available on Free & Pro plans.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRecheckHardware}
              disabled={isRechecking}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRechecking ? 'animate-spin' : ''}`} />
              <span>Re-check hardware</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Detected Engine</span>
              <p className="font-extrabold text-slate-900">
                {gpuCaps ? gpuCaps.displayName : 'Checking hardware…'}
              </p>
              <p className="font-mono text-[11px] text-slate-500">
                Encoders: {gpuCaps?.supportedVideoEncoders.join(', ') || 'libx264'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
              <div>
                <span className="font-bold text-slate-900 block">Hardware acceleration</span>
                <span className="text-[11px] text-slate-500">
                  Offload encoding to NVENC / QSV / AMF / VideoToolbox
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.gpuAccelerationEnabled}
                aria-label="Enable hardware acceleration"
                onClick={() =>
                  handleUpdate('gpuAccelerationEnabled', !settings.gpuAccelerationEnabled)
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  settings.gpuAccelerationEnabled ? 'bg-[#0B6FFB]' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-xs transform transition-transform ${
                    settings.gpuAccelerationEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
            <label className="space-y-1.5 block">
              <span className="font-bold text-slate-700 block">GPU Preference</span>
              <select
                value={settings.gpuPreference || 'auto'}
                onChange={(e) =>
                  handleUpdate('gpuPreference', e.target.value as 'auto' | GpuEncoderType)
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800"
              >
                <option value="auto">Auto-detect best encoder</option>
                <option value="nvenc">NVIDIA NVENC</option>
                <option value="qsv">Intel Quick Sync (QSV)</option>
                <option value="amf">AMD AMF</option>
                <option value="videotoolbox">Apple VideoToolbox</option>
                <option value="cpu">Force CPU software (x264/x265)</option>
              </select>
            </label>

            <label className="space-y-1.5 block">
              <span className="font-bold text-slate-700 block">Concurrent Jobs</span>
              <select
                value={settings.maxConcurrentJobs}
                onChange={(e) =>
                  handleUpdate('maxConcurrentJobs', parseInt(e.target.value, 10))
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800"
              >
                <option value={1}>1 job at a time (quietest)</option>
                <option value={2}>2 concurrent jobs (recommended)</option>
                <option value={3}>3 concurrent jobs</option>
                <option value={4}>4 concurrent jobs (workstation)</option>
              </select>
            </label>

            <label className="space-y-1.5 block">
              <span className="font-bold text-slate-700 block">Max CPU Threads</span>
              <select
                value={settings.maxCpuThreads || 0}
                onChange={(e) =>
                  handleUpdate('maxCpuThreads', parseInt(e.target.value, 10))
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800"
              >
                <option value={0}>Auto (FFmpeg default)</option>
                <option value={2}>2 threads</option>
                <option value={4}>4 threads</option>
                <option value={8}>8 threads</option>
                <option value={16}>16 threads</option>
              </select>
            </label>
          </div>
        </section>

        {/* Output Folder & Filename Pattern */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileOutput className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">
                Output Folder & Filename Pattern
              </h2>
              <p className="text-xs text-slate-500">
                Control where exports are saved and how files are named automatically.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="space-y-1.5">
              <label htmlFor="default-output-dir" className="font-bold text-slate-700 block">
                Default Output Directory
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="default-output-dir"
                  type="text"
                  value={settings.defaultOutputDirectory}
                  onChange={(e) => handleUpdate('defaultOutputDirectory', e.target.value)}
                  placeholder="Defaults to your Downloads folder"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono text-xs text-slate-800"
                />
                {isDesktopApp() && (
                  <button
                    type="button"
                    onClick={handlePickOutputFolder}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Browse</span>
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="filename-pattern" className="font-bold text-slate-700 block">
                Filename Pattern
              </label>
              <input
                id="filename-pattern"
                type="text"
                value={settings.filenamePattern || DEFAULT_FILENAME_PATTERN}
                onChange={(e) => handleUpdate('filenamePattern', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono text-xs text-slate-800"
              />
              <p className="text-[11px] text-slate-500">
                Tokens: <code className="font-mono">{'{original_name}'}</code>,{' '}
                <code className="font-mono">{'{preset}'}</code>,{' '}
                <code className="font-mono">{'{resolution}'}</code>,{' '}
                <code className="font-mono">{'{date}'}</code>,{' '}
                <code className="font-mono">{'{ext}'}</code>
              </p>
              <p className="text-[11px] text-emerald-700 font-mono bg-emerald-50/70 border border-emerald-200/70 px-2.5 py-1.5 rounded-lg">
                Preview: {filenamePreview}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/70 cursor-pointer">
                <div>
                  <span className="font-bold text-slate-900 block">Keep original files</span>
                  <span className="text-[11px] text-slate-500">Never delete or overwrite source media</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.keepOriginalFile !== false}
                  onChange={(e) => handleUpdate('keepOriginalFile', e.target.checked)}
                  className="w-4 h-4 accent-[#0B6FFB]"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/70 cursor-pointer">
                <div>
                  <span className="font-bold text-slate-900 block">Auto-rename collisions</span>
                  <span className="text-[11px] text-slate-500">Append _1, _2 instead of overwriting</span>
                </div>
                <input
                  type="checkbox"
                  checked={!settings.autoOverwrite}
                  onChange={(e) => handleUpdate('autoOverwrite', !e.target.checked)}
                  className="w-4 h-4 accent-[#0B6FFB]"
                />
              </label>
            </div>
          </div>
        </section>

        {/* Backup / Transfer Settings as JSON */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">
                Export or Import Settings & Custom Presets (JSON)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                All settings stay local on this device. Export a JSON backup to transfer to another machine.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportJson}
              className="hidden"
            />
            <button
              type="button"
              onClick={handleExportJson}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import JSON</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
