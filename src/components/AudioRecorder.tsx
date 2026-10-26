import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  Lock,
  User,
} from 'lucide-react';
import { Topic, FeedbackData } from '../types';

interface AudioRecorderProps {
  topic: Topic;
  isAuthenticated: boolean;
  onRequireAuth: () => void;
  onFeedbackGenerated: (feedback: FeedbackData, audioUrl: string, durationSeconds: number) => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  topic,
  isAuthenticated,
  onRequireAuth,
  onFeedbackGenerated,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('');
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const audioBlobRef = useRef<Blob | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const secondsRef = useRef<number>(0);
  const liveTranscriptRef = useRef<string>('');

  // Maximum practice duration is 120 seconds (2 minutes)
  const MAX_SECONDS = 120;

  useEffect(() => {
    secondsRef.current = seconds;
  }, [seconds]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecordingCleanup();
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, []);

  const stopRecordingCleanup = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {
        // ignore
      }
    }
  };

  // Pacing guide based on elapsed seconds
  const getPacingGuide = (sec: number) => {
    if (sec < 30) {
      return {
        stage: 'Stage 1: Introduction',
        guidance: 'State your main point clearly and set the stage.',
        color: 'text-amber-700 bg-amber-50 border-amber-200',
      };
    } else if (sec < 75) {
      return {
        stage: 'Stage 2: Concrete Example',
        guidance: 'Share a story, personal experience, or real-life example.',
        color: 'text-sky-700 bg-sky-50 border-sky-200',
      };
    } else if (sec < 105) {
      return {
        stage: 'Stage 3: Reflection & Depth',
        guidance: 'Explore the trade-offs, counter-argument, or deeper insight.',
        color: 'text-purple-700 bg-purple-50 border-purple-200',
      };
    } else {
      return {
        stage: 'Stage 4: Strong Conclusion',
        guidance: 'Wrap up with your takeaway thought or final advice.',
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      };
    }
  };

  // Start Voice Recording
  const startRecording = async () => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }

    setMicError(null);
    setAudioBlob(null);
    audioBlobRef.current = null;
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
      setAudioUrl(null);
    }
    setLiveTranscript('');
    liveTranscriptRef.current = '';
    setSeconds(0);
    secondsRef.current = 0;
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Setup Web Audio Analyser for real-time waveform visualization
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      drawWaveform();

      // Determine best audio mime type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const fullBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        setAudioBlob(fullBlob);
        audioBlobRef.current = fullBlob;
        const url = URL.createObjectURL(fullBlob);
        setAudioUrl(url);
        audioUrlRef.current = url;

        // Stop stream tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(250); // Slice data every 250ms
      setIsRecording(true);

      // Web Speech API recognition (live caption preview)
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';

          recognition.onresult = (event: any) => {
            let current = '';
            for (let i = 0; i < event.results.length; i++) {
              current += event.results[i][0].transcript + ' ';
            }
            const clean = current.trim();
            setLiveTranscript(clean);
            liveTranscriptRef.current = clean;
          };

          recognition.onerror = () => {
            // Non-critical, audio recording still proceeds
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch (recErr) {
          console.warn('SpeechRecognition not available:', recErr);
        }
      }

      // Interval timer
      timerIntervalRef.current = window.setInterval(() => {
        setSeconds((prev) => {
          if (prev + 1 >= MAX_SECONDS) {
            stopRecording();
            return MAX_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Microphone error:', err);
      setMicError('Microphone access is needed for speaking practice. Please allow microphone permissions in your browser.');
    }
  };

  // Draw Audio Waveform on Canvas
  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 1.6;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.9 + 4;

        // Gradient colors: amber to orange
        const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
        gradient.addColorStop(0, '#f59e0b');
        gradient.addColorStop(1, '#ea580c');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, (canvas.height - barHeight) / 2, barWidth - 2, barHeight, 4);
        ctx.fill();

        x += barWidth;
      }
    };

    render();
  };

  // Stop Recording
  const stopRecording = () => {
    setIsRecording(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  // Play / Pause Recorded Audio
  const togglePlayAudio = () => {
    if (!audioElementRef.current) return;
    if (isPlaying) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    } else {
      audioElementRef.current.play();
      setIsPlaying(true);
    }
  };

  // Convert Blob to Base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        const base64 = res.split(',')[1] || '';
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Submit to Server for AI Feedback
  const handleSubmitForFeedback = async () => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }

    const currentBlob = audioBlobRef.current || audioBlob;
    if (!currentBlob && !liveTranscript) {
      setMicError('No audio or speech detected. Please record a brief attempt first.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStep('Preparing your speaking drill...');

    // Progress updates to keep user informed during AI analysis
    const stepTimer1 = setTimeout(() => setAnalysisStep('AI coach is analyzing speech & pacing...'), 2500);
    const stepTimer2 = setTimeout(() => setAnalysisStep('Evaluating grammar & vocabulary variety...'), 6000);
    const stepTimer3 = setTimeout(() => setAnalysisStep('Crafting personalized native phrasing tips...'), 11000);

    // Generous timeout controller (90 seconds to accommodate 2-minute audio processing)
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 90000);

    try {
      let audioBase64 = '';
      let detectedMime = 'audio/webm';

      if (currentBlob) {
        audioBase64 = await blobToBase64(currentBlob);
        detectedMime = (currentBlob.type || 'audio/webm').split(';')[0].trim();
      }

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortController.signal,
        body: JSON.stringify({
          topic: topic.title,
          transcript: liveTranscriptRef.current || liveTranscript,
          audioBase64,
          mimeType: detectedMime,
          durationSeconds: secondsRef.current || seconds || 30,
        }),
      });

      clearTimeout(timeoutId);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server returned error: ${response.status} ${errorText}`);
      }

      const feedbackData: FeedbackData = await response.json();
      setAnalysisStep('Finalizing coach notes...');

      const finalUrl = audioUrlRef.current || audioUrl || (currentBlob ? URL.createObjectURL(currentBlob) : '');
      const finalDuration = secondsRef.current || seconds || 30;

      onFeedbackGenerated(feedbackData, finalUrl, finalDuration);
    } catch (err: any) {
      clearTimeout(timeoutId);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      console.error('Feedback request error:', err);
      if (err.name === 'AbortError') {
        setMicError('The connection took longer than expected. Please try again.');
      } else {
        setMicError(err.message || 'Failed to generate AI feedback. Please try again.');
      }
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep('');
    }
  };

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercent = Math.min(100, (seconds / MAX_SECONDS) * 100);
  const currentPacing = getPacingGuide(seconds);

  // If user is not logged in, show clear authentication gate so they cannot practice without logging in
  if (!isAuthenticated) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm p-6 sm:p-8 text-center flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center mb-4">
          <Lock className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-stone-900 mb-1">Sign In to Start Practicing</h3>
        <p className="text-xs sm:text-sm text-stone-500 max-w-md mb-6 leading-relaxed">
          Please log in or create an account to record your 2-minute daily practice, receive AI coaching feedback, and track your streak.
        </p>
        <button
          onClick={onRequireAuth}
          className="px-8 py-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-sm transition-all shadow-md hover:shadow-lg flex items-center gap-2.5 cursor-pointer active:scale-98"
        >
          <User className="w-4 h-4 text-amber-400" />
          <span>Sign In / Create Account to Practice</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm p-5 sm:p-7">
      {/* Mic Error Alert */}
      {micError && (
        <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block">Notice</span>
            <span>{micError}</span>
          </div>
        </div>
      )}

      {/* Recording Stage Guide */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-stone-100">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Pacing Guide</span>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${currentPacing.color}`}>
              {currentPacing.stage}
            </span>
            <span className="text-xs text-stone-600 hidden md:inline">{currentPacing.guidance}</span>
          </div>
        </div>

        {/* 2-Min Timer */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 text-stone-800 font-mono font-bold text-sm">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>{formatTime(seconds)}</span>
            <span className="text-stone-400 font-normal text-xs">/ 2:00</span>
          </div>
        </div>
      </div>

      {/* Visual Timer Progress Bar */}
      <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden mb-6 relative">
        <div
          className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 transition-all duration-300 rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
        {/* Milestone markers */}
        <div className="absolute top-0 bottom-0 left-[25%] w-0.5 bg-white/80" title="30s: Intro" />
        <div className="absolute top-0 bottom-0 left-[50%] w-0.5 bg-white/80" title="1m: Examples" />
        <div className="absolute top-0 bottom-0 left-[75%] w-0.5 bg-white/80" title="1m30s: Reflection" />
      </div>

      {/* Main Interactive Waveform / Status Display */}
      <div className="relative rounded-2xl bg-stone-900 overflow-hidden min-h-[170px] flex flex-col items-center justify-center p-6 text-center text-white mb-6">
        {/* Waveform Canvas */}
        <canvas
          ref={canvasRef}
          width={400}
          height={80}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            isRecording ? 'opacity-80' : 'opacity-0'
          }`}
        />

        {/* Inner Content */}
        <div className="relative z-10 flex flex-col items-center gap-2 max-w-md">
          {isRecording ? (
            <>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-semibold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>Recording Live ({formatTime(seconds)})</span>
              </div>
              <p className="text-xs text-stone-300 italic px-4 line-clamp-2 mt-2">
                {liveTranscript || 'Speak naturally into your microphone...'}
              </p>
            </>
          ) : audioUrl ? (
            <div className="flex flex-col items-center gap-2">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              <p className="font-semibold text-sm">Two-Minute Drill Captured!</p>
              <p className="text-xs text-stone-400">Duration: {formatTime(seconds)} • Ready for AI Coach Review</p>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-1">
                <Mic className="w-6 h-6" />
              </div>
              <p className="font-medium text-sm text-stone-200">Ready to practice?</p>
              <p className="text-xs text-stone-400 max-w-xs">
                Click Start Recording and speak for up to 2 minutes. Take your time, don't worry about perfection.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Audio Playback Element when recorded */}
      {audioUrl && !isRecording && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50/70 border border-amber-200/60 flex items-center justify-between gap-4">
          <audio
            ref={audioElementRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlayAudio}
              className="w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-600 text-stone-900 flex items-center justify-center transition-transform active:scale-95 shadow-xs cursor-pointer"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>
            <div>
              <p className="text-xs font-semibold text-stone-800">Review your recording</p>
              <p className="text-[11px] text-stone-500">{isPlaying ? 'Playing back...' : 'Click to listen before feedback'}</p>
            </div>
          </div>

          <button
            onClick={startRecording}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-amber-100/50 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retake</span>
          </button>
        </div>
      )}

      {/* Spoken Speech Review Box */}
      {audioUrl && !isRecording && (
        <div className="mb-6 p-4 rounded-xl bg-stone-50 border border-stone-200/90 text-xs space-y-2">
          <div className="flex items-center justify-between text-stone-700">
            <span className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Your Spoken Words (Speech Recognition):</span>
            </span>
            <span className="text-[11px] text-stone-400">
              {liveTranscript ? 'Feel free to polish any missed words' : 'Transcribing directly from audio'}
            </span>
          </div>
          <textarea
            value={liveTranscript}
            onChange={(e) => {
              setLiveTranscript(e.target.value);
              liveTranscriptRef.current = e.target.value;
            }}
            rows={2}
            className="w-full p-2.5 rounded-lg bg-white border border-stone-200 text-stone-800 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 placeholder:italic"
            placeholder="Live captions will appear here as you speak. If blank, Gemini will transcribe your recorded audio directly."
          />
        </div>
      )}

      {/* Action Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {isRecording ? (
          <button
            onClick={stopRecording}
            className="w-full sm:w-auto px-7 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <Square className="w-4 h-4 fill-white" />
            <span>Finish Speaking ({formatTime(seconds)})</span>
          </button>
        ) : audioUrl ? (
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleSubmitForFeedback}
              disabled={isAnalyzing}
              className="w-full sm:w-auto px-7 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-stone-950 font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 active:scale-98"
            >
              {isAnalyzing ? (
                <>
                  <span className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                  <span>{analysisStep || 'Analyzing with AI...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Get AI Feedback</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <button
            onClick={startRecording}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2.5 cursor-pointer active:scale-98"
          >
            <Mic className="w-5 h-5" />
            <span>Start 2-Minute Practice</span>
          </button>
        )}
      </div>
    </div>
  );
};
