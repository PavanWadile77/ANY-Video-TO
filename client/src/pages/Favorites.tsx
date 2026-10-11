import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Play, Sparkles, FolderOpen } from 'lucide-react';
import { api } from '../lib/api.js';
import { Project } from '../types/index.js';
import { VideoPlayerModal } from '../components/VideoPlayerModal.js';
import { formatDate } from '../lib/utils.js';

export const Favorites: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const fetchFavorites = async () => {
    try {
      const data = await api.getProjects({ isFavorite: true });
      setProjects(data);
    } catch (err) {
      console.error('Failed to load favorites:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const handleToggleFavorite = async (projectId: string, isFav: boolean) => {
    try {
      await api.updateProject(projectId, { isFavorite: isFav });
      setProjects(prev => prev.filter(p => p.id !== projectId));
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
      }
    } catch (err) {
      console.error('Failed to update favorite:', err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="border-b border-border/50 pb-5">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
          <Heart className="w-7 h-7 text-rose-500 fill-rose-500" />
          <span>Favorite Videos</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Your bookmarked video renders, hero shots, and creative benchmarks.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2].map((n) => (
            <div key={n} className="h-64 rounded-xl bg-secondary/30 animate-pulse border border-border/40" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="p-16 rounded-2xl border border-dashed border-border/60 text-center space-y-3 bg-card/20">
          <Heart className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <h3 className="text-base font-bold text-foreground">No favorite videos yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Click the heart icon on any project card or video player to bookmark your best generations here.
          </p>
          <button
            onClick={() => navigate('/projects')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs border border-border/60"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Browse All Projects</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className="group rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-purple-500/40 hover:shadow-xl transition-all duration-300 flex flex-col"
            >
              <div
                onClick={() => setSelectedProject(proj)}
                className="relative aspect-video bg-black/60 cursor-pointer overflow-hidden"
              >
                {proj.thumbnailUrl ? (
                  <img
                    src={proj.thumbnailUrl}
                    alt={proj.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-secondary/40">
                    <Heart className="w-8 h-8 text-rose-500/40" />
                  </div>
                )}

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                  <div className="w-12 h-12 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                    <Play className="w-5 h-5 ml-0.5 fill-white" />
                  </div>
                </div>

                <span className="absolute top-2.5 left-2.5 px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-black/70 backdrop-blur-md text-white border border-white/10">
                  {proj.category}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite(proj.id, false);
                  }}
                  className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-rose-500/30 text-rose-300 border border-rose-500/40 backdrop-blur-md"
                  title="Remove from favorites"
                >
                  <Heart className="w-3.5 h-3.5 fill-rose-400" />
                </button>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h3
                    onClick={() => setSelectedProject(proj)}
                    className="font-bold text-sm text-foreground truncate cursor-pointer group-hover:text-purple-300 transition-colors"
                  >
                    {proj.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {proj.description || 'Custom generated video project'}
                  </p>
                </div>

                <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-muted-foreground">
                    {formatDate(proj.createdAt)}
                  </span>
                  <button
                    onClick={() => setSelectedProject(proj)}
                    className="text-purple-400 hover:text-purple-300 font-semibold"
                  >
                    Play Video
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedProject && (
        <VideoPlayerModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onToggleFavorite={handleToggleFavorite}
          onUsePrompt={(prompt, cat) => navigate(`/create?prompt=${encodeURIComponent(prompt)}&category=${cat}`)}
        />
      )}
    </div>
  );
};
