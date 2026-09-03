import React, { createContext, useCallback, useContext, useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../supabaseClient";

/* ════════════════════════════════════════════════════════════════════════
   THEME TOKENS
   ════════════════════════════════════════════════════════════════════════ */
const T = {
  bg: "#020617",
  card: "#0B1120",
  cardGrad: "linear-gradient(135deg, rgba(15,23,42,.95), rgba(30,41,59,.95))",
  border: "rgba(255,255,255,.05)",
  blue: "#2563EB",
  yellow: "#FACC15",
  green: "#10B981",
  red: "#EF4444",
  purple: "#A78BFA",
  text: "#FFFFFF",
  sub: "#94A3B8",
};

/* ════════════════════════════════════════════════════════════════════════
   ICONS
   ════════════════════════════════════════════════════════════════════════ */
const Icon = ({ d, size = 16, className = "", strokeWidth = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d={d} />
  </svg>
);
const Icons = {
  search: "M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z",
  refresh: "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  phone: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.06 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z",
  mapPin: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2",
  check: "M20 6L9 17l-5-5",
  checkCircle: "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3",
  x: "M18 6L6 18M6 6l12 12",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  chevronDown: "M6 9l6 6 6-6",
  chevronRight: "M9 18l6-6-6-6",
  calendar: "M3 4h18v18H3zM16 2v4M8 2v4M3 10h18",
  alertTriangle: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
  userCheck: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8M16 11l2 2 4-4",
  briefcase: "M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2",
  trendingUp: "M23 6l-9.5 9.5-5-5L1 18M17 6h6v6",
  trendingDown: "M23 18l-9.5-9.5-5 5L1 6M17 18h6v-6",
  filter: "M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
  moreVertical: "M12 5v.01M12 12v.01M12 19v.01",
  navigation: "M3 11l19-9-9 19-2-8-8-2z",
  dollar: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  fileText: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
  image: "M3 3h18v18H3zM8.5 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21",
  activity: "M22 12h-4l-3 9L9 3l-3 9H2",
  layers: "M12 2l9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5",
  tool: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
  clipboard: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z",
  messageSquare: "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z",
  creditCard: "M1 4h22v16H1zM1 10h22",
  hash: "M4 9h16M4 15h16M10 3L8 21M16 3l-2 18",
  bell: "M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0",
  wifiOff: "M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.58 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01",
  info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01",
  alertCircle: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 8v4M12 16h.01",
  xCircle: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM15 9l-6 6M9 9l6 6",
  trash: "M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2",
  checkDouble: "M18 7l-9 9-4-4M22 7l-9 9",
};

/* ════════════════════════════════════════════════════════════════════════
   CONFIG MAPS
   ════════════════════════════════════════════════════════════════════════ */
const getSLAColor = (createdAt) => {
  if (!createdAt) return { color: T.green, label: "—" };
  const mins = Math.floor((Date.now() - new Date(createdAt)) / 60000);
  if (mins < 60) return { color: T.green, label: `${mins}m` };
  if (mins < 180) {
    const h = Math.floor(mins / 60), m = mins % 60;
    return { color: "#F59E0B", label: `${h}h ${m}m` };
  }
  const h = Math.floor(mins / 60), m = mins % 60;
  return { color: T.red, label: `${h}h ${m}m` };
};

const priorityConfig = {
  emergency: { label: "Emergency", color: T.red,    bg: "rgba(239,68,68,0.12)",  dot: "●" },
  high:      { label: "High",      color: "#F59E0B", bg: "rgba(245,158,11,0.12)", dot: "●" },
  medium:    { label: "Medium",    color: T.yellow,  bg: "rgba(250,204,21,0.12)", dot: "●" },
  low:       { label: "Low",       color: T.green,   bg: "rgba(16,185,129,0.12)", dot: "●" },
};

const statusConfig = {
  pending:    { label: "Pending",    color: T.sub,    bg: "rgba(148,163,184,0.12)" },
  assigned:   { label: "Assigned",   color: "#60A5FA", bg: "rgba(96,165,250,0.12)" },
  travelling: { label: "Travelling", color: "#A78BFA", bg: "rgba(167,139,250,0.12)" },
  arrived:    { label: "Arrived",    color: "#34D399", bg: "rgba(52,211,153,0.12)" },
  working:    { label: "Working",    color: T.yellow,  bg: "rgba(250,204,21,0.12)" },
  completed:  { label: "Completed",  color: T.green,   bg: "rgba(16,185,129,0.12)" },
  cancelled:  { label: "Cancelled",  color: T.red,     bg: "rgba(239,68,68,0.12)" },
};

const paymentConfig = {
  paid:    { label: "Paid",    color: T.green,  bg: "rgba(16,185,129,0.12)" },
  partial: { label: "Partial", color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  pending: { label: "Pending", color: T.sub,    bg: "rgba(148,163,184,0.12)" },
  unpaid:  { label: "Unpaid",  color: T.red,    bg: "rgba(239,68,68,0.12)" },
};

const techStatusConfig = {
  available:  { label: "Available",  color: T.green },
  working:    { label: "Working",    color: T.yellow },
  travelling: { label: "Travelling", color: "#A78BFA" },
  offline:    { label: "Offline",    color: T.sub },
};

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—");
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—");
const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "—");
const fmtMoney = (n) => (n === null || n === undefined || n === "" ? "—" : `₱${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 })}`);
const initials = (a, b) => `${(a || "?")[0] || ""}${(b || "")[0] || ""}`.toUpperCase() || "?";

/* ════════════════════════════════════════════════════════════════════════
   PRIMITIVES
   ════════════════════════════════════════════════════════════════════════ */
const GlassCard = ({ children, style = {}, hover = false, ...rest }) => (
  <motion.div
    style={{
      background: T.cardGrad,
      border: `1px solid ${T.border}`,
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      boxShadow: "0 10px 30px rgba(0,0,0,.35)",
      borderRadius: 24,
      ...style,
    }}
    whileHover={hover ? { y: -4, boxShadow: "0 18px 44px rgba(0,0,0,.5)" } : undefined}
    transition={{ duration: 0.3, ease: "easeOut" }}
    {...rest}
  >
    {children}
  </motion.div>
);

const Badge = ({ color, bg, children, size = 11 }) => (
  <span style={{
    background: bg, color, fontSize: size, fontWeight: 700,
    padding: "3px 10px", borderRadius: 20, letterSpacing: ".02em",
    whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 4,
  }}>
    {children}
  </span>
);

const IconButton = ({ icon, title, onClick, active = false, danger = false }) => (
  <motion.button
    whileHover={{ scale: 1.06 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    title={title}
    style={{
      background: active ? "rgba(37,99,235,.16)" : "rgba(255,255,255,.03)",
      color: active ? T.blue : danger ? T.red : T.sub,
      border: `1px solid ${active ? "rgba(37,99,235,.35)" : T.border}`,
      borderRadius: 12, padding: "9px 11px", cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center",
      transition: "all .2s",
    }}
  >
    <Icon d={icon} size={15} />
  </motion.button>
);

/* ─── Loading Skeletons ───────────────────────────────────────────────── */
const SkeletonBlock = ({ h = 160, r = 24 }) => (
  <div style={{
    background: "linear-gradient(90deg, rgba(255,255,255,.03) 0%, rgba(255,255,255,.07) 50%, rgba(255,255,255,.03) 100%)",
    backgroundSize: "200% 100%",
    borderRadius: r, height: h,
    animation: "shimmer 1.6s ease-in-out infinite",
    border: `1px solid ${T.border}`,
  }} />
);

const Skeleton = () => (
  <div style={{ display: "grid", gap: 14 }}>
    {[1, 2, 3].map(i => <SkeletonBlock key={i} h={190} />)}
    <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
  </div>
);

/* ─── Animated Counter ────────────────────────────────────────────────── */
const Counter = ({ value }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let frame;
    const start = display;
    const diff = value - start;
    const duration = 500;
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / duration);
      setDisplay(Math.round(start + diff * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <>{display}</>;
};

/* ════════════════════════════════════════════════════════════════════════
   OPERATIONS INTELLIGENCE PANEL (KPIs)
   ════════════════════════════════════════════════════════════════════════ */
const KPICard = ({ label, value, sub, trend, color, icon, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, delay: index * 0.05 }}
  >
    <GlassCard hover style={{ padding: "20px 20px", borderRadius: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ color: T.sub, fontSize: 11.5, fontWeight: 600, letterSpacing: ".07em", textTransform: "uppercase" }}>{label}</span>
        <div style={{ background: `${color}1F`, borderRadius: 10, padding: 7, color, display: "flex" }}>
          <Icon d={icon} size={14} />
        </div>
      </div>
      <div style={{ color: T.text, fontSize: 34, fontWeight: 800, lineHeight: 1.1, marginTop: 10, letterSpacing: "-.02em" }}>
        <Counter value={value} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8 }}>
        {trend !== undefined && trend !== null && (
          <span style={{
            color: trend >= 0 ? T.green : T.red, fontSize: 11.5, fontWeight: 700,
            display: "flex", alignItems: "center", gap: 3,
          }}>
            <Icon d={trend >= 0 ? Icons.trendingUp : Icons.trendingDown} size={11} />
            {trend >= 0 ? "+" : ""}{trend}
          </span>
        )}
        <span style={{ color: T.sub, fontSize: 11.5 }}>{sub}</span>
      </div>
    </GlassCard>
  </motion.div>
);

/* ════════════════════════════════════════════════════════════════════════
   DISPATCH TIMELINE
   ════════════════════════════════════════════════════════════════════════ */
const STEPS = ["assigned", "travelling", "arrived", "working", "completed"];
const STEP_LABELS = { assigned: "Assigned", travelling: "Travelling", arrived: "Arrived", working: "Working", completed: "Completed" };

const Timeline = ({ status }) => {
  const idx = STEPS.indexOf((status || "").toLowerCase());
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 0, marginTop: 16 }}>
      {STEPS.map((s, i) => {
        const done = i <= idx;
        const cfg = statusConfig[s] || {};
        return (
          <React.Fragment key={s}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 0 }}>
              <motion.div
                initial={false}
                animate={{ scale: done ? 1 : 0.85, background: done ? cfg.color : "rgba(255,255,255,.06)" }}
                style={{
                  width: 11, height: 11, borderRadius: "50%",
                  border: `2px solid ${done ? cfg.color : "rgba(255,255,255,.12)"}`,
                  flexShrink: 0,
                  boxShadow: done ? `0 0 0 4px ${cfg.color}22` : "none",
                }}
              />
              <span style={{ fontSize: 9.5, color: done ? cfg.color : T.sub, fontWeight: 600, whiteSpace: "nowrap" }}>
                {STEP_LABELS[s]}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, marginTop: 5, background: i < idx ? cfg.color : "rgba(255,255,255,.08)", transition: "background .3s" }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════════
   ASSIGN MODAL  (unchanged business logic: assignTechnician)
   ════════════════════════════════════════════════════════════════════════ */
const AssignModal = ({ job, technicians, onClose, onAssign, notify }) => {
  const [selected, setSelected] = useState(job.technician_id || "");
  const isReassign = !!job.technician_id;

  const handleConfirmAssignment = async () => {
    const tech = technicians.find(t => t.id === selected);
    const techName = tech ? `${tech.first_name || ""} ${tech.last_name || ""}`.trim() : "this technician";
    const ok = await notify.confirm({
      title: isReassign ? "Reassign Technician" : "Assign Technician",
      description: `${techName} will be ${isReassign ? "reassigned to" : "assigned to"} ${job.full_name}'s ${job.service_type || "job"}. They'll be notified immediately.`,
      confirmLabel: isReassign ? "Reassign" : "Assign",
      tone: "default",
    });
    if (!ok) return;
    onAssign(job.id, selected);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, background: "rgba(2,6,23,.75)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.97 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        style={{
          background: T.cardGrad, borderRadius: 24, padding: 28, width: "100%", maxWidth: 480,
          border: `1px solid ${T.border}`, boxShadow: "0 32px 80px rgba(0,0,0,.6)", backdropFilter: "blur(20px)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h3 style={{ color: T.text, fontWeight: 700, fontSize: 18, margin: 0 }}>Assign Technician</h3>
            <p style={{ color: T.sub, fontSize: 13, margin: "4px 0 0" }}>{job.full_name} — {job.service_type}</p>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: T.sub, cursor: "pointer" }}>
            <Icon d={Icons.x} size={20} />
          </button>
        </div>

        <div style={{ display: "grid", gap: 8, maxHeight: 360, overflowY: "auto" }}>
          {technicians.map((tech, idx) => {
            const isSelected = selected === tech.id;
            const isBest = idx === 0;
            return (
              <div key={tech.id} onClick={() => setSelected(tech.id)} style={{
                background: isSelected ? "rgba(37,99,235,.10)" : "rgba(255,255,255,.02)",
                border: `1.5px solid ${isSelected ? T.blue : T.border}`,
                borderRadius: 16, padding: "14px 16px", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 14, transition: "all .2s",
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: "linear-gradient(135deg,#2563EB,#1D4ED8)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#FFF", fontWeight: 800, fontSize: 15, flexShrink: 0,
                }}>
                  {initials(tech.first_name, tech.last_name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: T.text, fontWeight: 600 }}>{tech.first_name} {tech.last_name}</span>
                    {isBest && (
                      <Badge color={T.yellow} bg="rgba(250,204,21,.12)">★ Best Match</Badge>
                    )}
                  </div>
                  <div style={{ color: T.green, fontSize: 12, marginTop: 3, display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, display: "inline-block" }} />
                    Available · Lowest Workload
                  </div>
                </div>
                {isSelected && <div style={{ color: T.blue }}><Icon d={Icons.check} size={18} /></div>}
              </div>
            );
          })}
          {technicians.length === 0 && (
            <EmptyState icon={Icons.user} title="No Available Technician" message="There are no technicians to assign right now." compact />
          )}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "12px", borderRadius: 14, border: `1px solid ${T.border}`,
            background: "transparent", color: T.sub, cursor: "pointer", fontWeight: 600,
          }}>Cancel</button>
          <button onClick={handleConfirmAssignment} disabled={!selected} style={{
            flex: 2, padding: "12px", borderRadius: 14, border: "none",
            background: selected ? "linear-gradient(135deg,#2563EB,#1D4ED8)" : "rgba(255,255,255,.06)",
            color: selected ? "#FFF" : T.sub, cursor: selected ? "pointer" : "not-allowed",
            fontWeight: 700, fontSize: 14, transition: "all .2s",
          }}>Confirm Assignment</button>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ════════════════════════════════════════════════════════════════════════
   DETAILS DRAWER
   ════════════════════════════════════════════════════════════════════════ */
const DrawerSection = ({ title, icon, children, highlight = false }) => (
  <div style={{
    marginBottom: 18, padding: 16, borderRadius: 16,
    background: highlight ? "rgba(250,204,21,.07)" : "rgba(255,255,255,.02)",
    border: `1px solid ${highlight ? "rgba(250,204,21,.25)" : T.border}`,
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <Icon d={icon} size={14} className="" />
      <h4 style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: highlight ? T.yellow : T.text, textTransform: "uppercase", letterSpacing: ".04em" }}>
        {title}
      </h4>
    </div>
    {children}
  </div>
);

const Field = ({ label, value }) => (
  <div>
    <div style={{ color: T.sub, fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</div>
    <div style={{ color: T.text, fontSize: 13.5, marginTop: 3, fontWeight: 500, wordBreak: "break-word" }}>{value ?? "—"}</div>
  </div>
);

const FieldGrid = ({ children }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>{children}</div>
);

const DetailsDrawer = ({ job, technicians, getTechnicianName, getTechnician, onClose, onAssign, related }) => {
  const priority = priorityConfig[(job.priority || "").toLowerCase()] || priorityConfig.medium;
  const status = statusConfig[(job.status || "").toLowerCase()] || statusConfig.pending;
  const payment = paymentConfig[(job.payment_status || "").toLowerCase()] || paymentConfig.pending;
  const tech = getTechnician(job.technician_id);
  const { serviceReports = [], jobPhotos = [], jobLogs = [] } = related || {};

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,.7)", zIndex: 1200, backdropFilter: "blur(2px)" }}
      />
      <motion.div
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "fixed", top: 0, right: 0, height: "100vh",
          width: "min(560px, 100vw)", zIndex: 1201,
          background: "linear-gradient(160deg, #0B1120 0%, #020617 100%)",
          borderLeft: `1px solid ${T.border}`,
          boxShadow: "-24px 0 60px rgba(0,0,0,.5)",
          display: "flex", flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "22px 24px", borderBottom: `1px solid ${T.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          background: "rgba(255,255,255,.015)", flexShrink: 0,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
              <h2 style={{ margin: 0, color: T.text, fontSize: 19, fontWeight: 800 }}>{job.full_name}</h2>
              <Badge color={priority.color} bg={priority.bg}>{priority.label}</Badge>
              <Badge color={status.color} bg={status.bg}>{status.label}</Badge>
            </div>
            <div style={{ color: T.sub, fontSize: 12.5, display: "flex", alignItems: "center", gap: 5 }}>
              <Icon d={Icons.hash} size={11} />Job ID: {job.id}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,.04)", border: `1px solid ${T.border}`, color: T.sub,
            borderRadius: 10, padding: 8, cursor: "pointer", flexShrink: 0,
          }}>
            <Icon d={Icons.x} size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>

          {/* 1. Customer Information */}
          <DrawerSection title="Customer Information" icon={Icons.user}>
            <FieldGrid>
              <Field label="Full Name" value={job.full_name} />
              <Field label="Address" value={job.address} />
              <Field label="Schedule Date" value={fmtDate(job.schedule_date)} />
              <Field label="Appointment Time" value={job.appointment_time} />
            </FieldGrid>
          </DrawerSection>

          {/* 2. Service Information */}
          <DrawerSection title="Service Information" icon={Icons.briefcase}>
            <FieldGrid>
              <Field label="Service Type" value={job.service_type} />
              <Field label="Price" value={fmtMoney(job.price)} />
              <Field label="Requires Survey" value={job.requires_survey ? "Yes" : "No"} />
            </FieldGrid>
          </DrawerSection>

          {/* 3. Customer Request */}
          <DrawerSection title="Customer Request" icon={Icons.messageSquare}>
            <p style={{ color: T.text, fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>{job.details || "No additional details provided."}</p>
          </DrawerSection>

          {/* 4. Manager Instructions — highlighted yellow */}
          <DrawerSection title="Manager Instructions" icon={Icons.shield} highlight>
            <p style={{ color: T.text, fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>{job.manager_notes || "No manager instructions added."}</p>
          </DrawerSection>

          {/* 5. Materials Requirements */}
          <DrawerSection title="Materials Requirements" icon={Icons.layers}>
            <p style={{ color: T.text, fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>{job.materials_notes || "No materials notes recorded."}</p>
          </DrawerSection>

          {/* 6. Payment Information */}
          <DrawerSection title="Payment Information" icon={Icons.creditCard}>
            <FieldGrid>
              <Field label="Payment Method" value={job.payment_method} />
              <Field label="Payment Status" value={<Badge color={payment.color} bg={payment.bg}>{payment.label}</Badge>} />
              <Field label="Downpayment Paid" value={job.downpayment_paid ? "Yes" : "No"} />
              <Field label="Reference Number" value={job.reference_number} />
            </FieldGrid>
          </DrawerSection>

          {/* 7. Assignment Information */}
          <DrawerSection title="Assignment Information" icon={Icons.userCheck}>
            <FieldGrid>
              <Field label="Assigned At" value={fmtDateTime(job.assigned_at)} />
              <Field label="Started At" value={fmtDateTime(job.started_at)} />
              <Field label="Completed At" value={fmtDateTime(job.completed_at)} />
              <Field label="Assigned By" value={job.assigned_by} />
              <Field label="Technician" value={tech ? `${tech.first_name || ""} ${tech.last_name || ""}`.trim() : "Unassigned"} />
            </FieldGrid>
          </DrawerSection>

          {/* 8. QC Information */}
          <DrawerSection title="QC Information" icon={Icons.checkCircle}>
            <Field label="QC Status" value={job.qc_status || "Not yet reviewed"} />
          </DrawerSection>

          {/* 9. Customer Feedback */}
          <DrawerSection title="Customer Feedback" icon={Icons.star}>
            <FieldGrid>
              <Field label="Rating" value={job.customer_rating ? `${job.customer_rating} / 5 ★` : "—"} />
              <Field label="Feedback" value={job.customer_feedback || "No feedback submitted."} />
            </FieldGrid>
          </DrawerSection>

          {/* 10. Service Reports */}
          <DrawerSection title="Service Reports" icon={Icons.fileText}>
            {serviceReports.length === 0 ? (
              <p style={{ color: T.sub, fontSize: 13, margin: 0 }}>No service reports submitted yet.</p>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {serviceReports.map((r, i) => (
                  <div key={r.id || i} style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)", border: `1px solid ${T.border}` }}>
                    <FieldGrid>
                      <Field label="Service Performed" value={r.service_performed} />
                      <Field label="Items Used" value={r.items_used} />
                      <Field label="Technician Notes" value={r.technician_notes} />
                      <Field label="Completion Time" value={fmtDateTime(r.completion_time)} />
                    </FieldGrid>
                  </div>
                ))}
              </div>
            )}
          </DrawerSection>

          {/* 11. Job Photos */}
          <DrawerSection title="Job Photos" icon={Icons.image}>
            {jobPhotos.length === 0 ? (
              <p style={{ color: T.sub, fontSize: 13, margin: 0 }}>No photos uploaded yet.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {jobPhotos.map((p, i) => (
                  <div key={p.id || i} style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${T.border}`, background: "rgba(255,255,255,.03)" }}>
                    {p.photo_url ? (
                      <img src={p.photo_url} alt={p.photo_type || "job photo"} style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }} />
                    ) : (
                      <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", color: T.sub }}>
                        <Icon d={Icons.image} size={22} />
                      </div>
                    )}
                    <div style={{ padding: "6px 10px", fontSize: 11, color: T.sub, fontWeight: 600, textTransform: "capitalize" }}>
                      {(p.photo_type || "photo").replace(/_/g, " ")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DrawerSection>

          {/* 12. Activity Timeline */}
          <DrawerSection title="Activity Timeline" icon={Icons.activity}>
            {jobLogs.length === 0 ? (
              <p style={{ color: T.sub, fontSize: 13, margin: 0 }}>No activity recorded yet.</p>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {jobLogs.map((l, i) => (
                  <div key={l.id || i} style={{ display: "flex", gap: 10 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.blue, marginTop: 5, flexShrink: 0 }} />
                    <div>
                      <div style={{ color: T.text, fontSize: 13, fontWeight: 600 }}>{l.action}</div>
                      <div style={{ color: T.sub, fontSize: 11.5, marginTop: 1 }}>
                        {l.performed_by ? `${l.performed_by} · ` : ""}{fmtDateTime(l.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DrawerSection>
        </div>

        {/* Footer actions */}
        <div style={{ padding: 18, borderTop: `1px solid ${T.border}`, display: "flex", gap: 10, flexShrink: 0, background: "rgba(255,255,255,.015)" }}>
          <button onClick={() => onAssign(job)} style={{
            flex: 1, padding: "12px", borderRadius: 14, border: "none",
            background: "linear-gradient(135deg,#2563EB,#1D4ED8)", color: "#FFF",
            fontWeight: 700, fontSize: 13.5, cursor: "pointer",
          }}>
            {job.technician_id ? "Reassign Technician" : "Assign Technician"}
          </button>
          <button onClick={onClose} style={{
            padding: "12px 20px", borderRadius: 14, border: `1px solid ${T.border}`,
            background: "transparent", color: T.sub, fontWeight: 600, fontSize: 13.5, cursor: "pointer",
          }}>Close</button>
        </div>
      </motion.div>
    </>
  );
};

/* ════════════════════════════════════════════════════════════════════════
   DISPATCH CARD
   ════════════════════════════════════════════════════════════════════════ */
const DispatchCard = ({ job, technicians, getTechnician, onAssign, onViewDetails, index }) => {
  const priority = priorityConfig[(job.priority || "").toLowerCase()] || priorityConfig.medium;
  const status = statusConfig[(job.status || "").toLowerCase()] || statusConfig.pending;
  const payment = paymentConfig[(job.payment_status || "").toLowerCase()] || paymentConfig.pending;
  const sla = getSLAColor(job.created_at);
  const tech = getTechnician(job.technician_id);
  const techStatus = job.technician_id
    ? (techStatusConfig[(job.status || "").toLowerCase()] || techStatusConfig.available)
    : null;

  const [hovered, setHovered] = useState(false);
  const [glow, setGlow] = useState({ x: 50, y: 50 });
  const handleMouseMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setGlow({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };

  // Additional operational fields — every one is optional and hides itself
  // cleanly when the underlying record doesn't have the data.
  const estDuration = job.estimated_duration || job.duration_minutes
    ? `${job.estimated_duration || job.duration_minutes} min`
    : null;
  const notesPreview = job.manager_notes
    ? (job.manager_notes.length > 64 ? `${job.manager_notes.slice(0, 64)}…` : job.manager_notes)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={handleMouseMove}
    >
      <motion.div
        animate={{
          y: hovered ? -5 : 0,
          scale: hovered ? 1.005 : 1,
          boxShadow: hovered ? "0 20px 48px rgba(0,0,0,.5)" : "0 10px 30px rgba(0,0,0,.35)",
        }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        style={{
          background: T.cardGrad,
          border: `1px solid ${hovered ? "rgba(250,204,21,.45)" : T.border}`,
          borderRadius: 24, overflow: "hidden", position: "relative",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          transition: "border-color .25s",
        }}
      >
        {/* Mouse-reactive glow */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", opacity: hovered ? 1 : 0,
          transition: "opacity .3s",
          background: `radial-gradient(320px circle at ${glow.x}% ${glow.y}%, rgba(250,204,21,.06), transparent 60%)`,
        }} />

        {/* Priority strip */}
        <div style={{ height: 3, background: `linear-gradient(90deg, ${priority.color}, ${priority.color}80)` }} />

        <div style={{ padding: "20px 22px 18px", position: "relative" }}>
          {/* Header: name, priority badge, status badge, SLA */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h3 style={{ color: T.text, fontWeight: 700, fontSize: 16.5, margin: 0 }}>{job.full_name}</h3>
                <Badge color={priority.color} bg={priority.bg}>{priority.label}</Badge>
                {job.reference_number && (
                  <span style={{ color: T.sub, fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}>
                    <Icon d={Icons.hash} size={10} />{job.reference_number}
                  </span>
                )}
              </div>
              <div style={{ color: T.sub, fontSize: 13, marginTop: 5, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Icon d={Icons.briefcase} size={12} />{job.service_type || "—"}
                  {job.category && <span style={{ color: T.sub }}> · {job.category}</span>}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Icon d={Icons.mapPin} size={12} />{job.address || "—"}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              <Badge color={status.color} bg={status.bg} size={11.5}>{status.label}</Badge>
              <span style={{ color: sla.color, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                <Icon d={Icons.clock} size={11} />{sla.label}
              </span>
            </div>
          </div>

          {/* Timeline */}
          <Timeline status={job.status} />

          {/* Info grid */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))",
            gap: 14, marginTop: 18, padding: "14px 0", borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`,
          }}>
            <Field label="Schedule" value={fmtDate(job.schedule_date)} />
            <Field label="Time" value={job.appointment_time || "—"} />
            <Field label="Price" value={fmtMoney(job.price)} />
            <Field label="Payment" value={<Badge color={payment.color} bg={payment.bg}>{payment.label}</Badge>} />
            <Field label="Survey" value={job.requires_survey ? "Required" : "Not Required"} />
            {job.downpayment_paid !== undefined && job.downpayment_paid !== null && (
              <Field label="Downpayment" value={job.downpayment_paid ? "Paid" : "Not Paid"} />
            )}
            {estDuration && <Field label="Est. Duration" value={estDuration} />}
          </div>

          {/* Manager notes preview — only shown if notes exist */}
          {notesPreview && (
            <div style={{
              marginTop: 14, padding: "10px 12px", borderRadius: 12,
              background: "rgba(250,204,21,.06)", border: "1px solid rgba(250,204,21,.18)",
              display: "flex", alignItems: "flex-start", gap: 8,
            }}>
              <Icon d={Icons.shield} size={12} style={{ color: T.yellow, marginTop: 2, flexShrink: 0 }} />
              <span style={{ color: T.text, fontSize: 12, lineHeight: 1.5 }}>{notesPreview}</span>
            </div>
          )}

          {/* Technician row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                background: tech ? "linear-gradient(135deg,#2563EB,#1D4ED8)" : "rgba(255,255,255,.06)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: tech ? "#FFF" : T.sub, fontWeight: 700, fontSize: 13,
              }}>
                {tech ? initials(tech.first_name, tech.last_name) : <Icon d={Icons.user} size={15} />}
              </div>
              <div>
                <div style={{ color: T.text, fontSize: 13.5, fontWeight: 600 }}>
                  {tech ? `${tech.first_name || ""} ${tech.last_name || ""}`.trim() : "Unassigned"}
                </div>
                {tech && techStatus && (
                  <div style={{ color: techStatus.color, fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: techStatus.color, display: "inline-block" }} />
                    {techStatus.label}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => onAssign(job)}
                style={{
                  background: "linear-gradient(135deg,#2563EB,#1D4ED8)", color: "#FFF",
                  border: "none", borderRadius: 12, padding: "9px 16px", fontSize: 12.5, fontWeight: 700,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                }}
              >
                <Icon d={Icons.userCheck} size={13} />
                {job.technician_id ? "Reassign" : "Assign"}
              </motion.button>
              <IconButton icon={Icons.phone} title="Call Customer" />
              <IconButton icon={Icons.navigation} title="Navigate" />
              <IconButton icon={Icons.eye} title="View Details" onClick={() => onViewDetails(job)} active />
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ════════════════════════════════════════════════════════════════════════
   KANBAN BOARD
   ════════════════════════════════════════════════════════════════════════ */
const KanbanBoard = ({ appointments, technicians, getTechnician, onAssign, onViewDetails }) => {
  const cols = ["pending", "assigned", "working", "completed"];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 16, alignItems: "start" }}>
      {cols.map(col => {
        const jobs = appointments.filter(j => (j.status || "pending").toLowerCase() === col);
        const cfg = statusConfig[col] || statusConfig.pending;
        return (
          <GlassCard key={col} style={{ borderRadius: 20, overflow: "hidden", padding: 0 }}>
            <div style={{
              background: `${cfg.color}14`, padding: "14px 18px",
              borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ color: cfg.color, fontWeight: 700, fontSize: 13, textTransform: "capitalize" }}>{col}</span>
              <span style={{ background: `${cfg.color}22`, color: cfg.color, borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>{jobs.length}</span>
            </div>
            <div style={{ padding: 12, display: "grid", gap: 12, maxHeight: 640, overflowY: "auto" }}>
              {jobs.length === 0 ? (
                <div style={{ textAlign: "center", padding: "28px 0", color: T.sub, fontSize: 13 }}>No jobs here</div>
              ) : jobs.map((j, i) => (
                <DispatchCard key={j.id} job={j} index={i} technicians={technicians} getTechnician={getTechnician} onAssign={onAssign} onViewDetails={onViewDetails} />
              ))}
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════════
   TECHNICIAN COMMAND PANEL — premium per-technician cards
   ════════════════════════════════════════════════════════════════════════ */
const liveStatusFor = (techId, appointments) => {
  const active = appointments.find(a => a.technician_id === techId && !["completed", "cancelled"].includes((a.status || "").toLowerCase()));
  if (!active) return "available";
  const s = (active.status || "").toLowerCase();
  if (["working", "arrived"].includes(s)) return "working";
  if (s === "travelling") return "travelling";
  return "available";
};

const WORKLOAD_CAP = 6; // jobs/day considered "full" for the progress bar

const TechnicianCard = ({ tech, appointments, index, highlighted, onAssign }) => {
  const name = `${tech.first_name || ""} ${tech.last_name || ""}`.trim() || "Technician";
  const today = new Date().toDateString();

  const jobsToday = useMemo(
    () => appointments.filter(a => a.technician_id === tech.id && new Date(a.schedule_date || a.assigned_at || a.created_at || 0).toDateString() === today),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [appointments, tech.id]
  );

  const activeJob = useMemo(
    () => appointments.find(a => a.technician_id === tech.id && !["completed", "cancelled"].includes((a.status || "").toLowerCase())),
    [appointments, tech.id]
  );

  const lastAssigned = useMemo(() => {
    const times = appointments.filter(a => a.technician_id === tech.id && a.assigned_at).map(a => new Date(a.assigned_at).getTime());
    return times.length ? new Date(Math.max(...times)) : null;
  }, [appointments, tech.id]);

  const liveStatus = liveStatusFor(tech.id, appointments); // available | working | travelling
  const isBusy = liveStatus !== "available";
  const pulseColor = isBusy ? "#F59E0B" : T.green;
  const statusLabel = isBusy ? (techStatusConfig[liveStatus]?.label || "Busy") : "Available";
  const workloadPct = Math.min(100, Math.round((jobsToday.length / WORKLOAD_CAP) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{
        opacity: 1, y: 0,
        boxShadow: highlighted ? `0 0 0 2px ${T.yellow}, 0 18px 44px rgba(250,204,21,.25)` : "0 10px 30px rgba(0,0,0,.35)",
      }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.3) }}
    >
      <GlassCard hover style={{ padding: 18, borderRadius: 22, position: "relative", overflow: "hidden" }}>
        {/* Header: avatar, name, status pulse */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{
              width: 46, height: 46, borderRadius: "50%",
              background: "linear-gradient(135deg,#2563EB,#1D4ED8)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#FFF", fontWeight: 800, fontSize: 15,
            }}>
              {initials(tech.first_name, tech.last_name)}
            </div>
            <motion.span
              animate={{ boxShadow: [`0 0 0 0 ${pulseColor}66`, `0 0 0 6px ${pulseColor}00`] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
              style={{
                position: "absolute", bottom: -1, right: -1, width: 13, height: 13, borderRadius: "50%",
                background: pulseColor, border: "2px solid #0B1120",
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: T.text, fontSize: 14.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
            <div style={{ color: pulseColor, fontSize: 11.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: pulseColor, display: "inline-block" }} />
              {statusLabel}
            </div>
          </div>
          <Badge color={isBusy ? "#F59E0B" : T.blue} bg={isBusy ? "rgba(245,158,11,.12)" : "rgba(37,99,235,.12)"}>
            {jobsToday.length} today
          </Badge>
        </div>

        {/* Current assignment */}
        <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,.02)", border: `1px solid ${T.border}`, minHeight: 52 }}>
          {activeJob ? (
            <>
              <div style={{ color: T.text, fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeJob.full_name}</div>
              <div style={{ color: T.sub, fontSize: 11, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeJob.service_type || "Service"}</div>
            </>
          ) : (
            <div style={{ color: T.sub, fontSize: 12 }}>No active job</div>
          )}
        </div>

        {/* Workload progress */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ color: T.sub, fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em" }}>Workload</span>
            <span style={{ color: T.sub, fontSize: 10.5, fontWeight: 600 }}>{jobsToday.length}/{WORKLOAD_CAP}</span>
          </div>
          <div style={{ height: 6, borderRadius: 4, background: "rgba(255,255,255,.06)", overflow: "hidden" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${workloadPct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              style={{
                height: "100%", borderRadius: 4,
                background: workloadPct > 80 ? T.red : workloadPct > 50 ? "#F59E0B" : T.green,
              }}
            />
          </div>
        </div>

        {/* Footer: last assigned + assign button */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
          <div style={{ color: T.sub, fontSize: 10.5, display: "flex", alignItems: "center", gap: 4 }}>
            <Icon d={Icons.clock} size={11} />
            {lastAssigned ? `Last: ${fmtDateTime(lastAssigned)}` : "No assignments yet"}
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => onAssign(tech)}
            style={{
              background: "linear-gradient(135deg,#2563EB,#1D4ED8)", color: "#FFF",
              border: "none", borderRadius: 10, padding: "7px 13px", fontSize: 11.5, fontWeight: 700,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
            }}
          >
            <Icon d={Icons.userCheck} size={12} />Assign
          </motion.button>
        </div>
      </GlassCard>
    </motion.div>
  );
};

/* ════════════════════════════════════════════════════════════════════════
   EMPTY STATE — reusable placeholder for any empty container
   ════════════════════════════════════════════════════════════════════════ */
/**
 * EmptyState — a calm, on-brand placeholder for any empty container.
 *
 * props:
 *  - icon: path data (see Icons map in DispatchingView)
 *  - title: short headline, e.g. "No Jobs Today"
 *  - message: one line of helpful context
 *  - actionLabel / onAction: optional CTA button
 *  - compact: smaller padding, for use inside sidebar widgets
 */
function EmptyState({ icon, title, message, actionLabel, onAction, compact = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        textAlign: "center",
        padding: compact ? "28px 16px" : "64px 32px",
        background: compact ? "transparent" : T.cardGrad,
        border: compact ? "none" : `1px solid ${T.border}`,
        borderRadius: compact ? 0 : 24,
      }}
    >
      <div style={{
        width: compact ? 40 : 56, height: compact ? 40 : 56, borderRadius: compact ? 12 : 16,
        background: "rgba(37,99,235,.12)", color: T.blue,
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: compact ? "0 auto 12px" : "0 auto 16px",
      }}>
        <Icon d={icon} size={compact ? 18 : 24} />
      </div>
      <h3 style={{ color: T.text, fontWeight: 700, fontSize: compact ? 14.5 : 19, margin: "0 0 6px" }}>{title}</h3>
      {message && (
        <p style={{ color: T.sub, fontSize: compact ? 12.5 : 14, margin: actionLabel ? "0 0 18px" : 0, lineHeight: 1.5 }}>
          {message}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            background: "linear-gradient(135deg,#2563EB,#1D4ED8)", color: "#FFF",
            border: "none", borderRadius: 12, padding: "10px 20px", fontSize: 13, fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   GLOBAL POPUP / NOTIFICATION SYSTEM
   Toasts, confirmation dialogs, error modals (with retry), and the
   success celebration burst. Replaces every alert()/confirm()/prompt().
   ════════════════════════════════════════════════════════════════════════ */
/* ════════════════════════════════════════════════════════════════════════
   CONTEXT
   ════════════════════════════════════════════════════════════════════════ */
const NotificationContext = createContext(null);

const useNotify = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotify must be used within a NotificationProvider");
  return ctx;
};

let idCounter = 0;
const nextId = () => `n${Date.now()}_${idCounter++}`;

/* ════════════════════════════════════════════════════════════════════════
   TOAST
   ════════════════════════════════════════════════════════════════════════ */
const toastTheme = {
  success: { color: T.green, bg: "rgba(16,185,129,.14)", icon: Icons.checkCircle },
  error:   { color: T.red,   bg: "rgba(239,68,68,.14)",  icon: Icons.alertCircle },
  warning: { color: T.yellow, bg: "rgba(250,204,21,.14)", icon: Icons.alertTriangle },
  info:    { color: T.blue,  bg: "rgba(37,99,235,.14)",  icon: Icons.info },
};

const Toast = ({ toast, onClose }) => {
  const theme = toastTheme[toast.type] || toastTheme.info;
  const duration = toast.duration ?? 4000;
  const [paused, setPaused] = useState(false);
  const elapsedRef = useRef(0);
  const startRef = useRef(Date.now());

  React.useEffect(() => {
    if (paused) return;
    startRef.current = Date.now() - elapsedRef.current;
    const timer = setTimeout(() => onClose(toast.id), Math.max(0, duration - elapsedRef.current));
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.95, transition: { duration: 0.18 } }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => { elapsedRef.current = Date.now() - startRef.current; setPaused(true); }}
      onMouseLeave={() => setPaused(false)}
      style={{
        position: "relative",
        width: 340,
        maxWidth: "calc(100vw - 32px)",
        background: T.cardGrad,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        boxShadow: "0 18px 40px rgba(0,0,0,.45)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        overflow: "hidden",
        pointerEvents: "auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 14px 14px 16px" }}>
        <div style={{
          flexShrink: 0, width: 30, height: 30, borderRadius: 10,
          background: theme.bg, color: theme.color,
          display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1,
        }}>
          <Icon d={theme.icon} size={15} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: T.text, fontWeight: 700, fontSize: 13.5, lineHeight: 1.35 }}>{toast.title}</div>
          {toast.message && (
            <div style={{ color: T.sub, fontSize: 12, marginTop: 3, lineHeight: 1.4 }}>{toast.message}</div>
          )}
        </div>
        <button
          onClick={() => onClose(toast.id)}
          style={{ background: "transparent", border: "none", color: T.sub, cursor: "pointer", padding: 2, flexShrink: 0, display: "flex" }}
          aria-label="Dismiss notification"
        >
          <Icon d={Icons.x} size={14} />
        </button>
      </div>
      <div style={{ height: 3, background: "rgba(255,255,255,.06)", position: "relative", overflow: "hidden" }}>
        <motion.div
          key={paused ? "paused" : "running"}
          initial={{ width: paused ? `${100 - (elapsedRef.current / duration) * 100}%` : "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: (duration - elapsedRef.current) / 1000, ease: "linear" }}
          style={{ height: "100%", background: theme.color }}
        />
      </div>
    </motion.div>
  );
};

const ToastStack = ({ toasts, onClose }) => (
  <div
    style={{
      position: "fixed", top: 20, right: 20, zIndex: 2000,
      display: "flex", flexDirection: "column", gap: 10,
      pointerEvents: "none",
    }}
  >
    <AnimatePresence>
      {toasts.map(t => <Toast key={t.id} toast={t} onClose={onClose} />)}
    </AnimatePresence>
  </div>
);

/* ════════════════════════════════════════════════════════════════════════
   CONFIRMATION DIALOG
   ════════════════════════════════════════════════════════════════════════ */
const confirmTheme = {
  default: { color: T.blue, bg: "rgba(37,99,235,.12)", icon: Icons.info },
  danger:  { color: T.red,  bg: "rgba(239,68,68,.12)", icon: Icons.alertTriangle },
  warning: { color: T.yellow, bg: "rgba(250,204,21,.12)", icon: Icons.alertTriangle },
  success: { color: T.green, bg: "rgba(16,185,129,.12)", icon: Icons.checkCircle },
};

const ConfirmModal = ({ request, onResolve }) => {
  if (!request) return null;
  const theme = confirmTheme[request.tone || "default"];
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    if (request.onConfirm) {
      setBusy(true);
      try {
        await request.onConfirm();
        onResolve(true);
      } catch (e) {
        onResolve(false);
      } finally {
        setBusy(false);
      }
    } else {
      onResolve(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={() => !busy && onResolve(false)}
      style={{
        position: "fixed", inset: 0, zIndex: 2100,
        background: "rgba(2,6,23,.72)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 8 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 420,
          background: T.cardGrad, border: `1px solid ${T.border}`,
          borderRadius: 22, padding: 28,
          boxShadow: "0 32px 80px rgba(0,0,0,.6)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div style={{
          width: 50, height: 50, borderRadius: 14, background: theme.bg, color: theme.color,
          display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18,
        }}>
          <Icon d={theme.icon} size={22} />
        </div>
        <h3 style={{ color: T.text, fontSize: 17.5, fontWeight: 800, margin: "0 0 8px" }}>{request.title}</h3>
        <p style={{ color: T.sub, fontSize: 13.5, lineHeight: 1.55, margin: 0 }}>{request.description}</p>

        <div style={{ display: "flex", gap: 10, marginTop: 26 }}>
          <button
            onClick={() => onResolve(false)}
            disabled={busy}
            style={{
              flex: 1, padding: "12px", borderRadius: 14, border: `1px solid ${T.border}`,
              background: "transparent", color: T.sub, cursor: busy ? "default" : "pointer",
              fontWeight: 600, fontSize: 13.5, opacity: busy ? 0.5 : 1,
            }}
          >
            {request.cancelLabel || "Cancel"}
          </button>
          <button
            onClick={handleConfirm}
            disabled={busy}
            style={{
              flex: 1.3, padding: "12px", borderRadius: 14, border: "none",
              background: busy ? "rgba(255,255,255,.08)" : `linear-gradient(135deg, ${theme.color}, ${theme.color}CC)`,
              color: busy ? T.sub : (request.tone === "warning" ? "#1A1A1A" : "#FFF"),
              cursor: busy ? "default" : "pointer", fontWeight: 700, fontSize: 13.5,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all .2s",
            }}
          >
            {busy && <Spinner size={14} color={T.sub} />}
            {busy ? "Working…" : (request.confirmLabel || "Confirm")}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ════════════════════════════════════════════════════════════════════════
   ERROR MODAL (with retry)
   ════════════════════════════════════════════════════════════════════════ */
const errorIconFor = (kind) => {
  if (kind === "connection") return Icons.wifiOff;
  if (kind === "timeout") return Icons.refresh;
  return Icons.alertTriangle;
};

const ErrorModal = ({ request, onResolve }) => {
  if (!request) return null;
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    if (!request.onRetry) { onResolve(false); return; }
    setRetrying(true);
    try {
      await request.onRetry();
      onResolve(true);
    } catch (e) {
      setRetrying(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: "fixed", inset: 0, zIndex: 2100,
        background: "rgba(2,6,23,.78)", backdropFilter: "blur(5px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: "100%", maxWidth: 440, textAlign: "center",
          background: T.cardGrad, border: `1px solid ${T.border}`,
          borderRadius: 24, padding: "36px 30px",
          boxShadow: "0 32px 80px rgba(0,0,0,.6)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div style={{
          width: 64, height: 64, borderRadius: 18, background: "rgba(239,68,68,.12)", color: T.red,
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px",
        }}>
          <Icon d={errorIconFor(request.kind)} size={28} />
        </div>
        <h3 style={{ color: T.text, fontSize: 18.5, fontWeight: 800, margin: "0 0 10px" }}>{request.title}</h3>
        <p style={{ color: T.sub, fontSize: 13.5, lineHeight: 1.6, margin: "0 0 4px" }}>{request.message}</p>
        {request.detail && (
          <p style={{ color: "rgba(148,163,184,.7)", fontSize: 11.5, lineHeight: 1.5, margin: "10px 0 0", fontFamily: "monospace" }}>
            {request.detail}
          </p>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 26 }}>
          <button
            onClick={() => onResolve(false)}
            disabled={retrying}
            style={{
              flex: 1, padding: "12px", borderRadius: 14, border: `1px solid ${T.border}`,
              background: "transparent", color: T.sub, cursor: retrying ? "default" : "pointer",
              fontWeight: 600, fontSize: 13.5, opacity: retrying ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          {request.onRetry && (
            <button
              onClick={handleRetry}
              disabled={retrying}
              style={{
                flex: 1.3, padding: "12px", borderRadius: 14, border: "none",
                background: retrying ? "rgba(255,255,255,.08)" : "linear-gradient(135deg,#2563EB,#1D4ED8)",
                color: "#FFF", cursor: retrying ? "default" : "pointer", fontWeight: 700, fontSize: 13.5,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {retrying && <Spinner size={14} color="#FFF" />}
              {retrying ? "Retrying…" : "Retry"}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ════════════════════════════════════════════════════════════════════════
   SUCCESS CELEBRATION OVERLAY
   ════════════════════════════════════════════════════════════════════════ */
const SuccessBurst = ({ request, onDone }) => {
  React.useEffect(() => {
    const t = setTimeout(onDone, 1400);
    return () => clearTimeout(t);
  }, [onDone]);

  const particles = useRef(
    Array.from({ length: 10 }, (_, i) => ({
      angle: (i / 10) * Math.PI * 2,
      dist: 36 + (i % 3) * 10,
    }))
  ).current;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 2200,
        display: "flex", alignItems: "center", justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
        style={{ position: "relative" }}
      >
        <div style={{
          width: 84, height: 84, borderRadius: "50%",
          background: "rgba(16,185,129,.14)", border: `2px solid ${T.green}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: T.green, boxShadow: "0 0 0 8px rgba(16,185,129,.08)",
        }}>
          <Icon d={Icons.check} size={36} strokeWidth={3} />
        </div>
        {particles.map((p, i) => (
          <motion.span
            key={i}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(p.angle) * p.dist, y: Math.sin(p.angle) * p.dist, opacity: 0, scale: 0.3 }}
            transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
            style={{
              position: "absolute", top: "50%", left: "50%", width: 6, height: 6, borderRadius: "50%",
              background: i % 2 === 0 ? T.green : T.yellow,
            }}
          />
        ))}
        {request?.label && (
          <div style={{
            position: "absolute", top: "calc(100% + 14px)", left: "50%", transform: "translateX(-50%)",
            color: T.text, fontWeight: 700, fontSize: 13.5, whiteSpace: "nowrap",
          }}>
            {request.label}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

/* ════════════════════════════════════════════════════════════════════════
   SPINNER
   ════════════════════════════════════════════════════════════════════════ */
const Spinner = ({ size = 18, color = T.blue, thickness = 2.5 }) => (
  <motion.div
    animate={{ rotate: 360 }}
    transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
    style={{
      width: size, height: size, borderRadius: "50%",
      border: `${thickness}px solid rgba(255,255,255,.12)`,
      borderTopColor: color,
      flexShrink: 0,
    }}
  />
);

/* ════════════════════════════════════════════════════════════════════════
   PROVIDER
   ════════════════════════════════════════════════════════════════════════ */
function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmRequest, setConfirmRequest] = useState(null);
  const [errorRequest, setErrorRequest] = useState(null);
  const [successRequest, setSuccessRequest] = useState(null);
  const resolverRef = useRef(null);

  const closeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const pushToast = useCallback((type, title, message, opts = {}) => {
    const toast = { id: nextId(), type, title, message, duration: opts.duration };
    setToasts(prev => [...prev, toast]);
    return toast.id;
  }, []);

  const toast = {
    success: (title, message, opts) => pushToast("success", title, message, opts),
    error: (title, message, opts) => pushToast("error", title, message, opts),
    warning: (title, message, opts) => pushToast("warning", title, message, opts),
    info: (title, message, opts) => pushToast("info", title, message, opts),
    dismiss: closeToast,
  };

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setConfirmRequest(options);
    });
  }, []);

  const resolveConfirm = useCallback((result) => {
    setConfirmRequest(null);
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  }, []);

  const showError = useCallback((options) => {
    setErrorRequest(options);
  }, []);

  const resolveError = useCallback(async (retried) => {
    if (!retried) setErrorRequest(null);
    else setErrorRequest(null);
  }, []);

  const celebrate = useCallback((label) => {
    setSuccessRequest({ label });
  }, []);

  const value = { toast, confirm, showError, celebrate };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <ToastStack toasts={toasts} onClose={closeToast} />
      <AnimatePresence>
        {confirmRequest && <ConfirmModal key="confirm" request={confirmRequest} onResolve={resolveConfirm} />}
      </AnimatePresence>
      <AnimatePresence>
        {errorRequest && <ErrorModal key="error" request={errorRequest} onResolve={resolveError} />}
      </AnimatePresence>
      <AnimatePresence>
        {successRequest && <SuccessBurst key="success" request={successRequest} onDone={() => setSuccessRequest(null)} />}
      </AnimatePresence>
    </NotificationContext.Provider>
  );
}


/* ════════════════════════════════════════════════════════════════════════
   NOTIFICATION BELL + PANEL
   Built entirely from job_logs rows already fetched elsewhere — no new
   tables, no schema changes.
   ════════════════════════════════════════════════════════════════════════ */
/* ── classify a job_logs.action string into icon/color/title ─────────── */
const classify = (action = "") => {
  const a = action.toLowerCase();
  if (a.includes("cancel")) return { icon: Icons.xCircle, color: T.red, title: "Appointment Cancelled" };
  if (a.includes("complet")) return { icon: Icons.checkCircle, color: T.green, title: "Job Completed" };
  if (a.includes("start")) return { icon: Icons.zap, color: T.yellow, title: "Technician Started Job" };
  if (a.includes("accept")) return { icon: Icons.userCheck, color: "#60A5FA", title: "Technician Accepted Job" };
  if (a.includes("assign")) return { icon: Icons.userCheck, color: T.blue, title: "Technician Assigned" };
  if (a.includes("qc") || a.includes("approve")) return { icon: Icons.shield, color: T.purple, title: "QC Approved" };
  if (a.includes("note")) return { icon: Icons.fileText, color: T.yellow, title: "Manager Added Note" };
  if (a.includes("status")) return { icon: Icons.activity, color: T.blue, title: "Status Changed" };
  return { icon: Icons.activity, color: T.sub, title: action || "Activity" };
};

const relativeTime = (iso) => {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

/**
 * Builds a notification feed entirely from job_logs rows that are already
 * fetched elsewhere in the dashboard. No new tables, no schema changes.
 */
function buildNotifications(jobLogs = [], appointmentsById = {}) {
  return jobLogs.map(log => {
    const cfg = classify(log.action);
    const appt = appointmentsById[log.appointment_id];
    return {
      id: log.id,
      icon: cfg.icon,
      color: cfg.color,
      title: cfg.title,
      description: appt ? `${appt.full_name} — ${appt.service_type || "Service"}` : (log.action || ""),
      time: log.created_at,
      read: false,
    };
  });
}

const NotificationRow = ({ item, onClick }) => (
  <motion.div
    layout
    initial={{ opacity: 0, x: 8 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, height: 0 }}
    onClick={onClick}
    style={{
      display: "flex", gap: 12, padding: "12px 16px", cursor: "pointer",
      borderBottom: `1px solid ${T.border}`, transition: "background .15s",
      position: "relative",
    }}
    whileHover={{ backgroundColor: "rgba(255,255,255,.025)" }}
  >
    {!item.read && (
      <span style={{
        position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)",
        width: 6, height: 6, borderRadius: "50%", background: T.blue,
      }} />
    )}
    <div style={{
      width: 34, height: 34, borderRadius: 10, flexShrink: 0,
      background: `${item.color}1F`, color: item.color,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <Icon d={item.icon} size={15} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <span style={{ color: T.text, fontSize: 13, fontWeight: 700 }}>{item.title}</span>
        <span style={{ color: T.sub, fontSize: 10.5, whiteSpace: "nowrap", flexShrink: 0, marginTop: 1 }}>
          {relativeTime(item.time)}
        </span>
      </div>
      <div style={{ color: T.sub, fontSize: 12, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {item.description}
      </div>
    </div>
  </motion.div>
);

function NotificationBell({ jobLogs = [], appointmentsById = {}, onSelect }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [readIds, setReadIds] = useState(() => new Set());
  const [clearedIds, setClearedIds] = useState(() => new Set());

  const notifications = useMemo(
    () => buildNotifications(jobLogs, appointmentsById)
      .filter(n => !clearedIds.has(n.id))
      .map(n => ({ ...n, read: readIds.has(n.id) })),
    [jobLogs, appointmentsById, readIds, clearedIds]
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return notifications;
    const q = query.toLowerCase();
    return notifications.filter(n => n.title.toLowerCase().includes(q) || n.description.toLowerCase().includes(q));
  }, [notifications, query]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => setReadIds(new Set(notifications.map(n => n.id)));
  const clearAll = () => setClearedIds(new Set([...clearedIds, ...notifications.map(n => n.id)]));

  const handleRowClick = (item) => {
    setReadIds(prev => new Set(prev).add(item.id));
    if (onSelect) onSelect(item);
  };

  return (
    <div style={{ position: "relative" }}>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(o => !o)}
        style={{
          position: "relative", background: "rgba(255,255,255,.04)", border: `1px solid ${T.border}`,
          color: T.sub, borderRadius: 12, padding: "9px 11px", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
        aria-label="Notifications"
      >
        <Icon d={Icons.bell} size={15} />
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8,
            background: T.red, color: "#FFF", fontSize: 9.5, fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px",
            border: "2px solid #020617",
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              style={{ position: "fixed", inset: 0, zIndex: 1500 }}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "absolute", top: "calc(100% + 10px)", right: 0, zIndex: 1501,
                width: 360, maxWidth: "calc(100vw - 32px)",
                background: T.cardGrad, border: `1px solid ${T.border}`,
                borderRadius: 18, boxShadow: "0 28px 60px rgba(0,0,0,.55)",
                backdropFilter: "blur(20px)", overflow: "hidden",
              }}
            >
              <div style={{ padding: "14px 16px", borderBottom: `1px solid ${T.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h4 style={{ margin: 0, color: T.text, fontSize: 14, fontWeight: 800 }}>Notifications</h4>
                  <button onClick={() => setOpen(false)} style={{ background: "transparent", border: "none", color: T.sub, cursor: "pointer", display: "flex" }}>
                    <Icon d={Icons.x} size={16} />
                  </button>
                </div>
                <div style={{ position: "relative", marginTop: 10 }}>
                  <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.sub }}>
                    <Icon d={Icons.search} size={12} />
                  </div>
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search notifications…"
                    style={{
                      width: "100%", background: "rgba(255,255,255,.03)", border: `1px solid ${T.border}`,
                      borderRadius: 10, padding: "7px 10px 7px 28px", color: T.text, fontSize: 12, outline: "none",
                    }}
                  />
                </div>
                <div style={{ display: "flex", gap: 14, marginTop: 10 }}>
                  <button onClick={markAllRead} style={{ background: "transparent", border: "none", color: T.blue, fontSize: 11.5, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: 0 }}>
                    <Icon d={Icons.checkDouble} size={12} />Mark All Read
                  </button>
                  <button onClick={clearAll} style={{ background: "transparent", border: "none", color: T.sub, fontSize: 11.5, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: 0 }}>
                    <Icon d={Icons.trash} size={12} />Clear All
                  </button>
                </div>
              </div>

              <div style={{ maxHeight: 360, overflowY: "auto" }}>
                {filtered.length === 0 ? (
                  <EmptyState icon={Icons.bell} title="No Notifications" message="You're all caught up." compact />
                ) : (
                  <AnimatePresence initial={false}>
                    {filtered.map(item => (
                      <NotificationRow key={item.id} item={item} onClick={() => handleRowClick(item)} />
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   LOCALHOST DEVELOPER PANEL
   Replaces console.log() with a floating panel, visible on localhost only.
   ════════════════════════════════════════════════════════════════════════ */
const DEV_T = {
  card: "rgba(2,6,23,.92)",
  border: "rgba(255,255,255,.08)",
  blue: "#60A5FA",
  green: "#34D399",
  yellow: "#FACC15",
  red: "#F87171",
  text: "#E2E8F0",
  sub: "#64748B",
};

const isLocalhost = () => {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h.endsWith(".local");
};

const levelColor = { info: DEV_T.blue, success: DEV_T.green, warn: DEV_T.yellow, error: DEV_T.red };
const levelPrefix = { info: "›", success: "✓", warn: "!", error: "✕" };

const DevPanelContext = createContext(null);

const useDevLog = () => {
  const ctx = useContext(DevPanelContext);
  // Outside the provider (or in production), degrade to a no-op so call
  // sites never need to branch on environment themselves.
  return ctx || { info: () => {}, success: () => {}, warn: () => {}, error: () => {} };
};

let logId = 0;

function DevPanelProvider({ children }) {
  const enabled = useRef(isLocalhost()).current;
  const [logs, setLogs] = useState([]);
  const [open, setOpen] = useState(true);
  const [minimized, setMinimized] = useState(false);

  const push = useCallback((level, message) => {
    if (!enabled) return;
    setLogs(prev => [...prev.slice(-49), { id: logId++, level, message, time: new Date() }]);
  }, [enabled]);

  const api = {
    info: (msg) => push("info", msg),
    success: (msg) => push("success", msg),
    warn: (msg) => push("warn", msg),
    error: (msg) => push("error", msg),
  };

  if (!enabled) {
    return <DevPanelContext.Provider value={api}>{children}</DevPanelContext.Provider>;
  }

  return (
    <DevPanelContext.Provider value={api}>
      {children}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: "fixed", bottom: 16, left: 16, zIndex: 3000,
              width: minimized ? 200 : 340, maxWidth: "calc(100vw - 32px)",
              background: DEV_T.card, border: `1px solid ${DEV_T.border}`,
              borderRadius: 14, boxShadow: "0 20px 50px rgba(0,0,0,.6)",
              backdropFilter: "blur(16px)", fontFamily: "'SF Mono', 'Fira Code', monospace",
              overflow: "hidden",
            }}
          >
            <div
              onClick={() => setMinimized(m => !m)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 12px", borderBottom: minimized ? "none" : `1px solid ${DEV_T.border}`,
                cursor: "pointer", background: "rgba(255,255,255,.02)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: DEV_T.green, display: "inline-block", boxShadow: `0 0 6px ${DEV_T.green}` }} />
                <span style={{ color: DEV_T.text, fontSize: 11, fontWeight: 700, letterSpacing: ".03em" }}>DEV PANEL</span>
                <span style={{ color: DEV_T.sub, fontSize: 9.5 }}>localhost</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setLogs([]); }}
                  style={{ background: "transparent", border: "none", color: DEV_T.sub, fontSize: 10, cursor: "pointer", padding: 0 }}
                >clear</button>
                <button
                  onClick={(e) => { e.stopPropagation(); setOpen(false); }}
                  style={{ background: "transparent", border: "none", color: DEV_T.sub, fontSize: 10, cursor: "pointer", padding: 0 }}
                >hide</button>
              </div>
            </div>
            {!minimized && (
              <div style={{ maxHeight: 220, overflowY: "auto", padding: "8px 10px" }}>
                {logs.length === 0 ? (
                  <div style={{ color: DEV_T.sub, fontSize: 11, padding: "10px 2px" }}>Waiting for activity…</div>
                ) : (
                  logs.map(l => (
                    <div key={l.id} style={{ display: "flex", gap: 7, fontSize: 11, padding: "3px 0", lineHeight: 1.5 }}>
                      <span style={{ color: levelColor[l.level], flexShrink: 0, fontWeight: 700 }}>{levelPrefix[l.level]}</span>
                      <span style={{ color: DEV_T.sub, flexShrink: 0 }}>
                        {l.time.toLocaleTimeString(undefined, { hour12: false })}
                      </span>
                      <span style={{ color: DEV_T.text, wordBreak: "break-word" }}>{l.message}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: "fixed", bottom: 16, left: 16, zIndex: 3000,
            background: DEV_T.card, border: `1px solid ${DEV_T.border}`, color: DEV_T.sub,
            borderRadius: 10, padding: "6px 10px", fontSize: 10, fontFamily: "monospace",
            cursor: "pointer", backdropFilter: "blur(16px)",
          }}
        >
          show dev panel
        </button>
      )}
    </DevPanelContext.Provider>
  );
}


/* ════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT (inner) — wrapped at the bottom of the file with the
   NotificationProvider / DevPanelProvider so it can call useNotify() / useDevLog().
   ════════════════════════════════════════════════════════════════════════ */
function DispatchingViewInner() {
  const notify = useNotify();
  const devLog = useDevLog();

  const [appointments, setAppointments] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [viewMode, setViewMode] = useState("list");

  const [assignTarget, setAssignTarget] = useState(null);
  const [detailsJob, setDetailsJob] = useState(null);
  const [relatedData, setRelatedData] = useState({ serviceReports: [], jobPhotos: [], jobLogs: [] });
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [allJobLogs, setAllJobLogs] = useState([]);
  // Assignment Experience: briefly highlights the technician a job was just
  // routed to, so the manager's eye follows the action to the tech panel.
  const [justAssignedTechId, setJustAssignedTechId] = useState(null);
  const techPanelRef = useRef(null);

  /* ── Data loading (business logic unchanged; console.* swapped for the
         dev panel, and load failures surface a proper error modal) ─────── */
  useEffect(() => {
    loadData();
    devLog.info("Connecting to Supabase realtime channel…");
    const channel = supabase
      .channel("dispatch-test")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => {
        devLog.info("Realtime update received — refreshing appointments");
        loadData({ silent: true });
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") devLog.success("Connected to Supabase realtime");
      });
    return () => {
      supabase.removeChannel(channel);
      devLog.info("Disconnected from realtime channel");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    devLog.info("Loading appointments…");
    devLog.info("Fetching technicians…");

    const [appointmentsRes, techniciansRes] = await Promise.all([
      supabase.from("appointments").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").eq("role", "technician"),
    ]);

    if (appointmentsRes.error || techniciansRes.error) {
      const err = appointmentsRes.error || techniciansRes.error;
      devLog.error(`Load failed: ${err.message}`);
      if (!silent) setLoading(false);
      notify.showError({
        kind: "connection",
        title: "Unable to Load Appointments",
        message: "We couldn't reach the dispatch database. Check your connection and try again.",
        detail: err.message,
        onRetry: () => loadData(),
      });
      return;
    }

    setAppointments(appointmentsRes.data || []);
    setTechnicians(techniciansRes.data || []);
    if (!silent) setLoading(false);
    devLog.success(`Loaded ${appointmentsRes.data?.length ?? 0} appointments, ${techniciansRes.data?.length ?? 0} technicians`);
    if (silent) notify.toast.info("Data Refreshed", "The dispatch board just updated.", { duration: 2200 });

    // Best-effort load of recent activity for the sidebar feed / notification bell.
    try {
      const logsRes = await supabase
        .from("job_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (!logsRes.error) setAllJobLogs(logsRes.data || []);
    } catch (e) {
      // job_logs table may not be reachable in all environments; fail silently for the feed only.
      devLog.warn("job_logs feed unavailable — sidebar activity will be empty");
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await loadData();
    notify.toast.success("Data Refreshed", "Dispatch board is up to date.");
    setRefreshing(false);
  };

  const assignTechnician = async (appointmentId, technicianId) => {
    const job = appointments.find(a => a.id === appointmentId);
    const tech = technicians.find(t => t.id === technicianId);
    const isReassign = !!job?.technician_id;

    devLog.info(`${isReassign ? "Reassigning" : "Assigning"} ${tech ? `${tech.first_name} ${tech.last_name}` : technicianId} → ${job?.full_name || appointmentId}`);

    const { error } = await supabase
      .from("appointments")
      .update({ technician_id: technicianId, status: "assigned", assigned_at: new Date().toISOString() })
      .eq("id", appointmentId);

    if (error) {
      devLog.error(`Assignment failed: ${error.message}`);
      notify.showError({
        title: "Unable to Save Changes",
        message: "The technician assignment couldn't be saved.",
        detail: error.message,
        onRetry: () => assignTechnician(appointmentId, technicianId),
      });
      return;
    }

    devLog.success("Assignment successful");
    notify.toast.success(
      "Technician Assigned Successfully",
      tech ? `${tech.first_name} ${tech.last_name} is on the way to ${job?.full_name || "the job"}.` : undefined
    );
    notify.celebrate(isReassign ? "Reassigned" : "Assigned");

    // Draw the eye toward the Technician Command Panel: scroll it into view
    // and pulse the receiving technician's card for a moment.
    setJustAssignedTechId(technicianId);
    techPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => setJustAssignedTechId(null), 1800);

    loadData({ silent: true });
  };

  const PRIORITY_RANK = { emergency: 0, high: 1, medium: 2, low: 3 };
  const handleQuickAssign = async (tech) => {
    const candidates = appointments
      .filter(a => (a.status || "").toLowerCase() === "pending")
      .sort((a, b) => {
        const pr = (PRIORITY_RANK[(a.priority || "").toLowerCase()] ?? 9) - (PRIORITY_RANK[(b.priority || "").toLowerCase()] ?? 9);
        if (pr !== 0) return pr;
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      });
    const job = candidates[0];
    if (!job) {
      notify.toast.info("No Pending Jobs", "There's nothing waiting in the dispatch queue right now.");
      return;
    }
    const name = `${tech.first_name || ""} ${tech.last_name || ""}`.trim();
    const ok = await notify.confirm({
      title: "Assign Technician",
      description: `${name} will be assigned to ${job.full_name}'s ${job.service_type || "job"} — the highest priority pending job. They'll be notified immediately.`,
      confirmLabel: "Assign",
      tone: "default",
    });
    if (!ok) return;
    assignTechnician(job.id, tech.id);
  };

  const getTechnician = (id) => technicians.find(t => t.id === id) || null;
  const getTechnicianName = (id) => {
    const tech = getTechnician(id);
    if (!tech) return "Unassigned";
    return `${tech.first_name || ""} ${tech.last_name || ""}`.trim();
  };

  const appointmentsById = useMemo(() => {
    const map = {};
    appointments.forEach(a => { map[a.id] = a; });
    return map;
  }, [appointments]);

  /* ── Load drawer-related records on demand (read-only, additive) ───── */
  const openDetails = async (job) => {
    setDetailsJob(job);
    setRelatedLoading(true);
    setRelatedData({ serviceReports: [], jobPhotos: [], jobLogs: [] });
    devLog.info(`Loading job details for ${job.full_name}…`);
    try {
      const [reportsRes, photosRes, logsRes] = await Promise.all([
        supabase.from("service_reports").select("*").eq("appointment_id", job.id),
        supabase.from("job_photos").select("*").eq("appointment_id", job.id),
        supabase.from("job_logs").select("*").eq("appointment_id", job.id).order("created_at", { ascending: false }),
      ]);
      setRelatedData({
        serviceReports: reportsRes.error ? [] : (reportsRes.data || []),
        jobPhotos: photosRes.error ? [] : (photosRes.data || []),
        jobLogs: logsRes.error ? [] : (logsRes.data || []),
      });
      devLog.success("Job details loaded");
    } catch (e) {
      // If related tables aren't reachable, the drawer still shows core appointment fields.
      devLog.warn("Some job detail records could not be loaded");
      notify.toast.warning("Some Details Unavailable", "Core job info is shown; extra records couldn't load.");
    } finally {
      setRelatedLoading(false);
    }
  };

  /* ── Operations Summary — exactly the 5 numbers a dispatcher needs ───── */
  const kpis = useMemo(() => {
    const today = new Date().toDateString();
    return {
      pending: appointments.filter(a => (a.status || "").toLowerCase() === "pending").length,
      active: appointments.filter(a => ["assigned", "travelling", "arrived", "working"].includes((a.status || "").toLowerCase())).length,
      qcPending: appointments.filter(a => (a.qc_status || "").toLowerCase() === "pending" || ((a.status || "").toLowerCase() === "completed" && !a.qc_status)).length,
      completed: appointments.filter(a => (a.status || "").toLowerCase() === "completed" && new Date(a.completed_at || a.created_at || 0).toDateString() === today).length,
      available: technicians.length,
    };
  }, [appointments, technicians]);

  /* ── Filtering — status & priority only; no search, no date pills ────── */
  const filtered = useMemo(() => {
    return appointments.filter(j => {
      if (statusFilter !== "all" && (j.status || "").toLowerCase() !== statusFilter) return false;
      if (priorityFilter !== "all" && (j.priority || "").toLowerCase() !== priorityFilter) return false;
      return true;
    });
  }, [appointments, statusFilter, priorityFilter]);

  const kpiData = [
    { label: "Pending Dispatch",   value: kpis.pending,   sub: "awaiting assignment", color: T.sub,     icon: Icons.clock },
    { label: "Active Jobs",        value: kpis.active,    sub: "in the field",        color: "#A78BFA", icon: Icons.zap },
    { label: "Waiting QC",         value: kpis.qcPending, sub: "needs review",        color: T.yellow,  icon: Icons.shield },
    { label: "Completed Today",    value: kpis.completed, sub: "closed out today",    color: T.green,   icon: Icons.checkCircle },
    { label: "Available Techs",    value: kpis.available, sub: "ready to dispatch",   color: T.blue,    icon: Icons.briefcase },
  ];

  const statusPills = ["all", "pending", "assigned", "travelling", "arrived", "working", "completed", "cancelled"];
  const priorityPills = ["all", "emergency", "high", "medium", "low"];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Inter',system-ui,-apple-system,sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 3px; }
        input::placeholder { color: #475569; }
        select option { background: #0B1120; color: #FFFFFF; }
      `}</style>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div style={{
        borderBottom: `1px solid ${T.border}`,
        background: "rgba(2,6,23,.85)",
        backdropFilter: "blur(16px)",
        padding: "0 24px",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ maxWidth: 1480, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", height: 68 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ background: "linear-gradient(135deg,#2563EB,#1D4ED8)", borderRadius: 12, padding: 9, display: "flex", boxShadow: "0 4px 16px rgba(37,99,235,.35)" }}>
              <Icon d={Icons.zap} size={18} style={{ color: "#FFF" }} />
            </div>
            <div>
              <h1 style={{ color: T.text, fontWeight: 800, fontSize: 19, margin: 0, letterSpacing: "-.02em" }}>Dispatch Operations Center</h1>
              <p style={{ color: T.sub, fontSize: 11, margin: 0, letterSpacing: ".05em", textTransform: "uppercase" }}>Real-time field service command center</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ color: T.sub, fontSize: 12.5 }}>{filtered.length} jobs in view</span>
            <NotificationBell
              jobLogs={allJobLogs}
              appointmentsById={appointmentsById}
              onSelect={(item) => {
                const job = appointments.find(a => allJobLogs.find(l => l.id === item.id)?.appointment_id === a.id);
                if (job) openDetails(job);
              }}
            />
            <motion.button
              whileHover={{ scale: refreshing ? 1 : 1.03 }}
              whileTap={{ scale: refreshing ? 1 : 0.96 }}
              onClick={handleManualRefresh}
              disabled={refreshing}
              style={{
                background: "rgba(255,255,255,.04)", border: `1px solid ${T.border}`, color: T.sub,
                borderRadius: 12, padding: "9px 16px", cursor: refreshing ? "default" : "pointer",
                display: "flex", alignItems: "center", gap: 7,
                fontSize: 13, fontWeight: 600, opacity: refreshing ? 0.7 : 1,
              }}
            >
              {refreshing ? <Spinner size={13} color={T.sub} /> : <Icon d={Icons.refresh} size={13} />}
              {refreshing ? "Refreshing…" : "Refresh"}
            </motion.button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1480, margin: "0 auto", padding: "26px 24px 100px" }}>

        {/* ── Operations Intelligence Panel ─────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 22 }}>
          {kpiData.map((k, i) => <KPICard key={k.label} {...k} index={i} />)}
        </div>

        {/* ── Dispatch Workspace ─────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2 style={{ color: T.text, fontSize: 15, fontWeight: 800, margin: 0, letterSpacing: "-.01em" }}>Dispatch Workspace</h2>
            <span style={{ color: T.sub, fontSize: 12 }}>· {filtered.length} of {appointments.length}</span>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {statusPills.map(s => (
                <button key={s} onClick={() => setStatusFilter(s)} style={{
                  background: statusFilter === s ? "rgba(37,99,235,.15)" : "rgba(255,255,255,.02)",
                  border: `1px solid ${statusFilter === s ? T.blue : T.border}`,
                  color: statusFilter === s ? T.blue : T.sub,
                  borderRadius: 20, padding: "5px 12px", fontSize: 11.5, fontWeight: 600,
                  cursor: "pointer", textTransform: "capitalize", transition: "all .2s",
                }}>
                  {s === "all" ? "All Status" : s}
                </button>
              ))}
            </div>
            <div style={{ width: 1, height: 18, background: T.border }} />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {priorityPills.map(p => {
                const cfg = priorityConfig[p];
                return (
                  <button key={p} onClick={() => setPriorityFilter(p)} style={{
                    background: priorityFilter === p ? (cfg ? cfg.bg : "rgba(250,204,21,.1)") : "rgba(255,255,255,.02)",
                    border: `1px solid ${priorityFilter === p ? (cfg?.color || T.yellow) : T.border}`,
                    color: priorityFilter === p ? (cfg?.color || T.yellow) : T.sub,
                    borderRadius: 20, padding: "5px 12px", fontSize: 11.5, fontWeight: 600,
                    cursor: "pointer", textTransform: "capitalize", transition: "all .2s",
                  }}>
                    {p === "all" ? "All Priority" : cfg?.label || p}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,.02)", borderRadius: 12, padding: 4, border: `1px solid ${T.border}` }}>
              {[{ id: "list", icon: Icons.list }, { id: "kanban", icon: Icons.grid }].map(v => (
                <button key={v.id} onClick={() => setViewMode(v.id)} style={{
                  background: viewMode === v.id ? "rgba(37,99,235,.18)" : "transparent",
                  border: "none", color: viewMode === v.id ? T.blue : T.sub,
                  borderRadius: 9, padding: "6px 10px", cursor: "pointer", transition: "all .2s",
                  display: "flex", alignItems: "center",
                }}>
                  <Icon d={v.icon} size={13} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <Skeleton />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Icons.checkCircle}
            title="No Jobs Found"
            message={
              statusFilter !== "all" || priorityFilter !== "all"
                ? "Try adjusting your status or priority filters."
                : "Everything is assigned. Great work!"
            }
            actionLabel={statusFilter !== "all" || priorityFilter !== "all" ? "Clear Filters" : undefined}
            onAction={statusFilter !== "all" || priorityFilter !== "all" ? () => {
              setStatusFilter("all"); setPriorityFilter("all");
            } : undefined}
          />
        ) : viewMode === "list" ? (
          <div style={{ display: "grid", gap: 14 }}>
            <AnimatePresence>
              {filtered.map((job, i) => (
                <DispatchCard
                  key={job.id}
                  job={job}
                  index={i}
                  technicians={technicians}
                  getTechnician={getTechnician}
                  onAssign={setAssignTarget}
                  onViewDetails={openDetails}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <KanbanBoard
            appointments={filtered}
            technicians={technicians}
            getTechnician={getTechnician}
            onAssign={setAssignTarget}
            onViewDetails={openDetails}
          />
        )}

        {/* ── Technician Command Panel ───────────────────────────────── */}
        <div ref={techPanelRef} style={{ marginTop: 34 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <h2 style={{ color: T.text, fontSize: 15, fontWeight: 800, margin: 0, letterSpacing: "-.01em" }}>Technician Command Panel</h2>
            <span style={{ color: T.sub, fontSize: 12 }}>· {technicians.length} on roster</span>
          </div>
          {technicians.length === 0 ? (
            <EmptyState icon={Icons.user} title="No Technicians Yet" message="Add technicians to start dispatching jobs." />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
              {technicians.map((tech, i) => (
                <TechnicianCard
                  key={tech.id}
                  tech={tech}
                  appointments={appointments}
                  index={i}
                  highlighted={justAssignedTechId === tech.id}
                  onAssign={handleQuickAssign}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Modals / Drawer ──────────────────────────────────────────── */}
      <AnimatePresence>
        {assignTarget && (
          <AssignModal
            job={assignTarget}
            technicians={technicians}
            onClose={() => setAssignTarget(null)}
            onAssign={assignTechnician}
            notify={notify}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detailsJob && (
          <DetailsDrawer
            job={detailsJob}
            technicians={technicians}
            getTechnician={getTechnician}
            getTechnicianName={getTechnicianName}
            related={relatedLoading ? { serviceReports: [], jobPhotos: [], jobLogs: [] } : relatedData}
            onClose={() => setDetailsJob(null)}
            onAssign={(job) => { setDetailsJob(null); setAssignTarget(job); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function DispatchingView() {
  return (
    <DevPanelProvider>
      <NotificationProvider>
        <DispatchingViewInner />
      </NotificationProvider>
    </DevPanelProvider>
  );
}
