import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Play,
  Pause,
  Award,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  RotateCcw,
  Volume2,
  TrendingUp,
} from 'lucide-react';
import { FeedbackData, Topic } from '../types';

interface FeedbackViewProps {
  feedback: FeedbackData;
  topic: Topic;
  audioUrl?: string;
  durationSeconds: number;
  onPracticeAgain: () => void;
  onNextTopic: () => void;
}

export const FeedbackView: React.FC<FeedbackViewProps> = ({
  feedback,
  topic,
  audioUrl,
  durationSeconds,
  onPracticeAgain,
  onNextTopic,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8.5) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 7.0) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-orange-600 bg-orange-50 border-orange-200';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner: Score & Coach Summary */}
      <div className="bg-gradient-to-br from-stone-900 to-stone-800 text-white rounded-2xl p-6 sm:p-8 shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Speaking Coach Evaluation</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Great job on your 2-minute drill!</h2>
            <p className="text-sm text-stone-300 leading-relaxed">{feedback.summary}</p>
          </div>

          {/* Overall Score Badge */}
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-xs px-5 py-4 rounded-2xl border border-white/15 shrink-0">
            <div className="text-center">
              <span className="text-3xl sm:text-4xl font-extrabold text-amber-400">
                {feedback.overallScore?.toFixed(1) || '8.0'}
              </span>
              <span className="text-xs text-stone-300 block font-medium">out of 10</span>
            </div>
            <div className="h-10 w-px bg-white/20" />
            <div className="text-left">
              <span className="text-xs uppercase tracking-wider font-semibold text-stone-300 block">
                CEFR Level
              </span>
              <span className="text-xl font-bold text-white">{feedback.cefrLevel || 'B2'}</span>
            </div>
          </div>
        </div>

        {/* Skill Sub-Score Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
            <div className="flex items-center justify-between text-xs text-stone-300 mb-1.5">
              <span>Fluency & Pacing</span>
              <span className="font-bold text-white">{feedback.fluencyScore?.toFixed(1) || '8.0'}/10</span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-400 h-full rounded-full"
                style={{ width: `${((feedback.fluencyScore || 8) / 10) * 100}%` }}
              />
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
            <div className="flex items-center justify-between text-xs text-stone-300 mb-1.5">
              <span>Grammar & Accuracy</span>
              <span className="font-bold text-white">{feedback.grammarScore?.toFixed(1) || '7.5'}/10</span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full"
                style={{ width: `${((feedback.grammarScore || 7.5) / 10) * 100}%` }}
              />
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
            <div className="flex items-center justify-between text-xs text-stone-300 mb-1.5">
              <span>Vocabulary Variety</span>
              <span className="font-bold text-white">{feedback.vocabularyScore?.toFixed(1) || '8.0'}/10</span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-sky-400 h-full rounded-full"
                style={{ width: `${((feedback.vocabularyScore || 8) / 10) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Transcript & Voice Playback Card */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-stone-100">
          <div>
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-600" />
              <span>Spoken Transcript</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Topic: <span className="font-medium text-stone-700">{topic.title}</span> ({durationSeconds}s)
            </p>
          </div>

          {audioUrl && (
            <div className="flex items-center gap-3">
              <audio
                ref={audioRef}
                src={audioUrl}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
              <button
                onClick={toggleAudio}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 font-semibold text-xs transition-colors cursor-pointer"
              >
                {isPlaying ? <Pause className="w-4 h-4 text-amber-700" /> : <Play className="w-4 h-4 text-amber-700" />}
                <span>{isPlaying ? 'Pause Audio' : 'Listen to Recording'}</span>
              </button>
            </div>
          )}
        </div>

        <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/60 text-stone-800 text-sm leading-relaxed italic">
          "{feedback.transcript || 'Audio transcribed successfully.'}"
        </div>
        {feedback.pacingFeedback && (
          <p className="text-xs text-stone-500 mt-2.5 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-stone-400" />
            <span>{feedback.pacingFeedback}</span>
          </p>
        )}
      </div>

      {/* Two Column Section: Grammar Corrections & Better Phrasing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Grammar Polish */}
        <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">Grammar Polish</h3>
              <p className="text-xs text-stone-500">Refine tricky tense, prepositions & agreement</p>
            </div>
          </div>

          {feedback.grammarCorrections && feedback.grammarCorrections.length > 0 ? (
            <div className="space-y-3">
              {feedback.grammarCorrections.map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/70 text-xs space-y-1.5">
                  <div className="flex items-start gap-2 text-stone-500">
                    <span className="font-semibold text-red-600 shrink-0">You said:</span>
                    <span className="line-through">{item.original}</span>
                  </div>
                  <div className="flex items-start gap-2 text-stone-900 font-medium">
                    <span className="font-semibold text-emerald-600 shrink-0">Better:</span>
                    <span>{item.corrected}</span>
                  </div>
                  {item.explanation && (
                    <p className="text-[11px] text-stone-500 pt-1 border-t border-stone-200/50">
                      💡 {item.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/50 text-emerald-800 text-xs">
              ✨ Solid grammar throughout your practice! No major grammatical errors detected.
            </div>
          )}
        </div>

        {/* More Natural Phrasings */}
        <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">Sound More Native</h3>
              <p className="text-xs text-stone-500">Elevate simple words into natural idioms</p>
            </div>
          </div>

          {feedback.betterPhrasing && feedback.betterPhrasing.length > 0 ? (
            <div className="space-y-3">
              {feedback.betterPhrasing.map((phrase, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/60 text-xs space-y-1.5">
                  <div className="flex items-start gap-2 text-stone-600">
                    <span className="font-medium text-stone-500 shrink-0">Original:</span>
                    <span>"{phrase.original}"</span>
                  </div>
                  <div className="flex items-start gap-2 text-amber-950 font-semibold">
                    <span className="font-bold text-amber-700 shrink-0">Try saying:</span>
                    <span>"{phrase.suggestion}"</span>
                  </div>
                  {phrase.reason && (
                    <p className="text-[11px] text-stone-600 pt-1 border-t border-amber-200/40">
                      🎯 {phrase.reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/60 text-stone-600 text-xs">
              Great word variety used during this session!
            </div>
          )}
        </div>
      </div>

      {/* Pronunciation & Delivery Tips */}
      {feedback.pronunciationTips && feedback.pronunciationTips.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-3">
            <Volume2 className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-bold text-stone-900">Pronunciation & Articulation Pointers</h3>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {feedback.pronunciationTips.map((tip, idx) => (
              <li
                key={idx}
                className="p-3 rounded-xl bg-sky-50/60 border border-sky-100 text-xs text-sky-900 flex items-start gap-2"
              >
                <span className="font-bold text-sky-600 shrink-0">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Bottom Actions: Practice Again or Next Topic */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <button
          onClick={onPracticeAgain}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-800 font-semibold text-xs transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 text-stone-500" />
          <span>Practice This Topic Again</span>
        </button>

        <button
          onClick={onNextTopic}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer"
        >
          <span>Choose Next Topic</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
