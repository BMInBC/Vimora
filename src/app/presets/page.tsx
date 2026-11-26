"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/firebase/authContext';
import { Logo } from '@/components/Logo';
import { PlatformIcon } from '@/components/PlatformIcon';
import { UpgradePromptBanner } from '@/components/UpgradePromptBanner';
import {
  CREATOR_PRESETS,
  DESTINATION_GROUPS,
} from '@/lib/ffmpeg/presets';
import {
  getCustomPresets,
  saveCustomPreset,
  deleteCustomPreset,
  duplicateCustomPreset,
} from '@/lib/storage/customPresets';
import { checkCustomPresetEntitlement } from '@/lib/entitlements';
import type { CreatorPreset, DestinationGroupId, OutputFormat, VideoCodec } from '@/lib/types';
import {
  Search,
  ArrowRight,
  Lock,
  Cpu,
  CheckCircle2,
  Sparkles,
  Sliders,
  Plus,
  Copy,
  Trash2,
  Pencil,
} from 'lucide-react';

export default function PresetsPage() {
  const { user, isPro, loading } = useAuth();
  const [selectedGroup, setSelectedGroup] = useState<DestinationGroupId | 'all'>('all');
  const [search, setSearch] = useState('');
  const [customPresets, setCustomPresets] = useState<CreatorPreset[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newFormat, setNewFormat] = useState<OutputFormat>('mp4');
  const [newRes, setNewRes] = useState('1920x1080');
  const [newFps, setNewFps] = useState('');
  const [newVideoCodec, setNewVideoCodec] = useState<VideoCodec>('h264');
  const [newMaxMb, setNewMaxMb] = useState('');
  const [upgradeMessage, setUpgradeMessage] = useState<string | null>(null);

  useEffect(() => {
    setCustomPresets(getCustomPresets());
  }, []);

  const resetForm = () => {
    setEditingPresetId(null);
    setNewName('');
    setNewDescription('');
    setNewFormat('mp4');
    setNewRes('1920x1080');
    setNewFps('');
    setNewVideoCodec('h264');
    setNewMaxMb('');
    setShowCreateForm(false);
  };

  const handleStartEdit = (preset: CreatorPreset) => {
    setEditingPresetId(preset.id);
    setNewName(preset.name);
    setNewDescription(preset.description || '');
    setNewFormat(preset.outputFormat);
    setNewRes(preset.resolution || '');
    setNewFps(preset.fps ? String(preset.fps) : '');
    setNewVideoCodec(preset.videoCodec || 'h264');
    setNewMaxMb(preset.maxFileSizeMb ? String(preset.maxFileSizeMb) : '');
    setShowCreateForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveCustomPreset = (e: React.FormEvent) => {
    e.preventDefault();
    // Only enforce creation cap when creating a brand-new preset (editing existing is always allowed)
    if (!editingPresetId) {
      const check = checkCustomPresetEntitlement(isPro, customPresets.length);
      if (!check.allowed) {
        setUpgradeMessage(check.reason || 'Upgrade to Pro for unlimited custom presets.');
        return;
      }
    }
    if (!newName.trim()) return;
    const isAudioOnly = ['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(newFormat);
    const maxMb = parseInt(newMaxMb, 10);
    const fpsNum = parseInt(newFps, 10);
    const saved: CreatorPreset = {
      id: editingPresetId || `custom_${Date.now()}`,
      name: newName.trim(),
      category: isAudioOnly ? 'audio' : 'archive',
      destinationGroup: 'archive_custom',
      iconId: 'custom_export',
      description:
        newDescription.trim() ||
        `Custom ${newFormat.toUpperCase()} preset${!isAudioOnly && newRes ? ` (${newRes})` : ''}.`,
      outputFormat: newFormat,
      videoCodec: isAudioOnly ? undefined : newVideoCodec,
      audioCodec:
        newFormat === 'mp3'
          ? 'mp3'
          : newFormat === 'wav'
          ? 'wav'
          : newFormat === 'flac'
          ? 'flac'
          : newFormat === 'ogg'
          ? 'opus'
          : 'aac',
      resolution: isAudioOnly ? undefined : newRes || undefined,
      fps: !isAudioOnly && !isNaN(fpsNum) && fpsNum > 0 ? fpsNum : undefined,
      maxFileSizeMb: !isNaN(maxMb) && maxMb > 0 ? maxMb : undefined,
      compatibilityLabel: 'Custom local export template',
      isCustom: true,
    };
    setCustomPresets(saveCustomPreset(saved));
    resetForm();
  };

  const handleDuplicate = (id: string) => {
    const check = checkCustomPresetEntitlement(isPro, customPresets.length);
    if (!check.allowed) {
      setUpgradeMessage(check.reason || 'Upgrade to Pro for unlimited custom presets.');
      return;
    }
    setCustomPresets(duplicateCustomPreset(id));
  };

  const handleDelete = (id: string) => {
    setCustomPresets(deleteCustomPreset(id));
  };

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return DESTINATION_GROUPS.filter(
      (g) => selectedGroup === 'all' || g.id === selectedGroup
    )
      .map((group) => {
        const presets = CREATOR_PRESETS.filter((preset) => {
          if (preset.destinationGroup !== group.id) return false;
          if (!q) return true;
          return (
            preset.name.toLowerCase().includes(q) ||
            preset.description.toLowerCase().includes(q) ||
            preset.compatibilityLabel.toLowerCase().includes(q) ||
            preset.outputFormat.toLowerCase().includes(q)
          );
        });
        return { group, presets };
      })
      .filter((entry) => entry.presets.length > 0);
  }, [selectedGroup, search]);

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
              <Sparkles className="w-4 h-4 text-[#0B6FFB]" />
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900">
                Destination Presets & Custom Templates
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (showCreateForm && !editingPresetId) {
                  resetForm();
                  return;
                }
                const check = checkCustomPresetEntitlement(isPro, customPresets.length);
                if (!check.allowed) {
                  setUpgradeMessage(check.reason || 'Upgrade to Pro for unlimited custom presets.');
                  return;
                }
                resetForm();
                setShowCreateForm(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Custom Preset</span>
            </button>
            <Link
              href="/converter"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>New Conversion</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-8 space-y-6">
        {upgradeMessage && (
          <UpgradePromptBanner
            message={upgradeMessage}
            onDismiss={() => setUpgradeMessage(null)}
          />
        )}

        {/* Create / Edit Custom Preset Drawer */}
        {showCreateForm && (
          <form
            onSubmit={handleSaveCustomPreset}
            className="bg-white rounded-2xl border border-blue-200 p-5 space-y-4 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900">
                {editingPresetId ? 'Edit Custom Preset' : 'Create Custom Preset'}
              </h2>
              {editingPresetId && (
                <span className="text-[11px] font-bold text-[#0B6FFB] bg-blue-50 px-2 py-0.5 rounded-md">
                  Editing saved template
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <label className="space-y-1 block">
                <span className="font-bold text-slate-600">Preset name</span>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Client Review 1080p"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold"
                />
              </label>

              <label className="space-y-1 block">
                <span className="font-bold text-slate-600">Container format</span>
                <select
                  value={newFormat}
                  onChange={(e) => setNewFormat(e.target.value as OutputFormat)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold uppercase"
                >
                  <option value="mp4">MP4</option>
                  <option value="mov">MOV</option>
                  <option value="webm">WEBM</option>
                  <option value="mp3">MP3</option>
                  <option value="wav">WAV</option>
                  <option value="flac">FLAC</option>
                  <option value="aac">AAC</option>
                </select>
              </label>

              <label className="space-y-1 block">
                <span className="font-bold text-slate-600">Optional target max MB</span>
                <input
                  type="number"
                  min={1}
                  max={4000}
                  value={newMaxMb}
                  onChange={(e) => setNewMaxMb(e.target.value)}
                  placeholder="Leave blank for Auto"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono"
                />
              </label>

              {!['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(newFormat) && (
                <>
                  <label className="space-y-1 block">
                    <span className="font-bold text-slate-600">Resolution</span>
                    <select
                      value={newRes}
                      onChange={(e) => setNewRes(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold"
                    >
                      <option value="1920x1080">1920×1080 (1080p)</option>
                      <option value="1080x1920">1080×1920 (9:16 Vertical)</option>
                      <option value="1080x1080">1080×1080 (1:1 Square)</option>
                      <option value="1280x720">1280×720 (720p)</option>
                      <option value="854x480">854×480 (480p)</option>
                      {isPro && <option value="3840x2160">3840×2160 (4K UHD)</option>}
                      <option value="">Keep original</option>
                    </select>
                  </label>

                  <label className="space-y-1 block">
                    <span className="font-bold text-slate-600">Video codec</span>
                    <select
                      value={newVideoCodec}
                      onChange={(e) => setNewVideoCodec(e.target.value as VideoCodec)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold uppercase"
                    >
                      <option value="h264">H.264 (Universal)</option>
                      <option value="hevc">HEVC / H.265 (Smaller size)</option>
                      <option value="vp9">VP9 (WebM)</option>
                    </select>
                  </label>

                  <label className="space-y-1 block">
                    <span className="font-bold text-slate-600">Frame rate (FPS)</span>
                    <select
                      value={newFps}
                      onChange={(e) => setNewFps(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold"
                    >
                      <option value="">Keep original</option>
                      <option value="24">24 FPS</option>
                      <option value="30">30 FPS</option>
                      <option value="60">60 FPS</option>
                    </select>
                  </label>
                </>
              )}
            </div>

            <label className="space-y-1 block text-xs">
              <span className="font-bold text-slate-600">Short description (optional)</span>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="e.g. Fast 1080p MP4 for client review links"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              />
            </label>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-[#0B6FFB] hover:bg-[#0958cc] text-white text-xs font-bold cursor-pointer"
              >
                {editingPresetId ? 'Save Changes' : 'Save Custom Preset'}
              </button>
            </div>
          </form>
        )}

        {/* User Custom Presets */}
        {customPresets.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Your Custom Presets</h3>
                <p className="text-xs text-slate-500">
                  Saved locally on this device ({isPro ? 'Unlimited on Pro' : `${customPresets.length}/1 on Free`}).
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customPresets.map((cp) => (
                <div
                  key={cp.id}
                  className="bg-white rounded-2xl border border-blue-200/80 p-4 flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-sm font-extrabold text-slate-900 truncate">{cp.name}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        .{cp.outputFormat.toUpperCase()}
                        {cp.videoCodec ? ` • ${cp.videoCodec.toUpperCase()}` : ''}
                        {cp.resolution ? ` • ${cp.resolution}` : ''}
                        {cp.fps ? ` • ${cp.fps}fps` : ''}
                        {cp.maxFileSizeMb ? ` • ≤${cp.maxFileSizeMb} MB` : ''}
                      </p>
                      {cp.description && (
                        <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">{cp.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(cp)}
                        title="Edit preset"
                        aria-label={`Edit ${cp.name}`}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-[#0B6FFB] hover:bg-blue-50 cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicate(cp.id)}
                        title="Duplicate preset"
                        aria-label={`Duplicate ${cp.name}`}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(cp.id)}
                        title="Delete preset"
                        aria-label={`Delete ${cp.name}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <Link
                    href={`/converter?preset=${cp.id}${cp.maxFileSizeMb ? `&targetMb=${cp.maxFileSizeMb}` : ''}`}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900 hover:bg-[#0B6FFB] text-white text-xs font-bold transition-colors"
                  >
                    <span>Use template</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Intro & Search */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-950 tracking-tight">
              Choose by destination, not codec
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Every preset configures container, resolution, aspect-ratio handling, and audio for you. Pick where your video is going and export locally.
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search TikTok, WhatsApp, MP3..."
              aria-label="Search destination presets"
              className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B6FFB]/20 focus:border-[#0B6FFB]"
            />
          </div>
        </div>

        {/* Group Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setSelectedGroup('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
              selectedGroup === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            All Destinations ({CREATOR_PRESETS.length})
          </button>
          {DESTINATION_GROUPS.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => setSelectedGroup(group.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                selectedGroup === group.id
                  ? 'bg-[#0B6FFB] text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              {group.name}
            </button>
          ))}
        </div>

        {/* Grouped Preset Cards */}
        {filteredGroups.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
            <p className="text-sm font-bold text-slate-800">No presets match “{search}”</p>
            <p className="text-xs text-slate-500 mt-1">
              Try searching for TikTok, YouTube, WhatsApp, Discord, MP3, or Custom.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredGroups.map(({ group, presets }) => (
              <section key={group.id} className="space-y-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">{group.name}</h3>
                  <p className="text-xs text-slate-500">{group.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {presets.map((preset) => {
                    const locked = Boolean(preset.requiresPro && !isPro);
                    const href = preset.isCustom
                      ? `/converter?preset=${preset.id}&custom=1`
                      : preset.maxFileSizeMb
                      ? `/converter?preset=${preset.id}&targetMb=${preset.maxFileSizeMb}`
                      : `/converter?preset=${preset.id}`;

                    return (
                      <div
                        key={preset.id}
                        className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between gap-4 hover:border-slate-300 hover:shadow-sm transition-all"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-1.5 rounded-xl bg-slate-50 border border-slate-100 shrink-0">
                                <PlatformIcon id={preset.iconId || preset.id} size={26} />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-sm font-extrabold text-slate-900 truncate">
                                  {preset.name}
                                </h4>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-bold uppercase">
                                    .{preset.outputFormat}
                                  </span>
                                  {preset.resolution && (
                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px]">
                                      {preset.resolution}
                                    </span>
                                  )}
                                  {preset.fps && (
                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px]">
                                      {preset.fps}fps
                                    </span>
                                  )}
                                  {preset.maxFileSizeMb && (
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono text-[10px] font-bold">
                                      ≤{preset.maxFileSizeMb} MB
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {locked && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-[#0B6FFB] text-[10px] font-extrabold shrink-0">
                                <Lock className="w-2.5 h-2.5" /> PRO
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed">
                            {preset.description}
                          </p>

                          <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="truncate">{preset.compatibilityLabel}</span>
                            </div>
                            {preset.gpuRecommended && (
                              <div className="flex items-center gap-1.5">
                                <Cpu className="w-3.5 h-3.5 text-[#0B6FFB] shrink-0" />
                                <span>GPU acceleration recommended (auto-fallback to CPU)</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <Link
                          href={locked ? '/pricing' : href}
                          className={`w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-colors ${
                            locked
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              : 'bg-slate-900 hover:bg-[#0B6FFB] text-white'
                          }`}
                        >
                          {locked ? (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              <span>Unlock with Pro</span>
                            </>
                          ) : (
                            <>
                              <span>Use this destination</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </>
                          )}
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
