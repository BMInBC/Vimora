"use client";

import React from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useAuth } from '@/lib/firebase/authContext';
import Link from 'next/link';
import {
  ListVideo,
  Play,
  Pause,
  Trash2,
  FolderOpen,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  Cpu,
  RefreshCw,
  PlusCircle,
  Film,
  Music,
} from 'lucide-react';

export default function QueuePage() {
  const {
    jobs,
    runSingleJob,
    removeJob,
    convertAll,
    clearAllJobs,
    isConvertingAll,
    formatSize,
    gpuCaps,
  } = useWorkspace();
  const { isPro } = useAuth();

  const queuedCount = jobs.filter((j) => j.status === 'queued').length;
  const completedCount = jobs.filter((j) => j.status === 'completed').length;
  const convertingCount = jobs.filter((j) => j.status === 'converting').length;

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
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-[#0B6FFB] border border-blue-200">
              <ListVideo className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 font-nunito tracking-tight">
              Processing Queue
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage your queued conversions, compressions, and visual enhancements.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {jobs.length > 0 && (
            <button
              type="button"
              disabled={isConvertingAll}
              onClick={clearAllJobs}
              className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Clear Finished
            </button>
          )}

          <button
            type="button"
            disabled={isConvertingAll || queuedCount === 0}
            onClick={convertAll}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B6FFB] hover:bg-[#0958CC] text-white text-xs font-bold shadow-md shadow-[#0B6FFB]/25 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isConvertingAll ? 'animate-spin' : ''}`} />
            <span>{isConvertingAll ? 'Processing Queue...' : `Start All (${queuedCount})`}</span>
          </button>
        </div>
      </div>

      {/* Queue Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total in Queue</p>
          <p className="text-xl font-extrabold text-slate-900 mt-0.5">{jobs.length}</p>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Pending</p>
          <p className="text-xl font-extrabold text-[#0B6FFB] mt-0.5">{queuedCount}</p>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Processing</p>
          <p className="text-xl font-extrabold text-amber-500 mt-0.5">{convertingCount}</p>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Completed</p>
          <p className="text-xl font-extrabold text-emerald-600 mt-0.5">{completedCount}</p>
        </div>
      </div>

      {/* Queue Items List */}
      {jobs.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0B6FFB] mx-auto">
            <ListVideo className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Your queue is currently empty</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Add files to queue from Convert, Compress, or Enhance to batch process them.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/convert"
              className="px-4 py-2 rounded-xl bg-[#0B6FFB] text-white text-xs font-bold shadow-md shadow-[#0B6FFB]/20"
            >
              Go to Convert
            </Link>
            <Link
              href="/compress"
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200"
            >
              Go to Compress
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const isCompleted = job.status === 'completed';
            const isConverting = job.status === 'converting';
            const isFailed = job.status === 'failed';

            return (
              <div
                key={job.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs"
              >
                {/* File Details */}
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0B6FFB] shrink-0">
                    {job.file.hasVideo ? <Film className="w-6 h-6" /> : <Music className="w-6 h-6" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900 truncate max-w-xs sm:max-w-md">
                        {job.file.name}
                      </h4>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-blue-50 text-[#0B6FFB] border border-blue-200">
                        ➔ {job.options.outputFormat.toUpperCase()}
                      </span>
                      {job.options.toolType && (
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {job.options.toolType}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                      <span>{formatSize(job.file.sizeBytes)}</span>
                      {job.outputSizeBytes && isCompleted && (
                        <>
                          <span>➔</span>
                          <span className="text-emerald-600 font-bold">
                            {formatSize(job.outputSizeBytes)}
                          </span>
                        </>
                      )}
                      <span>•</span>
                      {isCompleted ? (
                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                        </span>
                      ) : isConverting ? (
                        <span className="text-[#0B6FFB] font-bold flex items-center gap-1">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processing ({job.progress.percent}%)
                        </span>
                      ) : isFailed ? (
                        <span className="text-rose-600 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> Failed
                        </span>
                      ) : (
                        <span className="text-slate-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Queued
                        </span>
                      )}
                    </div>

                    {/* Progress Bar for Converting Jobs */}
                    {isConverting && (
                      <div className="w-full mt-3">
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#0B6FFB] transition-all duration-300"
                            style={{ width: `${job.progress.percent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Job Action Buttons */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {isCompleted ? (
                    <>
                      {job.outputPath && (
                        <button
                          type="button"
                          onClick={() => revealFolder(job.outputPath)}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 flex items-center gap-1.5 cursor-pointer"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          <span>Show in Folder</span>
                        </button>
                      )}

                      {job.downloadUrl && (
                        <a
                          href={job.downloadUrl}
                          download
                          className="px-3.5 py-1.5 rounded-xl bg-[#0B6FFB] hover:bg-[#0958CC] text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </a>
                      )}
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={isConverting}
                      onClick={() => runSingleJob(job.id)}
                      className="px-3 py-1.5 rounded-xl bg-[#0B6FFB] hover:bg-[#0958CC] text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{isFailed ? 'Retry' : 'Process'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => removeJob(job.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                    title="Remove from queue"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
