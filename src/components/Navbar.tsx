import React from 'react';
import { Flame, History, Database, User, LogOut, Mic, Sparkles } from 'lucide-react';
import { UserProfile } from '../lib/supabase';

interface NavbarProps {
  user: any | null;
  profile: UserProfile | null;
  onOpenAuth: () => void;
  onOpenHistory: () => void;
  onOpenSchema?: () => void;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  profile,
  onOpenAuth,
  onOpenHistory,
  onOpenSchema,
  onSignOut,
}) => {
  const streak = profile?.streak_count || 1;
  const minutes = profile?.total_minutes_practiced ?? 2.0;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-stone-200/80 bg-white/90 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shadow-sm">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-stone-900 tracking-tight">SpeakDaily</span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200/60 rounded-full">
                2-Min Partner
              </span>
            </div>
            <p className="text-xs text-stone-500 hidden md:block">Daily speaking drills & instant AI coaching</p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Daily Streak */}
          <div
            title="Daily practice streak"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 border border-orange-200/60 text-orange-700 text-xs font-semibold shadow-xs"
          >
            <Flame className="w-4 h-4 fill-orange-500 text-orange-500 animate-pulse" />
            <span>{streak}d streak</span>
          </div>

          {/* Practice History Button */}
          <button
            onClick={onOpenHistory}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200/70 rounded-lg transition-colors cursor-pointer"
            title="View previous speaking sessions"
          >
            <History className="w-3.5 h-3.5 text-stone-500" />
            <span className="hidden sm:inline">History</span>
          </button>


          {/* Auth State */}
          {user ? (
            <div className="flex items-center gap-2 pl-1">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-medium text-stone-900 truncate max-w-[120px]">
                  {profile?.full_name || user.email?.split('@')[0]}
                </span>
                <span className="text-[10px] text-stone-400 font-mono">{minutes}m spoken</span>
              </div>
              <button
                onClick={onSignOut}
                className="p-1.5 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
