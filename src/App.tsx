import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AudioWaveform, Activity, Ear, BookOpen, ChefHat,
  Play, Square, Volume2, VolumeX, RotateCcw, Trophy,
  ChevronRight, CheckCircle, XCircle, Waves, Zap, LogOut, Medal,
  Library, Headphones
} from 'lucide-react';
import { type User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import AuthPage from './components/AuthPage';
import EbookReader from './components/EbookReader';
import AudiobookPlayer from './components/AudiobookPlayer';
import { AudiobookProvider } from './context/AudiobookContext';
import PaymentWall from './components/PaymentWall';
import './index.css';

// ─── DATA ────────────────────────────────────────────────────────────────────

const FREQUENCY_BANDS = [
  { start: 20,   end: 150,   title: "Sub-Grave / Grave Profundo", color: "#6366f1",
    desc: "Abaixo da audição musical da guitarra. Apenas embola o P.A. Corte sempre.",
    tip: "Use um filtro High-Pass (corte de graves) em ~80Hz na maioria dos instrumentos que não são kick ou bass." },
  { start: 151,  end: 350,   title: "Lama / Caixa de Papelão",   color: "#8b5cf6",
    desc: "Som nasal, fechado e barato. Um corte sutil aqui limpa e abre a mixagem instantaneamente.",
    tip: "Um corte de -3dB a -6dB em ~250Hz em voz e guitarra faz a mix respirar." },
  { start: 351,  end: 800,   title: "Corpo / Oco",               color: "#ec4899",
    desc: "A fundação do instrumento. Adicionar muito aqui o deixa sujo; remover muito tira o peso.",
    tip: "Booste em ~500Hz para adicionar 'madeira' e corpo em instrumentos acústicos." },
  { start: 801,  end: 2000,  title: "Presença / Ataque",         color: "#f59e0b",
    desc: "Ataque de palheta ou bater do bumbo. Ganhar aqui traz a frente, cortar leva pro fundo.",
    tip: "A voz principal mora aqui. Um boost de 2-3dB em ~1kHz aumenta a inteligibilidade." },
  { start: 2001, end: 3500,  title: "A Mordida (Bite)",          color: "#ef4444",
    desc: "Agressividade do som. Faz a guitarra cortar a parede de som, mas em excesso machuca os ouvidos.",
    tip: "~3kHz é o ponto mais sensível do ouvido humano. Use com moderação (+/-2dB)." },
  { start: 3501, end: 6000,  title: "Aspereza",                  color: "#f97316",
    desc: "Se o som está 'ardido', este é o lugar para atenuar. É a região acústica mais sensível do ouvido.",
    tip: "Um de-esser age aqui para controlar sibilância vocal (4-6kHz)." },
  { start: 6001, end: 9000,  title: "Brilho / Ar",               color: "#eab308",
    desc: "Dá aquele 'ar' de estúdio caro, de som finalizado. É o cérebro das frequências altas.",
    tip: "Um shelf de +2dB acima de 8kHz é o 'segredo' de muitos mixers profissionais." },
  { start: 9001, end: 20000, title: "Chiado / Fim da Linha",     color: "#84cc16",
    desc: "Acima de 10kHz é praticamente só chiado de amplificador e pratos de bateria. Filtro Low-Pass aqui.",
    tip: "Use um Low-Pass filter em ~16kHz para limpar sem afetar o brilho percebido." },
];

const EAR_TRAINING_OPTIONS = [
  { hz: 80,    label: "Sub-Grave",      band: 0 },
  { hz: 200,   label: "Lama (Mud)",     band: 1 },
  { hz: 500,   label: "Corpo/Oco",      band: 2 },
  { hz: 1000,  label: "Presença",       band: 3 },
  { hz: 2500,  label: "Mordida (Bite)", band: 4 },
  { hz: 4000,  label: "Aspereza",       band: 5 },
  { hz: 8000,  label: "Brilho/Ar",      band: 6 },
  { hz: 10000, label: "Chiado",         band: 7 },
];

const QUIZ_QUESTIONS = [
  { q: "Qual faixa de frequência é chamada de 'Lama' e deixa o som nasal e fechado?",
    opts: ["20-150 Hz", "151-350 Hz", "801-2000 Hz", "3501-6000 Hz"], answer: 1 },
  { q: "A região mais sensível do ouvido humano está em qual faixa?",
    opts: ["200-500 Hz", "1-2 kHz", "3-6 kHz", "8-10 kHz"], answer: 2 },
  { q: "O que um boost em ~1kHz faz na voz principal?",
    opts: ["Adiciona graves", "Aumenta a inteligibilidade", "Cria mais brilho", "Remove sibilância"], answer: 1 },
  { q: "O que é um De-esser?",
    opts: ["Amplificador de graves", "Compressor de transientes", "Processador que atenua sibilância (4-6kHz)", "Filtro de frequências sub"], answer: 2 },
  { q: "Boostar ~3kHz na guitarra elétrica tem qual efeito?",
    opts: ["Adiciona corpo e peso", "Tira brilho", "Adiciona 'mordida' agressiva", "Remove lama"], answer: 2 },
  { q: "Um filtro High-Pass em ~80Hz é recomendado para:",
    opts: ["Kick drum e baixo", "A maioria dos instrumentos exceto kick e bass", "Apenas vocais", "Apenas pratos"], answer: 1 },
  { q: "O 'ar de estúdio caro' em uma mixagem vem de qual região?",
    opts: ["Sub-grave (20-150Hz)", "Lama (151-350Hz)", "Presença (801-2000Hz)", "Brilho/Ar (6-9kHz)"], answer: 3 },
  { q: "Cortar frequências em ~250Hz na guitarra e voz resulta em:",
    opts: ["Som mais brilhante", "Som mais oco", "Mix que respira melhor", "Mais graves"], answer: 2 },
  { q: "Qual waveform (forma de onda) é mais 'pura' e menos agressiva aos ouvidos?",
    opts: ["Quadrada (Square)", "Dente de Serra (Sawtooth)", "Senoidal (Sine)", "Triangular"], answer: 2 },
  { q: "O que ocorre ao boostar ~500Hz em um instrumento acústico?",
    opts: ["Perde peso", "Adiciona 'madeira' e corpo", "Fica mais brilhante", "Remove o ataque"], answer: 1 },
];

const EQ_RECIPES = [
  { name: "Voz Principal Limpa", emoji: "🎤",
    desc: "A receita clássica para uma voz clara, presente e sem chiado.",
    adjustments: [
      { band: 0, db: -12, note: "High-Pass para limpar graves desnecessários" },
      { band: 1, db: -4,  note: "Remove a 'nasalidade'" },
      { band: 3, db: +3,  note: "Presença e inteligibilidade" },
      { band: 5, db: -2,  note: "Controla sibilância ('s' e 'ch')" },
      { band: 6, db: +2,  note: "Adiciona 'ar' e profissionalismo" },
    ]},
  { name: "Guitarra Elétrica Cortante", emoji: "🎸",
    desc: "Faça a guitarra 'cortar' a mix sem machucar os ouvidos.",
    adjustments: [
      { band: 0, db: -12, note: "Corte total dos sub-graves" },
      { band: 1, db: -5,  note: "Remove lama e caixão de papelão" },
      { band: 3, db: +2,  note: "Ataque da palheta" },
      { band: 4, db: +3,  note: "Mordida que corta a mix" },
      { band: 6, db: +1,  note: "Ar e definição" },
    ]},
  { name: "Kick Drum Poderoso", emoji: "🥁",
    desc: "O bumbo que você sente no peito e ouve claramente ao mesmo tempo.",
    adjustments: [
      { band: 0, db: +4,  note: "Sub-grave corpóreo (sentido no peito)" },
      { band: 1, db: -4,  note: "Remove o 'bum' flácido" },
      { band: 2, db: -2,  note: "Reduz oco" },
      { band: 3, db: +5,  note: "Ataque do beater — o 'tum'" },
      { band: 7, db: -6,  note: "Low-Pass para limpar chiado" },
    ]},
  { name: "Baixo Elétrico Definido", emoji: "🎵",
    desc: "Baixo que é ouvido em qualquer sistema de som, até em fone pequeno.",
    adjustments: [
      { band: 0, db: +2,  note: "Fundação sub" },
      { band: 1, db: -3,  note: "Remove lama" },
      { band: 2, db: +3,  note: "Corpo do instrumento" },
      { band: 3, db: +2,  note: "Ataque das cordas" },
      { band: 5, db: -1,  note: "Suaviza aspereza das cordas" },
    ]},
  { name: "Mixagem 'Radio Ready'", emoji: "📻",
    desc: "O 'master EQ' sutil que dá aquele brilho de rádio ao projeto final.",
    adjustments: [
      { band: 0, db: -6,  note: "High-Pass no master" },
      { band: 1, db: -1,  note: "Levemente remove lama" },
      { band: 3, db: +1,  note: "Micro-boost de presença" },
      { band: 6, db: +2,  note: "Shelf de brilho e ar" },
      { band: 7, db: -3,  note: "Low-Pass nos extremos" },
    ]},
];

type WaveType = 'sine' | 'square' | 'sawtooth' | 'triangle';

// ─── AUDIO HOOK ──────────────────────────────────────────────────────────────

function useAudio() {
  const audioCtxRef  = useRef<AudioContext | null>(null);
  const oscRef       = useRef<OscillatorNode | null>(null);
  const gainRef      = useRef<GainNode | null>(null);
  const activeRef    = useRef(false);

  const init = useCallback(() => {
    if (!audioCtxRef.current)
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
  }, []);

  const play = useCallback((hz: number, waveType: WaveType = 'sine', volume = 0.5) => {
    init();
    const ctx = audioCtxRef.current!;
    if (ctx.state === 'suspended') ctx.resume();

    if (!oscRef.current) {
      oscRef.current  = ctx.createOscillator();
      gainRef.current = ctx.createGain();
      oscRef.current.type = waveType;
      oscRef.current.connect(gainRef.current);
      gainRef.current.connect(ctx.destination);
      gainRef.current.gain.setValueAtTime(0, ctx.currentTime);
      gainRef.current.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.08);
      oscRef.current.start();
    } else {
      oscRef.current.type = waveType;
      gainRef.current!.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.05);
    }

    oscRef.current.frequency.setValueAtTime(oscRef.current.frequency.value, ctx.currentTime);
    oscRef.current.frequency.exponentialRampToValueAtTime(Math.max(10, hz), ctx.currentTime + 0.05);
    activeRef.current = true;
  }, [init]);

  const stop = useCallback(() => {
    if (!gainRef.current || !oscRef.current || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    gainRef.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
    setTimeout(() => {
      oscRef.current?.stop(); oscRef.current?.disconnect();
      gainRef.current?.disconnect();
      oscRef.current = null; gainRef.current = null;
    }, 120);
    activeRef.current = false;
  }, []);

  return { play, stop };
}

// ─── APP (auth wrapper) ───────────────────────────────────────────────────────

function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (user === undefined) return null;
  if (user === null) return <AuthPage />;
  return <AppContent user={user} />;
}

// ─── APP CONTENT ──────────────────────────────────────────────────────────────

function AppContent({ user }: { user: User }) {
  const [activeTab, setActiveTab] = useState('lab');
  const { play, stop } = useAudio();

  // ── Subscription check ──
  const [subscription, setSubscription] = useState<{ status: string; expires_at: string } | null | undefined>(undefined);

  useEffect(() => {
    supabase
      .from('subscriptions')
      .select('status, expires_at')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => setSubscription(data ?? null));
  }, [user.id]);

  // ── Lab state ──
  const [labFreq, setLabFreq]       = useState(400);
  const [isPlayingLab, setPlayLab]  = useState(false);
  const [waveType, setWaveType]     = useState<WaveType>('sine');
  const [volume, setVolume]         = useState(0.5);
  const [showTip, setShowTip]       = useState(false);

  // ── Ear Training state ──
  const [trainRound, setTrainRound] = useState(1);
  const [score, setScore]           = useState(0);
  const [questionHz, setQuestionHz] = useState<number | null>(null);
  const [userGuess, setUserGuess]   = useState<number | null>(null);
  const [isPlayingTrain, setPlayTrain] = useState(false);
  const [gameOver, setGameOver]     = useState(false);
  const [bestScore, setBestScore]   = useState<number>(0);
  const [roundHistory, setRoundHistory] = useState<{hz:number, guess:number}[]>([]);

  // Carrega melhor pontuação do Supabase
  useEffect(() => {
    supabase
      .from('scores')
      .select('score')
      .eq('tipo', 'ear_training')
      .eq('user_id', user.id)
      .order('score', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) setBestScore(data[0].score);
      });
  }, [user.id]);

  // ── Quiz state ──
  const [quizIdx, setQuizIdx]       = useState(0);
  const [quizScore, setQuizScore]   = useState(0);
  const [quizAnswered, setQuizAnswered] = useState<number | null>(null);
  const [quizDone, setQuizDone]     = useState(false);
  const [quizOrder]                 = useState(() => [...QUIZ_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 8));

  // Stop audio on tab change
  useEffect(() => {
    stop(); setPlayLab(false); setPlayTrain(false);
  }, [activeTab, stop]);

  // ── Lab handlers ──
  const currentBand = FREQUENCY_BANDS.find(b => labFreq >= b.start && labFreq <= b.end) || FREQUENCY_BANDS[3];

  const toggleLab = () => {
    if (isPlayingLab) { stop(); setPlayLab(false); }
    else { play(labFreq, waveType, volume); setPlayLab(true); }
  };

  const handleSlider = (val: number) => {
    setLabFreq(val);
    if (isPlayingLab) play(val, waveType, volume);
  };

  const nudge = (delta: number) => {
    const v = Math.min(20000, Math.max(20, labFreq + delta));
    setLabFreq(v);
    if (isPlayingLab) play(v, waveType, volume);
  };

  // ── Ear Training handlers ──
  const startRound = useCallback(() => {
    const opt = EAR_TRAINING_OPTIONS[Math.floor(Math.random() * EAR_TRAINING_OPTIONS.length)];
    setQuestionHz(opt.hz); setUserGuess(null);
    play(opt.hz, 'sine', 0.5); setPlayTrain(true);
  }, [play]);

  const handleGuess = (hz: number) => {
    if (userGuess !== null || !questionHz) return;
    setUserGuess(hz); stop(); setPlayTrain(false);
    const correct = hz === questionHz;
    if (correct) setScore(s => s + 1);
    setRoundHistory(h => [...h, { hz: questionHz, guess: hz }]);
  };

  const nextRound = () => {
    if (trainRound >= 10) {
      const finalScore = score;
      supabase.from('scores').insert({
        user_id: user.id,
        tipo: 'ear_training',
        score: finalScore,
        total: 10,
      }).then(() => {
        if (finalScore > bestScore) setBestScore(finalScore);
      });
      setGameOver(true);
    } else {
      setTrainRound(r => r + 1);
      startRound();
    }
  };

  const resetTrain = () => {
    setTrainRound(1); setScore(0); setQuestionHz(null);
    setUserGuess(null); setGameOver(false); setRoundHistory([]);
  };

  // ── Quiz handlers ──
  const handleQuizAnswer = (idx: number) => {
    if (quizAnswered !== null) return;
    setQuizAnswered(idx);
    if (idx === quizOrder[quizIdx].answer) setQuizScore(s => s + 1);
  };

  const nextQuiz = () => {
    if (quizIdx >= quizOrder.length - 1) {
      supabase.from('scores').insert({
        user_id: user.id,
        tipo: 'quiz',
        score: quizScore + (quizAnswered === quizOrder[quizIdx].answer ? 1 : 0),
        total: quizOrder.length,
      });
      setQuizDone(true);
      return;
    }
    setQuizIdx(i => i + 1); setQuizAnswered(null);
  };

  const resetQuiz = () => {
    setQuizIdx(0); setQuizScore(0); setQuizAnswered(null); setQuizDone(false);
  };

  // ── Ranking state ──
  type RankEntry = { email: string; best_score: number; total: number; jogadas: number };
  const [ranking, setRanking]         = useState<RankEntry[]>([]);
  const [rankingTipo, setRankingTipo] = useState<'ear_training' | 'quiz'>('ear_training');
  const [rankingLoading, setRankingLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== 'ranking') return;
    setRankingLoading(true);
    supabase
      .from('scores')
      .select('user_id, score, total')
      .eq('tipo', rankingTipo)
      .then(async ({ data }) => {
        if (!data) { setRankingLoading(false); return; }
        // agrupa por user_id
        const map: Record<string, { scores: number[]; total: number }> = {};
        data.forEach(r => {
          if (!map[r.user_id]) map[r.user_id] = { scores: [], total: r.total };
          map[r.user_id].scores.push(r.score);
        });
        // busca emails
        const userIds = Object.keys(map);
        const { data: users } = await supabase
          .from('users')
          .select('id, email')
          .in('id', userIds);
        const emailMap: Record<string, string> = {};
        (users ?? []).forEach((u: { id: string; email: string }) => { emailMap[u.id] = u.email; });
        const entries: RankEntry[] = userIds.map(uid => ({
          email: emailMap[uid] ?? uid.slice(0, 8) + '...',
          best_score: Math.max(...map[uid].scores),
          total: map[uid].total,
          jogadas: map[uid].scores.length,
        })).sort((a, b) => b.best_score - a.best_score);
        setRanking(entries);
        setRankingLoading(false);
      });
  }, [activeTab, rankingTipo]);

  // ── Subscription gate ──
  const [contentTab, setContentTab] = useState<'ebook' | 'audiobook'>('ebook');

  if (subscription === undefined) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0A0A0C' }}>
        <div style={{ width: 40, height: 40, border: '3px solid rgba(236,154,41,0.3)', borderTopColor: '#EC9A29', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const hasAccess = subscription?.status === 'active' && new Date(subscription.expires_at) > new Date();
  if (!hasAccess) return <PaymentWall user={user} />;

  // ── Render ──

  const TAB_TITLES: Record<string, React.ReactNode> = {
    lab:      <><Activity size={16} /> Mapa do Tesouro — Frequency Lab</>,
    train:    <><Ear size={16} /> Sala de Treino de Ouvido</>,
    quiz:     <><BookOpen size={16} /> Quiz de Teoria</>,
    recipes:  <><ChefHat size={16} /> Receitas de EQ</>,
    ranking:  <><Medal size={16} /> Ranking Global</>,
    conteudo: <><Library size={16} /> Ebook & Audiobook</>,
  };

  return (
    <div className="app-container">
      <nav className="sidebar">
        <div className="brand">
          <div className="brand-icon"><AudioWaveform size={20} /></div>
          <div>
            <div className="brand-title">Domínio do Timbre</div>
            <div className="brand-subtitle">LAB V3.0 PRO</div>
          </div>
        </div>

        <ul className="nav-menu">
          <div className="nav-section-title">FERRAMENTAS DO LIVRO</div>
          {[
            { id: 'lab',      icon: <Activity size={18} />,    label: 'Mapa do Tesouro' },
            { id: 'train',    icon: <Ear size={18} />,         label: 'Treino de Ouvido' },
            { id: 'quiz',     icon: <BookOpen size={18} />,    label: 'Quiz de Teoria' },
            { id: 'recipes',  icon: <ChefHat size={18} />,     label: 'Receitas de EQ' },
            { id: 'ranking',  icon: <Medal size={18} />,       label: 'Ranking Global' },
            { id: 'conteudo', icon: <Library size={18} />,     label: 'Ebook & Audiobook' },
          ].map(({ id, icon, label }) => (
            <li key={id} className={`nav-item ${activeTab === id ? 'active' : ''}`}
                onClick={() => setActiveTab(id)}>
              {icon} {label}
            </li>
          ))}
        </ul>

        <div className="sidebar-footer">
          <div className="stat-pill"><Trophy size={14} /> Recorde: <strong>{bestScore}/10</strong></div>
          <div className="user-pill">
            <span className="user-email">{user.email}</span>
            <button className="btn-logout" onClick={() => supabase.auth.signOut()} title="Sair">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </nav>

      {/* ── BOTTOM NAV (mobile) ── */}
      <nav className="bottom-nav">
        {[
          { id: 'lab',      icon: <Activity size={20} />,   label: 'Lab' },
          { id: 'train',    icon: <Ear size={20} />,        label: 'Treino' },
          { id: 'quiz',     icon: <BookOpen size={20} />,   label: 'Quiz' },
          { id: 'conteudo', icon: <Library size={20} />,    label: 'Conteúdo' },
          { id: 'ranking',  icon: <Medal size={20} />,      label: 'Ranking' },
        ].map(({ id, icon, label }) => (
          <button key={id} className={`bottom-nav-item ${activeTab === id ? 'active' : ''}`}
              onClick={() => setActiveTab(id)}>
            {icon}
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <main className="main-content">
        <div className="topbar-simple">
          <strong className="topbar-title">{TAB_TITLES[activeTab]}</strong>
          <button className="btn-logout mobile-logout" onClick={() => supabase.auth.signOut()} title="Sair">
            <LogOut size={16} />
          </button>
        </div>

        <div className="page-container">

          {/* ── MAPA DO TESOURO ── */}
          {activeTab === 'lab' && (
            <div className="lab-layout">
              <div className="glass-panel lab-main text-center">
                {/* Frequency Display */}
                <div className="freq-display">
                  <div className="huge-hz" style={{ color: currentBand.color }}>
                    {labFreq < 1000 ? labFreq : (labFreq / 1000).toFixed(1) + 'k'}
                    <span className="hz-suffix"> Hz</span>
                  </div>
                  <div className="band-tag" style={{ background: currentBand.color + '22', borderColor: currentBand.color + '55', color: currentBand.color }}>
                    {currentBand.title}
                  </div>
                </div>

                {/* Waveform Selector */}
                <div className="wave-selector">
                  {(['sine','triangle','sawtooth','square'] as WaveType[]).map(w => (
                    <button key={w} className={`btn-wave ${waveType === w ? 'active' : ''}`}
                            onClick={() => { setWaveType(w); if (isPlayingLab) play(labFreq, w, volume); }}>
                      <Waves size={12} /> {w === 'sine' ? 'Senoidal' : w === 'triangle' ? 'Triangular' : w === 'sawtooth' ? 'Serra' : 'Quadrada'}
                    </button>
                  ))}
                </div>

                {/* Play Button */}
                <button className={`btn-play-circle ${isPlayingLab ? 'playing-glow' : ''}`} onClick={toggleLab}>
                  {isPlayingLab ? <Square fill="currentColor" size={24} /> : <Play fill="currentColor" size={28} style={{ marginLeft: 4 }} />}
                </button>

                {/* Frequency Slider */}
                <div className="frequency-slider-container">
                  <button className="btn-icon-dark" onClick={() => nudge(-10)}>−</button>
                  <div className="slider-wrap">
                    <input type="range" min="20" max="20000" step="10"
                           value={labFreq} onChange={e => handleSlider(Number(e.target.value))}
                           className="custom-slider" />
                    <div className="band-strip">
                      {FREQUENCY_BANDS.map((b, i) => (
                        <div key={i} className="band-strip-seg"
                             style={{ background: b.color, opacity: currentBand === b ? 1 : 0.3 }}
                             title={b.title} />
                      ))}
                    </div>
                  </div>
                  <button className="btn-icon-dark" onClick={() => nudge(+10)}>+</button>
                </div>

                {/* Volume */}
                <div className="volume-row">
                  <VolumeX size={14} className="text-muted" />
                  <input type="range" min="0" max="1" step="0.01" value={volume}
                         onChange={e => { const v = Number(e.target.value); setVolume(v); if (isPlayingLab) play(labFreq, waveType, v); }}
                         className="custom-slider volume-slider" />
                  <Volume2 size={14} className="text-muted" />
                </div>
              </div>

              {/* Info Panel */}
              <div className="lab-side">
                <div className="glass-panel band-info-panel">
                  <h3 style={{ color: currentBand.color, marginBottom: '0.75rem' }}>{currentBand.title}</h3>
                  <p className="text-muted" style={{ lineHeight: 1.7, marginBottom: '1rem' }}>{currentBand.desc}</p>
                  <button className="btn-tip-toggle" onClick={() => setShowTip(t => !t)}>
                    <Zap size={14} /> {showTip ? 'Ocultar Dica Pro' : 'Ver Dica Pro'}
                  </button>
                  {showTip && (
                    <div className="tip-box" style={{ borderColor: currentBand.color + '66' }}>
                      💡 {currentBand.tip}
                    </div>
                  )}
                </div>

                <div className="glass-panel band-list-panel">
                  <div className="band-list-title text-muted">TODAS AS FAIXAS</div>
                  {FREQUENCY_BANDS.map((b, i) => (
                    <button key={i} className={`band-list-item ${currentBand === b ? 'active' : ''}`}
                            onClick={() => handleSlider(Math.round((b.start + b.end) / 2))}>
                      <span className="band-dot" style={{ background: b.color }} />
                      <span className="band-list-name">{b.title}</span>
                      <span className="band-list-range text-muted">{b.start < 1000 ? b.start : (b.start/1000)+'k'}–{b.end < 1000 ? b.end : (b.end/1000)+'k'} Hz</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── TREINO DE OUVIDO ── */}
          {activeTab === 'train' && (
            <div>
              {gameOver ? (
                <div className="glass-panel text-center gameover-panel">
                  <Trophy size={64} color="var(--accent-orange)" style={{ margin: '0 auto 1rem' }} />
                  <h2 className="text-orange" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Fase Completa!</h2>
                  <div className="score-big">{score}<span style={{ fontSize: '2rem', color: 'var(--text-secondary)' }}>/10</span></div>
                  {score > bestScore - 1 && score === bestScore && score > 0 && (
                    <div className="new-record">🏆 Novo Recorde!</div>
                  )}
                  <p className="text-muted" style={{ marginBottom: '2rem' }}>
                    {score >= 8 ? 'Ouvido de ouro! Você tem talento natural.' :
                     score >= 5 ? 'Bom resultado! Continue praticando.' :
                     'Continue treinando — o ouvido melhora com a prática!'}
                  </p>

                  <div className="history-grid">
                    {roundHistory.map((r, i) => {
                      const correct = r.hz === r.guess;
                      const opt = EAR_TRAINING_OPTIONS.find(o => o.hz === r.hz);
                      return (
                        <div key={i} className={`history-item ${correct ? 'correct' : 'wrong'}`}>
                          {correct ? <CheckCircle size={14} /> : <XCircle size={14} />}
                          {opt?.label} ({r.hz}Hz)
                        </div>
                      );
                    })}
                  </div>

                  <button className="btn-play-rect mt-2" onClick={resetTrain}>
                    <RotateCcw size={16} /> Jogar Novamente
                  </button>
                </div>
              ) : (
                <>
                  <div className="train-header">
                    <div className="round-badge">QUESTÃO {trainRound}/10</div>
                    <div className="score-badge"><span className="text-orange">{score}</span> ACERTOS</div>
                  </div>

                  <div className="glass-panel text-center" style={{ marginBottom: '1.5rem' }}>
                    <h2 style={{ marginBottom: '1rem' }}>
                      {!questionHz ? 'Clique em Ouvir para começar' :
                       isPlayingTrain ? '🎵 Ouvindo...' : 'Qual frequência você ouviu?'}
                    </h2>
                    <button
                      className="btn-play-rect"
                      style={{ background: isPlayingTrain ? 'var(--accent-orange)' : 'var(--bg-panel-dark)', color: isPlayingTrain ? 'var(--bg-dark)' : 'var(--text-primary)' }}
                      onClick={() => {
                        if (isPlayingTrain) { stop(); setPlayTrain(false); }
                        else if (questionHz) { play(questionHz, 'sine', 0.5); setPlayTrain(true); }
                        else { startRound(); }
                      }}
                    >
                      {isPlayingTrain ? <><Square fill="currentColor" size={16} /> Parar</> : <><Volume2 size={16} /> Ouvir Frequência</>}
                    </button>
                  </div>

                  <div className="answers-grid">
                    {EAR_TRAINING_OPTIONS.map((opt) => {
                      let cls = 'btn-answer';
                      if (userGuess !== null) {
                        if (opt.hz === questionHz) cls += ' correct';
                        else if (opt.hz === userGuess) cls += ' wrong';
                      }
                      return (
                        <button key={opt.hz} className={cls}
                                onClick={() => questionHz && handleGuess(opt.hz)}
                                disabled={!questionHz || userGuess !== null}>
                          <strong>{opt.label}</strong>
                          <span>{opt.hz} Hz</span>
                        </button>
                      );
                    })}
                  </div>

                  {userGuess !== null && (
                    <div className="text-center mt-2">
                      <h3 className={userGuess === questionHz ? 'text-orange' : 'text-muted'} style={{ marginBottom: '0.5rem' }}>
                        {userGuess === questionHz
                          ? `✅ Correto! Era ${questionHz}Hz`
                          : `❌ Era ${questionHz}Hz — ${EAR_TRAINING_OPTIONS.find(o => o.hz === questionHz)?.label}`}
                      </h3>
                      <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                        {FREQUENCY_BANDS[EAR_TRAINING_OPTIONS.find(o => o.hz === questionHz)!.band].tip}
                      </p>
                      <button className="btn-play-rect" onClick={nextRound}>
                        {trainRound >= 10 ? 'Ver Resultado' : 'Próxima'} <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── QUIZ ── */}
          {activeTab === 'quiz' && (
            <div>
              {quizDone ? (
                <div className="glass-panel text-center gameover-panel">
                  <BookOpen size={56} color="var(--accent-orange)" style={{ margin: '0 auto 1rem' }} />
                  <h2 className="text-orange" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Quiz Completo!</h2>
                  <div className="score-big">{quizScore}<span style={{ fontSize: '2rem', color: 'var(--text-secondary)' }}>/{quizOrder.length}</span></div>
                  <p className="text-muted" style={{ marginBottom: '2rem' }}>
                    {quizScore >= quizOrder.length * 0.8 ? '🎓 Você domina a teoria do timbre!' :
                     quizScore >= quizOrder.length * 0.5 ? '📖 Bom resultado! Revise o livro para melhorar.' :
                     '📚 Releia os capítulos e tente novamente.'}
                  </p>
                  <button className="btn-play-rect" onClick={resetQuiz}>
                    <RotateCcw size={16} /> Refazer Quiz
                  </button>
                </div>
              ) : (
                <div className="glass-panel">
                  <div className="quiz-progress-bar">
                    <div className="quiz-progress-fill" style={{ width: `${((quizIdx) / quizOrder.length) * 100}%` }} />
                  </div>
                  <div className="quiz-meta text-muted">Pergunta {quizIdx + 1} de {quizOrder.length} · {quizScore} acertos</div>
                  <h2 className="quiz-question">{quizOrder[quizIdx].q}</h2>
                  <div className="quiz-options">
                    {quizOrder[quizIdx].opts.map((opt, i) => {
                      let cls = 'quiz-option';
                      if (quizAnswered !== null) {
                        if (i === quizOrder[quizIdx].answer) cls += ' correct';
                        else if (i === quizAnswered) cls += ' wrong';
                      }
                      return (
                        <button key={i} className={cls} onClick={() => handleQuizAnswer(i)}
                                disabled={quizAnswered !== null}>
                          <span className="quiz-option-letter">{String.fromCharCode(65 + i)}</span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {quizAnswered !== null && (
                    <div className="text-center mt-2">
                      <p className="text-muted" style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                        {quizAnswered === quizOrder[quizIdx].answer ? '✅ Correto!' : `❌ A resposta era: ${quizOrder[quizIdx].opts[quizOrder[quizIdx].answer]}`}
                      </p>
                      <button className="btn-play-rect" onClick={nextQuiz}>
                        {quizIdx >= quizOrder.length - 1 ? 'Ver Resultado' : 'Próxima'} <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── RECEITAS DE EQ ── */}
          {activeTab === 'recipes' && (
            <div className="recipes-grid">
              {EQ_RECIPES.map((recipe, ri) => (
                <div key={ri} className="glass-panel recipe-card">
                  <div className="recipe-header">
                    <span className="recipe-emoji">{recipe.emoji}</span>
                    <div>
                      <h3>{recipe.name}</h3>
                      <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>{recipe.desc}</p>
                    </div>
                  </div>

                  {/* EQ Visual */}
                  <div className="eq-visual">
                    {FREQUENCY_BANDS.map((band, bi) => {
                      const adj = recipe.adjustments.find(a => a.band === bi);
                      const db  = adj ? adj.db : 0;
                      return (
                        <div key={bi} className="eq-band-col" title={`${band.title}: ${db > 0 ? '+' : ''}${db}dB`}>
                          <div className="eq-bar-wrap">
                            <div className="eq-bar-fill"
                                 style={{
                                   height: `${Math.abs(db) / 12 * 100}%`,
                                   bottom: db >= 0 ? '50%' : 'auto',
                                   top: db < 0 ? '50%' : 'auto',
                                   background: db >= 0 ? band.color : band.color + '88',
                                 }} />
                            <div className="eq-bar-center" />
                          </div>
                          <span className="eq-bar-label">{bi < 4 ? Math.round((band.start + band.end)/2) < 1000 ? Math.round((band.start+band.end)/2) : ((band.start+band.end)/2000).toFixed(1)+'k' : ((band.start+band.end)/2000).toFixed(1)+'k'}</span>
                          {adj && <span className="eq-db-tag" style={{ color: db >= 0 ? band.color : '#ef4444' }}>{db > 0 ? '+' : ''}{db}</span>}
                        </div>
                      );
                    })}
                  </div>

                  {/* Adjustments List */}
                  <div className="recipe-adjustments">
                    {recipe.adjustments.map((adj, ai) => (
                      <div key={ai} className="recipe-adj-row">
                        <span className="adj-dot" style={{ background: FREQUENCY_BANDS[adj.band].color }} />
                        <span className="adj-db" style={{ color: adj.db >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                          {adj.db > 0 ? '+' : ''}{adj.db}dB
                        </span>
                        <span className="adj-note text-muted">{adj.note}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── CONTEÚDO ── */}
          {activeTab === 'conteudo' && (
            <AudiobookProvider>
              <div>
                <div className="content-tabs glass-panel" style={{ marginBottom: '1.5rem' }}>
                  <button className={`content-tab-btn ${contentTab === 'ebook' ? 'active' : ''}`} onClick={() => setContentTab('ebook')}>
                    <BookOpen size={22} />
                    <span>Ebook</span>
                  </button>
                  <button className={`content-tab-btn ${contentTab === 'audiobook' ? 'active' : ''}`} onClick={() => setContentTab('audiobook')}>
                    <Headphones size={22} />
                    <span>Audiobook</span>
                  </button>
                </div>
                {contentTab === 'ebook'     && <EbookReader />}
                {contentTab === 'audiobook' && <AudiobookPlayer />}
              </div>
            </AudiobookProvider>
          )}

          {/* ── RANKING ── */}
          {activeTab === 'ranking' && (
            <div>
              <div className="glass-panel" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {(['ear_training', 'quiz'] as const).map(t => (
                    <button key={t} onClick={() => setRankingTipo(t)}
                      className={`btn-wave ${rankingTipo === t ? 'active' : ''}`}>
                      {t === 'ear_training' ? <><Ear size={13} /> Treino de Ouvido</> : <><BookOpen size={13} /> Quiz</>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="glass-panel">
                {rankingLoading ? (
                  <p className="text-muted text-center" style={{ padding: '2rem' }}>Carregando...</p>
                ) : ranking.length === 0 ? (
                  <p className="text-muted text-center" style={{ padding: '2rem' }}>Nenhum score ainda.</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <th style={thStyle}>#</th>
                        <th style={thStyle}>Jogador</th>
                        <th style={thStyle}>Melhor</th>
                        <th style={thStyle}>Jogadas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranking.map((r, i) => {
                        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`;
                        const isMe = r.email === user.email;
                        return (
                          <tr key={i} style={{
                            borderBottom: '1px solid var(--border-color)',
                            background: isMe ? 'rgba(236,154,41,0.06)' : 'transparent',
                          }}>
                            <td style={tdStyle}><span style={{ fontSize: '1.1rem' }}>{medal}</span></td>
                            <td style={tdStyle}>
                              <span style={{ color: isMe ? 'var(--accent-orange)' : 'var(--text-primary)', fontWeight: isMe ? 700 : 400 }}>
                                {r.email}
                              </span>
                              {isMe && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: 'var(--accent-orange)' }}>você</span>}
                            </td>
                            <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--accent-orange)' }}>
                              {r.best_score}/{r.total}
                            </td>
                            <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{r.jogadas}x</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '0.75rem 1rem',
  fontSize: '0.75rem', color: 'var(--text-secondary)',
  fontWeight: 700, letterSpacing: '0.06em',
};
const tdStyle: React.CSSProperties = {
  padding: '0.85rem 1rem', fontSize: '0.9rem',
};

export default App;

