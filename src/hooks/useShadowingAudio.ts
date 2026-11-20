import { useCallback, useEffect, useRef, useState } from 'react';
import { Paragraph } from '../types/ielts';

export type AudioEngine = 'gemini' | 'browser' | 'custom';

interface UseShadowingAudioOptions {
  paragraphs: Paragraph[];
  customAudioUrl?: string;
}

export function useShadowingAudio({ paragraphs, customAudioUrl }: UseShadowingAudioOptions) {
  const [engine, setEngine] = useState<AudioEngine>(customAudioUrl ? 'custom' : 'browser');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeParagraphId, setActiveParagraphId] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [loopParagraph, setLoopParagraph] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [customProgress, setCustomProgress] = useState(0);
  const [customDuration, setCustomDuration] = useState(0);

  const audioCacheRef = useRef<Map<string, string>>(new Map());
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const customAudioElRef = useRef<HTMLAudioElement | null>(null);
  const loopRef = useRef(loopParagraph);
  const rateRef = useRef(playbackRate);
  const paragraphsRef = useRef(paragraphs);
  const stoppedRef = useRef(false);

  useEffect(() => {
    loopRef.current = loopParagraph;
  }, [loopParagraph]);

  useEffect(() => {
    rateRef.current = playbackRate;
    if (audioElRef.current) {
      audioElRef.current.playbackRate = playbackRate;
    }
    if (customAudioElRef.current) {
      customAudioElRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  useEffect(() => {
    paragraphsRef.current = paragraphs;
  }, [paragraphs]);

  useEffect(() => {
    if (customAudioUrl) {
      setEngine('custom');
    } else if (engine === 'custom') {
      setEngine('browser');
    }
  }, [customAudioUrl, engine]);

  const stopAll = useCallback(() => {
    stoppedRef.current = true;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.currentTime = 0;
    }
    if (customAudioElRef.current) {
      customAudioElRef.current.pause();
    }
    setIsPlaying(false);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      stopAll();
    };
  }, [stopAll]);

  const playParagraphWithBrowser = useCallback((index: number) => {
    const list = paragraphsRef.current;
    if (index < 0 || index >= list.length || stoppedRef.current) {
      setIsPlaying(false);
      setActiveParagraphId(null);
      return;
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setError('Trình duyệt không hỗ trợ Web Speech. Vui lòng chuyển sang giọng AI Gemini.');
      setIsPlaying(false);
      return;
    }

    const para = list[index];
    window.speechSynthesis.cancel();
    setActiveParagraphId(para.id);
    setIsPlaying(true);
    setError(null);

    const utterance = new SpeechSynthesisUtterance(para.text);
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find((v) => v.lang === 'en-GB' && v.name.toLowerCase().includes('female')) ||
      voices.find((v) => v.lang === 'en-GB') ||
      voices.find((v) => v.lang.startsWith('en'));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    utterance.lang = 'en-GB';
    utterance.rate = rateRef.current;

    utterance.onend = () => {
      if (stoppedRef.current) return;
      if (loopRef.current) {
        playParagraphWithBrowser(index);
      } else if (index + 1 < paragraphsRef.current.length) {
        playParagraphWithBrowser(index + 1);
      } else {
        setIsPlaying(false);
        setActiveParagraphId(null);
      }
    };

    utterance.onerror = (event) => {
      if (event.error === 'interrupted' || event.error === 'canceled') return;
      setIsPlaying(false);
      setError('Giọng đọc trình duyệt bị gián đoạn. Bạn có thể chuyển sang giọng AI Gemini.');
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const playParagraphWithGemini = useCallback(async (index: number) => {
    const list = paragraphsRef.current;
    if (index < 0 || index >= list.length || stoppedRef.current) {
      setIsPlaying(false);
      setActiveParagraphId(null);
      return;
    }

    const para = list[index];
    setActiveParagraphId(para.id);
    setError(null);

    try {
      let audioSrc = audioCacheRef.current.get(para.id);
      if (!audioSrc) {
        setIsLoading(true);
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: para.text, voiceName: 'Kore' }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Không thể tải âm thanh Shadowing.');
        }
        audioSrc = `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`;
        audioCacheRef.current.set(para.id, audioSrc);
        setIsLoading(false);
      }

      if (stoppedRef.current) return;

      if (!audioElRef.current) {
        audioElRef.current = new Audio();
      }
      const audio = audioElRef.current;
      audio.src = audioSrc;
      audio.playbackRate = rateRef.current;

      audio.onended = () => {
        if (stoppedRef.current) return;
        if (loopRef.current) {
          audio.currentTime = 0;
          audio.play().catch(() => setIsPlaying(false));
        } else if (index + 1 < paragraphsRef.current.length) {
          playParagraphWithGemini(index + 1);
        } else {
          setIsPlaying(false);
          setActiveParagraphId(null);
        }
      };

      setIsPlaying(true);
      await audio.play();
    } catch (err) {
      setIsLoading(false);
      setIsPlaying(false);
      setError(err instanceof Error ? err.message : 'Lỗi phát âm thanh AI.');
    }
  }, []);

  const playParagraph = useCallback(
    (paragraphId: string, overrideEngine?: AudioEngine) => {
      const targetEngine = overrideEngine ?? engine;
      const idx = paragraphsRef.current.findIndex((p) => p.id === paragraphId);
      if (idx === -1) return;

      stopAll();
      stoppedRef.current = false;

      if (targetEngine === 'gemini') {
        void playParagraphWithGemini(idx);
      } else {
        playParagraphWithBrowser(idx);
      }
    },
    [engine, playParagraphWithBrowser, playParagraphWithGemini, stopAll]
  );

  const togglePlay = useCallback(() => {
    if (engine === 'custom' && customAudioUrl) {
      if (!customAudioElRef.current) {
        const audio = new Audio(customAudioUrl);
        audio.playbackRate = rateRef.current;
        audio.ontimeupdate = () => {
          setCustomProgress(audio.currentTime);
          setCustomDuration(audio.duration || 0);
        };
        audio.onended = () => setIsPlaying(false);
        customAudioElRef.current = audio;
      }
      if (isPlaying) {
        customAudioElRef.current.pause();
        setIsPlaying(false);
      } else {
        customAudioElRef.current.playbackRate = rateRef.current;
        customAudioElRef.current.play().then(() => setIsPlaying(true)).catch(() => {
          setError('Không thể phát tệp Audio đã tải lên.');
        });
      }
      return;
    }

    if (isPlaying || isLoading) {
      stopAll();
      return;
    }

    const startId = activeParagraphId || paragraphs[0]?.id;
    if (startId) {
      playParagraph(startId);
    }
  }, [activeParagraphId, customAudioUrl, engine, isLoading, isPlaying, paragraphs, playParagraph, stopAll]);

  const seekCustomAudio = useCallback((seconds: number) => {
    if (customAudioElRef.current) {
      customAudioElRef.current.currentTime = seconds;
      setCustomProgress(seconds);
    }
  }, []);

  const speakWord = useCallback((word: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(word);
      u.lang = 'en-GB';
      u.rate = 0.92;
      window.speechSynthesis.speak(u);
    }
  }, []);

  return {
    engine,
    setEngine: (next: AudioEngine) => {
      stopAll();
      setEngine(next);
    },
    isPlaying,
    isLoading,
    activeParagraphId,
    playbackRate,
    setPlaybackRate,
    loopParagraph,
    setLoopParagraph,
    error,
    clearError: () => setError(null),
    playParagraph,
    togglePlay,
    stopAll,
    speakWord,
    customProgress,
    customDuration,
    seekCustomAudio,
  };
}
