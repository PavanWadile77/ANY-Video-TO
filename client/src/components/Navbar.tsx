import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  Coins, 
  PlusCircle, 
  Moon, 
  Sun, 
  ShieldCheck, 
  User, 
  Menu,
  LogOut,
  LogIn
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { getCurrentRole, setCurrentRole } from '../lib/api.js';

interface NavbarProps {
  onToggleSidebar?: () => void;
  userCredits?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const navigate = useNavigate();
  const { currentUser, profile, credits, signOut, openAuthModal, isAdmin } = useAuth();
  const [isDark, setIsDark] = useState<boolean>(true);
  const [role, setRole] = useState<'user' | 'admin'>(getCurrentRole());
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const handleRoleToggle = () => {
    const nextRole = role === 'admin' ? 'user' : 'admin';
    setCurrentRole(nextRole);
    setRole(nextRole);
    if (nextRole === 'admin') {
      navigate('/admin');
    } else {
      navigate('/');
    }
  };

  const displayedCredits = credits?.balance ?? 150;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left: Mobile hamburger & Brand */}
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleSidebar}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg md:hidden hover:bg-secondary/60 transition-colors"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-sky-400 p-0.5 shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-all duration-300">
              <div className="w-full h-full bg-background rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                Animora<span className="text-purple-400 font-extrabold">.ai</span>
              </span>
              <span className="text-[10px] font-medium tracking-widest uppercase text-muted-foreground -mt-1 hidden sm:inline">
                ANY Video TO Studio
              </span>
            </div>
          </Link>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-2 sm:gap-3.5">
          {/* Quick Create CTA */}
          <Link
            to="/create"
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/25 hover:shadow-purple-600/40 hover:brightness-110 active:scale-[0.98] transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Create Video</span>
            <span className="sm:hidden">Create</span>
          </Link>

          {/* Credits Balance Pill */}
          <Link
            to="/credits"
            title="View Credit Ledger & Billing"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-500/30 bg-purple-950/20 hover:bg-purple-900/30 text-purple-200 text-xs sm:text-sm font-medium transition-all group"
          >
            <Coins className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
            <span className="font-semibold text-white">{displayedCredits}</span>
            <span className="text-purple-300/70 hidden sm:inline text-xs">credits</span>
          </Link>

          {/* Role Switcher Demo Tool */}
          <button
            onClick={handleRoleToggle}
            title={`Role Simulation: ${role.toUpperCase()}. Click to switch roles.`}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
              role === 'admin' || isAdmin
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-zinc-800/40 border-zinc-700/40 text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline font-mono">{(role === 'admin' || isAdmin) ? 'ADMIN' : 'USER'}</span>
          </button>

          {/* Dark / Light Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary/60 border border-border/50 transition-colors"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>

          {/* User Auth Profile / Login Button */}
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 pl-1 group focus:outline-none"
                title="Account Menu"
              >
                <div className="w-8 h-8 rounded-full border border-purple-500/40 overflow-hidden ring-2 ring-transparent group-hover:ring-purple-500/40 transition-all">
                  {currentUser.photoURL || profile?.avatarUrl ? (
                    <img
                      src={currentUser.photoURL || profile?.avatarUrl}
                      alt={currentUser.displayName || 'User'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-secondary flex items-center justify-center text-muted-foreground">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </button>

              {showUserMenu && (
                <div 
                  className="absolute right-0 mt-2 w-48 rounded-xl bg-card border border-border/70 p-2 shadow-2xl space-y-1 text-xs animate-in fade-in"
                  onClick={() => setShowUserMenu(false)}
                >
                  <div className="p-2 border-b border-border/40">
                    <p className="font-bold text-foreground truncate">{currentUser.displayName || 'Creator'}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{currentUser.email}</p>
                  </div>
                  <Link
                    to="/settings"
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-secondary text-foreground transition-colors"
                  >
                    <User className="w-3.5 h-3.5 text-purple-400" />
                    <span>Profile & Settings</span>
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-destructive/15 text-destructive transition-colors text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={openAuthModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-500/40 bg-purple-600/10 hover:bg-purple-600/20 text-purple-300 text-xs font-bold transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
