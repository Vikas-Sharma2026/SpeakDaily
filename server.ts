import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Body parser
app.use(express.json({ limit: '50mb' }));

// Initialize GoogleGenAI SDK server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// System instruction for speaking partner
const SYSTEM_INSTRUCTION = `You are a friendly, encouraging, expert English speaking coach for "SpeakDaily: Your two-minute English practice partner".
Your goal is to help ESL / English learners improve their spoken fluency, vocabulary, grammar, and pronunciation clarity without feeling intimidated.
Be constructive, warm, and precise.

You must respond ONLY with a valid JSON object matching this structure:
{
  "transcript": "Full clean transcript of what the speaker said",
  "overallScore": 8.2, // number 1.0 to 10.0
  "fluencyScore": 8.0, // number 1.0 to 10.0
  "grammarScore": 7.5, // number 1.0 to 10.0
  "vocabularyScore": 8.0, // number 1.0 to 10.0
  "cefrLevel": "B2", // "A1", "A2", "B1", "B2", "C1", or "C2"
  "summary": "Warm, encouraging 2-sentence summary praising specific strengths and highlighting the main area to level up.",
  "grammarCorrections": [
    {
      "original": "exact problematic phrase",
      "corrected": "natural correct English",
      "explanation": "brief clear reason why"
    }
  ],
  "betterPhrasing": [
    {
      "original": "simple or slightly clunky phrase",
      "suggestion": "more expressive or native-like idiom/phrase",
      "reason": "why this elevates their speaking"
    }
  ],
  "pronunciationTips": [
    "Specific tip on linking, rhythm, or a word that might need clearer articulation"
  ],
  "pacingFeedback": "Insight on pacing for this 2-minute drill (e.g. good rhythm, could expand more, etc.)"
}`;

function parseFeedbackJson(responseText: string) {
  const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Failed to parse model output as JSON');
  }
}

// API Route: AI Speech Feedback
app.post('/api/feedback', async (req: Request, res: Response) => {
  try {
    const { topic, transcript, audioBase64, mimeType, durationSeconds } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required.' });
    }

    const durationText = durationSeconds ? `${durationSeconds} seconds` : 'approximately 1 to 2 minutes';

    let cleanMime = 'audio/webm';
    if (mimeType) {
      cleanMime = mimeType.split(';')[0].trim().toLowerCase();
    }

    let userTranscript = (transcript || '').trim();

    // Step 1: If transcript is empty or very short, transcribe the user's actual audio recording with Gemini
    if (!userTranscript && audioBase64) {
      console.log('Transcribing user audio recording directly with gemini-3.5-transcribe...');
      const audioPart = {
        inlineData: {
          mimeType: cleanMime,
          data: audioBase64,
        },
      };

      try {
        const trResponse = await ai.models.generateContent({
          model: 'gemini-3.5-transcribe',
          contents: {
            parts: [
              audioPart,
              { text: `Transcribe what the user said while practicing English on the topic "${topic}". Output only the spoken words.` },
            ],
          },
        });

        const rawText = trResponse.text?.trim() || '';
        if (rawText && !rawText.includes('[inaudible]')) {
          userTranscript = rawText;
          console.log('Transcribed speech successfully:', userTranscript);
        }
      } catch (err: any) {
        console.warn('Audio transcription error with gemini-3.5-transcribe:', err?.message);
      }
    }

    // If user audio was completely silent or inaudible
    if (!userTranscript || userTranscript === '[inaudible]' || userTranscript.length < 3) {
      return res.json({
        transcript: "(No clear speech detected in recording)",
        overallScore: 5.0,
        fluencyScore: 5.0,
        grammarScore: 5.0,
        vocabularyScore: 5.0,
        cefrLevel: "N/A",
        summary: "We couldn't detect clear speech in your recording. Please ensure your microphone is unmuted, speak closer to the mic, and try again!",
        grammarCorrections: [],
        betterPhrasing: [],
        pronunciationTips: [
          "Speak clearly at a steady volume towards your microphone.",
          "Check that your browser microphone permissions are enabled."
        ],
        pacingFeedback: "Please record your speech for at least 20-30 seconds to receive comprehensive pacing feedback."
      });
    }

    // Step 2: Evaluate the user's ACTUAL spoken words
    console.log(`Evaluating user's actual speech (${userTranscript.length} chars) on topic: ${topic}`);

    const promptText = `The user completed a 2-minute English speaking practice drill on the topic: "${topic}".
Duration: ${durationText}.

Here is the EXACT speech transcript spoken by the user:
"""
${userTranscript}
"""

YOUR TASK:
1. Provide the clean transcript of what THIS user said.
2. Evaluate their speaking performance in fluency, grammar, and vocabulary strictly based on THEIR actual spoken words above.
3. In "grammarCorrections", find real grammar or preposition/tense mistakes in THEIR actual words above, showing the original phrase from their speech and how to fix it. If their grammar was completely correct, leave the array empty [].
4. In "betterPhrasing", suggest 2-3 more natural, idiomatic, or expressive ways they could have phrased ideas from THEIR speech above.
5. In "pronunciationTips", give 1-2 practical pointers for words or sounds in THEIR speech.
6. Provide an overall score (1-10) and CEFR level.

Format your output strictly as the requested JSON object.`;

    let feedbackData = null;
    const modelsToTry = [
      'gemini-3.1-flash-lite',
      'gemini-3.8-flash'
    ];

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: promptText,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            temperature: 0.7,
          },
        });

        if (response.text) {
          feedbackData = parseFeedbackJson(response.text);
          if (feedbackData) {
            feedbackData.transcript = userTranscript;
            break;
          }
        }
      } catch (err: any) {
        console.warn(`Evaluation with ${modelName} failed:`, err?.message);
      }
    }

    if (!feedbackData) {
      throw new Error('Could not evaluate user speech');
    }

    return res.json(feedbackData);
  } catch (error: any) {
    console.error('Error generating speaking feedback:', error);
    return res.status(500).json({
      error: 'Failed to generate speaking feedback',
      details: error?.message || 'Unknown error',
    });
  }
});

// Setup Vite middleware in dev or static serve in prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SpeakDaily server running on http://localhost:${PORT}`);
  });
}

startServer();
