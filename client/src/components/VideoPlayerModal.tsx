import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  Heart, 
  Sparkles, 
  Maximize2, 
  Film, 
  Layers, 
  Calendar, 
  Ratio,
  Clock,
  Play
} from 'lucide-react';
import { Project, GenerationJob } from '../types/index.js';
import { formatDate } from '../lib/utils.js';

interface VideoPlayerModalProps {
  project?: Project | null;
  job?: GenerationJob | null;
  onClose: () => void;
  onToggleFavorite?: (id: string, isFav: boolean) => void;
  onUsePrompt?: (prompt: string, category: string) => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  project,
  job,
  onClose,
  onToggleFavorite,
  onUsePrompt,
}) => {
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  if (!project && !job) return null;

  const title = project?.title || job?.prompt.substring(0, 32) || 'Generated Video';
  const videoUrl = project?.videoUrl || job?.outputVideoUrl;
  const prompt = job?.prompt || project?.description || '';
  const category = (job?.category || project?.category || 'cinematic').toUpperCase();
  const duration = job?.durationSeconds || 5;
  const resolution = job?.resolution || '1080p';
  const aspectRatio = job?.aspectRatio || '16:9';
  const createdAt = job?.createdAt || project?.createdAt || new Date().toISOString();
  const isFavorite = project?.isFavorite || false;

  const handleCopyPrompt = () => {
    if (!prompt) return;
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleDownload = () => {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.mp4`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-card border border-border/70 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/50 bg-secondary/30">
          <div className="flex items-center gap-2.5 truncate">
            <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-wide">
              {category}
            </span>
            <h3 className="font-semibold text-base sm:text-lg text-foreground truncate">
              {title}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {project && onToggleFavorite && (
              <button
                onClick={() => onToggleFavorite(project.id, !isFavorite)}
                className={`p-2 rounded-lg border transition-colors ${
                  isFavorite
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                    : 'bg-secondary/60 border-border/50 text-muted-foreground hover:text-foreground'
                }`}
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-400' : ''}`} />
              </button>
            )}

            {videoUrl && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 bg-secondary/60 hover:bg-secondary text-xs font-semibold text-foreground transition-colors"
                title="Download MP4 Video"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download MP4</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Video Player Box */}
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-border/40 shadow-inner flex items-center justify-center">
            {videoUrl ? (
              <video
                src={videoUrl}
                controls
                autoPlay
                loop
                playsInline
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Play className="w-12 h-12 text-muted-foreground/40 animate-pulse" />
                <p className="text-sm">Video rendering or preview not available yet</p>
              </div>
            )}
          </div>

          {/* Metadata Specs Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/30 border border-border/30">
              <Clock className="w-4 h-4 text-purple-400" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Duration</p>
                <p className="text-xs font-bold text-foreground">{duration} seconds</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/30 border border-border/30">
              <Film className="w-4 h-4 text-sky-400" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Resolution</p>
                <p className="text-xs font-bold text-foreground">{resolution}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/30 border border-border/30">
              <Ratio className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Aspect Ratio</p>
                <p className="text-xs font-bold text-foreground">{aspectRatio}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/30 border border-border/30">
              <Calendar className="w-4 h-4 text-amber-400" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Generated</p>
                <p className="text-xs font-bold text-foreground">{formatDate(createdAt)}</p>
              </div>
            </div>
          </div>

          {/* Prompt Section */}
          <div className="p-4 rounded-xl bg-secondary/20 border border-border/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Prompt Details
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyPrompt}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copiedPrompt ? (
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

                {onUsePrompt && prompt && (
                  <button
                    onClick={() => onUsePrompt(prompt, category.toLowerCase())}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 transition-colors font-medium"
                  >
                    Use in Studio
                  </button>
                )}
              </div>
            </div>

            <p className="text-sm text-foreground/90 leading-relaxed font-sans bg-background/50 p-3 rounded-lg border border-border/30 selection:bg-purple-500/20">
              {prompt || 'No prompt description recorded for this item.'}
            </p>

            {job?.negativePrompt && (
              <div className="pt-2">
                <p className="text-[11px] font-bold text-muted-foreground/80 uppercase">Negative Prompt:</p>
                <p className="text-xs text-muted-foreground mt-0.5">{job.negativePrompt}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
