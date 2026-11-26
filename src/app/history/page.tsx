"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/firebase/authContext';
import { Logo } from '@/components/Logo';
import {
  getLocalHistory,
  deleteLocalHistoryRecord,
  clearLocalHistory,
} from '@/lib/storage/localHistory';
import { FREE_TIER_LIMITS } from '@/lib/entitlements';
import { isDesktopApp, openDesktopFolder } from '@/lib/desktop/tauriBridge';
import { LocalHistoryRecord } from '@/lib/types';
import {
  History as HistoryIcon,
  Search,
  Trash2,
  FolderOpen,
  Sliders,
  HardDrive,
  Zap,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';

const AUDIO_FORMATS = new Set(['mp3', 'wav', 'aac', 'flac', 'ogg']);

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(ts: number): string {
  if (!ts) return 'Just now';
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HistoryPage() {
  const { user, isPro, loading } = useAuth();
  const [history, setHistory] = useState<LocalHistoryRecord[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'failed'>('all');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'video' | 'audio'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7d' | '30d'>('all');

  const reload = () => {
    setHistory(getLocalHistory(user?.uid));
  };

  useEffect(() => {
    reload();
  }, [user?.uid]);

  const visibleHistory = useMemo(() => {
    return isPro ? history : history.slice(0, FREE_TIER_LIMITS.maxHistoryEntries);
  }, [history, isPro]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = Date.now();
    return visibleHistory.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      const isAudio = AUDIO_FORMATS.has(item.outputFormat.toLowerCase());
      if (mediaFilter === 'audio' && !isAudio) return false;
      if (mediaFilter === 'video' && isAudio) return false;

      if (dateFilter !== 'all' && item.timestamp) {
        const ageMs = now - item.timestamp;
        if (dateFilter === 'today' && ageMs > 24 * 3600 * 1000) return false;
        if (dateFilter === '7d' && ageMs > 7 * 24 * 3600 * 1000) return false;
        if (dateFilter === '30d' && ageMs > 30 * 24 * 3600 * 1000) return false;
      }

      if (!q) return true;
      return (
        item.originalFileName.toLowerCase().includes(q) ||
        item.outputFormat.toLowerCase().includes(q) ||
        (item.presetUsed && item.presetUsed.toLowerCase().includes(q))
      );
    });
  }, [visibleHistory, search, statusFilter, mediaFilter, dateFilter]);

  const totalSaved = useMemo(
    () => visibleHistory.reduce((acc, r) => acc + Math.max(0, r.bytesSaved || 0), 0),
    [visibleHistory]
  );

  const gpuCount = useMemo(
    () => visibleHistory.filter((r) => r.isGpuAccelerated).length,
    [visibleHistory]
  );

  const handleOpenFolder = async (folderPath?: string) => {
    if (!folderPath) return;
    if (isDesktopApp()) {
      await openDesktopFolder(folderPath);
      return;
    }
    try {
      await fetch('/api/open-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: folderPath, folderPath }),
      });
    } catch {}
  };

  const handleDelete = (id: string) => {
    deleteLocalHistoryRecord(id, user?.uid);
    reload();
  };

  const handleClearAll = () => {
    if (window.confirm('Clear all local conversion history on this device?')) {
      clearLocalHistory(user?.uid);
      reload();
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 font-sans pb-16">
      <header className="bg-white/85 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {!loading && !user && (
              <Link href="/" className="flex items-center gap-2 shrink-0">
                <Logo size={28} priority />
              </Link>
            )}
            <div className="flex items-center gap-2">
              <HistoryIcon className="w-4 h-4 text-[#0B6FFB]" />
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900">
                Conversion History
              </h1>
            </div>
          </div>

          <Link
            href="/converter"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>New Conversion</span>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Only non-sensitive export metadata is stored locally on this device. Your media files never leave your machine.
            </span>
          </div>
          {history.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-red-600 hover:text-red-700 font-bold shrink-0 cursor-pointer"
            >
              Clear history
            </button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0B6FFB] flex items-center justify-center">
              <HistoryIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Recorded Exports
              </p>
              <p className="text-xl font-extrabold text-slate-900">
                {visibleHistory.length}
                {!isPro && history.length > FREE_TIER_LIMITS.maxHistoryEntries && (
                  <span className="text-xs font-semibold text-slate-400 ml-1">
                    / {FREE_TIER_LIMITS.maxHistoryEntries} free
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Space Saved
              </p>
              <p className="text-xl font-extrabold text-slate-900">{formatBytes(totalSaved)}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                GPU Accelerated
              </p>
              <p className="text-xl font-extrabold text-slate-900">{gpuCount}</p>
            </div>
          </div>
        </div>

        {/* Rich Filters Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {(['all', 'completed', 'failed'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-colors cursor-pointer ${
                  statusFilter === status
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                {status}
              </button>
            ))}

            <span className="text-slate-300">|</span>

            {(['all', 'video', 'audio'] as const).map((media) => (
              <button
                key={media}
                type="button"
                onClick={() => setMediaFilter(media)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-colors cursor-pointer ${
                  mediaFilter === media
                    ? 'bg-[#0B6FFB] text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                {media === 'all' ? 'Video & Audio' : media}
              </button>
            ))}

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              aria-label="Filter history by date"
              className="px-3 py-1.5 rounded-full text-xs font-bold bg-white border border-slate-200 text-slate-700"
            >
              <option value="all">All time</option>
              <option value="today">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search filename or preset..."
              aria-label="Search conversion history"
              className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B6FFB]/20 focus:border-[#0B6FFB]"
            />
          </div>
        </div>

        {/* History List */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <HistoryIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-900">
                {history.length === 0 ? 'No local conversions yet' : 'No matching history entries'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {history.length === 0
                  ? 'Import a video or audio file to prepare it for TikTok, YouTube, WhatsApp, or Discord.'
                  : 'Try adjusting your search or filter criteria.'}
              </p>
            </div>
            {history.length === 0 && (
              <Link
                href="/converter"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B6FFB] hover:bg-[#0958cc] text-white text-xs font-bold transition-colors"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Start your first conversion</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            {filtered.map((item) => {
              const rerunParams = new URLSearchParams();
              if (item.presetId) rerunParams.set('preset', item.presetId);
              if (item.targetSizeMb) rerunParams.set('targetMb', String(item.targetSizeMb));
              const rerunHref = `/converter${rerunParams.toString() ? `?${rerunParams.toString()}` : ''}`;

              return (
                <div
                  key={item.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        item.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {item.status === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {item.originalFileName}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5 text-[11px] text-slate-500">
                        <span className="font-mono font-bold uppercase text-slate-700">
                          .{item.outputFormat}
                        </span>
                        {item.presetUsed && <span>• {item.presetUsed}</span>}
                        <span>• {formatBytes(item.outputSizeBytes)}</span>
                        {item.bytesSaved > 0 && (
                          <span className="text-emerald-600 font-semibold">
                            (-{formatBytes(item.bytesSaved)})
                          </span>
                        )}
                        <span>• {item.encoderUsed}</span>
                        <span>• {formatDate(item.timestamp)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={rerunHref}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                      title="Rerun with these settings"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Rerun</span>
                    </Link>
                    {item.outputPath && (
                      <button
                        type="button"
                        onClick={() => handleOpenFolder(item.outputPath)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                        title="Open output folder"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>Open</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Delete entry"
                      aria-label={`Delete ${item.originalFileName} from history`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
