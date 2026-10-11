import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Video,
  FolderKanban,
  Sparkles,
  Heart,
  Coins,
  Shield,
  Settings,
  HelpCircle,
  Activity,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api, ProviderHealth } from '../lib/api.js';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const [providers, setProviders] = useState<ProviderHealth[]>([]);

  useEffect(() => {
    api.getHealth()
      .then(res => setProviders(res.providers))
      .catch(() => {});
  }, []);

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'Create Video', icon: Video, path: '/create', highlight: true },
    { label: 'My Projects', icon: FolderKanban, path: '/projects' },
    { label: 'Explore / Templates', icon: Sparkles, path: '/templates' },
    { label: 'Favorites', icon: Heart, path: '/favorites' },
    { label: 'Usage & Credits', icon: Coins, path: '/credits' },
    { label: 'Admin Panel', icon: Shield, path: '/admin', adminOnly: true },
    { label: 'Settings', icon: Settings, path: '/settings' },
    { label: 'Help & Docs', icon: HelpCircle, path: '/help' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 md:top-16 z-50 md:z-30 h-screen md:h-[calc(100vh-4rem)] w-64 flex-shrink-0 flex flex-col justify-between border-r border-border/50 bg-sidebar/95 backdrop-blur-xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Navigation links */}
        <div className="px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
            Studio Navigation
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-purple-600/15 text-purple-300 font-semibold border border-purple-500/25 shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                  } ${item.highlight ? 'text-purple-300' : ''}`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-purple-400' : 'text-muted-foreground group-hover:text-foreground'
                      }`}
                    />
                    <span>{item.label}</span>
                    {item.highlight && !isActive && (
                      <span className="ml-auto px-1.5 py-0.5 text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded">
                        HOT
                      </span>
                    )}
                    {item.adminOnly && (
                      <span className="ml-auto px-1.5 py-0.5 text-[9px] font-mono uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded">
                        Admin
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Bottom Provider Health & Engine Status */}
        <div className="p-3 border-t border-border/40 bg-background/40">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-purple-400" /> AI Video Engines
            </span>
          </div>

          <div className="space-y-1.5 bg-secondary/40 p-2.5 rounded-lg border border-border/40 text-xs">
            {providers.length > 0 ? (
              providers.map((p, idx) => (
                <div key={p.provider || p.name || idx} className="flex items-center justify-between text-muted-foreground">
                  <span className="font-mono capitalize">{p.provider || p.name}</span>
                  <div className="flex items-center gap-1">
                    {p.isConfigured ? (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" /> Ready
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] text-amber-400" title="API key not entered in .env">
                        <AlertCircle className="w-3 h-3" /> Unconfigured
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="font-mono">fal (Minimax/Kling)</span>
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ready
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
