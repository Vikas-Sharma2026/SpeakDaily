import React, { useState } from 'react';
import { Sparkles, Shuffle, Compass, HelpCircle, BookMarked, ChevronDown } from 'lucide-react';
import { Topic } from '../types';
import { DAILY_TOPICS } from '../data/topics';

interface TopicCardProps {
  currentTopic: Topic;
  onSelectTopic: (topic: Topic) => void;
  disabled?: boolean;
}

export const TopicCard: React.FC<TopicCardProps> = ({ currentTopic, onSelectTopic, disabled }) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const handleShuffle = () => {
    const available = DAILY_TOPICS.filter((t) => t.id !== currentTopic.id);
    const random = available[Math.floor(Math.random() * available.length)];
    if (random) onSelectTopic(random);
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm p-6 sm:p-7 relative">
      {/* Category & Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-900 border border-amber-500/20">
            {currentTopic.category}
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-stone-100 text-stone-600">
            Level: {currentTopic.level}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Shuffle */}
          <button
            onClick={handleShuffle}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 disabled:opacity-50 transition-colors cursor-pointer"
            title="Randomize topic"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Shuffle Topic</span>
          </button>

          {/* Topic Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-stone-100 hover:bg-stone-200/80 text-stone-800 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <span>Browse All Topics</span>
              <ChevronDown className="w-3.5 h-3.5 text-stone-500" />
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-xl border border-stone-200 py-2 z-30 max-h-80 overflow-y-auto">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Select Daily Topic
                </div>
                {DAILY_TOPICS.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => {
                      onSelectTopic(topic);
                      setShowDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 text-xs transition-colors flex flex-col gap-0.5 cursor-pointer ${
                      topic.id === currentTopic.id
                        ? 'bg-amber-50 text-amber-900 font-semibold'
                        : 'hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <span className="truncate">{topic.title}</span>
                    <span className="text-[10px] text-stone-400">{topic.category}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Topic Title */}
      <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight leading-snug mb-2">
        {currentTopic.title}
      </h1>
      <p className="text-xs sm:text-sm text-stone-600 leading-relaxed mb-6">
        {currentTopic.context}
      </p>

      {/* Two Help Columns: Guiding Questions & Vocab Hints */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-stone-100">
        {/* Guiding Questions to Structure the 2 Minutes */}
        <div className="space-y-2 bg-stone-50/70 rounded-xl p-4 border border-stone-200/50">
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 mb-2">
            <HelpCircle className="w-4 h-4 text-amber-600" />
            <span>Guiding Outline for 2 Minutes:</span>
          </div>
          <ul className="space-y-2 text-xs text-stone-600">
            {currentTopic.bulletPrompts.map((prompt, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-amber-200/60 text-amber-900 font-semibold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{prompt}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Vocabulary & Idiom Spark */}
        <div className="space-y-2 bg-amber-50/30 rounded-xl p-4 border border-amber-200/40">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950 mb-2">
            <BookMarked className="w-4 h-4 text-amber-600" />
            <span>Target Vocabulary (Try to use these):</span>
          </div>
          <div className="space-y-2 text-xs">
            {currentTopic.vocabHints.map((vocab, idx) => (
              <div key={idx} className="flex flex-col">
                <span className="font-semibold text-amber-900">{vocab.word}</span>
                <span className="text-[11px] text-stone-500">{vocab.meaning}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
