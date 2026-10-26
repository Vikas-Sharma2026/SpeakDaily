/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { TopicCard } from './components/TopicCard';
import { AudioRecorder } from './components/AudioRecorder';
import { FeedbackView } from './components/FeedbackView';
import { AuthModal } from './components/AuthModal';
import { HistoryModal } from './components/HistoryModal';
import { SchemaModal } from './components/SchemaModal';
import { getTodayTopic, DAILY_TOPICS } from './data/topics';
import { Topic, FeedbackData } from './types';
import {
  supabase,
  UserProfile,
  fetchUserProfile,
  getLocalGuestProfile,
  updateLocalGuestStreak,
  savePracticeSession,
  PracticeSessionRecord,
} from './lib/supabase';
import { Mic, Sparkles, CheckCircle2, Shield, Flame, BookOpen } from 'lucide-react';

export default function App() {
  const [currentTopic, setCurrentTopic] = useState<Topic>(getTodayTopic());
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number>(0);

  // User and Auth State
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSchemaOpen, setIsSchemaOpen] = useState(false);

  // Sync Supabase Auth session on load
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadUser(session.user.id);
      } else {
        setProfile(getLocalGuestProfile());
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        loadUser(session.user.id);
      } else {
        setUser(null);
        setProfile(getLocalGuestProfile());
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUser = async (userId: string) => {
    const prof = await fetchUserProfile(userId);
    if (prof) {
      setProfile(prof);
    } else {
      // Fallback guest profile structure with user id
      setProfile({
        id: userId,
        email: user?.email || '',
        streak_count: 1,
        total_minutes_practiced: 2.0,
      });
    }
  };

  const handleFeedbackGenerated = async (
    generatedFeedback: FeedbackData,
    recordingUrl: string,
    recordedDuration: number
  ) => {
    setFeedback(generatedFeedback);
    setAudioUrl(recordingUrl);
    setDurationSeconds(recordedDuration);

    // Save session
    const sessionRecord: PracticeSessionRecord = {
      topic_title: currentTopic.title,
      topic_category: currentTopic.category,
      duration_seconds: recordedDuration,
      transcript: generatedFeedback.transcript,
      overall_score: generatedFeedback.overallScore,
      fluency_score: generatedFeedback.fluencyScore,
      vocabulary_score: generatedFeedback.vocabularyScore,
      grammar_score: generatedFeedback.grammarScore,
      feedback: generatedFeedback,
    };

    await savePracticeSession(sessionRecord, user?.id);

    // Update streak locally or refresh profile
    if (!user) {
      const updated = updateLocalGuestStreak(recordedDuration);
      setProfile(updated);
    } else {
      loadUser(user.id);
    }
  };

  const handlePracticeAgain = () => {
    setFeedback(null);
    setAudioUrl(null);
    setDurationSeconds(0);
  };

  const handleNextTopic = () => {
    const currentIndex = DAILY_TOPICS.findIndex((t) => t.id === currentTopic.id);
    const nextTopic = DAILY_TOPICS[(currentIndex + 1) % DAILY_TOPICS.length];
    setCurrentTopic(nextTopic);
    setFeedback(null);
    setAudioUrl(null);
    setDurationSeconds(0);
  };

  const handleSelectPastSession = (session: PracticeSessionRecord) => {
    if (session.feedback) {
      setFeedback(session.feedback);
      setDurationSeconds(session.duration_seconds || 120);
      const matched = DAILY_TOPICS.find((t) => t.title === session.topic_title);
      if (matched) {
        setCurrentTopic(matched);
      } else {
        setCurrentTopic({
          id: 'custom-topic',
          title: session.topic_title,
          category: (session.topic_category as any) || 'Daily Life',
          level: 'Intermediate',
          context: 'Reviewing past practice drill.',
          bulletPrompts: ['Review your transcript and key grammar polish below.'],
          vocabHints: [],
        });
      }
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(getLocalGuestProfile());
  };

  return (
    <div className="min-h-screen bg-stone-50/60 text-stone-900 flex flex-col font-sans selection:bg-amber-200">
      {/* Navigation */}
      <Navbar
        user={user}
        profile={profile}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenHistory={() => {
          if (!user) {
            setIsAuthOpen(true);
          } else {
            setIsHistoryOpen(true);
          }
        }}
        onSignOut={handleSignOut}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {feedback ? (
          // Feedback view after 2-minute drill
          <FeedbackView
            feedback={feedback}
            topic={currentTopic}
            audioUrl={audioUrl || undefined}
            durationSeconds={durationSeconds}
            onPracticeAgain={handlePracticeAgain}
            onNextTopic={handleNextTopic}
          />
        ) : (
          // Practice view
          <div className="space-y-6">
            {/* Topic Presentation Card */}
            <TopicCard
              currentTopic={currentTopic}
              onSelectTopic={(topic) => setCurrentTopic(topic)}
            />

            {/* Two-minute Audio Recorder & Waveform Visualizer */}
            <AudioRecorder
              topic={currentTopic}
              isAuthenticated={!!user}
              onRequireAuth={() => setIsAuthOpen(true)}
              onFeedbackGenerated={handleFeedbackGenerated}
            />
          </div>
        )}

        {/* Feature Highlights Footer Bar */}
        <section className="pt-8 pb-4 border-t border-stone-200/70 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-stone-600">
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-stone-200/60 shadow-xs">
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-stone-800 block">2-Minute Daily Drills</span>
              <span>Bite-sized, focused speaking practice designed to build lasting conversational confidence.</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-stone-200/60 shadow-xs">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-stone-800 block">Instant AI Coaching</span>
              <span>Receive actionable notes on fluency, grammar polish, and native phrasings powered by Gemini.</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-stone-200/60 shadow-xs">
            <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-stone-800 block">Supabase Sync</span>
              <span>Secure authentication and personal streak tracking backed by PostgreSQL.</span>
            </div>
          </div>
        </section>
      </main>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={() => {
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
              setUser(session.user);
              loadUser(session.user.id);
            }
          });
        }}
      />

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        userId={user?.id}
        onSelectSession={handleSelectPastSession}
      />

      <SchemaModal
        isOpen={isSchemaOpen}
        onClose={() => setIsSchemaOpen(false)}
      />

      {/* Clean minimal footer */}
      <footer className="border-t border-stone-200 bg-white/60 py-4 text-center text-xs text-stone-400">
        <p>SpeakDaily © {new Date().getFullYear()} • Your Two-Minute English Practice Partner</p>
      </footer>
    </div>
  );
}
