import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, User, Key, Bell, Shield, Check, Loader2 } from 'lucide-react';
import { api, AuthMeResponse } from '../lib/api.js';

export const Settings: React.FC = () => {
  const [authData, setAuthData] = useState<AuthMeResponse | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    api.getMe().then(res => {
      setAuthData(res);
      setDisplayName(res.profile.displayName);
    }).catch(console.error);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      await api.updateProfile({ displayName });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-4xl">
      {/* Header */}
      <div className="border-b border-border/50 pb-5">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
          <SettingsIcon className="w-7 h-7 text-purple-400" />
          <span>Settings & Preferences</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Manage your personal creator profile, visual theme, and AI video provider configurations.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>Profile changes saved successfully!</span>
        </div>
      )}

      {/* Profile Form */}
      <div className="p-6 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md space-y-5">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-purple-400" />
          <h2 className="text-base font-bold text-foreground">Creator Profile</h2>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-background border border-border/70 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Email Address</label>
              <input
                type="email"
                disabled
                value={authData?.profile.email || ''}
                className="w-full p-2.5 rounded-xl bg-secondary/50 border border-border/40 text-xs text-muted-foreground cursor-not-allowed"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>

      {/* AI Provider Architecture & Environment */}
      <div className="p-6 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md space-y-4">
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-bold text-foreground">AI Video Provider Integration Guide</h2>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Animora AI utilizes a secure backend provider layer. Secret API keys are never exposed on the frontend client.
        </p>

        <div className="p-4 rounded-xl bg-background/60 border border-border/50 text-xs font-mono space-y-2">
          <p className="text-muted-foreground"># Set your environment variables in <span className="text-purple-300 font-bold">.env</span> file:</p>
          <p className="text-foreground">AI_VIDEO_PROVIDER=fal</p>
          <p className="text-foreground">AI_VIDEO_PROVIDER_API_KEY=your_fal_api_key</p>
          <p className="text-foreground">AI_VIDEO_PROVIDER_BASE_URL=https://queue.fal.run</p>
        </div>

        <p className="text-xs text-muted-foreground">
          When <span className="font-mono text-purple-300">AI_VIDEO_PROVIDER_API_KEY</span> is set, generation calls route directly to Fal.ai (Minimax Hailuo Video-01, Kling 1.5, AnimateDiff). If unconfigured, the application runs via the built-in Sandbox Provider for instant zero-cost testing.
        </p>
      </div>
    </div>
  );
};
