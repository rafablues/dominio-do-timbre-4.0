import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';

// ─── AUDIO ENGINE ────────────────────────────────────────────────────────────

let _audioCtx: AudioContext | null = null;
const getAudioCtx = () => {
    if (!_audioCtx) {
        const C = window.AudioContext || (window as any).webkitAudioContext;
        if (C) _audioCtx = new C();
    }
    return _audioCtx;
};

type WaveType = 'sine' | 'triangle' | 'sawtooth' | 'square';

const playToneOnce = (hz: number, duration = 1.2) => {
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(hz, ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.08);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + duration + 0.05);
};

// ─── DATA: Frequency Ranges ──────────────────────────────────────────────────

const getFrequencyTip = (hz: number) => {
    if (hz < 60)   return { title: "Sub-Grave (Sentido)", desc: "Abaixo da audição musical da guitarra. Apenas embola o PA. Corte sempre.", pro: "Use um filtro High-Pass em 80Hz em praticamente todos os instrumentos que não sejam kick ou bass." };
    if (hz < 150)  return { title: "A Carne / Fundamental", desc: "O peso da nota (100Hz). Essencial para bases, mas perigoso em excesso.", pro: "Em solos, um corte em 100Hz libera espaço pro bumbo entrar com mais autoridade." };
    if (hz < 300)  return { title: "O Ronco (Rumble)", desc: "Região de conflito com o baixo. Em solos rápidos, cortar até 200Hz limpa a execução.", pro: "Cortar em 200Hz em solos rápidos remove o 'ronco' que embola com o bumbo duplo." };
    if (hz < 600)  return { title: "Papelão / Lama (Mud)", desc: "Som nasal, fechado e barato. Um corte sutil aqui (400Hz) abre a mixagem.", pro: "Um corte de -3dB a -5dB em ~300-400Hz faz a mix 'respirar' instantaneamente." };
    if (hz < 900)  return { title: "Médios Honk (Tube Screamer)", desc: "720Hz vive aqui. É o som clássico de 'rádio' ou pedal de overdrive verde.", pro: "Booste 720Hz para imitar o som do Tube Screamer. Corte aqui para som mais 'moderno'." };
    if (hz < 2000) return { title: "A Cara / Ataque", desc: "1kHz - 1.5kHz. Traz o instrumento para a frente da caixa de som.", pro: "Um boost de +2dB em 1kHz é suficiente para trazer a guitarra à frente na mixagem." };
    if (hz < 3500) return { title: "A Mordida (Bite)", desc: "2.5kHz é a agressividade do Rock. Faz a guitarra cortar a parede de som.", pro: "No metal moderno, um boost de 2.5kHz combinado com corte em 800Hz cria o 'punch' do djent." };
    if (hz < 5000) return { title: "Aspereza (Nasty)", desc: "4kHz causa dor e fadiga auditiva. Geralmente precisa de um corte (Notch).", pro: "Um corte de -4dB em 4kHz em solos high-gain pode salvar o ouvido do público." };
    if (hz < 10000)return { title: "Brilho / Presença", desc: "8kHz dá o 'ar' de estúdio caro. Acima de 10kHz é apenas chiado.", pro: "Um shelf de +2dB acima de 8kHz é o 'segredo sujo' de muitos engenheiros de mixagem famosos." };
    return { title: "Fizz Digital", desc: "Agudos extremos inúteis para guitarra. Use Low Pass para cortar.", pro: "Aplique um Low-Pass filter em 12-16kHz para eliminar o fizz sem afetar o brilho percebido." };
};

// ─── DATA: Ear Trainer ───────────────────────────────────────────────────────

const TRAINER_DATA = [
    { hz: 80,    label: "Sub-Grave",      desc: "Peso e Pressão" },
    { hz: 200,   label: "Lama (Mud)",     desc: "Embola a mix" },
    { hz: 500,   label: "Corpo/Oco",      desc: "Equilíbrio do timbre" },
    { hz: 1000,  label: "Presença",       desc: "A 'Cara' do som" },
    { hz: 2500,  label: "Mordida (Bite)", desc: "Agressividade" },
    { hz: 4000,  label: "Aspereza",       desc: "Cansa o ouvido" },
    { hz: 8000,  label: "Brilho/Ar",      desc: "Definição e Espaço" },
    { hz: 10000, label: "Chiado",         desc: "Sujeira/Fizz" },
];

// ─── DATA: Recipes ───────────────────────────────────────────────────────────

const EQ_RECIPES = [
    {
        id: 1, name: "Solo Limpo (Pop/Worship)", type: "Guitarra • Lead", emoji: "✨",
        desc: "Compensa a falta de compressão natural empurrando frequências frontais.",
        curve: { hp: 100, lp: 12000, boosts: [{ f: 1000, g: 5 }, { f: 8000, g: 3 }], cuts: [] },
        steps: [
            { freq: "100-120 Hz", action: "High Pass", type: "cut", hz: 110,  reason: "Limpa a sujeira grave, mantendo o corpo." },
            { freq: "1 kHz",      action: "Boost Largo (+4dB)", type: "boost", hz: 1000, reason: "Traz a guitarra para a frente da mix." },
            { freq: "8 kHz",      action: "Boost Suave (+2dB)", type: "boost", hz: 8000, reason: "Adiciona 'Ar' e brilho de estúdio." },
        ]
    },
    {
        id: 2, name: "Solo High Gain (Shred)", type: "Guitarra • Distortion", emoji: "🔥",
        desc: "Foco em subtração. Remove o que sobra para ganhar definição na velocidade.",
        curve: { hp: 200, lp: 10000, boosts: [{ f: 2500, g: 3 }], cuts: [{ f: 4000, g: -4 }] },
        steps: [
            { freq: "200 Hz",  action: "High Pass Agressivo", type: "cut",   hz: 200,  reason: "Remove o 'ronco' que embola com o bumbo duplo." },
            { freq: "2.5 kHz", action: "Boost Sutil (+2dB)",  type: "boost", hz: 2500, reason: "Adiciona a 'mordida' para cortar a distorção." },
            { freq: "4 kHz",   action: "Corte Notch (-4dB)",  type: "cut",   hz: 4000, reason: "Remove a frequência estridente que cansa o ouvido." },
            { freq: "10 kHz",  action: "Low Pass",             type: "cut",   hz: 10000,reason: "Remove o 'fizz' digital e chiado." },
        ]
    },
    {
        id: 3, name: "Base Rock (Crunch/Classic)", type: "Guitarra • Base", emoji: "🎸",
        desc: "Timbre clássico de Rock, focado nos médios para preencher o espaço.",
        curve: { hp: 100, lp: 12000, boosts: [{ f: 720, g: 4 }], cuts: [{ f: 300, g: -2 }] },
        steps: [
            { freq: "100 Hz", action: "High Pass",    type: "cut",   hz: 100, reason: "Mantém o peso fundamental." },
            { freq: "300 Hz", action: "Corte Leve",   type: "cut",   hz: 300, reason: "Limpa um pouco da 'lama' da Gibson/Humbucker." },
            { freq: "720 Hz", action: "Boost (+4dB)", type: "boost", hz: 720, reason: "Região do Tube Screamer. Dá o 'honk' clássico de rock." },
        ]
    },
    {
        id: 4, name: "Base Metal (Modern)", type: "Guitarra • Base", emoji: "🤘",
        desc: "Timbre moderno 'Scooped' (cavado), mas com controle para não sumir.",
        curve: { hp: 80, lp: 11000, boosts: [{ f: 6000, g: 3 }, { f: 100, g: 2 }], cuts: [{ f: 800, g: -4 }] },
        steps: [
            { freq: "80 Hz",  action: "High Pass",    type: "cut",   hz: 80,   reason: "Corte mais baixo para permitir o 'chug' da 7ª corda." },
            { freq: "800 Hz", action: "Corte Largo",  type: "cut",   hz: 800,  reason: "Remove o som de 'rádio' para deixar o som mais agressivo." },
            { freq: "6 kHz",  action: "Boost",        type: "boost", hz: 6000, reason: "Aumenta a presença da palhetada no high gain." },
        ]
    },
    {
        id: 5, name: "Ambient Clean (Post-Rock)", type: "Guitarra • Textura", emoji: "🌊",
        desc: "Timbre etéreo para muito Reverb/Delay. Foco em não embolar.",
        curve: { hp: 200, lp: 6000, boosts: [{ f: 400, g: 3 }], cuts: [{ f: 2000, g: -2 }] },
        steps: [
            { freq: "200 Hz", action: "High Pass Alto", type: "cut",   hz: 200,  reason: "O Reverb vai adicionar grave artificial, então corte a fonte." },
            { freq: "400 Hz", action: "Boost Quente",   type: "boost", hz: 400,  reason: "Dá calor e corpo para notas longas." },
            { freq: "6 kHz",  action: "Low Pass",        type: "cut",   hz: 6000, reason: "Deixa o timbre mais escuro e cinemático." },
        ]
    },
    {
        id: 6, name: "Violão de Aço (Strumming)", type: "Acústico • Base", emoji: "🎵",
        desc: "Remove o som de 'caixa' e acentua o brilho das cordas novas.",
        curve: { hp: 80, lp: 15000, boosts: [{ f: 10000, g: 4 }], cuts: [{ f: 350, g: -5 }] },
        steps: [
            { freq: "80 Hz",  action: "High Pass",          type: "cut",   hz: 80,    reason: "Evita o 'boom' excessivo ao bater na corda solta." },
            { freq: "350 Hz", action: "Corte Profundo",      type: "cut",   hz: 350,   reason: "Remove o som de 'caixa de papelão' típico de captação piezo." },
            { freq: "10 kHz", action: "High Shelf (+4dB)",   type: "boost", hz: 10000, reason: "Traz o 'ar' e o brilho metálico das cordas de aço." },
        ]
    },
    {
        id: 7, name: "Djent / 8-Cordas", type: "Guitarra • Extreme", emoji: "⚡",
        desc: "Controle total de graves para afinações muito baixas (Drop E/F#).",
        curve: { hp: 60, lp: 11000, boosts: [{ f: 1400, g: 4 }], cuts: [{ f: 500, g: -3 }] },
        steps: [
            { freq: "60-80 Hz", action: "High Pass",           type: "cut",   hz: 70,   reason: "Limpa a região do sub-grave para o baixo brilhar." },
            { freq: "500 Hz",   action: "Corte",                type: "cut",   hz: 500,  reason: "Remove a 'lama' que tira a definição das cordas graves." },
            { freq: "1.4 kHz",  action: "Boost Agressivo",      type: "boost", hz: 1400, reason: "Acentua o ataque da palhetada (o som 'djent')." },
        ]
    },
    {
        id: 8, name: "Lead Fuzz (Classic/Stoner)", type: "Guitarra • Lead", emoji: "🎛️",
        desc: "Faz o Fuzz cortar a mix sem soar 'abelhudo' ou magro.",
        curve: { hp: 150, lp: 8000, boosts: [{ f: 900, g: 4 }], cuts: [{ f: 4000, g: -3 }] },
        steps: [
            { freq: "900 Hz", action: "Boost Médio",   type: "boost", hz: 900,  reason: "Compensa o 'scoop' natural de pedais Big Muff." },
            { freq: "4 kHz",  action: "Corte Suave",   type: "cut",   hz: 4000, reason: "Doma a estridência desagradável do fuzz." },
            { freq: "8 kHz",  action: "Low Pass",       type: "cut",   hz: 8000, reason: "Remove o chiado (fizz) que não é musical." },
        ]
    }
];

// ─── DATA: Quiz ───────────────────────────────────────────────────────────────

const generateQuizData = () => {
    const base = [
        { q: "Qual o principal erro ao equalizar um solo High Gain?", options: ["Aumentar graves", "Aumentar ganho", "Adicionar agudos em 4kHz", "Cortar médios"], ans: 2, explain: "4kHz é a região da aspereza/fadiga. Adicionar ganho ali torna o som insuportável." },
        { q: "Para onde deve ir o 'High Pass' em um solo rápido para limpar a mix?", options: ["80Hz", "Até 200Hz", "500Hz", "Não usar"], ans: 1, explain: "Cortar até 200Hz remove o 'ronco' (rumble) desnecessário que embola com o bumbo em passagens rápidas." },
        { q: "O que significa 'Pocketing' na mixagem?", options: ["Guardar o pedal no bolso", "Escavar uma frequência na base para o solo caber", "Aumentar o volume da base", "Usar delay"], ans: 1, explain: "Pocketing é criar espaço subtraindo frequências de instrumentos concorrentes, não aumentando volume." },
        { q: "Qual frequência é conhecida como 'Voz do Tube Screamer'?", options: ["100Hz", "400Hz", "720Hz", "1kHz"], ans: 2, explain: "Pedais verdes têm um pico médio característico em 720Hz que ajuda a cortar o mix." },
        { q: "Se o som está 'anasalado' ou parecendo 'caixa de papelão', onde cortar?", options: ["100Hz", "400Hz", "2.5kHz", "8kHz"], ans: 1, explain: "A região de 300-500Hz contém a 'lama' ou som de caixa." },
        { q: "O que fazer com frequências acima de 10kHz em modeladores digitais?", options: ["Boostar", "Ignorar", "Cortar (Low Pass)", "Saturar"], ans: 2, explain: "Acima de 10kHz geralmente existe apenas 'fizz' digital indesejado que soa artificial." },
        { q: "Qual pedal foca em 1kHz para dar clareza?", options: ["Tube Screamer", "Big Muff", "Klon Centaur", "Fuzz Face"], ans: 2, explain: "O Klon foca em 1kHz, trazendo o som 'pra frente' de forma transparente." },
        { q: "Para dar 'Ar' ou brilho de estúdio sem ferir o ouvido, qual frequência boostar?", options: ["2kHz", "4kHz", "8kHz", "15kHz"], ans: 2, explain: "8kHz adiciona clareza e sofisticação sem a aspereza dos 4kHz." },
        { q: "Em um Hybrid Rig, onde vai o EQ corretor de sala?", options: ["Antes do drive", "No final da cadeia", "Antes do amp", "Na guitarra"], ans: 1, explain: "O EQ corretor deve ser a última coisa antes da mesa de som para moldar o som final." },
        { q: "O que acontece se cortarmos demais os 100Hz da guitarra?", options: ["Fica mais definida", "Perde o peso/fundamental", "Ganha brilho", "Satura mais"], ans: 1, explain: "100Hz é a fundamental. Cortar demais deixa o som magro e sem autoridade." },
        { q: "O que é equalização subtrativa?", options: ["Adicionar frequências para enriquecer o som", "Cortar frequências desnecessárias para limpar o som", "Usar dois EQs em série", "Equalizar somente os graves"], ans: 1, explain: "A equalização subtrativa (cortar) é geralmente mais natural e eficaz que a aditiva (boostar)." },
        { q: "Qual é o efeito de boostar 2.5kHz em uma guitarra distorcida?", options: ["Som mais suave e redondo", "Mais graves e peso", "Mais agressividade e 'mordida'", "Menos sustain"], ans: 2, explain: "2.5kHz é a região da 'mordida'. Um boost aqui faz a guitarra cortar a mistura." },
        { q: "Para um som de Djent, o que deve ser feito em 500Hz?", options: ["Boost forte", "Corte para remover lama", "Manter neutro", "Adicionado saturação"], ans: 1, explain: "Cortar 500Hz remove a 'lama' que turva a definição das cordas graves nas afinações baixas." },
        { q: "Por que usar High Pass em 200Hz para Post-Rock/Ambient?", options: ["Para adicionar mais grave", "Porque o reverb criará grave artificial", "Para aumentar o volume", "Para evitar o delay"], ans: 1, explain: "O reverb irá adicionar energia grave artificial ao som — então cortar a fonte antes evita o acúmulo." },
        { q: "O que é 'fizz digital'?", options: ["Distorção harmônica musical", "Ruído de alta frequência indesejado de modeladores", "Nome de um pedal", "Compressão excessiva"], ans: 1, explain: "Fizz digital é o ruído de alta frequência (acima de 10kHz) gerado por modeladores digitais que soa artificial." },
    ];
    const full = [...base];
    while (full.length < 50) {
        full.push({
            q: `Questão #${full.length + 1}: A equalização subtrativa é preferível porque:`,
            options: ["Aumenta o volume geral", "É mais natural e evita mascaramento", "Adiciona harmônicos", "Funciona só em estúdio"],
            ans: 1,
            explain: "Cortar frequências indesejadas soa mais natural do que boostar as desejadas, além de evitar acúmulo de fase."
        });
    }
    return full;
};
const QUIZ_DATA = generateQuizData();

// ─── VISUAL EQ CURVE ─────────────────────────────────────────────────────────

const VisualEQCurve: React.FC<{ curve: { hp: number; lp: number; boosts: any[]; cuts: any[] } }> = ({ curve }) => {
    const W = 600, H = 200, PAD = 20;
    const gW = W - PAD * 2;
    const minLog = Math.log(20), maxLog = Math.log(20000), scaleLog = maxLog - minLog;
    const rangeDB = 18;

    const mapFreqToX = (f: number) => PAD + ((Math.log(Math.max(20, Math.min(f, 20000))) - minLog) / scaleLog) * gW;
    const mapXToFreq = (x: number) => Math.exp(minLog + ((x - PAD) / gW) * scaleLog);

    const getMagnitude = (hz: number) => {
        let db = 0;
        [...curve.boosts, ...curve.cuts].forEach(f => {
            const diff = Math.abs(Math.log(f.f) - Math.log(hz));
            if (diff < 2.5) db += f.g * Math.exp(-(diff * diff) / (2 * 0.35 * 0.35));
        });
        if (hz < curve.hp) db -= Math.log2(curve.hp / hz) * 12;
        if (hz > curve.lp) db -= Math.log2(hz / curve.lp) * 12;
        return db;
    };

    const pts: [number, number][] = [];
    for (let i = 0; i <= 300; i++) {
        const x = PAD + (i / 300) * gW;
        const db = getMagnitude(mapXToFreq(x));
        const y = Math.max(5, Math.min(H - 5, H / 2 - (db / rangeDB) * ((H - PAD * 2) / 2)));
        pts.push([x, y]);
    }
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
    const area = `${line} L ${W - PAD} ${H - PAD} L ${PAD} ${H - PAD} Z`;
    const gridFreqs = [50, 100, 200, 500, 1000, 2000, 5000, 10000];

    return (
        <div className="w-full bg-[#111] rounded-lg border border-[#333] overflow-hidden shadow-inner">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-48">
                {gridFreqs.map(f => {
                    const x = mapFreqToX(f);
                    return (
                        <g key={f}>
                            <line x1={x} y1={PAD} x2={x} y2={H - PAD} stroke="#2a2a2a" strokeWidth="1" strokeDasharray="2" />
                            <text x={x} y={H - 6} fill="#555" fontSize="9" textAnchor="middle" fontFamily="monospace">{f >= 1000 ? `${f / 1000}k` : f}</text>
                        </g>
                    );
                })}
                <line x1={PAD} y1={H / 2} x2={W - PAD} y2={H / 2} stroke="#333" strokeWidth="1" />
                <path d={area} fill="url(#eqGrad)" opacity="0.2" />
                <path d={line} stroke="#f59b0a" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 6px rgba(245,155,10,0.4))' }} />
                <defs>
                    <linearGradient id="eqGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#f59b0a" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#f59b0a" stopOpacity="0.0" />
                    </linearGradient>
                </defs>
            </svg>
        </div>
    );
};

// ─── NAVIGATION ──────────────────────────────────────────────────────────────

const NAV_ITEMS = [
    { path: '/',              icon: 'dashboard',  label: 'Dashboard' },
    { path: '/frequency-lab', icon: 'ssid_chart', label: 'Mapa do Tesouro (Lab)' },
    { path: '/ear-trainer',   icon: 'hearing',    label: 'Treino de Ouvido' },
    { path: '/chapter-quiz',  icon: 'school',     label: 'Quiz (50 Questões)' },
    { path: '/eq-recipes',    icon: 'tune',       label: 'Receitas Prontas' },
];

const NavigationSidebar: React.FC = () => {
    const loc = useLocation();
    const best = localStorage.getItem('timbre_best') || '0';
    return (
        <aside className="hidden md:flex flex-col w-72 h-full bg-surface-dark border-r border-surface-highlight shrink-0 z-50">
            <div className="flex items-center gap-3 px-6 py-8">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-primary to-orange-600 shadow-lg shadow-primary/20">
                    <span className="material-symbols-outlined text-white">graphic_eq</span>
                </div>
                <div>
                    <h1 className="text-white text-lg font-bold tracking-tight">Domínio do Timbre</h1>
                    <p className="text-primary text-xs font-medium uppercase tracking-wider">Lab v3.0</p>
                </div>
            </div>
            <nav className="flex-1 px-4 flex flex-col gap-1">
                <div className="px-4 py-2 text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Ferramentas do Livro</div>
                {NAV_ITEMS.map(({ path, icon, label }) => {
                    const active = loc.pathname === path;
                    return (
                        <Link key={path} to={path} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${active ? 'bg-surface-highlight border-l-4 border-primary pl-3' : 'hover:bg-surface-highlight/50 text-text-muted hover:text-white'}`}>
                            <span className={`material-symbols-outlined ${active ? 'text-primary' : 'group-hover:text-primary transition-colors'}`}>{icon}</span>
                            <span className={`font-medium text-sm ${active ? 'text-white' : ''}`}>{label}</span>
                        </Link>
                    );
                })}
            </nav>
            <div className="px-6 py-4 border-t border-surface-highlight">
                <div className="flex items-center gap-2 bg-surface-highlight/50 rounded-lg px-4 py-3">
                    <span className="material-symbols-outlined text-primary text-xl">emoji_events</span>
                    <div>
                        <div className="text-xs text-text-muted">Melhor Recorde</div>
                        <div className="text-white font-bold">{best}/20 acertos</div>
                    </div>
                </div>
            </div>
        </aside>
    );
};

const MobileHeader: React.FC = () => {
    const [open, setOpen] = useState(false);
    const loc = useLocation();
    useEffect(() => setOpen(false), [loc]);
    useEffect(() => { document.body.style.overflow = open ? 'hidden' : 'unset'; return () => { document.body.style.overflow = 'unset'; }; }, [open]);

    return (
        <>
            <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-6 py-4 bg-background-dark/90 backdrop-blur-md border-b border-surface-highlight">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-primary to-orange-600">
                        <span className="material-symbols-outlined text-white text-lg">graphic_eq</span>
                    </div>
                    <span className="font-bold text-white text-sm">Domínio do Timbre</span>
                </div>
                <button onClick={() => setOpen(true)} className="w-10 h-10 flex items-center justify-center rounded-lg bg-surface-highlight text-white">
                    <span className="material-symbols-outlined">menu</span>
                </button>
            </header>
            {open && (
                <div className="fixed inset-0 z-50 flex flex-col bg-background-dark">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-surface-highlight">
                        <span className="font-bold text-white">Menu</span>
                        <button onClick={() => setOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-lg bg-surface-highlight text-white">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <nav className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                        {NAV_ITEMS.map(({ path, icon, label }) => (
                            <Link key={path} to={path} className="flex items-center gap-4 px-4 py-4 rounded-xl hover:bg-surface-highlight text-text-muted hover:text-white transition-all">
                                <span className="material-symbols-outlined">{icon}</span>
                                <span className="font-medium text-lg">{label}</span>
                            </Link>
                        ))}
                    </nav>
                </div>
            )}
        </>
    );
};

// ─── SCREENS ─────────────────────────────────────────────────────────────────

const DashboardScreen: React.FC = () => {
    const best = localStorage.getItem('timbre_best') || '0';
    const quizBest = localStorage.getItem('timbre_quiz_best') || '0';
    return (
        <div className="flex flex-col w-full h-full overflow-y-auto bg-background-dark">
            <MobileHeader />
            <header className="hidden md:flex sticky top-0 z-20 items-center px-8 py-5 bg-background-dark/80 backdrop-blur-md border-b border-surface-highlight">
                <h2 className="text-text-muted text-sm">Painel do Aluno</h2>
            </header>
            <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
                <section className="relative overflow-hidden rounded-2xl bg-surface-dark border border-surface-highlight p-8 sm:p-12">
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative z-10 max-w-2xl flex flex-col gap-4">
                        <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight tracking-tight">
                            Domine as Frequências. <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">Esculpe seu Som.</span>
                        </h1>
                        <p className="text-text-muted text-lg font-light leading-relaxed max-w-lg">
                            Identifique os problemas do seu timbre e aplique as correções.
                        </p>
                        <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {NAV_ITEMS.slice(1).map(({ path, icon, label }) => (
                                <Link key={path} to={path} className={`py-4 px-6 rounded-xl transition-colors flex items-center justify-between group ${path === '/frequency-lab' ? 'bg-primary hover:bg-orange-600 text-white shadow-lg shadow-primary/25' : 'bg-surface-highlight hover:bg-surface-highlight/80 text-white border border-surface-highlight hover:border-text-muted/30'}`}>
                                    <div className="flex flex-col items-start">
                                        <span className="text-lg font-bold">{label.split('(')[0].trim()}</span>
                                        <span className={`text-xs font-normal opacity-80 ${path !== '/frequency-lab' ? 'text-text-muted' : ''}`}>
                                            {path === '/frequency-lab' ? 'Explore as frequências' : path === '/ear-trainer' ? 'Teste sua percepção' : path === '/chapter-quiz' ? 'Desafie seu conhecimento' : 'Presets de EQ'}
                                        </span>
                                    </div>
                                    <span className={`material-symbols-outlined text-3xl group-hover:scale-110 transition-transform ${path !== '/frequency-lab' ? 'text-primary' : ''}`}>{icon}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Stats */}
                <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { icon: 'emoji_events', label: 'Recorde Treino', value: `${best}/20`, color: 'text-primary' },
                        { icon: 'school', label: 'Recorde Quiz', value: `${quizBest}/50`, color: 'text-green-400' },
                        { icon: 'tune', label: 'Receitas de EQ', value: '8 presets', color: 'text-blue-400' },
                        { icon: 'graphic_eq', label: 'Versão', value: 'Lab v3.0', color: 'text-purple-400' },
                    ].map((s, i) => (
                        <div key={i} className="bg-surface-dark border border-surface-highlight rounded-xl p-5 flex flex-col gap-2">
                            <span className={`material-symbols-outlined ${s.color}`}>{s.icon}</span>
                            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                            <div className="text-text-muted text-xs">{s.label}</div>
                        </div>
                    ))}
                </section>
            </div>
        </div>
    );
};

// ── Frequency Lab ─────────────────────────────────────────────────────────────

const FrequencyLabScreen: React.FC = () => {
    const [frequency, setFrequency]   = useState(400);
    const [isPlaying, setIsPlaying]   = useState(false);
    const [waveType, setWaveType]     = useState<WaveType>('sine');
    const [volume, setVolume]         = useState(0.3);
    const [showPro, setShowPro]       = useState(false);

    const oscRef  = useRef<OscillatorNode | null>(null);
    const gainRef = useRef<GainNode | null>(null);
    const tip = useMemo(() => getFrequencyTip(frequency), [frequency]);

    const startSound = useCallback((hz: number, wave: WaveType, vol: number) => {
        const ctx = getAudioCtx();
        if (!ctx) return;
        if (ctx.state === 'suspended') ctx.resume();
        if (!oscRef.current) {
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = wave;
            osc.frequency.setValueAtTime(hz, ctx.currentTime);
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.08);
            osc.connect(gain); gain.connect(ctx.destination);
            osc.start();
            oscRef.current = osc; gainRef.current = gain;
        } else {
            oscRef.current.type = wave;
            oscRef.current.frequency.exponentialRampToValueAtTime(Math.max(10, hz), ctx.currentTime + 0.05);
            gainRef.current!.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.05);
        }
    }, []);

    const stopSound = useCallback(() => {
        const ctx = getAudioCtx();
        if (ctx && gainRef.current && oscRef.current) {
            gainRef.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
            setTimeout(() => { try { oscRef.current?.stop(); } catch (e) {} oscRef.current?.disconnect(); gainRef.current?.disconnect(); oscRef.current = null; gainRef.current = null; }, 120);
        }
    }, []);

    useEffect(() => { return () => stopSound(); }, [stopSound]);

    const togglePlay = () => {
        if (isPlaying) { stopSound(); setIsPlaying(false); }
        else { startSound(frequency, waveType, volume); setIsPlaying(true); }
    };

    const updateFreq = (val: number) => {
        setFrequency(val);
        if (isPlaying) startSound(val, waveType, volume);
    };

    const updateWave = (w: WaveType) => {
        setWaveType(w);
        if (isPlaying) startSound(frequency, w, volume);
    };

    const updateVolume = (v: number) => {
        setVolume(v);
        if (isPlaying && gainRef.current) {
            const ctx = getAudioCtx();
            if (ctx) gainRef.current.gain.linearRampToValueAtTime(v, ctx.currentTime + 0.05);
        }
    };

    const WAVES: { id: WaveType; label: string }[] = [
        { id: 'sine',     label: 'Senoidal' },
        { id: 'triangle', label: 'Triangular' },
        { id: 'sawtooth', label: 'Serra' },
        { id: 'square',   label: 'Quadrada' },
    ];

    return (
        <div className="flex flex-col w-full h-full overflow-y-auto bg-background-dark">
            <MobileHeader />
            <header className="hidden md:flex sticky top-0 z-50 items-center justify-between border-b border-surface-highlight bg-background-dark/80 backdrop-blur-md px-6 py-4 md:px-10">
                <div className="flex items-center gap-3 text-white">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
                        <span className="material-symbols-outlined text-2xl">graphic_eq</span>
                    </div>
                    <h2 className="text-lg font-bold">Frequency Lab</h2>
                </div>
                <Link to="/" className="text-sm font-medium hover:text-primary transition-colors text-gray-300">Voltar</Link>
            </header>

            <main className="flex-1 p-4 md:p-8 lg:p-12 max-w-5xl mx-auto w-full flex flex-col gap-6">
                {/* Freq Display */}
                <div className={`relative rounded-2xl bg-surface-dark border transition-all duration-500 p-8 md:p-12 shadow-lg overflow-hidden ${isPlaying ? 'border-primary shadow-primary/20' : 'border-surface-highlight'}`}>
                    <div className="flex flex-col items-center gap-6">
                        <h1 className="text-6xl md:text-8xl font-bold tracking-tighter text-white tabular-nums">
                            {frequency >= 1000 ? `${(frequency / 1000).toFixed(1)}k` : frequency}
                            <span className="text-3xl md:text-5xl text-gray-500 font-light"> Hz</span>
                        </h1>
                        <div className="bg-surface-highlight/50 border border-primary/30 px-6 py-4 rounded-lg text-center max-w-lg w-full">
                            <p className="text-primary font-bold text-lg mb-1">{tip.title}</p>
                            <p className="text-white text-sm leading-snug">{tip.desc}</p>
                        </div>

                        {/* Waveform Selector */}
                        <div className="flex gap-2 flex-wrap justify-center">
                            {WAVES.map(w => (
                                <button key={w.id} onClick={() => updateWave(w.id)}
                                    className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${waveType === w.id ? 'bg-primary/20 border-primary text-primary' : 'border-surface-highlight text-text-muted hover:text-white hover:border-white/20'}`}>
                                    {w.label}
                                </button>
                            ))}
                        </div>

                        {/* Play Button */}
                        <button onClick={togglePlay} className={`flex h-20 w-20 items-center justify-center rounded-full bg-surface-dark border-2 text-white shadow-xl transition-all hover:scale-105 active:scale-95 ${isPlaying ? 'border-primary animate-pulse-glow' : 'border-primary/30'}`}>
                            <span className="material-symbols-outlined text-4xl text-primary font-bold">{isPlaying ? 'stop' : 'play_arrow'}</span>
                        </button>
                    </div>
                </div>

                {/* Slider + Volume */}
                <div className="rounded-xl bg-surface-dark border border-surface-highlight p-6 flex flex-col gap-5">
                    <div className="flex items-center gap-4">
                        <button onClick={() => updateFreq(Math.max(20, frequency - 10))} className="hidden md:flex items-center justify-center h-12 w-14 rounded-lg bg-surface-highlight hover:bg-surface-highlight/80 text-white transition-colors">
                            <span className="material-symbols-outlined text-sm">remove</span>
                        </button>
                        <input className="flex-1 w-full cursor-pointer" type="range" min="20" max="20000" step="10" value={frequency} onChange={e => updateFreq(parseInt(e.target.value))} />
                        <button onClick={() => updateFreq(Math.min(20000, frequency + 10))} className="hidden md:flex items-center justify-center h-12 w-14 rounded-lg bg-surface-highlight hover:bg-surface-highlight/80 text-white transition-colors">
                            <span className="material-symbols-outlined text-sm">add</span>
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-text-muted text-xl">volume_mute</span>
                        <input className="flex-1 cursor-pointer" type="range" min="0" max="1" step="0.01" value={volume} onChange={e => updateVolume(parseFloat(e.target.value))} />
                        <span className="material-symbols-outlined text-text-muted text-xl">volume_up</span>
                    </div>
                </div>

                {/* Pro Tip */}
                <div className="rounded-xl bg-surface-dark border border-surface-highlight overflow-hidden">
                    <button onClick={() => setShowPro(v => !v)} className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-surface-highlight/30 transition-colors">
                        <div className="flex items-center gap-2 text-primary font-semibold">
                            <span className="material-symbols-outlined text-xl">tips_and_updates</span>
                            Dica Pro do Engenheiro
                        </div>
                        <span className="material-symbols-outlined text-text-muted transition-transform" style={{ transform: showPro ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
                    </button>
                    {showPro && (
                        <div className="px-6 pb-5 border-t border-surface-highlight/50">
                            <p className="text-gray-300 leading-relaxed mt-4 text-sm">{tip.pro}</p>
                        </div>
                    )}
                </div>

                {/* Quick Band Buttons */}
                <div className="rounded-xl bg-surface-dark border border-surface-highlight p-5">
                    <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Navegar por Faixa</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[80, 300, 720, 1000, 2500, 4000, 8000, 12000].map(f => {
                            const t = getFrequencyTip(f);
                            return (
                                <button key={f} onClick={() => updateFreq(f)} className={`text-left px-3 py-2 rounded-lg border text-xs transition-all ${frequency === f ? 'border-primary bg-primary/10 text-primary' : 'border-surface-highlight text-text-muted hover:border-primary/50 hover:text-white'}`}>
                                    <div className="font-bold">{f >= 1000 ? `${f / 1000}k` : f} Hz</div>
                                    <div className="opacity-70 truncate">{t.title.split('(')[0].trim()}</div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </main>
        </div>
    );
};

// ── Ear Trainer ───────────────────────────────────────────────────────────────

type TrainRound = { target: typeof TRAINER_DATA[0]; guess: typeof TRAINER_DATA[0] };

const EarTrainerScreen: React.FC = () => {
    const [gameState, setGameState] = useState<'INTRO' | 'PLAYING' | 'RESULT'>('INTRO');
    const [round, setRound]         = useState(1);
    const [score, setScore]         = useState(0);
    const [maxRounds]               = useState(20);
    const [target, setTarget]       = useState<typeof TRAINER_DATA[0] | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [answered, setAnswered]   = useState(false);
    const [lastResult, setLastResult] = useState<'correct' | 'wrong' | null>(null);
    const [history, setHistory]     = useState<TrainRound[]>([]);
    const [bestScore, setBestScore] = useState<number>(() => parseInt(localStorage.getItem('timbre_best') || '0'));

    const oscRef  = useRef<OscillatorNode | null>(null);
    const gainRef = useRef<GainNode | null>(null);

    const stopTone = useCallback(() => {
        const ctx = getAudioCtx();
        if (ctx && oscRef.current && gainRef.current) {
            const t = ctx.currentTime;
            try { gainRef.current.gain.cancelScheduledValues(t); gainRef.current.gain.setValueAtTime(gainRef.current.gain.value, t); gainRef.current.gain.linearRampToValueAtTime(0, t + 0.1); oscRef.current.stop(t + 0.1); } catch (e) {}
        }
        oscRef.current = null; gainRef.current = null; setIsPlaying(false);
    }, []);

    const playTone = useCallback((hz: number) => {
        const ctx = getAudioCtx();
        if (!ctx) return;
        stopTone();
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(hz, ctx.currentTime);
        gain.gain.setValueAtTime(0, ctx.currentTime); gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.1);
        osc.connect(gain); gain.connect(ctx.destination); osc.start();
        oscRef.current = osc; gainRef.current = gain; setIsPlaying(true);
    }, [stopTone]);

    const initRound = useCallback(() => {
        setAnswered(false); setLastResult(null);
        const t = TRAINER_DATA[Math.floor(Math.random() * TRAINER_DATA.length)];
        setTarget(t); playTone(t.hz);
    }, [playTone]);

    const startGame = () => {
        const ctx = getAudioCtx();
        if (ctx?.state === 'suspended') ctx.resume();
        setScore(0); setRound(1); setHistory([]); setGameState('PLAYING');
        initRound();
    };

    const checkAnswer = (selected: typeof TRAINER_DATA[0]) => {
        if (answered || !target) return;
        stopTone(); setAnswered(true);
        const correct = selected.hz === target.hz;
        if (correct) setScore(s => s + 1);
        setLastResult(correct ? 'correct' : 'wrong');
        setHistory(h => [...h, { target, guess: selected }]);
    };

    const nextRound = () => {
        if (round >= maxRounds) {
            const finalScore = score + (lastResult === 'correct' ? 0 : 0);
            if (finalScore > bestScore) { setBestScore(finalScore); localStorage.setItem('timbre_best', String(finalScore)); }
            stopTone(); setGameState('RESULT');
        } else { setRound(r => r + 1); initRound(); }
    };

    useEffect(() => () => stopTone(), [stopTone]);

    const grade = (score / maxRounds) * 10;
    const gradeColor = grade >= 9 ? 'text-green-400' : grade >= 7 ? 'text-primary' : grade >= 5 ? 'text-yellow-500' : 'text-red-500';
    const gradeMsg   = grade >= 9 ? 'Ouvido de ouro! Você tem talento natural.' : grade >= 7 ? 'Muito bom! Continue praticando.' : grade >= 5 ? 'Na média. O treino vai te levar longe.' : 'Não desista! O ouvido melhora com a prática.';

    return (
        <div className="flex flex-col w-full h-full overflow-y-auto bg-background-dark">
            <MobileHeader />
            <main className="flex-1 max-w-2xl w-full mx-auto p-4 md:p-8 flex flex-col items-center justify-center min-h-[500px]">

                {gameState === 'INTRO' && (
                    <div className="text-center animate-in fade-in zoom-in duration-300">
                        <div className="mb-6 inline-flex p-6 rounded-full bg-surface-highlight border-2 border-primary/20 shadow-xl">
                            <span className="material-symbols-outlined text-6xl text-primary">headphones</span>
                        </div>
                        <h2 className="text-3xl font-black text-white mb-4">Treine seu Ouvido</h2>
                        <p className="text-text-muted mb-4 leading-relaxed max-w-md mx-auto">
                            O sistema tocará um tom senoidal puro.<br />
                            Você responderá a <strong className="text-white">20 perguntas</strong>.<br />
                            Ao final, receberá uma nota de 0 a 10.
                        </p>
                        {bestScore > 0 && (
                            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-2 text-primary text-sm font-semibold mb-6">
                                <span className="material-symbols-outlined text-base">emoji_events</span>
                                Seu recorde: {bestScore}/20
                            </div>
                        )}
                        <div className="block">
                            <button onClick={startGame} className="px-8 py-4 bg-primary text-black font-bold text-lg rounded-xl hover:bg-primary-hover transition-transform hover:scale-105 shadow-lg shadow-primary/25">
                                COMEÇAR PROVA
                            </button>
                        </div>
                    </div>
                )}

                {gameState === 'PLAYING' && target && (
                    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="flex justify-between items-center mb-6 px-2">
                            <span className="text-text-muted font-bold tracking-wider text-sm">QUESTÃO <span className="text-white">{round}/{maxRounds}</span></span>
                            <div className="bg-surface-highlight px-3 py-1 rounded-full border border-white/5">
                                <span className="text-primary font-bold">{score}</span> <span className="text-xs text-text-muted">ACERTOS</span>
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full h-1 bg-surface-highlight rounded-full mb-6">
                            <div className="h-1 bg-primary rounded-full transition-all" style={{ width: `${((round - 1) / maxRounds) * 100}%` }} />
                        </div>

                        <div className="text-center mb-6">
                            <div className={`text-lg font-bold mb-4 min-h-[2rem] transition-colors ${answered ? (lastResult === 'correct' ? 'text-green-400' : 'text-red-400') : 'text-text-muted'}`}>
                                {answered ? (lastResult === 'correct' ? `✅ Correto! ${target.hz}Hz — ${target.label}` : `❌ Era ${target.hz}Hz — ${target.label}`) : 'Ouvindo... ??? Hz'}
                            </div>
                            <button onClick={() => isPlaying ? stopTone() : playTone(target.hz)}
                                className={`inline-flex items-center gap-2 px-6 py-3 rounded-full border font-bold transition-all ${isPlaying ? 'bg-primary border-primary text-black animate-pulse shadow-[0_0_15px_rgba(245,155,10,0.4)]' : 'bg-surface-highlight border-white/10 text-white hover:bg-surface-highlight/80'}`}>
                                <span className="material-symbols-outlined">{isPlaying ? 'stop' : 'volume_up'}</span>
                                {isPlaying ? 'Parar Som' : 'Ouvir Novamente'}
                            </button>
                        </div>

                        {/* Explanation after answer */}
                        {answered && (
                            <div className="mb-5 p-4 rounded-xl bg-surface-highlight/40 border border-primary/20 text-sm text-gray-300 leading-relaxed">
                                <span className="text-primary font-semibold">💡 </span>
                                {getFrequencyTip(target.hz).pro}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 mb-6">
                            {TRAINER_DATA.map(opt => {
                                let cls = "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ";
                                if (!answered) {
                                    cls += "bg-surface-highlight border-transparent hover:bg-surface-highlight/80 hover:border-white/20 text-white cursor-pointer";
                                } else if (opt.hz === target.hz) {
                                    cls += "bg-green-500/20 border-green-500 text-green-100";
                                } else {
                                    cls += "bg-surface-highlight/30 border-transparent text-gray-500 opacity-40";
                                }
                                return (
                                    <button key={opt.hz} onClick={() => checkAnswer(opt)} disabled={answered} className={cls}>
                                        <span className="text-base font-bold leading-tight">{opt.label}</span>
                                        <span className="text-xs mt-1 opacity-80 font-mono">{opt.hz} Hz</span>
                                        <span className="text-xs mt-0.5 opacity-60">{opt.desc}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="h-14 flex items-center justify-center">
                            {answered && (
                                <button onClick={nextRound} className="w-full md:w-auto px-8 py-3 bg-primary text-black font-bold rounded-lg hover:bg-primary-hover transition-all animate-in zoom-in duration-200 flex items-center justify-center gap-2">
                                    {round >= maxRounds ? 'Ver Resultado' : 'Próxima Questão'} <span className="material-symbols-outlined">arrow_forward</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {gameState === 'RESULT' && (
                    <div className="w-full animate-in zoom-in duration-300">
                        <div className="text-center mb-8">
                            <div className="text-5xl mb-3">🎧</div>
                            <h2 className="text-2xl font-bold text-white mb-1">Resultado Final</h2>
                            {score >= bestScore && score > 0 && (
                                <div className="inline-flex items-center gap-1 bg-primary/15 border border-primary/30 rounded-full px-3 py-1 text-primary text-xs font-bold mt-1 mb-2">
                                    🏆 Novo Recorde!
                                </div>
                            )}
                            <div className="bg-surface-highlight border border-white/5 rounded-2xl p-8 my-6 shadow-xl">
                                <div className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2">Sua Nota</div>
                                <div className={`text-7xl font-black mb-2 ${gradeColor}`}>{grade.toFixed(1)}</div>
                                <div className="text-white font-medium">{score} acertos de {maxRounds}</div>
                            </div>
                            <p className="text-text-muted mb-6">{gradeMsg}</p>
                        </div>

                        {/* History */}
                        <div className="bg-surface-dark border border-surface-highlight rounded-xl p-5 mb-6">
                            <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Histórico da Rodada</h4>
                            <div className="grid grid-cols-2 gap-2">
                                {history.map((r, i) => {
                                    const correct = r.target.hz === r.guess.hz;
                                    return (
                                        <div key={i} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${correct ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                            <span className="material-symbols-outlined text-sm">{correct ? 'check_circle' : 'cancel'}</span>
                                            <span>{r.target.label}</span>
                                            {!correct && <span className="opacity-60">→ {r.guess.label}</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <button onClick={() => setGameState('INTRO')} className="w-full py-4 bg-primary text-black font-bold rounded-xl hover:bg-primary-hover transition-transform hover:scale-[1.02]">
                            TENTAR NOVAMENTE
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};

// ── Chapter Quiz ──────────────────────────────────────────────────────────────

const ChapterQuizScreen: React.FC = () => {
    const [current, setCurrent]   = useState(0);
    const [selected, setSelected] = useState<number | null>(null);
    const [score, setScore]       = useState(0);
    const [done, setDone]         = useState(false);
    const [bestScore, setBestScore] = useState<number>(() => parseInt(localStorage.getItem('timbre_quiz_best') || '0'));

    const q = QUIZ_DATA[current];

    const handleSelect = (idx: number) => {
        if (selected !== null) return;
        setSelected(idx);
        if (idx === q.ans) setScore(s => s + 1);
    };

    const next = () => {
        if (current < QUIZ_DATA.length - 1) {
            setCurrent(c => c + 1); setSelected(null);
        } else {
            const finalScore = score + (selected === q.ans ? 0 : 0);
            if (finalScore > bestScore) { setBestScore(finalScore); localStorage.setItem('timbre_quiz_best', String(finalScore)); }
            setDone(true);
        }
    };

    const restart = () => { setCurrent(0); setSelected(null); setScore(0); setDone(false); };

    const pct = Math.round((score / QUIZ_DATA.length) * 100);

    if (done) {
        return (
            <div className="flex flex-col w-full h-full overflow-y-auto bg-background-dark">
                <MobileHeader />
                <main className="flex-1 max-w-xl w-full mx-auto p-4 md:p-8 flex flex-col items-center justify-center">
                    <div className="w-full text-center animate-in zoom-in duration-300">
                        <div className="text-5xl mb-4">🎓</div>
                        <h2 className="text-3xl font-black text-white mb-2">Quiz Completo!</h2>
                        {score >= bestScore && score > 0 && <div className="inline-flex items-center gap-1 bg-primary/15 border border-primary/30 rounded-full px-3 py-1 text-primary text-xs font-bold mb-4">🏆 Novo Recorde!</div>}
                        <div className="bg-surface-dark border border-surface-highlight rounded-2xl p-8 my-6">
                            <div className="text-7xl font-black text-primary mb-2">{score}<span className="text-3xl text-text-muted">/{QUIZ_DATA.length}</span></div>
                            <div className="text-white">{pct}% de acerto</div>
                        </div>
                        <p className="text-text-muted mb-8">
                            {pct >= 80 ? '🎯 Você domina a teoria do timbre!' : pct >= 60 ? '📖 Bom resultado! Revise o livro para melhorar.' : '📚 Releia os capítulos e tente novamente.'}
                        </p>
                        <button onClick={restart} className="w-full py-4 bg-primary text-black font-bold rounded-xl hover:bg-primary-hover transition-all">
                            REFAZER QUIZ
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full h-full overflow-y-auto bg-background-dark">
            <MobileHeader />
            <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 flex flex-col gap-6">
                <header>
                    <h2 className="text-3xl font-black text-white">Quiz de Masterização</h2>
                    <p className="text-text-muted">Teste seus conhecimentos sobre EQ e timbre.</p>
                </header>

                <div className="bg-surface-dark border border-surface-highlight rounded-2xl p-6 md:p-10 shadow-xl">
                    {/* Progress */}
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-bold text-text-muted uppercase tracking-wider">Questão {current + 1} de {QUIZ_DATA.length}</span>
                        <span className="text-primary font-bold">Acertos: {score}</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-highlight rounded-full mb-8">
                        <div className="h-1.5 bg-primary rounded-full transition-all" style={{ width: `${(current / QUIZ_DATA.length) * 100}%` }} />
                    </div>

                    <h3 className="text-xl md:text-2xl font-bold text-white mb-8">{q.q}</h3>

                    <div className="flex flex-col gap-3">
                        {q.options.map((opt, idx) => {
                            let cls = "p-4 rounded-lg border-2 text-left transition-all font-medium flex items-center gap-3 ";
                            if (selected === null) {
                                cls += "border-surface-highlight hover:border-primary cursor-pointer bg-black/20 text-gray-300";
                            } else if (idx === q.ans) {
                                cls += "border-green-500 bg-green-500/10 text-green-400";
                            } else if (idx === selected) {
                                cls += "border-red-500 bg-red-500/10 text-red-400";
                            } else {
                                cls += "border-transparent opacity-40 text-gray-500";
                            }
                            return (
                                <button key={idx} onClick={() => handleSelect(idx)} disabled={selected !== null} className={cls}>
                                    <span className={`flex-shrink-0 w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold ${selected !== null && idx === q.ans ? 'border-green-500 text-green-400' : selected !== null && idx === selected ? 'border-red-500 text-red-400' : 'border-current'}`}>
                                        {String.fromCharCode(65 + idx)}
                                    </span>
                                    {opt}
                                </button>
                            );
                        })}
                    </div>

                    {selected !== null && (
                        <div className="mt-8 p-6 bg-surface-highlight/10 border border-primary/20 rounded-xl animate-in fade-in slide-in-from-bottom-2">
                            <h4 className="font-bold text-primary mb-2 flex items-center gap-2">
                                <span className="material-symbols-outlined">lightbulb</span>
                                Explicação
                            </h4>
                            <p className="text-gray-300 leading-relaxed text-sm">{q.explain}</p>
                            <div className="mt-6 flex justify-end">
                                <button onClick={next} className="bg-primary text-black px-8 py-3 rounded-lg font-bold hover:bg-orange-600 transition-colors flex items-center gap-2">
                                    {current >= QUIZ_DATA.length - 1 ? 'Ver Resultado' : 'Próxima'} <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

// ── EQ Recipes ────────────────────────────────────────────────────────────────

const EQRecipesScreen: React.FC = () => {
    const [playingHz, setPlayingHz] = useState<number | null>(null);

    const handlePlayFreq = (hz: number) => {
        setPlayingHz(hz);
        playToneOnce(hz, 1.5);
        setTimeout(() => setPlayingHz(null), 1600);
    };

    return (
        <div className="flex flex-col w-full h-full overflow-y-auto bg-background-dark">
            <MobileHeader />
            <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 flex flex-col gap-8">
                <header>
                    <h2 className="text-3xl font-black text-white">Receitas de EQ</h2>
                    <p className="text-text-muted">Presets explicados para Guitarra — clique em <span className="material-symbols-outlined align-middle text-base text-primary">volume_up</span> para ouvir a frequência.</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {EQ_RECIPES.map(recipe => (
                        <div key={recipe.id} className="bg-surface-dark border border-surface-highlight rounded-xl overflow-hidden hover:border-primary/50 transition-colors shadow-sm hover:shadow-md">
                            <div className="p-6 border-b border-surface-highlight">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{recipe.emoji}</span>
                                        <h3 className="text-xl font-bold text-white">{recipe.name}</h3>
                                    </div>
                                    <span className="text-xs font-bold px-2 py-1 rounded bg-surface-highlight text-text-muted uppercase tracking-wider shrink-0">{recipe.type}</span>
                                </div>
                                <p className="text-gray-400 text-sm mt-2">{recipe.desc}</p>
                            </div>

                            <div className="p-6 bg-black/20">
                                <VisualEQCurve curve={recipe.curve} />
                            </div>

                            <div className="p-6">
                                <h4 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4">Passo a Passo</h4>
                                <div className="space-y-3">
                                    {recipe.steps.map((step, idx) => (
                                        <div key={idx} className="flex gap-3 items-start group">
                                            <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${step.type === 'boost' ? 'bg-green-500' : 'bg-red-500'}`} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-bold text-white">{step.freq}</span>
                                                    <span className="text-xs text-gray-500">• {step.action}</span>
                                                    <button
                                                        onClick={() => handlePlayFreq((step as any).hz)}
                                                        className={`ml-auto flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all ${playingHz === (step as any).hz ? 'bg-primary/20 border-primary text-primary animate-pulse' : 'border-surface-highlight text-text-muted hover:border-primary/50 hover:text-primary'}`}
                                                        title={`Ouvir ${step.freq}`}
                                                    >
                                                        <span className="material-symbols-outlined text-sm">{playingHz === (step as any).hz ? 'volume_up' : 'play_circle'}</span>
                                                        {playingHz === (step as any).hz ? 'ouvindo' : 'ouvir'}
                                                    </button>
                                                </div>
                                                <p className="text-sm text-gray-400 mt-1">{step.reason}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
};

// ─── APP ROOT ─────────────────────────────────────────────────────────────────

const App: React.FC = () => (
    <HashRouter>
        <div className="flex h-screen w-full bg-background-dark text-white overflow-hidden font-display">
            <NavigationSidebar />
            <div className="flex-1 overflow-hidden">
                <Routes>
                    <Route path="/"              element={<DashboardScreen />} />
                    <Route path="/frequency-lab" element={<FrequencyLabScreen />} />
                    <Route path="/ear-trainer"   element={<EarTrainerScreen />} />
                    <Route path="/chapter-quiz"  element={<ChapterQuizScreen />} />
                    <Route path="/eq-recipes"    element={<EQRecipesScreen />} />
                </Routes>
            </div>
        </div>
    </HashRouter>
);

export default App;
