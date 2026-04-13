import React, { useState, useEffect } from 'react';
import { AudioWaveform, CheckCircle, LogOut, Loader } from 'lucide-react';
import { type User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

const FEATURES = [
  { icon: '🎧', text: 'Audiobook com 8 capítulos narrados' },
  { icon: '📖', text: 'Ebook completo — leitura no navegador' },
  { icon: '🎚️', text: 'Frequency Lab interativo com áudio real' },
  { icon: '👂', text: 'Treino de Ouvido gamificado — 10 rodadas' },
  { icon: '📝', text: 'Quiz de Teoria com pontuação' },
  { icon: '🍳', text: 'Receitas de EQ profissionais' },
  { icon: '🏆', text: 'Ranking global de jogadores' },
  { icon: '📱', text: 'Acesso em qualquer dispositivo, para sempre' },
];

export default function PaymentWall({ user }: { user: User }) {
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('payment_status');
    if (status === 'approved') {
      setChecking(true);
      window.history.replaceState({}, '', window.location.pathname);
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        const { data } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('user_id', user.id)
          .single();
        if (data?.status === 'active') {
          clearInterval(interval);
          window.location.reload();
        }
        if (attempts >= 10) {
          clearInterval(interval);
          setChecking(false);
        }
      }, 1500);
    }
  }, [user.id]);

  const handlePay = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-preference`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            user_id:    user.id,
            user_email: user.email,
            app_url:    window.location.origin,
          }),
        }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      window.location.href = data.init_point;
    } catch (e: any) {
      setError(e.message || 'Erro ao iniciar pagamento. Tente novamente.');
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={s.checkingIcon}>
            <Loader size={36} color="#EC9A29" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
          <h2 style={{ ...s.headline, textAlign: 'center', fontSize: '1.3rem' }}>
            Confirmando seu pagamento...
          </h2>
          <p style={{ ...s.sub, textAlign: 'center' }}>
            Aguarde enquanto verificamos sua compra. Isso leva alguns segundos.
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

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
          Olá, {user.email?.split('@')[0]}! 👋<br />
          <span style={s.headlineAccent}>Falta só 1 passo para o acesso completo</span>
        </h1>
        <p style={s.sub}>
          Tudo que você precisa para dominar o timbre, o EQ e a mixagem —
          por menos que um cafezinho por mês.
        </p>

        {/* Features */}
        <ul style={s.features}>
          {FEATURES.map((f, i) => (
            <li key={i} style={s.feature}>
              <CheckCircle size={15} color="#10B981" style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                <strong style={{ color: '#F8FAFC' }}>{f.icon}</strong>{' '}
                {f.text}
              </span>
            </li>
          ))}
        </ul>

        {/* Price */}
        <div style={s.priceBox}>
          <div style={s.priceTop}>ACESSO COMPLETO POR 1 ANO</div>
          <div style={s.priceRow}>
            <span style={s.priceCurrency}>R$</span>
            <span style={s.priceValue}>19</span>
            <span style={s.priceCents}>,90</span>
          </div>
          <div style={s.priceMonthly}>menos de R$2/mês · pague uma vez</div>
        </div>

        {error && <div style={s.errorBox}>{error}</div>}

        {/* Pay CTA */}
        <button onClick={handlePay} disabled={loading} style={s.payBtn}>
          {loading ? (
            <>
              <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
              Aguarde...
            </>
          ) : (
            <>
              <img
                src="https://http2.mlstatic.com/frontend-assets/mp-web-navigation/ui-navigation/6.6.88/mercadopago/logo__small@2x.png"
                alt="MP" style={{ width: 22, height: 22, borderRadius: 4 }}
              />
              Quero acesso — Pagar R$19,90
            </>
          )}
        </button>

        <p style={s.payHint}>PIX · Cartão de crédito · Boleto bancário</p>
        <p style={s.trust}>🔒 Pagamento 100% seguro via Mercado Pago</p>

        {/* Logout */}
        <button onClick={() => supabase.auth.signOut()} style={s.logoutBtn}>
          <LogOut size={13} /> Sair da conta ({user.email})
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(0,158,227,0.3), 0 4px 20px rgba(0,0,0,0.4); }
          50%       { box-shadow: 0 0 36px rgba(0,158,227,0.55), 0 4px 20px rgba(0,0,0,0.4); }
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
    borderRadius: '24px', padding: '2.5rem', width: '100%', maxWidth: '480px',
    boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
  },
  checkingIcon: { display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' },

  brand: { display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.75rem' },
  brandIcon: {
    width: 44, height: 44, background: '#EC9A29', borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#0A0A0C', boxShadow: '0 0 20px rgba(236,154,41,0.35)', flexShrink: 0,
  },
  brandTitle: { fontWeight: 700, fontSize: '1rem', color: '#F8FAFC' },
  brandSub: { fontSize: '0.65rem', color: '#EC9A29', fontWeight: 700, letterSpacing: '0.08em', marginTop: 2 },

  headline: {
    fontSize: '1.45rem', fontWeight: 800, color: '#F8FAFC',
    lineHeight: 1.3, marginBottom: '0.75rem',
  },
  headlineAccent: { color: '#EC9A29' },
  sub: { fontSize: '0.875rem', color: '#94A3B8', marginBottom: '1.5rem', lineHeight: 1.65 },

  features: { listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.55rem', marginBottom: '1.75rem' },
  feature: { display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.875rem', color: '#CBD5E1' },

  priceBox: {
    background: 'rgba(236,154,41,0.07)', border: '1px solid rgba(236,154,41,0.2)',
    borderRadius: 16, padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'center',
  },
  priceTop: { fontSize: '0.65rem', fontWeight: 700, color: '#EC9A29', letterSpacing: '0.1em', marginBottom: '0.5rem' },
  priceRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: '0.15rem' },
  priceCurrency: { fontSize: '1.4rem', fontWeight: 700, color: '#EC9A29', marginTop: '0.6rem' },
  priceValue: { fontSize: '3.5rem', fontWeight: 900, color: '#EC9A29', lineHeight: 1 },
  priceCents: { fontSize: '1.4rem', fontWeight: 700, color: '#EC9A29', marginTop: '0.6rem' },
  priceMonthly: { fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.4rem' },

  errorBox: {
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 8, padding: '0.75rem 1rem', color: '#EF4444',
    fontSize: '0.85rem', marginBottom: '1rem',
  },

  payBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.65rem',
    width: '100%', background: '#009ee3', color: '#fff', border: 'none',
    borderRadius: '14px', padding: '1rem', fontWeight: 700, fontSize: '1.05rem',
    cursor: 'pointer', fontFamily: 'inherit', marginBottom: '0.65rem',
    animation: 'pulse-glow 2.5s ease-in-out infinite',
    boxShadow: '0 0 20px rgba(0,158,227,0.3), 0 4px 20px rgba(0,0,0,0.4)',
  },
  payHint: { textAlign: 'center', fontSize: '0.78rem', color: '#64748B', marginBottom: '0.4rem' },
  trust: { textAlign: 'center', fontSize: '0.75rem', color: '#475569', marginBottom: '1.5rem' },

  logoutBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
    width: '100%', background: 'none', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 8, padding: '0.6rem', color: '#475569', fontSize: '0.75rem',
    cursor: 'pointer', fontFamily: 'inherit',
  },
};
