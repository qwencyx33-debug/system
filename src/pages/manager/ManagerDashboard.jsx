import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ShieldCheck, LayoutDashboard, Truck, ClipboardCheck,
  Users, LogOut, Menu, Bell, ArrowRight, Clock,
  AlertCircle, AlertTriangle, Activity, CheckCircle2,
  ChevronRight, ChevronLeft, Wrench, X, Radio, Sparkles,
  StickyNote, Plus, CalendarClock, TrendingUp, Flame,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../supabaseClient';

import DispatchingView from './DispatchingView';
import QCVerificationView from './QCVerificationView';
import TechnicianManagementView from './TechnicianManagementView';

// ─────────────────────────────────────────────
// Design tokens — locked palette per spec.
// Yellow is reserved for active state / primary actions / highlights only.
// Red is used sparingly for destructive actions and true critical alerts —
// never as a primary theme color.
// ─────────────────────────────────────────────

const C = {
  bg: '#020617',
  sidebar: '#031418',
  card: '#0A0F18',
  primary: '#EAB308',
  secondary: '#3B82F6',
  success: '#10B981',
  warning: '#F97316',
  danger: '#EF4444',
  muted: '#64748B',
};

const startOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

// ─────────────────────────────────────────────
// Shared primitives
// ─────────────────────────────────────────────

const EmptyState = ({ icon: Icon, title, helper, color = '#64748B' }) => (
  <div className="py-10 flex flex-col items-center gap-3 text-center">
    <div
      className="w-11 h-11 rounded-xl flex items-center justify-center"
      style={{ background: `${color}14`, border: `1px solid ${color}26` }}
    >
      <Icon size={18} style={{ color }} />
    </div>
    <div>
      <p className="text-[12px] font-semibold text-slate-300">{title}</p>
      <p className="text-[11px] text-slate-500 mt-1 max-w-[230px] mx-auto leading-relaxed">{helper}</p>
    </div>
  </div>
);

const SkeletonRow = () => (
  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
    <div className="w-2 h-2 rounded-full bg-white/10 animate-pulse" />
    <div className="flex-1 space-y-2">
      <div className="h-2.5 w-1/3 rounded bg-white/10 animate-pulse" />
      <div className="h-2 w-1/4 rounded bg-white/5 animate-pulse" />
    </div>
  </div>
);

const Bar = ({ pct, color }) => (
  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="h-full rounded-full"
      style={{ background: color, boxShadow: `0 0 10px ${color}66` }}
    />
  </div>
);

// Smooth count-up used on Mission Control cards. Pure CSS/JS — no new deps.
const AnimatedNumber = ({ value }) => {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const from = prevRef.current;
    const to = Number(value) || 0;
    if (from === to) { setDisplay(to); return; }
    const duration = 600;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else prevRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <>{display}</>;
};

// 7-stage live job workflow tracker.
// The appointments table only tracks a handful of discrete statuses, so
// "Travel" / "Working" are both represented by the `ongoing` status —
// there's no separate DB field to distinguish them without adding schema.
const LIVE_STAGES = ['Appointment', 'Payment', 'Dispatch', 'Travel', 'Working', 'QC', 'Completed'];

const getStageIndex = (item) => {
  if (item.status === 'completed') return 7;
  if (item.status === 'qc') return 6;
  if (item.status === 'ongoing') return 5;
  if (item.payment_status === 'paid') return 2;
  return 1;
};

const WorkflowBar = ({ item }) => {
  const activeIdx = getStageIndex(item);
  return (
    <div className="flex items-center gap-0.5 mt-3">
      {LIVE_STAGES.map((step, i) => {
        const idx = i + 1;
        const done = idx < activeIdx;
        const current = idx === activeIdx;
        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center gap-1">
              <motion.div
                animate={{ scale: current ? [1, 1.25, 1] : 1 }}
                transition={{ duration: 1.4, repeat: current ? Infinity : 0, ease: 'easeInOut' }}
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: done || current ? C.primary : 'rgba(255,255,255,0.1)',
                  boxShadow: current ? `0 0 0 3px ${C.primary}22` : 'none',
                }}
              />
              <span
                className="text-[6.5px] font-bold uppercase tracking-wider whitespace-nowrap"
                style={{ color: done || current ? `${C.primary}CC` : 'rgba(255,255,255,0.2)' }}
              >
                {step}
              </span>
            </div>
            {i < LIVE_STAGES.length - 1 && (
              <div
                className="flex-1 h-px mb-3"
                style={{ minWidth: 6, background: done ? `${C.primary}66` : 'rgba(255,255,255,0.06)' }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// Reusable panel shell used across every widget on the dashboard
const Panel = ({ title, dotColor, action, children, delay = 0, className = '', dense = false }) => (
  <motion.section
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    className={`relative bg-[#0A0F18] border border-white/[0.06] rounded-2xl ${dense ? 'p-5' : 'p-6'} ${className}`}
  >
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2.5">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor, boxShadow: `0 0 8px ${dotColor}99` }} />
        <h3 className="text-[11px] font-bold text-white uppercase tracking-[0.12em]">{title}</h3>
      </div>
      {action}
    </div>
    {children}
  </motion.section>
);

// ─────────────────────────────────────────────
// Floating toast notifications
// ─────────────────────────────────────────────

const TOAST_META = {
  new_appointment: { label: 'New appointment received', icon: Sparkles, color: C.secondary },
  payment_verified: { label: 'Payment verified', icon: CheckCircle2, color: C.primary },
  technician_assigned: { label: 'Technician assigned', icon: Truck, color: C.primary },
  qc_submitted: { label: 'QC submitted', icon: ShieldCheck, color: C.success },
  job_completed: { label: 'Job completed', icon: CheckCircle2, color: C.success },
  generic: { label: 'Job updated', icon: Activity, color: C.muted },
};

const ToastStack = ({ toasts, onDismiss }) => (
  <div className="fixed bottom-5 right-5 z-[90] flex flex-col gap-2.5 w-[300px]">
    <AnimatePresence>
      {toasts.map((t) => {
        const meta = TOAST_META[t.type] || TOAST_META.generic;
        return (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 40, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.96, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="flex items-start gap-3 p-3.5 rounded-xl border border-white/[0.08] backdrop-blur-xl shadow-2xl"
            style={{ background: `${C.card}F2` }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${meta.color}18`, border: `1px solid ${meta.color}2A` }}>
              <meta.icon size={14} style={{ color: meta.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-white">{meta.label}</p>
              {t.detail && <p className="text-[10.5px] text-slate-500 mt-0.5 truncate">{t.detail}</p>}
            </div>
            <button onClick={() => onDismiss(t.id)} className="text-slate-600 hover:text-slate-300 transition-colors flex-shrink-0">
              <X size={13} />
            </button>
          </motion.div>
        );
      })}
    </AnimatePresence>
  </div>
);

// ─────────────────────────────────────────────
// HEADER — search removed entirely per spec. Compact, single row.
// ─────────────────────────────────────────────

const Header = ({ greeting, todayLabel, onMenuClick, unreadCount, onBellClick }) => (
  <header
    className="h-16 flex-shrink-0 flex justify-between items-center px-6 sticky top-0 z-30 border-b border-white/[0.06] backdrop-blur-xl"
    style={{ background: `${C.bg}CC` }}
  >
    <div className="flex items-center gap-4 min-w-0">
      <button onClick={onMenuClick} className="md:hidden p-2 -ml-2 rounded-lg text-slate-400 hover:bg-white/5 flex-shrink-0">
        <Menu size={20} />
      </button>
      <div className="min-w-0">
        <h2 className="text-[14px] font-bold text-white leading-none truncate">{greeting}, Manager</h2>
        <p className="text-[10.5px] text-slate-500 font-medium mt-1 flex items-center gap-1.5">
          {todayLabel}
          <span className="text-white/15">•</span>
          <span className="flex items-center gap-1" style={{ color: C.success }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.success }} />
            Live
          </span>
        </p>
      </div>
    </div>

    <div className="flex items-center gap-2">
      <button onClick={onBellClick} className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
        <Bell size={17} />
        {unreadCount > 0 && (
          <span
            className="absolute top-1 right-1 min-w-[14px] h-[14px] px-[3px] rounded-full ring-2 flex items-center justify-center text-[8px] font-bold text-[#020617]"
            style={{ background: C.primary, ringColor: C.bg }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-[#020617] font-bold text-[13px] flex-shrink-0"
        style={{ background: C.primary }}
      >
        M
      </div>
    </div>
  </header>
);

// ─────────────────────────────────────────────
// SIDEBAR — collapsible on desktop
// ─────────────────────────────────────────────

const Sidebar = ({
  menuItems, activeView, setActiveView, isMobileOpen, setIsMobileOpen,
  isCollapsed, setIsCollapsed, badgeFor, onLogoutClick,
}) => (
  <aside
    className={`fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-out ${
      isMobileOpen ? 'translate-x-0' : '-translate-x-full'
    } md:translate-x-0 border-r border-white/[0.06] ${isCollapsed ? 'md:w-20' : 'md:w-64'} w-64`}
    style={{ background: C.sidebar }}
  >
    <div className={`h-16 flex items-center gap-3 border-b border-white/[0.06] flex-shrink-0 ${isCollapsed ? 'md:justify-center md:px-0 px-6' : 'px-6'}`}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: C.primary }}>
        <ShieldCheck size={17} style={{ color: C.sidebar }} />
      </div>
      <div className={`min-w-0 ${isCollapsed ? 'md:hidden' : ''}`}>
        <h1 className="text-white font-bold text-[13px] tracking-tight leading-none truncate">RionOps</h1>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: C.success }} />
          <span className="text-[9px] font-medium text-slate-500 uppercase tracking-wide truncate">Manila HQ</span>
        </div>
      </div>
    </div>

    <div className="flex-1 flex flex-col justify-between overflow-y-auto">
      <nav className="px-3 py-4 space-y-1">
        {menuItems.map((item, i) => {
          const active = activeView === item.label;
          const badgeCount = badgeFor(item.label);
          return (
            <button
              key={i}
              onClick={() => { setActiveView(item.label); setIsMobileOpen(false); }}
              title={isCollapsed ? (item.display || item.label) : undefined}
              className={`relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-colors duration-200 group ${isCollapsed ? 'md:justify-center' : ''}`}
              style={{ color: active ? C.primary : '#7C8AA0' }}
            >
              {active && (
                <motion.div
                  layoutId="activeNav"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  className="absolute inset-0 rounded-lg"
                  style={{ background: `${C.primary}12`, border: `1px solid ${C.primary}22` }}
                />
              )}
              <span className={`relative z-10 flex-shrink-0 transition-transform ${!active && 'group-hover:translate-x-0.5'}`}>
                {item.icon}
              </span>
              <span className={`relative z-10 text-[12.5px] font-semibold flex-1 text-left ${isCollapsed ? 'md:hidden' : ''}`}>
                {item.display || item.label}
              </span>
              {badgeCount !== null && badgeCount > 0 && (
                <span
                  className={`relative z-10 text-[9.5px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 min-w-[18px] text-center ${isCollapsed ? 'md:hidden' : ''}`}
                  style={{
                    background: active ? `${C.primary}22` : 'rgba(255,255,255,0.06)',
                    color: active ? C.primary : '#94A3B8',
                  }}
                >
                  {badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-white/[0.06] space-y-1">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`hidden md:flex w-full items-center gap-3 px-3.5 py-2.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors duration-200 ${isCollapsed ? 'justify-center' : ''}`}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!isCollapsed && <span className="text-[12.5px] font-semibold">Collapse</span>}
        </button>
        <button
          onClick={onLogoutClick}
          className={`group w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-slate-500 hover:text-[#EF4444] hover:bg-[#EF4444]/[0.08] transition-colors duration-200 ${isCollapsed ? 'md:justify-center' : ''}`}
        >
          <LogOut size={18} className="flex-shrink-0" />
          <span className={`text-[12.5px] font-semibold ${isCollapsed ? 'md:hidden' : ''}`}>Logout</span>
        </button>
      </div>
    </div>
  </aside>
);

// ─────────────────────────────────────────────
// SECTION 1 — Mission Control (4 premium summary cards)
// ─────────────────────────────────────────────

const MissionControl = ({ stats }) => {
  const items = [
    { label: 'Pending Dispatch', value: stats.dispatch, icon: Truck, color: C.primary },
    { label: 'Active Jobs', value: stats.total, icon: Activity, color: C.secondary },
    { label: 'Waiting QC', value: stats.qc, icon: ClipboardCheck, color: C.success },
    { label: 'Completed Today', value: stats.completedToday, icon: TrendingUp, color: C.warning },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((it, i) => (
        <motion.div
          key={it.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
          whileHover={{ y: -3 }}
          className="relative bg-[#0A0F18] border border-white/[0.06] rounded-2xl p-5 overflow-hidden group hover:border-white/[0.14] transition-colors"
        >
          {/* gradient glow */}
          <div
            className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-[0.14] group-hover:opacity-[0.24] transition-opacity"
            style={{ background: it.color }}
          />
          {/* glass reflection sweep */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.035) 45%, transparent 60%)' }} />
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-4" style={{ background: `${it.color}14`, border: `1px solid ${it.color}28` }}>
            <it.icon size={16} style={{ color: it.color }} />
          </div>
          <p className="text-[28px] font-bold text-white tracking-tight leading-none tabular-nums">
            <AnimatedNumber value={it.value} />
          </p>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-1.5">{it.label}</p>
        </motion.div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────
// SECTION 2 — Critical Alerts
// ─────────────────────────────────────────────

const CriticalAlerts = ({ stats, technicians, allRecent, setActiveView }) => {
  const alerts = [];

  if (stats.dispatch > 0) {
    alerts.push({
      icon: Truck, text: `${stats.dispatch} job${stats.dispatch === 1 ? '' : 's'} waiting dispatch`,
      severity: stats.dispatch >= 5 ? 'high' : 'medium', color: C.primary, view: 'Dispatching',
    });
  }
  if (stats.qc > 0) {
    alerts.push({
      icon: ShieldCheck, text: `${stats.qc} job${stats.qc === 1 ? '' : 's'} waiting QC`,
      severity: stats.qc >= 3 ? 'high' : 'medium', color: C.success, view: 'QC Verification',
    });
  }
  const delayed = allRecent.filter(a => a.status === 'pending' && a.schedule_date && new Date(a.schedule_date) < new Date());
  if (delayed.length > 0) {
    alerts.push({
      icon: AlertTriangle, text: `${delayed.length} job${delayed.length === 1 ? '' : 's'} delayed past schedule`,
      severity: 'high', color: C.danger, view: 'Dispatching',
    });
  }
  const offline = technicians.filter(t => t.status === 'offline').length;
  if (offline > 0) {
    alerts.push({
      icon: Users, text: `${offline} technician${offline === 1 ? '' : 's'} unavailable`,
      severity: 'low', color: C.muted, view: 'Technician Registry',
    });
  }

  const severityStyle = {
    high: { label: 'High', bg: `${C.danger}14`, fg: C.danger, border: `${C.danger}28` },
    medium: { label: 'Medium', bg: `${C.primary}14`, fg: C.primary, border: `${C.primary}28` },
    low: { label: 'Low', bg: `${C.secondary}14`, fg: C.secondary, border: `${C.secondary}28` },
  };

  return (
    <Panel
      title="Critical Alerts"
      dotColor={alerts.length > 0 ? C.danger : C.success}
      delay={0}
      dense
      action={
        alerts.length > 0 && (
          <span className="flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
            style={{ background: `${C.danger}14`, color: C.danger, border: `1px solid ${C.danger}28` }}>
            <Flame size={10} /> {alerts.length} Active
          </span>
        )
      }
    >
      {alerts.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="All clear" helper="No operational issues need your attention right now." color={C.success} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {alerts.map((a, i) => {
            const sev = severityStyle[a.severity];
            return (
              <motion.button
                key={i}
                onClick={() => setActiveView(a.view)}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -2, borderColor: `${a.color}55` }}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] transition-colors text-left"
              >
                <motion.div
                  whileHover={{ rotate: [-3, 3, 0] }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${a.color}16`, border: `1px solid ${a.color}2A` }}
                >
                  <a.icon size={14} style={{ color: a.color }} />
                </motion.div>
                <p className="flex-1 text-[12px] font-semibold text-slate-200 leading-tight">{a.text}</p>
                <span
                  className="text-[8.5px] font-bold uppercase tracking-wider px-2 py-1 rounded-md flex-shrink-0"
                  style={{ background: sev.bg, color: sev.fg, border: `1px solid ${sev.border}` }}
                >
                  {sev.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      )}
    </Panel>
  );
};

// ─────────────────────────────────────────────
// SECTION 3 — Dispatch Queue
// ─────────────────────────────────────────────

const priorityStyle = (p) => {
  const key = (p || 'standard').toLowerCase();
  if (key === 'high' || key === 'urgent') return { label: 'High', color: C.danger };
  if (key === 'medium') return { label: 'Medium', color: C.primary };
  return { label: 'Standard', color: C.muted };
};

const paymentStyle = (status) => {
  if (status === 'paid') return { label: 'Paid', color: C.success };
  if (status === 'pending') return { label: 'Payment Pending', color: C.warning };
  return { label: 'Unpaid', color: C.muted };
};

const formatDate = (ts) => {
  if (!ts) return 'Unscheduled';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return 'Unscheduled';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const RippleButton = ({ children, onClick, style, className }) => {
  const [ripples, setRipples] = useState([]);
  const fire = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const id = Date.now();
    setRipples((r) => [...r, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples((r) => r.filter((rp) => rp.id !== id)), 500);
    onClick?.(e);
  };
  return (
    <button onClick={fire} style={style} className={`relative overflow-hidden ${className}`}>
      {children}
      {ripples.map((r) => (
        <motion.span
          key={r.id}
          initial={{ width: 0, height: 0, opacity: 0.5 }}
          animate={{ width: 140, height: 140, opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="absolute rounded-full bg-white pointer-events-none"
          style={{ left: r.x, top: r.y, translateX: '-50%', translateY: '-50%' }}
        />
      ))}
    </button>
  );
};

const DispatchQueue = ({ stats, dispatchQueue, cashierApprovals, setActiveView }) => (
  <Panel
    title="Dispatch Queue"
    dotColor={C.primary}
    delay={0.05}
    action={
      <button
        onClick={() => setActiveView('Dispatching')}
        className="flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wide px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-[#EAB308] hover:bg-white/5 transition-colors"
      >
        Open Center <ArrowRight size={12} />
      </button>
    }
  >
    {stats.dispatch === 0 ? (
      <EmptyState icon={Truck} title="Dispatch queue is clear" helper="New pending appointments will show up here." color={C.primary} />
    ) : (
      <div className="space-y-2.5">
        {dispatchQueue.map((job, i) => {
          const pr = priorityStyle(job.priority);
          const pay = paymentStyle(job.payment_status);
          return (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ borderColor: 'rgba(255,255,255,0.1)' }}
              className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="text-[12.5px] font-semibold text-white truncate">{job.full_name || 'Unknown Customer'}</p>
                  <span className="text-[8.5px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: `${pr.color}16`, color: pr.color, border: `1px solid ${pr.color}28` }}>
                    {pr.label}
                  </span>
                  <span className="text-[8.5px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: `${pay.color}16`, color: pay.color, border: `1px solid ${pay.color}28` }}>
                    {pay.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10.5px] text-slate-500 flex-wrap">
                  <span className="truncate">{job.service_type || 'General Service'}</span>
                  <span className="text-white/10">•</span>
                  <span className="flex items-center gap-1 flex-shrink-0"><Clock size={10} /> {formatDate(job.schedule_date || job.created_at)}</span>
                </div>
                {job.notes && (
                  <p className="flex items-center gap-1 text-[10px] text-slate-400 mt-1.5">
                    <StickyNote size={10} className="flex-shrink-0" style={{ color: C.primary }} />
                    <span className="truncate">{job.notes}</span>
                  </p>
                )}
              </div>
              <RippleButton
                onClick={() => setActiveView('Dispatching')}
                className="flex-shrink-0 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-bold transition-colors active:scale-[0.97]"
                style={{ background: C.primary, color: C.bg }}
              >
                Assign Technician
              </RippleButton>
            </motion.div>
          );
        })}
      </div>
    )}

    {cashierApprovals.length > 0 && (
      <div className="mt-4 pt-4 border-t border-white/[0.06]">
        <p className="text-[9.5px] font-semibold text-slate-500 uppercase tracking-wider mb-2.5">Payment Verified · Ready For Dispatch</p>
        <div className="flex flex-wrap gap-2">
          {cashierApprovals.slice(0, 4).map((c) => (
            <span key={c.id} className="flex items-center gap-1.5 text-[10.5px] font-medium text-slate-300 bg-white/[0.02] border border-white/[0.05] rounded-lg px-2.5 py-1.5">
              <CheckCircle2 size={11} style={{ color: C.success }} />
              {c.full_name}
            </span>
          ))}
        </div>
      </div>
    )}
  </Panel>
);

// ─────────────────────────────────────────────
// SECTION 4 — Technician Status
// ─────────────────────────────────────────────

const statusMeta = {
  available: { label: 'Available', color: C.success },
  busy: { label: 'Busy', color: C.primary },
  ongoing: { label: 'Busy', color: C.primary },
  offline: { label: 'Offline', color: C.muted },
};

const TechnicianStatus = ({ technicians, jobCountFor, currentJobFor, loading, setActiveView }) => {
  const available = technicians.filter(t => t.status === 'available' || !t.status).length;
  const busy = technicians.filter(t => t.status === 'busy' || t.status === 'ongoing').length;
  const offline = technicians.filter(t => t.status === 'offline').length;

  return (
    <Panel
      title="Technician Status"
      dotColor={C.primary}
      delay={0.1}
      action={
        <button
          onClick={() => setActiveView('Technician Registry')}
          className="flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wide px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-[#EAB308] hover:bg-white/5 transition-colors"
        >
          Manage <ArrowRight size={12} />
        </button>
      }
    >
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-white/[0.03] animate-pulse" />)}
        </div>
      ) : technicians.length === 0 ? (
        <EmptyState icon={Users} title="No technicians loaded" helper="Technician data will appear here once available." />
      ) : (
        <>
          <div className="flex items-center gap-4 mb-4 text-[10.5px] font-semibold">
            <span className="flex items-center gap-1.5 text-slate-400"><span className="w-1.5 h-1.5 rounded-full" style={{ background: C.success }} /> {available} Available</span>
            <span className="flex items-center gap-1.5 text-slate-400"><span className="w-1.5 h-1.5 rounded-full" style={{ background: C.primary }} /> {busy} Busy</span>
            <span className="flex items-center gap-1.5 text-slate-400"><span className="w-1.5 h-1.5 rounded-full" style={{ background: C.muted }} /> {offline} Offline</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {technicians.slice(0, 6).map((t) => {
              const meta = statusMeta[t.status] || statusMeta.available;
              const jobs = jobCountFor(t.id);
              const workload = Math.min(100, jobs * 25);
              const current = currentJobFor(t.id);
              const isWorking = t.status === 'busy' || t.status === 'ongoing';
              return (
                <motion.div
                  key={t.id}
                  whileHover={{ y: -2 }}
                  className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.1] transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="relative w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                      style={{ background: `${meta.color}16`, color: meta.color, border: `1px solid ${meta.color}28` }}>
                      {(t.full_name || t.name || '?').charAt(0).toUpperCase()}
                      <motion.span
                        animate={isWorking ? { scale: [1, 1.5, 1], opacity: [1, 0.4, 1] } : {}}
                        transition={{ duration: 1.6, repeat: isWorking ? Infinity : 0 }}
                        className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2"
                        style={{ background: meta.color, ringColor: C.card }}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11.5px] font-semibold text-slate-200 truncate leading-tight">{t.full_name || t.name || 'Technician'}</p>
                      <p className="text-[9.5px] font-medium" style={{ color: meta.color }}>{meta.label}</p>
                    </div>
                  </div>

                  {current ? (
                    <div className="mb-2">
                      <p className="text-[10px] text-slate-300 truncate font-medium">{current.full_name}</p>
                      {current.started_at && (
                        <p className="text-[9px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock size={9} /> Started {new Date(current.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-[9.5px] text-slate-600 mb-2">No active customer</p>
                  )}

                  <div className="flex items-center justify-between text-[9px] text-slate-500 font-semibold mb-1">
                    <span>{jobs} job{jobs === 1 ? '' : 's'} assigned</span>
                  </div>
                  <Bar pct={workload} color={meta.color} />
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </Panel>
  );
};

// ─────────────────────────────────────────────
// SECTION 5 — Today's Schedule (schedule_date + appointment_time)
// ─────────────────────────────────────────────

const TodaysSchedule = ({ schedule, loading }) => {
  const formatTime = (item) => {
    if (item.appointment_time) {
      // appointment_time may be stored as "HH:MM:SS" or a full timestamp
      const raw = item.appointment_time;
      const asDate = new Date(`1970-01-01T${raw}`);
      if (!isNaN(asDate.getTime())) {
        return asDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      const full = new Date(raw);
      if (!isNaN(full.getTime())) return full.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return raw;
    }
    if (item.schedule_date) {
      const d = new Date(item.schedule_date);
      if (!isNaN(d.getTime())) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return '—';
  };

  return (
    <Panel title="Today's Schedule" dotColor={C.secondary} delay={0.12}>
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}</div>
      ) : schedule.length === 0 ? (
        <EmptyState icon={CalendarClock} title="Nothing scheduled today" helper="Today's booked appointments will line up here in order." color={C.secondary} />
      ) : (
        <div className="space-y-2">
          {schedule.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]"
            >
              <div className="flex flex-col items-center justify-center w-14 flex-shrink-0 py-1 rounded-lg" style={{ background: `${C.secondary}12`, border: `1px solid ${C.secondary}22` }}>
                <span className="text-[11px] font-bold" style={{ color: C.secondary }}>{formatTime(item)}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-white truncate">{item.full_name}</p>
                <p className="text-[10.5px] text-slate-500 truncate">{item.service_type || 'General Service'}</p>
              </div>
              <span
                className="text-[8.5px] font-bold uppercase tracking-wide px-2 py-1 rounded-md flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.05)', color: '#94A3B8' }}
              >
                {item.status || 'pending'}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </Panel>
  );
};

// ─────────────────────────────────────────────
// SECTION 6 — Live Jobs
// ─────────────────────────────────────────────

const LiveJobs = ({ liveJobs, technicians, loading }) => (
  <Panel title="Live Jobs" dotColor={C.secondary} delay={0.15}>
    {loading ? (
      <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}</div>
    ) : liveJobs.length === 0 ? (
      <EmptyState icon={Radio} title="No jobs in progress" helper="Jobs currently being worked on will track here live." color={C.secondary} />
    ) : (
      <div className="space-y-4">
        {liveJobs.map((job) => {
          const tech = technicians.find(t => t.id === job.technician_id);
          return (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12.5px] font-semibold text-white truncate">{job.full_name}</p>
                <span className="text-[10px] font-medium text-slate-500 flex-shrink-0">{tech ? (tech.full_name || tech.name) : 'Unassigned'}</span>
              </div>
              <WorkflowBar item={job} />
            </motion.div>
          );
        })}
      </div>
    )}
  </Panel>
);

// ─────────────────────────────────────────────
// SECTION 7 — QC Queue
// ─────────────────────────────────────────────

const QCQueue = ({ qcAssessment, technicians, setActiveView }) => (
  <Panel
    title="QC Queue"
    dotColor={C.success}
    delay={0.2}
    action={
      <button
        onClick={() => setActiveView('QC Verification')}
        className="flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wide px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-[#EAB308] hover:bg-white/5 transition-colors"
      >
        Open Center <ArrowRight size={12} />
      </button>
    }
  >
    {qcAssessment.length === 0 ? (
      <EmptyState icon={ShieldCheck} title="QC queue is clear" helper="Jobs pending verification will appear here." color={C.success} />
    ) : (
      <div className="space-y-2.5">
        {qcAssessment.map((job, i) => {
          const tech = technicians.find(t => t.id === job.technician_id);
          return (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.1] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold text-white truncate mb-1">{job.full_name}</p>
                <div className="flex items-center gap-2 text-[10.5px] text-slate-500">
                  <span className="truncate">{tech ? (tech.full_name || tech.name) : 'Unassigned technician'}</span>
                  <span className="text-white/10">•</span>
                  <span className="flex items-center gap-1 flex-shrink-0"><Clock size={10} /> {formatDate(job.completed_at || job.created_at)}</span>
                </div>
              </div>
              <button
                onClick={() => setActiveView('QC Verification')}
                className="flex-shrink-0 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-bold transition-colors active:scale-[0.97] border"
                style={{ background: `${C.success}14`, color: C.success, borderColor: `${C.success}28` }}
              >
                Review
              </button>
            </motion.div>
          );
        })}
      </div>
    )}
  </Panel>
);

// ─────────────────────────────────────────────
// SECTION 8 — Recent Activity
// ─────────────────────────────────────────────

const ActivityTimeline = ({ appointments, loading }) => {
  const getActivity = (item) => {
    if (item.status === 'completed') return { label: 'Job Completed', color: C.success, icon: CheckCircle2 };
    if (item.status === 'qc') return { label: 'QC Submitted', color: C.success, icon: ShieldCheck };
    if (item.status === 'ongoing') return { label: 'Technician Assigned', color: C.secondary, icon: Wrench };
    if (item.payment_status === 'paid') return { label: 'Payment Verified', color: C.primary, icon: CheckCircle2 };
    return { label: 'Appointment Created', color: '#94A3B8', icon: Activity };
  };

  const formatTime = (ts) => {
    if (!ts) return '—';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const all = appointments.slice(0, 6);

  return (
    <Panel title="Recent Activity" dotColor={C.secondary} delay={0.25}>
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}</div>
      ) : all.length === 0 ? (
        <EmptyState icon={Activity} title="No recent activity" helper="New appointments will appear here in real time." />
      ) : (
        <div className="relative">
          <div className="absolute left-[15px] top-2 bottom-2 w-px bg-white/[0.06]" />
          <div className="space-y-4">
            {all.map((item, i) => {
              const act = getActivity(item);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="relative flex items-start gap-3.5"
                >
                  <div
                    className="relative z-10 w-[31px] h-[31px] rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: C.card, border: `2px solid ${act.color}55` }}
                  >
                    <act.icon size={13} style={{ color: act.color }} />
                  </div>
                  <div className="flex-1 min-w-0 pb-1 pt-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-bold text-slate-400">{formatTime(item.created_at)}</p>
                      <span className="text-[9.5px] font-medium text-slate-500 flex-shrink-0">{item.service_type || '—'}</span>
                    </div>
                    <p className="text-[12.5px] font-semibold text-white truncate mt-0.5">{item.full_name}</p>
                    <p className="text-[10.5px] font-medium" style={{ color: act.color }}>{act.label}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </Panel>
  );
};

// ─────────────────────────────────────────────
// Manager Notes — premium sticky-note reminder widget (manager_notes table)
// ─────────────────────────────────────────────

const ManagerNotesWidget = ({ notes, onAdd, loading }) => {
  const [draft, setDraft] = useState('');

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    onAdd(text);
    setDraft('');
  };

  return (
    <Panel title="Manager Notes" dotColor={C.primary} delay={0.3}>
      <div className="flex items-center gap-2 mb-4">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Jot a quick reminder…"
          className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-[12px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-white/20 transition-colors"
        />
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={submit}
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ background: `${C.primary}18`, color: C.primary, border: `1px solid ${C.primary}28` }}
        >
          <Plus size={15} />
        </motion.button>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <SkeletonRow key={i} />)}</div>
      ) : notes.length === 0 ? (
        <EmptyState icon={StickyNote} title="No notes yet" helper="Reminders you jot down will stick here." color={C.primary} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {notes.slice(0, 4).map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, scale: 0.96, rotate: i % 2 === 0 ? -1 : 1 }}
              animate={{ opacity: 1, scale: 1, rotate: i % 2 === 0 ? -1 : 1 }}
              whileHover={{ rotate: 0, scale: 1.02 }}
              className="p-3 rounded-xl border border-white/[0.06] shadow-lg"
              style={{ background: `${C.primary}0A`, boxShadow: `0 4px 20px -8px ${C.primary}22` }}
            >
              <p className="text-[11.5px] text-slate-200 leading-snug">{n.content || n.note || n.text}</p>
              <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide mt-2">
                {n.created_at ? new Date(n.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </Panel>
  );
};

// ─────────────────────────────────────────────
// Logout confirmation modal
// ─────────────────────────────────────────────

const LogoutModal = ({ show, onClose, onLogout }) => (
  <AnimatePresence>
    {show && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="relative bg-[#0A0F18] border border-white/10 p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X size={16} />
          </button>
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: `${C.danger}14`, border: `1px solid ${C.danger}28` }}>
            <AlertCircle style={{ color: C.danger }} size={26} />
          </div>
          <h3 className="text-base font-bold text-white mb-2">Log out of RionOps?</h3>
          <p className="text-slate-400 text-[13px] leading-relaxed mb-7">
            You'll be signed out of the manager console and your real-time session will end.
          </p>
          <div className="flex flex-col gap-2.5">
            <button
              onClick={onLogout}
              className="w-full py-3 rounded-xl text-white text-[13px] font-semibold transition-colors active:scale-[0.98]"
              style={{ background: C.danger }}
            >
              Log out
            </button>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-[13px] font-semibold transition-colors"
            >
              Stay signed in
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

// ─────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────

const ManagerDashboard = ({ onLogout }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeView, setActiveView] = useState('Dashboard');
  const [stats, setStats] = useState({ dispatch: 0, qc: 0, total: 0, completedToday: 0 });
  const [dispatchQueue, setDispatchQueue] = useState([]);
  const [qcAssessment, setQcAssessment] = useState([]);
  const [cashierApprovals, setCashierApprovals] = useState([]);
  const [allRecent, setAllRecent] = useState([]);
  const [liveJobsData, setLiveJobsData] = useState([]);
  const [todaysSchedule, setTodaysSchedule] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [managerNotes, setManagerNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(true);

  const containerVars = { animate: { transition: { staggerChildren: 0.06 } } };
  const itemVars = {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 320, damping: 26 } },
  };

  const menuItems = [
    { icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { icon: <Truck size={18} />, label: 'Dispatching', display: 'Dispatch Center' },
    { icon: <ClipboardCheck size={18} />, label: 'QC Verification', display: 'QC Center' },
    { icon: <Users size={18} />, label: 'Technician Registry', display: 'Technicians' },
  ];

  const pushToast = (type, detail) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev.slice(-3), { id, type, detail }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  };

  // ── Data fetching — queries against the existing schema only ──
  const fetchData = async () => {
    const dayStart = startOfDay().toISOString();
    const dayEnd = endOfDay().toISOString();

    const { count: totalCount } = await supabase.from('appointments').select('*', { count: 'exact', head: true });
    const { count: dispatchCount } = await supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    const { count: qcCount } = await supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('status', 'qc');

    // Completed Today — same 'appointments' table, filtered to completed jobs finished within today's window.
    let completedTodayCount = 0;
    try {
      const { count } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('completed_at', dayStart)
        .lte('completed_at', dayEnd);
      completedTodayCount = count || 0;
    } catch {
      completedTodayCount = 0;
    }

    setStats({ total: totalCount || 0, dispatch: dispatchCount || 0, qc: qcCount || 0, completedToday: completedTodayCount });

    const { data: queueData } = await supabase.from('appointments').select('*').eq('status', 'pending').order('created_at', { ascending: false }).limit(3);
    const { data: qcData } = await supabase.from('appointments').select('*').eq('status', 'qc').order('created_at', { ascending: false }).limit(3);
    const { data: approvedPayments } = await supabase.from('appointments').select('*').eq('payment_status', 'paid').neq('status', 'ongoing').order('created_at', { ascending: false }).limit(6);
    const { data: recentAll } = await supabase.from('appointments').select('*').order('created_at', { ascending: false }).limit(6);
    const { data: liveOngoing } = await supabase.from('appointments').select('*').eq('status', 'ongoing').order('started_at', { ascending: false }).limit(4);

    // Today's Schedule — existing schedule_date / appointment_time columns only.
    let scheduleData = [];
    try {
      const { data } = await supabase
        .from('appointments')
        .select('*')
        .gte('schedule_date', dayStart)
        .lte('schedule_date', dayEnd)
        .order('appointment_time', { ascending: true });
      scheduleData = data || [];
    } catch {
      scheduleData = [];
    }

    // Try to fetch technicians (gracefully handle if table doesn't exist)
    try {
      const { data: techData } = await supabase.from('technicians').select('*');
      setTechnicians(techData || []);
    } catch {
      setTechnicians([]);
    }

    setDispatchQueue(queueData || []);
    setQcAssessment(qcData || []);
    setCashierApprovals(approvedPayments || []);
    setAllRecent(recentAll || []);
    setLiveJobsData(liveOngoing || []);
    setTodaysSchedule(scheduleData);
    setLoading(false);
  };

  const fetchNotes = async () => {
    try {
      const { data } = await supabase.from('manager_notes').select('*').order('created_at', { ascending: false }).limit(8);
      setManagerNotes(data || []);
    } catch {
      setManagerNotes([]);
    }
    setNotesLoading(false);
  };

  const addNote = async (content) => {
    // Optimistic update — insert schema for manager_notes may vary by project,
    // so this is wrapped defensively and simply re-syncs on failure.
    const optimistic = { id: `temp-${Date.now()}`, content, created_at: new Date().toISOString() };
    setManagerNotes((prev) => [optimistic, ...prev]);
    try {
      await supabase.from('manager_notes').insert([{ content }]);
      fetchNotes();
    } catch {
      // leave optimistic note in place if insert isn't supported by schema
    }
  };

  useEffect(() => {
    fetchData();
    fetchNotes();

    const subscription = supabase
      .channel('manager_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, (payload) => {
        fetchData();
        if (payload.eventType === 'INSERT') {
          pushToast('new_appointment', payload.new?.full_name);
        } else if (payload.eventType === 'UPDATE') {
          const before = payload.old || {};
          const after = payload.new || {};
          if (before.payment_status !== 'paid' && after.payment_status === 'paid') {
            pushToast('payment_verified', after.full_name);
          } else if (before.status !== 'ongoing' && after.status === 'ongoing') {
            pushToast('technician_assigned', after.full_name);
          } else if (before.status !== 'qc' && after.status === 'qc') {
            pushToast('qc_submitted', after.full_name);
          } else if (before.status !== 'completed' && after.status === 'completed') {
            pushToast('job_completed', after.full_name);
          }
        }
      })
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, []);

  const availableTechs = technicians.filter(t => t.status === 'available' || !t.status).length;

  const badgeFor = (label) => {
    if (label === 'Dispatching') return stats.dispatch;
    if (label === 'QC Verification') return stats.qc;
    if (label === 'Technician Registry') return availableTechs;
    return null;
  };

  // Approximate per-technician workload from the currently-loaded activity
  // sample (dispatch queue + QC queue + recent + live) — no new DB structure
  // needed, just cross-referencing the existing `technician_id` field.
  const jobCountFor = useMemo(() => {
    const pool = [...dispatchQueue, ...qcAssessment, ...allRecent, ...liveJobsData];
    return (techId) => pool.filter((a) => a.technician_id === techId && a.status !== 'completed').length;
  }, [dispatchQueue, qcAssessment, allRecent, liveJobsData]);

  // Current customer + start time per technician, from the live/ongoing pool.
  const currentJobFor = useMemo(() => {
    return (techId) => liveJobsData.find((a) => a.technician_id === techId) || null;
  }, [liveJobsData]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 18) return 'Good Afternoon';
    return 'Good Evening';
  })();

  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div className="min-h-screen flex font-sans text-slate-100 selection:bg-[#EAB308] selection:text-[#020617]" style={{ background: C.bg }}>

      <LogoutModal show={showLogoutModal} onClose={() => setShowLogoutModal(false)} onLogout={onLogout} />
      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
          />
        )}
      </AnimatePresence>

      <Sidebar
        menuItems={menuItems}
        activeView={activeView}
        setActiveView={setActiveView}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        badgeFor={badgeFor}
        onLogoutClick={() => setShowLogoutModal(true)}
      />

      {/* MAIN */}
      <main className={`flex-1 min-h-screen flex flex-col transition-all duration-300 ${isCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        <Header
          greeting={greeting}
          todayLabel={activeView === 'Dashboard' ? todayLabel : 'Synced in real time'}
          onMenuClick={() => setIsMobileOpen(!isMobileOpen)}
          onBellClick={() => setActiveView('Dashboard')}
          unreadCount={stats.dispatch + stats.qc}
        />

        <motion.div
          variants={containerVars}
          initial="initial"
          animate="animate"
          className="flex-1 p-5 md:p-8 max-w-[1600px] w-full mx-auto space-y-5"
        >
          {activeView === 'Dashboard' && (
            <>
              {/* 1 — Critical Alerts */}
              <motion.div variants={itemVars}>
                <CriticalAlerts stats={stats} technicians={technicians} allRecent={allRecent} setActiveView={setActiveView} />
              </motion.div>

              {/* 2 — Mission Control */}
              <motion.div variants={itemVars}>
                <MissionControl stats={stats} />
              </motion.div>

              {/* 3 — Dispatch Queue */}
              <motion.div variants={itemVars}>
                <DispatchQueue stats={stats} dispatchQueue={dispatchQueue} cashierApprovals={cashierApprovals} setActiveView={setActiveView} />
              </motion.div>

              {/* 4 — Technician Status + Today's Schedule */}
              <motion.div variants={itemVars} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2">
                  <TechnicianStatus technicians={technicians} jobCountFor={jobCountFor} currentJobFor={currentJobFor} loading={loading} setActiveView={setActiveView} />
                </div>
                <div className="lg:col-span-1">
                  <TodaysSchedule schedule={todaysSchedule} loading={loading} />
                </div>
              </motion.div>

              {/* 5 — Live Jobs */}
              <motion.div variants={itemVars}>
                <LiveJobs liveJobs={liveJobsData} technicians={technicians} loading={loading} />
              </motion.div>

              {/* 6 — QC Queue */}
              <motion.div variants={itemVars}>
                <QCQueue qcAssessment={qcAssessment} technicians={technicians} setActiveView={setActiveView} />
              </motion.div>

              {/* 7 — Recent Activity + Manager Notes */}
              <motion.div variants={itemVars} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2">
                  <ActivityTimeline appointments={allRecent} loading={loading} />
                </div>
                <div className="lg:col-span-1">
                  <ManagerNotesWidget notes={managerNotes} onAdd={addNote} loading={notesLoading} />
                </div>
              </motion.div>
            </>
          )}

          <AnimatePresence mode="wait">
            {activeView !== 'Dashboard' && (
              <motion.div
                key={activeView}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: 'linear' }}
              >
                {activeView === 'Dispatching' && <DispatchingView onNavigateToDashboard={() => setActiveView('Dashboard')} />}
                {activeView === 'QC Verification' && <QCVerificationView />}
                {activeView === 'Technician Registry' && <TechnicianManagementView />}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>
    </div>
  );
};

export default ManagerDashboard;
