import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import {
  Search, Loader2, Mail, Plus, X, UserCheck, ChevronLeft, ChevronRight,
  Activity, MapPin, User, Image as ImageIcon, ClipboardList,
  CheckCircle2, Circle, XCircle, TrendingUp, TrendingDown,
  Wifi, Users, Wrench, Calendar, LayoutGrid, List, RefreshCw,
  MoreHorizontal, ArrowRight, ChevronDown, Radio, Layers,
  Zap, Shield, Clock, AlertCircle, Navigation, Settings,
  Flag, Target, BarChart3, Eye, Edit3, Hash, Compass,
  ChevronUp, Filter, Bell, BookOpen, CloudSun, Gauge, Sparkles
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, addMonths, subMonths, startOfWeek, endOfWeek,
  isToday, addDays, isThisMonth, subDays, isWithinInterval
} from 'date-fns';
import Swal from 'sweetalert2';

/* ─────────────────────────────────────────────────────────────
   DESIGN TOKENS — Navy / Yellow only
───────────────────────────────────────────────────────────── */
const T = {
  navy:      '#0B1F3A',
  navyDeep:  '#071320',
  card:      '#0F213E',
  cardHi:    '#122649',
  yellow:    '#FFC107',
  gold:      '#FFD54F',
  hover:     '#F4B400',
  border:    'rgba(255,193,7,.15)',
  borderHi:  'rgba(255,193,7,.32)',
  glow:      'rgba(255,193,7,.25)',
  text:      '#FFFFFF',
  text2:     '#B8C3D6',
  muted:     '#72809A',
};

/* Functional status colors are kept distinct from the Navy/Yellow brand
   palette on purpose — they are semantic signals (done / waiting / cancelled),
   not decorative accents, so operators can scan state at a glance. */
const APPT_STATUS = {
  scheduled:  { label: 'Scheduled', color: T.gold,    bg: 'rgba(255,213,79,0.10)',  border: 'rgba(255,213,79,0.28)' },
  active:     { label: 'Active',    color: T.yellow,  bg: 'rgba(255,193,7,0.14)',   border: 'rgba(255,193,7,0.32)'  },
  completed:  { label: 'Done',      color: '#3DDC84', bg: 'rgba(61,220,132,0.10)',  border: 'rgba(61,220,132,0.26)' },
  pending:    { label: 'Pending',   color: '#FF9142', bg: 'rgba(255,145,66,0.10)',  border: 'rgba(255,145,66,0.26)' },
  standby:    { label: 'Standby',   color: '#8FA6C9', bg: 'rgba(143,166,201,0.10)', border: 'rgba(143,166,201,0.24)'},
  cancelled:  { label: 'Cancelled', color: '#FF5A5A', bg: 'rgba(255,90,90,0.08)',   border: 'rgba(255,90,90,0.22)'  },
};
const TECH_STATUS = {
  available:  { label: 'Available',  color: '#3DDC84' },
  traveling:  { label: 'Traveling',  color: T.gold    },
  onsite:     { label: 'On Site',    color: T.yellow  },
  installing: { label: 'Installing', color: '#8FA6C9' },
  offline:    { label: 'Offline',    color: T.muted   },
};
const getAppt = (s) => APPT_STATUS[s?.toLowerCase()] || APPT_STATUS.pending;
const getTech = (s) => TECH_STATUS[s?.toLowerCase()] || TECH_STATUS.available;

/* ─────────────────────────────────────────────────────────────
   GLOBAL KEYFRAMES (injected once)
───────────────────────────────────────────────────────────── */
const GlobalStyle = () => (
  <style>{`
    @keyframes fdIn      { from{opacity:0} to{opacity:1} }
    @keyframes slIn      { from{transform:translateX(100%)} to{transform:translateX(0)} }
    @keyframes riseIn    { from{opacity:0; transform:translateY(10px)} to{opacity:1; transform:translateY(0)} }
    @keyframes popIn     { from{opacity:0; transform:scale(.94)} to{opacity:1; transform:scale(1)} }
    @keyframes shimmer   { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
    @keyframes pulseGlow { 0%,100%{box-shadow:0 0 0 0 rgba(255,193,7,.35)} 50%{box-shadow:0 0 0 6px rgba(255,193,7,0)} }
    @keyframes floaty    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
    @keyframes fabIn     { from{opacity:0;transform:translateY(10px) scale(.9)} to{opacity:1;transform:translateY(0) scale(1)} }
    @keyframes sweepBar  { from{transform:scaleX(0)} to{transform:scaleX(1)} }
    .noscroll::-webkit-scrollbar{display:none}
    .noscroll{-ms-overflow-style:none;scrollbar-width:none}
    .yshimmer{background:linear-gradient(90deg,rgba(255,255,255,0.03) 0%,rgba(255,193,7,0.09) 50%,rgba(255,255,255,0.03) 100%);background-size:800px 100%;animation:shimmer 1.6s linear infinite}
    .rise{animation:riseIn .4s cubic-bezier(.16,1,.3,1) both}
    .pop{animation:popIn .25s cubic-bezier(.16,1,.3,1) both}
    .yfocus:focus{outline:none;border-color:${T.borderHi} !important;box-shadow:0 0 0 3px ${T.glow} !important}
    .ylift{transition:transform .22s cubic-bezier(.16,1,.3,1), box-shadow .22s ease, border-color .22s ease}
    .ylift:hover{transform:translateY(-2px)}
  `}</style>
);

/* ─────────────────────────────────────────────────────────────
   ATOMS
───────────────────────────────────────────────────────────── */
const Glass = ({ children, className = '', style = {}, onClick, hoverGlow = false }) => (
  <div
    onClick={onClick}
    className={`rounded-2xl border ${onClick ? 'cursor-pointer' : ''} ${hoverGlow ? 'ylift' : ''} ${className}`}
    style={{
      background: `linear-gradient(160deg, ${T.card} 0%, ${T.navyDeep} 130%)`,
      border: `1px solid ${T.border}`,
      backdropFilter: 'blur(18px)',
      boxShadow: '0 4px 28px rgba(0,0,0,0.45)',
      ...style,
    }}
  >
    {children}
  </div>
);

const Dot = ({ color, pulse = false, size = 7 }) => (
  <span className="relative inline-flex" style={{ width: size, height: size }}>
    {pulse && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-40" style={{ background: color }} />}
    <span className="relative inline-flex rounded-full w-full h-full" style={{ background: color, boxShadow: `0 0 6px ${color}90` }} />
  </span>
);

const Badge = ({ status, size = 'sm' }) => {
  const cfg = getAppt(status);
  return (
    <span
      className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider rounded-full ${size === 'xs' ? 'px-1.5 py-0.5 text-[8px]' : 'px-2 py-0.5 text-[9px]'}`}
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
    >
      <Dot color={cfg.color} size={5} />
      {cfg.label}
    </span>
  );
};

/* animated integer counter */
const Counter = ({ to, prefix = '' }) => {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const end = Number(to) || 0;
    if (prev.current === end) return;
    const start = prev.current;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / 700, 1);
      const ease = 1 - (1 - p) ** 3;
      setVal(Math.round(start + (end - start) * ease));
      if (p < 1) requestAnimationFrame(tick); else prev.current = end;
    };
    requestAnimationFrame(tick);
  }, [to]);
  return <>{prefix}{val.toLocaleString()}</>;
};

/* tiny sparkline built from real derived counts (no fake data — counts come
   from the actual appointments array grouped by day) */
const Sparkline = ({ points, color }) => {
  const w = 64, h = 22;
  const max = Math.max(1, ...points);
  const step = w / Math.max(1, points.length - 1);
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${h - (p / max) * (h - 4) - 2}`).join(' ');
  const areaD = `${d} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <defs>
        <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#spark-${color.replace('#', '')})`} stroke="none" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/* circular gauge — used for completion % (real, derived data) */
const RingGauge = ({ pct, color, size = 40, stroke = 4, label }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset .8s cubic-bezier(.16,1,.3,1)' }} />
      </svg>
      <span className="absolute text-[9px] font-black" style={{ color }}>{label ?? `${pct}%`}</span>
    </div>
  );
};

const LiveClock = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-sm font-black tabular-nums text-white tracking-tight">{format(now, 'HH:mm:ss')}</span>
      <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: T.muted }}>{format(now, 'zzz')}</span>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   HEADER — Control Center
───────────────────────────────────────────────────────────── */
const ControlHeader = ({ activeCount, pendingCount, search, setSearch, onRefresh, onAssign, viewMode, setViewMode }) => (
  <Glass className="px-5 py-3.5 mb-4 shrink-0 rise" style={{ boxShadow: `0 6px 32px rgba(0,0,0,0.5)` }}>
    <div className="flex items-center justify-between gap-4 flex-wrap">

      {/* identity + realtime */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${T.yellow}, ${T.gold})`, boxShadow: `0 0 22px ${T.glow}` }}>
          <Compass size={17} className="text-[#0B1F3A]" strokeWidth={2.4} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-white tracking-tight">Dispatch Center</h2>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest" style={{ background: 'rgba(61,220,132,0.10)', border: '1px solid rgba(61,220,132,0.28)', color: '#3DDC84' }}>
              <Dot color="#3DDC84" pulse size={5} /> Realtime
            </span>
          </div>
          <p className="text-[9px] font-semibold tracking-widest uppercase mt-0.5" style={{ color: T.muted }}>{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
      </div>

      {/* clock + deployments */}
      <div className="flex items-center gap-5">
        <div className="text-right">
          <LiveClock />
        </div>
        <div className="h-8 w-px" style={{ background: T.border }} />
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg" style={{ background: 'rgba(255,193,7,0.12)' }}>
            <Radio size={12} style={{ color: T.yellow }} />
          </div>
          <div>
            <p className="text-sm font-black text-white leading-none"><Counter to={activeCount} /></p>
            <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: T.muted }}>Active Deployments</p>
          </div>
        </div>
      </div>

      {/* search + actions */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.muted }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Quick search…"
            className="yfocus pl-8 pr-3 py-2 text-[11px] font-medium text-white outline-none rounded-xl transition-all"
            style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}`, width: 170 }}
          />
        </div>

        <button className="relative p-2.5 rounded-xl transition-all hover:brightness-125" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}` }}>
          <Bell size={13} style={{ color: T.text2 }} />
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-[#0B1F3A]" style={{ background: T.yellow }}>
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          )}
        </button>

        <button onClick={onRefresh} className="p-2.5 rounded-xl transition-all hover:rotate-180 duration-500" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}` }}>
          <RefreshCw size={13} style={{ color: T.text2 }} />
        </button>

        <div className="flex p-0.5 rounded-xl gap-0.5" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}` }}>
          {[{ k: 'calendar', Icon: LayoutGrid, l: 'Calendar' }, { k: 'registry', Icon: Users, l: 'Registry' }].map(({ k, Icon, l }) => (
            <button key={k} onClick={() => setViewMode(k)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200"
              style={{
                background: viewMode === k ? `linear-gradient(135deg, ${T.yellow}, ${T.gold})` : 'transparent',
                color: viewMode === k ? '#0B1F3A' : T.muted,
                boxShadow: viewMode === k ? `0 0 16px ${T.glow}` : 'none',
              }}>
              <Icon size={11} />{l}
            </button>
          ))}
        </div>

        <button onClick={onAssign}
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-[#0B1F3A] transition-all hover:brightness-110"
          style={{ background: `linear-gradient(135deg, ${T.yellow}, ${T.gold})`, boxShadow: `0 4px 18px ${T.glow}` }}>
          <UserCheck size={13} /> Assign
        </button>
      </div>
    </div>
  </Glass>
);

/* ─────────────────────────────────────────────────────────────
   STAT CARDS ROW — real derived trend + sparkline, no fake data
───────────────────────────────────────────────────────────── */
const StatsRow = ({ appointments, techs }) => {
  const total     = appointments.length;
  const active    = appointments.filter(a => ['active', 'scheduled'].includes(a.status?.toLowerCase())).length;
  const completed = appointments.filter(a => a.status?.toLowerCase() === 'completed').length;
  const pending   = appointments.filter(a => a.status?.toLowerCase() === 'pending').length;
  const available = techs.filter(t => !appointments.some(a =>
    a.technician_id === t.id && isSameDay(new Date(a.schedule_date), new Date()) &&
    ['active', 'scheduled'].includes(a.status?.toLowerCase())
  )).length;

  /* last-14-days daily counts, derived strictly from real appointment rows */
  const last14 = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(new Date(), 13), end: new Date() });
    return days.map(d => appointments.filter(a => isSameDay(new Date(a.schedule_date), d)).length);
  }, [appointments]);

  const weekTrend = (predicate) => {
    const thisWeek = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });
    const lastWeek = eachDayOfInterval({ start: subDays(new Date(), 13), end: subDays(new Date(), 7) });
    const count = (range) => appointments.filter(a => predicate(a) && isWithinInterval(new Date(a.schedule_date), { start: range[0], end: range[range.length - 1] })).length;
    const tw = count(thisWeek), lw = count(lastWeek);
    if (lw === 0) return tw > 0 ? { pct: 100, up: true } : { pct: 0, up: true };
    const pct = Math.round(((tw - lw) / lw) * 100);
    return { pct: Math.abs(pct), up: pct >= 0 };
  };

  const cards = [
    { label: 'Total Jobs',     value: total,     icon: ClipboardList, trend: weekTrend(() => true) },
    { label: 'Active Deploy',  value: active,    icon: Radio,         trend: weekTrend(a => ['active', 'scheduled'].includes(a.status?.toLowerCase())) },
    { label: 'Completed',      value: completed, icon: CheckCircle2,  trend: weekTrend(a => a.status?.toLowerCase() === 'completed') },
    { label: 'Pending',        value: pending,   icon: Circle,        trend: weekTrend(a => a.status?.toLowerCase() === 'pending') },
    { label: 'Available Tech', value: available, icon: Users,         trend: null, live: true },
  ];

  return (
    <div className="grid grid-cols-5 gap-3 mb-4 shrink-0">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <Glass key={i} hoverGlow className="p-4 rise" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-xl" style={{ background: 'rgba(255,193,7,0.12)', border: `1px solid ${T.border}` }}>
                <Icon size={13} style={{ color: T.yellow }} />
              </div>
              {c.live ? (
                <span className="text-[9px] font-bold flex items-center gap-1" style={{ color: '#3DDC84' }}>
                  <Dot color="#3DDC84" pulse size={6} /> LIVE
                </span>
              ) : (
                <span className="text-[9px] font-bold flex items-center gap-0.5" style={{ color: c.trend.up ? '#3DDC84' : '#FF5A5A' }}>
                  {c.trend.up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}{c.trend.pct}%
                </span>
              )}
            </div>
            <div className="flex items-end justify-between gap-2">
              <div>
                <div className="text-[26px] font-black leading-none tracking-tight mb-1" style={{ color: T.yellow, textShadow: `0 0 20px ${T.glow}` }}>
                  <Counter to={c.value} />
                </div>
                <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: T.muted }}>{c.label}</p>
              </div>
              <Sparkline points={last14} color={T.gold} />
            </div>
          </Glass>
        );
      })}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   MINI CALENDAR (right panel) — workload dots from real data
───────────────────────────────────────────────────────────── */
const MiniCal = ({ appointments, selectedDate, onSelect }) => {
  const [month, setMonth] = useState(new Date());
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) });

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-black text-white">{format(month, 'MMM yyyy')}</span>
        <div className="flex gap-0.5">
          <button onClick={() => setMonth(subMonths(month, 1))} className="p-1 rounded hover:bg-white/5 transition-colors" style={{ color: T.muted }}><ChevronLeft size={11} /></button>
          <button onClick={() => setMonth(addMonths(month, 1))} className="p-1 rounded hover:bg-white/5 transition-colors" style={{ color: T.muted }}><ChevronRight size={11} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[8px] font-bold py-1" style={{ color: T.muted, opacity: 0.6 }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px">
        {days.map((day, i) => {
          const inM  = format(day, 'MM') === format(month, 'MM');
          const load = appointments.filter(a => isSameDay(new Date(a.schedule_date), day)).length;
          const sel  = selectedDate && isSameDay(day, selectedDate);
          const tod  = isToday(day);
          return (
            <button key={i} onClick={() => inM && onSelect(day)}
              className={`relative flex items-center justify-center aspect-square text-[10px] font-semibold rounded transition-all duration-150 ${!inM ? 'opacity-15 pointer-events-none' : sel ? 'text-[#0B1F3A]' : ''}`}
              style={{
                background: sel ? `linear-gradient(135deg, ${T.yellow}, ${T.gold})` : 'transparent',
                boxShadow: sel ? `0 0 12px ${T.glow}` : 'none',
                color: !inM ? undefined : sel ? '#0B1F3A' : tod ? T.gold : T.text2,
              }}>
              {format(day, 'd')}
              {load > 0 && !sel && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-[1px]">
                  {Array.from({ length: Math.min(3, load) }).map((_, di) => (
                    <span key={di} className="w-1 h-1 rounded-full" style={{ background: T.yellow }} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   MISSION TIMELINE (today panel) — vertical timeline w/ status icons
───────────────────────────────────────────────────────────── */
const TodayPanel = ({ appointments, techs, selectedDate, onOpen }) => {
  const target  = selectedDate || new Date();
  const dayApps = appointments
    .filter(a => isSameDay(new Date(a.schedule_date), target))
    .sort((a, b) => (a.status || '').localeCompare(b.status || ''));

  const completion = dayApps.length ? Math.round((dayApps.filter(a => a.status?.toLowerCase() === 'completed').length / dayApps.length) * 100) : 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div>
          <h3 className="text-[11px] font-black uppercase tracking-widest text-white">
            {selectedDate ? format(selectedDate, 'EEE d MMM') : 'Mission Timeline'}
          </h3>
          <p className="text-[9px] mt-0.5" style={{ color: T.muted }}>{dayApps.length} job{dayApps.length !== 1 ? 's' : ''} · {completion}% complete</p>
        </div>
        <RingGauge pct={completion} color={T.yellow} size={30} stroke={3} label={`${completion}`} />
      </div>

      <div className="flex-1 overflow-y-auto pr-0.5 min-h-0 noscroll">
        {dayApps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2" style={{ background: 'rgba(255,193,7,0.06)', border: `1px solid ${T.border}` }}>
              <Calendar size={15} style={{ color: T.muted }} />
            </div>
            <p className="text-[10px] font-medium" style={{ color: T.muted }}>No missions scheduled</p>
          </div>
        ) : (
          <div className="relative pl-4">
            <div className="absolute left-[7px] top-1 bottom-1 w-px" style={{ background: T.border }} />
            {dayApps.map((app, i) => {
              const tech = techs.find(t => t.id === app.technician_id);
              const cfg  = getAppt(app.status);
              return (
                <button key={i} onClick={() => onOpen(app)} className="relative w-full text-left mb-2.5 group">
                  <span className="absolute -left-4 top-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: T.navyDeep, border: `2px solid ${cfg.color}` }}>
                    <span className="w-1 h-1 rounded-full" style={{ background: cfg.color }} />
                  </span>
                  <div className="p-2.5 rounded-xl transition-all duration-150 group-hover:translate-x-0.5"
                    style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}` }}>
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-[10px] font-bold truncate" style={{ color: T.text2 }}>{app.service_type}</span>
                      <Badge status={app.status} size="xs" />
                    </div>
                    <p className="text-[9px] truncate" style={{ color: T.muted }}>{app.full_name || 'Anonymous'}</p>
                    {tech && (
                      <div className="flex items-center gap-1 mt-1">
                        <div className="w-3.5 h-3.5 rounded flex items-center justify-center text-[7px] font-black text-[#0B1F3A] shrink-0" style={{ background: `linear-gradient(135deg, ${T.yellow}, ${T.gold})` }}>
                          {tech.full_name?.charAt(0)}
                        </div>
                        <span className="text-[9px] truncate" style={{ color: T.muted }}>{tech.full_name}</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   UPCOMING JOBS + AVAILABILITY + WEATHER (right rail extras)
───────────────────────────────────────────────────────────── */
const UpcomingJobs = ({ appointments, techs, onOpen }) => {
  const upcoming = appointments
    .filter(a => new Date(a.schedule_date) >= new Date(format(new Date(), 'yyyy-MM-dd')))
    .filter(a => !['completed', 'cancelled'].includes(a.status?.toLowerCase()))
    .sort((a, b) => new Date(a.schedule_date) - new Date(b.schedule_date))
    .slice(0, 4);

  if (!upcoming.length) return null;

  return (
    <div>
      <p className="text-[8px] font-black uppercase tracking-[0.3em] mb-2" style={{ color: T.muted }}>Upcoming Jobs</p>
      <div className="space-y-1.5">
        {upcoming.map((app, i) => {
          const cfg = getAppt(app.status);
          return (
            <button key={i} onClick={() => onOpen(app)} className="w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all hover:brightness-125"
              style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}` }}>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.color }} />
              <span className="text-[9px] font-semibold truncate flex-1" style={{ color: T.text2 }}>{app.service_type}</span>
              <span className="text-[8px] font-bold shrink-0" style={{ color: T.muted }}>{format(new Date(app.schedule_date), 'MMM d')}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const WeatherPlaceholder = () => (
  <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,193,7,0.05)', border: `1px solid ${T.border}` }}>
    <div className="p-2 rounded-lg" style={{ background: 'rgba(255,193,7,0.12)' }}>
      <CloudSun size={16} style={{ color: T.gold }} />
    </div>
    <div>
      <p className="text-[10px] font-black text-white">Field Conditions</p>
      <p className="text-[8px]" style={{ color: T.muted }}>Weather integration coming soon</p>
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────────
   BOTTOM STATUS BAR
───────────────────────────────────────────────────────────── */
const StatusBar = ({ appointments, techs }) => {
  const counts = {
    active:    appointments.filter(a => ['active', 'scheduled'].includes(a.status?.toLowerCase())).length,
    available: techs.filter(t => !appointments.some(a => a.technician_id === t.id && isSameDay(new Date(a.schedule_date), new Date()) && ['active', 'scheduled'].includes(a.status?.toLowerCase()))).length,
    completed: appointments.filter(a => a.status?.toLowerCase() === 'completed').length,
    pending:   appointments.filter(a => a.status?.toLowerCase() === 'pending').length,
    cancelled: appointments.filter(a => a.status?.toLowerCase() === 'cancelled').length,
  };
  const items = [
    { key: 'active',    label: 'Active Deploy', icon: Radio,        color: T.yellow },
    { key: 'available', label: 'Avail. Tech',   icon: Users,        color: '#3DDC84' },
    { key: 'completed', label: 'Completed',     icon: CheckCircle2, color: '#3DDC84' },
    { key: 'pending',   label: 'Pending',       icon: Circle,       color: '#FF9142' },
    { key: 'cancelled', label: 'Cancelled',     icon: XCircle,      color: '#FF5A5A' },
  ];
  return (
    <div className="shrink-0 mt-3">
      <Glass className="px-5 py-3 flex items-center gap-6 flex-wrap">
        <span className="text-[8px] font-black uppercase tracking-[0.3em] shrink-0" style={{ color: T.muted }}>Deployment Status</span>
        <div className="flex items-center gap-5 flex-wrap flex-1">
          {items.map(({ key, label, icon: Icon, color }) => (
            <div key={key} className="flex items-center gap-2">
              <div className="p-1 rounded-lg" style={{ background: `${color}18` }}>
                <Icon size={10} style={{ color }} />
              </div>
              <span className="text-base font-black" style={{ color, textShadow: `0 0 10px ${color}50` }}>
                {counts[key]}
              </span>
              <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: T.muted }}>{label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-[8px] font-bold shrink-0" style={{ color: '#3DDC84' }}>
          <Dot color="#3DDC84" pulse size={5} /> LIVE
        </div>
      </Glass>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   CALENDAR DAY CELL — mission blocks + capacity/workload
───────────────────────────────────────────────────────────── */
const DayCell = ({ day, appts, techs, inMonth, onDayClick, onAppClick, selectedDate, index = 0 }) => {
  const isSelected = selectedDate && isSameDay(day, selectedDate);
  const today      = isToday(day);
  const maxShow    = 3;
  const techCount  = new Set(appts.map(a => a.technician_id).filter(Boolean)).size;
  const completed  = appts.filter(a => a.status?.toLowerCase() === 'completed').length;
  const completion = appts.length ? Math.round((completed / appts.length) * 100) : 0;

  if (!inMonth) {
    return <div className="rounded-xl" style={{ minHeight: 112, opacity: 0.045, background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}` }} />;
  }

  return (
    <div
      onClick={() => onDayClick(day)}
      className="relative rounded-xl flex flex-col cursor-pointer transition-all duration-200 group ylift pop"
      style={{
        minHeight: 112,
        height: '100%',
        overflow: 'hidden',
        padding: '8px 8px 6px',
        background: isSelected ? 'rgba(255,193,7,0.10)' : today ? 'rgba(255,193,7,0.045)' : 'rgba(255,255,255,0.014)',
        border: isSelected ? `1px solid ${T.borderHi}` : today ? `1px solid ${T.border}` : '1px solid rgba(255,255,255,0.035)',
        boxShadow: isSelected ? `0 0 18px ${T.glow}` : today ? `0 0 12px rgba(255,193,7,0.12)` : 'none',
        animationDelay: `${Math.min(index * 12, 260)}ms`,
      }}
    >
      {/* date number */}
      <div className="flex items-center justify-between mb-1.5 shrink-0">
        <span
          className="w-6 h-6 flex items-center justify-center rounded-lg text-[11px] font-black"
          style={today
            ? { background: `linear-gradient(135deg, ${T.yellow}, ${T.gold})`, color: '#0B1F3A', boxShadow: `0 0 10px ${T.glow}` }
            : { color: isSelected ? T.gold : T.muted }
          }
        >
          {format(day, 'd')}
        </span>
        {appts.length > 0 && (
          <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,193,7,0.14)', color: T.gold }}>
            {appts.length}
          </span>
        )}
      </div>

      {/* mission blocks */}
      <div className="flex-1 space-y-1 overflow-hidden">
        {appts.slice(0, maxShow).map((app, idx) => {
          const cfg  = getAppt(app.status);
          const tech = techs.find(t => t.id === app.technician_id);
          return (
            <div key={idx}
              onClick={e => { e.stopPropagation(); onAppClick(app); }}
              className="flex items-center gap-1 px-1.5 py-1 rounded-lg text-[8px] font-semibold truncate transition-all duration-100 hover:brightness-110"
              style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
            >
              <span className="w-1 h-1 rounded-full shrink-0" style={{ background: cfg.color }} />
              <span className="flex-1 truncate">{app.service_type || 'Service'}</span>
              {tech && (
                <span className="w-3.5 h-3.5 rounded shrink-0 flex items-center justify-center text-[7px] font-black text-[#0B1F3A]" style={{ background: `linear-gradient(135deg, ${T.yellow}, ${T.gold})` }}>
                  {tech.full_name?.charAt(0)}
                </span>
              )}
            </div>
          );
        })}
        {appts.length > maxShow && (
          <div className="text-[8px] font-bold pl-1" style={{ color: T.muted }}>+{appts.length - maxShow} more</div>
        )}
      </div>

      {/* footer meta: technicians assigned + completion */}
      {appts.length > 0 && (
        <div className="flex items-center justify-between mt-1 pt-1 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <span className="flex items-center gap-0.5 text-[7px] font-bold" style={{ color: T.muted, opacity: 0.85 }}>
            <Users size={8} /> {techCount}
          </span>
          <span className="text-[7px] font-bold" style={{ color: completion === 100 ? '#3DDC84' : T.muted, opacity: completion === 100 ? 1 : 0.85 }}>{completion}%</span>
        </div>
      )}

      {/* hover add */}
      <div className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={e => { e.stopPropagation(); onDayClick(day); }}>
        <div className="w-4 h-4 rounded flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${T.yellow}, ${T.gold})` }}>
          <Plus size={8} className="text-[#0B1F3A]" />
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   AGENDA VIEW
───────────────────────────────────────────────────────────── */
const AgendaView = ({ appointments, techs, onOpen }) => {
  const days = eachDayOfInterval({ start: new Date(), end: addDays(new Date(), 13) });
  return (
    <div className="flex-1 overflow-y-auto pr-1 noscroll">
      {days.map((day, i) => {
        const da = appointments.filter(a => isSameDay(new Date(a.schedule_date), day));
        return (
          <div key={i} className="flex gap-4 group">
            <div className="w-12 shrink-0 pt-1 text-right pb-4">
              <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: isToday(day) ? T.gold : T.muted, opacity: isToday(day) ? 1 : 0.6 }}>{format(day, 'EEE')}</div>
              <div className="text-xl font-black leading-none" style={{ color: isToday(day) ? '#fff' : T.muted, opacity: isToday(day) ? 1 : 0.5 }}>{format(day, 'd')}</div>
            </div>
            <div className="flex-1 border-l pl-4 pb-4 space-y-1.5 min-h-[48px]" style={{ borderColor: T.border }}>
              {da.length === 0 ? (
                <span className="inline-block mt-2 text-[9px] font-medium" style={{ color: T.muted, opacity: 0.5 }}>No missions</span>
              ) : da.map((app, j) => {
                const tech = techs.find(t => t.id === app.technician_id);
                const cfg  = getAppt(app.status);
                return (
                  <div key={j} onClick={() => onOpen(app)}
                    className="flex items-center gap-2 p-2.5 rounded-xl cursor-pointer transition-all hover:brightness-110"
                    style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold truncate" style={{ color: cfg.color }}>{app.service_type}</p>
                      <p className="text-[8px] truncate" style={{ color: T.muted }}>{app.full_name} · {tech?.full_name || 'Unassigned'}</p>
                    </div>
                    <Badge status={app.status} size="xs" />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   APPOINTMENT DETAIL DRAWER
───────────────────────────────────────────────────────────── */
const DetailDrawer = ({ app, techs, onClose }) => {
  const tech = techs.find(t => t.id === app?.technician_id);
  const cfg  = getAppt(app?.status);
  useEffect(() => {
    const h = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" style={{ animation: 'fdIn .2s ease' }} onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-[110] w-full max-w-md flex flex-col" style={{ background: T.navyDeep, borderLeft: `1px solid ${T.border}`, animation: 'slIn .28s cubic-bezier(.16,1,.3,1)', boxShadow: '-40px 0 80px rgba(0,0,0,0.6)' }}>
        <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${cfg.color}, transparent)` }} />

        {/* hero header */}
        <div className="p-6 pb-5" style={{ background: `linear-gradient(160deg, ${T.card}, ${T.navyDeep})`, borderBottom: `1px solid ${T.border}` }}>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge status={app?.status} />
                <span className="text-[9px] font-mono" style={{ color: T.muted }}>#{app?.id?.substring(0, 8)}</span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight leading-tight">{app?.service_type}</h2>
              <p className="text-[10px] font-semibold mt-1" style={{ color: T.gold }}>{app?.schedule_date ? format(new Date(app.schedule_date), 'EEEE, MMMM d, yyyy') : ''}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 transition-all ml-3 shrink-0" style={{ color: T.muted }}><X size={16} /></button>
          </div>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 noscroll">
          {/* customer */}
          <section>
            <p className="text-[8px] font-black uppercase tracking-[0.3em] mb-2.5" style={{ color: T.muted }}>Customer Information</p>
            <div className="space-y-2">
              {[
                { icon: User,  label: 'Name',    val: app?.full_name || 'Anonymous' },
                { icon: MapPin, label: 'Address', val: app?.address || 'Not specified' },
                { icon: Mail,  label: 'Contact', val: app?.email || 'N/A' },
              ].map(({ icon: Icon, label, val }) => (
                <div key={label} className="flex items-start gap-2.5 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}` }}>
                  <div className="p-1.5 rounded-lg mt-0.5 shrink-0" style={{ background: 'rgba(255,193,7,0.12)' }}>
                    <Icon size={11} style={{ color: T.yellow }} />
                  </div>
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-wider mb-0.5" style={{ color: T.muted }}>{label}</p>
                    <p className="text-[11px] font-semibold" style={{ color: T.text2 }}>{val}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* technician */}
          <section>
            <p className="text-[8px] font-black uppercase tracking-[0.3em] mb-2.5" style={{ color: T.muted }}>Assigned Technician</p>
            {tech ? (
              <div className="flex items-center gap-3 p-3.5 rounded-xl" style={{ background: 'rgba(255,193,7,0.06)', border: `1px solid ${T.border}` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-[#0B1F3A] shrink-0" style={{ background: `linear-gradient(135deg, ${T.yellow}, ${T.gold})`, boxShadow: `0 6px 20px ${T.glow}` }}>{tech.full_name?.charAt(0)}</div>
                <div>
                  <p className="font-bold text-white text-sm">{tech.full_name}</p>
                  <p className="text-[9px] font-semibold mt-0.5" style={{ color: T.gold }}>{tech.email}</p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl text-center text-[10px] font-semibold" style={{ background: 'rgba(255,255,255,0.01)', border: `1px dashed ${T.border}`, color: T.muted }}>No technician assigned</div>
            )}
          </section>

          {/* status info */}
          <section>
            <p className="text-[8px] font-black uppercase tracking-[0.3em] mb-2.5" style={{ color: T.muted }}>Job Details</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Status',   val: app?.status || 'N/A' },
                { label: 'Payment',  val: app?.payment_method || 'N/A' },
                { label: 'Date',     val: app?.schedule_date ? format(new Date(app.schedule_date), 'MMM d, yyyy') : 'N/A' },
                { label: 'Priority', val: app?.priority || 'Normal' },
              ].map(({ label, val }) => (
                <div key={label} className="p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}` }}>
                  <p className="text-[8px] font-bold uppercase tracking-wider mb-0.5" style={{ color: T.muted }}>{label}</p>
                  <p className="text-[11px] font-bold" style={{ color: T.text2 }}>{val}</p>
                </div>
              ))}
            </div>
          </section>

          {/* notes */}
          {app?.details && (
            <section>
              <p className="text-[8px] font-black uppercase tracking-[0.3em] mb-2.5" style={{ color: T.muted }}>Notes</p>
              <div className="p-3 rounded-xl text-[11px] italic leading-relaxed" style={{ background: 'rgba(255,255,255,0.015)', border: `1px solid ${T.border}`, color: T.text2 }}>
                {app.details}
              </div>
            </section>
          )}

          {/* attachment */}
          {app?.receipt_image && (
            <section>
              <p className="text-[8px] font-black uppercase tracking-[0.3em] mb-2.5" style={{ color: T.muted }}>Attachments</p>
              <a href={app.receipt_image} target="_blank" rel="noreferrer"
                className="flex items-center gap-2.5 p-3 rounded-xl transition-all hover:brightness-110"
                style={{ background: 'rgba(255,193,7,0.08)', border: `1px solid ${T.border}` }}>
                <ImageIcon size={13} style={{ color: T.gold }} />
                <span className="text-[10px] font-bold" style={{ color: T.gold }}>View Attachment</span>
                <ArrowRight size={11} className="ml-auto" style={{ color: T.gold }} />
              </a>
            </section>
          )}
        </div>

        {/* footer — fixed */}
        <div className="p-5 flex gap-2.5" style={{ borderTop: `1px solid ${T.border}` }}>
          <button className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-[#0B1F3A] transition-all hover:brightness-110" style={{ background: `linear-gradient(135deg, ${T.yellow}, ${T.gold})`, boxShadow: `0 4px 18px ${T.glow}` }}>
            Edit Job
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all hover:text-white" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}`, color: T.muted }}>
            Close
          </button>
        </div>
      </div>
    </>
  );
};

/* ─────────────────────────────────────────────────────────────
   ASSIGN TECHNICIAN DRAWER — availability score derived from real data
───────────────────────────────────────────────────────────── */
const AssignDrawer = ({ date, techs, appointments, onAssign, onClose }) => {
  const [sel, setSel] = useState(null);
  const dayApps = appointments.filter(a => isSameDay(new Date(a.schedule_date), date));
  const busyIds = new Set(dayApps.map(a => a.technician_id));

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" style={{ animation: 'fdIn .2s ease' }} onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-[110] w-full max-w-sm flex flex-col" style={{ background: T.navyDeep, borderLeft: `1px solid ${T.border}`, animation: 'slIn .28s cubic-bezier(.16,1,.3,1)', boxShadow: '-40px 0 80px rgba(0,0,0,0.6)' }}>
        <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${T.yellow}, transparent)` }} />
        <div className="p-6" style={{ background: `linear-gradient(160deg, ${T.card}, ${T.navyDeep})`, borderBottom: `1px solid ${T.border}` }}>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-black text-white">Assign Technician</h2>
              <p className="text-[9px] font-semibold mt-1" style={{ color: T.gold }}>{format(date, 'EEEE, MMMM d, yyyy')}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 transition-all" style={{ color: T.muted }}><X size={16} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-2 noscroll">
          {techs.map(tech => {
            const busy       = busyIds.has(tech.id);
            const isSel      = sel === tech.id;
            const totalJobs  = appointments.filter(a => a.technician_id === tech.id).length;
            const doneJobs   = appointments.filter(a => a.technician_id === tech.id && a.status?.toLowerCase() === 'completed').length;
            const completion = totalJobs ? Math.round((doneJobs / totalJobs) * 100) : 0;
            const todaysJobs = appointments.filter(a => a.technician_id === tech.id && isSameDay(new Date(a.schedule_date), new Date())).length;
            /* simple, honest availability score derived from real load + completion, no invented metrics */
            const availScore = busy ? 0 : Math.max(10, 100 - todaysJobs * 25);

            return (
              <button key={tech.id} onClick={() => !busy && setSel(tech.id)} disabled={busy}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-150 ${busy ? 'opacity-40 cursor-not-allowed' : 'hover:scale-[1.01]'}`}
                style={{
                  background: isSel ? 'rgba(255,193,7,0.08)' : 'rgba(255,255,255,0.015)',
                  border: isSel ? `1px solid ${T.borderHi}` : `1px solid ${T.border}`,
                  boxShadow: isSel ? `0 0 16px ${T.glow}` : 'none',
                }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-[#0B1F3A] text-sm shrink-0" style={{ background: `linear-gradient(135deg, ${T.yellow}, ${T.gold})` }}>
                    {tech.full_name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-white truncate">{tech.full_name}</p>
                    <p className="text-[8px] font-semibold mt-0.5" style={{ color: busy ? '#FF5A5A' : '#3DDC84' }}>
                      {busy ? '● Engaged today' : '● Available'} · {todaysJobs} today · {totalJobs} total
                    </p>
                    {!busy && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="flex-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <div className="h-full rounded-full" style={{ width: `${availScore}%`, background: `linear-gradient(90deg, ${T.yellow}, ${T.gold})` }} />
                        </div>
                        <span className="text-[8px] font-bold" style={{ color: T.gold }}>{availScore}%</span>
                      </div>
                    )}
                  </div>
                  <div className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center transition-all shrink-0`} style={{ width: 18, height: 18, borderColor: isSel ? T.yellow : 'rgba(255,255,255,0.15)', background: isSel ? T.yellow : 'transparent' }}>
                    {isSel && <div className="w-2 h-2 rounded-full" style={{ background: '#0B1F3A' }} />}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 mt-2.5">
                  <div className="px-2 py-1 rounded-lg text-center" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <p className="text-[9px] font-black" style={{ color: T.text2 }}>{completion}%</p>
                    <p className="text-[6.5px] font-bold uppercase tracking-wider" style={{ color: T.muted }}>Completion</p>
                  </div>
                  <div className="px-2 py-1 rounded-lg text-center" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <p className="text-[9px] font-black" style={{ color: T.text2 }}>{todaysJobs}</p>
                    <p className="text-[6.5px] font-bold uppercase tracking-wider" style={{ color: T.muted }}>Today's Jobs</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <div className="p-5" style={{ borderTop: `1px solid ${T.border}` }}>
          <button onClick={() => sel && onAssign(sel)} disabled={!sel}
            className="w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110"
            style={{ background: sel ? `linear-gradient(135deg, ${T.yellow}, ${T.gold})` : 'rgba(255,255,255,0.04)', color: sel ? '#0B1F3A' : T.muted, boxShadow: sel ? `0 4px 18px ${T.glow}` : 'none' }}>
            Deploy Technician
          </button>
        </div>
      </div>
    </>
  );
};

/* ─────────────────────────────────────────────────────────────
   TECHNICIAN CARD (registry) — premium profile card
───────────────────────────────────────────────────────────── */
const TechCard = ({ tech, appointments, index = 0 }) => {
  const total     = appointments.filter(a => a.technician_id === tech.id).length;
  const completed = appointments.filter(a => a.technician_id === tech.id && a.status?.toLowerCase() === 'completed').length;
  const active    = appointments.filter(a => a.technician_id === tech.id && ['active', 'scheduled'].includes(a.status?.toLowerCase()) && isSameDay(new Date(a.schedule_date), new Date())).length;
  const pending   = appointments.filter(a => a.technician_id === tech.id && a.status?.toLowerCase() === 'pending').length;
  const today     = appointments.filter(a => a.technician_id === tech.id && isSameDay(new Date(a.schedule_date), new Date())).length;
  const currentJob = appointments.find(a => a.technician_id === tech.id && ['active', 'scheduled'].includes(a.status?.toLowerCase()) && isSameDay(new Date(a.schedule_date), new Date()));
  const rate      = total > 0 ? Math.round((completed / total) * 100) : 0;
  const statusKey = active > 0 ? 'onsite' : 'available';
  const tCfg      = getTech(statusKey);

  return (
    <Glass hoverGlow className="p-5 rise" style={{ animationDelay: `${index * 40}ms`, animation: `riseIn .4s cubic-bezier(.16,1,.3,1) both, floaty 6s ease-in-out ${index * 0.3}s infinite` }}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full" style={{ background: `${tCfg.color}14`, border: `1px solid ${tCfg.color}30` }}>
          <Dot color={tCfg.color} pulse={statusKey === 'onsite'} size={5} />
          <span className="text-[8px] font-black uppercase tracking-wider" style={{ color: tCfg.color }}>{tCfg.label}</span>
        </div>
        <button className="p-1.5 rounded-lg hover:bg-white/5 transition-all" style={{ color: T.muted }}><MoreHorizontal size={13} /></button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative w-12 h-12 rounded-2xl flex items-center justify-center font-black text-[#0B1F3A] text-lg shrink-0" style={{ background: `linear-gradient(135deg, ${T.yellow}, ${T.gold})`, boxShadow: `0 6px 20px ${T.glow}` }}>
          {tech.full_name?.charAt(0)}
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2" style={{ background: tCfg.color, borderColor: T.card }} />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-black text-sm text-white tracking-tight truncate">{tech.full_name}</h4>
          <p className="text-[8px] font-semibold truncate mt-0.5" style={{ color: T.muted }}>{tech.email}</p>
        </div>
      </div>

      {/* current job */}
      <div className="mb-3 p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}` }}>
        <p className="text-[7px] font-bold uppercase tracking-wider mb-1" style={{ color: T.muted }}>Current Job</p>
        <p className="text-[10px] font-bold truncate" style={{ color: currentJob ? T.gold : T.muted }}>
          {currentJob ? currentJob.service_type : 'No active job'}
        </p>
      </div>

      {/* stats grid */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: 'Today', val: today },
          { label: 'Done', val: completed },
          { label: 'Pending', val: pending },
        ].map(({ label, val }) => (
          <div key={label} className="p-2 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}` }}>
            <p className="text-sm font-black" style={{ color: T.gold }}>{val}</p>
            <p className="text-[7px] font-bold uppercase tracking-wider mt-0.5" style={{ color: T.muted }}>{label}</p>
          </div>
        ))}
      </div>

      {/* completion bar + total */}
      <div className="mb-4">
        <div className="flex justify-between text-[8px] font-bold mb-1" style={{ color: T.muted }}>
          <span>Completion Rate · {total} total jobs</span><span style={{ color: T.gold }}>{rate}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="h-full rounded-full transition-all duration-700 origin-left" style={{ width: `${rate}%`, background: `linear-gradient(90deg, ${T.yellow}, ${T.gold})`, boxShadow: `0 0 8px ${T.glow}`, animation: 'sweepBar .8s cubic-bezier(.16,1,.3,1) both' }} />
        </div>
      </div>

      <button className="w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all hover:text-white hover:brightness-110"
        style={{ background: 'rgba(255,193,7,0.06)', border: `1px solid ${T.border}`, color: T.text2 }}>
        View Full Log
      </button>
    </Glass>
  );
};

/* ─────────────────────────────────────────────────────────────
   REGISTRY SKELETON (loading)
───────────────────────────────────────────────────────────── */
const RegistrySkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
    {Array.from({ length: 6 }).map((_, i) => (
      <Glass key={i} className="p-5 h-[260px] overflow-hidden relative">
        <div className="yshimmer absolute inset-0 rounded-2xl" />
      </Glass>
    ))}
  </div>
);

/* ─────────────────────────────────────────────────────────────
   FAB MENU
───────────────────────────────────────────────────────────── */
const FABMenu = ({ onNewAppt, onAssign }) => {
  const [open, setOpen] = useState(false);
  const actions = [
    { label: 'New Appointment', icon: Plus,      action: onNewAppt },
    { label: 'Assign Tech',     icon: UserCheck, action: onAssign },
    { label: 'View Logs',       icon: BookOpen,  action: () => {} },
    { label: 'Settings',        icon: Settings,  action: () => {} },
  ];
  return (
    <div className="fixed bottom-7 right-7 z-50 flex flex-col-reverse items-end gap-2">
      {open && actions.map((a, i) => {
        const Icon = a.icon;
        return (
          <div key={i} className="flex items-center gap-2" style={{ animation: `fabIn .15s ease ${i * 0.04}s both` }}>
            <span className="text-[10px] font-bold text-white px-2 py-1 rounded-lg" style={{ background: T.navyDeep, border: `1px solid ${T.border}` }}>
              {a.label}
            </span>
            <button onClick={() => { a.action(); setOpen(false); }}
              className="w-9 h-9 rounded-2xl flex items-center justify-center text-[#0B1F3A] transition-all hover:scale-110"
              style={{ background: `linear-gradient(135deg, ${T.yellow}, ${T.gold})`, boxShadow: `0 4px 14px ${T.glow}` }}>
              <Icon size={15} />
            </button>
          </div>
        );
      })}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-12 h-12 rounded-2xl flex items-center justify-center text-[#0B1F3A] shadow-2xl transition-all hover:scale-105"
        style={{ background: `linear-gradient(135deg, ${T.yellow}, ${T.gold})`, boxShadow: `0 8px 28px ${T.glow}`, transform: open ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform .25s cubic-bezier(.16,1,.3,1)' }}>
        <Plus size={20} />
      </button>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   LOADING SCREEN
───────────────────────────────────────────────────────────── */
const LoadingScreen = () => (
  <div className="h-[calc(100vh-140px)] flex flex-col overflow-hidden" style={{ fontFamily: "'DM Sans','Syne',system-ui,sans-serif" }}>
    <div className="flex items-center justify-between mb-4 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl yshimmer" />
        <div>
          <div className="w-40 h-4 rounded yshimmer mb-1.5" />
          <div className="w-28 h-2.5 rounded yshimmer" />
        </div>
      </div>
    </div>
    <div className="grid grid-cols-5 gap-3 mb-4 shrink-0">
      {Array.from({ length: 5 }).map((_, i) => (
        <Glass key={i} className="p-4 h-[104px] overflow-hidden relative"><div className="yshimmer absolute inset-0" /></Glass>
      ))}
    </div>
    <div className="flex-1 flex gap-3 min-h-0">
      <Glass className="flex-1 overflow-hidden relative"><div className="yshimmer absolute inset-0" /></Glass>
      <div className="w-60 flex flex-col gap-3 shrink-0">
        <Glass className="flex-1 overflow-hidden relative"><div className="yshimmer absolute inset-0" /></Glass>
        <Glass className="h-40 overflow-hidden relative shrink-0"><div className="yshimmer absolute inset-0" /></Glass>
      </div>
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */
const TechnicianManagement = ({ isDark }) => {
  const [techs,        setTechs]        = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [curMonth,     setCurMonth]     = useState(new Date());
  const [viewMode,     setViewMode]     = useState('calendar');
  const [calView,      setCalView]      = useState('month');
  const [selDate,      setSelDate]      = useState(null);
  const [openApp,      setOpenApp]      = useState(null);
  const [assignDate,   setAssignDate]   = useState(null);

  /* ── DATA / LOGIC — UNCHANGED FROM ORIGINAL ── */
  const load = useCallback(async () => {
    try {
      const [{ data: p }, { data: a }] = await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'worker'),
        supabase.from('appointments').select('*'),
      ]);
      if (p) setTechs(p);
      if (a) setAppointments(a);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase.channel('appts-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, load)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [load]);

  const assignTech = async (techId) => {
    const { error } = await supabase.from('appointments').insert([{
      schedule_date: format(assignDate, 'yyyy-MM-dd'),
      technician_id: techId,
      status: 'scheduled',
      service_type: 'Manual Deployment',
      full_name: 'Admin Entry',
    }]);
    setAssignDate(null);
    if (!error) {
      load();
      Swal.fire({ title: 'Deployed', text: 'Technician assigned.', icon: 'success', background: T.navyDeep, color: '#fff', confirmButtonColor: T.yellow });
    } else Swal.fire('Error', error.message, 'error');
  };

  const calDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(curMonth)),
    end: endOfWeek(endOfMonth(curMonth)),
  });

  const filteredTechs = techs.filter(t => t.full_name?.toLowerCase().includes(search.toLowerCase()));

  const filterAppts = useCallback((day) => {
    const base = appointments.filter(a => isSameDay(new Date(a.schedule_date), day));
    if (!search) return base;
    return base.filter(a =>
      a.service_type?.toLowerCase().includes(search.toLowerCase()) ||
      a.full_name?.toLowerCase().includes(search.toLowerCase())
    );
  }, [appointments, search]);

  const activeCount  = appointments.filter(a => ['active', 'scheduled'].includes(a.status?.toLowerCase())).length;
  const pendingCount = appointments.filter(a => a.status?.toLowerCase() === 'pending').length;
  /* ── END UNCHANGED LOGIC ── */

  if (loading) return (<><GlobalStyle /><LoadingScreen /></>);

  return (
    <>
      <GlobalStyle />

      <div className="h-[calc(100vh-140px)] flex flex-col overflow-hidden" style={{ fontFamily: "'DM Sans','Syne',system-ui,sans-serif", background: `radial-gradient(1200px 500px at 10% -10%, rgba(255,193,7,0.05), transparent), ${T.navy}` }}>

        {/* ── SLIM TOP BAR — minimal, persists across views ── */}
        <div className="flex items-center justify-between gap-2 mb-3 shrink-0 rise">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${T.yellow}, ${T.gold})`, boxShadow: `0 0 14px ${T.glow}` }}>
              <Compass size={13} className="text-[#0B1F3A]" strokeWidth={2.4} />
            </div>
            <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest" style={{ color: '#3DDC84' }}>
              <Dot color="#3DDC84" pulse size={5} /> Live
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}` }}>
              {[{ k: 'calendar', Icon: LayoutGrid, l: 'Calendar' }, { k: 'registry', Icon: Users, l: 'Registry' }].map(({ k, Icon, l }) => (
                <button key={k} onClick={() => setViewMode(k)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[9px] font-black uppercase tracking-wider transition-all"
                  style={{
                    background: viewMode === k ? `linear-gradient(135deg, ${T.yellow}, ${T.gold})` : 'transparent',
                    color: viewMode === k ? '#0B1F3A' : T.muted,
                  }}>
                  <Icon size={11} />{l}
                </button>
              ))}
            </div>
            <button onClick={load} className="p-1.5 rounded-lg hover:rotate-180 duration-500 transition-all" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}`, color: T.muted }}>
              <RefreshCw size={12} />
            </button>
            <button onClick={() => setAssignDate(selDate || new Date())}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider text-[#0B1F3A] transition-all hover:brightness-110"
              style={{ background: `linear-gradient(135deg, ${T.yellow}, ${T.gold})`, boxShadow: `0 4px 14px ${T.glow}` }}>
              <UserCheck size={12} /> Assign
            </button>
          </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        {viewMode === 'calendar' ? (
          <div className="flex-1 flex gap-3 min-h-0 overflow-hidden">

            {/* ── CALENDAR PANEL ── */}
            <Glass className="flex-1 flex flex-col overflow-hidden p-4 min-w-0 min-h-0 rise">

              {/* toolbar — calendar-specific controls */}
              <div className="flex items-center gap-2 mb-4 shrink-0 flex-wrap">
                <button
                  onClick={() => setCurMonth(new Date())}
                  className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all hover:brightness-110"
                  style={{ background: 'rgba(255,193,7,0.14)', border: `1px solid ${T.border}`, color: T.gold }}>
                  Today
                </button>
                <div className="flex gap-0.5">
                  <button onClick={() => setCurMonth(subMonths(curMonth, 1))} className="p-1.5 rounded-lg hover:bg-white/5 transition-all" style={{ color: T.muted }}><ChevronLeft size={13} /></button>
                  <button onClick={() => setCurMonth(addMonths(curMonth, 1))} className="p-1.5 rounded-lg hover:bg-white/5 transition-all" style={{ color: T.muted }}><ChevronRight size={13} /></button>
                </div>
                <h3 className="text-sm font-black text-white">{format(curMonth, 'MMMM yyyy')}</h3>

                <div className="flex-1" />

                {/* search */}
                <div className="relative">
                  <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: T.muted }} />
                  <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search jobs…"
                    className="yfocus pl-7 pr-3 py-1.5 text-[10px] font-medium text-white outline-none rounded-lg transition-all"
                    style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}`, width: 140 }}
                  />
                </div>

                {/* cal view */}
                <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}` }}>
                  {[{ k: 'month', l: 'Month' }, { k: 'agenda', l: 'Agenda' }].map(({ k, l }) => (
                    <button key={k} onClick={() => setCalView(k)}
                      className="px-3 py-1.5 rounded text-[9px] font-black uppercase tracking-wider transition-all"
                      style={{ background: calView === k ? 'rgba(255,193,7,0.14)' : 'transparent', color: calView === k ? T.gold : T.muted }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {calView === 'month' ? (
                <>
                  <div className="grid grid-cols-7 mb-2 shrink-0">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                      <div key={d} className="text-center text-[9px] font-black uppercase tracking-widest py-1.5" style={{ color: T.muted }}>{d}</div>
                    ))}
                  </div>

                  <div className="flex-1 min-h-0 grid grid-cols-7 gap-2 overflow-y-auto noscroll pr-1" style={{ gridTemplateRows: `repeat(${Math.ceil(calDays.length / 7)}, minmax(112px, 1fr))` }}>
                    {calDays.map((day, i) => (
                      <DayCell
                        key={i}
                        index={i}
                        day={day}
                        appts={filterAppts(day)}
                        techs={techs}
                        inMonth={format(day, 'MM') === format(curMonth, 'MM')}
                        selectedDate={selDate}
                        onDayClick={(d) => { setSelDate(d); setAssignDate(d); }}
                        onAppClick={setOpenApp}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <AgendaView appointments={appointments} techs={techs} onOpen={setOpenApp} />
              )}
            </Glass>
          </div>
        ) : (
          /* ── REGISTRY ── */
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="relative mb-4 shrink-0">
              <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: T.muted }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search technicians…"
                className="yfocus w-full pl-10 pr-4 py-2.5 text-[11px] font-medium text-white outline-none rounded-xl transition-all"
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}` }} />
            </div>
            <div className="flex-1 overflow-y-auto noscroll">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pb-6">
                {filteredTechs.map((tech, i) => (
                  <TechCard key={tech.id} tech={tech} appointments={appointments} index={i} />
                ))}
                {filteredTechs.length === 0 && (
                  <div className="col-span-3 flex flex-col items-center justify-center py-16">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'rgba(255,193,7,0.06)', border: `1px solid ${T.border}` }}>
                      <Users size={22} style={{ color: T.muted }} />
                    </div>
                    <p className="text-sm font-bold" style={{ color: T.text2 }}>No technicians found</p>
                    <p className="text-[10px] mt-1" style={{ color: T.muted }}>Try a different search term</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── STATUS BAR ── */}
        {viewMode === 'calendar' && <StatusBar appointments={appointments} techs={techs} />}

        {/* ── DRAWERS ── */}
        {openApp && <DetailDrawer app={openApp} techs={techs} onClose={() => setOpenApp(null)} />}
        {assignDate && !openApp && (
          <AssignDrawer date={assignDate} techs={techs} appointments={appointments} onAssign={assignTech} onClose={() => setAssignDate(null)} />
        )}

        {/* ── FAB ── */}
        <FABMenu onNewAppt={() => setAssignDate(selDate || new Date())} onAssign={() => setAssignDate(selDate || new Date())} />
      </div>
    </>
  );
};

export default TechnicianManagement;
