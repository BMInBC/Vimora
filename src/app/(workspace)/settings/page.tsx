"use client";

import React, { useState, useEffect } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useAuth } from '@/lib/firebase/authContext';
import { getAppSettings, updateAppSettings } from '@/lib/storage/localHistory';
import { AppSettings } from '@/lib/types';
import Link from 'next/link';
import {
  Settings as SettingsIcon,
  Zap,
  HardDrive,
  Cpu,
  Shield,
  CheckCircle2,
  Lock,
  ArrowUpRight,
  LogOut,
  FolderOpen,
} from 'lucide-react';

export default function SettingsPage() {
  const { gpuCaps, outputDir, setOutputDir } = useWorkspace();
  const { user, isPro, logout } = useAuth();

  const [settings, setSettings] = useState<AppSettings>(getAppSettings());
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setSettings(getAppSettings());
  }, []);

  const handleUpdate = (updated: Partial<AppSettings>) => {
    const next = updateAppSettings(updated);
    setSettings(next);
    if (updated.defaultOutputDirectory !== undefined) {
      setOutputDir(updated.defaultOutputDirectory);
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-[#0B6FFB] border border-blue-200">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 font-nunito tracking-tight">
              Application Settings
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure hardware acceleration, default export locations, and engine preferences.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-[#0B6FFB] border border-blue-200 text-xs font-bold animate-fade-in">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Saved</span>
          </div>
        )}
      </div>

      <div className="space-y-5">
        {/* Hardware Acceleration & GPU Card */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#0B6FFB]" />
              <span>GPU Hardware Acceleration</span>
            </h3>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                gpuCaps?.hasGpu
                  ? 'bg-blue-50 text-[#0B6FFB] border border-blue-200'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {gpuCaps?.hasGpu ? 'GPU Detected' : 'CPU Only'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-900">Enable Dedicated GPU Encoding</p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Utilize NVIDIA NVENC, AMD AMF, or Intel QuickSync to accelerate conversions by up to 50x.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={settings.gpuAccelerationEnabled}
                onChange={(e) => handleUpdate({ gpuAccelerationEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0B6FFB]"></div>
            </label>
          </div>

          {gpuCaps?.hasGpu && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 text-[11px]">Detected Hardware:</span>
                <p className="font-bold text-slate-900 mt-0.5">{gpuCaps.displayName}</p>
              </div>
              <div>
                <span className="text-slate-500 text-[11px]">Primary Codec Encoders:</span>
                <p className="font-bold text-[#0B6FFB] mt-0.5">{gpuCaps.supportedVideoEncoders.join(', ')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Export & Storage Directory */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-2">
            <HardDrive className="w-4 h-4 text-[#0B6FFB]" />
            <span>Storage & Output Directory</span>
          </h3>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Default Destination Folder
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Leave blank to save in user Downloads or original folder..."
                value={settings.defaultOutputDirectory || ''}
                onChange={(e) => handleUpdate({ defaultOutputDirectory: e.target.value })}
                className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:border-[#0B6FFB]"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              When left blank, files save automatically to your Downloads folder or alongside the original.
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-100">
            <div>
              <p className="text-xs font-bold text-slate-900">Auto-Overwrite Existing Files</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Automatically replace existing output files without appending number suffixes.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={settings.autoOverwrite}
                onChange={(e) => handleUpdate({ autoOverwrite: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0B6FFB]"></div>
            </label>
          </div>
        </div>

        {/* Subscription & Account */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-2">
            <Shield className="w-4 h-4 text-[#0B6FFB]" />
            <span>Account & Plan</span>
          </h3>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">
                  {user?.displayName || user?.email || 'Local User'}
                </span>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${
                    isPro
                      ? 'bg-blue-50 text-[#0B6FFB] border border-blue-200'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {isPro ? '★ Pro Plan Active' : 'Free Tier'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {isPro
                  ? 'Unlimited conversions, 4K/8K resolution, and GPU acceleration unlocked.'
                  : 'Limited to 5 conversions per batch and 720p/CPU output.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {!isPro && (
                <Link
                  href="/pricing"
                  className="px-4 py-2 rounded-xl bg-[#0B6FFB] hover:bg-[#0958CC] text-white text-xs font-bold shadow-xs flex items-center gap-1 shrink-0"
                >
                  <span>Upgrade to Pro</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              )}

              {user && (
                <button
                  type="button"
                  onClick={() => logout()}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors shrink-0 cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
