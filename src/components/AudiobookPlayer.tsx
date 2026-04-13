import type React from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Headphones } from 'lucide-react';
import { useAudiobook } from '../context/AudiobookContext';
import { CHAPTERS, SPEEDS, fmt } from '../context/audiobookData';

export default function AudiobookPlayer() {
  const { activeChap, playing, current, duration, volume, speed,
          togglePlay, seek, changeChapter, setVolume, setSpeed } = useAudiobook();

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div className="audiobook-layout">
      {/* Lista de capítulos */}
      <div className="audiobook-chapters glass-panel">
        <div className="ebook-chapters-title">
          <Headphones size={14} /> CAPÍTULOS
        </div>
        {CHAPTERS.map((ch, i) => (
          <button key={ch.id}
            className={`ebook-chap-btn ${activeChap === i ? 'active' : ''}`}
            onClick={() => changeChapter(i)}>
            <span className="ebook-chap-num">{ch.id}</span>
            <span className="ebook-chap-label">{ch.label.replace(/^Cap \d+ — /, '')}</span>
            {activeChap === i && playing && <span className="audio-playing-dot" />}
          </button>
        ))}
      </div>

      {/* Player */}
      <div className="audiobook-player-wrap">
        <div className="glass-panel audiobook-player">
          <div className="audiobook-cover">
            <div className="audiobook-cover-icon"><Headphones size={48} /></div>
            <h2 className="audiobook-title">Domínio do Timbre</h2>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>AudioBook</p>
          </div>

          <div className="audiobook-now-playing">{CHAPTERS[activeChap].label}</div>

          {/* Progresso */}
          <div className="audiobook-progress-wrap">
            <span className="text-muted" style={{ fontSize: '0.75rem', minWidth: 36 }}>{fmt(current)}</span>
            <input type="range" min={0} max={duration || 100} step={1}
              value={current} onChange={e => seek(Number(e.target.value))}
              className="custom-slider audiobook-seek" />
            <span className="text-muted" style={{ fontSize: '0.75rem', minWidth: 36, textAlign: 'right' }}>{fmt(duration)}</span>
          </div>

          {/* Controles */}
          <div className="audiobook-controls">
            <button className="btn-icon-dark" onClick={() => changeChapter(Math.max(0, activeChap - 1))} disabled={activeChap === 0}>
              <SkipBack size={20} />
            </button>
            <button className="btn-play-circle audiobook-play-btn" onClick={togglePlay}>
              {playing
                ? <Pause fill="currentColor" size={26} />
                : <Play fill="currentColor" size={26} style={{ marginLeft: 3 }} />}
            </button>
            <button className="btn-icon-dark" onClick={() => changeChapter(Math.min(CHAPTERS.length - 1, activeChap + 1))} disabled={activeChap === CHAPTERS.length - 1}>
              <SkipForward size={20} />
            </button>
          </div>

          {/* Velocidade */}
          <div className="speed-row">
            <span className="speed-label">Velocidade</span>
            <div className="speed-btns">
              {SPEEDS.map(s => (
                <button key={s} className={`speed-btn ${speed === s ? 'active' : ''}`}
                  onClick={() => setSpeed(s)}>
                  {s === 1 ? '1x' : `${s}x`}
                </button>
              ))}
            </div>
          </div>

          {/* Volume */}
          <div className="volume-row" style={{ maxWidth: 280, margin: '1rem auto 0' }}>
            <Volume2 size={14} className="text-muted" />
            <input type="range" min={0} max={1} step={0.01} value={volume}
              onChange={e => setVolume(Number(e.target.value))}
              className="custom-slider volume-slider" />
          </div>

          {/* Barra de progresso */}
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span className="text-muted" style={{ fontSize: '0.72rem' }}>Progresso do capítulo</span>
              <span className="text-muted" style={{ fontSize: '0.72rem' }}>{Math.round(progress)}%</span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent-orange)', borderRadius: 2, transition: 'width 0.5s' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
