import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Clapperboard,
  Palette,
  Box,
  Coins,
  Play,
  RotateCcw,
  Loader2,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  FolderOpen
} from 'lucide-react';
import { api, AuthMeResponse } from '../lib/api.js';
import { Project, GenerationJob } from '../types/index.js';
import { PRESETS } from '../lib/presets.js';
import { VideoPlayerModal } from '../components/VideoPlayerModal.js';
import { formatDate } from '../lib/utils.js';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [authData, setAuthData] = useState<AuthMeResponse | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<{ project?: Project; job?: GenerationJob } | null>(null);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [me, projs, jbs] = await Promise.all([
        api.getMe(),
        api.getProjects(),
        api.getJobs()
      ]);
      setAuthData(me);
      setProjects(projs);
      setJobs(jbs);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Poll for active jobs
    const timer = setInterval(() => {
      api.getJobs().then(setJobs).catch(() => {});
      api.getMe().then(setAuthData).catch(() => {});
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleRetryJob = async (jobId: string) => {
    setRetryingJobId(jobId);
    try {
      await api.retryJob(jobId);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Retry failed');
    } finally {
      setRetryingJobId(null);
    }
  };

  const activeJobs = jobs.filter(j => j.status === 'queued' || j.status === 'processing');
  const failedJobs = jobs.filter(j => j.status === 'failed');

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-900/40 via-background to-secondary/30 p-6 sm:p-8 backdrop-blur-xl">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/4 -bottom-16 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/15 border border-purple-500/30 text-purple-300">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Animora AI Video Engine 2.0</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
              Welcome back, <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-sky-400 bg-clip-text text-transparent">{authData?.profile?.displayName || 'Creator'}</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Synthesize Hollywood-grade cinematic shots, fluid 3D character animation, and high-converting 360° product showcases in seconds.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/create"
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4" />
              <span>Create New Video</span>
            </Link>

            <Link
              to="/projects"
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-secondary/80 hover:bg-secondary text-foreground text-sm font-semibold border border-border/60 transition-all"
            >
              <FolderOpen className="w-4 h-4 text-muted-foreground" />
              <span>All Projects</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Top Stats & Credit Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Credits Balance */}
        <div className="p-5 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Available Credits</p>
            <h3 className="text-2xl font-bold text-foreground mt-1">
              {authData?.credits?.balance ?? 180}
            </h3>
            <p className="text-[11px] text-purple-400 font-medium mt-0.5">
              Tier: <span className="uppercase font-bold">{authData?.credits?.tier || 'Pro'}</span>
            </p>
          </div>
          <div className="p-3 rounded-xl bg-purple-500/15 border border-purple-500/25 text-purple-400">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        {/* Total Projects */}
        <div className="p-5 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Projects Created</p>
            <h3 className="text-2xl font-bold text-foreground mt-1">
              {projects.length}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {projects.filter(p => p.isFavorite).length} favorites
            </p>
          </div>
          <div className="p-3 rounded-xl bg-sky-500/15 border border-sky-500/25 text-sky-400">
            <FolderOpen className="w-6 h-6" />
          </div>
        </div>

        {/* Completed Jobs */}
        <div className="p-5 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Videos Rendered</p>
            <h3 className="text-2xl font-bold text-foreground mt-1">
              {jobs.filter(j => j.status === 'completed').length}
            </h3>
            <p className="text-[11px] text-emerald-400 font-medium mt-0.5 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Ready to export
            </p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400">
            <Clapperboard className="w-6 h-6" />
          </div>
        </div>

        {/* Active Queue */}
        <div className="p-5 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Queue</p>
            <h3 className="text-2xl font-bold text-foreground mt-1">
              {activeJobs.length}
            </h3>
            <p className="text-[11px] text-amber-400 mt-0.5">
              {activeJobs.length > 0 ? 'Processing jobs in real-time' : 'Queue idle'}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. Three Creative Category Shortcuts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Generation Categories</h2>
            <p className="text-xs text-muted-foreground">Select a category to pre-configure specialized models & prompts</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Category 1: Cinematic */}
          <div
            onClick={() => navigate('/create?category=cinematic')}
            className="group cursor-pointer p-5 rounded-2xl border border-border/60 bg-card/60 hover:bg-card hover:border-purple-500/40 transition-all duration-300 relative overflow-hidden flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                <Clapperboard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground group-hover:text-purple-300 transition-colors">
                  Realistic / Cinematic
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  35mm anamorphic camera motion, volumetric lighting, photorealistic textures & physics.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs font-semibold text-purple-400">
              <span>Start Cinematic Video</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Category 2: Cartoon / 3D */}
          <div
            onClick={() => navigate('/create?category=cartoon')}
            className="group cursor-pointer p-5 rounded-2xl border border-border/60 bg-card/60 hover:bg-card hover:border-pink-500/40 transition-all duration-300 relative overflow-hidden flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground group-hover:text-pink-300 transition-colors">
                  Cartoon / 3D / Anime
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Stylized characters, Pixar 3D CGI rendering, Ghibli & Shinkai anime aesthetic.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs font-semibold text-pink-400">
              <span>Start Animation</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Category 3: Object / Product */}
          <div
            onClick={() => navigate('/create?category=product')}
            className="group cursor-pointer p-5 rounded-2xl border border-border/60 bg-card/60 hover:bg-card hover:border-sky-500/40 transition-all duration-300 relative overflow-hidden flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                <Box className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground group-hover:text-sky-300 transition-colors">
                  Object / Product Animation
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  360-degree turntable spins, zero-gravity floating showcases, luxury commercial softbox lighting.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs font-semibold text-sky-400">
              <span>Start Product Showcase</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Active Generation Queue (if any) */}
      {activeJobs.length > 0 && (
        <div className="p-5 rounded-2xl border border-purple-500/30 bg-purple-950/20 backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
              Generating Videos ({activeJobs.length} active)
            </span>
          </div>

          <div className="space-y-3">
            {activeJobs.map((job) => (
              <div key={job.id} className="p-3.5 rounded-xl bg-background/80 border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-purple-500/20 text-purple-300 rounded">
                      {job.category}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">{job.modelName}</span>
                  </div>
                  <p className="text-xs font-medium text-foreground truncate max-w-md">
                    {job.prompt}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-36 sm:w-48 space-y-1">
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span className="capitalize">{job.status}</span>
                      <span>{job.progressPercent}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                        style={{ width: `${job.progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Failed Jobs Alert & Retry (Requirement 4) */}
      {failedJobs.length > 0 && (
        <div className="p-4 rounded-xl border border-destructive/40 bg-destructive/10 space-y-3">
          <div className="flex items-center gap-2 text-destructive font-semibold text-xs sm:text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>Failed Jobs ({failedJobs.length}) — Credits automatically refunded</span>
          </div>
          <div className="space-y-2">
            {failedJobs.slice(0, 3).map((job) => (
              <div key={job.id} className="flex items-center justify-between p-2.5 rounded-lg bg-background/60 border border-border/40 text-xs">
                <span className="truncate max-w-xs text-muted-foreground">{job.prompt}</span>
                <button
                  onClick={() => handleRetryJob(job.id)}
                  disabled={retryingJobId === job.id}
                  className="flex items-center gap-1.5 px-3 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground font-semibold border border-border/60 transition-colors"
                >
                  {retryingJobId === job.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
                  )}
                  <span>Retry Job</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Recent Projects Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Recent Projects</h2>
            <p className="text-xs text-muted-foreground">Recently rendered videos and creative drafts</p>
          </div>
          <Link
            to="/projects"
            className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="p-12 rounded-2xl border border-dashed border-border/60 text-center space-y-3">
            <Clapperboard className="w-10 h-10 text-muted-foreground/50 mx-auto" />
            <h3 className="text-sm font-semibold text-foreground">No video projects yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Ready to generate your first AI video? Choose a mode in the Video Creation Studio.
            </p>
            <Link
              to="/create"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Create First Video</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.slice(0, 6).map((proj) => (
              <div
                key={proj.id}
                className="group rounded-xl border border-border/60 bg-card overflow-hidden hover:border-purple-500/40 transition-all duration-300 flex flex-col"
              >
                {/* Thumbnail / Video Preview Box */}
                <div 
                  onClick={() => setSelectedVideo({ project: proj })}
                  className="relative aspect-video bg-black/60 cursor-pointer overflow-hidden group"
                >
                  {proj.thumbnailUrl ? (
                    <img
                      src={proj.thumbnailUrl}
                      alt={proj.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-secondary/50">
                      <Clapperboard className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                  )}

                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                    <div className="w-12 h-12 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                      <Play className="w-5 h-5 ml-0.5 fill-white" />
                    </div>
                  </div>

                  <span className="absolute top-2.5 left-2.5 px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-black/70 backdrop-blur-md text-white border border-white/10">
                    {proj.category}
                  </span>
                </div>

                {/* Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-purple-300 transition-colors">
                      {proj.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                      {proj.description || 'Custom generated video project'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{formatDate(proj.createdAt)}</span>
                    <button
                      onClick={() => setSelectedVideo({ project: proj })}
                      className="text-purple-400 hover:text-purple-300 font-semibold"
                    >
                      Watch Video
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 7. Quick-Start Templates Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Quick-Start Templates</h2>
            <p className="text-xs text-muted-foreground">Inspiring tested prompt templates ready to render</p>
          </div>
          <Link
            to="/templates"
            className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1"
          >
            <span>Explore All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PRESETS.slice(0, 3).map((template) => (
            <div
              key={template.id}
              onClick={() => navigate(`/create?template=${template.id}`)}
              className="group cursor-pointer rounded-xl border border-border/60 bg-card overflow-hidden hover:border-purple-500/40 transition-all duration-300 flex flex-col"
            >
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={template.thumbnail}
                  alt={template.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-black/70 backdrop-blur-md text-purple-300 border border-purple-500/20">
                  {template.badge}
                </span>
              </div>
              <div className="p-3.5 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground group-hover:text-purple-300 transition-colors">
                    {template.title}
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                    {template.description}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-border/40 text-[11px] font-semibold text-purple-400 flex items-center justify-between">
                  <span>Use Template</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Video Modal Player */}
      {selectedVideo && (
        <VideoPlayerModal
          project={selectedVideo.project}
          job={selectedVideo.job}
          onClose={() => setSelectedVideo(null)}
          onUsePrompt={(prompt, cat) => navigate(`/create?prompt=${encodeURIComponent(prompt)}&category=${cat}`)}
        />
      )}
    </div>
  );
};
