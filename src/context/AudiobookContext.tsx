import React, { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react';
import { CHAPTERS } from './audiobookData';

interface AudiobookCtx {
  activeChap: number;
  ebookChap: number;
  playing: boolean;
  current: number;
  duration: number;
  volume: number;
  speed: number;
  togglePlay: () => void;
  seek: (val: number) => void;
  changeChapter: (audioIdx: number) => void;
  changeEbookChap: (ebookIdx: number) => void;
  setVolume: (v: number) => void;
  setSpeed: (s: number) => void;
}

const Ctx = createContext<AudiobookCtx | null>(null);
export const useAudiobook = () => useContext(Ctx)!;

export function AudiobookProvider({ children }: { children: React.ReactNode }) {
  const audioRef                    = useRef<HTMLAudioElement>(null);
  const [activeChap, setActiveChap] = useState(0);
  const [ebookChap, setEbookChap]   = useState(1); // 0 = sumário (sem áudio), 1-8 = caps
  const [playing, setPlaying]       = useState(false);
  const [current, setCurrent]       = useState(0);
  const [duration, setDuration]     = useState(0);
  const [volume, setVolumeState]    = useState(0.8);
  const [speed, setSpeedState]      = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrent(audio.currentTime);
    const onMeta = () => setDuration(audio.duration);
    const onEnd  = () => {
      if (activeChap < CHAPTERS.length - 1) setActiveChap(c => c + 1);
      else setPlaying(false);
    };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnd);
    };
  }, [activeChap]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.load();
    audio.playbackRate = speed;
    setCurrent(0); setDuration(0);
    if (playing) audio.play().catch(() => setPlaying(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChap]);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      try {
        await audio.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    }
  }, [playing]);

  const seek = useCallback((val: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = val;
    setCurrent(val);
  }, []);

  // Muda pelo audiobook — sincroniza o ebook
  const changeChapter = useCallback((audioIdx: number) => {
    setActiveChap(audioIdx);
    setEbookChap(audioIdx + 1); // audio cap 0 → ebook cap 1
    setPlaying(false);
    setCurrent(0); setDuration(0);
  }, []);

  // Muda pelo ebook — sincroniza o áudio (se não for sumário)
  const changeEbookChap = useCallback((ebookIdx: number) => {
    setEbookChap(ebookIdx);
    if (ebookIdx >= 1) {
      setActiveChap(ebookIdx - 1); // ebook cap 1 → audio cap 0
      setPlaying(false);
      setCurrent(0); setDuration(0);
    }
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  const setSpeed = useCallback((s: number) => {
    setSpeedState(s);
    if (audioRef.current) audioRef.current.playbackRate = s;
  }, []);

  return (
    <Ctx.Provider value={{ activeChap, ebookChap, playing, current, duration, volume, speed,
                           togglePlay, seek, changeChapter, changeEbookChap, setVolume, setSpeed }}>
      {children}
      <audio ref={audioRef} src={CHAPTERS[activeChap].file} preload="metadata" />
    </Ctx.Provider>
  );
}
