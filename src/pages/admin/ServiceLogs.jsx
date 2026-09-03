import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import {
  Search, Download, Trash2, Eye, Filter,
  CheckCircle2, Clock, XCircle, Calendar,
  Activity, ClipboardList, Loader2, AlertCircle,
  X, RefreshCw, Wrench, MapPin, Hash, User,
  Zap, ArrowUpDown, TrendingUp, BarChart2,
  ChevronRight, Inbox, Star, CreditCard,
  Bell, Edit3
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell, CartesianGrid,
  PieChart, Pie
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';

/* ── design tokens ── */
const INK  = '#06171A';
const INK2 = '#030E10';
const INK3 = '#0C2B30';
const GOLD = '#E8B000';
const S    = '#8CA8AD';
const SURFACE = 'rgba(12,43,48,0.6)';
const SURFACE2 = 'rgba(6,23,26,0.8)';

const STATUS_CFG = {
  completed:   { color: '#10B981', bg: 'rgba(16,185,129,0.10)',  label: 'Completed'   },
  pending:     { color: '#F59E0B', bg: 'rgba(245,158,11,0.10)',  label: 'Pending'     },
  scheduled:   { color: '#3B82F6', bg: 'rgba(59,130,246,0.10)',  label: 'Scheduled'   },
  approved:    { color: '#6366F1', bg: 'rgba(99,102,241,0.10)',  label: 'Approved'    },
  cancelled:   { color: '#EF4444', bg: 'rgba(239,68,68,0.10)',   label: 'Cancelled'   },
  in_progress: { color: '#F97316', bg: 'rgba(249,115,22,0.10)',  label: 'In Progress' },
};

const statusCfg = (s) => STATUS_CFG[s?.toLowerCase()] || STATUS_CFG.pending;

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60)    return `${Math.floor(diff)}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function fmtDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ── design system tokens: radius + motion ── */
const RADIUS = { sm: 6, md: 8, lg: 10, pill: 20 };
const EASE = [0.16, 1, 0.3, 1];

/* ── debounce hook (keeps search feeling instant while avoiding thrash) ── */
function useDebouncedValue(value, delay = 180) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ── AnimatedCounter: smooth count-up using requestAnimationFrame ── */
const AnimatedCounter = ({ value = 0, duration = 0.8 }) => {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    let raf;
    const start = performance.now();
    const from = prevRef.current;
    const to = Number(value) || 0;
    const step = (now) => {
      const t = Math.min((now - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const current = Math.round(from + (to - from) * eased);
      setDisplay(current);
      if (t < 1) raf = requestAnimationFrame(step);
      else prevRef.current = to;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <span>{display.toLocaleString()}</span>;
};

/* ── Trend badge: period-over-period % change, computed only from real records ── */
const TrendBadge = ({ current, previous }) => {
  if (previous === null || previous === undefined) return null;
  if (previous === 0 && current === 0) return null;
  const pct = previous === 0 ? 100 : Math.round(((current - previous) / previous) * 100);
  const up = pct >= 0;
  const color = up ? '#10B981' : '#EF4444';
  return (
    <motion.div
      initial={{ opacity: 0, x: -3 }}
      animate={{ opacity: 1, x: 0 }}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 800, color }}
    >
      <span style={{ display: 'inline-block', transform: up ? 'none' : 'rotate(180deg)', transition: 'transform 0.2s' }}>▲</span>
      {Math.abs(pct)}%
    </motion.div>
  );
};

/* ── Sparkline mini chart ── */
const Sparkline = ({ data = [], color }) => {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const w = 60, h = 24;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (v / max) * h;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`spk-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${h} ${pts} ${w},${h}`}
        fill={`url(#spk-${color.replace('#','')})`}
      />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/* ── Status Badge ── */
const SBadge = ({ status }) => {
  const cfg = statusCfg(status);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px',
      background: cfg.bg,
      color: cfg.color, fontSize: 9, fontWeight: 800,
      letterSpacing: '0.28em', textTransform: 'uppercase',
      borderRadius: 2,
    }}>
      <span style={{ width: 4, height: 4, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
};

/* ── KPI Card ── */
const KpiCard = ({ label, value, icon, color, loading, spark, trend }) => (
  <motion.div
    tabIndex={0}
    role="group"
    aria-label={`${label}: ${loading ? 'loading' : value}`}
    whileHover={{ y: -3, boxShadow: `0 12px 40px rgba(0,0,0,0.35), 0 0 0 1px ${color}40` }}
    transition={{ duration: 0.2, ease: EASE }}
    className="sl-kpi-card"
    style={{
      background: SURFACE,
      backdropFilter: 'blur(12px)',
      borderRadius: RADIUS.md,
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
      outline: 'none',
    }}
  >
    {/* top accent line */}
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}60, transparent)` }} />
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
      <div style={{ width: 36, height: 36, borderRadius: RADIUS.md, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
        {icon}
      </div>
      <Sparkline data={spark} color={color} />
    </div>
    {loading
      ? <div className="sl-shimmer" style={{ height: 32, width: '55%', borderRadius: 4, marginBottom: 6 }} />
      : <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 34, letterSpacing: '0.04em', color: '#F2F7F8', lineHeight: 1 }}
        ><AnimatedCounter value={value} /></motion.div>
    }
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: S }}>{label}</div>
      {!loading && trend && <TrendBadge current={trend.current} previous={trend.previous} />}
    </div>
  </motion.div>
);

/* ── Date Range Selector ── */
const DATE_RANGES = [
  { label: 'Today',       value: 'today' },
  { label: 'Yesterday',   value: 'yesterday' },
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days',value: '30d' },
  { label: 'This Month',  value: 'month' },
  { label: 'All Time',    value: 'all' },
];

/* ── Donut chart label ── */
const RADIAN = Math.PI / 180;
const DonutLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
  if (percent < 0.05) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#F2F7F8" textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

/* ── Custom Tooltip ── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: INK2, border: '1px solid rgba(232,176,0,0.2)', borderRadius: 6, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase', color: S, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 14, fontWeight: 700, color: p.color || GOLD }}>
          {p.value} <span style={{ fontSize: 10, color: S, fontWeight: 500 }}>appointments</span>
        </div>
      ))}
    </div>
  );
};

/* ── Detail Drawer ── */
const DetailDrawer = ({ log, onClose, onEdit }) => {
  useEffect(() => {
    if (!log) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [log, onClose]);

  if (!log) return null;
  const cfg = statusCfg(log.status);
  const STAGES = ['pending','approved','scheduled','in_progress','completed'];
  const stageIdx = STAGES.indexOf(log.status?.toLowerCase());

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(3,14,16,0.75)', backdropFilter: 'blur(8px)', zIndex: 9998 }}
        onClick={onClose}
      />
      <motion.div
        key="drawer"
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 34 }}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 440,
          background: `linear-gradient(180deg, ${INK3} 0%, ${INK2} 100%)`,
          borderLeft: '1px solid rgba(232,176,0,0.12)',
          zIndex: 9999, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '-24px 0 80px rgba(0,0,0,0.7)',
        }}
      >
        {/* header */}
        <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.35em', textTransform: 'uppercase', color: S, marginBottom: 6 }}>Appointment Detail</div>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, letterSpacing: '0.05em', color: '#F2F7F8', lineHeight: 1 }}>
              {log.service_type}
            </div>
            <div style={{ fontSize: 10, color: S, fontFamily: 'monospace', marginTop: 4 }}>
              #{log.id?.slice(0, 14).toUpperCase()}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close appointment detail"
            autoFocus
            className="sl-focus-ring"
            style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: S, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(232,176,0,0.1)'; e.currentTarget.style.color = GOLD; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = S; }}
          >
            <X size={14} />
          </button>
        </div>

        {/* status pill */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
          <SBadge status={log.status} />
        </div>

        {/* scrollable body */}
        <div className="sl-scroll" style={{ overflowY: 'auto', flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { icon: <User size={13} />,     label: 'Client',         val: log.full_name      },
              { icon: <Calendar size={13} />, label: 'Schedule',       val: fmtDate(log.schedule_date) },
              { icon: <MapPin size={13} />,   label: 'Address',        val: log.address        },
              { icon: <CreditCard size={13} />,label: 'Payment',       val: log.payment_method },
            ].filter(r => r.val && r.val !== '—').map((row, i) => (
              <div key={i} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, color: GOLD, opacity: 0.7 }}>{row.icon}</div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: S, marginBottom: 4 }}>{row.label}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#F2F7F8', lineHeight: 1.4 }}>{row.val}</div>
              </div>
            ))}
          </div>

          {/* details */}
          {log.details && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.35em', textTransform: 'uppercase', color: S, marginBottom: 10 }}>Notes</div>
              <div style={{ fontSize: 12, color: '#C0D4D8', lineHeight: 1.7, padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 6, borderLeft: `2px solid ${GOLD}40` }}>
                {log.details}
              </div>
            </div>
          )}

          {/* receipt */}
          {log.receipt_image && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.35em', textTransform: 'uppercase', color: S, marginBottom: 10 }}>Receipt</div>
              <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(232,176,0,0.15)' }}>
                <img src={log.receipt_image} alt="Receipt" style={{ width: '100%', display: 'block', objectFit: 'cover', maxHeight: 220 }} />
              </div>
            </div>
          )}

          {/* status timeline */}
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.35em', textTransform: 'uppercase', color: S, marginBottom: 14 }}>Status Timeline</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {['Pending','Approved','Scheduled','In Progress','Completed'].map((stage, i) => {
                const done   = i <= stageIdx;
                const active = i === stageIdx;
                const col    = done ? (active ? cfg.color : '#10B981') : 'rgba(140,168,173,0.2)';
                return (
                  <div key={stage} style={{ display: 'flex', gap: 14, position: 'relative', paddingBottom: i < 4 ? 16 : 0, alignItems: 'flex-start' }}>
                    {i < 4 && <div style={{ position: 'absolute', left: 10, top: 22, width: 1.5, height: 'calc(100% - 10px)', background: done && i < stageIdx ? '#10B981' : 'rgba(140,168,173,0.1)' }} />}
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: done ? `${col}18` : 'transparent', border: `1.5px solid ${col}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: active ? `0 0 10px ${col}50` : 'none', marginTop: 1 }}>
                      {done && i < stageIdx
                        ? <CheckCircle2 size={10} style={{ color: '#10B981' }} />
                        : active
                        ? <div style={{ width: 7, height: 7, borderRadius: '50%', background: col }} />
                        : null}
                    </div>
                    <div style={{ paddingTop: 2 }}>
                      <div style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: done ? (active ? col : '#10B981') : 'rgba(140,168,173,0.35)' }}>{stage}</div>
                      {active && <div style={{ fontSize: 9, color: S, marginTop: 1 }}>Current stage</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* sticky footer */}
        {onEdit && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, background: 'rgba(3,14,16,0.6)' }}>
            <button
              onClick={() => { onEdit(log); onClose(); }}
              style={{ width: '100%', padding: '12px', background: GOLD, border: 'none', color: INK2, fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 6, transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F2F7F8'; }}
              onMouseLeave={e => { e.currentTarget.style.background = GOLD; }}
            >
              <Edit3 size={13} /> Edit Appointment
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
const ServiceLogs = ({ onEdit }) => {
  const [logs,         setLogs]         = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [searchTerm,   setSearchTerm]   = useState('');
  const [searchInput,  setSearchInputRaw] = useState('');
  const setSearchInput = (v) => { setSearchInputRaw(v); setIsFiltering(true); };
  const [isFiltering,  setIsFiltering]  = useState(false);
  const debouncedSearch = useDebouncedValue(searchInput, 180);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField,    setSortField]    = useState('created_at');
  const [sortAsc,      setSortAsc]      = useState(false);
  const [drawerLog,    setDrawerLog]    = useState(null);
  const [selected,     setSelected]     = useState(new Set());
  const [chartData,    setChartData]    = useState([]);
  const [statusDist,   setStatusDist]   = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [lastSync,     setLastSync]     = useState(null);
  const [connected,    setConnected]    = useState(false);
  const [dateRange,    setDateRange]    = useState('all');
  const [showActivity, setShowActivity] = useState(false);

  /* ── data ── */
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setLogs(data);
      setLastSync(new Date());

      const byDay = data.reduce((acc, r) => {
        const d = new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        acc[d] = (acc[d] || 0) + 1;
        return acc;
      }, {});
      setChartData(Object.entries(byDay).slice(-14).map(([name, count]) => ({ name, count })));

      const byStatus = data.reduce((acc, r) => {
        const s = r.status || 'pending';
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {});
      const colMap = { completed: '#10B981', pending: '#F59E0B', scheduled: '#3B82F6', approved: '#6366F1', cancelled: '#EF4444', in_progress: '#F97316' };
      setStatusDist(Object.entries(byStatus).map(([name, value]) => ({ name, value, color: colMap[name] || GOLD })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLogs();

    const ch = supabase.channel('sl-ops')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, (payload) => {
        fetchLogs();
        const ev = payload.eventType;
        const rec = payload.new || payload.old;
        setActivityFeed(prev => [{
          id: Date.now(),
          type: ev,
          name: rec?.full_name || 'Unknown',
          service: rec?.service_type || '',
          status: rec?.status || '',
          ts: new Date().toISOString(),
        }, ...prev].slice(0, 20));
      })
      .subscribe(status => setConnected(status === 'SUBSCRIBED'));

    return () => supabase.removeChannel(ch);
  }, [fetchLogs]);

  /* Cmd+K */
  useEffect(() => {
    const h = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); document.getElementById('sl-search')?.focus(); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  /* apply debounced search term, then clear the "filtering" pulse */
  useEffect(() => {
    setSearchTerm(debouncedSearch);
    setIsFiltering(false);
  }, [debouncedSearch]);

  /* ── date range filter ── */
  const filterByDateRange = useCallback((data) => {
    if (dateRange === 'all') return data;
    const now = new Date();
    const start = new Date();
    if (dateRange === 'today')     { start.setHours(0,0,0,0); }
    else if (dateRange === 'yesterday') { start.setDate(start.getDate()-1); start.setHours(0,0,0,0); const end = new Date(start); end.setHours(23,59,59,999); return data.filter(r => { const d = new Date(r.created_at); return d >= start && d <= end; }); }
    else if (dateRange === '7d')   { start.setDate(start.getDate()-7); }
    else if (dateRange === '30d')  { start.setDate(start.getDate()-30); }
    else if (dateRange === 'month') { start.setDate(1); start.setHours(0,0,0,0); }
    return data.filter(r => new Date(r.created_at) >= start);
  }, [dateRange]);

  /* previous equal-length period, for trend % — real records only, no synthetic data */
  const previousRangedLogs = (() => {
    if (dateRange === 'all') return null; // no prior period to compare against
    const now = new Date();
    let start, end;
    if (dateRange === 'today') {
      start = new Date(now); start.setDate(start.getDate() - 1); start.setHours(0,0,0,0);
      end = new Date(start); end.setHours(23,59,59,999);
    } else if (dateRange === 'yesterday') {
      start = new Date(now); start.setDate(start.getDate() - 2); start.setHours(0,0,0,0);
      end = new Date(start); end.setHours(23,59,59,999);
    } else if (dateRange === '7d') {
      start = new Date(now); start.setDate(start.getDate() - 14); start.setHours(0,0,0,0);
      end = new Date(now); end.setDate(end.getDate() - 7);
    } else if (dateRange === '30d') {
      start = new Date(now); start.setDate(start.getDate() - 60); start.setHours(0,0,0,0);
      end = new Date(now); end.setDate(end.getDate() - 30);
    } else if (dateRange === 'month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else return null;
    return logs.filter(r => { const d = new Date(r.created_at); return d >= start && d <= end; });
  })();

  /* ── derived ── */
  const rangedLogs = filterByDateRange(logs);

  const kpis = {
    total:     rangedLogs.length,
    completed: rangedLogs.filter(l => l.status === 'completed').length,
    pending:   rangedLogs.filter(l => l.status === 'pending').length,
    cancelled: rangedLogs.filter(l => l.status === 'cancelled').length,
    active:    rangedLogs.filter(l => ['scheduled','approved','in_progress'].includes(l.status)).length,
  };

  const prevKpis = previousRangedLogs ? {
    total:     previousRangedLogs.length,
    completed: previousRangedLogs.filter(l => l.status === 'completed').length,
    pending:   previousRangedLogs.filter(l => l.status === 'pending').length,
    cancelled: previousRangedLogs.filter(l => l.status === 'cancelled').length,
    active:    previousRangedLogs.filter(l => ['scheduled','approved','in_progress'].includes(l.status)).length,
  } : null;

  /* sparkline — last 7 buckets of count per day */
  const buildSpark = useCallback((filterFn) => {
    const days = {};
    rangedLogs.filter(filterFn).forEach(r => {
      const d = new Date(r.created_at).toLocaleDateString();
      days[d] = (days[d] || 0) + 1;
    });
    return Object.values(days).slice(-7);
  }, [rangedLogs]);

  const sparks = {
    total:     buildSpark(() => true),
    completed: buildSpark(l => l.status === 'completed'),
    pending:   buildSpark(l => l.status === 'pending'),
    cancelled: buildSpark(l => l.status === 'cancelled'),
    active:    buildSpark(l => ['scheduled','approved','in_progress'].includes(l.status)),
  };

  /* ranged chart data */
  const rangedChartData = (() => {
    const byDay = rangedLogs.reduce((acc, r) => {
      const d = new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      acc[d] = (acc[d] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(byDay).slice(-14).map(([name, count]) => ({ name, count }));
  })();

  /* ranged status dist */
  const rangedStatusDist = (() => {
    const byStatus = rangedLogs.reduce((acc, r) => {
      const s = r.status || 'pending';
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});
    const colMap = { completed: '#10B981', pending: '#F59E0B', scheduled: '#3B82F6', approved: '#6366F1', cancelled: '#EF4444', in_progress: '#F97316' };
    return Object.entries(byStatus).map(([name, value]) => ({ name, value, color: colMap[name] || GOLD }));
  })();

  /* top services */
  const topServices = (() => {
    const svc = {};
    rangedLogs.forEach(l => { if (l.service_type) svc[l.service_type] = (svc[l.service_type] || 0) + 1; });
    const total = rangedLogs.length || 1;
    return Object.entries(svc).sort((a,b) => b[1]-a[1]).slice(0,5).map(([name, count], i) => ({ name, count, pct: Math.round((count/total)*100), rank: i+1 }));
  })();

  const filtered = rangedLogs
    .filter(l => {
      const q = searchTerm.toLowerCase();
      const matchQ = !q || [l.full_name, l.service_type, l.address, l.status, l.id].some(v => v?.toLowerCase().includes(q));
      const matchS = statusFilter === 'all' || l.status === statusFilter;
      return matchQ && matchS;
    })
    .sort((a, b) => {
      const av = a[sortField] || '', bv = b[sortField] || '';
      return sortAsc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });

  /* ── handlers ── */
  const toggleSort = (f) => { if (sortField === f) setSortAsc(x => !x); else { setSortField(f); setSortAsc(true); } };
  const toggleSelect = (id) => { setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); };
  const toggleAll = () => { setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(l => l.id))); };

  const handleExport = () => {
    const rows = (selected.size ? filtered.filter(l => selected.has(l.id)) : filtered);
    if (!rows.length) return;
    const hdrs = ['ID','Full Name','Service','Status','Schedule','Address','Payment Method','Created'];
    const csv  = [hdrs.join(','), ...rows.map(r => [r.id, r.full_name, r.service_type, r.status, r.schedule_date, r.address, r.payment_method, r.created_at].map(v => `"${v||''}"`).join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download = `Operations_Log_${new Date().toISOString().split('T')[0]}.csv`; a.click();
  };

  const handleDelete = async (id) => {
    const res = await Swal.fire({
      title: 'Delete Record?', text: 'This action cannot be undone.',
      icon: 'error', showCancelButton: true,
      confirmButtonColor: '#EF4444', cancelButtonColor: INK3,
      background: INK2, color: '#F2F7F8', confirmButtonText: 'Delete',
    });
    if (!res.isConfirmed) return;
    await supabase.from('appointments').delete().eq('id', id);
    Swal.mixin({ toast:true, position:'top-end', showConfirmButton:false, timer:2000, background:INK2, color:'#F2F7F8' }).fire({ icon:'success', title:'Record deleted' });
    fetchLogs();
  };

  const handleBulkDelete = async () => {
    if (!selected.size) return;
    const res = await Swal.fire({
      title: `Delete ${selected.size} records?`, icon:'error', showCancelButton:true,
      confirmButtonColor:'#EF4444', cancelButtonColor:INK3,
      background:INK2, color:'#F2F7F8', confirmButtonText:'Delete All',
    });
    if (!res.isConfirmed) return;
    await supabase.from('appointments').delete().in('id', [...selected]);
    setSelected(new Set());
    fetchLogs();
  };

  const ColHead = ({ label, field }) => (
    <th style={{ padding: '12px 16px', textAlign: 'left', position: 'sticky', top: 0, background: 'rgba(3,14,16,0.95)', backdropFilter: 'blur(8px)', zIndex: 1 }}>
      <button onClick={() => toggleSort(field)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 800, letterSpacing: '0.35em', textTransform: 'uppercase', color: sortField === field ? GOLD : S, transition: 'color 0.15s', padding: 0 }}>
        {label} <ArrowUpDown size={10} style={{ opacity: sortField === field ? 1 : 0.35 }} />
      </button>
    </th>
  );

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const activityIcon = (type) => {
    if (type === 'INSERT') return { icon: <Calendar size={12} />, color: '#3B82F6', label: 'Created' };
    if (type === 'UPDATE') return { icon: <Edit3 size={12} />, color: '#6366F1', label: 'Updated' };
    if (type === 'DELETE') return { icon: <Trash2 size={12} />, color: '#EF4444', label: 'Deleted' };
    return { icon: <Zap size={12} />, color: GOLD, label: 'Event' };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      style={{ fontFamily: 'DM Sans, sans-serif', color: '#F2F7F8' }}
    >
      <style>{`
        @keyframes sl-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes sl-spin   { to { transform: rotate(360deg); } }
        @keyframes sl-shimmer { 0% { background-position: -200px 0; } 100% { background-position: 200px 0; } }
        .sl-row { transition: background 0.15s; cursor: pointer; }
        .sl-row:hover { background: rgba(232,176,0,0.035) !important; }
        .sl-row:focus-visible { outline: 2px solid ${GOLD}; outline-offset: -2px; background: rgba(232,176,0,0.05) !important; }
        .sl-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
        .sl-scroll::-webkit-scrollbar-track { background: transparent; }
        .sl-scroll::-webkit-scrollbar-thumb { background: rgba(232,176,0,0.15); border-radius: 2px; }
        .sl-pill-btn { transition: all 0.15s; }
        .sl-pill-btn:hover { opacity: 0.85; }
        .sl-shimmer {
          background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.11) 37%, rgba(255,255,255,0.05) 63%);
          background-size: 400px 100%;
          animation: sl-shimmer 1.4s ease-in-out infinite;
        }
        .sl-kpi-card:focus-visible { outline: 2px solid ${GOLD}; outline-offset: 2px; }
        .sl-focus-ring:focus-visible { outline: 2px solid ${GOLD}; outline-offset: 2px; border-radius: 4px; }
        button:focus-visible, [tabindex]:focus-visible { outline: 2px solid ${GOLD}; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) {
          .sl-shimmer, [style*="animation"] { animation-duration: 0.01ms !important; }
        }
      `}</style>

      <DetailDrawer log={drawerLog} onClose={() => setDrawerLog(null)} onEdit={onEdit} />

      {/* ══ SECTION 1: Header ══ */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 34, letterSpacing: '0.05em', color: '#F2F7F8', lineHeight: 1 }}>
                Operations Overview
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: connected ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${connected ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: connected ? '#10B981' : '#EF4444', animation: 'sl-pulse 2s infinite' }} />
                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase', color: connected ? '#10B981' : '#EF4444' }}>
                  {connected ? 'Live' : 'Offline'}
                </span>
              </div>
            </div>
            <div style={{ fontSize: 11, color: S, letterSpacing: '0.05em' }}>
              {dateStr}
              {lastSync && <span style={{ marginLeft: 12, opacity: 0.6 }}>· Synced {timeAgo(lastSync)}</span>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Activity bell */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowActivity(x => !x)}
                aria-label="Toggle recent activity panel"
                aria-expanded={showActivity}
                className="sl-focus-ring"
                style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: showActivity ? 'rgba(232,176,0,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${showActivity ? 'rgba(232,176,0,0.3)' : 'rgba(255,255,255,0.08)'}`, color: showActivity ? GOLD : S, cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}
              >
                <Bell size={14} />
                {activityFeed.length > 0 && <div style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: '50%', background: '#10B981', border: '1.5px solid ' + INK2 }} />}
              </button>

              <AnimatePresence>
                {showActivity && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.18 }}
                    style={{ position: 'absolute', top: 44, right: 0, width: 300, background: INK2, border: '1px solid rgba(232,176,0,0.15)', borderRadius: 10, boxShadow: '0 16px 48px rgba(0,0,0,0.6)', zIndex: 100, overflow: 'hidden' }}
                  >
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 9, fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase', color: S }}>
                      Recent Activity
                    </div>
                    <div className="sl-scroll" style={{ maxHeight: 280, overflowY: 'auto' }}>
                      {activityFeed.length === 0
                        ? <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 11, color: S }}>No recent activity</div>
                        : activityFeed.map(ev => {
                          const { icon, color, label } = activityIcon(ev.type);
                          return (
                            <div key={ev.id} style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                              <div style={{ width: 24, height: 24, borderRadius: '50%', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0, marginTop: 1 }}>{icon}</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: '#F2F7F8', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {label}: {ev.name}
                                </div>
                                <div style={{ fontSize: 9, color: S }}>{ev.service} · {timeAgo(ev.ts)}</div>
                              </div>
                            </div>
                          );
                        })
                      }
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={fetchLogs}
              aria-label="Refresh appointments"
              className="sl-focus-ring"
              style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: S, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.color = GOLD; e.currentTarget.style.borderColor = 'rgba(232,176,0,0.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = S;    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
              title="Refresh"
            >
              <RefreshCw size={13} style={{ animation: loading ? 'sl-spin 1.2s linear infinite' : 'none' }} />
            </button>

            <button
              onClick={handleExport}
              aria-label="Export appointments to CSV"
              className="sl-focus-ring"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: S, fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.color = GOLD; e.currentTarget.style.borderColor = 'rgba(232,176,0,0.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = S;    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
            >
              <Download size={12} /> Export{selected.size > 0 ? ` (${selected.size})` : ''}
            </button>

            {selected.size > 0 && (
              <button
                onClick={handleBulkDelete}
                aria-label={`Delete ${selected.size} selected appointments`}
                className="sl-focus-ring"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', height: 36, borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}
              >
                <Trash2 size={12} /> Delete ({selected.size})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ══ SECTION 3: Date Range ══ */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {DATE_RANGES.map(dr => (
          <button
            key={dr.value}
            className="sl-pill-btn"
            onClick={() => setDateRange(dr.value)}
            style={{ padding: '6px 14px', borderRadius: 20, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', background: dateRange === dr.value ? GOLD : 'rgba(255,255,255,0.04)', border: `1px solid ${dateRange === dr.value ? GOLD : 'rgba(255,255,255,0.08)'}`, color: dateRange === dr.value ? INK2 : S, cursor: 'pointer' }}
          >
            {dr.label}
          </button>
        ))}
      </div>

      {/* ══ SECTION 2: KPI Cards ══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 24 }}>
        <KpiCard label="Total"      value={kpis.total}     icon={<ClipboardList size={15} />} color={GOLD}      loading={loading} spark={sparks.total}     trend={prevKpis && { current: kpis.total, previous: prevKpis.total }} />
        <KpiCard label="Active Jobs" value={kpis.active}   icon={<Activity      size={15} />} color="#3B82F6"   loading={loading} spark={sparks.active}    trend={prevKpis && { current: kpis.active, previous: prevKpis.active }} />
        <KpiCard label="Completed"  value={kpis.completed} icon={<CheckCircle2  size={15} />} color="#10B981"   loading={loading} spark={sparks.completed} trend={prevKpis && { current: kpis.completed, previous: prevKpis.completed }} />
        <KpiCard label="Pending"    value={kpis.pending}   icon={<Clock         size={15} />} color="#F59E0B"   loading={loading} spark={sparks.pending}   trend={prevKpis && { current: kpis.pending, previous: prevKpis.pending }} />
        <KpiCard label="Cancelled"  value={kpis.cancelled} icon={<XCircle       size={15} />} color="#EF4444"   loading={loading} spark={sparks.cancelled} trend={prevKpis && { current: kpis.cancelled, previous: prevKpis.cancelled }} />
      </div>

      {/* ══ SECTION 4: Analytics ══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 12, marginBottom: 24 }}>
        {/* Main trend chart */}
        <div style={{ background: SURFACE, backdropFilter: 'blur(12px)', borderRadius: 10, padding: '22px 22px 16px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#F2F7F8', marginBottom: 2 }}>Appointment Trend</div>
              <div style={{ fontSize: 10, color: S }}>Volume over time</div>
            </div>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: `${GOLD}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: GOLD }}>
              <TrendingUp size={14} />
            </div>
          </div>
          <div style={{ height: 170 }}>
            <ResponsiveContainer>
              <AreaChart data={rangedChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="sl-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={GOLD} stopOpacity={0.22} />
                    <stop offset="95%" stopColor={GOLD} stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(140,168,173,0.06)" vertical={false} />
                <XAxis dataKey="name" stroke="none" tick={{ fontSize: 9, fill: S }} axisLine={false} tickLine={false} />
                <YAxis stroke="none" tick={{ fontSize: 9, fill: S }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="count" stroke={GOLD} strokeWidth={2} fill="url(#sl-grad)" dot={false} activeDot={{ r: 4, fill: GOLD, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut chart */}
        <div style={{ background: SURFACE, backdropFilter: 'blur(12px)', borderRadius: 10, padding: '22px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#F2F7F8', marginBottom: 2 }}>By Status</div>
              <div style={{ fontSize: 10, color: S }}>Distribution</div>
            </div>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: `${GOLD}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: GOLD }}>
              <BarChart2 size={14} />
            </div>
          </div>

          {rangedStatusDist.length > 0 ? (
            <>
              <div style={{ height: 130 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={rangedStatusDist}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={60}
                      dataKey="value"
                      paddingAngle={2}
                      labelLine={false}
                      label={DonutLabel}
                    >
                      {rangedStatusDist.map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: INK2, border: '1px solid rgba(232,176,0,0.2)', borderRadius: 6, color: '#F2F7F8', fontSize: 11 }}
                      formatter={(val, name) => [val, statusCfg(name).label]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8 }}>
                {rangedStatusDist.map(s => (
                  <div key={s.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 10, fontWeight: 600, color: S, textTransform: 'capitalize' }}>{s.name.replace('_',' ')}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: S }}>{Math.round((s.value / Math.max(kpis.total,1))*100)}%</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#F2F7F8', minWidth: 22, textAlign: 'right' }}>{s.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', color: S, fontSize: 11 }}>
              No data
            </div>
          )}
        </div>
      </div>

      {/* ══ SECTIONS 5 & 6: Services + Activity ══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        {/* Top Services */}
        <div style={{ background: SURFACE, backdropFilter: 'blur(12px)', borderRadius: 10, padding: '22px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#F2F7F8', marginBottom: 2 }}>Top Services</div>
              <div style={{ fontSize: 10, color: S }}>By booking volume</div>
            </div>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: `${GOLD}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: GOLD }}>
              <Star size={13} />
            </div>
          </div>
          {topServices.length === 0
            ? <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 11, color: S }}>No service data</div>
            : topServices.map((svc, i) => (
              <motion.div
                key={svc.name}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < topServices.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
              >
                <div style={{ width: 22, height: 22, borderRadius: 6, background: `${GOLD}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: GOLD, flexShrink: 0 }}>
                  {svc.rank}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#F2F7F8', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{svc.name}</div>
                  <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${svc.pct}%` }} transition={{ duration: 0.6, delay: i * 0.08 }} style={{ height: '100%', background: GOLD, borderRadius: 2 }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#F2F7F8' }}>{svc.count}</div>
                  <div style={{ fontSize: 9, color: S }}>{svc.pct}%</div>
                </div>
              </motion.div>
            ))
          }
        </div>

        {/* Activity feed */}
        <div style={{ background: SURFACE, backdropFilter: 'blur(12px)', borderRadius: 10, padding: '22px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#F2F7F8', marginBottom: 2 }}>Recent Activity</div>
              <div style={{ fontSize: 10, color: S }}>Live updates</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981', animation: 'sl-pulse 2s infinite' }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: '#10B981', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Live</span>
            </div>
          </div>
          <div className="sl-scroll" style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
            {activityFeed.length === 0
              ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px 0', gap: 8 }}>
                  <Bell size={22} style={{ color: 'rgba(140,168,173,0.25)' }} />
                  <div style={{ fontSize: 11, color: S }}>Listening for events…</div>
                </div>
              )
              : activityFeed.map((ev, i) => {
                const { icon, color, label } = activityIcon(ev.type);
                return (
                  <motion.div
                    key={ev.id}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: i < activityFeed.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                  >
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0, marginTop: 1 }}>{icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#F2F7F8', marginBottom: 2 }}>
                        <span style={{ color }}>{label}</span> — {ev.name}
                      </div>
                      <div style={{ fontSize: 9, color: S }}>
                        {ev.service && <span style={{ marginRight: 6 }}>{ev.service}</span>}
                        {ev.status && <SBadge status={ev.status} />}
                      </div>
                    </div>
                    <div style={{ fontSize: 9, color: S, flexShrink: 0, marginTop: 2 }}>{timeAgo(ev.ts)}</div>
                  </motion.div>
                );
              })
            }
          </div>
        </div>
      </div>

      {/* ══ SECTIONS 7 & 8: Search + Table ══ */}
      <div style={{ background: SURFACE, backdropFilter: 'blur(12px)', borderRadius: 10, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
        {/* Search + Filters */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: S, pointerEvents: 'none' }} />
            <input
              id="sl-search"
              aria-label="Search appointments by client, service, or address"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search client, service, address… (⌘K)"
              className="sl-focus-ring"
              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#F2F7F8', fontFamily: 'DM Sans, sans-serif', fontSize: 12, padding: '8px 36px 8px 36px', outline: 'none', borderRadius: 7, boxSizing: 'border-box', transition: 'border-color 0.2s' }}
              onFocus={e => (e.target.style.borderColor = 'rgba(232,176,0,0.4)')}
              onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.07)')}
            />
            <AnimatePresence mode="wait">
              {isFiltering ? (
                <motion.div key="pulse" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: GOLD, animation: 'sl-pulse 1s infinite' }} />
                </motion.div>
              ) : searchInput ? (
                <motion.button key="clear" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                  aria-label="Clear search"
                  onClick={() => setSearchInput('')}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: S, cursor: 'pointer', padding: 2 }}>
                  <X size={12} />
                </motion.button>
              ) : null}
            </AnimatePresence>
          </div>

          {/* Status pills */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {['all','pending','scheduled','completed','cancelled'].map(s => {
              const cfg = s === 'all' ? { color: GOLD } : statusCfg(s);
              const active = statusFilter === s;
              return (
                <button key={s} className="sl-pill-btn sl-focus-ring" aria-pressed={active} onClick={() => setStatusFilter(s)}
                  style={{ position: 'relative', padding: '5px 12px', fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', background: active ? `${cfg.color}15` : 'rgba(255,255,255,0.03)', border: `1px solid ${active ? cfg.color + '50' : 'rgba(255,255,255,0.07)'}`, color: active ? cfg.color : S, cursor: 'pointer', borderRadius: 5, overflow: 'hidden' }}>
                  {active && (
                    <motion.div layoutId="sl-pill-active" transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      style={{ position: 'absolute', inset: 0, background: `${cfg.color}10`, borderRadius: 5 }} />
                  )}
                  <span style={{ position: 'relative' }}>{s === 'all' ? 'All' : s}</span>
                </button>
              );
            })}
          </div>

          {(searchInput || statusFilter !== 'all') && (
            <button onClick={() => { setSearchInput(''); setStatusFilter('all'); }} className="sl-focus-ring"
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', fontSize: 10, fontWeight: 600, color: S, background: 'none', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 5, cursor: 'pointer' }}>
              <X size={11} /> Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="sl-scroll" style={{ overflowX: 'auto', maxHeight: 520, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', width: 40, position: 'sticky', top: 0, background: 'rgba(3,14,16,0.95)', backdropFilter: 'blur(8px)', zIndex: 1 }}>
                  <input type="checkbox" aria-label="Select all appointments" className="sl-focus-ring" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} style={{ accentColor: GOLD, cursor: 'pointer' }} />
                </th>
                <ColHead label="Client"   field="full_name"     />
                <ColHead label="Service"  field="service_type"  />
                <ColHead label="Status"   field="status"        />
                <ColHead label="Schedule" field="schedule_date" />
                <ColHead label="Created"  field="created_at"    />
                <th style={{ padding: '12px 16px', textAlign: 'right', position: 'sticky', top: 0, background: 'rgba(3,14,16,0.95)', backdropFilter: 'blur(8px)', zIndex: 1 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.35em', textTransform: 'uppercase', color: S }}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '13px 16px' }}><div className="sl-shimmer" style={{ width: 16, height: 16, borderRadius: 4 }} /></td>
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="sl-shimmer" style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0 }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          <div className="sl-shimmer" style={{ width: 110, height: 11, borderRadius: 4 }} />
                          <div className="sl-shimmer" style={{ width: 70, height: 9, borderRadius: 4 }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '13px 16px' }}><div className="sl-shimmer" style={{ width: 80, height: 11, borderRadius: 4 }} /></td>
                    <td style={{ padding: '13px 16px' }}><div className="sl-shimmer" style={{ width: 64, height: 18, borderRadius: 4 }} /></td>
                    <td style={{ padding: '13px 16px' }}><div className="sl-shimmer" style={{ width: 70, height: 11, borderRadius: 4 }} /></td>
                    <td style={{ padding: '13px 16px' }}><div className="sl-shimmer" style={{ width: 50, height: 10, borderRadius: 4 }} /></td>
                    <td style={{ padding: '13px 16px' }} />
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '70px 0', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 56, height: 56, borderRadius: 12, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Inbox size={24} style={{ color: 'rgba(140,168,173,0.3)' }} />
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(242,247,248,0.5)' }}>No records found</div>
                      <div style={{ fontSize: 11, color: 'rgba(140,168,173,0.5)', maxWidth: 220 }}>
                        {searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters or search term.' : 'No appointments have been created yet.'}
                      </div>
                      {(searchTerm || statusFilter !== 'all') && (
                        <button onClick={() => { setSearchInput(''); setStatusFilter('all'); }} className="sl-focus-ring"
                          style={{ padding: '7px 16px', fontSize: 10, fontWeight: 700, background: `${GOLD}15`, border: `1px solid ${GOLD}40`, color: GOLD, borderRadius: 6, cursor: 'pointer', letterSpacing: '0.1em' }}>
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : filtered.map((log, idx) => {
                const initials = log.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';
                return (
                  <motion.tr
                    key={log.id}
                    className="sl-row"
                    tabIndex={0}
                    role="button"
                    aria-label={`View appointment for ${log.full_name || 'client'}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.018, 0.25) }}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: selected.has(log.id) ? 'rgba(232,176,0,0.04)' : 'transparent', outline: 'none' }}
                    onClick={() => setDrawerLog(log)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDrawerLog(log); } }}
                  >
                    <td style={{ padding: '13px 16px' }} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" aria-label={`Select appointment for ${log.full_name || 'client'}`} className="sl-focus-ring" checked={selected.has(log.id)} onChange={() => toggleSelect(log.id)} style={{ accentColor: GOLD, cursor: 'pointer' }} />
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(232,176,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: GOLD, flexShrink: 0 }}>
                          {initials}
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#F2F7F8' }}>{log.full_name}</div>
                          <div style={{ fontSize: 9, color: S, fontFamily: 'monospace' }}>{log.id?.slice(0,10)}…</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 11, fontWeight: 600, color: '#C0D4D8' }}>{log.service_type}</td>
                    <td style={{ padding: '13px 16px' }}><SBadge status={log.status} /></td>
                    <td style={{ padding: '13px 16px', fontSize: 11, color: S, fontFamily: 'monospace' }}>{log.schedule_date || '—'}</td>
                    <td style={{ padding: '13px 16px', fontSize: 10, color: S }}>{log.created_at ? timeAgo(log.created_at) : '—'}</td>
                    <td style={{ padding: '13px 16px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                        <button
                          onClick={() => setDrawerLog(log)}
                          title="View details"
                          aria-label={`View details for ${log.full_name || 'appointment'}`}
                          className="sl-focus-ring"
                          style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: '1px solid transparent', color: S, cursor: 'pointer', transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.color = GOLD; e.currentTarget.style.borderColor = 'rgba(232,176,0,0.4)'; e.currentTarget.style.background = 'rgba(232,176,0,0.08)'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = S;    e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'none'; }}
                        >
                          <Eye size={13} />
                        </button>
                        {onEdit && (
                          <button
                            onClick={() => onEdit(log)}
                            title="Edit"
                            aria-label={`Edit appointment for ${log.full_name || 'client'}`}
                            className="sl-focus-ring"
                            style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: '1px solid transparent', color: S, cursor: 'pointer', transition: 'all 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#6366F1'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = S;         e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'none'; }}
                          >
                            <Edit3 size={13} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(log.id)}
                          title="Delete"
                          aria-label={`Delete appointment for ${log.full_name || 'client'}`}
                          className="sl-focus-ring"
                          style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: '1px solid transparent', color: S, cursor: 'pointer', transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = S;         e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'none'; }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div style={{ padding: '11px 20px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(3,14,16,0.3)' }}>
          <span style={{ fontSize: 10, color: S, fontWeight: 600, letterSpacing: '0.1em' }}>
            {filtered.length} of {rangedLogs.length} records
            {selected.size > 0 && <span style={{ color: GOLD, marginLeft: 8 }}>· {selected.size} selected</span>}
          </span>
          {activityFeed.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, color: S }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981', animation: 'sl-pulse 2s infinite' }} />
              Last event: {timeAgo(activityFeed[0]?.ts)}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ServiceLogs;
