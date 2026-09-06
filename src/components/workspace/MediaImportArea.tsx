"use client";

import React, { useRef, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import {
  UploadCloud,
  FileVideo,
  FileAudio,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  Film,
  Music,
} from 'lucide-react';

interface MediaImportAreaProps {
  toolLabel?: string;
}

export function MediaImportArea({ toolLabel = 'Convert' }: MediaImportAreaProps) {
  const {
    selectedFile,
    mediaInfo,
    handleFileSelected,
    requestFileRemoval,
    confirmFileRemoval,
    cancelFileRemoval,
    isRemoveModalOpen,
    formatSize,
  } = useWorkspace();

  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  return (
    <>
      <div className="w-full">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,audio/*,.mp4,.mov,.mkv,.avi,.webm,.mp3,.wav,.aac,.flac,.ogg,.m4a"
          onChange={handleChange}
          className="hidden"
        />

        {!selectedFile ? (
          /* Empty Dropzone State */
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative group cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 ${
              dragActive
                ? 'border-[#0B6FFB] bg-blue-50/50 scale-[1.008]'
                : 'border-slate-300 bg-slate-50/60 hover:bg-blue-50/20 hover:border-[#0B6FFB]'
            }`}
          >
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0B6FFB] group-hover:scale-110 group-hover:bg-[#0B6FFB] group-hover:text-white transition-all shadow-sm">
                <UploadCloud className="w-7 h-7" />
              </div>

              <div>
                <p className="text-base font-bold text-slate-900 tracking-tight">
                  Drop your video or audio file here to {toolLabel}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  or <span className="text-[#0B6FFB] font-semibold underline underline-offset-2">browse your computer</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px] text-slate-500 font-medium">
                <span className="px-2.5 py-0.5 rounded-md bg-white border border-slate-200 shadow-xs">MP4, MOV, MKV, WebM</span>
                <span className="px-2.5 py-0.5 rounded-md bg-white border border-slate-200 shadow-xs">MP3, WAV, FLAC, AAC</span>
                <span className="px-2.5 py-0.5 rounded-md bg-blue-50 border border-blue-100 text-[#0B6FFB] font-semibold">100% Private (No Cloud Upload)</span>
              </div>
            </div>
          </div>
        ) : (
          /* Active File Display Card */
          <div className="relative rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0B6FFB] shrink-0 shadow-xs">
                {mediaInfo?.hasVideo ? <Film className="w-6 h-6" /> : <Music className="w-6 h-6" />}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900 truncate max-w-[280px] sm:max-w-md">
                    {mediaInfo?.name}
                  </h3>
                  <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-md bg-blue-50 text-[#0B6FFB] border border-blue-200">
                    {mediaInfo?.format}
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                  <span>{formatSize(mediaInfo?.sizeBytes || 0)}</span>
                  {mediaInfo?.width && mediaInfo?.height && (
                    <>
                      <span>•</span>
                      <span>{mediaInfo.width} × {mediaInfo.height}</span>
                    </>
                  )}
                  {mediaInfo?.durationSeconds && (
                    <>
                      <span>•</span>
                      <span>{Math.floor(mediaInfo.durationSeconds / 60)}m {mediaInfo.durationSeconds % 60}s</span>
                    </>
                  )}
                  <span>•</span>
                  <span className="text-emerald-600 font-semibold inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Ready
                  </span>
                </div>
              </div>
            </div>

            {/* Actions: Change / Remove File */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => requestFileRemoval(() => fileInputRef.current?.click())}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors shadow-xs"
              >
                Change File
              </button>

              <button
                type="button"
                onClick={() => requestFileRemoval()}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                title="Remove selected file"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Remove Confirmation Modal */}
      {isRemoveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Remove Selected File?</h4>
                <p className="text-xs text-slate-500">Confirmation required</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove <span className="text-slate-900 font-bold">{selectedFile?.name}</span>?
              Your original file on disk will never be touched, but the active preview will be reset.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={cancelFileRemoval}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmFileRemoval}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0B6FFB] hover:bg-[#0958CC] text-white shadow-md shadow-[#0B6FFB]/25 transition-colors"
              >
                Yes, Remove File
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
