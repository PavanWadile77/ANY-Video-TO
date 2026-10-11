import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Copy, Check, ArrowRight, Clapperboard, Palette, Box } from 'lucide-react';
import { PRESETS, PromptPreset } from '../lib/presets.js';

export const Templates: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredPresets = selectedCategory === 'all'
    ? PRESETS
    : PRESETS.filter(p => p.category === selectedCategory);

  const handleCopy = (preset: PromptPreset) => {
    navigator.clipboard.writeText(preset.prompt);
    setCopiedId(preset.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-border/50 pb-5">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Explore Prompt Templates
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Handcrafted and tested generative prompts tailored for photorealistic cinema, stylized 3D animation, and commercial product showcases.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: 'All Templates', icon: Sparkles },
          { id: 'cinematic', label: 'Realistic / Cinematic', icon: Clapperboard },
          { id: 'cartoon', label: 'Cartoon / 3D / Anime', icon: Palette },
          { id: 'product', label: 'Object / Product', icon: Box }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                selectedCategory === tab.id
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
                  : 'bg-card/70 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPresets.map((preset) => (
          <div
            key={preset.id}
            className="group rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-purple-500/40 hover:shadow-xl hover:shadow-purple-950/20 transition-all duration-300 flex flex-col"
          >
            {/* Visual Thumbnail Banner */}
            <div className="relative aspect-video overflow-hidden">
              <img
                src={preset.thumbnail}
                alt={preset.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 text-[10px] font-bold uppercase rounded bg-black/70 backdrop-blur-md text-purple-300 border border-purple-500/20">
                {preset.badge}
              </span>
              <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 text-[10px] font-mono rounded bg-black/70 backdrop-blur-md text-white border border-white/10">
                {preset.recommendedAspect} · {preset.recommendedDuration}s
              </span>
            </div>

            {/* Template Card Content */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <h3 className="font-bold text-base text-foreground group-hover:text-purple-300 transition-colors">
                  {preset.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {preset.description}
                </p>

                <div className="p-3 rounded-xl bg-background/60 border border-border/40 text-xs font-mono text-foreground/80 line-clamp-3 selection:bg-purple-500/20">
                  {preset.prompt}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-border/40 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(preset)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/80 hover:bg-secondary text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copiedId === preset.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => navigate(`/create?template=${preset.id}`)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-md shadow-purple-600/20 transition-all hover:scale-[1.02]"
                >
                  <span>Use in Studio</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
