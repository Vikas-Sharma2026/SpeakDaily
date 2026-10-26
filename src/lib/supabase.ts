import { createClient } from '@supabase/supabase-js';

// Default credentials provided for the project
const DEFAULT_PROJECT_ID = 'tobcromohibqjfkkvctf';
const DEFAULT_SUPABASE_URL = `https://${DEFAULT_PROJECT_ID}.supabase.co`;
const DEFAULT_ANON_KEY = 'sb_publishable_Ifno7lyFvWgtKdAczF5oTQ_kmRmbvg3';

// Resolve environment variables or clean URLs
function resolveSupabaseUrl(rawUrl?: string): string {
  if (!rawUrl) return DEFAULT_SUPABASE_URL;
  // If user pasted dashboard link like https://supabase.com/dashboard/project/tobcromohibqjfkkvctf
  const match = rawUrl.match(/project\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://${match[1]}.supabase.co`;
  }
  if (rawUrl.startsWith('http')) {
    return rawUrl.trim().replace(/\/+$/, '');
  }
  return DEFAULT_SUPABASE_URL;
}

export const SUPABASE_URL = resolveSupabaseUrl(import.meta.env.VITE_SUPABASE_URL);
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY).trim();

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  streak_count: number;
  total_minutes_practiced: number;
  last_practice_date?: string;
}

export interface PracticeSessionRecord {
  id?: string;
  user_id?: string;
  topic_title: string;
  topic_category?: string;
  duration_seconds: number;
  transcript: string;
  overall_score: number;
  fluency_score: number;
  vocabulary_score: number;
  grammar_score: number;
  feedback: any;
  created_at?: string;
}

// Local storage fallback key for offline / demo mode
const LOCAL_STORAGE_KEY_SESSIONS = 'speakdaily_local_sessions';
const LOCAL_STORAGE_KEY_GUEST_PROFILE = 'speakdaily_guest_profile';

export function getLocalGuestProfile(): UserProfile {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY_GUEST_PROFILE);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      // ignore
    }
  }
  const defaultProfile: UserProfile = {
    id: 'guest',
    email: 'guest@speakdaily.app',
    full_name: 'Guest Speaker',
    streak_count: 1,
    total_minutes_practiced: 2.0,
    last_practice_date: new Date().toISOString().split('T')[0],
  };
  localStorage.setItem(LOCAL_STORAGE_KEY_GUEST_PROFILE, JSON.stringify(defaultProfile));
  return defaultProfile;
}

export function updateLocalGuestStreak(secondsPracticed: number): UserProfile {
  const profile = getLocalGuestProfile();
  const today = new Date().toISOString().split('T')[0];
  const lastDate = profile.last_practice_date;

  if (lastDate === today) {
    // Already practiced today
  } else {
    profile.streak_count = (profile.streak_count || 0) + 1;
    profile.last_practice_date = today;
  }
  profile.total_minutes_practiced = Number(((profile.total_minutes_practiced || 0) + secondsPracticed / 60).toFixed(1));
  localStorage.setItem(LOCAL_STORAGE_KEY_GUEST_PROFILE, JSON.stringify(profile));
  return profile;
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Could not query profiles table in Supabase (it may need db/schema.sql created):', error.message);
      return null;
    }
    return data as UserProfile;
  } catch (err) {
    console.warn('Failed to fetch user profile:', err);
    return null;
  }
}

export async function savePracticeSession(session: PracticeSessionRecord, userId?: string): Promise<{ success: boolean; id?: string; source: 'supabase' | 'local' }> {
  // Always keep a local copy as backup
  try {
    const local = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_SESSIONS) || '[]');
    const sessionWithDate = {
      ...session,
      id: session.id || `local-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    local.unshift(sessionWithDate);
    localStorage.setItem(LOCAL_STORAGE_KEY_SESSIONS, JSON.stringify(local.slice(0, 50)));
  } catch (e) {
    console.error('Local backup failed', e);
  }

  // If user is authenticated, save to Supabase
  if (userId) {
    try {
      const { data, error } = await supabase
        .from('practice_sessions')
        .insert({
          user_id: userId,
          topic_title: session.topic_title,
          topic_category: session.topic_category || 'General',
          duration_seconds: session.duration_seconds,
          transcript: session.transcript,
          overall_score: session.overall_score,
          fluency_score: session.fluency_score,
          vocabulary_score: session.vocabulary_score,
          grammar_score: session.grammar_score,
          feedback: session.feedback,
        })
        .select('id')
        .single();

      if (!error && data) {
        // Also update streak in profiles table
        try {
          const today = new Date().toISOString().split('T')[0];
          const profile = await fetchUserProfile(userId);
          const currentStreak = profile?.streak_count || 0;
          const newStreak = profile?.last_practice_date === today ? currentStreak : currentStreak + 1;
          const currentMinutes = profile?.total_minutes_practiced || 0;
          const newMinutes = Number((currentMinutes + session.duration_seconds / 60).toFixed(1));

          await supabase
            .from('profiles')
            .upsert({
              id: userId,
              streak_count: newStreak,
              last_practice_date: today,
              total_minutes_practiced: newMinutes,
              updated_at: new Date().toISOString(),
            });
        } catch (streakErr) {
          console.warn('Profile streak update:', streakErr);
        }
        return { success: true, id: data.id, source: 'supabase' };
      }
      console.warn('Supabase insert note (schema might not be applied yet):', error?.message);
    } catch (sbErr) {
      console.warn('Supabase save error:', sbErr);
    }
  }

  return { success: true, source: 'local' };
}

export async function loadPracticeSessions(userId?: string): Promise<PracticeSessionRecord[]> {
  if (userId) {
    try {
      const { data, error } = await supabase
        .from('practice_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (!error && data && data.length > 0) {
        return data as PracticeSessionRecord[];
      }
    } catch (err) {
      console.warn('Could not load from Supabase:', err);
    }
  }

  // Fallback to local storage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_SESSIONS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load local sessions:', e);
  }

  return [];
}
