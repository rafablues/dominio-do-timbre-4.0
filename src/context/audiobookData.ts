export const CHAPTERS = [
  { id: 1, label: 'Cap 1 — A Ciência do Equipamento', file: '/content/audio/cap1.wav' },
  { id: 2, label: 'Cap 2 — Mapa do Tesouro',           file: '/content/audio/cap2.wav' },
  { id: 3, label: 'Cap 3 — Fletcher & Munson',         file: '/content/audio/cap3.wav' },
  { id: 4, label: 'Cap 4 — Ferramentas Digitais',      file: '/content/audio/cap4.wav' },
  { id: 5, label: 'Cap 5 — Mundo Analógico',           file: '/content/audio/cap5.wav' },
  { id: 6, label: 'Cap 6 — Arte da Mixagem',           file: '/content/audio/cap6.wav' },
  { id: 7, label: 'Cap 7 — Sobrevivendo no Palco',     file: '/content/audio/cap7.wav' },
  { id: 8, label: 'Cap 8 — Guia Prático & Conclusão',  file: '/content/audio/cap8.wav' },
];

export const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function fmt(s: number) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}
