import React, { useState } from 'react';
import { AudioWaveform, Mail, Lock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

const BENEFITS = [
  '🎧 Audiobook com 8 capítulos completos',
  '📖 Ebook completo no navegador',
  '🎚️ Frequency Lab interativo com áudio real',
  '👂 Treino de Ouvido gamificado',
  '🏆 Ranking global de jogadores',
  '📱 Acesso em qualquer dispositivo',
];

export default function AuthPage() {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [mode, setMode]                  = useState<'login' | 'signup'>('signup');
  const [email, setEmail]                = useState('');
  const [password, setPassword]          = useState('');
  const [loading, setLoading]            = useState(false);
  const [googleLoading, setGoogleLoading]= useState(false);
  const [error, setError]                = useState<string | null>(null);
  const [success, setSuccess]            = useState<string | null>(null);

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        setSuccess('Conta criada! Verifique seu e-mail para confirmar o cadastro.');
      }
    }
    setLoading(false);
  };

  return (
    <div style={s.page}>
      <div style={s.card}>

        {/* Brand */}
        <div style={s.brand}>
          <div style={s.brandIcon}><AudioWaveform size={22} /></div>
          <div>
            <div style={s.brandTitle}>Domínio do Timbre</div>
            <div style={s.brandSub}>LAB V3.0 PRO</div>
          </div>
        </div>

        {/* Headline */}
        <h1 style={s.headline}>
          Domine o EQ e o timbre<br />
          <span style={s.headlineAccent}>como um engenheiro de som</span>
        </h1>
        <p style={s.sub}>
          Acesso completo por apenas <strong style={{ color: '#EC9A29' }}>R$19,90/ano</strong>.
          Crie sua conta em 1 clique e libere tudo.
        </p>

        {/* Benefits */}
        <ul style={s.benefits}>
          {BENEFITS.map((b, i) => (
            <li key={i} style={s.benefit}>{b}</li>
          ))}
        </ul>

        {/* Google CTA — primary */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading}
          style={s.googleBtn}
        >
          {googleLoading ? (
            <span style={s.spinner} />
          ) : (
            <GoogleIcon />
          )}
          <span>{googleLoading ? 'Redirecionando...' : 'Entrar com Google — é grátis e rápido'}</span>
        </button>

        <p style={s.hint}>
          Sem senha para lembrar. Um clique e pronto.
        </p>

        {/* Divider */}
        <div style={s.divider}>
          <span style={s.dividerLine} />
          <span style={s.dividerText}>prefere usar e-mail?</span>
          <span style={s.dividerLine} />
        </div>

        {/* Email toggle */}
        <button
          type="button"
          onClick={() => { setShowEmailForm(v => !v); setError(null); setSuccess(null); }}
          style={s.toggleEmailBtn}
        >
          {showEmailForm ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          {showEmailForm ? 'Fechar formulário' : 'Cadastrar / entrar com e-mail'}
        </button>

        {/* Email form — collapsible */}
        {showEmailForm && (
          <form onSubmit={handleSubmit} style={s.form}>

            {/* Mode switch */}
            <div style={s.modeSwitch}>
              <button
                type="button"
                onClick={() => { setMode('signup'); setError(null); setSuccess(null); }}
                style={{ ...s.modeSwitchBtn, ...(mode === 'signup' ? s.modeSwitchActive : {}) }}
              >
                Criar conta
              </button>
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
                style={{ ...s.modeSwitchBtn, ...(mode === 'login' ? s.modeSwitchActive : {}) }}
              >
                Já tenho conta
              </button>
            </div>

            <div style={s.field}>
              <div style={s.inputWrap}>
                <Mail size={16} style={s.inputIcon} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  style={s.input}
                />
              </div>
            </div>

            <div style={s.field}>
              <div style={s.inputWrap}>
                <Lock size={16} style={s.inputIcon} />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="mínimo 6 caracteres"
                  required
                  minLength={6}
                  style={s.input}
                />
              </div>
            </div>

            {error && (
              <div style={s.errorBox}>
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            {success && (
              <div style={s.successBox}>{success}</div>
            )}

            <button type="submit" disabled={loading} style={s.emailBtn}>
              {loading ? 'Aguarde...' : mode === 'signup' ? 'Criar conta com e-mail' : 'Entrar com e-mail'}
            </button>
          </form>
        )}

        {/* Trust line */}
        <p style={s.trust}>
          🔒 Pagamento 100% seguro via Mercado Pago · PIX · Cartão · Boleto
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(236,154,41,0.3), 0 4px 24px rgba(0,0,0,0.4); }
          50%       { box-shadow: 0 0 36px rgba(236,154,41,0.55), 0 4px 24px rgba(0,0,0,0.4); }
        }
      `}</style>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', background: '#0A0A0C', padding: '1.5rem',
  },
  card: {
    background: '#161925', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '24px', padding: '2.5rem', width: '100%', maxWidth: '460px',
    boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
  },

  // Brand
  brand: { display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.75rem' },
  brandIcon: {
    width: 44, height: 44, background: '#EC9A29', borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#0A0A0C', boxShadow: '0 0 20px rgba(236,154,41,0.35)', flexShrink: 0,
  },
  brandTitle: { fontWeight: 700, fontSize: '1rem', color: '#F8FAFC' },
  brandSub: { fontSize: '0.65rem', color: '#EC9A29', fontWeight: 700, letterSpacing: '0.08em', marginTop: 2 },

  // Headline
  headline: {
    fontSize: '1.55rem', fontWeight: 800, color: '#F8FAFC',
    lineHeight: 1.25, marginBottom: '0.75rem',
  },
  headlineAccent: { color: '#EC9A29' },
  sub: { fontSize: '0.9rem', color: '#94A3B8', marginBottom: '1.5rem', lineHeight: 1.6 },

  // Benefits
  benefits: {
    listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.45rem',
    marginBottom: '2rem', padding: 0,
  },
  benefit: { fontSize: '0.85rem', color: '#CBD5E1' },

  // Google button — BIG primary CTA
  googleBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
    width: '100%', background: '#ffffff', color: '#111',
    border: 'none', borderRadius: '14px', padding: '1rem 1.25rem',
    fontWeight: 700, fontSize: '1rem', cursor: 'pointer', fontFamily: 'inherit',
    animation: 'pulse-glow 2.5s ease-in-out infinite',
    boxShadow: '0 0 20px rgba(236,154,41,0.3), 0 4px 24px rgba(0,0,0,0.4)',
    transition: 'transform 0.15s',
  },
  spinner: {
    display: 'inline-block', width: 20, height: 20,
    border: '2.5px solid rgba(0,0,0,0.2)', borderTopColor: '#4285F4',
    borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0,
  },
  hint: { textAlign: 'center', fontSize: '0.78rem', color: '#64748B', margin: '0.65rem 0 1.25rem' },

  // Divider
  divider: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' },
  dividerLine: { flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' },
  dividerText: { fontSize: '0.75rem', color: '#475569', whiteSpace: 'nowrap' },

  // Email toggle button
  toggleEmailBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
    width: '100%', background: 'transparent',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px',
    padding: '0.65rem', color: '#94A3B8', fontSize: '0.82rem',
    cursor: 'pointer', fontFamily: 'inherit', marginBottom: '0',
  },

  // Email form
  form: { display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '1rem' },
  modeSwitch: { display: 'flex', background: '#10121A', borderRadius: 10, padding: 4, gap: 4 },
  modeSwitchBtn: {
    flex: 1, background: 'transparent', border: 'none', borderRadius: 8,
    padding: '0.5rem', color: '#64748B', fontSize: '0.82rem', fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
  },
  modeSwitchActive: { background: '#1E2333', color: '#F8FAFC' },
  field: { display: 'flex', flexDirection: 'column' },
  inputWrap: { position: 'relative' },
  inputIcon: {
    position: 'absolute', left: 14, top: '50%',
    transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none',
  },
  input: {
    width: '100%', background: '#10121A',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px',
    padding: '0.75rem 1rem 0.75rem 2.75rem',
    color: '#F8FAFC', fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 8, padding: '0.7rem 1rem', color: '#EF4444', fontSize: '0.83rem',
  },
  successBox: {
    background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
    borderRadius: 8, padding: '0.7rem 1rem', color: '#10B981', fontSize: '0.83rem',
  },
  emailBtn: {
    background: '#EC9A29', color: '#0A0A0C', border: 'none', borderRadius: '10px',
    padding: '0.85rem', fontWeight: 700, fontSize: '0.95rem',
    cursor: 'pointer', fontFamily: 'inherit', marginTop: '0.25rem',
  },

  // Trust
  trust: {
    textAlign: 'center', fontSize: '0.73rem', color: '#475569',
    marginTop: '1.75rem', lineHeight: 1.6,
  },
};
