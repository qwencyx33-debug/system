import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ClipboardList, DollarSign, Wrench, XCircle, CheckCircle, Info, AlertTriangle, UserX, Flame, CreditCard, Hourglass, ShieldAlert, ChevronRight, Edit3, Loader2, User, CheckCircle2, Star, ClipboardCheck, ShieldCheck, Users, LogOut, Sun, Moon, Zap, LayoutDashboard, Database, CalendarClock, UserX2, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import UserManagement from './UserManagement';
import TechnicianManagement from './TechnicianManagement';
import ServiceLogs from './ServiceLogs';
import EditAppointmentModal from './EditAppointmentModal';
import ServiceManagement from './ServiceManagement';

/* ─────────────────────────── theme ─────────────────────────── */
/* ════════════════════════════════════════════════════════════
   RION_CORE — Brand Token System
   Two colors only: Navy Blue (structure) + Gold (signal).
   Every status, priority, and semantic color below is a shade
   or opacity of one of these two — never a third hue.
════════════════════════════════════════════════════════════ */

const GOLD        = '#E8B000';   // primary accent — action, highlight
const GOLD_SOFT   = '#F4CD4D';   // lighter gold — hover, secondary highlight
const GOLD_DEEP   = '#A87700';   // burnt gold — used in place of "danger red"

const NAVY_DEEP   = '#040A14';   // page background
const NAVY        = '#081226';   // sidebar / base panels
const NAVY_PANEL  = '#0E1B33';   // card background
const NAVY_RAISED = '#132542';   // hovered / raised surface
const NAVY_LINE   = 'rgba(232,176,0,0.10)'; // hairline borders

const TEXT        = '#EAF1FB';   // primary text
const TEXT_DIM    = '#8CA0C0';   // secondary text / labels
const TEXT_FAINT  = 'rgba(140,160,192,0.55)';

/* Semantic mapping — all derived from gold/navy only.
   Urgency is conveyed through saturation + motion, not hue. */
const SEMANTIC = {
  info:     { fg: '#5A8CDC', bg: 'rgba(90,140,220,0.14)', line: 'rgba(90,140,220,0.35)', dot: '#5A8CDC' }, // muted navy-blue, still "navy family"
  success:  { fg: GOLD,      bg: 'rgba(232,176,0,0.12)', line: 'rgba(232,176,0,0.35)', dot: GOLD },
  warning:  { fg: GOLD_SOFT, bg: 'rgba(244,205,77,0.10)', line: 'rgba(244,205,77,0.35)', dot: GOLD_SOFT },
  critical: { fg: GOLD_DEEP, bg: 'rgba(168,119,0,0.16)',  line: 'rgba(168,119,0,0.45)',  dot: GOLD_DEEP },
  neutral:  { fg: TEXT_DIM,  bg: 'rgba(140,160,192,0.08)', line: 'rgba(140,160,192,0.2)', dot: TEXT_DIM },
};

const FONT_DISPLAY = "'Bebas Neue', sans-serif";
const FONT_BODY    = "'DM Sans', sans-serif";

const RADIUS = 14;
const RADIUS_SM = 8;

const GLASS = {
  background: `${NAVY_PANEL}cc`,
  border: `1px solid ${NAVY_LINE}`,
  backdropFilter: 'blur(20px)',
  borderRadius: RADIUS,
};

/* ─────────────────────────── helpers ─────────────────────────── */
function timeAgo(ts) {
  if (!ts) return '';
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60)    return `${Math.max(0, Math.floor(diff))}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function isToday(ts) {
  if (!ts) return false;
  const d = new Date(ts);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

function useCountUp(target, duration = 1100, active = true) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    if (!target) { setVal(0); return; }
    let start = null;
    let raf;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.floor(p * target));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, active]);
  return val;
}

/* live clock — ticks every second, used by the Hero + top bar only (display, no data implications) */
function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/* ─────────────────────────── StatusBadge ─────────────────────────── */
/**
 * StatusBadge — small pill used everywhere a state needs to be named.
 * `tone` maps to the SEMANTIC token set (info | success | warning | critical | neutral).
 * `pulse` adds a live-updating dot for things that are actively changing.
 */
const StatusBadge = ({ label, tone = 'neutral', pulse = false }) => {
  const t = SEMANTIC[tone] || SEMANTIC.neutral;
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 10px', borderRadius: 999,
        background: t.bg, border: `1px solid ${t.line}`,
        color: t.fg, fontFamily: FONT_BODY,
        fontSize: 9.5, fontWeight: 800, letterSpacing: '0.14em',
        textTransform: 'uppercase', whiteSpace: 'nowrap',
      }}
    >
      {pulse && (
        <motion.span
          animate={{ opacity: [1, 0.35, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: 6, height: 6, borderRadius: '50%', background: t.dot, flexShrink: 0 }}
        />
      )}
      {label}
    </span>
  );
};

/* ─────────────────────────── DashboardCard ─────────────────────────── */
/**
 * DashboardCard — the single panel shell every section sits inside.
 * Keeps spacing, border, and the gold eyebrow label consistent everywhere.
 */
const DashboardCard = ({ title, action, children, style = {}, noPad = false, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
    style={{ ...GLASS, padding: noPad ? 0 : '22px 20px', ...style }}
  >
    {title && (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, padding: noPad ? '18px 20px 0' : 0 }}>
        <div style={{
          fontFamily: FONT_BODY, fontSize: 9, fontWeight: 800,
          letterSpacing: '0.32em', textTransform: 'uppercase', color: GOLD,
        }}>
          {title}
        </div>
        {action}
      </div>
    )}
    {children}
  </motion.div>
);

/* ─────────────────────────── StatCard ─────────────────────────── */
/**
 * StatCard — animated executive-overview tile.
 * Pass `tone` as a hex color (always a gold or navy-blue shade upstream)
 * to theme the icon chip and top-edge highlight per metric.
 * Adds a mouse-parallax tilt on top of the existing lift/glow.
 */
const StatCard = ({ label, value, icon, tone = GOLD, suffix = '', onClick, delay = 0 }) => {
  const counted = useCountUp(typeof value === 'number' ? value : 0, 1100, true);
  const ref = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: py * -6, y: px * 8 });
  };
  const resetTilt = () => setTilt({ x: 0, y: 0 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0, rotateX: tilt.x, rotateY: tilt.y }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -5, boxShadow: `0 14px 34px -8px ${tone}40` }}
      onMouseMove={handleMouseMove}
      onMouseLeave={resetTilt}
      onClick={onClick}
      style={{
        background: `${NAVY_PANEL}dd`, border: `1px solid ${NAVY_LINE}`,
        borderRadius: RADIUS, padding: '20px 20px 18px', position: 'relative',
        overflow: 'hidden', cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.25s', transformStyle: 'preserve-3d', perspective: 800,
      }}
    >
      <motion.div
        style={{ position: 'absolute', top: 0, left: '-40%', right: 0, height: 2, width: '40%', background: `linear-gradient(90deg, transparent, ${tone}, transparent)` }}
        animate={{ left: ['-40%', '140%'] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'linear', delay: delay + 0.6 }}
      />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${tone}, transparent)`, opacity: 0.35 }} />
      <div style={{
        width: 36, height: 36, borderRadius: 10, marginBottom: 16,
        background: `${tone}18`, color: tone,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>
      <div style={{
        fontFamily: FONT_BODY, fontSize: 9, fontWeight: 800, letterSpacing: '0.24em',
        textTransform: 'uppercase', color: TEXT_DIM, marginBottom: 8,
      }}>
        {label}
      </div>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 34, letterSpacing: '0.03em', color: TEXT, lineHeight: 1 }}>
        {counted}{suffix}
      </div>
    </motion.div>
  );
};

/* ─────────────────────────── HeroSection ─────────────────────────── */
/**
 * HeroSection — the command-center welcome. Pure presentation: greeting,
 * live clock, and a one-line executive summary built from real `overview`
 * numbers already computed in the dashboard (no new data sources).
 */
const HERO_PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  left: (i * 37) % 100,
  size: 2 + (i % 3),
  duration: 6 + (i % 5) * 1.4,
  delay: (i * 0.6) % 5,
}));

const HeroSection = ({ adminName = 'Admin', overview }) => {
  const now = useClock();
  const hour = now.getHours();
  const greeting = hour < 5 ? 'Good Night' : hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : hour < 21 ? 'Good Evening' : 'Good Night';

  const dateStr = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const timeStr = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const summary = overview
    ? `${overview.activeJobs} job${overview.activeJobs === 1 ? '' : 's'} active right now, ${overview.todaysSchedule} on today's schedule${overview.waitingAssignment ? `, ${overview.waitingAssignment} awaiting a technician` : ''}.`
    : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'relative', overflow: 'hidden', borderRadius: RADIUS,
        border: `1px solid ${NAVY_LINE}`,
        background: `radial-gradient(120% 160% at 15% -10%, ${GOLD}14 0%, transparent 55%), linear-gradient(135deg, ${NAVY} 0%, ${NAVY_PANEL} 55%, ${NAVY_DEEP} 100%)`,
        padding: '34px 32px', marginBottom: 20, minHeight: 168,
      }}
    >
      {/* floating gold particles */}
      {HERO_PARTICLES.map(p => (
        <motion.span
          key={p.id}
          initial={{ y: '110%', opacity: 0 }}
          animate={{ y: '-20%', opacity: [0, 0.7, 0] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', left: `${p.left}%`, bottom: 0,
            width: p.size, height: p.size, borderRadius: '50%',
            background: GOLD, boxShadow: `0 0 6px ${GOLD}`, pointerEvents: 'none',
          }}
        />
      ))}

      {/* animated light sweep */}
      <motion.div
        initial={{ x: '-30%' }}
        animate={{ x: '130%' }}
        transition={{ duration: 5.5, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
        style={{
          position: 'absolute', top: 0, bottom: 0, width: '22%',
          background: 'linear-gradient(100deg, transparent, rgba(232,176,0,0.06), transparent)',
          pointerEvents: 'none',
        }}
      />

      {/* glass reflection */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.035), transparent)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 20 }}>
        <div>
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}
          >
            <Sparkles size={13} style={{ color: GOLD }} />
            <span style={{ fontFamily: FONT_BODY, fontSize: 9.5, fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase', color: GOLD_SOFT }}>
              {dateStr}
            </span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.5 }}
            style={{ fontFamily: FONT_DISPLAY, fontSize: 42, letterSpacing: '0.02em', color: TEXT, margin: 0, lineHeight: 1 }}
          >
            {greeting}, {adminName}
          </motion.h1>
          {!!summary && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32, duration: 0.5 }}
              style={{ fontFamily: FONT_BODY, fontSize: 13, color: TEXT_DIM, marginTop: 10, marginBottom: 0, maxWidth: 480, lineHeight: 1.5 }}
            >
              {summary}
            </motion.p>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          style={{
            textAlign: 'right', padding: '14px 20px', borderRadius: 12,
            background: `${NAVY_DEEP}66`, border: `1px solid ${NAVY_LINE}`, backdropFilter: 'blur(10px)',
          }}
        >
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 30, letterSpacing: '0.05em', color: GOLD, lineHeight: 1 }}>
            {timeStr}
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 8.5, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: TEXT_FAINT, marginTop: 4 }}>
            Local Time
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

/* ─────────────────────────── ProgressTracker ─────────────────────────── */
const APPOINTMENT_STAGES = [
  { key: 'pending',     label: 'Pending' },
  { key: 'approved',    label: 'Approved' },
  { key: 'scheduled',   label: 'Scheduled' },
  { key: 'assigned',    label: 'Assigned' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed',   label: 'Completed' },
];

const ProgressTracker = ({ status }) => {
  const idx = APPOINTMENT_STAGES.findIndex(s => s.key === status);
  const current = Math.max(idx, 0);
  return (
    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
      {APPOINTMENT_STAGES.map((stage, i) => {
        const done   = i < current;
        const active = i === current;
        const color  = done || active ? GOLD : TEXT_FAINT;
        return (
          <React.Fragment key={stage.key}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                background: done ? 'rgba(232,176,0,0.22)' : active ? 'rgba(232,176,0,0.16)' : 'rgba(140,160,192,0.08)',
                border: `1.5px solid ${color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.3s',
                boxShadow: active ? `0 0 8px ${GOLD_SOFT}70` : 'none',
              }}>
                {done ? <Check size={10} style={{ color: GOLD }} /> :
                  active ? <div style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD }} /> :
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: TEXT_FAINT }} />}
              </div>
              <span style={{ fontFamily: FONT_BODY, fontSize: 7, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color, whiteSpace: 'nowrap' }}>
                {stage.label}
              </span>
            </div>
            {i < APPOINTMENT_STAGES.length - 1 && (
              <div style={{ flex: 1, height: 1.5, background: done ? GOLD : 'rgba(140,160,192,0.15)', transition: 'background 0.4s', marginBottom: 14 }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/* ─────────────────────────── ActivityTimeline ─────────────────────────── */
const EVENT_META = {
  INSERT:    { label: 'New Appointment',  icon: <ClipboardList size={12} /> },
  paid:      { label: 'Payment Received', icon: <DollarSign   size={12} /> },
  assigned:  { label: 'Technician Assigned', icon: <Wrench     size={12} /> },
  cancelled: { label: 'Cancelled',        icon: <XCircle       size={12} /> },
  completed: { label: 'Completed',        icon: <CheckCircle   size={12} /> },
};

const ActivityTimeline = ({ events }) => (
  <div style={{ display: 'flex', flexDirection: 'column' }}>
    {events.slice(0, 8).map((ev, i, arr) => {
      const meta = EVENT_META[ev.event || ev.status] || EVENT_META.INSERT;
      return (
        <motion.div
          key={ev.id || i}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          style={{ display: 'flex', gap: 14, position: 'relative', paddingBottom: 20 }}
        >
          {i < arr.length - 1 && (
            <div style={{ position: 'absolute', left: 13, top: 28, width: 1.5, height: 'calc(100% - 10px)', background: NAVY_LINE }} />
          )}
          <div style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: 'rgba(232,176,0,0.14)', border: `1px solid rgba(232,176,0,0.28)`,
            color: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: i === 0 ? `0 0 12px rgba(232,176,0,0.35)` : 'none', zIndex: 1,
          }}>
            {meta.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: TEXT, marginBottom: 2 }}>{meta.label}</div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: TEXT_DIM, lineHeight: 1.5 }}>
              {ev.full_name && <span style={{ color: GOLD }}>{ev.full_name}</span>}
              {ev.service_type && ` — ${ev.service_type}`}
            </div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: TEXT_FAINT, marginTop: 4 }}>
              {ev.created_at ? timeAgo(ev.created_at) : ''}
            </div>
          </div>
        </motion.div>
      );
    })}
    {events.length === 0 && (
      <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: TEXT_DIM, textAlign: 'center', padding: '24px 0' }}>
        No activity yet — new appointments will appear here in real time.
      </div>
    )}
  </div>
);

/* ─────────────────────────── PopupMessage ─────────────────────────── */
const ICONS = {
  success: <CheckCircle size={22} />,
  error:   <XCircle size={22} />,
  info:    <Info size={22} />,
  warn:    <AlertTriangle size={22} />,
};

/**
 * usePopupCenter — drop into any component to get `notify(...)`.
 * Renders center-screen, glass, auto-dismissing confirmation popups.
 * This replaces window.alert / default browser dialogs everywhere.
 * (This is a lightweight toast for action feedback — distinct from, and
 * a replacement for, the notification bell/dropdown that has been removed.)
 *
 * Usage:
 *   const { notify, PopupCenter } = usePopupCenter();
 *   notify({ type: 'success', title: 'Payment confirmed', message: '...' });
 *   return <>{...}<PopupCenter /></>;
 */
function usePopupCenter() {
  const [popups, setPopups] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setPopups(prev => prev.filter(p => p.id !== id));
  }, []);

  const notify = useCallback(({ type = 'success', title, message, duration = 2600 }) => {
    const id = ++idRef.current;
    setPopups(prev => [...prev, { id, type, title, message }]);
    if (duration > 0) setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const PopupCenter = useCallback(() => (
    <div style={{
      position: 'fixed', inset: 0, pointerEvents: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 10000,
    }}>
      <AnimatePresence>
        {popups.map(p => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -8, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', stiffness: 360, damping: 26 }}
            style={{
              pointerEvents: 'auto', position: 'absolute',
              background: `${NAVY_PANEL}f2`, border: `1px solid ${NAVY_LINE}`,
              borderRadius: RADIUS, backdropFilter: 'blur(24px)',
              boxShadow: `0 24px 70px rgba(0,0,0,0.55), 0 0 0 1px ${GOLD}14`,
              padding: '22px 26px', minWidth: 300, maxWidth: 380,
              display: 'flex', gap: 14, alignItems: 'flex-start',
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: `${GOLD}18`, color: GOLD,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {ICONS[p.type] || ICONS.success}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, letterSpacing: '0.03em', color: TEXT, marginBottom: 3 }}>
                {p.title}
              </div>
              {p.message && (
                <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: TEXT_DIM, lineHeight: 1.5 }}>
                  {p.message}
                </div>
              )}
            </div>
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 2.6, ease: 'linear' }}
              style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
                background: GOLD, transformOrigin: 'left', borderRadius: '0 0 14px 14px', opacity: 0.6,
              }}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  ), [popups]);

  return { notify, PopupCenter };
}

/* ─────────────────────────── ConfirmModal ─────────────────────────── */
/**
 * ConfirmModal — premium navy-glass confirmation dialog.
 * Used for logout, approve/reject, and any destructive or high-stakes action.
 * Controlled component: pass `open`, resolve via onConfirm / onCancel.
 */
const ConfirmModal = ({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, onConfirm, onCancel }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 10001,
          background: `${NAVY_DEEP}b3`, backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        onClick={onCancel}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 8 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: 380, background: `${NAVY_PANEL}f7`, border: `1px solid ${NAVY_LINE}`,
            borderRadius: RADIUS, padding: '30px 28px', boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
          }}
        >
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, letterSpacing: '0.03em', color: TEXT, marginBottom: 10 }}>
            {title}
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: TEXT_DIM, lineHeight: 1.6, marginBottom: 26 }}>
            {message}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <motion.button
              whileHover={{ opacity: 0.75 }} whileTap={{ scale: 0.96 }}
              onClick={onCancel}
              style={{
                padding: '10px 18px', background: 'transparent', border: `1px solid ${NAVY_LINE}`,
                borderRadius: 9, color: TEXT_DIM, fontFamily: FONT_BODY, fontSize: 11,
                fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer',
              }}
            >
              {cancelLabel}
            </motion.button>
            <motion.button
              whileHover={{ y: -1, boxShadow: `0 8px 20px -6px ${GOLD}66` }} whileTap={{ scale: 0.96 }}
              onClick={onConfirm}
              style={{
                padding: '10px 20px', background: danger ? 'transparent' : GOLD,
                border: danger ? `1px solid ${GOLD}` : 'none',
                color: danger ? GOLD : NAVY_DEEP, borderRadius: 9, fontFamily: FONT_BODY, fontSize: 11,
                fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer',
              }}
            >
              {confirmLabel}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

/* ─────────────────────────── LogoutOverlay ─────────────────────────── */
/**
 * LogoutOverlay — the final beat of the "closing a premium desktop app" flow.
 * Fades the whole screen to navy with a centered mark + spinner, then the
 * caller swaps in the login screen once `onDone` fires. Pure presentation —
 * the actual supabase.auth.signOut() call happens in the dashboard.
 */
const LogoutOverlay = ({ open, onDone }) => {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => onDone?.(), 1400);
    return () => clearTimeout(t);
  }, [open, onDone]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 10002,
            background: NAVY_DEEP,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 18,
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 20 }}
            style={{
              width: 52, height: 52, borderRadius: 14, background: GOLD,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: NAVY_DEEP, boxShadow: `0 0 30px ${GOLD}55`,
            }}
          >
            <ShieldCheck size={24} />
          </motion.div>
          <Loader2 size={20} className="adm-spin" style={{ color: GOLD }} />
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            style={{ fontFamily: FONT_BODY, fontSize: 10, fontWeight: 800, letterSpacing: '0.32em', textTransform: 'uppercase', color: TEXT_DIM }}
          >
            Ending Session
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ─────────────────────────── UrgentActionCenter ─────────────────────────── */
/**
 * UrgentActionCenter — surfaces everything that needs a human decision right now.
 * Built entirely from `appointments` + `qc_reports`, no new tables.
 *
 * Field assumptions (adjust to match your exact column names):
 *  appointments.technician_id, appointments.priority ('high' | 'normal'),
 *  appointments.payment_status, appointments.status
 *  qc_reports.status ('flagged' | 'failed' | ...), qc_reports.appointment_id
 */
const Row = ({ icon, title, subtitle, onClick, delay }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay }}
    whileHover={{ x: 3 }}
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
      background: 'rgba(232,176,0,0.05)', border: `1px solid ${NAVY_LINE}`,
      borderRadius: 10, cursor: onClick ? 'pointer' : 'default', marginBottom: 8,
    }}
  >
    <motion.div
      animate={{ opacity: [1, 0.55, 1] }}
      transition={{ duration: 1.8, repeat: Infinity }}
      style={{
        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
        background: `${GOLD_DEEP}22`, color: GOLD_DEEP,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {icon}
    </motion.div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 700, color: TEXT }}>{title}</div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: TEXT_DIM }}>{subtitle}</div>
    </div>
    <ChevronRight size={15} style={{ color: TEXT_DIM, flexShrink: 0 }} />
  </motion.div>
);

const Group = ({ icon, label, count, children, delay }) => {
  if (count === 0) return null;
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ color: GOLD, display: 'flex' }}>{icon}</span>
        <span style={{ fontFamily: FONT_BODY, fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: TEXT }}>{label}</span>
        <span style={{
          background: GOLD, color: '#040A14', fontSize: 10, fontWeight: 800,
          padding: '1px 8px', borderRadius: 999, marginLeft: 2,
        }}>{count}</span>
      </div>
      {children}
    </div>
  );
};

const UrgentActionCenter = ({ appointments = [], qcReports = [], onSelect }) => {
  const buckets = useMemo(() => {
    const unassigned = appointments.filter(a =>
      !a.technician_id && ['pending', 'approved', 'scheduled'].includes(a.status));
    const highPriority = appointments.filter(a =>
      (a.priority === 'high' || a.priority === 'urgent') && a.status !== 'completed' && a.status !== 'cancelled');
    const pendingPayment = appointments.filter(a =>
      a.payment_status === 'pending' && a.status === 'completed');
    const waitingApproval = appointments.filter(a => a.status === 'pending');
    const qcIssues = qcReports.filter(q => ['flagged', 'failed', 'issue'].includes((q.status || '').toLowerCase()));
    return { unassigned, highPriority, pendingPayment, waitingApproval, qcIssues };
  }, [appointments, qcReports]);

  const total = buckets.unassigned.length + buckets.highPriority.length +
    buckets.pendingPayment.length + buckets.waitingApproval.length + buckets.qcIssues.length;

  return (
    <DashboardCard title="Needs Attention" delay={0.05}
      action={total > 0 ? (
        <span style={{ fontFamily: FONT_BODY, fontSize: 9, fontWeight: 800, color: GOLD_DEEP, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          {total} open
        </span>
      ) : null}
    >
      {total === 0 ? (
        <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: TEXT_DIM, textAlign: 'center', padding: '20px 0' }}>
          Nothing urgent — all clear.
        </div>
      ) : (
        <>
          <Group icon={<UserX size={13} />} label="No Technician Assigned" count={buckets.unassigned.length} delay={0.06}>
            {buckets.unassigned.slice(0, 4).map((a, i) => (
              <Row key={a.id} icon={<UserX size={14} />} title={a.full_name} subtitle={a.service_type}
                onClick={() => onSelect?.(a)} delay={0.06 + i * 0.03} />
            ))}
          </Group>
          <Group icon={<Flame size={13} />} label="High Priority" count={buckets.highPriority.length} delay={0.08}>
            {buckets.highPriority.slice(0, 4).map((a, i) => (
              <Row key={a.id} icon={<Flame size={14} />} title={a.full_name} subtitle={a.service_type}
                onClick={() => onSelect?.(a)} delay={0.08 + i * 0.03} />
            ))}
          </Group>
          <Group icon={<CreditCard size={13} />} label="Pending Payments" count={buckets.pendingPayment.length} delay={0.1}>
            {buckets.pendingPayment.slice(0, 4).map((a, i) => (
              <Row key={a.id} icon={<CreditCard size={14} />} title={a.full_name} subtitle={a.service_type}
                onClick={() => onSelect?.(a)} delay={0.1 + i * 0.03} />
            ))}
          </Group>
          <Group icon={<Hourglass size={13} />} label="Waiting Approval" count={buckets.waitingApproval.length} delay={0.12}>
            {buckets.waitingApproval.slice(0, 4).map((a, i) => (
              <Row key={a.id} icon={<Hourglass size={14} />} title={a.full_name} subtitle={a.service_type}
                onClick={() => onSelect?.(a)} delay={0.12 + i * 0.03} />
            ))}
          </Group>
          <Group icon={<ShieldAlert size={13} />} label="QC Issues" count={buckets.qcIssues.length} delay={0.14}>
            {buckets.qcIssues.slice(0, 4).map((q, i) => (
              <Row key={q.id} icon={<ShieldAlert size={14} />} title={q.full_name || `Report #${q.id}`} subtitle={q.notes || q.status}
                delay={0.14 + i * 0.03} />
            ))}
          </Group>
        </>
      )}
    </DashboardCard>
  );
};

/* ─────────────────────────── LiveOperationsPanel ─────────────────────────── */
const PRIORITY_TONE = { high: 'critical', urgent: 'critical', normal: 'neutral', low: 'neutral' };

/**
 * LiveOperationsPanel — Customer / Service / Technician / Schedule / Status / Priority
 * Sourced from `appointments`, joined against `profiles` for technician name.
 */
const LiveOperationsPanel = ({ appointments = [], techniciansById = {}, loading, onEdit, onApprove, onReject }) => (
  <DashboardCard title="Live Operations" delay={0.1}>
    {loading ? (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
        <Loader2 size={22} style={{ color: GOLD }} className="adm-spin" />
      </div>
    ) : appointments.length === 0 ? (
      <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: TEXT_DIM, textAlign: 'center', padding: '30px 0' }}>
        No live appointments right now.
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {appointments.map((apt, i) => {
          const tech = apt.technician_id ? techniciansById[apt.technician_id] : null;
          return (
            <motion.div
              key={apt.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ backgroundColor: 'rgba(232,176,0,0.03)' }}
              transition={{ delay: i * 0.04 }}
              style={{ padding: '16px 4px', borderBottom: `1px solid ${NAVY_LINE}`, borderRadius: 8 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 160 }}>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 2 }}>{apt.full_name}</div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: TEXT_DIM }}>{apt.service_type}</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 130 }}>
                  <User size={13} style={{ color: tech ? GOLD : TEXT_DIM }} />
                  <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: tech ? TEXT : TEXT_DIM }}>
                    {tech ? tech.full_name : 'Unassigned'}
                  </span>
                </div>

                {apt.priority && (apt.priority === 'high' || apt.priority === 'urgent') && (
                  <StatusBadge label={apt.priority} tone="critical" pulse />
                )}

                <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                  <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }} onClick={() => onEdit(apt)}
                    style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(232,176,0,0.08)', border: '1px solid rgba(232,176,0,0.2)', color: GOLD, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Edit3 size={13} />
                  </motion.button>
                  {apt.status === 'pending' && (<>
                    <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }} onClick={() => onApprove(apt)}
                      style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(232,176,0,0.14)', border: '1px solid rgba(232,176,0,0.3)', color: GOLD, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle size={13} />
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }} onClick={() => onReject(apt)}
                      style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(140,160,192,0.08)', border: `1px solid ${NAVY_LINE}`, color: TEXT_DIM, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <XCircle size={13} />
                    </motion.button>
                  </>)}
                </div>
              </div>
              <ProgressTracker status={apt.status} />
            </motion.div>
          );
        })}
      </div>
    )}
  </DashboardCard>
);

/* ─────────────────────────── ServiceAnalytics ─────────────────────────── */
/**
 * ServiceAnalytics — most requested services + completed vs pending, from `appointments`.
 * Bars alternate gold / soft-gold only — no third color introduced.
 * A hovered bar reveals its exact share of the total (from existing data only).
 */
const ServiceAnalytics = ({ appointments = [] }) => {
  const [hovered, setHovered] = useState(null);

  const chartData = useMemo(() => {
    const counts = appointments.reduce((acc, a) => {
      const key = (a.service_type || 'Other').split(' ')[0];
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value).slice(0, 8);
  }, [appointments]);

  const totalJobs = chartData.reduce((s, d) => s + d.value, 0) || 1;
  const completed = appointments.filter(a => a.status === 'completed').length;
  const pending = appointments.filter(a => !['completed', 'cancelled'].includes(a.status)).length;
  const total = completed + pending || 1;

  return (
    <DashboardCard title="Service Analytics" delay={0.06}>
      <div style={{ height: 200, marginBottom: 8, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barCategoryGap="38%" onMouseLeave={() => setHovered(null)}>
            <XAxis dataKey="name" stroke={TEXT_DIM} axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: TEXT_DIM }} />
            <Tooltip
              cursor={{ fill: 'rgba(232,176,0,0.05)' }}
              contentStyle={{ background: NAVY_PANEL, border: `1px solid ${NAVY_LINE}`, borderRadius: 8, color: TEXT, fontSize: 11 }}
              formatter={(value) => [`${value} job${value === 1 ? '' : 's'} · ${Math.round((value / totalJobs) * 100)}%`, 'Requests']}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={26} onMouseEnter={(_, i) => setHovered(i)}>
              {chartData.map((_, i) => (
                <Cell
                  key={i}
                  fill={i % 2 === 0 ? GOLD : GOLD_SOFT}
                  fillOpacity={hovered === null ? (i % 2 === 0 ? 1 : 0.7) : hovered === i ? 1 : 0.35}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT_BODY, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TEXT_DIM, marginBottom: 8 }}>
          <span>Completed vs Open</span>
          <span style={{ color: GOLD }}>{Math.round((completed / total) * 100)}% complete</span>
        </div>
        <div style={{ height: 8, borderRadius: 999, background: 'rgba(140,160,192,0.12)', overflow: 'hidden', display: 'flex' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(completed / total) * 100}%` }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            style={{ background: GOLD }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: FONT_BODY, fontSize: 10.5, color: TEXT_DIM }}>
          <span>{completed} completed</span>
          <span>{pending} open</span>
        </div>
      </div>
    </DashboardCard>
  );
};

/* ─────────────────────────── TechnicianPerformance ─────────────────────────── */
/**
 * TechnicianPerformance — built from `profiles` (role='technician') + `appointments`.
 * "Active" = has at least one appointment currently in progress/assigned.
 * Workload = open (non-completed, non-cancelled) jobs currently assigned to them.
 */
const TechnicianPerformance = ({ technicians = [], appointments = [] }) => {
  const rows = useMemo(() => {
    return technicians.map(t => {
      const mine = appointments.filter(a => a.technician_id === t.id);
      const open = mine.filter(a => !['completed', 'cancelled'].includes(a.status));
      const completed = mine.filter(a => a.status === 'completed');
      const active = mine.some(a => ['assigned', 'in_progress'].includes(a.status));
      return { ...t, open: open.length, completed: completed.length, active };
    }).sort((a, b) => b.open - a.open);
  }, [technicians, appointments]);

  const activeCount = rows.filter(r => r.active).length;

  return (
    <DashboardCard
      title="Field Force"
      delay={0.18}
      action={
        <span style={{ fontFamily: FONT_BODY, fontSize: 9, fontWeight: 800, color: GOLD, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          {activeCount} active
        </span>
      }
    >
      {rows.length === 0 ? (
        <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: TEXT_DIM, textAlign: 'center', padding: '20px 0' }}>
          No technicians on record.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {rows.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0',
                borderBottom: `1px solid ${NAVY_LINE}`,
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                background: t.active ? 'rgba(232,176,0,0.16)' : 'rgba(140,160,192,0.08)',
                color: t.active ? GOLD : TEXT_DIM,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Wrench size={14} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 700, color: TEXT }}>{t.full_name}</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, color: TEXT_DIM, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle2 size={11} /> {t.completed} completed
                </div>
              </div>
              <StatusBadge
                label={t.active ? `${t.open} on job` : t.open > 0 ? `${t.open} queued` : 'Available'}
                tone={t.active ? 'warning' : t.open > 0 ? 'neutral' : 'success'}
                pulse={t.active}
              />
            </motion.div>
          ))}
        </div>
      )}
    </DashboardCard>
  );
};

/* ─────────────────────────── CustomerExperience ─────────────────────────── */
/**
 * CustomerExperience — sourced from `service_reports`.
 * Assumes optional `rating` (number) and `feedback` (text) columns on service_reports.
 * If your table uses different column names, update RATING_FIELD / FEEDBACK_FIELD below.
 * If neither field is present on any row, this renders an honest empty state
 * rather than fabricating a score — per the "no fake data" rule.
 */
const RATING_FIELD = 'rating';
const FEEDBACK_FIELD = 'feedback';

const Stars = ({ value }) => (
  <div style={{ display: 'flex', gap: 2 }}>
    {[1, 2, 3, 4, 5].map(n => (
      <Star key={n} size={12} fill={n <= Math.round(value) ? GOLD : 'transparent'} color={GOLD} strokeWidth={1.5} />
    ))}
  </div>
);

const CustomerExperience = ({ serviceReports = [] }) => {
  const rated = serviceReports.filter(r => typeof r[RATING_FIELD] === 'number');
  const avg = useMemo(() => {
    if (!rated.length) return null;
    return rated.reduce((s, r) => s + r[RATING_FIELD], 0) / rated.length;
  }, [rated]);

  const recent = serviceReports
    .filter(r => r[FEEDBACK_FIELD])
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 4);

  return (
    <DashboardCard title="Customer Experience" delay={0.22}>
      {avg === null ? (
        <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: TEXT_DIM, textAlign: 'center', padding: '20px 0' }}>
          No customer ratings recorded yet.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 34, color: TEXT }}>{avg.toFixed(1)}</span>
            <Stars value={avg} />
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, color: TEXT_DIM, letterSpacing: '0.08em', marginBottom: 18 }}>
            from {rated.length} rated {rated.length === 1 ? 'service' : 'services'}
          </div>
          {recent.map((r, i) => (
            <motion.div
              key={r.id || i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{ padding: '10px 0', borderTop: `1px solid ${NAVY_LINE}` }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                {typeof r[RATING_FIELD] === 'number' && <Stars value={r[RATING_FIELD]} />}
                <span style={{ fontFamily: FONT_BODY, fontSize: 9.5, color: TEXT_DIM }}>{timeAgo(r.created_at)}</span>
              </div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: TEXT, lineHeight: 1.5 }}>{r[FEEDBACK_FIELD]}</div>
            </motion.div>
          ))}
        </>
      )}
    </DashboardCard>
  );
};

/* ─────────────────────────── QualityControlCenter ─────────────────────────── */
/**
 * QualityControlCenter — sourced from `qc_reports`.
 * Assumes a `status` column with values like 'pending' | 'approved' | 'flagged' | 'failed'.
 */
const STATUS_TONE = { pending: 'warning', approved: 'success', flagged: 'critical', failed: 'critical' };

const QualityControlCenter = ({ qcReports = [] }) => {
  const { pending, approved, issues } = useMemo(() => ({
    pending: qcReports.filter(q => (q.status || '').toLowerCase() === 'pending'),
    approved: qcReports.filter(q => (q.status || '').toLowerCase() === 'approved'),
    issues: qcReports.filter(q => ['flagged', 'failed'].includes((q.status || '').toLowerCase())),
  }), [qcReports]);

  const recent = [...qcReports].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6);

  return (
    <DashboardCard title="Quality Control" delay={0.26}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 18 }}>
        {[
          { label: 'Pending', count: pending.length, icon: <ClipboardCheck size={14} /> },
          { label: 'Approved', count: approved.length, icon: <ShieldCheck size={14} /> },
          { label: 'Issues', count: issues.length, icon: <ShieldAlert size={14} /> },
        ].map((s) => (
          <motion.div key={s.label} whileHover={{ y: -2 }} style={{ textAlign: 'center', padding: '12px 6px', borderRadius: 10, background: 'rgba(232,176,0,0.05)', border: `1px solid ${NAVY_LINE}` }}>
            <div style={{ display: 'flex', justifyContent: 'center', color: GOLD, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 18, fontWeight: 800, color: TEXT }}>{s.count}</div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 8.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: TEXT_DIM }}>{s.label}</div>
          </motion.div>
        ))}
      </div>

      {recent.length === 0 ? (
        <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: TEXT_DIM, textAlign: 'center', padding: '10px 0' }}>
          No QC reports on file yet.
        </div>
      ) : recent.map((q, i) => (
        <motion.div
          key={q.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${NAVY_LINE}` }}
        >
          <div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: TEXT }}>{q.full_name || `Report #${q.id}`}</div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 10, color: TEXT_DIM }}>{timeAgo(q.created_at)}</div>
          </div>
          <StatusBadge label={q.status || 'unknown'} tone={STATUS_TONE[(q.status || '').toLowerCase()] || 'neutral'} />
        </motion.div>
      ))}
    </DashboardCard>
  );
};

/* ─── sidebar nav item ─── */
const NavItem = ({ icon, label, active, onClick, badge }) => (
  <div
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '12px 16px', margin: '0 8px', borderRadius: 10, cursor: 'pointer',
      background: active ? GOLD : 'transparent',
      color: active ? NAVY_DEEP : TEXT_DIM,
      transition: 'all 0.2s', position: 'relative',
    }}
    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(232,176,0,0.07)'; e.currentTarget.style.color = TEXT; } }}
    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = TEXT_DIM; } }}
  >
    <span style={{ flexShrink: 0, display: 'flex' }}>{icon}</span>
    <span style={{ fontFamily: FONT_BODY, fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
      {label}
    </span>
    {!!badge && badge > 0 && (
      <span style={{
        marginLeft: 'auto', background: active ? NAVY_DEEP : GOLD,
        color: active ? GOLD : NAVY_DEEP, borderRadius: 999,
        fontSize: 9, fontWeight: 800, padding: '1px 7px', minWidth: 18, textAlign: 'center',
      }}>
        {badge}
      </span>
    )}
  </div>
);

/* ══════════════════════════════════════════
   MAIN DASHBOARD
══════════════════════════════════════════ */
const AdminDashboard = ({ onLogout }) => {
  const [profiles,      setProfiles]      = useState([]);
  const [appointments,  setAppointments]  = useState([]);
  const [qcReports,     setQcReports]     = useState([]);
  const [serviceReports,setServiceReports]= useState([]);
  const [timeline,      setTimeline]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [isDark,        setIsDark]        = useState(true);
  const [activeTab,     setActiveTab]     = useState('hub');
  const [selectedApt,   setSelectedApt]   = useState(null);
  const [isEditOpen,    setIsEditOpen]    = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [loggingOut,    setLoggingOut]    = useState(false);
  const [actionConfirm, setActionConfirm] = useState(null); // { apt, kind: 'approve' | 'reject' }
  const [adminName,     setAdminName]     = useState('Admin');

  const { notify, PopupCenter } = usePopupCenter();

  /* ─── data loading ─── */
  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchProfiles(), fetchAppointments(), fetchQc(), fetchServiceReports(), fetchTimeline()]);
    setLoading(false);
  };

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*');
    setProfiles(data || []);
  };

  const fetchAppointments = async () => {
    const { data } = await supabase.from('appointments').select('*').order('created_at', { ascending: false });
    setAppointments(data || []);
  };

  const fetchQc = async () => {
    const { data } = await supabase.from('qc_reports').select('*').order('created_at', { ascending: false });
    setQcReports(data || []);
  };

  const fetchServiceReports = async () => {
    const { data } = await supabase.from('service_reports').select('*').order('created_at', { ascending: false });
    setServiceReports(data || []);
  };

  const fetchTimeline = async () => {
    const { data } = await supabase.from('appointments').select('*').order('created_at', { ascending: false }).limit(10);
    setTimeline(data || []);
  };

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'dark';
    setIsDark(saved === 'dark');
    loadAll();

    // pull the signed-in admin's display name from the auth session (no schema change)
    supabase.auth.getUser().then(({ data }) => {
      const u = data?.user;
      const name = u?.user_metadata?.full_name || u?.user_metadata?.name || u?.email?.split('@')[0];
      if (name) setAdminName(name);
    });

    const ch = supabase.channel('admin-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, (payload) => {
        loadAll();
        if (payload.eventType === 'INSERT') {
          notify({ type: 'success', title: 'New service request received', message: `${payload.new.full_name} · ${payload.new.service_type}` });
        } else if (payload.eventType === 'UPDATE') {
          const s = payload.new.status;
          if (s === 'completed' && payload.old.status !== 'completed') {
            notify({ type: 'success', title: 'Job completed successfully', message: payload.new.full_name });
          }
          if (payload.new.technician_id && !payload.old.technician_id) {
            notify({ type: 'success', title: 'Technician successfully assigned', message: payload.new.full_name });
          }
          if (payload.new.payment_status === 'paid' && payload.old.payment_status !== 'paid') {
            notify({ type: 'success', title: 'Payment confirmed', message: payload.new.full_name });
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'qc_reports' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_reports' }, loadAll)
      .subscribe();

    return () => supabase.removeChannel(ch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTheme = () => {
    setIsDark(d => { localStorage.setItem('theme', !d ? 'dark' : 'light'); return !d; });
  };

  /* ─── derived data ─── */
  const technicians  = useMemo(() => profiles.filter(p => p.role === 'technician'), [profiles]);
  const techniciansById = useMemo(() => Object.fromEntries(technicians.map(t => [t.id, t])), [technicians]);

  const overview = useMemo(() => {
    const activeJobs      = appointments.filter(a => ['assigned', 'in_progress'].includes(a.status)).length;
    const todaysSchedule   = appointments.filter(a => isToday(a.scheduled_date || a.scheduled_at || a.created_at)).length;
    const waitingAssignment= appointments.filter(a => !a.technician_id && ['pending', 'approved', 'scheduled'].includes(a.status)).length;
    const pendingPayments  = appointments.filter(a => a.payment_status === 'pending' && a.status === 'completed').length;
    const pendingQc        = qcReports.filter(q => (q.status || '').toLowerCase() === 'pending').length;
    const completedJobs    = appointments.filter(a => a.status === 'completed').length;
    return { activeJobs, todaysSchedule, waitingAssignment, pendingPayments, pendingQc, completedJobs };
  }, [appointments, qcReports]);

  const liveAppointments = useMemo(() =>
    appointments.filter(a => a.status !== 'completed' && a.status !== 'cancelled').slice(0, 8),
  [appointments]);

  /* ─── actions ─── */
  const runAction = async () => {
    if (!actionConfirm) return;
    const { apt, kind } = actionConfirm;
    const isApprove = kind === 'approve';
    const payload = { status: isApprove ? 'scheduled' : 'cancelled', ...(!isApprove && { payment_status: 'cancelled' }) };
    const { error } = await supabase.from('appointments').update(payload).eq('id', apt.id);
    setActionConfirm(null);
    if (!error) {
      notify({ type: isApprove ? 'success' : 'info', title: isApprove ? 'Appointment approved' : 'Appointment cancelled', message: apt.full_name });
      loadAll();
    } else {
      notify({ type: 'error', title: 'Action failed', message: error.message });
    }
  };

  /* ─── logout: confirm → background blur/zoom (via wrapper state) →
       auth signOut happens quietly → full-screen fade-to-navy → hand off ─── */
  const handleLogoutConfirm = () => {
    setLogoutConfirm(false);
    setLoggingOut(true);
    supabase.auth.signOut();
  };

  const finishLogout = useCallback(() => {
    if (onLogout) onLogout();
  }, [onLogout]);

  const TABS = [
    { key: 'hub',      icon: <LayoutDashboard size={17} />, label: 'Command Center' },
    { key: 'services', icon: <Zap             size={17} />, label: 'Services'       },
    { key: 'users',    icon: <Users           size={17} />, label: 'Personnel'      },
    { key: 'techs',    icon: <Wrench          size={17} />, label: 'Field Force'    },
    { key: 'logs',     icon: <Database        size={17} />, label: 'Logs'           },
  ];

  const dimmed = logoutConfirm || loggingOut;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700;800&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: ${NAVY_DEEP}; }
        .adm-scroll::-webkit-scrollbar { width: 4px; }
        .adm-scroll::-webkit-scrollbar-track { background: transparent; }
        .adm-scroll::-webkit-scrollbar-thumb { background: rgba(232,176,0,0.18); border-radius: 4px; }
        @keyframes adm-spin { to { transform: rotate(360deg); } }
        .adm-spin { animation: adm-spin 1.2s linear infinite; }
        @media (max-width: 900px) { .adm-sidebar-full { display: none; } }
        input, select { color-scheme: dark; }
        option { background: ${NAVY}; }
      `}</style>

      <motion.div
        animate={{
          filter: dimmed ? 'blur(7px)' : 'blur(0px)',
          scale: dimmed ? 0.965 : 1,
        }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ display: 'flex', height: '100vh', background: NAVY_DEEP, fontFamily: FONT_BODY, overflow: 'hidden' }}
      >

        {/* ══ SIDEBAR ══ */}
        <aside className="adm-sidebar-full" style={{
          width: 240, background: `${NAVY}ee`, borderRight: `1px solid ${NAVY_LINE}`,
          display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden',
          backdropFilter: 'blur(20px)',
        }}>
          <div onClick={() => setActiveTab('hub')} style={{
            padding: '24px 20px', borderBottom: `1px solid ${NAVY_LINE}`,
            display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
          }}>
            <div style={{
              width: 38, height: 38, background: GOLD, flexShrink: 0, borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: NAVY_DEEP, boxShadow: `0 0 20px ${GOLD}30`,
            }}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, letterSpacing: '0.08em', color: GOLD, lineHeight: 1 }}>RION_CORE</div>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.36em', textTransform: 'uppercase', color: TEXT_DIM }}>Command Center</div>
            </div>
          </div>

          <nav style={{ flex: 1, padding: '14px 0', overflowY: 'auto' }} className="adm-scroll">
            {TABS.map(t => (
              <NavItem
                key={t.key} icon={t.icon} label={t.label}
                active={activeTab === t.key} onClick={() => setActiveTab(t.key)}
              />
            ))}
          </nav>

          <div style={{ padding: '12px 0', borderTop: `1px solid ${NAVY_LINE}` }}>
            <NavItem icon={isDark ? <Sun size={17} /> : <Moon size={17} />} label={isDark ? 'Light Mode' : 'Dark Mode'} onClick={toggleTheme} />
            <NavItem icon={<LogOut size={17} />} label="Terminate Session" onClick={() => setLogoutConfirm(true)} />
          </div>
        </aside>

        {/* ══ MAIN ══ */}
        <main className="adm-scroll" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="adm-scroll" style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

            {/* ══ HUB ══ */}
            {activeTab === 'hub' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="hub">

                {/* hero */}
                <HeroSection adminName={adminName} overview={overview} />

                {/* executive overview */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12, marginBottom: 20 }}>
                  <StatCard label="Active Jobs"        value={overview.activeJobs}        icon={<Wrench size={17} />}         tone={GOLD} delay={0} />
                  <StatCard label="Today's Schedule"   value={overview.todaysSchedule}     icon={<CalendarClock size={17} />}  tone={GOLD} delay={0.03} />
                  <StatCard label="Waiting Assignment" value={overview.waitingAssignment}  icon={<UserX2 size={17} />}         tone={GOLD} delay={0.06} />
                  <StatCard label="Pending Payments"   value={overview.pendingPayments}    icon={<DollarSign size={17} />}     tone={GOLD} delay={0.09} />
                  <StatCard label="Pending QC"         value={overview.pendingQc}          icon={<ClipboardCheck size={17} />} tone={GOLD} delay={0.12} />
                  <StatCard label="Completed Jobs"     value={overview.completedJobs}      icon={<CheckCircle2 size={17} />}   tone={GOLD} delay={0.15} />
                </div>

                {/* urgent action center — full width */}
                <div style={{ marginBottom: 20 }}>
                  <UrgentActionCenter
                    appointments={appointments}
                    qcReports={qcReports}
                    onSelect={(apt) => { setSelectedApt(apt); setIsEditOpen(true); }}
                  />
                </div>

                {/* analytics + timeline */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, marginBottom: 16 }}>
                  <ServiceAnalytics appointments={appointments} />
                  <DashboardCard title="Live Activity" delay={0.1}>
                    <ActivityTimeline events={timeline} />
                  </DashboardCard>
                </div>

                {/* live operations — full width */}
                <div style={{ marginBottom: 16 }}>
                  <LiveOperationsPanel
                    appointments={liveAppointments}
                    techniciansById={techniciansById}
                    loading={loading}
                    onEdit={(apt) => { setSelectedApt(apt); setIsEditOpen(true); }}
                    onApprove={(apt) => setActionConfirm({ apt, kind: 'approve' })}
                    onReject={(apt) => setActionConfirm({ apt, kind: 'reject' })}
                  />
                </div>

                {/* field force + customer experience + QC */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
                  <TechnicianPerformance technicians={technicians} appointments={appointments} />
                  <CustomerExperience serviceReports={serviceReports} />
                  <QualityControlCenter qcReports={qcReports} />
                </div>
              </motion.div>
            )}

            {activeTab === 'techs'    && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="techs"><TechnicianManagement /></motion.div>}
            {activeTab === 'services' && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="services"><ServiceManagement /></motion.div>}
            {activeTab === 'users'    && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="users"><UserManagement /></motion.div>}
            {activeTab === 'logs'     && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="logs"><ServiceLogs onEdit={(apt) => { setSelectedApt(apt); setIsEditOpen(true); }} /></motion.div>}
          </div>
        </main>
      </motion.div>

      {selectedApt && (
        <EditAppointmentModal
          isOpen={isEditOpen}
          appointment={selectedApt}
          isDark={isDark}
          onClose={() => { setIsEditOpen(false); setSelectedApt(null); }}
          onUpdate={loadAll}
        />
      )}

      <ConfirmModal
        open={logoutConfirm}
        title="Terminate Admin Session?"
        message="You'll be signed out of RION_CORE and returned to the login screen."
        confirmLabel="Terminate"
        cancelLabel="Stay"
        danger
        onConfirm={handleLogoutConfirm}
        onCancel={() => setLogoutConfirm(false)}
      />

      <ConfirmModal
        open={!!actionConfirm}
        title={actionConfirm?.kind === 'approve' ? 'Deploy Technician?' : 'Cancel & Archive?'}
        message={actionConfirm ? (
          actionConfirm.kind === 'approve'
            ? `Move ${actionConfirm.apt.full_name}'s request to scheduled.`
            : `Cancel and archive ${actionConfirm.apt.full_name}'s request.`
        ) : ''}
        confirmLabel={actionConfirm?.kind === 'approve' ? 'Deploy' : 'Archive'}
        cancelLabel="Back"
        danger={actionConfirm?.kind === 'reject'}
        onConfirm={runAction}
        onCancel={() => setActionConfirm(null)}
      />

      <LogoutOverlay open={loggingOut} onDone={finishLogout} />

      <PopupCenter />
    </>
  );
};

export default AdminDashboard;
