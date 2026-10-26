import { Topic } from '../types';

export const DAILY_TOPICS: Topic[] = [
  {
    id: 'topic-1',
    title: 'How Artificial Intelligence is Changing Your Daily Routine',
    category: 'Tech & Future',
    level: 'Intermediate',
    context: 'Talk about the AI tools you use, whether you trust them, and how your daily habits have transformed recently.',
    bulletPrompts: [
      'What AI tools do you use regularly at work or in daily life?',
      'Has it made you more productive or more dependent? Give a brief example.',
      'How do you imagine human jobs will evolve over the next five years?'
    ],
    vocabHints: [
      { word: 'Streamline', meaning: 'To make an organization or process more efficient' },
      { word: 'Double-edged sword', meaning: 'Something that has both positive and negative aspects' },
      { word: 'Indispensable', meaning: 'Absolutely necessary' }
    ]
  },
  {
    id: 'topic-2',
    title: 'A Decision in Life That Changed Your Path',
    category: 'Storytelling',
    level: 'Intermediate',
    context: 'Reflect on a crossroads you faced—moving cities, changing careers, or choosing a different lifestyle.',
    bulletPrompts: [
      'What was the situation and why was the decision so difficult?',
      'What choice did you make, and what was the immediate result?',
      'Looking back, would you make the same choice today?'
    ],
    vocabHints: [
      { word: 'Crossroads', meaning: 'A point at which an important decision must be made' },
      { word: 'In hindsight', meaning: 'Looking back with the advantage of knowledge gained later' },
      { word: 'Leap of faith', meaning: 'An act of believing in or attempting something uncertain' }
    ]
  },
  {
    id: 'topic-3',
    title: 'Remote Work vs. Office Life: Where Do You Thrive?',
    category: 'Work & Career',
    level: 'Intermediate',
    context: 'Share your perspective on modern workplace flexibility and the social dynamics of working remotely.',
    bulletPrompts: [
      'Which environment suits your working style best and why?',
      'What is the biggest trade-off between freedom and team connection?',
      'What advice would you give someone struggling with work-from-home boundaries?'
    ],
    vocabHints: [
      { word: 'Camaraderie', meaning: 'Mutual trust and friendship among people who spend a lot of time together' },
      { word: 'Work-life balance', meaning: 'The equilibrium between personal life and career demands' },
      { word: 'Spontaneous', meaning: 'Occurring without premeditation or external impulse' }
    ]
  },
  {
    id: 'topic-4',
    title: 'If You Could Live in Any City in the World for One Year',
    category: 'Culture & Travel',
    level: 'Intermediate',
    context: 'Describe a city you are fascinated by and what a regular day in your life there would feel like.',
    bulletPrompts: [
      'Which city would you choose and what draws you to it?',
      'Describe what your morning or weekend would look like there.',
      'What cultural adjustment or challenge would you anticipate?'
    ],
    vocabHints: [
      { word: 'Vibrant', meaning: 'Full of energy, color, and life' },
      { word: 'Immerse oneself', meaning: 'To deeply involve oneself in a culture or activity' },
      { word: 'Cosmopolitan', meaning: 'Familiar with and at ease in many different countries and cultures' }
    ]
  },
  {
    id: 'topic-5',
    title: 'Should Social Media Have Mandatory Age Restrictions?',
    category: 'Opinions & Debate',
    level: 'Advanced',
    context: 'Argue your position on whether governments or platforms should strictly enforce minimum ages for social platforms.',
    bulletPrompts: [
      'What is your stance and what is your strongest argument?',
      'How does prolonged screen time impact young people mental well-being?',
      'Is enforcement realistic, or are educational campaigns better?'
    ],
    vocabHints: [
      { word: 'Nuanced', meaning: 'Characterized by subtle distinctions or variations' },
      { word: 'Detrimental', meaning: 'Tending to cause harm or damage' },
      { word: 'Accountability', meaning: 'The fact or condition of being accountable; responsibility' }
    ]
  },
  {
    id: 'topic-6',
    title: 'Your Ideal Morning Ritual for High Focus',
    category: 'Daily Life',
    level: 'Beginner',
    context: 'Walk through the first 60 minutes after waking up and how it sets the tone for your entire day.',
    bulletPrompts: [
      'What is the very first thing you do when your alarm rings?',
      'Do you exercise, meditate, or have a specific breakfast routine?',
      'What is one bad morning habit you are trying to break?'
    ],
    vocabHints: [
      { word: 'Mindful', meaning: 'Conscious or aware of something' },
      { word: 'Procrastinate', meaning: 'To delay or postpone action' },
      { word: 'Invigorating', meaning: 'Making one feel strong, healthy, and full of energy' }
    ]
  },
  {
    id: 'topic-7',
    title: 'A Book, Movie, or Speech That Deeply Moved You',
    category: 'Storytelling',
    level: 'Intermediate',
    context: 'Explain the core message of a story or artwork that stayed with you long after finishing it.',
    bulletPrompts: [
      'What was the title and who created it?',
      'What was the key theme or pivotal scene that struck you?',
      'How did it change your perspective or behavior?'
    ],
    vocabHints: [
      { word: 'Resonate', meaning: 'To evoke images, memories, and emotions; strike a chord' },
      { word: 'Compelling', meaning: 'Evoking interest, attention, or admiration in a powerfully irresistible way' },
      { word: 'Thought-provoking', meaning: 'Stimulating careful consideration or reflection' }
    ]
  }
];

export function getTodayTopic(): Topic {
  // Rotate topic by day of year so user has a fresh topic each day
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = (now.getTime() - startOfYear.getTime()) + ((startOfYear.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  return DAILY_TOPICS[dayOfYear % DAILY_TOPICS.length];
}
