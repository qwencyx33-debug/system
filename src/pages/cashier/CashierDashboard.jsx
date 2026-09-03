import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Receipt, LogOut, Search, ShieldCheck, Eye, X,
  Banknote, CreditCard, ArrowRightCircle, Shield, Phone, MapPin, Calendar,
  PlusCircle, LayoutDashboard, Clock, CheckCircle2, TrendingUp, Wallet,
  ChevronRight, Users, FileText, Loader2, RefreshCw, Hash, Zap,
  Building2, Smartphone, Truck, History, ListChecks, ArrowRight,
  AlertTriangle, Flame, CircleDot, ImageIcon, BadgeCheck, Sparkles, SunMedium,
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import PaymentProcess from './PaymentProcess';
import PaymentHistory from './PaymentHistory';

/* ═══════════════════════════════════════════════════════════
   DESIGN TOKENS
═══════════════════════════════════════════════════════════ */
const C = {
  bg:       '#020617',
  surface:  '#060e18',
  panel:    '#0b1623',
  border:   'rgba(255,255,255,0.06)',
  borderHi: 'rgba(255,255,255,0.12)',
  gold:     '#EAB308',
  goldDim:  'rgba(234,179,8,0.12)',
  goldGlow: 'rgba(234,179,8,0.25)',
  navy:     '#0f2557',
  navyLight:'#16346f',
  emerald:  '#10b981',
  blue:     '#60a5fa',
  violet:   '#a78bfa',
  orange:   '#fb923c',
  rose:     '#f43f5e',
  muted:    '#475569',
  sub:      '#94a3b8',
  text:     '#e2e8f0',
  white:    '#ffffff',
};

const swalTheme = { background: '#031418', color: '#fff', confirmButtonColor: '#EAB308' };
const peso = n => `₱${(Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

/* ═══════════════════════════════════════════════════════════
   WORKFLOW HELPERS  (derived purely from existing columns —
   status, qc_status, payment_status, completed_at)
═══════════════════════════════════════════════════════════ */
const STAGE_LABELS = ['Appointment', 'Service Finished', 'QC Approved', 'Ready for Payment', 'Paid'];
const STAGE_ICONS  = [Calendar, CheckCircle2, ShieldCheck, Wallet, BadgeCheck];

function getStage(appt) {
  if (appt.payment_status === 'paid') return 4;
  const qc = (appt.qc_status || '').toLowerCase();
  if (qc.includes('approve')) return 3; // QC approved == ready for cashier to collect
  const status = (appt.status || '').toLowerCase();
  if (status.includes('finish') || status.includes('complet') || appt.completed_at) return 1;
  return 0;
}

function isDownpaymentPending(t) {
  return (Number(t.downpayment_paid) || 0) <= 0;
}

function normalizeMethod(raw) {
  const m = (raw || '').toLowerCase();
  if (m.includes('gcash')) return 'GCash';
  if (m.includes('cash')) return 'Cash';
  if (m.includes('bank')) return 'Bank';
  if (m.includes('cod')) return 'COD';
  return null;
}

function todayStr() {
  return new Date().toDateString();
}

/* ═══════════════════════════════════════════════════════════
   TINY PRIMITIVES
═══════════════════════════════════════════════════════════ */
const Badge = ({ children, variant = 'amber' }) => {
  const styles = {
    amber: { background: 'rgba(234,179,8,0.1)', color: '#EAB308', border: '1px solid rgba(234,179,8,0.2)' },
    green: { background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' },
    blue:  { background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' },
    red:   { background: 'rgba(244,63,94,0.1)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)' },
    violet:{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)' },
  };
  return (
    <span style={{
      ...styles[variant], display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 9px', borderRadius: 6, fontSize: 9.5, fontWeight: 800,
      letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>{children}</span>
  );
};

const Skeleton = ({ w = '100%', h = 16, r = 8 }) => (
  <div style={{
    width: w, height: h, borderRadius: r,
    background: 'linear-gradient(90deg, #0b1623 25%, #111f30 50%, #0b1623 75%)',
    backgroundSize: '200% 100%', animation: 'shimmer 1.6s infinite',
  }} />
);

const CountUp = ({ value, prefix = '', duration = 0.9 }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf; const start = performance.now(); const from = display;
    const to = Number(value) || 0;
    const tick = now => {
      const p = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <>{prefix}{display.toLocaleString()}</>;
};

/* ═══════════════════════════════════════════════════════════
   AMBIENT BACKGROUND  (purely decorative, GPU-friendly)
═══════════════════════════════════════════════════════════ */
const AmbientBackground = () => (
  <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
    <div style={{
      position: 'absolute', top: '-12%', left: '8%', width: 560, height: 560, borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(234,179,8,0.10) 0%, rgba(234,179,8,0) 68%)',
      animation: 'driftA 22s ease-in-out infinite', willChange: 'transform',
    }} />
    <div style={{
      position: 'absolute', top: '18%', right: '2%', width: 480, height: 480, borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(22,52,111,0.35) 0%, rgba(22,52,111,0) 70%)',
      animation: 'driftB 26s ease-in-out infinite', willChange: 'transform',
    }} />
    <div style={{
      position: 'absolute', bottom: '-16%', left: '32%', width: 620, height: 620, borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(96,165,250,0.06) 0%, rgba(96,165,250,0) 70%)',
      animation: 'driftA 30s ease-in-out infinite reverse', willChange: 'transform',
    }} />
  </div>
);

/* ═══════════════════════════════════════════════════════════
   HERO HEADER  (command-center welcome — dashboard view only)
═══════════════════════════════════════════════════════════ */
const HeroHeader = ({ loading, readyToCollect, expectedRevenue, dateLabel }) => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

  return (
    <motion.section
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        position: 'relative', overflow: 'hidden', borderRadius: 22,
        border: `1px solid ${C.border}`,
        background: `linear-gradient(135deg, ${C.navy} 0%, #0a1830 46%, ${C.bg} 100%)`,
        padding: '30px 32px', boxShadow: '0 18px 46px rgba(0,0,0,0.45)',
      }}
    >
      {/* animated ambient glow inside the hero */}
      <motion.div
        aria-hidden="true"
        animate={{ opacity: [0.5, 0.85, 0.5], scale: [1, 1.08, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', top: '-40%', right: '-8%', width: 420, height: 420, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(234,179,8,0.22) 0%, rgba(234,179,8,0) 70%)',
          pointerEvents: 'none',
        }}
      />
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(60% 100% at 0% 0%, rgba(96,165,250,0.08), transparent 60%)',
      }} />

      <div style={{
        position: 'relative', display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-end', flexWrap: 'wrap', gap: 24,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <SunMedium size={14} color={C.gold} />
            <span style={{ fontSize: 10.5, fontWeight: 800, color: C.gold, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              {greeting}
            </span>
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: C.white, letterSpacing: '-0.03em', lineHeight: 1.08 }}>
            Cashier Command Center
          </h1>
          <p style={{ fontSize: 12, color: C.sub, fontWeight: 600, marginTop: 8, letterSpacing: '0.01em' }}>
            {dateLabel}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{
            background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)',
            borderRadius: 16, padding: '14px 22px', minWidth: 160,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Zap size={12} color={C.gold} />
              <span style={{ fontSize: 9, fontWeight: 800, color: C.gold, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Ready Now</span>
            </div>
            <p style={{ fontSize: 24, fontWeight: 900, color: C.white, letterSpacing: '-0.02em' }}>
              {loading ? '—' : <CountUp value={readyToCollect} />} <span style={{ fontSize: 12, fontWeight: 700, color: C.sub }}>payments</span>
            </p>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`,
            borderRadius: 16, padding: '14px 22px', minWidth: 190,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Wallet size={12} color={C.blue} />
              <span style={{ fontSize: 9, fontWeight: 800, color: C.sub, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Waiting for Collection</span>
            </div>
            <p style={{ fontSize: 24, fontWeight: 900, color: C.white, letterSpacing: '-0.02em' }}>
              {loading ? '—' : <CountUp value={expectedRevenue} prefix="₱" />}
            </p>
          </div>
        </div>
      </div>
    </motion.section>
  );
};

/* ═══════════════════════════════════════════════════════════
   SIDEBAR NAV
═══════════════════════════════════════════════════════════ */
const NavItem = ({ icon: Icon, label, active, onClick, badge }) => (
  <button
    onClick={onClick}
    style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 12px', borderRadius: 10, cursor: 'pointer', border: 'none',
      background: active ? 'rgba(234,179,8,0.1)' : 'transparent',
      color: active ? C.gold : C.muted, transition: 'all 0.18s',
      fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
      position: 'relative',
    }}
    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = C.text; } }}
    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.muted; } }}
  >
    {active && (
      <motion.span layoutId="navIndicator" style={{
        position: 'absolute', left: 0, top: '50%', translateY: '-50%',
        width: 3, height: 18, background: C.gold, borderRadius: '0 3px 3px 0',
        boxShadow: `0 0 10px ${C.gold}`, marginTop: -9,
      }} />
    )}
    <Icon size={15} style={{ flexShrink: 0 }} />
    <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
    {badge != null && badge > 0 && (
      <span style={{
        background: C.gold, color: C.bg, borderRadius: 100,
        fontSize: 9, fontWeight: 900, padding: '1px 6px', minWidth: 18, textAlign: 'center',
      }}>{badge}</span>
    )}
  </button>
);

/* ═══════════════════════════════════════════════════════════
   KPI CARD  (Business Summary)
═══════════════════════════════════════════════════════════ */
const KpiCard = ({ label, value, icon: Icon, sub, accent = false, loading, isCurrency = false }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -4, transition: { type: 'spring', stiffness: 320, damping: 22 } }}
    style={{
      background: accent ? `linear-gradient(135deg, #c99a04 0%, #EAB308 60%, #f0c429 100%)` : C.panel,
      border: accent ? 'none' : `1px solid ${C.border}`,
      borderRadius: 16, padding: '18px 18px',
      boxShadow: accent ? `0 8px 32px rgba(234,179,8,0.22)` : '0 2px 12px rgba(0,0,0,0.3)',
      transition: 'box-shadow 0.18s',
      cursor: 'default',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
      <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: accent ? 'rgba(2,6,23,0.65)' : C.muted }}>
        {label}
      </span>
      <motion.div
        whileHover={{ rotate: -8, scale: 1.12 }}
        transition={{ type: 'spring', stiffness: 350, damping: 12 }}
        style={{ background: accent ? 'rgba(2,6,23,0.12)' : C.goldDim, borderRadius: 8, padding: 6, color: accent ? C.bg : C.gold }}
      >
        <Icon size={13} />
      </motion.div>
    </div>
    {loading ? <Skeleton h={24} r={6} /> : (
      <p style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: accent ? C.bg : C.white, lineHeight: 1 }}>
        <CountUp value={value} prefix={isCurrency ? '₱' : ''} />
      </p>
    )}
    {sub && !loading && (
      <p style={{ fontSize: 9.5, color: accent ? 'rgba(2,6,23,0.55)' : C.muted, marginTop: 6, fontWeight: 600 }}>{sub}</p>
    )}
  </motion.div>
);

/* ═══════════════════════════════════════════════════════════
   PAYMENT ACTION CARD  (Section 1 — the hero component)
═══════════════════════════════════════════════════════════ */
const PaymentActionCard = ({ t, index, onView, onCollect }) => {
  const stage = getStage(t);
  const outstanding = (Number(t.price) || 0) - (Number(t.downpayment_paid) || 0);
  const ready = stage === 3;
  const priority = (t.priority || '').toLowerCase();
  const isUrgent = priority === 'high' || priority === 'urgent';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: Math.min(index, 8) * 0.045, type: 'spring', stiffness: 260, damping: 24 }}
      whileHover={{ y: -4 }}
      onClick={() => onView(t)}
      className={ready ? 'action-card-ready' : ''}
      style={{
        position: 'relative', cursor: 'pointer', overflow: 'hidden',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
        backdropFilter: 'blur(10px)',
        border: `1px solid ${ready ? 'rgba(234,179,8,0.35)' : C.border}`,
        borderRadius: 18, padding: '18px 18px 16px',
        boxShadow: ready
          ? '0 10px 36px rgba(234,179,8,0.14), 0 2px 10px rgba(0,0,0,0.4)'
          : '0 4px 18px rgba(0,0,0,0.3)',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}
    >
      {ready && (
        <>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 18, pointerEvents: 'none',
            background: 'radial-gradient(120% 60% at 100% 0%, rgba(234,179,8,0.10), transparent 60%)',
          }} />
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 18, pointerEvents: 'none',
            boxShadow: 'inset 0 0 0 1px rgba(234,179,8,0.18)',
            animation: 'borderPulse 2.6s ease-in-out infinite',
          }} />
        </>
      )}

      {/* Top row: avatar + name + priority */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #1e3050, #0f1f35)', border: `1px solid ${C.borderHi}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 900, color: C.gold,
          }}>
            {(t.full_name?.[0] || '?').toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13.5, fontWeight: 800, color: C.white, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {t.full_name || 'Unnamed Customer'}
            </p>
            <p style={{ fontSize: 10.5, color: C.sub, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {t.service_type || 'Standard Service'}
            </p>
          </div>
        </div>
        {isUrgent && (
          <span title="High priority" style={{ color: C.rose, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
            <Flame size={13} />
          </span>
        )}
      </div>

      {/* Schedule */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: C.muted, fontWeight: 600 }}>
        <Calendar size={11} />
        <span>
          {t.schedule_date ? new Date(t.schedule_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : 'No date'}
          {t.appointment_time ? ` · ${t.appointment_time}` : ''}
        </span>
      </div>

      {/* Workflow status chip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {STAGE_LABELS.slice(0, 4).map((label, i) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: i < 3 ? '0 0 auto' : '0 0 auto' }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: i <= stage ? C.gold : 'rgba(255,255,255,0.12)',
              boxShadow: i <= stage ? `0 0 6px ${C.gold}` : 'none',
            }} />
            {i < 3 && <span style={{ width: 10, height: 1, background: i < stage ? C.gold : 'rgba(255,255,255,0.1)' }} />}
          </div>
        ))}
        <span style={{ fontSize: 9.5, fontWeight: 800, color: ready ? C.gold : C.sub, textTransform: 'uppercase', letterSpacing: '0.06em', marginLeft: 2 }}>
          {STAGE_LABELS[stage]}
        </span>
      </div>

      {/* Amount due */}
      <div style={{
        background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12,
        padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 9.5, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Amount Due</span>
        <span style={{ fontSize: 18, fontWeight: 900, color: C.gold, letterSpacing: '-0.02em' }}>{peso(outstanding)}</span>
      </div>

      {/* Meta row: method / reference */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <Badge variant={ready ? 'amber' : 'blue'}>{ready ? 'Ready for Payment' : 'In Progress'}</Badge>
        {isDownpaymentPending(t) && <Badge variant="red">No Downpayment</Badge>}
        {t.payment_method && <Badge variant="violet">{t.payment_method}</Badge>}
        {t.reference_number && (
          <span style={{ fontSize: 9.5, color: C.muted, display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 600 }}>
            <Hash size={10} /> {t.reference_number}
          </span>
        )}
      </div>

      {/* CTA */}
      <button
        onClick={e => { e.stopPropagation(); onCollect(t); }}
        className="cta-shine"
        style={{
          marginTop: 2, background: C.gold, color: C.bg, border: 'none',
          borderRadius: 12, padding: '12px 0', width: '100%', position: 'relative', overflow: 'hidden',
          fontSize: 11.5, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          cursor: 'pointer', boxShadow: `0 6px 20px ${C.goldGlow}`, transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 28px rgba(234,179,8,0.45)'; e.currentTarget.style.transform = 'translateY(-1px) scale(1.01)'; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = `0 6px 20px ${C.goldGlow}`; e.currentTarget.style.transform = 'translateY(0) scale(1)'; }}
      >
        <Wallet size={14} /> Collect Payment
      </button>
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════
   WORKFLOW STEPPER  (Section 3)
═══════════════════════════════════════════════════════════ */
const WorkflowStepper = ({ counts }) => (
  <section style={{
    background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18,
    padding: '22px 26px', boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
      <div style={{ width: 3, height: 16, background: C.gold, borderRadius: 3, boxShadow: `0 0 10px ${C.gold}` }} />
      <span style={{ fontSize: 12, fontWeight: 800, color: C.white }}>Payment Workflow</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'flex-start', overflowX: 'auto', gap: 0 }}>
      {STAGE_LABELS.map((label, i) => {
        const Icon = STAGE_ICONS[i];
        const active = counts[i] > 0;
        return (
          <React.Fragment key={label}>
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 96 }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: active ? C.goldDim : 'rgba(255,255,255,0.03)',
                border: `1.5px solid ${active ? 'rgba(234,179,8,0.45)' : C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: active ? C.gold : C.muted,
                boxShadow: active ? `0 0 16px ${C.goldGlow}` : 'none',
              }}>
                <Icon size={18} />
              </div>
              <p style={{ fontSize: 9.5, fontWeight: 800, color: active ? C.text : C.muted, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {label}
              </p>
              <p style={{ fontSize: 15, fontWeight: 900, color: active ? C.gold : C.muted }}>{counts[i]}</p>
            </motion.div>
            {i < STAGE_LABELS.length - 1 && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', minWidth: 24, paddingTop: 22 }}>
                <ArrowRight size={14} color={C.muted} style={{ margin: '0 auto' }} />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  </section>
);

/* ═══════════════════════════════════════════════════════════
   PAYMENT METHOD SUMMARY  (Section 4)
═══════════════════════════════════════════════════════════ */
const METHOD_META = {
  Cash:  { icon: Banknote,   color: C.emerald },
  GCash: { icon: Smartphone, color: C.blue },
  Bank:  { icon: Building2,  color: C.violet },
  COD:   { icon: Truck,      color: C.orange },
};

const MethodCard = ({ name, count, amount, loading }) => {
  const meta = METHOD_META[name];
  const Icon = meta.icon;
  return (
    <motion.div
      whileHover={{ y: -3 }}
      style={{
        background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14,
        padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10,
        borderTop: `2px solid ${meta.color}55`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ background: `${meta.color}1F`, color: meta.color, borderRadius: 8, padding: 6, display: 'flex' }}>
          <Icon size={13} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 800, color: C.text }}>{name}</span>
      </div>
      {loading ? <Skeleton h={20} r={6} /> : (
        <>
          <p style={{ fontSize: 17, fontWeight: 900, color: C.white, letterSpacing: '-0.02em' }}>
            <CountUp value={amount} prefix="₱" />
          </p>
          <p style={{ fontSize: 9.5, color: C.muted, fontWeight: 600 }}>{count} transaction{count === 1 ? '' : 's'}</p>
        </>
      )}
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════
   RECENT PAYMENT ACTIVITY  (Section 5)
═══════════════════════════════════════════════════════════ */
const ActivityTimeline = ({ items, loading }) => (
  <section style={{
    background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18,
    padding: '22px 24px', boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
      <div style={{ width: 3, height: 16, background: C.gold, borderRadius: 3, boxShadow: `0 0 10px ${C.gold}` }} />
      <span style={{ fontSize: 12, fontWeight: 800, color: C.white }}>Recent Payment Activity</span>
    </div>

    {loading ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[0, 1, 2].map(i => <Skeleton key={i} h={40} r={10} />)}
      </div>
    ) : items.length === 0 ? (
      <div style={{ padding: '30px 0', textAlign: 'center' }}>
        <p style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>No payments recorded yet.</p>
      </div>
    ) : (
      <div style={{ position: 'relative', paddingLeft: 20, maxHeight: 420, overflowY: 'auto' }}>
        <div style={{ position: 'absolute', left: 5, top: 6, bottom: 6, width: 1, background: C.border }} />
        {items.map((t, i) => {
          const when = t.completed_at || t.created_at;
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              whileHover={{ x: 2 }}
              className="timeline-row"
              style={{ position: 'relative', paddingBottom: i === items.length - 1 ? 0 : 18, borderRadius: 8 }}
            >
              <span style={{
                position: 'absolute', left: -20, top: 3, width: 10, height: 10, borderRadius: '50%',
                background: C.gold, boxShadow: `0 0 8px ${C.goldGlow}`, border: `2px solid ${C.surface}`,
                animation: i === 0 ? 'dotGlow 2s ease-in-out infinite' : 'none',
              }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: C.text }}>
                    <span style={{ color: C.emerald }}>Payment received</span> — {t.full_name || 'Customer'}
                  </p>
                  <p style={{ fontSize: 10, color: C.muted, marginTop: 2, fontWeight: 600 }}>
                    {peso(t.price)} {t.payment_method ? `via ${t.payment_method}` : ''}
                  </p>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    {t.receipt_image && <Badge variant="blue"><ImageIcon size={9} /> Receipt Uploaded</Badge>}
                    {t.reference_number && <Badge variant="green"><CheckCircle2 size={9} /> Reference Verified</Badge>}
                  </div>
                </div>
                <span style={{ fontSize: 9.5, color: C.muted, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {when ? new Date(when).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : ''}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    )}
  </section>
);

/* ═══════════════════════════════════════════════════════════
   QUICK ACTIONS  (Section 6)
═══════════════════════════════════════════════════════════ */
const QuickActionButton = ({ icon: Icon, label, sub, onClick, primary }) => (
  <motion.button
    whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}
    onClick={onClick}
    className={primary ? 'cta-shine' : ''}
    style={{
      flex: 1, minWidth: 180, textAlign: 'left', cursor: 'pointer', position: 'relative', overflow: 'hidden',
      background: primary ? `linear-gradient(135deg, #c99a04 0%, #EAB308 60%, #f0c429 100%)` : C.panel,
      border: primary ? 'none' : `1px solid ${C.border}`,
      borderRadius: 16, padding: '18px 18px',
      display: 'flex', flexDirection: 'column', gap: 10,
      boxShadow: primary ? `0 8px 28px rgba(234,179,8,0.25)` : '0 2px 12px rgba(0,0,0,0.3)',
    }}
  >
    <motion.div
      whileHover={{ scale: 1.1, rotate: -6 }}
      transition={{ type: 'spring', stiffness: 350, damping: 14 }}
      style={{
        width: 34, height: 34, borderRadius: 10,
        background: primary ? 'rgba(2,6,23,0.14)' : C.goldDim,
        color: primary ? C.bg : C.gold,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Icon size={16} />
    </motion.div>
    <div>
      <p style={{ fontSize: 12.5, fontWeight: 800, color: primary ? C.bg : C.white }}>{label}</p>
      <p style={{ fontSize: 10, fontWeight: 600, color: primary ? 'rgba(2,6,23,0.6)' : C.muted, marginTop: 2 }}>{sub}</p>
    </div>
  </motion.button>
);

/* ═══════════════════════════════════════════════════════════
   PAYMENT FORM  (used inside modal)
═══════════════════════════════════════════════════════════ */
const PaymentForm = ({ invoice, onConfirm, onCancel }) => {
  const outstanding = (Number(invoice.price) || 0) - (Number(invoice.downpayment_paid) || 0);
  const [details, setDetails] = useState({ amount: String(outstanding), method: 'Cash', refNo: '' });
  const received = Number(details.amount) || 0;
  const change = received - outstanding;
  const needsRef = details.method !== 'Cash';

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{
        background: 'rgba(234,179,8,0.06)', border: `1px solid rgba(234,179,8,0.2)`,
        borderRadius: 12, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Outstanding Balance</span>
        <span style={{ fontSize: 20, fontWeight: 900, color: C.gold, letterSpacing: '-0.02em' }}>{peso(outstanding)}</span>
      </div>

      <div>
        <label style={{ fontSize: 9, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: 8 }}>
          Amount Received (₱)
        </label>
        <input
          type="number" placeholder="0.00" value={details.amount}
          onChange={e => setDetails({ ...details, amount: e.target.value })}
          style={{
            width: '100%', background: C.surface, border: `1px solid ${C.borderHi}`,
            borderRadius: 12, padding: '14px 16px', fontSize: 22, fontWeight: 900,
            color: C.gold, outline: 'none', boxSizing: 'border-box', caretColor: C.gold,
          }}
          onFocus={e => e.target.style.borderColor = 'rgba(234,179,8,0.5)'}
          onBlur={e => e.target.style.borderColor = C.borderHi}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { label: 'Remaining', val: Math.max(0, outstanding - received), color: C.sub },
          { label: 'Change', val: change > 0 ? change : 0, color: C.emerald },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px' }}>
            <p style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{label}</p>
            <p style={{ fontSize: 15, fontWeight: 900, color }}>{val > 0 ? peso(val) : '—'}</p>
          </div>
        ))}
      </div>

      <div>
        <label style={{ fontSize: 9, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: 8 }}>
          Payment Method
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6 }}>
          {[
            { id: 'Cash', icon: Banknote },
            { id: 'GCash', icon: Smartphone },
            { id: 'Bank', icon: Building2 },
            { id: 'COD', icon: Truck },
          ].map(({ id, icon: Icon }) => (
            <button
              key={id} type="button" onClick={() => setDetails({ ...details, method: id })}
              style={{
                padding: '9px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                fontSize: 9.5, fontWeight: 800, letterSpacing: '0.02em',
                background: details.method === id ? C.gold : C.surface,
                color: details.method === id ? C.bg : C.muted,
                border: details.method === id ? 'none' : `1px solid ${C.border}`,
                transition: 'all 0.15s',
              }}
            >
              <Icon size={14} /> {id}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {needsRef && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <label style={{ fontSize: 9, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: 8 }}>
              Reference Number
            </label>
            <div style={{ position: 'relative' }}>
              <Hash size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
              <input
                type="text" placeholder="Transaction reference" value={details.refNo}
                onChange={e => setDetails({ ...details, refNo: e.target.value })}
                style={{
                  width: '100%', background: C.surface, border: `1px solid ${C.borderHi}`,
                  borderRadius: 10, padding: '11px 12px 11px 32px', fontSize: 12,
                  fontWeight: 600, color: C.text, outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(234,179,8,0.4)'}
                onBlur={e => e.target.style.borderColor = C.borderHi}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
        <button
          onClick={() => onConfirm(details)}
          style={{
            background: C.emerald, color: C.white, border: 'none',
            borderRadius: 12, padding: '14px 0', fontWeight: 900,
            fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 4px 16px rgba(16,185,129,0.25)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#0da674'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(16,185,129,0.35)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = C.emerald; e.currentTarget.style.boxShadow = '0 4px 16px rgba(16,185,129,0.25)'; }}
        >
          Confirm Payment <ArrowRightCircle size={15} />
        </button>
        <button
          type="button" onClick={onCancel}
          style={{
            background: 'none', border: 'none', color: C.muted, cursor: 'pointer',
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
            padding: '6px 0', transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = C.rose}
          onMouseLeave={e => e.currentTarget.style.color = C.muted}
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SIMPLE ROW TABLE  (used by Payment Process / Payment History)
═══════════════════════════════════════════════════════════ */
const RowTable = ({ rows, loading, mode, onView, searchRef }) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
      <thead>
        <tr style={{ borderBottom: `1px solid ${C.border}` }}>
          {['Customer', 'Service', 'Price', mode === 'history' ? 'Method' : 'Downpayment', 'Status', 'Action'].map((h, i) => (
            <th key={h} style={{
              padding: '10px 18px', textAlign: i === 5 ? 'right' : 'left',
              fontSize: 9, fontWeight: 800, color: C.muted, textTransform: 'uppercase',
              letterSpacing: '0.1em', background: 'rgba(255,255,255,0.01)', whiteSpace: 'nowrap',
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
              {[140, 180, 90, 90, 70, 80].map((w, j) => <td key={j} style={{ padding: '14px 18px' }}><Skeleton w={w} h={12} /></td>)}
            </tr>
          ))
        ) : rows.length === 0 ? (
          <tr><td colSpan={6}>
            <div style={{ padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ background: C.goldDim, borderRadius: '50%', padding: 18, color: C.gold }}>
                {mode === 'history' ? <History size={28} strokeWidth={1.5} /> : <ListChecks size={28} strokeWidth={1.5} />}
              </div>
              <p style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{mode === 'history' ? 'No completed payments' : 'Queue is clear'}</p>
              <p style={{ fontSize: 11, color: C.muted, maxWidth: 280, textAlign: 'center', lineHeight: 1.6 }}>
                {mode === 'history' ? 'Settled payments will appear here.' : 'All appointments are settled.'}
              </p>
            </div>
          </td></tr>
        ) : (
          rows.map((t, idx) => (
            <motion.tr
              key={t.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx, 10) * 0.02 }}
              style={{ borderBottom: `1px solid ${C.border}` }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <td style={{ padding: '13px 18px', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                    background: `linear-gradient(135deg, #1e3050, #0f1f35)`, border: `1px solid ${C.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: C.gold,
                  }}>{(t.full_name?.[0] || '?').toUpperCase()}</div>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{t.full_name}</p>
                    <p style={{ fontSize: 10, color: C.muted, fontWeight: 500 }}>{t.phone_number || '—'}</p>
                  </div>
                </div>
              </td>
              <td style={{ padding: '13px 18px', fontSize: 11, color: C.sub, maxWidth: 200 }}>
                <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.service_type || 'Standard Service'}</span>
              </td>
              <td style={{ padding: '13px 18px', fontSize: 13, fontWeight: 800, color: C.white, whiteSpace: 'nowrap' }}>{peso(t.price)}</td>
              <td style={{ padding: '13px 18px', fontSize: 12, fontWeight: 700, color: mode === 'history' ? C.text : C.emerald, whiteSpace: 'nowrap' }}>
                {mode === 'history' ? (t.payment_method || '—') : peso(t.downpayment_paid)}
              </td>
              <td style={{ padding: '13px 18px', whiteSpace: 'nowrap' }}>
                <Badge variant={mode === 'history' ? 'green' : 'amber'}>{mode === 'history' ? 'Paid' : STAGE_LABELS[getStage(t)]}</Badge>
              </td>
              <td style={{ padding: '13px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                <button
                  onClick={() => onView(t)}
                  style={{
                    background: C.goldDim, border: `1px solid rgba(234,179,8,0.22)`, borderRadius: 8,
                    padding: '7px 14px', cursor: 'pointer', fontSize: 10, fontWeight: 800, color: C.gold,
                    letterSpacing: '0.07em', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.gold; e.currentTarget.style.color = C.bg; }}
                  onMouseLeave={e => { e.currentTarget.style.background = C.goldDim; e.currentTarget.style.color = C.gold; }}
                >
                  <Eye size={12} /> View
                </button>
              </td>
            </motion.tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
const CashierDashboard = ({ onLogout }) => {
  const [transactions, setTransactions]       = useState([]);
  const [paidTransactions, setPaidTransactions] = useState([]);
  const [searchTerm, setSearchTerm]            = useState('');
  const [selectedInvoice, setSelectedInvoice]  = useState(null);
  const [isConfirming, setIsConfirming]        = useState(false);
  const [loading, setLoading]                  = useState(true);
  const [activeNav, setActiveNav]              = useState('dashboard');
  const [refreshing, setRefreshing]            = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    fetchPayments();
    const subscription = supabase
      .channel('realtime_payments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => { fetchPayments(); })
      .subscribe();
    return () => { supabase.removeChannel(subscription); };
  }, []);

  const fetchPayments = async (manual = false) => {
    if (manual) setRefreshing(true);
    const { data: pendingData } = await supabase
      .from('appointments').select('*')
      .neq('payment_status', 'paid')
      .neq('status', 'awaiting_manager')
      .order('priority', { ascending: false })
      .order('schedule_date', { ascending: true });

    const { data: paidData } = await supabase
      .from('appointments').select('*')
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: false });

    if (pendingData) setTransactions(pendingData);
    if (paidData) setPaidTransactions(paidData);
    setLoading(false);
    if (manual) setRefreshing(false);
  };

  /* ── Derived, real-data-only stats ── */
  const stats = useMemo(() => {
    const pending = transactions.length;
    const readyToCollect = transactions.filter(t => getStage(t) === 3).length;
    const pendingDownpayments = transactions.filter(isDownpaymentPending).length;
    const expectedRevenue = transactions.reduce((a, t) => a + ((Number(t.price) || 0) - (Number(t.downpayment_paid) || 0)), 0);
    const completed = paidTransactions.length;
    const today = todayStr();
    const collectedToday = paidTransactions
      .filter(t => new Date(t.completed_at || t.created_at || Date.now()).toDateString() === today)
      .reduce((a, t) => a + (Number(t.price) || 0), 0);
    return { pending, readyToCollect, pendingDownpayments, expectedRevenue, completed, collectedToday };
  }, [transactions, paidTransactions]);

  const stageCounts = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    transactions.forEach(t => { counts[getStage(t)]++; });
    counts[4] = paidTransactions.length;
    return counts;
  }, [transactions, paidTransactions]);

  const methodBreakdown = useMemo(() => {
    const map = { Cash: { count: 0, amount: 0 }, GCash: { count: 0, amount: 0 }, Bank: { count: 0, amount: 0 }, COD: { count: 0, amount: 0 } };
    paidTransactions.forEach(t => {
      const key = normalizeMethod(t.payment_method);
      if (key && map[key]) { map[key].count += 1; map[key].amount += Number(t.price) || 0; }
    });
    return map;
  }, [paidTransactions]);

  const actionQueue = useMemo(() => {
    return [...transactions].sort((a, b) => getStage(b) - getStage(a));
  }, [transactions]);

  const filteredProcess = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return transactions.filter(t =>
      t.full_name?.toLowerCase().includes(q) ||
      t.service_type?.toLowerCase().includes(q) ||
      t.phone_number?.toLowerCase().includes(q) ||
      t.reference_number?.toLowerCase().includes(q)
    );
  }, [transactions, searchTerm]);

  const filteredHistory = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return paidTransactions.filter(t =>
      t.full_name?.toLowerCase().includes(q) ||
      t.service_type?.toLowerCase().includes(q) ||
      t.phone_number?.toLowerCase().includes(q) ||
      t.reference_number?.toLowerCase().includes(q)
    );
  }, [paidTransactions, searchTerm]);

  const handleProcessPayment = async (id, details) => {
    if (details.amount === '' || details.amount === undefined || details.amount === null) {
      Swal.fire({ icon: 'error', title: 'Missing Amount', text: 'Please enter the received payment amount.', ...swalTheme });
      return;
    }
    const { error } = await supabase
      .from('appointments')
      .update({
        payment_status: 'paid',
        payment_method: details.method,
        payment_ref: details.refNo || null,
        reference_number: details.refNo || null,
        status: 'awaiting_manager',
      })
      .eq('id', id);

    if (error) {
      Swal.fire({ icon: 'error', title: 'Transaction Failed', text: error.message, ...swalTheme });
      return;
    }
    Swal.fire({ icon: 'success', title: 'Payment Recorded', text: 'Transaction sent for manager approval.', ...swalTheme, timer: 2000 });
    setIsConfirming(false);
    setSelectedInvoice(null);
    fetchPayments();
  };

  const handleLogoutClick = () => {
    Swal.fire({
      title: 'Sign out?', text: 'You will be logged out of Riontech.',
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#EAB308', cancelButtonColor: '#be123c',
      confirmButtonText: 'Sign Out', background: '#031418', color: '#fff',
    }).then(r => { if (r.isConfirmed) onLogout(); });
  };

  const openCollect = t => { setSelectedInvoice(t); setIsConfirming(true); };
  const openView = t => { setSelectedInvoice(t); setIsConfirming(false); };

  const handleCollectPaymentQuickAction = () => {
    if (actionQueue.length > 0) openCollect(actionQueue[0]);
    else setActiveNav('process');
  };
  const handleSearchQuickAction = () => {
    setActiveNav('process');
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const today = new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  /* ─────────────────── RENDER ─────────────────── */
  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", color: C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes driftA { 0%,100%{transform:translate(0,0)} 50%{transform:translate(30px,20px)} }
        @keyframes driftB { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-24px,26px)} }
        @keyframes borderPulse { 0%,100%{box-shadow:inset 0 0 0 1px rgba(234,179,8,0.14)} 50%{box-shadow:inset 0 0 0 1.5px rgba(234,179,8,0.34)} }
        @keyframes dotGlow { 0%,100%{box-shadow:0 0 8px rgba(234,179,8,0.35)} 50%{box-shadow:0 0 16px rgba(234,179,8,0.7)} }
        .cta-shine::after {
          content: ''; position: absolute; top: 0; left: -60%; width: 40%; height: 100%;
          background: linear-gradient(115deg, transparent, rgba(255,255,255,0.35), transparent);
          transform: skewX(-20deg); pointer-events: none;
        }
        .cta-shine:hover::after { animation: shineSweep 0.9s ease; }
        @keyframes shineSweep { from{left:-60%} to{left:130%} }
        .timeline-row { transition: background 0.15s; }
        .timeline-row:hover { background: rgba(255,255,255,0.025); }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        ::selection { background: #EAB308; color: #020617; }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; transition-duration: 0.001ms !important; }
        }
      `}</style>

      {/* ══════════════ SIDEBAR ══════════════ */}
      <aside style={{
        width: 220, background: C.surface, borderRight: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        position: 'sticky', top: 0, height: '100vh', flexShrink: 0, padding: '24px 14px', zIndex: 50,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px' }}>
            <div style={{ background: C.gold, padding: 8, borderRadius: 10, boxShadow: `0 0 18px ${C.goldGlow}`, display: 'flex' }}>
              <ShieldCheck size={17} color={C.bg} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 900, color: C.white, letterSpacing: '-0.03em', lineHeight: 1 }}>Riontech</div>
              <div style={{ fontSize: 8, fontWeight: 800, color: C.gold, letterSpacing: '0.22em', textTransform: 'uppercase', marginTop: 1 }}>Systems</div>
            </div>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <NavItem icon={LayoutDashboard} label="Dashboard"       active={activeNav === 'dashboard'} onClick={() => setActiveNav('dashboard')} />
            <NavItem icon={Zap}             label="Payment Process" active={activeNav === 'process'}   onClick={() => setActiveNav('process')} badge={stats.pending} />
            <NavItem icon={History}         label="Payment History" active={activeNav === 'history'}   onClick={() => setActiveNav('history')} />
          </nav>

          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 14px 12px' }}>
            <p style={{ fontSize: 8, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>Right now</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>Ready to Collect</span>
                <span style={{ fontSize: 13, fontWeight: 900, color: C.gold }}>{loading ? '—' : stats.readyToCollect}</span>
              </div>
              <div style={{ height: 1, background: C.border }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>Collected Today</span>
                <span style={{ fontSize: 11, fontWeight: 900, color: C.emerald }}>{loading ? '—' : peso(stats.collectedToday)}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, #1e293b, #0f172a)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 900, color: C.gold, border: `1px solid ${C.border}`, flexShrink: 0,
            }}>C</div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: C.text, whiteSpace: 'nowrap' }}>Cashier</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.emerald, display: 'inline-block', animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: 9, color: C.emerald, fontWeight: 600 }}>Online</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogoutClick}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px',
              borderRadius: 10, background: 'none', border: 'none', cursor: 'pointer',
              color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
              transition: 'all 0.15s', width: '100%',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(244,63,94,0.07)'; e.currentTarget.style.color = C.rose; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = C.muted; }}
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ══════════════ MAIN ══════════════ */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
        <header style={{
          padding: '0 36px', height: 64, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, zIndex: 40, background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${C.border}`,
        }}>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: C.white, letterSpacing: '-0.01em' }}>
              {activeNav === 'dashboard' ? 'Action Center' : activeNav === 'process' ? 'Payment Process' : 'Payment History'}
            </h2>
            <p style={{ fontSize: 10, color: C.muted, fontWeight: 600, marginTop: 1 }}>
              {activeNav === 'dashboard' && `${stats.readyToCollect} ready for payment now`}
              {activeNav === 'process' && `${filteredProcess.length} appointments in queue`}
              {activeNav === 'history' && `${filteredHistory.length} settled transactions`}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {(activeNav === 'process' || activeNav === 'history') && (
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={13} style={{ position: 'absolute', left: 12, color: C.muted, pointerEvents: 'none' }} />
                <input
                  ref={searchRef} type="text" placeholder="Search by name, service, phone..."
                  value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  style={{
                    background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10,
                    padding: '9px 14px 9px 34px', fontSize: 11, fontWeight: 600, color: C.text,
                    outline: 'none', width: 240, transition: 'border-color 0.15s',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(234,179,8,0.35)'}
                  onBlur={e => e.target.style.borderColor = C.border}
                />
              </div>
            )}
            <span style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>{today}</span>
            <button
              onClick={() => fetchPayments(true)}
              style={{
                background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8,
                padding: '6px 10px', color: C.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderHi; e.currentTarget.style.color = C.text; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}
              title="Refresh"
            >
              <RefreshCw size={13} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
            </button>
            <div style={{
              width: 36, height: 36, borderRadius: 9, background: `linear-gradient(135deg, #1e293b, #0f172a)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 900, color: C.gold, border: `1px solid ${C.border}`,
            }}>C</div>
          </div>
        </header>

        {activeNav === 'dashboard' && <AmbientBackground />}

        <div style={{ position: 'relative', zIndex: 1, padding: '28px 36px', display: 'flex', flexDirection: 'column', gap: 26, maxWidth: 1320, width: '100%', margin: '0 auto' }}>

          {activeNav === 'dashboard' && (
            <>
              {/* ── HERO HEADER ── */}
              <HeroHeader
                loading={loading}
                readyToCollect={stats.readyToCollect}
                expectedRevenue={stats.expectedRevenue}
                dateLabel={today}
              />

              {/* ── SECTION 1: PAYMENT ACTION CENTER ── */}
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 3, height: 18, background: C.gold, borderRadius: 3, boxShadow: `0 0 10px ${C.gold}` }} />
                  <span style={{ fontSize: 14, fontWeight: 800, color: C.white }}>Payment Action Center</span>
                  {!loading && (
                    <span style={{ background: C.goldDim, color: C.gold, borderRadius: 100, fontSize: 10, fontWeight: 800, padding: '2px 9px', border: `1px solid rgba(234,179,8,0.2)` }}>
                      {actionQueue.length} require action
                    </span>
                  )}
                </div>

                {loading ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} h={280} r={18} />)}
                  </div>
                ) : actionQueue.length === 0 ? (
                  <div style={{
                    background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18,
                    padding: '48px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{ background: C.goldDim, borderRadius: '50%', padding: 18, color: C.gold }}>
                      <CheckCircle2 size={28} strokeWidth={1.5} />
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 800, color: C.text }}>Nothing needs you right now</p>
                    <p style={{ fontSize: 11, color: C.muted, maxWidth: 280 }}>All payments are settled. New appointments will appear here as soon as they need action.</p>
                  </div>
                ) : (
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16,
                    maxHeight: 720, overflowY: 'auto', paddingRight: 4,
                  }}>
                    <AnimatePresence>
                      {actionQueue.map((t, i) => (
                        <PaymentActionCard key={t.id} t={t} index={i} onView={openView} onCollect={openCollect} />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </section>

              {/* ── SECTION 2: BUSINESS SUMMARY ── */}
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 3, height: 16, background: C.gold, borderRadius: 3, boxShadow: `0 0 10px ${C.gold}` }} />
                  <span style={{ fontSize: 12, fontWeight: 800, color: C.white }}>Business Summary</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
                  <KpiCard label="Pending Payments"      value={stats.pending}              icon={Clock}         loading={loading} sub="Awaiting settlement" />
                  <KpiCard label="Ready to Collect"      value={stats.readyToCollect}        icon={Zap}           loading={loading} sub="QC approved" accent />
                  <KpiCard label="Collected Today"       value={stats.collectedToday}        icon={Wallet}        loading={loading} sub="Cash in today" isCurrency />
                  <KpiCard label="Expected Revenue"      value={stats.expectedRevenue}       icon={TrendingUp}    loading={loading} sub="Outstanding total" isCurrency />
                  <KpiCard label="Pending Downpayments"  value={stats.pendingDownpayments}   icon={AlertTriangle} loading={loading} sub="No downpayment yet" />
                  <KpiCard label="Completed Transactions" value={stats.completed}            icon={CheckCircle2}  loading={loading} sub="All time" />
                </div>
              </section>

              {/* ── SECTION 3: PAYMENT WORKFLOW ── */}
              <WorkflowStepper counts={stageCounts} />

              {/* ── SECTION 4 + 5 side by side ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 20, alignItems: 'start' }}>
                <section>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 3, height: 16, background: C.gold, borderRadius: 3, boxShadow: `0 0 10px ${C.gold}` }} />
                    <span style={{ fontSize: 12, fontWeight: 800, color: C.white }}>Payment Methods</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {Object.entries(methodBreakdown).map(([name, v]) => (
                      <MethodCard key={name} name={name} count={v.count} amount={v.amount} loading={loading} />
                    ))}
                  </div>
                </section>

                <ActivityTimeline items={paidTransactions.slice(0, 8)} loading={loading} />
              </div>

              {/* ── SECTION 6: QUICK ACTIONS ── */}
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 3, height: 16, background: C.gold, borderRadius: 3, boxShadow: `0 0 10px ${C.gold}` }} />
                  <span style={{ fontSize: 12, fontWeight: 800, color: C.white }}>Quick Actions</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
                  <QuickActionButton icon={Wallet}    label="Collect Payment"     sub="Jump to the next ready appointment" primary onClick={handleCollectPaymentQuickAction} />
                  <QuickActionButton icon={Zap}        label="Open Payment Queue"  sub={`${stats.pending} appointments waiting`} onClick={() => setActiveNav('process')} />
                  <QuickActionButton icon={History}    label="View History"        sub="Browse settled transactions" onClick={() => setActiveNav('history')} />
                  <QuickActionButton icon={Search}      label="Search Appointment"  sub="Find by name, phone, or reference" onClick={handleSearchQuickAction} />
                </div>
              </section>
            </>
          )}

          {activeNav === 'process' && (
            <section style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, overflow: 'hidden', boxShadow: '0 4px 32px rgba(0,0,0,0.35)' }}>
              <RowTable rows={filteredProcess} loading={loading} mode="process" onView={openView} searchRef={searchRef} />
            </section>
          )}

          {activeNav === 'history' && (
            <section style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, overflow: 'hidden', boxShadow: '0 4px 32px rgba(0,0,0,0.35)' }}>
              <RowTable rows={filteredHistory} loading={loading} mode="history" onView={openView} searchRef={searchRef} />
            </section>
          )}
        </div>
      </main>

      {/* ══════════════ MODAL ══════════════ */}
      <AnimatePresence>
        {selectedInvoice && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(16px)', overflowY: 'auto',
          }}>
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0, y: 8 }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              style={{
                background: C.surface, border: `1px solid ${C.borderHi}`, borderRadius: 22, width: '100%', maxWidth: 860,
                overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.7)', margin: '32px 0',
              }}
            >
              <div style={{
                padding: '20px 28px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'linear-gradient(90deg, rgba(234,179,8,0.08) 0%, transparent 60%)',
              }}>
                <div>
                  <h4 style={{ fontSize: 16, fontWeight: 900, color: C.white, letterSpacing: '-0.02em' }}>{selectedInvoice.full_name}</h4>
                  <p style={{ fontSize: 10, color: C.gold, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 3 }}>
                    ID · {String(selectedInvoice.id).substring(0, 8).toUpperCase()} · {STAGE_LABELS[getStage(selectedInvoice)]}
                  </p>
                </div>
                <button
                  onClick={() => { setSelectedInvoice(null); setIsConfirming(false); }}
                  style={{
                    background: C.panel, border: `1px solid ${C.border}`, borderRadius: 9, padding: 8, color: C.muted,
                    cursor: 'pointer', display: 'flex', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderHi; e.currentTarget.style.color = C.text; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 420 }}>
                {/* LEFT — Customer Profile */}
                <div style={{ padding: '24px 28px', borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <p style={{ fontSize: 9, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Customer Profile</p>

                  <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                      background: 'linear-gradient(135deg, #1e3050, #0f1f35)', border: `1px solid ${C.borderHi}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: C.gold,
                    }}>{(selectedInvoice.full_name?.[0] || '?').toUpperCase()}</div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 800, color: C.white }}>{selectedInvoice.full_name}</p>
                      <p style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{selectedInvoice.phone_number || 'No phone'}</p>
                    </div>
                  </div>

                  {[
                    { icon: Phone,    label: 'Phone',    val: selectedInvoice.phone_number || 'N/A' },
                    { icon: MapPin,   label: 'Address',  val: selectedInvoice.address || 'N/A' },
                    { icon: Shield,   label: 'Service',  val: selectedInvoice.service_type || 'Standard Service' },
                    { icon: Calendar, label: 'Schedule', val: selectedInvoice.schedule_date ? `${new Date(selectedInvoice.schedule_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}${selectedInvoice.appointment_time ? ' · ' + selectedInvoice.appointment_time : ''}` : 'N/A' },
                    { icon: Hash,     label: 'Ref No.',  val: selectedInvoice.reference_number || '—' },
                  ].map(({ icon: Icon, label, val }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ background: C.goldDim, borderRadius: 7, padding: 7, color: C.gold, flexShrink: 0, marginTop: 1 }}>
                        <Icon size={12} />
                      </div>
                      <div>
                        <p style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</p>
                        <p style={{ fontSize: 12, fontWeight: 600, color: C.text, marginTop: 2, wordBreak: 'break-word' }}>{val}</p>
                      </div>
                    </div>
                  ))}

                  <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px 16px', marginTop: 4 }}>
                    <p style={{ fontSize: 9, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>Financial Summary</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[
                        { label: 'Total Price', val: peso(selectedInvoice.price), color: C.text },
                        { label: 'Downpayment', val: peso(selectedInvoice.downpayment_paid), color: C.emerald },
                        { label: 'Outstanding', val: peso((Number(selectedInvoice.price) || 0) - (Number(selectedInvoice.downpayment_paid) || 0)), color: C.gold, bold: true },
                      ].map(({ label, val, color, bold }) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: bold ? 0 : 9, borderBottom: bold ? 'none' : `1px solid ${C.border}` }}>
                          <span style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>{label}</span>
                          <span style={{ fontSize: bold ? 16 : 13, fontWeight: bold ? 900 : 700, color }}>{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedInvoice.receipt_image && (
                    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <p style={{ fontSize: 9, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Receipt</p>
                        <a href={selectedInvoice.receipt_image} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: C.emerald, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Eye size={11} /> View Full
                        </a>
                      </div>
                      <img src={selectedInvoice.receipt_image} alt="Receipt" style={{ maxHeight: 120, borderRadius: 10, border: `1px solid ${C.border}`, display: 'block', margin: '0 auto', objectFit: 'contain', background: 'rgba(0,0,0,0.4)', padding: 4 }} />
                    </div>
                  )}
                </div>

                {/* RIGHT — Payment Panel */}
                <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column' }}>
                  <p style={{ fontSize: 9, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 18 }}>
                    {selectedInvoice.payment_status === 'paid' ? 'Payment' : isConfirming ? 'Process Payment' : 'Payment'}
                  </p>

                  {selectedInvoice.payment_status === 'paid' ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center' }}>
                      <div style={{ background: 'rgba(16,185,129,0.1)', borderRadius: '50%', padding: 20, color: C.emerald, border: `1px solid rgba(16,185,129,0.2)` }}>
                        <CheckCircle2 size={32} strokeWidth={1.5} />
                      </div>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 800, color: C.white }}>Payment Complete</p>
                        <p style={{ fontSize: 11, color: C.muted, marginTop: 6, lineHeight: 1.6, maxWidth: 240, margin: '6px auto 0' }}>
                          {selectedInvoice.payment_method ? `Settled via ${selectedInvoice.payment_method}.` : 'This appointment has been settled.'}
                        </p>
                      </div>
                    </div>
                  ) : !isConfirming ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, textAlign: 'center' }}>
                      <div style={{ background: C.goldDim, borderRadius: '50%', padding: 20, color: C.gold, border: `1px solid rgba(234,179,8,0.15)` }}>
                        <Banknote size={32} strokeWidth={1.5} />
                      </div>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 800, color: C.white }}>Settle Balance</p>
                        <p style={{ fontSize: 11, color: C.muted, marginTop: 6, lineHeight: 1.6, maxWidth: 220, margin: '6px auto 0' }}>
                          Record a payment for this account and forward it for manager approval.
                        </p>
                      </div>
                      <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 20px', width: '100%' }}>
                        <p style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>Outstanding Balance</p>
                        <p style={{ fontSize: 26, fontWeight: 900, color: C.gold, letterSpacing: '-0.03em', marginTop: 4 }}>
                          {peso((Number(selectedInvoice.price) || 0) - (Number(selectedInvoice.downpayment_paid) || 0))}
                        </p>
                      </div>
                      <button
                        onClick={() => setIsConfirming(true)}
                        style={{
                          background: C.gold, color: C.bg, border: 'none', borderRadius: 12, padding: '13px 0', width: '100%',
                          fontSize: 11, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          cursor: 'pointer', transition: 'all 0.15s', boxShadow: `0 6px 20px ${C.goldGlow}`,
                        }}
                        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 28px rgba(234,179,8,0.4)'}
                        onMouseLeave={e => e.currentTarget.style.boxShadow = `0 6px 20px ${C.goldGlow}`}
                      >
                        <PlusCircle size={15} /> Process Payment
                      </button>
                    </div>
                  ) : (
                    <PaymentForm
                      invoice={selectedInvoice}
                      onConfirm={details => handleProcessPayment(selectedInvoice.id, details)}
                      onCancel={() => setIsConfirming(false)}
                    />
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CashierDashboard;
