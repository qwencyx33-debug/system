import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import {
  Search, X, ArrowRightCircle, ArrowLeftCircle, Clock, User, MapPin, Phone, Mail,
  CheckCircle2, AlertCircle, DollarSign, Wallet, CreditCard, Banknote,
  Smartphone, Building2, FileText, ChevronRight, LogOut, LayoutDashboard,
  History, ClipboardList, ShieldCheck, Wrench, MessageSquare, Hash,
  CalendarDays, Timer, Sparkles, ArrowRight, Check, Car, Palette, Gauge,
  Receipt, UserCog, Printer,
} from 'lucide-react';

/* ============================================================
   DESIGN TOKENS — locked to the brief's palette. No white bg.
   ============================================================ */
const C = {
  bg: '#020617',
  sidebar: '#060E18',
  panel: '#0B1623',
  panelHi: '#0F1E30',
  gold: '#EAB308',
  goldSoft: 'rgba(234,179,8,0.12)',
  goldBorder: 'rgba(234,179,8,0.28)',
  emerald: '#10B981',
  emeraldSoft: 'rgba(16,185,129,0.12)',
  rose: '#F43F5E',
  roseSoft: 'rgba(244,63,94,0.12)',
  sky: '#38BDF8',
  skySoft: 'rgba(56,189,248,0.12)',
  violet: '#A78BFA',
  violetSoft: 'rgba(167,139,250,0.12)',
  text: '#E2E8F0',
  muted: '#64748B',
  sub: '#94A3B8',
  border: 'rgba(255,255,255,0.06)',
  borderHi: 'rgba(255,255,255,0.14)',
  glass: 'rgba(11,22,35,0.72)',
};

const easeOut = [0.16, 1, 0.3, 1];

/* Placeholder for a field that isn't in the current schema / wasn't
   populated for this record. NEVER a fabricated value. */
const NA = ({ children = 'Not on record' }) => (
  <span style={{ color: C.muted, fontStyle: 'italic' }}>{children}</span>
);

const peso = (n) => `₱${(Number(n) || 0).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const safe = (v, fallback = null) => (v === null || v === undefined || v === '' ? fallback : v);
const hasField = (obj, key) => obj[key] !== undefined && obj[key] !== null && obj[key] !== '';

/* ============================================================
   Shared count-up hook — drives every animated number.
   ============================================================ */
function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const to = Number(target) || 0;
    cancelAnimationFrame(ref.current);
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(from + (to - from) * eased);
      if (p < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ref.current);
  }, [target, duration]);
  return value;
}

/* ============================================================
   Status → visual language (color, label) used across cards,
   badges and the workflow rail. Falls back gracefully for
   status strings we don't recognize rather than guessing.
   ============================================================ */
const STATUS_MAP = {
  pending: { label: 'Pending', color: C.muted, bg: 'rgba(100,116,139,0.12)' },
  booked: { label: 'Booked', color: C.sky, bg: C.skySoft },
  in_progress: { label: 'In Progress', color: C.sky, bg: C.skySoft },
  completed: { label: 'Technician Done', color: C.gold, bg: C.goldSoft },
  awaiting_manager: { label: 'Awaiting Manager', color: C.violet, bg: C.violetSoft },
  approved: { label: 'Approved', color: C.emerald, bg: C.emeraldSoft },
};
const statusVisual = (status) => STATUS_MAP[status] || { label: status ? status.replace(/_/g, ' ') : 'Unknown', color: C.muted, bg: 'rgba(100,116,139,0.12)' };

const priorityVisual = (priority) => {
  const p = (priority || '').toLowerCase();
  if (p === 'urgent' || p === 'high') return { label: p === 'urgent' ? 'Urgent' : 'High', color: C.rose, bg: C.roseSoft };
  if (p === 'medium') return { label: 'Medium', color: C.gold, bg: C.goldSoft };
  if (p === 'low') return { label: 'Low', color: C.emerald, bg: C.emeraldSoft };
  return null; // no fabricated default — omit the badge if the field is absent
};

/* ============================================================
   Small primitives
   ============================================================ */
const Badge = ({ children, color = C.gold, bg = C.goldSoft, border, icon: Icon, pulse }) => (
  <span style={{
    background: bg, color, border: `1px solid ${border || `${color}44`}`,
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '4px 10px', borderRadius: 7, fontSize: 10, fontWeight: 800,
    textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap',
  }}>
    {pulse && (
      <span style={{ position: 'relative', width: 6, height: 6, display: 'inline-flex' }}>
        <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color, animation: 'cw-pulse 1.6s ease-out infinite' }} />
        <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color }} />
      </span>
    )}
    {Icon && <Icon size={11} />}
    {children}
  </span>
);

const GlassPanel = ({ children, style, ...rest }) => (
  <div
    style={{
      background: `linear-gradient(180deg, ${C.panelHi} 0%, ${C.panel} 100%)`,
      border: `1px solid ${C.border}`,
      borderRadius: 20,
      boxShadow: '0 1px 0 rgba(255,255,255,0.03) inset, 0 20px 40px -24px rgba(0,0,0,0.6)',
      backdropFilter: 'blur(16px)',
      ...style,
    }}
    {...rest}
  >
    {children}
  </div>
);

const SectionHeader = ({ eyebrow, title, action, icon: Icon }) => (
  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {Icon && (
        <span style={{ width: 30, height: 30, borderRadius: 9, background: C.goldSoft, color: C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={14} />
        </span>
      )}
      <div>
        {eyebrow && <p style={{ fontSize: 10, fontWeight: 800, color: C.gold, textTransform: 'uppercase', letterSpacing: 1.2, margin: '0 0 2px' }}>{eyebrow}</p>}
        <h2 style={{ fontSize: 16, fontWeight: 900, color: '#F8FAFC', margin: 0, letterSpacing: -0.2 }}>{title}</h2>
      </div>
    </div>
    {action}
  </div>
);

/* ============================================================
   KPI CARD — Section 2, Business Overview
   ============================================================ */
function TrendingIcon(props) { return <Sparkles {...props} />; }

const KPICard = ({ label, value, format = 'number', icon: Icon, accent = C.gold, index }) => {
  const animated = useCountUp(value);
  const display = format === 'currency' ? peso(animated) : Math.round(animated).toLocaleString();
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.5, ease: easeOut }}
      whileHover={{ y: -3, boxShadow: `0 16px 32px -18px ${accent}55` }}
      style={{
        background: `linear-gradient(160deg, ${C.panelHi}, ${C.panel})`,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: '18px 20px',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default',
      }}
    >
      <div style={{ position: 'absolute', top: -30, right: -30, width: 90, height: 90, borderRadius: '50%', background: `${accent}14`, filter: 'blur(6px)' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</span>
        <span style={{ width: 28, height: 28, borderRadius: 9, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent }}>
          <Icon size={14} />
        </span>
      </div>
      <p style={{ fontSize: 24, fontWeight: 900, color: '#F8FAFC', margin: 0, letterSpacing: -0.5 }}>{display}</p>
    </motion.div>
  );
};

/* ============================================================
   JOB REVIEW CARD — Section 1, the entry point into the
   Payment Process workspace
   ============================================================ */
const JobCard = ({ job, index, onReview }) => {
  const total = Number(job.price) || 0;
  const paid = Number(job.downpayment_paid) || 0;
  const remaining = Math.max(0, total - paid);
  const progressPct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
  const status = statusVisual(job.status);
  const priority = priorityVisual(job.priority);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: Math.min(index, 8) * 0.045, duration: 0.45, ease: easeOut }}
      whileHover={{ y: -5 }}
      style={{ position: 'relative' }}
    >
      <div
        style={{
          position: 'absolute', inset: -1, borderRadius: 21,
          background: `linear-gradient(135deg, ${C.goldBorder}, transparent 40%)`,
          opacity: 0, transition: 'opacity .25s ease', pointerEvents: 'none',
        }}
        className="cw-glow"
      />
      <div
        onMouseEnter={(e) => { e.currentTarget.previousSibling && (e.currentTarget.previousSibling.style.opacity = 1); }}
        onMouseLeave={(e) => { e.currentTarget.previousSibling && (e.currentTarget.previousSibling.style.opacity = 0); }}
        style={{
          background: `linear-gradient(165deg, ${C.panelHi}, ${C.panel})`,
          border: `1px solid ${C.border}`,
          borderRadius: 20,
          padding: 20,
          position: 'relative',
          boxShadow: '0 24px 48px -30px rgba(0,0,0,0.7)',
          transition: 'box-shadow .25s ease, border-color .25s ease',
        }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 900, color: '#F8FAFC', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {job.full_name || <NA />}
            </p>
            <p style={{ fontSize: 11.5, color: C.muted, margin: 0, fontWeight: 600 }}>
              {job.service_type || <NA />}{job.service_category ? ` · ${job.service_category}` : ''}
            </p>
          </div>
          {priority && <Badge color={priority.color} bg={priority.bg}>{priority.label}</Badge>}
        </div>

        {/* Meta grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          <MetaRow icon={CalendarDays} text={safe(job.appointment_date)} />
          <MetaRow icon={Clock} text={safe(job.appointment_time)} />
          <div style={{ gridColumn: '1 / -1' }}>
            <MetaRow icon={MapPin} text={safe(job.address)} />
          </div>
        </div>

        {/* Money block */}
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 9.5, fontWeight: 800, color: C.muted, textTransform: 'uppercase' }}>Total Price</span>
            <span style={{ fontSize: 14, fontWeight: 900, color: '#F8FAFC' }}>{peso(total)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 10.5, color: C.muted, fontWeight: 600 }}>Downpayment paid</span>
            <span style={{ fontSize: 11.5, color: C.emerald, fontWeight: 800 }}>{peso(paid)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 10.5, color: C.muted, fontWeight: 600 }}>Remaining balance</span>
            <span style={{ fontSize: 11.5, color: C.gold, fontWeight: 800 }}>{peso(remaining)}</span>
          </div>
          <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.8, ease: easeOut, delay: 0.15 }}
              style={{ height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${C.gold}, ${C.emerald})` }}
            />
          </div>
        </div>

        {/* Status row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          <Badge color={status.color} bg={status.bg} icon={Wrench}>{status.label}</Badge>
          <Badge
            color={job.payment_status === 'paid' ? C.emerald : C.muted}
            bg={job.payment_status === 'paid' ? C.emeraldSoft : 'rgba(100,116,139,0.12)'}
            icon={DollarSign}
          >
            {job.payment_status === 'paid' ? 'Paid' : 'Payment Pending'}
          </Badge>
          {job.qc_status && <Badge color={C.sky} bg={C.skySoft} icon={ShieldCheck}>{job.qc_status}</Badge>}
          {job.payment_ref && <Badge color={C.violet} bg={C.violetSoft} icon={Hash}>{job.payment_ref}</Badge>}
        </div>

        {/* CTA */}
        <motion.button
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onReview(job)}
          style={{
            width: '100%', border: 'none', borderRadius: 12, padding: '13px 0',
            background: `linear-gradient(135deg, ${C.gold}, #F59E0B)`,
            color: '#1C1300', fontWeight: 900, fontSize: 12.5, letterSpacing: 0.2,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 12px 24px -10px rgba(234,179,8,0.5)',
          }}
        >
          Process Payment <ArrowRightCircle size={16} />
        </motion.button>
      </div>
      <style>{`.cw-glow{ }`}</style>
    </motion.div>
  );
};

const MetaRow = ({ icon: Icon, text }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
    <Icon size={12} style={{ color: C.muted, flexShrink: 0 }} />
    <span style={{ fontSize: 11, color: C.text, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {text || <NA />}
    </span>
  </div>
);

/* ============================================================
   Section 3 — WORKFLOW PROGRESS rail
   ============================================================ */
const PIPELINE_STAGES = [
  { key: 'appointment', label: 'Appointment' },
  { key: 'technician', label: 'Technician Finished' },
  { key: 'review', label: 'Cashier Review' },
  { key: 'payment', label: 'Payment Processed' },
  { key: 'manager', label: 'Waiting Manager' },
  { key: 'completed', label: 'Completed' },
];

const stageIndexFor = (job) => {
  if (job.status === 'awaiting_manager') return 4;
  if (job.payment_status === 'paid') return 3;
  if (job.status === 'completed') return 1;
  return 0;
};

const WorkflowProgress = ({ jobs }) => {
  const counts = useMemo(() => {
    const c = PIPELINE_STAGES.map(() => 0);
    jobs.forEach((j) => { c[stageIndexFor(j)] += 1; });
    return c;
  }, [jobs]);
  const activeStage = counts.findIndex((n, i) => i < 5 && n > 0);

  return (
    <GlassPanel style={{ padding: 22 }}>
      <SectionHeader eyebrow="Section 3" title="Workflow Progress" />
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {PIPELINE_STAGES.map((s, i) => (
          <React.Fragment key={s.key}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 88 }}>
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.06 }}
                style={{
                  width: 34, height: 34, borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: i === activeStage ? `linear-gradient(135deg, ${C.gold}, #F59E0B)` : counts[i] > 0 ? C.emeraldSoft : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${i === activeStage ? 'transparent' : C.border}`,
                  color: i === activeStage ? '#1C1300' : counts[i] > 0 ? C.emerald : C.muted,
                  fontWeight: 900, fontSize: 12,
                  boxShadow: i === activeStage ? '0 0 0 4px rgba(234,179,8,0.15)' : 'none',
                }}
              >
                {counts[i] > 0 ? counts[i] : i + 1}
              </motion.div>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: i === activeStage ? C.gold : C.muted, textAlign: 'center', lineHeight: 1.3 }}>{s.label}</span>
            </div>
            {i < PIPELINE_STAGES.length - 1 && (
              <div style={{ flex: 1, height: 2, background: counts[i] > 0 ? `linear-gradient(90deg, ${C.gold}55, ${C.border})` : C.border, marginBottom: 20 }} />
            )}
          </React.Fragment>
        ))}
      </div>
    </GlassPanel>
  );
};

/* ============================================================
   Section 4 — Payment Method Overview
   ============================================================ */
const METHOD_META = {
  cash: { label: 'Cash', icon: Banknote, color: C.emerald, bg: C.emeraldSoft },
  gcash: { label: 'GCash', icon: Smartphone, color: C.sky, bg: C.skySoft },
  bank: { label: 'Bank', icon: Building2, color: C.violet, bg: C.violetSoft },
  cod: { label: 'COD', icon: ClipboardList, color: C.gold, bg: C.goldSoft },
};

const MethodStatCard = ({ meta, stat, index }) => {
  const amount = useCountUp(stat.amount);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      whileHover={{ y: -3 }}
      style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px 14px' }}
    >
      <span style={{ width: 26, height: 26, borderRadius: 8, background: meta.bg, color: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
        <meta.icon size={13} />
      </span>
      <p style={{ fontSize: 10.5, fontWeight: 800, color: C.muted, textTransform: 'uppercase', margin: '0 0 2px' }}>{meta.label}</p>
      <p style={{ fontSize: 15, fontWeight: 900, color: '#F8FAFC', margin: 0 }}>{peso(amount)}</p>
      <p style={{ fontSize: 10, color: C.muted, margin: '2px 0 0', fontWeight: 600 }}>{stat.count} transaction{stat.count === 1 ? '' : 's'}</p>
    </motion.div>
  );
};

const PaymentMethodOverview = ({ paidJobs }) => {
  const stats = useMemo(() => {
    const base = { cash: { count: 0, amount: 0 }, gcash: { count: 0, amount: 0 }, bank: { count: 0, amount: 0 }, cod: { count: 0, amount: 0 } };
    paidJobs.forEach((j) => {
      const m = (j.payment_method || '').toLowerCase();
      const key = m.includes('gcash') ? 'gcash' : m.includes('bank') ? 'bank' : m.includes('cod') ? 'cod' : 'cash';
      base[key].count += 1;
      base[key].amount += Number(j.price) || 0;
    });
    return base;
  }, [paidJobs]);

  return (
    <GlassPanel style={{ padding: 22 }}>
      <SectionHeader eyebrow="Section 4" title="Payment Method Overview" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {Object.entries(METHOD_META).map(([key, meta], i) => (
          <MethodStatCard key={key} meta={meta} stat={stats[key]} index={i} />
        ))}
      </div>
    </GlassPanel>
  );
};

/* ============================================================
   Section 5 — Recent Activity Timeline
   ============================================================ */
const buildTimeline = (jobs) => {
  const events = [];
  jobs.forEach((j) => {
    if (j.payment_status === 'paid') events.push({ id: `${j.id}-paid`, type: 'Payment Received', name: j.full_name, time: j.created_at, icon: DollarSign, color: C.emerald });
    if (j.payment_ref) events.push({ id: `${j.id}-ref`, type: 'Reference Added', name: j.full_name, time: j.created_at, icon: Hash, color: C.sky });
    if (j.status === 'awaiting_manager') events.push({ id: `${j.id}-mgr`, type: 'Manager Waiting', name: j.full_name, time: j.created_at, icon: ShieldCheck, color: C.violet });
  });
  return events
    .filter((e) => e.time)
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 8);
};

const RecentActivityTimeline = ({ jobs }) => {
  const events = useMemo(() => buildTimeline(jobs), [jobs]);
  return (
    <GlassPanel style={{ padding: 22 }}>
      <SectionHeader eyebrow="Section 5" title="Recent Activity" />
      {events.length === 0 ? (
        <p style={{ fontSize: 12, color: C.muted, textAlign: 'center', padding: '24px 0' }}>No recent activity yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {events.map((e, i) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{ display: 'flex', gap: 12, paddingBottom: i === events.length - 1 ? 0 : 16, position: 'relative' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ width: 26, height: 26, borderRadius: 8, background: `${e.color}18`, color: e.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <e.icon size={12} />
                </span>
                {i < events.length - 1 && <span style={{ width: 1, flex: 1, background: C.border, marginTop: 4 }} />}
              </div>
              <div style={{ paddingBottom: 4 }}>
                <p style={{ fontSize: 11.5, fontWeight: 800, color: C.text, margin: '2px 0 2px' }}>{e.type}</p>
                <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{e.name || <NA />} · {new Date(e.time).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </GlassPanel>
  );
};

/* ============================================================
   Section 6 — Quick Actions
   ============================================================ */
const QuickActions = ({ onNavigate, onFocusQueue }) => {
  const actions = [
    { label: 'Review Queue', icon: ClipboardList, onClick: onFocusQueue },
    { label: 'Continue Processing', icon: ArrowRight, onClick: onFocusQueue },
    { label: 'Payment History', icon: History, onClick: () => onNavigate('history') },
    { label: 'Search Appointment', icon: Search, onClick: onFocusQueue },
  ];
  return (
    <GlassPanel style={{ padding: 22 }}>
      <SectionHeader eyebrow="Section 6" title="Quick Actions" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {actions.map((a, i) => (
          <motion.button
            key={a.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ y: -2, borderColor: C.goldBorder }}
            whileTap={{ scale: 0.98 }}
            onClick={a.onClick}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
              background: C.bg, border: `1px solid ${C.border}`, borderRadius: 13,
              color: C.text, fontWeight: 800, fontSize: 12, cursor: 'pointer', textAlign: 'left',
            }}
          >
            <a.icon size={15} style={{ color: C.gold, flexShrink: 0 }} />
            {a.label}
          </motion.button>
        ))}
      </div>
    </GlassPanel>
  );
};

/* ============================================================
   SIDEBAR
   ============================================================ */
const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'payment', label: 'Payment Process', icon: Wallet },
  { key: 'history', label: 'Payment History', icon: History },
];

const Sidebar = ({ active, onNavigate, onLogout }) => (
  <div style={{
    width: 236, flexShrink: 0, background: C.sidebar, borderRight: `1px solid ${C.border}`,
    display: 'flex', flexDirection: 'column', padding: '26px 16px', gap: 4, minHeight: '100vh',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 10px', marginBottom: 34 }}>
      <div style={{ width: 32, height: 32, borderRadius: 9, background: `linear-gradient(135deg, ${C.gold}, #F59E0B)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#1C1300', fontSize: 14 }}>C</div>
      <span style={{ fontSize: 13, fontWeight: 900, color: '#F8FAFC', letterSpacing: -0.2 }}>Cashier Desk</span>
    </div>

    {NAV_ITEMS.map((item) => {
      const isActive = active === item.key;
      return (
        <motion.button
          key={item.key}
          onClick={() => onNavigate(item.key)}
          whileHover={{ x: 2 }}
          style={{
            position: 'relative', display: 'flex', alignItems: 'center', gap: 11,
            padding: '11px 14px', borderRadius: 11, border: 'none', cursor: 'pointer',
            background: isActive ? 'rgba(234,179,8,0.08)' : 'transparent',
            color: isActive ? C.gold : C.muted, fontWeight: 800, fontSize: 12.5,
            transition: 'background .2s ease, color .2s ease',
          }}
          onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
          onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
        >
          {isActive && (
            <motion.span
              layoutId="cw-active-rail"
              style={{ position: 'absolute', left: -16, top: 6, bottom: 6, width: 3, borderRadius: 3, background: `linear-gradient(180deg, ${C.gold}, #F59E0B)`, boxShadow: `0 0 12px ${C.gold}` }}
            />
          )}
          <item.icon size={16} />
          {item.label}
        </motion.button>
      );
    })}

    <div style={{ flex: 1 }} />
    <button
      onClick={onLogout}
      style={{
        display: 'flex', alignItems: 'center', gap: 11, padding: '11px 14px', borderRadius: 11,
        border: `1px solid ${C.border}`, background: 'transparent', color: C.muted,
        fontWeight: 800, fontSize: 12.5, cursor: 'pointer',
      }}
    >
      <LogOut size={15} /> Logout
    </button>
  </div>
);

/* ============================================================
   PAYMENT PROCESSING WORKSPACE
   The heart of the cashier flow — a single scrollable, fully
   visible workspace (no hidden steps, nothing to click through
   blind) organized exactly per the brief's information hierarchy:
   Header → Customer → Vehicle → Service → Payment Breakdown →
   Payment Method → Notes → Receipt Preview → Final Confirmation.
   ============================================================ */
const InfoField = ({ label, value, icon: Icon }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <span style={{ fontSize: 9.5, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4, display: 'flex', alignItems: 'center', gap: 5 }}>
      {Icon && <Icon size={11} />} {label}
    </span>
    <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{value || <NA />}</span>
  </div>
);

const WorkspaceSection = ({ eyebrow, title, icon, children, delay = 0 }) => (
  <motion.section
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4, ease: easeOut }}
  >
    <GlassPanel style={{ padding: 24 }}>
      <SectionHeader eyebrow={eyebrow} title={title} icon={icon} />
      {children}
    </GlassPanel>
  </motion.section>
);

const PaymentMethodCard = ({ id, label, icon: Icon, desc, active, onClick }) => (
  <motion.button
    type="button"
    onClick={onClick}
    whileHover={{ y: -3 }}
    whileTap={{ scale: 0.97 }}
    style={{
      position: 'relative', textAlign: 'left', cursor: 'pointer', padding: '16px 16px',
      borderRadius: 14, border: active ? `1.5px solid ${C.gold}` : `1px solid ${C.border}`,
      background: active ? `linear-gradient(160deg, ${C.goldSoft}, ${C.bg})` : C.bg,
      boxShadow: active ? `0 0 0 4px rgba(234,179,8,0.12), 0 14px 28px -16px rgba(234,179,8,0.4)` : 'none',
      transition: 'border-color .2s ease, box-shadow .2s ease',
    }}
  >
    {active && (
      <span style={{ position: 'absolute', top: 10, right: 10, width: 18, height: 18, borderRadius: '50%', background: C.gold, color: '#1C1300', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Check size={11} strokeWidth={3} />
      </span>
    )}
    <span style={{
      width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: active ? C.gold : 'rgba(255,255,255,0.05)', color: active ? '#1C1300' : C.muted, marginBottom: 10,
    }}>
      <Icon size={16} />
    </span>
    <p style={{ fontSize: 12.5, fontWeight: 900, color: active ? C.gold : C.text, margin: '0 0 2px' }}>{label}</p>
    <p style={{ fontSize: 10, color: C.muted, margin: 0, fontWeight: 600 }}>{desc}</p>
  </motion.button>
);

const BreakdownRow = ({ label, value, bold, positive, negative }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: bold ? '14px 0 0' : '0 0 12px', borderTop: bold ? `1px solid ${C.border}` : 'none', marginTop: bold ? 12 : 0,
  }}>
    <span style={{ fontSize: bold ? 12.5 : 11.5, color: bold ? C.text : C.muted, fontWeight: bold ? 800 : 600 }}>{label}</span>
    <span style={{
      fontSize: bold ? 20 : 13, fontWeight: bold ? 900 : 700,
      color: bold ? C.gold : negative ? C.rose : positive ? C.emerald : C.text,
      letterSpacing: bold ? -0.3 : 0,
    }}>
      {negative ? `− ${value}` : value}
    </span>
  </div>
);

const PaymentWorkspace = ({ job, onClose, onSubmit }) => {
  const [payment, setPayment] = useState({ amount: '', method: 'Cash', refNo: '' });
  const [submitting, setSubmitting] = useState(false);
  const now = useRef(new Date()).current;

  const total = Number(job.price) || 0;
  const paidSoFar = Number(job.downpayment_paid) || 0;
  // Only surface additional charge / discount / tax lines if these fields
  // actually exist on the record — never fabricate figures.
  const additional = hasField(job, 'additional_charges') ? Number(job.additional_charges) || 0 : null;
  const discount = hasField(job, 'discount') ? Number(job.discount) || 0 : null;
  const tax = hasField(job, 'tax') ? Number(job.tax) || 0 : null;
  const grandTotal = total + (additional || 0) - (discount || 0) + (tax || 0);
  const outstanding = Math.max(0, grandTotal - paidSoFar);

  const received = Number(payment.amount) || 0;
  const remainingAfter = Math.max(0, outstanding - received);
  const change = Math.max(0, received - outstanding);
  const status = statusVisual(job.status);

  useEffect(() => {
    setPayment((p) => ({ ...p, amount: p.amount || String(outstanding) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    if (!payment.amount || received <= 0) {
      Swal.fire({ icon: 'error', title: 'Missing Amount', text: 'Please enter the received payment amount.', background: C.panel, color: '#fff', confirmButtonColor: C.gold });
      return;
    }
    setSubmitting(true);
    // ONLY existing fields / existing logic — no schema changes.
    const { error } = await supabase
      .from('appointments')
      .update({
        payment_status: 'paid',
        payment_method: payment.method,
        payment_ref: payment.refNo || null,
        status: 'awaiting_manager',
      })
      .eq('id', job.id);
    setSubmitting(false);

    if (error) {
      Swal.fire({ icon: 'error', title: 'Transaction Failed', text: error.message, background: C.panel, color: '#fff', confirmButtonColor: C.gold });
      return;
    }
    Swal.fire({ icon: 'success', title: 'Sent for Manager Approval', text: `${job.full_name || 'This job'} is now awaiting manager review.`, background: C.panel, color: '#fff', confirmButtonColor: C.gold, timer: 2200, showConfirmButton: false });
    onSubmit();
  };

  const methodIcon = { Cash: Banknote, GCash: Smartphone, Bank: Building2, COD: ClipboardList };
  const methodDesc = { Cash: 'Physical cash on hand', GCash: 'E-wallet transfer', Bank: 'Bank deposit / transfer', COD: 'Collect on delivery' };

  const shortRef = String(job.id).substring(0, 8).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: C.bg, overflowY: 'auto',
      }}
    >
      {/* ---------- HEADER ---------- */}
      <motion.div
        initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4, ease: easeOut }}
        style={{
          position: 'sticky', top: 0, zIndex: 20, padding: '20px 40px',
          background: `linear-gradient(135deg, #0f2557 0%, #0a1830 55%, ${C.bg} 100%)`,
          borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div>
          <p style={{ fontSize: 10, fontWeight: 800, color: C.gold, textTransform: 'uppercase', letterSpacing: 1.4, margin: '0 0 5px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wallet size={12} /> Processing Payment · Appointment #{shortRef}
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#F8FAFC', margin: 0, letterSpacing: -0.4 }}>
            {job.full_name || <NA />}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
            <Badge color={status.color} bg={status.bg} icon={Wrench}>{status.label}</Badge>
            <Badge color={job.payment_status === 'paid' ? C.emerald : C.gold} bg={job.payment_status === 'paid' ? C.emeraldSoft : C.goldSoft} icon={DollarSign} pulse={job.payment_status !== 'paid'}>
              {job.payment_status === 'paid' ? 'Paid' : 'Ready for Collection'}
            </Badge>
            <span style={{ fontSize: 11, color: C.sub, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
              <CalendarDays size={12} /> {now.toLocaleDateString('en-PH', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span style={{ fontSize: 11, color: C.sub, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Clock size={12} /> {now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.borderHi}`, borderRadius: 10, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text, cursor: 'pointer', flexShrink: 0 }}
        >
          <X size={17} />
        </button>
      </motion.div>

      {/* ---------- BODY ---------- */}
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '28px 40px 140px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Customer Summary */}
        <WorkspaceSection eyebrow="01 · Customer Summary" title="Customer Profile" icon={User} delay={0.02}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: `linear-gradient(135deg, #1e3050, #0f1f35)`, border: `1px solid ${C.borderHi}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: C.gold, flexShrink: 0 }}>
              {(job.full_name?.[0] || '?').toUpperCase()}
            </div>
            <div>
              <p style={{ fontSize: 17, fontWeight: 900, color: '#F8FAFC', margin: '0 0 3px' }}>{job.full_name || <NA />}</p>
              <p style={{ fontSize: 11.5, color: C.muted, margin: 0, fontWeight: 600 }}>Reference · {job.payment_ref || shortRef}</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
            <InfoField label="Phone Number" value={job.contact_number || job.phone} icon={Phone} />
            <InfoField label="Email" value={job.email} icon={Mail} />
            <InfoField label="Reference Number" value={job.payment_ref} icon={Hash} />
            <InfoField label="Appointment Status" value={status.label} icon={ClipboardList} />
            <InfoField label="QC Status" value={job.qc_status} icon={ShieldCheck} />
            <InfoField label="Assigned Technician" value={job.technician_name || job.technician} icon={UserCog} />
            <InfoField label="Service Date" value={job.appointment_date} icon={CalendarDays} />
            <InfoField label="Payment Status" value={job.payment_status === 'paid' ? 'Paid' : 'Pending'} icon={DollarSign} />
            <InfoField label="Address" value={job.address} icon={MapPin} />
          </div>
        </WorkspaceSection>

        {/* Vehicle Information — only rendered if the schema actually has these fields */}
        {(hasField(job, 'vehicle_brand') || hasField(job, 'vehicle_model') || hasField(job, 'plate_number') || hasField(job, 'vehicle_type') || hasField(job, 'vehicle_color') || hasField(job, 'vehicle_year')) && (
          <WorkspaceSection eyebrow="02 · Vehicle Information" title="Vehicle Details" icon={Car} delay={0.06}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
              <InfoField label="Brand" value={job.vehicle_brand} icon={Car} />
              <InfoField label="Model" value={job.vehicle_model} icon={Car} />
              <InfoField label="Year" value={job.vehicle_year} icon={CalendarDays} />
              <InfoField label="Plate Number" value={job.plate_number} icon={Hash} />
              <InfoField label="Color" value={job.vehicle_color} icon={Palette} />
              <InfoField label="Vehicle Type" value={job.vehicle_type} icon={Gauge} />
            </div>
          </WorkspaceSection>
        )}

        {/* Service Details */}
        <WorkspaceSection eyebrow="03 · Service Details" title="Service Information" icon={Wrench} delay={0.1}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
            <InfoField label="Service Name" value={job.service_type} icon={Wrench} />
            <InfoField label="Category" value={job.service_category} icon={ClipboardList} />
            <InfoField label="Technician" value={job.technician_name || job.technician} icon={UserCog} />
            <InfoField label="Date Started" value={job.date_started || job.appointment_date} icon={CalendarDays} />
            <InfoField label="Date Finished" value={job.date_finished || job.completed_at} icon={CalendarDays} />
            <InfoField label="Estimated Duration" value={job.estimated_duration} icon={Timer} />
            <InfoField label="Completion Time" value={job.completion_time} icon={Timer} />
            <InfoField label="Service Status" value={status.label} icon={CheckCircle2} />
            <InfoField label="Priority" value={job.priority} icon={AlertCircle} />
          </div>
        </WorkspaceSection>

        {/* Payment Breakdown */}
        <WorkspaceSection eyebrow="04 · Payment Breakdown" title="Amount Due" icon={CreditCard} delay={0.14}>
          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: '18px 22px' }}>
            <BreakdownRow label="Service Total" value={peso(total)} />
            {additional !== null && <BreakdownRow label="Additional Charges" value={peso(additional)} />}
            {discount !== null && <BreakdownRow label="Discount" value={peso(discount)} negative />}
            <BreakdownRow label="Downpayment Paid" value={peso(paidSoFar)} positive />
            {tax !== null && <BreakdownRow label="Tax" value={peso(tax)} />}
            <BreakdownRow label="Grand Total Due" value={peso(outstanding)} bold />
          </div>
        </WorkspaceSection>

        {/* Payment Method */}
        <WorkspaceSection eyebrow="05 · Payment Method" title="Select How the Customer Is Paying" icon={Wallet} delay={0.18}>
          <div>
            <label style={{ fontSize: 9.5, fontWeight: 800, color: C.muted, textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>Amount Received (₱)</label>
            <input
              type="number"
              value={payment.amount}
              onChange={(e) => setPayment({ ...payment, amount: e.target.value })}
              style={{ width: '100%', background: C.bg, border: `1px solid ${C.borderHi}`, borderRadius: 14, padding: '16px 18px', fontSize: 26, fontWeight: 900, color: C.gold, outline: 'none', boxSizing: 'border-box', marginBottom: 16 }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 16px' }}>
                <p style={{ fontSize: 9.5, color: C.muted, fontWeight: 800, textTransform: 'uppercase', margin: '0 0 4px' }}>Remaining</p>
                <p style={{ fontSize: 16, fontWeight: 900, color: C.sub, margin: 0 }}>{remainingAfter > 0 ? peso(remainingAfter) : '—'}</p>
              </div>
              <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 16px' }}>
                <p style={{ fontSize: 9.5, color: C.muted, fontWeight: 800, textTransform: 'uppercase', margin: '0 0 4px' }}>Change</p>
                <p style={{ fontSize: 16, fontWeight: 900, color: C.emerald, margin: 0 }}>{change > 0 ? peso(change) : '—'}</p>
              </div>
            </div>

            <label style={{ fontSize: 9.5, fontWeight: 800, color: C.muted, textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>Payment Method</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: payment.method !== 'Cash' ? 18 : 0 }}>
              {['Cash', 'GCash', 'Bank', 'COD'].map((id) => (
                <PaymentMethodCard
                  key={id} id={id} label={id} icon={methodIcon[id]} desc={methodDesc[id]}
                  active={payment.method === id} onClick={() => setPayment({ ...payment, method: id })}
                />
              ))}
            </div>

            <AnimatePresence>
              {payment.method !== 'Cash' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <label style={{ fontSize: 9.5, fontWeight: 800, color: C.muted, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Reference Number</label>
                  <input
                    type="text"
                    placeholder="Transaction reference"
                    value={payment.refNo}
                    onChange={(e) => setPayment({ ...payment, refNo: e.target.value })}
                    style={{ width: '100%', background: C.bg, border: `1px solid ${C.borderHi}`, borderRadius: 12, padding: '13px 14px', fontSize: 12.5, color: C.text, outline: 'none', boxSizing: 'border-box' }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </WorkspaceSection>

        {/* Notes — only existing fields, never fabricated */}
        {(hasField(job, 'technician_notes') || hasField(job, 'manager_notes') || hasField(job, 'customer_notes')) && (
          <WorkspaceSection eyebrow="06 · Notes & Remarks" title="Notes on Record" icon={MessageSquare} delay={0.22}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {hasField(job, 'technician_notes') && <InfoField label="Technician Notes" value={job.technician_notes} icon={Wrench} />}
              {hasField(job, 'manager_notes') && <InfoField label="Manager Notes" value={job.manager_notes} icon={FileText} />}
              {hasField(job, 'customer_notes') && <InfoField label="Customer Notes" value={job.customer_notes} icon={MessageSquare} />}
            </div>
          </WorkspaceSection>
        )}

        {/* Receipt Preview */}
        <WorkspaceSection eyebrow="07 · Receipt Preview" title="Preview Before Collecting" icon={Receipt} delay={0.26}>
          <div style={{
            background: C.bg, border: `1px dashed ${C.borderHi}`, borderRadius: 14, padding: '22px 26px',
            fontFamily: "'Courier New', monospace",
          }}>
            <div style={{ textAlign: 'center', marginBottom: 16, paddingBottom: 14, borderBottom: `1px dashed ${C.border}` }}>
              <p style={{ fontSize: 14, fontWeight: 900, color: '#F8FAFC', margin: '0 0 2px', letterSpacing: 1 }}>RIONTECH SYSTEMS</p>
              <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>Official Payment Receipt</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <ReceiptLine label="Reference No." value={job.payment_ref || shortRef} />
              <ReceiptLine label="Customer" value={job.full_name} />
              {hasField(job, 'vehicle_brand') && <ReceiptLine label="Vehicle" value={`${job.vehicle_brand || ''} ${job.vehicle_model || ''}`.trim()} />}
              <ReceiptLine label="Service" value={job.service_type} />
              <ReceiptLine label="Payment Method" value={payment.method} />
              <ReceiptLine label="Amount Paid" value={peso(received)} highlight />
              <ReceiptLine label="Remaining Balance" value={remainingAfter > 0 ? peso(remainingAfter) : 'Fully Settled'} />
              <ReceiptLine label="Date" value={now.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })} />
              <ReceiptLine label="Cashier" value="Cashier on Duty" />
            </div>
          </div>
        </WorkspaceSection>

        {/* Final Confirmation */}
        <WorkspaceSection eyebrow="08 · Final Confirmation" title="Confirm & Collect" icon={CheckCircle2} delay={0.3}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <ConfirmRow label="Customer" value={job.full_name} />
              <ConfirmRow label="Total Amount Due" value={peso(outstanding)} />
              <ConfirmRow label="Amount Received" value={peso(received)} highlight />
              <ConfirmRow label="Payment Method" value={payment.method} />
              <ConfirmRow label="Status After Submit" value="Awaiting Manager" />
            </div>
            <div style={{
              background: `linear-gradient(160deg, ${C.goldSoft}, ${C.bg})`, border: `1px solid ${C.goldBorder}`,
              borderRadius: 18, padding: '22px', textAlign: 'center',
            }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 6px' }}>Total to Collect</p>
              <p style={{ fontSize: 30, fontWeight: 900, color: C.gold, margin: '0 0 18px', letterSpacing: -0.6 }}>{peso(outstanding)}</p>
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 20px 40px -16px rgba(16,185,129,0.55)' }}
                whileTap={{ scale: 0.97 }}
                disabled={submitting}
                onClick={handleSubmit}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: C.emerald, border: 'none', borderRadius: 14, padding: '16px 0',
                  color: '#fff', fontWeight: 900, fontSize: 13, letterSpacing: 0.3,
                  cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.7 : 1,
                  boxShadow: '0 14px 28px -12px rgba(16,185,129,0.5)',
                }}
              >
                {submitting ? 'Processing…' : 'Collect Payment'} <ArrowRightCircle size={18} />
              </motion.button>
            </div>
          </div>
        </WorkspaceSection>
      </div>
    </motion.div>
  );
};

const ReceiptLine = ({ label, value, highlight }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
    <span style={{ fontSize: 11, color: C.muted }}>{label}</span>
    <span style={{ fontSize: 11.5, fontWeight: 700, color: highlight ? C.gold : C.text }}>{value || <NA />}</span>
  </div>
);

const ConfirmRow = ({ label, value, highlight }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>{label}</span>
    <span style={{ fontSize: 13, fontWeight: 900, color: highlight ? C.gold : C.text }}>{value || <NA />}</span>
  </div>
);

/* ============================================================
   MAIN PAYMENT PROCESS PAGE
   ============================================================ */
const PaymentProcess = ({ onNavigate = () => {}, onLogout = () => {} }) => {
  const [jobs, setJobs] = useState([]);       // queue: technician-done, not yet paid / not awaiting manager
  const [allJobs, setAllJobs] = useState([]); // full set, for KPIs / timeline / method overview
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeJob, setActiveJob] = useState(null);
  const queueRef = useRef(null);

  const fetchData = async () => {
    const { data: queue } = await supabase
      .from('appointments')
      .select('*')
      .neq('payment_status', 'paid')
      .neq('status', 'awaiting_manager')
      .order('created_at', { ascending: false });
    if (queue) setJobs(queue);

    const { data: everything } = await supabase
      .from('appointments')
      .select('*')
      .order('created_at', { ascending: false });
    if (everything) setAllJobs(everything);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const sub = supabase
      .channel('realtime_payment_process')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  const filteredJobs = useMemo(() => {
    if (!searchTerm.trim()) return jobs;
    const q = searchTerm.toLowerCase();
    return jobs.filter((j) => j.full_name?.toLowerCase().includes(q) || j.service_type?.toLowerCase().includes(q));
  }, [jobs, searchTerm]);

  // ---- KPI derivations (all computed from live data — nothing hardcoded) ----
  const today = new Date().toDateString();
  const kpis = useMemo(() => {
    const pendingReviews = jobs.filter((j) => j.status === 'completed').length;
    const readyForPayment = jobs.filter((j) => j.payment_status !== 'paid').length;
    const collectedToday = allJobs
      .filter((j) => j.payment_status === 'paid' && j.created_at && new Date(j.created_at).toDateString() === today)
      .reduce((sum, j) => sum + (Number(j.price) || 0), 0);
    const expectedRevenue = jobs.reduce((sum, j) => sum + Math.max(0, (Number(j.price) || 0) - (Number(j.downpayment_paid) || 0)), 0);
    const pendingDownpayment = jobs.filter((j) => (Number(j.downpayment_paid) || 0) === 0).length;
    const completedTransactions = allJobs.filter((j) => j.status === 'awaiting_manager' || j.payment_status === 'paid').length;
    return { pendingReviews, readyForPayment, collectedToday, expectedRevenue, pendingDownpayment, completedTransactions };
  }, [jobs, allJobs, today]);

  const paidJobs = useMemo(() => allJobs.filter((j) => j.payment_status === 'paid'), [allJobs]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg, fontFamily: `'Inter', -apple-system, BlinkMacSystemFont, sans-serif` }}>
      <style>{`
        @keyframes cw-pulse { 0% { transform: scale(1); opacity: .9; } 100% { transform: scale(2.6); opacity: 0; } }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      <Sidebar active="payment" onNavigate={onNavigate} onLogout={onLogout} />

      <div style={{ flex: 1, padding: '30px 40px 60px', maxWidth: 1400, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 26 }}>

        {/* ---------- Section 1 — JOB REVIEW QUEUE (largest, first) ---------- */}
        <div ref={queueRef}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18 }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 800, color: C.gold, textTransform: 'uppercase', letterSpacing: 1.2, margin: '0 0 4px' }}>Section 1 · Primary Focus</p>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: '#F8FAFC', margin: 0, letterSpacing: -0.4 }}>Payment Process Queue</h1>
              <p style={{ fontSize: 12, color: C.muted, margin: '4px 0 0' }}>
                {loading ? 'Loading jobs…' : `${filteredJobs.length} job${filteredJobs.length === 1 ? '' : 's'} awaiting payment processing`}
              </p>
            </div>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 14, top: 13, color: C.muted }} />
              <input
                type="text"
                placeholder="Search customer, service…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: '11px 16px 11px 38px', fontSize: 12, color: C.text, outline: 'none', width: 280 }}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ height: 320, borderRadius: 20, background: C.panel, border: `1px solid ${C.border}`, opacity: 0.5 }} />
              ))}
            </div>
          ) : filteredJobs.length === 0 ? (
            <GlassPanel style={{ padding: 60, textAlign: 'center' }}>
              <CheckCircle2 size={32} style={{ color: C.emerald, marginBottom: 12 }} />
              <p style={{ fontSize: 14, fontWeight: 800, color: C.text, margin: '0 0 4px' }}>Queue is clear</p>
              <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>No jobs are currently waiting for payment.</p>
            </GlassPanel>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              <AnimatePresence>
                {filteredJobs.map((job, i) => (
                  <JobCard key={job.id} job={job} index={i} onReview={setActiveJob} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* ---------- Section 2 — Business Overview ---------- */}
        <div>
          <SectionHeader eyebrow="Section 2" title="Business Overview" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
            <KPICard index={0} label="Pending Reviews" value={kpis.pendingReviews} icon={ClipboardList} accent={C.gold} />
            <KPICard index={1} label="Ready For Payment" value={kpis.readyForPayment} icon={Wallet} accent={C.sky} />
            <KPICard index={2} label="Collected Today" value={kpis.collectedToday} format="currency" icon={DollarSign} accent={C.emerald} />
            <KPICard index={3} label="Expected Revenue" value={kpis.expectedRevenue} format="currency" icon={TrendingIcon} accent={C.violet} />
            <KPICard index={4} label="Pending Downpayment" value={kpis.pendingDownpayment} icon={AlertCircle} accent={C.rose} />
            <KPICard index={5} label="Completed Transactions" value={kpis.completedTransactions} icon={CheckCircle2} accent={C.gold} />
          </div>
        </div>

        {/* ---------- Section 3 ---------- */}
        <WorkflowProgress jobs={allJobs} />

        {/* ---------- Sections 4 + 5 + 6 ---------- */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <PaymentMethodOverview paidJobs={paidJobs} />
            <QuickActions onNavigate={onNavigate} onFocusQueue={() => queueRef.current?.scrollIntoView({ behavior: 'smooth' })} />
          </div>
          <RecentActivityTimeline jobs={allJobs} />
        </div>
      </div>

      <AnimatePresence>
        {activeJob && (
          <PaymentWorkspace
            job={activeJob}
            onClose={() => setActiveJob(null)}
            onSubmit={() => { setActiveJob(null); fetchData(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default PaymentProcess;
