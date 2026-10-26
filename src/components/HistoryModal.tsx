import React, { useEffect, useState } from 'react';
import { X, History, Calendar, Clock, Award, ChevronRight, BookOpen } from 'lucide-react';
import { loadPracticeSessions, PracticeSessionRecord } from '../lib/supabase';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  onSelectSession?: (session: PracticeSessionRecord) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  userId,
  onSelectSession,
}) => {
  const [sessions, setSessions] = useState<PracticeSessionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      loadPracticeSessions(userId).then((res) => {
        setSessions(res);
        setLoading(false);
      });
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Recently';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">Speaking Practice History</h2>
              <p className="text-xs text-stone-500">Track your past 2-minute drills and score progress</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-stone-400 text-xs gap-2">
              <span className="w-5 h-5 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
              <span>Loading practice history...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-12 text-center text-stone-500 text-xs space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mb-2">
                <BookOpen className="w-6 h-6" />
              </div>
              <p className="font-semibold text-stone-800 text-sm">No speaking sessions recorded yet</p>
              <p className="max-w-xs mx-auto text-stone-400">
                Complete your first two-minute drill on today's topic to see your AI score breakdown here!
              </p>
            </div>
          ) : (
            sessions.map((item, idx) => (
              <div
                key={item.id || idx}
                onClick={() => {
                  if (onSelectSession) {
                    onSelectSession(item);
                    onClose();
                  }
                }}
                className="p-4 rounded-xl border border-stone-200/80 hover:border-amber-400/80 hover:bg-amber-50/20 transition-all cursor-pointer group flex items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-stone-100 text-stone-700">
                      {item.topic_category || 'General'}
                    </span>
                    <span className="text-[11px] text-stone-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(item.created_at)}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-stone-900 group-hover:text-amber-700 transition-colors truncate">
                    {item.topic_title}
                  </h4>
                  <p className="text-xs text-stone-500 line-clamp-1 italic">
                    "{item.transcript || 'Spoken session'}"
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-sm font-bold text-amber-600 block">
                      {item.overall_score ? item.overall_score.toFixed(1) : '8.0'}/10
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {item.duration_seconds || 120}s
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-amber-600 transition-colors" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
