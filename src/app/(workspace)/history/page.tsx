"use client";

import React, { useState, useMemo } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import {
  History as HistoryIcon,
  Search,
  Trash2,
  FolderOpen,
  Download,
  Zap,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  Clock,
  Film,
  Music,
} from 'lucide-react';

export default function HistoryPage() {
  const {
    history,
    deleteHistoryItem,
    clearHistory,
    formatSize,
  } = useWorkspace();

  const [searchTerm, setSearchTerm] = useState('');
  const [formatFilter, setFormatFilter] = useState('all');

  const totalBytesSaved = useMemo(() => {
    return history.reduce((acc, item) => acc + (item.bytesSaved || 0), 0);
  }, [history]);

  const gpuConversionsCount = useMemo(() => {
    return history.filter((item) => item.isGpuAccelerated).length;
  }, [history]);

  const availableFormats = useMemo(() => {
    return Array.from(new Set(history.map((h) => h.outputFormat.toLowerCase())));
  }, [history]);

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        !search ||
        item.originalFileName.toLowerCase().includes(search) ||
        item.outputFormat.toLowerCase().includes(search) ||
        (item.presetUsed && item.presetUsed.toLowerCase().includes(search));

      const matchesFormat =
        formatFilter === 'all' || item.outputFormat.toLowerCase() === formatFilter.toLowerCase();

      return matchesSearch && matchesFormat;
    });
  }, [history, searchTerm, formatFilter]);

  const revealFolder = async (folderPath?: string) => {
    if (!folderPath) return;
    try {
      await fetch('/api/open-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: folderPath, folderPath }),
      });
    } catch {}
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-[#0B6FFB] border border-blue-200">
              <HistoryIcon className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 font-nunito tracking-tight">
              Conversion History
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Local record of processed files, storage space saved, and hardware performance metrics.
          </p>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            onClick={clearHistory}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-600 text-xs font-semibold border border-slate-200 hover:border-rose-200 transition-colors self-start sm:self-auto cursor-pointer"
          >
            Clear All History
          </button>
        )}
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Files Processed</p>
          <p className="text-xl font-extrabold text-slate-900 mt-0.5">{history.length}</p>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Disk Space Saved</p>
          <p className="text-xl font-extrabold text-emerald-600 mt-0.5">{formatSize(totalBytesSaved)}</p>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">GPU Accelerated Runs</p>
          <p className="text-xl font-extrabold text-[#0B6FFB] mt-0.5">{gpuConversionsCount}</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by file name or format..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:border-[#0B6FFB]"
          />
        </div>

        <select
          value={formatFilter}
          onChange={(e) => setFormatFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-[#0B6FFB]"
        >
          <option value="all">All Formats</option>
          {availableFormats.map((f) => (
            <option key={f} value={f} className="uppercase">
              .{f}
            </option>
          ))}
        </select>
      </div>

      {/* History Items List */}
      {filteredHistory.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-3 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0B6FFB] mx-auto">
            <HistoryIcon className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No history records found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm || formatFilter !== 'all'
              ? 'Try changing your search keywords or format filters.'
              : 'Converted, compressed, and enhanced files will show up here automatically.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredHistory.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0B6FFB] shrink-0">
                  <Film className="w-5 h-5" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs font-bold text-slate-900 truncate max-w-xs sm:max-w-md">
                      {item.originalFileName}
                    </h4>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-50 text-[#0B6FFB] border border-blue-200">
                      .{item.outputFormat}
                    </span>
                    {item.isGpuAccelerated && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5 fill-current text-amber-500" /> GPU
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 mt-1 text-[11px] text-slate-500">
                    <span>{formatSize(item.originalSizeBytes)} ➔ {formatSize(item.outputSizeBytes)}</span>
                    {item.bytesSaved > 0 && (
                      <span className="text-emerald-600 font-semibold">
                        (saved {formatSize(item.bytesSaved)})
                      </span>
                    )}
                    <span>•</span>
                    <span>{item.durationSeconds}s runtime</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                {item.outputPath && (
                  <button
                    type="button"
                    onClick={() => revealFolder(item.outputPath)}
                    className="p-2 rounded-lg bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors cursor-pointer"
                    title="Reveal folder"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => deleteHistoryItem(item.id)}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                  title="Delete record"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
