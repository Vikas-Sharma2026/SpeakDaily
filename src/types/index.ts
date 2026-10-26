export interface Topic {
  id: string;
  title: string;
  category: 'Daily Life' | 'Work & Career' | 'Tech & Future' | 'Opinions & Debate' | 'Culture & Travel' | 'Storytelling';
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  context: string;
  bulletPrompts: string[];
  vocabHints: { word: string; meaning: string }[];
}

export interface FeedbackData {
  transcript: string;
  overallScore: number;
  fluencyScore: number;
  grammarScore: number;
  vocabularyScore: number;
  cefrLevel: string;
  summary: string;
  grammarCorrections: {
    original: string;
    corrected: string;
    explanation: string;
  }[];
  betterPhrasing: {
    original: string;
    suggestion: string;
    reason: string;
  }[];
  pronunciationTips: string[];
  pacingFeedback: string;
}

export type RecordingStatus = 'idle' | 'recording' | 'recorded' | 'analyzing' | 'completed';
