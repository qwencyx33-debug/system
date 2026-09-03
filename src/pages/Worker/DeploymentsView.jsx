import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wrench, Calendar, Clock, MapPin, User, FileText, ShieldAlert,
  CheckCircle2, Circle, Play, X, PlayCircle, Zap, ClipboardList,
  ShieldCheck, Camera, Bell, ChevronRight, Package, ListChecks, Loader2,
  Navigation, Phone, ImagePlus, History as HistoryIcon, Sparkles, ArrowUpRight,
} from 'lucide-react';

/* ============================================================================
   TECHNICIAN MISSION CENTER
   Navy + yellow only. Status/priority communicated through accent intensity,
   iconography and copy — no red/green/purple/blue-gradient signal colors.

   Information hierarchy (top to bottom):
     1. Current Active Job     -> Hero section
     2. Next Upcoming Job      -> surfaced inside Hero when nothing is active
     3. Today's Progress       -> progress bar + counts
     4. Remaining Jobs         -> Upcoming Jobs section
     5. Completed Jobs         -> Completed Today section
     6. Job History            -> grouped timeline (Yesterday / This Week / Last Month)

   Every section only renders when it has real Supabase-backed data. Nothing
   here is mocked, seeded, or replaced with placeholder content.
   ========================================================================== */

/* ------------------------------- helpers --------------------------------- */

function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatClock(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dayBucket(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
  const monthAgo = new Date(now); monthAgo.setDate(now.getDate() - 30);

  if (isSameDay(date, now)) return 'today';
  if (isSameDay(date, yesterday)) return 'yesterday';
  if (date >= weekAgo) return 'week';
  if (date >= monthAgo) return 'month';
  return 'older';
}

function greetingForNow() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 18) return 'Good Afternoon';
  return 'Good Evening';
}

function initialsFor(name) {
  if (!name) return '—';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const PRIORITY_STYLES = {
  urgent: { label: 'Urgent', text: 'text-amber-300', bg: 'bg-amber-400/15', ring: 'ring-amber-400/40', dot: 'bg-amber-400' },
  high: { label: 'High Priority', text: 'text-amber-200/90', bg: 'bg-amber-400/10', ring: 'ring-amber-400/25', dot: 'bg-amber-300/80' },
  normal: { label: 'Standard', text: 'text-slate-300', bg: 'bg-white/[0.04]', ring: 'ring-white/10', dot: 'bg-slate-400' },
};
function priorityStyle(p) {
  return PRIORITY_STYLES[(p || 'normal').toLowerCase()] || PRIORITY_STYLES.normal;
}

const STATUS_META = {
  pending: { label: 'Pending', text: 'text-slate-400', bg: 'bg-white/[0.04]', ring: 'ring-white/10' },
  assigned: { label: 'Assigned', text: 'text-slate-200', bg: 'bg-white/[0.05]', ring: 'ring-white/10' },
  in_progress: { label: 'In Progress', text: 'text-amber-300', bg: 'bg-amber-400/10', ring: 'ring-amber-400/30' },
  completed: { label: 'Completed', text: 'text-slate-200', bg: 'bg-white/[0.06]', ring: 'ring-white/10' },
  cancelled: { label: 'Cancelled', text: 'text-slate-500', bg: 'bg-white/[0.02]', ring: 'ring-white/5' },
};
function statusMeta(s) {
  return STATUS_META[(s || 'pending').toLowerCase()] || STATUS_META.pending;
}

const JOB_STAGES = [
  { key: 'assigned', label: 'Assigned', icon: ClipboardList },
  { key: 'started', label: 'Started', icon: PlayCircle },
  { key: 'working', label: 'Working', icon: Zap },
  { key: 'report', label: 'Report', icon: FileText },
  { key: 'qc', label: 'QC', icon: ShieldCheck },
  { key: 'completed', label: 'Completed', icon: CheckCircle2 },
];

function deriveStageIndex(job, reportSubmitted, qcReady) {
  if (!job) return -1;
  const status = (job.status || '').toLowerCase();
  const qc = (job.qc_status || '').toLowerCase();
  if (status === 'completed' && (qc === 'approved' || qc === 'passed' || qcReady)) return 5;
  if (status === 'completed' || qc === 'pending' || qc === 'in_review') return 4;
  if (reportSubmitted) return 3;
  if (status === 'in_progress') return 2;
  if (job.started_at) return 1;
  return 0;
}

/* -------------------------------- atoms ----------------------------------- */

function GlassCard({ children, className = '', hover = true, glow = false, ...props }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hover ? { y: -3 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      className={`relative rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.035] to-white/[0.012] backdrop-blur-xl
        shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_1px_0_0_rgba(0,0,0,0.4),0_24px_60px_-28px_rgba(0,0,0,0.75)]
        ${glow ? 'shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_0_44px_-14px_rgba(251,191,36,0.22),0_24px_60px_-28px_rgba(0,0,0,0.75)]' : ''} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}

function Badge({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1 whitespace-nowrap ${className}`}>
      {children}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const s = priorityStyle(priority);
  const pulsing = (priority || '').toLowerCase() === 'urgent' || (priority || '').toLowerCase() === 'high';
  return (
    <Badge className={`${s.bg} ${s.text} ${s.ring}`}>
      <motion.span
        animate={pulsing ? { opacity: [1, 0.35, 1] } : {}}
        transition={{ duration: 1.6, repeat: Infinity }}
        className={`h-1.5 w-1.5 rounded-full ${s.dot}`}
      />
      {s.label}
    </Badge>
  );
}

function StatusBadge({ status }) {
  const s = statusMeta(status);
  return <Badge className={`${s.bg} ${s.text} ${s.ring}`}>{s.label}</Badge>;
}

function PrimaryButton({ children, onClick, className = '', loading = false, disabled = false, icon: Icon }) {
  return (
    <motion.button
      whileHover={!disabled ? { y: -2, scale: 1.01 } : undefined}
      whileTap={!disabled ? { scale: 0.97 } : undefined}
      onClick={onClick}
      disabled={disabled || loading}
      className={`relative inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold
        bg-gradient-to-b from-amber-300 to-amber-500 text-[#0a0f1e]
        shadow-[0_0_0_1px_rgba(251,191,36,0.4),0_10px_24px_-8px_rgba(251,191,36,0.55)]
        hover:shadow-[0_0_0_1px_rgba(253,224,71,0.7),0_12px_30px_-8px_rgba(251,191,36,0.7)]
        disabled:opacity-40 disabled:cursor-not-allowed transition-shadow duration-300 ${className}`}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : Icon ? <Icon size={16} /> : null}
      {children}
    </motion.button>
  );
}

function GhostButton({ children, onClick, className = '', icon: Icon, disabled = false }) {
  return (
    <motion.button
      whileHover={!disabled ? { y: -2 } : undefined}
      whileTap={!disabled ? { scale: 0.97 } : undefined}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium
        border border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.08] hover:border-amber-400/30
        disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200 ${className}`}
    >
      {Icon ? <Icon size={16} /> : null}
      {children}
    </motion.button>
  );
}

function IconChip({ icon: Icon, onClick, label, href, disabled }) {
  const Tag = href ? motion.a : motion.button;
  return (
    <Tag
      href={href}
      target={href ? '_blank' : undefined}
      rel={href ? 'noreferrer' : undefined}
      onClick={onClick}
      disabled={!href ? disabled : undefined}
      whileHover={!disabled ? { y: -2 } : undefined}
      whileTap={!disabled ? { scale: 0.95 } : undefined}
      className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03]
        px-3 py-3 text-slate-300 hover:bg-white/[0.08] hover:border-amber-400/30 hover:text-amber-200
        transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed w-full`}
    >
      <Icon size={18} />
      <span className="text-[11px] font-medium">{label}</span>
    </Tag>
  );
}

function EmptyState({ title, subtitle, icon: Icon = ClipboardList }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="relative mb-5">
        <div className="absolute inset-0 blur-2xl bg-amber-400/10 rounded-full" />
        <div className="relative h-14 w-14 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
          <Icon size={24} className="text-amber-300/80" />
        </div>
      </div>
      <h3 className="text-white font-semibold text-base">{title}</h3>
      <p className="text-slate-500 text-sm mt-1.5 max-w-xs">{subtitle}</p>
    </div>
  );
}

/* Mission Radar empty state — used in the Hero when there is no active or
   upcoming job. Purely decorative animation, no fake mission data. */
function RadarEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="relative h-28 w-28 mb-6">
        <div className="absolute inset-0 rounded-full border border-amber-400/20" />
        <div className="absolute inset-3 rounded-full border border-amber-400/15" />
        <div className="absolute inset-6 rounded-full border border-amber-400/10" />
        <motion.div
          className="absolute inset-0 rounded-full overflow-hidden"
          style={{ maskImage: 'radial-gradient(circle, black 100%, transparent 100%)' }}
        >
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'conic-gradient(from 0deg, rgba(251,191,36,0.4), transparent 35%)',
              borderRadius: '9999px',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.7], opacity: [0.5, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
          className="absolute inset-0 rounded-full border border-amber-400/40"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_10px_2px_rgba(251,191,36,0.6)]" />
        </div>
      </div>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300/70 mb-1">Mission Radar</p>
      <h3 className="text-white font-semibold text-base">No Active Missions</h3>
      <p className="text-slate-500 text-sm mt-1.5 max-w-xs">Scanning for assignments — new jobs will appear here the moment they're scheduled.</p>
    </div>
  );
}

function SectionHeader({ eyebrow, title, count, icon: Icon }) {
  return (
    <div className="flex items-center justify-between px-1 mb-3.5">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="h-8 w-8 rounded-lg bg-gradient-to-b from-amber-400/15 to-amber-400/[0.06] border border-amber-400/20 flex items-center justify-center shrink-0">
            <Icon size={15} className="text-amber-300" />
          </div>
        )}
        <div>
          {eyebrow && <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 mb-0.5">{eyebrow}</p>}
          <h2 className="text-[15px] font-bold text-white leading-tight tracking-tight">{title}</h2>
        </div>
      </div>
      {typeof count === 'number' && (
        <Badge className="bg-white/[0.05] text-slate-400 ring-white/10">{count}</Badge>
      )}
    </div>
  );
}

/* --------------------------- progress timeline ----------------------------- */

function ProgressTimeline({ job, reportSubmitted, qcReady, compact = false }) {
  const activeIdx = deriveStageIndex(job, reportSubmitted, qcReady);
  const nodeSize = compact ? 'h-8 w-8' : 'h-10 w-10';
  const iconSize = compact ? 14 : 17;
  return (
    <div className="flex items-start w-full overflow-x-auto pb-1 -mx-1 px-1">
      {JOB_STAGES.map((stage, idx) => {
        const done = idx < activeIdx;
        const current = idx === activeIdx;
        const Icon = stage.icon;
        return (
          <React.Fragment key={stage.key}>
            <div className={`flex flex-col items-center gap-2 ${compact ? 'min-w-[60px]' : 'min-w-[76px]'}`}>
              <motion.div
                animate={current ? { boxShadow: ['0 0 0 0 rgba(251,191,36,0.45)', '0 0 0 9px rgba(251,191,36,0)'] } : {}}
                transition={{ duration: 1.7, repeat: current ? Infinity : 0 }}
                className={`${nodeSize} rounded-full flex items-center justify-center border transition-colors duration-300
                  ${done ? 'bg-gradient-to-b from-amber-400/20 to-amber-400/[0.08] border-amber-400/40 text-amber-300' : ''}
                  ${current ? 'bg-gradient-to-b from-amber-300 to-amber-500 border-amber-200 text-[#0a0f1e] shadow-[0_4px_14px_-4px_rgba(251,191,36,0.6)]' : ''}
                  ${!done && !current ? 'bg-white/[0.03] border-white/10 text-slate-600' : ''}`}
              >
                <Icon size={iconSize} />
              </motion.div>
              <span className={`text-[10.5px] text-center leading-tight font-medium ${current ? 'text-amber-300 font-bold' : done ? 'text-slate-300' : 'text-slate-600'}`}>
                {stage.label}
              </span>
            </div>
            {idx < JOB_STAGES.length - 1 && (
              <div className={`flex-1 h-[2px] mx-0.5 min-w-[16px] bg-white/[0.07] rounded-full relative ${compact ? 'top-4' : 'top-5'}`}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: idx < activeIdx ? '100%' : '0%' }}
                  transition={{ duration: 0.6 }}
                  className="h-full rounded-full bg-gradient-to-r from-amber-400/70 to-amber-300"
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* --------------------------------- live timer -------------------------------- */

/* Continuously updating "on the job" timer. Purely derived from the job's
   real started_at timestamp — no fake state, ticks once per second. */
function LiveTimer({ startedAt }) {
  const [elapsedMs, setElapsedMs] = useState(() => (startedAt ? Date.now() - new Date(startedAt).getTime() : 0));

  useEffect(() => {
    if (!startedAt) return undefined;
    const tick = () => setElapsedMs(Date.now() - new Date(startedAt).getTime());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  if (!startedAt) return null;

  const totalSec = Math.max(0, Math.floor(elapsedMs / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  const display = h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;

  return (
    <div className="sm:col-span-2 flex items-center gap-3 bg-amber-400/[0.06] border border-amber-400/20 rounded-xl px-4 py-3">
      <motion.span
        animate={{ opacity: [1, 0.35, 1] }}
        transition={{ duration: 1.4, repeat: Infinity }}
        className="h-2 w-2 rounded-full bg-amber-400 shrink-0"
      />
      <div className="min-w-0 flex-1 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] text-amber-300/70">Started {formatClock(startedAt)}</p>
          <p className="text-[11px] text-slate-500 -mt-0.5">Live Duration</p>
        </div>
        <p className="text-2xl font-bold text-amber-200 tabular-nums tracking-wide">{display}</p>
      </div>
    </div>
  );
}

/* ------------------------------ progress bar -------------------------------- */

function ProgressRing({ pct, size = 56, stroke = 5 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#progressGradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-amber-300 font-bold text-[13px] tabular-nums">{pct}%</span>
      </div>
    </div>
  );
}

function TodaysProgress({ completedToday, remaining }) {
  const total = completedToday + remaining;
  if (total === 0) return null;
  const pct = Math.round((completedToday / total) * 100);

  return (
    <GlassCard className="p-5 sm:p-6" hover={false}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 mb-1.5">Today's Progress</p>
          <p className="text-white font-bold text-[22px] leading-none tracking-tight">
            {completedToday}
            <span className="text-slate-500 font-medium text-sm ml-1.5">of {total} jobs done</span>
          </p>
        </div>
        <ProgressRing pct={pct} />
      </div>

      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-300"
        />
      </div>

      <div className="flex items-center justify-between mt-3.5 text-xs text-slate-500 font-medium">
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" />{completedToday} completed</span>
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-white/20" />{remaining} remaining</span>
      </div>
    </GlassCard>
  );
}

/* -------------------------------- toasts ----------------------------------- */

function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="fixed top-4 right-4 z-[70] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 60, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="rounded-2xl border border-white/10 bg-[#0a0f1e]/95 backdrop-blur-xl shadow-[0_20px_50px_-14px_rgba(0,0,0,0.7)] p-4 flex items-start gap-3"
          >
            <div className="h-9 w-9 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0">
              <Bell size={16} className="text-amber-300" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-100 font-medium">{t.title}</p>
              {t.body && <p className="text-xs text-slate-500 mt-0.5">{t.body}</p>}
            </div>
            <button onClick={() => onDismiss(t.id)} className="text-slate-600 hover:text-white transition-colors shrink-0">
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------ ambient field -------------------------------- */

/* Purely decorative motion layer for the Hero: soft floating particles and a
   slow moving light sweep. No data, no state — just ambience. */
function AmbientField() {
  const particles = useMemo(() => Array.from({ length: 7 }, (_, i) => ({
    id: i,
    size: 2 + (i % 3),
    left: `${8 + i * 13}%`,
    top: `${15 + (i % 4) * 20}%`,
    duration: 6 + i * 1.1,
    delay: i * 0.35,
  })), []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full bg-amber-300/40"
          style={{ width: p.size, height: p.size, left: p.left, top: p.top }}
          animate={{ y: [0, -16, 0], opacity: [0.15, 0.6, 0.15] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
        />
      ))}
      <motion.div
        className="absolute -inset-y-16 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-amber-200/[0.05] to-transparent"
        animate={{ x: ['-60%', '160%'] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}

/* -------------------------------- hero -------------------------------------- */

function HeroSection({ heroJob, isActive, technicianName, onOpen, onStart, onComplete }) {
  const greeting = greetingForNow();
  const p = priorityStyle(heroJob?.priority);

  return (
    <GlassCard glow hover={false} className="p-6 sm:p-8 overflow-hidden relative">
      {/* ambient glow — soft breathing */}
      <motion.div
        animate={{ opacity: [0.55, 1, 0.55], scale: [1, 1.1, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl"
      />
      <AmbientField />

      <div className="relative">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={14} className="text-amber-300/80" />
          <p className="text-sm text-slate-400">
            {greeting}{technicianName ? `, ${technicianName}` : ''}
          </p>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-6">
          {isActive ? "You're on the job" : heroJob ? "Today's Mission" : 'All caught up'}
        </h1>

        {!heroJob && <RadarEmptyState />}

        {heroJob && (
          <motion.div layout className="space-y-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-300/80 mb-1.5">
                  {isActive ? 'Active Job' : 'Next Up'}
                </p>
                <h3 className="font-bold text-white text-xl leading-tight">{heroJob.service_type || 'Service'}</h3>
              </div>
              <div className="flex items-center gap-2">
                <PriorityBadge priority={heroJob.priority} />
                <StatusBadge status={heroJob.status} />
              </div>
            </div>

            {/* Progress timeline for the featured mission */}
            <ProgressTimeline job={heroJob} reportSubmitted={false} qcReady={false} compact />

            <div className="grid sm:grid-cols-2 gap-3">
              {isActive && heroJob.started_at && <LiveTimer startedAt={heroJob.started_at} />}
              <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3">
                <User size={16} className="text-amber-300/80 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-500">Customer</p>
                  <p className="text-sm font-semibold text-slate-100 truncate">{heroJob.full_name || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3">
                <MapPin size={16} className="text-amber-300/80 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-500">Address</p>
                  <p className="text-sm font-semibold text-slate-100 truncate">{heroJob.address || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3">
                <Clock size={16} className="text-amber-300/80 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-500">Schedule</p>
                  <p className="text-sm font-semibold text-slate-100 truncate">
                    {heroJob.appointment_time || '—'}{heroJob.schedule_date ? ` · ${heroJob.schedule_date}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3">
                <ShieldAlert size={16} className={`shrink-0 ${p.text}`} />
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-500">Priority</p>
                  <p className={`text-sm font-semibold truncate ${p.text}`}>{p.label}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              {!isActive && (
                <PrimaryButton className="flex-1 justify-center text-base py-3.5" icon={Play} onClick={() => onStart(heroJob)}>
                  Start Job
                </PrimaryButton>
              )}
              {isActive && (
                <PrimaryButton className="flex-1 justify-center text-base py-3.5" icon={CheckCircle2} onClick={() => onComplete(heroJob)}>
                  Complete Job
                </PrimaryButton>
              )}
              <GhostButton className="flex-1 justify-center py-3.5" icon={ChevronRight} onClick={() => onOpen(heroJob)}>
                View Details
              </GhostButton>
            </div>
          </motion.div>
        )}
      </div>
    </GlassCard>
  );
}

/* ------------------------------ mission card -------------------------------- */

function MissionCard({ task, onOpen, index }) {
  const p = priorityStyle(task.priority);
  const isActive = task.status === 'in_progress';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, type: 'spring', stiffness: 260, damping: 26 }}
      whileHover={{ y: -3 }}
      className={`relative rounded-2xl border bg-gradient-to-b from-white/[0.035] to-white/[0.012] backdrop-blur-xl p-5 flex flex-col gap-4 overflow-hidden
        transition-colors duration-300
        ${isActive ? 'border-amber-400/30 shadow-[0_0_30px_-14px_rgba(251,191,36,0.35)]' : 'border-white/[0.07] hover:border-amber-400/20'}`}
    >
      {isActive && (
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent"
        />
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-b from-amber-400/20 to-amber-400/[0.06] border border-amber-400/20 flex items-center justify-center shrink-0 text-amber-300 font-bold text-xs">
            {initialsFor(task.full_name)}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-300/70 mb-1">
              {isActive ? 'Active' : task.status === 'completed' ? 'Completed' : 'Upcoming'}
            </p>
            <h3 className="font-bold text-white text-base leading-tight truncate">{task.service_type || 'Service'}</h3>
            <p className="text-[13px] text-slate-400 truncate mt-0.5">{task.full_name || 'Customer'}</p>
          </div>
        </div>
        <StatusBadge status={task.status} />
      </div>

      <div className="space-y-2 pl-[52px] -mt-2">
        <p className="text-[13px] text-slate-400 flex items-center gap-2">
          <MapPin size={13} className="text-slate-500 shrink-0" /> <span className="truncate">{task.address || 'No address'}</span>
        </p>
        <p className="text-[13px] text-slate-400 flex items-center gap-2">
          <Clock size={13} className="text-slate-500 shrink-0" /> {task.appointment_time || '—'} {task.schedule_date ? `· ${task.schedule_date}` : ''}
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-white/[0.06] mt-1 pt-3">
        <PriorityBadge priority={task.priority} />
        <button
          onClick={() => onOpen(task)}
          className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200 font-semibold text-[13px] transition-colors"
        >
          Open Details
          <ChevronRight size={14} />
        </button>
      </div>
    </motion.div>
  );
}

/* --------------------------------- history ----------------------------------- */

const HISTORY_BUCKET_LABEL = {
  yesterday: 'Yesterday',
  week: 'This Week',
  month: 'Last Month',
  older: 'Earlier',
};
const HISTORY_ORDER = ['yesterday', 'week', 'month', 'older'];

function HistoryRow({ task, onOpen }) {
  return (
    <motion.button
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={() => onOpen(task)}
      className="w-full text-left flex items-center gap-3 py-3 group"
    >
      <span className="relative shrink-0">
        <span className="absolute -left-[21px] h-2 w-2 rounded-full bg-amber-400/60 group-hover:bg-amber-400 transition-colors" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-200 font-medium truncate">{task.service_type || 'Service'} · {task.full_name || 'Customer'}</p>
        <p className="text-xs text-slate-600">{task.completed_at ? `${formatClock(task.completed_at)} · ${timeAgo(task.completed_at)}` : task.schedule_date || ''}</p>
      </div>
      <ChevronRight size={14} className="text-slate-600 group-hover:text-amber-300 transition-colors shrink-0" />
    </motion.button>
  );
}

function JobHistory({ jobs, onOpen }) {
  const grouped = useMemo(() => {
    const buckets = { yesterday: [], week: [], month: [], older: [] };
    jobs.forEach((j) => {
      const bucket = dayBucket(j.completed_at || j.schedule_date);
      if (bucket && bucket !== 'today' && buckets[bucket]) buckets[bucket].push(j);
    });
    return buckets;
  }, [jobs]);

  const hasAny = HISTORY_ORDER.some((k) => grouped[k].length > 0);
  if (!hasAny) return null;

  return (
    <GlassCard className="p-5" hover={false}>
      <SectionHeader eyebrow="Job History" title="Past Jobs" icon={HistoryIcon} />
      <div className="space-y-5">
        {HISTORY_ORDER.map((bucket) => (
          grouped[bucket].length > 0 && (
            <div key={bucket}>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                {HISTORY_BUCKET_LABEL[bucket]}
              </p>
              <div className="relative pl-5 divide-y divide-white/[0.05]">
                <div className="absolute left-[3px] top-2 bottom-2 w-px bg-white/10" />
                {grouped[bucket].map((task) => (
                  <HistoryRow key={task.id} task={task} onOpen={onOpen} />
                ))}
              </div>
            </div>
          )
        ))}
      </div>
    </GlassCard>
  );
}

/* ---------------------------- activity timeline ------------------------------ */

function ActivityTimeline({ appointmentId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!appointmentId) return;
    let active = true;

    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('job_logs')
        .select('*')
        .eq('appointment_id', appointmentId)
        .order('created_at', { ascending: false });
      if (active && !error) setLogs(data || []);
      if (active) setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`job-logs-${appointmentId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'job_logs', filter: `appointment_id=eq.${appointmentId}`,
      }, (payload) => {
        setLogs((prev) => [payload.new, ...prev]);
      })
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, [appointmentId]);

  if (!loading && logs.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
        <Bell size={12} /> Job Activity
      </p>
      {loading ? (
        <div className="h-16 rounded-xl bg-white/[0.03] animate-pulse" />
      ) : (
        <div className="relative pl-4 max-h-52 overflow-y-auto">
          <div className="absolute left-[5px] top-1 bottom-1 w-px bg-white/10" />
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {logs.map((log) => (
                <motion.div
                  key={log.created_at + log.action}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="relative"
                >
                  <span className="absolute -left-4 top-1.5 h-2 w-2 rounded-full bg-amber-400" />
                  <p className="text-sm text-slate-200">{log.action}</p>
                  <p className="text-xs text-slate-600">{formatClock(log.created_at)} · {timeAgo(log.created_at)}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ start mission modal --------------------------- */

function StartMissionModal({ task, onClose, onConfirmed, updating }) {
  const steps = ['Checking assignment', 'Recording start time', 'Syncing mission'];
  const [revealed, setRevealed] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!task) return;
    setRevealed(0);
    setDone(false);
    const timers = steps.map((_, i) => setTimeout(() => setRevealed(i + 1), 500 + i * 500));
    const doneTimer = setTimeout(() => setDone(true), 500 + steps.length * 500 + 250);
    const finalTimer = setTimeout(() => onConfirmed(), 500 + steps.length * 500 + 850);
    return () => { timers.forEach(clearTimeout); clearTimeout(doneTimer); clearTimeout(finalTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task]);

  if (!task) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        className="w-full max-w-sm rounded-2xl border border-amber-400/20 bg-[#0a0f1e] p-6 text-center"
      >
        <AnimatePresence mode="wait">
          {!done ? (
            <motion.div key="spin" exit={{ opacity: 0, scale: 0.9 }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
                className="h-12 w-12 mx-auto rounded-full border-2 border-amber-400/30 border-t-amber-400 mb-4"
              />
              <h3 className="text-white font-semibold text-lg">Mission Starting…</h3>
              <p className="text-slate-500 text-sm mt-1">{task.service_type || 'Job'} · {task.full_name}</p>

              <div className="mt-5 space-y-2.5 text-left">
                {steps.map((label, i) => (
                  <div key={label} className="flex items-center gap-2.5">
                    {i < revealed
                      ? <CheckCircle2 size={16} className="text-amber-300 shrink-0" />
                      : <Circle size={16} className="text-slate-700 shrink-0" />}
                    <span className={`text-sm ${i < revealed ? 'text-slate-200' : 'text-slate-600'}`}>{label}…</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="confirmed"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                className="h-12 w-12 mx-auto rounded-full bg-amber-400/15 border border-amber-400/40 flex items-center justify-center mb-4"
              >
                <CheckCircle2 size={22} className="text-amber-300" />
              </motion.div>
              <h3 className="text-white font-semibold text-lg">Mission Started</h3>
              <p className="text-slate-500 text-sm mt-1">You're on the clock.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

/* ---------------------------- complete mission modal --------------------------- */

function CompleteMissionModal({ task, onClose, onConfirm, updating }) {
  const [checks, setChecks] = useState({ service: false, photos: 0, report: false, qc: false });
  const [loadingChecks, setLoadingChecks] = useState(true);
  const [justCompleted, setJustCompleted] = useState(false);

  useEffect(() => {
    if (!task) return;
    const load = async () => {
      setLoadingChecks(true);
      const [photosRes, reportRes, qcRes] = await Promise.all([
        supabase.from('job_photos').select('id', { count: 'exact', head: true }).eq('appointment_id', task.id),
        supabase.from('service_reports').select('appointment_id').eq('appointment_id', task.id).maybeSingle(),
        supabase.from('qc_reports').select('appointment_id').eq('appointment_id', task.id).maybeSingle(),
      ]);
      setChecks({
        service: true,
        photos: photosRes.count || 0,
        report: !!reportRes.data,
        qc: !!qcRes.data,
      });
      setLoadingChecks(false);
    };
    load();
  }, [task]);

  if (!task) return null;

  const items = [
    { key: 'service', label: 'Service completed', done: checks.service },
    { key: 'photos', label: 'Photos uploaded', done: checks.photos > 0, hint: `${checks.photos} on file` },
    { key: 'report', label: 'Report submitted', done: checks.report },
    { key: 'qc', label: 'Ready for QC', done: checks.qc },
  ];

  const handleConfirm = async () => {
    setJustCompleted(true);
    await new Promise((r) => setTimeout(r, 900));
    onConfirm();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0a0f1e] p-6"
      >
        <AnimatePresence mode="wait">
          {justCompleted ? (
            <motion.div
              key="celebrate"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center text-center py-6"
            >
              <div className="relative h-16 w-16 mb-4 flex items-center justify-center">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="absolute inset-0 rounded-full border border-amber-400/40"
                    initial={{ scale: 1, opacity: 0.6 }}
                    animate={{ scale: 2.4, opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.35, ease: 'easeOut' }}
                  />
                ))}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                  className="relative h-16 w-16 rounded-full bg-amber-400/15 border border-amber-400/40 flex items-center justify-center"
                >
                  <CheckCircle2 size={30} className="text-amber-300" />
                </motion.div>
              </div>
              <h3 className="text-white font-semibold text-lg">Mission Complete</h3>
              <p className="text-slate-500 text-sm mt-1">Nice work — logged and on its way to QC.</p>
            </motion.div>
          ) : (
            <motion.div key="checklist" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="h-11 w-11 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mb-4">
                <ListChecks size={20} className="text-amber-300" />
              </div>
              <h3 className="text-white font-semibold text-lg">Before finishing…</h3>
              <p className="text-slate-500 text-sm mt-1">Review this checklist before you complete the job.</p>

              <div className="mt-4 divide-y divide-white/[0.05]">
                {loadingChecks ? (
                  <div className="h-24 flex items-center justify-center text-slate-600 text-sm">Checking job records…</div>
                ) : (
                  items.map((item) => (
                    <div key={item.key} className="flex items-center gap-3 py-2.5">
                      {item.done
                        ? <CheckCircle2 size={18} className="text-amber-300 shrink-0" />
                        : <Circle size={18} className="text-slate-700 shrink-0" />}
                      <div className="min-w-0">
                        <p className={`text-sm ${item.done ? 'text-slate-200' : 'text-slate-500'}`}>{item.label}</p>
                        {item.hint && <p className="text-xs text-slate-600">{item.hint}</p>}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <GhostButton className="flex-1 justify-center" onClick={onClose}>Not Yet</GhostButton>
                <PrimaryButton
                  className="flex-1 justify-center"
                  onClick={handleConfirm}
                  loading={updating}
                  icon={CheckCircle2}
                >
                  Complete Job
                </PrimaryButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------- detail panel ---------------------------------- */

function JobDetailPanel({ task, onClose, onStart, onComplete, checklistState }) {
  if (!task) return null;
  const isAssigned = task.status === 'assigned' || task.status === 'pending';
  const isActive = task.status === 'in_progress';
  const isCompleted = task.status === 'completed';

  const mapsHref = task.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.address)}`
    : null;
  const callHref = task.phone ? `tel:${task.phone}` : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        className="bg-[#0a0f1e] rounded-t-2xl sm:rounded-2xl w-full max-w-lg border border-white/10 shadow-2xl max-h-[92vh] overflow-y-auto"
      >
        {/* Sticky header */}
        <div className="sticky top-0 bg-[#0a0f1e]/95 backdrop-blur-xl px-6 py-5 border-b border-white/[0.06] flex justify-between items-start z-10">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-b from-amber-400/25 to-amber-400/[0.06] border border-amber-400/25 flex items-center justify-center shrink-0 text-amber-300 font-bold text-sm">
              {initialsFor(task.full_name)}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-amber-300/80 uppercase font-bold tracking-widest">Job Details</span>
              <h2 className="text-xl font-extrabold text-white leading-tight mt-0.5 truncate">{task.service_type || 'Service'}</h2>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <PriorityBadge priority={task.priority} />
                <StatusBadge status={task.status} />
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 bg-white/[0.05] hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Progress timeline */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Job Status</p>
            <ProgressTimeline job={task} reportSubmitted={checklistState.report} qcReady={checklistState.qc} />
          </div>

          {/* Live timer, only while the job is actively in progress */}
          {isActive && task.started_at && <LiveTimer startedAt={task.started_at} />}

          {/* Quick actions */}
          {!isCompleted && (
            <div className="grid grid-cols-3 gap-2">
              <IconChip icon={Navigation} label="Navigate" href={mapsHref} disabled={!mapsHref} />
              <IconChip icon={Phone} label="Call" href={callHref} disabled={!callHref} />
              <IconChip icon={ImagePlus} label="Photos" onClick={() => {}} />
            </div>
          )}

          {/* Customer information */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Customer Information</h4>
            <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] divide-y divide-white/[0.05]">
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="p-2 bg-amber-400/10 text-amber-300 rounded-lg shrink-0"><User size={15} /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-slate-500">Name</p>
                  <p className="text-sm font-semibold text-slate-200 truncate">{task.full_name || '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 px-4 py-3.5">
                <div className="p-2 bg-amber-400/10 text-amber-300 rounded-lg mt-0.5 shrink-0"><MapPin size={15} /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-slate-500">Service Location</p>
                  <p className="text-sm text-slate-200 leading-relaxed">{task.address || '—'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] divide-y sm:divide-y-0 sm:divide-x divide-white/[0.05] grid grid-cols-1 sm:grid-cols-2">
            <div className="px-4 py-3.5">
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mb-1"><Calendar size={13} /> Schedule Date</p>
              <p className="text-sm font-semibold text-slate-200">{task.schedule_date || 'Not set'}</p>
            </div>
            <div className="px-4 py-3.5">
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mb-1"><Clock size={13} /> Preferred Time</p>
              <p className="text-sm font-semibold text-slate-200">{task.appointment_time || 'Not set'}</p>
            </div>
          </div>

          {/* Service details */}
          {task.details && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Service Details</h4>
              <div className="bg-white/[0.02] p-4 rounded-xl border border-white/[0.06]">
                <p className="text-xs text-slate-500 flex items-center gap-1 mb-1"><FileText size={13} /> Customer Issue / Details</p>
                <p className="text-slate-300 text-sm italic">"{task.details}"</p>
              </div>
            </div>
          )}

          {/* Manager instructions */}
          {task.manager_notes && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-amber-300/80 uppercase tracking-widest flex items-center gap-1.5">
                <ShieldAlert size={13} /> Manager Instructions
              </h4>
              <div className="bg-amber-400/[0.06] border border-amber-400/20 p-4 rounded-xl">
                <p className="text-sm text-slate-200 leading-relaxed">{task.manager_notes}</p>
              </div>
            </div>
          )}

          {/* Material requirements */}
          {task.materials_notes && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Package size={13} /> Material Requirements
              </h4>
              <div className="bg-white/[0.02] p-4 rounded-xl border border-white/[0.06]">
                <p className="text-sm text-slate-300 leading-relaxed">{task.materials_notes}</p>
              </div>
            </div>
          )}

          {/* Activity timeline (self-hides when there is no data) */}
          <div className="bg-white/[0.02] p-4 rounded-xl border border-white/[0.06]">
            <ActivityTimeline appointmentId={task.id} />
          </div>
        </div>

        {/* Footer actions */}
        {!isCompleted && (
          <div className="p-6 bg-white/[0.015] border-t border-white/[0.06] flex gap-3 sticky bottom-0">
            <GhostButton className="flex-1 justify-center" onClick={onClose}>Close</GhostButton>
            {isAssigned && (
              <PrimaryButton className="flex-1 justify-center" icon={Play} onClick={() => onStart(task)}>
                Start Work Now
              </PrimaryButton>
            )}
            {isActive && (
              <PrimaryButton className="flex-1 justify-center" icon={CheckCircle2} onClick={() => onComplete(task)}>
                Complete & Log Job
              </PrimaryButton>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

/* =============================== main component ================================ */

export default function DeploymentsView({ tasks, onRefresh, technicianName }) {
  const [updating, setUpdating] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [startingTask, setStartingTask] = useState(null);
  const [completingTask, setCompletingTask] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [checklistState, setChecklistState] = useState({ report: false, qc: false });

  const pushToast = useCallback((title, body) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, title, body }].slice(-4));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  // 1. AUTO-REFRESH VIA SUPABASE REALTIME (unchanged) + popup message center
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            pushToast('New job assigned', payload.new?.full_name || payload.new?.service_type);
          } else if (payload.eventType === 'UPDATE') {
            const oldNotes = payload.old?.manager_notes;
            const newNotes = payload.new?.manager_notes;
            if (newNotes && newNotes !== oldNotes) {
              pushToast('Manager updated instructions', payload.new?.full_name);
            } else if (payload.old?.status !== payload.new?.status) {
              pushToast('Job status changed', `${payload.new?.full_name || 'Job'} → ${(payload.new?.status || '').replace('_', ' ')}`);
            }
          }
          onRefresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onRefresh, pushToast]);

  // Keep selectedTask in sync with fresh data after realtime refresh
  useEffect(() => {
    if (!selectedTask) return;
    const fresh = tasks.find((t) => t.id === selectedTask.id);
    if (fresh) setSelectedTask(fresh);
  }, [tasks]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load report/qc flags for whichever task is open (for the progress timeline)
  useEffect(() => {
    const task = selectedTask || startingTask || completingTask;
    if (!task) return;
    let active = true;
    (async () => {
      const [reportRes, qcRes] = await Promise.all([
        supabase.from('service_reports').select('appointment_id').eq('appointment_id', task.id).maybeSingle(),
        supabase.from('qc_reports').select('appointment_id').eq('appointment_id', task.id).maybeSingle(),
      ]);
      if (active) setChecklistState({ report: !!reportRes.data, qc: !!qcRes.data });
    })();
    return () => { active = false; };
  }, [selectedTask, startingTask, completingTask]);

  const updateStatus = async (id, newStatus) => {
    setUpdating(true);
    try {
      const updatePayload = { status: newStatus };
      if (newStatus === 'in_progress') updatePayload.started_at = new Date().toISOString();
      if (newStatus === 'completed') updatePayload.completed_at = new Date().toISOString();

      const { error } = await supabase.from('appointments').update(updatePayload).eq('id', id);
      if (error) throw error;

      await supabase.from('job_logs').insert({
        appointment_id: id,
        action: `Status changed to ${newStatus.replace('_', ' ')}`,
      });

      onRefresh();
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleStartConfirmed = async () => {
    const task = startingTask;
    if (!task) return;
    await updateStatus(task.id, 'in_progress');
    setStartingTask(null);
    setSelectedTask((prev) => (prev ? { ...prev, status: 'in_progress' } : prev));
  };

  const handleCompleteConfirm = async () => {
    const task = completingTask;
    if (!task) return;
    await updateStatus(task.id, 'completed');
    setCompletingTask(null);
    setSelectedTask(null);
  };

  /* ------------------------- information hierarchy ------------------------- */

  const { activeJob, upcoming, completedToday, historyJobs } = useMemo(() => {
    const active = tasks.find((t) => (t.status || '').toLowerCase() === 'in_progress') || null;

    const upcomingJobs = tasks
      .filter((t) => ['assigned', 'pending'].includes((t.status || '').toLowerCase()))
      .sort((a, b) => (a.appointment_time || '').localeCompare(b.appointment_time || ''));

    const completed = tasks.filter((t) => (t.status || '').toLowerCase() === 'completed');
    const completedTodayJobs = completed
      .filter((t) => dayBucket(t.completed_at) === 'today')
      .sort((a, b) => new Date(b.completed_at || 0) - new Date(a.completed_at || 0));

    return {
      activeJob: active,
      upcoming: upcomingJobs,
      completedToday: completedTodayJobs,
      historyJobs: completed,
    };
  }, [tasks]);

  const heroJob = activeJob || upcoming[0] || null;
  const isHeroActive = !!activeJob;
  // remaining = everything not yet completed or cancelled
  const remainingCount = tasks.filter((t) => !['completed', 'cancelled'].includes((t.status || '').toLowerCase())).length;

  return (
    <div className="space-y-6">
      {/* Hero: current active job, or next upcoming job if nothing is active */}
      <HeroSection
        heroJob={heroJob}
        isActive={isHeroActive}
        technicianName={technicianName}
        onOpen={setSelectedTask}
        onStart={(task) => setStartingTask(task)}
        onComplete={(task) => setCompletingTask(task)}
      />

      {/* Today's progress */}
      <TodaysProgress completedToday={completedToday.length} remaining={remainingCount} />

      {/* Upcoming jobs (excludes whichever job is currently featured in the hero) */}
      {upcoming.filter((t) => t.id !== heroJob?.id).length > 0 && (
        <div>
          <SectionHeader eyebrow="Remaining" title="Upcoming Jobs" count={upcoming.filter((t) => t.id !== heroJob?.id).length} icon={ClipboardList} />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {upcoming.filter((t) => t.id !== heroJob?.id).map((task, i) => (
              <MissionCard key={task.id} task={task} index={i} onOpen={setSelectedTask} />
            ))}
          </div>
        </div>
      )}

      {/* Completed today */}
      {completedToday.length > 0 && (
        <div>
          <SectionHeader eyebrow="Completed" title="Completed Today" count={completedToday.length} icon={CheckCircle2} />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {completedToday.map((task, i) => (
              <MissionCard key={task.id} task={task} index={i} onOpen={setSelectedTask} />
            ))}
          </div>
        </div>
      )}

      {/* Job history — grouped timeline, only renders when there is real completed-job data */}
      <JobHistory jobs={historyJobs} onOpen={setSelectedTask} />

      {/* Nothing at all assigned, ever */}
      {tasks.length === 0 && (
        <GlassCard className="p-0 overflow-hidden">
          <EmptyState title="No Jobs Assigned" subtitle="New jobs will appear here the moment they're assigned to you." icon={ClipboardList} />
        </GlassCard>
      )}

      {/* Detail panel */}
      <AnimatePresence>
        {selectedTask && (
          <JobDetailPanel
            task={selectedTask}
            checklistState={checklistState}
            onClose={() => setSelectedTask(null)}
            onStart={(task) => setStartingTask(task)}
            onComplete={(task) => setCompletingTask(task)}
          />
        )}
      </AnimatePresence>

      {/* Start job animated confirmation */}
      <AnimatePresence>
        {startingTask && (
          <StartMissionModal
            task={startingTask}
            updating={updating}
            onClose={() => setStartingTask(null)}
            onConfirmed={handleStartConfirmed}
          />
        )}
      </AnimatePresence>

      {/* Complete job checklist */}
      <AnimatePresence>
        {completingTask && (
          <CompleteMissionModal
            task={completingTask}
            updating={updating}
            onClose={() => setCompletingTask(null)}
            onConfirm={handleCompleteConfirm}
          />
        )}
      </AnimatePresence>

      {/* Popup message center */}
      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
}
