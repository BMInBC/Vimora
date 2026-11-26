"use client";

import React from 'react';
import { CREATOR_PRESETS, DESTINATION_GROUPS } from '@/lib/ffmpeg/presets';
import { CreatorPreset } from '@/lib/types';
import { PlatformIcon } from '@/components/PlatformIcon';
import { Check, ChevronDown, Lock } from 'lucide-react';

interface DestinationPresetPickerProps {
  selectedPreset: CreatorPreset;
  isPro: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (preset: CreatorPreset) => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
}

export function DestinationPresetPicker({
  selectedPreset,
  isPro,
  isOpen,
  onToggle,
  onSelect,
  dropdownRef,
}: DestinationPresetPickerProps) {
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0B6FFB]/20 transition-all shadow-2xs group cursor-pointer"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="shrink-0 p-1 bg-white rounded-xl border border-slate-100 shadow-2xs">
            <PlatformIcon id={selectedPreset.iconId || selectedPreset.id} size={28} />
          </div>
          <div className="text-left min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-sm sm:text-base text-slate-900 truncate">
                {selectedPreset.name}
              </span>
              <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] uppercase bg-slate-200 text-slate-700">
                .{selectedPreset.outputFormat}
              </span>
              {selectedPreset.resolution && (
                <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {selectedPreset.resolution}
                </span>
              )}
              {selectedPreset.maxFileSizeMb && (
                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  ≤{selectedPreset.maxFileSizeMb} MB
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">
              {selectedPreset.compatibilityLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-3 shrink-0">
          <span className="text-xs text-slate-400 font-medium hidden sm:inline-block">
            All destinations
          </span>
          <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 group-hover:text-slate-900 shadow-2xs">
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </div>
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Destination presets"
          className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden max-h-[420px] overflow-y-auto divide-y divide-slate-100"
        >
          {DESTINATION_GROUPS.map((group) => {
            const groupPresets = CREATOR_PRESETS.filter(
              (p) => p.destinationGroup === group.id
            );
            if (groupPresets.length === 0) return null;

            return (
              <div key={group.id}>
                <div className="px-4 py-2 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    {group.name}
                  </span>
                  <span className="text-[10px] text-slate-400 hidden sm:inline">
                    {group.description}
                  </span>
                </div>
                <div className="divide-y divide-slate-100/70">
                  {groupPresets.map((p) => {
                    const isSelected = selectedPreset.id === p.id;
                    const locked = Boolean(p.requiresPro && !isPro);

                    return (
                      <button
                        key={p.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => onSelect(p)}
                        className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 text-white'
                            : locked
                            ? 'hover:bg-blue-50/40 text-slate-800'
                            : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="shrink-0">
                            <PlatformIcon id={p.iconId || p.id} size={24} />
                          </div>
                          <div className="min-w-0">
                            <p
                              className={`font-bold text-xs sm:text-sm truncate ${
                                isSelected ? 'text-white' : 'text-slate-900'
                              }`}
                            >
                              {p.name}
                            </p>
                            <p
                              className={`text-[11px] truncate ${
                                isSelected ? 'text-slate-300' : 'text-slate-500'
                              }`}
                            >
                              {p.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {locked && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-[#0B6FFB]/10 text-[#0B6FFB] px-2 py-0.5 rounded">
                              <Lock className="w-2.5 h-2.5" /> PRO
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] uppercase ${
                              isSelected
                                ? 'bg-white/20 text-[#38BDF8]'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            .{p.outputFormat}
                          </span>
                          {p.maxFileSizeMb && (
                            <span
                              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                isSelected
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-emerald-50 text-emerald-700'
                              }`}
                            >
                              ≤{p.maxFileSizeMb}MB
                            </span>
                          )}
                          {isSelected && (
                            <Check className="w-4 h-4 text-[#0B6FFB] shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
