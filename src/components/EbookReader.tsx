import { useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { BookOpen, ZoomIn, ZoomOut, Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { useAudiobook } from '../context/AudiobookContext';
import { CHAPTERS, SPEEDS, fmt } from '../context/audiobookData';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const PDF_CHAPTERS = [
  { id: 0, label: 'Sumário & Introdução',              file: '/content/pdfs/cap00.pdf' },
  { id: 1, label: 'Cap 1 — A Ciência do Equipamento', file: '/content/pdfs/cap01.pdf' },
  { id: 2, label: 'Cap 2 — Mapa do Tesouro',           file: '/content/pdfs/cap02.pdf' },
  { id: 3, label: 'Cap 3 — Fletcher & Munson',         file: '/content/pdfs/cap03.pdf' },
  { id: 4, label: 'Cap 4 — Ferramentas Digitais',      file: '/content/pdfs/cap04.pdf' },
  { id: 5, label: 'Cap 5 — Mundo Analógico',           file: '/content/pdfs/cap05.pdf' },
  { id: 6, label: 'Cap 6 — Arte da Mixagem',           file: '/content/pdfs/cap06.pdf' },
  { id: 7, label: 'Cap 7 — Sobrevivendo no Palco',     file: '/content/pdfs/cap07.pdf' },
  { id: 8, label: 'Cap 8 — Guia Prático & Conclusão',  file: '/content/pdfs/cap08.pdf' },
];

export default function EbookReader() {
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale]       = useState(1.0);
  const [loading, setLoading]   = useState(true);

  const audio = useAudiobook();
  const activeChap = audio.ebookChap;

  const onDocLoad = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages); setLoading(false);
  }, []);

  const changeChapter = (idx: number) => {
    audio.changeEbookChap(idx);
    setNumPages(0); setLoading(true);
  };

  const progress = audio.duration > 0 ? (audio.current / audio.duration) * 100 : 0;

  return (
    <div className="ebook-layout">
      {/* Sidebar de capítulos */}
      <div className="ebook-chapters glass-panel">
        <div className="ebook-chapters-title"><BookOpen size={14} /> CAPÍTULOS</div>
        {PDF_CHAPTERS.map((ch, i) => (
          <button key={ch.id}
            className={`ebook-chap-btn ${activeChap === i ? 'active' : ''}`}
            onClick={() => changeChapter(i)}>
            <span className="ebook-chap-num">{ch.id}</span>
            <span className="ebook-chap-label">{ch.label.replace(/^Cap \d+ — /, '')}</span>
          </button>
        ))}
      </div>

      {/* Leitor */}
      <div className="ebook-viewer">
        {/* Toolbar do PDF */}
        <div className="ebook-toolbar glass-panel">
          <span className="ebook-chap-current">{PDF_CHAPTERS[activeChap].label}</span>
          <div className="ebook-controls">
            <button className="btn-icon-dark" onClick={() => setScale(s => Math.max(0.5, s - 0.1))}><ZoomOut size={16} /></button>
            <span className="text-muted" style={{ fontSize: '0.8rem', minWidth: 40, textAlign: 'center' }}>{Math.round(scale * 100)}%</span>
            <button className="btn-icon-dark" onClick={() => setScale(s => Math.min(2, s + 0.1))}><ZoomIn size={16} /></button>
          </div>
          {!loading && <span className="text-muted" style={{ fontSize: '0.78rem' }}>{numPages} páginas</span>}
        </div>

        {/* Mini player do audiobook */}
        <div className="mini-player glass-panel">
          <div className="mini-player-info">
            <div className="mini-player-title">🎧 {CHAPTERS[audio.activeChap].label}</div>
            <div className="mini-player-time">{fmt(audio.current)} / {fmt(audio.duration)}</div>
          </div>
          <div className="mini-player-bar">
            <input type="range" min={0} max={audio.duration || 100} step={1}
              value={audio.current} onChange={e => audio.seek(Number(e.target.value))}
              className="custom-slider" style={{ flex: 1 }} />
          </div>
          <div className="mini-player-controls">
            <button className="btn-icon-dark mini-ctrl" onClick={() => audio.changeChapter(Math.max(0, audio.activeChap - 1))} disabled={audio.activeChap === 0}>
              <SkipBack size={14} />
            </button>
            <button className="mini-play-btn" onClick={audio.togglePlay}>
              {audio.playing ? <Pause fill="currentColor" size={16} /> : <Play fill="currentColor" size={16} style={{ marginLeft: 2 }} />}
            </button>
            <button className="btn-icon-dark mini-ctrl" onClick={() => audio.changeChapter(Math.min(CHAPTERS.length - 1, audio.activeChap + 1))} disabled={audio.activeChap === CHAPTERS.length - 1}>
              <SkipForward size={14} />
            </button>
            <div className="mini-speed-btns">
              {SPEEDS.map(s => (
                <button key={s} className={`speed-btn ${audio.speed === s ? 'active' : ''}`}
                  onClick={() => audio.setSpeed(s)}>{s}x</button>
              ))}
            </div>
          </div>
          {/* Progresso visual */}
          <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', marginTop: '0.5rem' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent-orange)', transition: 'width 0.5s' }} />
          </div>
        </div>

        {/* Páginas do PDF — scroll contínuo */}
        <div className="ebook-page-wrap">
          <Document file={PDF_CHAPTERS[activeChap].file} onLoadSuccess={onDocLoad}
            loading={<div className="ebook-loading">Carregando capítulo...</div>}>
            {Array.from({ length: numPages }, (_, i) => (
              <div key={i} className="ebook-page-item">
                <Page pageNumber={i + 1} scale={scale}
                  renderTextLayer={true} renderAnnotationLayer={false} />
              </div>
            ))}
          </Document>
        </div>
      </div>
    </div>
  );
}
