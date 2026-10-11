import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  FolderOpen,
  Heart,
  Play,
  Download,
  Trash2,
  Edit2,
  Sparkles,
  Clapperboard,
  Palette,
  Box,
  Filter,
  MoreVertical,
  Check,
  X
} from 'lucide-react';
import { api } from '../lib/api.js';
import { Project, VideoCategory } from '../types/index.js';
import { VideoPlayerModal } from '../components/VideoPlayerModal.js';
import { formatDate } from '../lib/utils.js';

export const Projects: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Delete confirm state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      const data = await api.getProjects({
        category: selectedCategory === 'all' ? undefined : (selectedCategory as VideoCategory),
        isFavorite: showFavoritesOnly ? true : undefined,
        q: searchQuery.trim() || undefined
      });
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [selectedCategory, showFavoritesOnly, searchQuery]);

  const handleToggleFavorite = async (projectId: string, isFav: boolean) => {
    try {
      await api.updateProject(projectId, { isFavorite: isFav });
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, isFavorite: isFav } : p));
      if (selectedProject?.id === projectId) {
        setSelectedProject(prev => prev ? { ...prev, isFavorite: isFav } : null);
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleStartRename = (proj: Project) => {
    setRenamingId(proj.id);
    setRenameValue(proj.title);
  };

  const handleSaveRename = async (projectId: string) => {
    if (!renameValue.trim()) return;
    try {
      await api.updateProject(projectId, { title: renameValue.trim() });
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, title: renameValue.trim() } : p));
      setRenamingId(null);
    } catch (err) {
      console.error('Failed to rename project:', err);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await api.deleteProject(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      setDeleteId(null);
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
      }
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  const handleDownload = (videoUrl?: string, title?: string) => {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `${(title || 'video').toLowerCase().replace(/[^a-z0-9]/g, '_')}.mp4`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            My Video Projects
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Browse, manage, download, and replay your generated AI animations.
          </p>
        </div>

        <button
          onClick={() => navigate('/create')}
          className="flex items-center gap-2 self-start sm:self-auto px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md shadow-purple-600/30 transition-all hover:scale-[1.02]"
        >
          <Sparkles className="w-4 h-4" />
          <span>New Video</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/60 p-4 rounded-2xl border border-border/60">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search projects by title or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-background/80 border border-border/70 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          />
        </div>

        {/* Category & Favorite Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: 'All Categories' },
            { id: 'cinematic', label: 'Cinematic' },
            { id: 'cartoon', label: 'Cartoon / 3D' },
            { id: 'product', label: 'Product' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedCategory === cat.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              {cat.label}
            </button>
          ))}

          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              showFavoritesOnly
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                : 'bg-secondary/50 border-border/40 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${showFavoritesOnly ? 'fill-rose-400' : ''}`} />
            <span>Favorites</span>
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-64 rounded-xl bg-secondary/30 animate-pulse border border-border/40" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="p-16 rounded-2xl border border-dashed border-border/60 text-center space-y-3 bg-card/20">
          <FolderOpen className="w-12 h-12 text-muted-foreground/40 mx-auto" />
          <h3 className="text-base font-bold text-foreground">No projects match your criteria</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Try adjusting your search query or generate a new AI video in the Studio.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className="group rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-purple-500/40 hover:shadow-xl hover:shadow-purple-950/20 transition-all duration-300 flex flex-col"
            >
              {/* Media Preview Box */}
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
                    <Clapperboard className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                )}

                {/* Hover Play Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                  <div className="w-12 h-12 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                    <Play className="w-5 h-5 ml-0.5 fill-white" />
                  </div>
                </div>

                {/* Category Badge */}
                <span className="absolute top-2.5 left-2.5 px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-black/70 backdrop-blur-md text-white border border-white/10">
                  {proj.category}
                </span>

                {/* Favorite Icon Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite(proj.id, !proj.isFavorite);
                  }}
                  className={`absolute top-2.5 right-2.5 p-1.5 rounded-lg backdrop-blur-md transition-colors ${
                    proj.isFavorite
                      ? 'bg-rose-500/30 text-rose-300 border border-rose-500/40'
                      : 'bg-black/50 text-white/80 hover:text-white border border-white/10'
                  }`}
                  title={proj.isFavorite ? 'Remove favorite' : 'Add to favorites'}
                >
                  <Heart className={`w-3.5 h-3.5 ${proj.isFavorite ? 'fill-rose-400' : ''}`} />
                </button>
              </div>

              {/* Project Card Content */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  {/* Title / Inline Rename */}
                  {renamingId === proj.id ? (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        autoFocus
                        className="flex-1 px-2 py-1 rounded bg-background border border-purple-500 text-xs font-semibold text-foreground focus:outline-none"
                      />
                      <button
                        onClick={() => handleSaveRename(proj.id)}
                        className="p-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setRenamingId(null)}
                        className="p-1 rounded bg-secondary text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between group/title">
                      <h3
                        onClick={() => setSelectedProject(proj)}
                        className="font-bold text-sm text-foreground truncate cursor-pointer group-hover:text-purple-300 transition-colors"
                      >
                        {proj.title}
                      </h3>
                      <button
                        onClick={() => handleStartRename(proj)}
                        className="opacity-0 group-hover/title:opacity-100 p-1 text-muted-foreground hover:text-foreground transition-opacity"
                        title="Rename project"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {proj.description || 'Custom generated video project'}
                  </p>
                </div>

                {/* Bottom Actions Bar */}
                <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-muted-foreground">
                    {formatDate(proj.createdAt)}
                  </span>

                  <div className="flex items-center gap-1">
                    {proj.videoUrl && (
                      <button
                        onClick={() => handleDownload(proj.videoUrl, proj.title)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        title="Download MP4"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => navigate(`/create?prompt=${encodeURIComponent(proj.description || proj.title)}&category=${proj.category}`)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-purple-300 hover:bg-secondary transition-colors"
                      title="Reuse Prompt in Studio"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setDeleteId(proj.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Delete project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-foreground">Delete Project</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete this project? Generated videos and metadata will be permanently removed.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteId(null)}
                className="px-3.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-xs font-semibold text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteProject(deleteId)}
                className="px-3.5 py-1.5 rounded-lg bg-destructive hover:bg-destructive/90 text-xs font-bold text-destructive-foreground transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Player Modal */}
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
