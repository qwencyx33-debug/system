import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Polyline, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Navigation, Phone, MapPin, Briefcase, Camera, X, Menu,
  Wifi, WifiOff, Satellite, Clock, ChevronRight, CheckCircle2,
  Circle as CircleIcon, ImageOff, FileText, ClipboardCheck,
  CreditCard, AlertTriangle, Radar, Wrench, ImageIcon
} from 'lucide-react';

/* ============================================================================
   DESIGN TOKENS — Deep Navy + Premium Gold only.
   Status accents are intentionally desaturated so they read as "tactical"
   rather than introducing bright/rainbow colors. Urgent stays true red
   because that is a safety signal, not a decorative color.
============================================================================ */
const TOKENS = {
  bgVoid: '#02060F',        // very dark background
  navy: '#0B1B3A',          // deep navy (panels)
  navyLight: '#122548',     // deep navy, lighter surface
  slate: '#7C8AA8',         // neutral slate text
  slateDim: '#4A5578',
  gold: '#E8B93E',          // premium yellow/gold — primary accent
  goldSoft: 'rgba(232,185,62,0.16)',
  goldGlow: 'rgba(232,185,62,0.55)',
  hairline: 'rgba(255,255,255,0.07)',
  urgent: '#E5484D',
};

const STATUS_THEME = {
  pending:     { label: 'Pending',    color: '#5B7CA8', glow: 'rgba(91,124,168,0.55)' },
  assigned:    { label: 'Assigned',   color: TOKENS.gold, glow: TOKENS.goldGlow },
  in_progress: { label: 'Working',    color: '#C9862A', glow: 'rgba(201,134,42,0.55)' },
  working:     { label: 'Working',    color: '#C9862A', glow: 'rgba(201,134,42,0.55)' },
  completed:   { label: 'Completed',  color: '#5FA37A', glow: 'rgba(95,163,122,0.55)' },
  urgent:      { label: 'Urgent',     color: TOKENS.urgent, glow: 'rgba(229,72,77,0.65)' },
};

const getStatusTheme = (status, priority) => {
  if (priority?.toLowerCase() === 'urgent' || status?.toLowerCase() === 'urgent') return STATUS_THEME.urgent;
  return STATUS_THEME[status?.toLowerCase()] || STATUS_THEME.pending;
};

/* Known, real mission stages. Completion is derived only from data that
   actually exists — never fabricated. */
const STAGE_DEFS = [
  { key: 'assigned',         label: 'Mission Assigned' },
  { key: 'accepted',         label: 'Accepted' },
  { key: 'traveling',        label: 'Travelling' },
  { key: 'arrived',          label: 'Arrived' },
  { key: 'working',          label: 'Working' },
  { key: 'photos_uploaded',  label: 'Photos Uploaded' },
  { key: 'report_submitted', label: 'Report Submitted' },
  { key: 'qc',               label: 'QC Review' },
  { key: 'completed',        label: 'Mission Complete' },
];

/* ============================================================================
   HELPERS
============================================================================ */

// Real distance calc (haversine) — no invented ETA/route data.
function distanceKm(lat1, lon1, lat2, lon2) {
  if ([lat1, lon1, lat2, lon2].some((v) => v === undefined || v === null)) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatClock(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function safeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/* Derive real timeline progress from existing fields + job_logs only. */
function deriveStages(appointment, jobLogs = []) {
  const findLog = (type) => jobLogs.find((l) => l.type?.toLowerCase() === type);

  const evidence = {
    assigned: { done: true, at: appointment?.schedule_date || null },
    accepted: { done: !!findLog('accepted') || (appointment?.status && appointment.status !== 'pending'), at: findLog('accepted')?.created_at },
    traveling: { done: !!findLog('traveling'), at: findLog('traveling')?.created_at },
    arrived: { done: !!findLog('arrived'), at: findLog('arrived')?.created_at },
    working: { done: !!appointment?.started_at || !!findLog('working'), at: appointment?.started_at || findLog('working')?.created_at },
    photos_uploaded: { done: (appointment?.job_photos?.length || 0) > 0, at: null },
    report_submitted: { done: (appointment?.service_reports?.length || 0) > 0, at: null },
    qc: { done: !!appointment?.qc_status && appointment.qc_status.toLowerCase() !== 'pending', at: null },
    completed: { done: !!appointment?.completed_at, at: appointment?.completed_at },
  };

  return STAGE_DEFS.map((s) => ({ ...s, ...evidence[s.key] }));
}

/* ============================================================================
   MAP ICONS
============================================================================ */

const buildCustomerIcon = (status, priority, isSelected) => {
  const theme = getStatusTheme(status, priority);
  const size = isSelected ? 26 : 16;
  const isUrgent = priority?.toLowerCase() === 'urgent' || status?.toLowerCase() === 'urgent';
  return new L.DivIcon({
    className: 'mission-node-icon',
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;width:44px;height:44px;">
        ${isUrgent ? `<div style="position:absolute;width:38px;height:38px;border-radius:9999px;border:1.5px solid ${theme.color};animation:nodePing 1.8s cubic-bezier(0,0,0.2,1) infinite;"></div>` : ''}
        <div style="
          width:${size}px;height:${size}px;background:${theme.color};
          border:2px solid rgba(2,6,15,0.9);border-radius:6px;
          box-shadow:0 0 ${isSelected ? 22 : 12}px ${theme.glow};
          transform:rotate(45deg);
          transition:width .35s cubic-bezier(.2,.9,.3,1.3),height .35s cubic-bezier(.2,.9,.3,1.3);
        "></div>
      </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
};

const buildTechnicianIcon = (heading = 0) => new L.DivIcon({
  className: 'technician-icon',
  html: `
    <div style="position:relative;width:52px;height:52px;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;width:52px;height:52px;border-radius:9999px;background:${TOKENS.goldGlow};filter:blur(6px);animation:techBreathe 3.2s ease-in-out infinite;"></div>
      <div style="position:absolute;width:34px;height:34px;border-radius:9999px;border:1px solid rgba(232,185,62,0.55);animation:techPulseRing 2.4s ease-out infinite;"></div>
      <div style="
        width:18px;height:18px;border-radius:9999px;background:${TOKENS.gold};
        border:2px solid #02060F;box-shadow:0 0 14px ${TOKENS.goldGlow};
        transform:rotate(${heading}deg);position:relative;z-index:2;
        transition:transform .6s cubic-bezier(.3,.7,.4,1);">
        <div style="position:absolute;top:-9px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-bottom:7px solid ${TOKENS.gold};"></div>
      </div>
    </div>`,
  iconSize: [52, 52],
  iconAnchor: [26, 26],
});

/* Recenters the map with a smooth fly animation when the mission focus changes. */
const MapFocus = memo(({ target }) => {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, Math.max(map.getZoom(), 14), { duration: 1.1 });
  }, [target, map]);
  return null;
});

/* ============================================================================
   SMALL PRESENTATIONAL PIECES
============================================================================ */

const HudChip = memo(({ icon, label, value, tone = 'slate' }) => (
  <div className="flex items-center gap-2.5">
    <span className={tone === 'gold' ? 'text-[#E8B93E]' : tone === 'red' ? 'text-[#E5484D]' : 'text-[#7C8AA8]'}>{icon}</span>
    <div className="leading-none">
      <p className="text-[8px] font-bold uppercase tracking-widest text-[#4A5578]">{label}</p>
      <p className="text-[11px] font-black text-white mt-1">{value}</p>
    </div>
  </div>
));

const MagneticButton = memo(({ children, onClick, tone = 'ghost', disabled, icon }) => {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const styles = {
    gold: 'bg-[#E8B93E] text-[#0B1B3A]',
    ghost: 'bg-white/[0.04] text-white border border-white/10',
    danger: 'bg-transparent text-[#E5484D] border border-[#E5484D]/30',
  };
  return (
    <motion.button
      disabled={disabled}
      onClick={onClick}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setPos({ x: (e.clientX - r.left - r.width / 2) * 0.15, y: (e.clientY - r.top - r.height / 2) * 0.3 });
      }}
      onMouseLeave={() => setPos({ x: 0, y: 0 })}
      animate={{ x: pos.x, y: pos.y }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-[11px] tracking-widest transition-opacity shadow-lg ${styles[tone]} ${disabled ? 'opacity-30 cursor-not-allowed' : 'hover:opacity-90'}`}
    >
      {icon} {children}
    </motion.button>
  );
});

const InfoTile = memo(({ label, value, icon }) => (
  <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] p-4 flex flex-col gap-1.5">
    <div className="flex items-center gap-2 text-[#E8B93E]">{icon}<span className="text-[8px] font-black uppercase tracking-widest text-[#4A5578]">{label}</span></div>
    <p className="text-[12px] font-bold text-white truncate">{value || '—'}</p>
  </div>
));

const SectionLabel = memo(({ children }) => (
  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#4A5578] mb-3 px-1">{children}</p>
));

/* Empty state — used whenever real data is simply not there yet. */
const EmptyState = memo(({ icon, title, subtitle }) => (
  <div className="flex flex-col items-center justify-center text-center py-10 px-6">
    <div className="relative w-16 h-16 mb-5 flex items-center justify-center">
      <div className="absolute inset-0 rounded-full border border-[#E8B93E]/20 animate-[nodePing_2.4s_ease-out_infinite]" />
      <div className="w-12 h-12 rounded-2xl bg-[#E8B93E]/10 border border-[#E8B93E]/20 flex items-center justify-center text-[#E8B93E]">{icon}</div>
    </div>
    <p className="text-[12px] font-black uppercase tracking-widest text-white">{title}</p>
    <p className="text-[10px] font-bold text-[#4A5578] mt-2 max-w-[220px]">{subtitle}</p>
  </div>
));

/* ============================================================================
   MISSION TIMELINE (draws on, doesn't fabricate progress)
============================================================================ */
const MissionTimeline = memo(({ stages }) => (
  <div className="relative pl-1">
    {stages.map((s, i) => {
      const isLast = i === stages.length - 1;
      return (
        <div key={s.key} className="relative flex gap-4 pb-6 last:pb-0">
          {!isLast && (
            <div className="absolute left-[9px] top-5 bottom-0 w-[2px] bg-white/[0.06] overflow-hidden rounded-full">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: s.done ? '100%' : '0%' }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="w-full bg-[#E8B93E]"
              />
            </div>
          )}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.04 }}
            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${s.done ? 'bg-[#E8B93E] border-[#E8B93E]' : 'bg-transparent border-white/15'}`}
          >
            {s.done && <CheckCircle2 size={12} className="text-[#0B1B3A]" strokeWidth={3} />}
          </motion.div>
          <div className="pt-[1px]">
            <p className={`text-[11px] font-black uppercase tracking-wide ${s.done ? 'text-white' : 'text-[#4A5578]'}`}>{s.label}</p>
            {s.at && <p className="text-[9px] font-bold text-[#4A5578] mt-0.5">{safeDate(s.at)?.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>}
          </div>
        </div>
      );
    })}
  </div>
));

/* ============================================================================
   MISSION PANEL (right side dossier)
============================================================================ */
const MissionPanel = memo(({ appointment, technicianLocation, onClose, actions }) => {
  const theme = getStatusTheme(appointment.status, appointment.priority);
  const stages = useMemo(() => deriveStages(appointment, appointment.job_logs), [appointment]);
  const dist = distanceKm(technicianLocation?.lat, technicianLocation?.lng, appointment.lat, appointment.lng);

  const photos = appointment.job_photos || [];
  const reports = appointment.service_reports || [];
  const qcReports = appointment.qc_reports || [];

  const stageKeyDone = (key) => stages.find((s) => s.key === key)?.done;

  return (
    <motion.aside
      initial={{ x: 420, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 420, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 240, damping: 28 }}
      className="absolute top-6 bottom-6 right-6 w-full max-w-[420px] bg-[#080F22]/95 backdrop-blur-2xl rounded-[2rem] border border-white/[0.08] z-20 shadow-[-40px_0_80px_rgba(0,0,0,0.55)] flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="px-7 pt-7 pb-5 border-b border-white/[0.06] flex items-start justify-between shrink-0">
        <div>
          <span className="text-[9px] font-black uppercase tracking-[0.35em]" style={{ color: theme.color }}>{theme.label}</span>
          <h3 className="text-xl font-black text-white tracking-tight mt-1.5 leading-tight">{appointment.full_name || 'Unnamed Customer'}</h3>
          <p className="text-[11px] font-semibold text-[#7C8AA8] mt-1 flex items-center gap-1.5">
            <MapPin size={12} /> {appointment.address || 'No address on file'}
          </p>
        </div>
        <button onClick={onClose} className="p-2.5 rounded-full text-[#4A5578] hover:text-white hover:bg-white/5 transition-colors shrink-0">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-7 py-6 space-y-8" style={{ scrollbarWidth: 'thin' }}>
        {/* Location / distance */}
        <div className="grid grid-cols-2 gap-3">
          <InfoTile label="Distance" icon={<Navigation size={13} />} value={dist !== null ? `${dist.toFixed(1)} km` : 'No GPS fix'} />
          <InfoTile label="Service" icon={<Wrench size={13} />} value={appointment.service_type} />
          <InfoTile label="Schedule" icon={<Clock size={13} />} value={appointment.schedule_date ? `${appointment.schedule_date} ${appointment.appointment_time || ''}`.trim() : '—'} />
          <InfoTile label="Priority" icon={<AlertTriangle size={13} />} value={appointment.priority} />
        </div>

        {/* Manager brief */}
        {appointment.manager_notes && (
          <div>
            <SectionLabel>Manager Brief</SectionLabel>
            <div className="bg-[#E8B93E]/[0.06] border border-[#E8B93E]/15 rounded-2xl p-4 text-[11px] font-medium text-[#D9DEEA] leading-relaxed">
              {appointment.manager_notes}
            </div>
          </div>
        )}

        {/* Service info */}
        {(appointment.materials_notes || appointment.requires_survey) && (
          <div>
            <SectionLabel>Service Information</SectionLabel>
            <div className="space-y-2">
              {appointment.materials_notes && (
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 text-[11px] font-medium text-[#D9DEEA]">
                  {appointment.materials_notes}
                </div>
              )}
              {appointment.requires_survey && (
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#E8B93E] bg-[#E8B93E]/10 rounded-xl px-3 py-2 w-fit">
                  <ClipboardCheck size={13} /> Survey Required
                </div>
              )}
            </div>
          </div>
        )}

        {/* Operational controls — every action defers to real callback props */}
        <div>
          <SectionLabel>Operational Controls</SectionLabel>
          <div className="space-y-2.5">
            <MagneticButton tone="ghost" icon={<Phone size={16} />} onClick={() => actions.onCall?.(appointment)}>
              Contact Customer
            </MagneticButton>
            <MagneticButton
              tone="gold"
              icon={<Navigation size={16} />}
              disabled={!appointment.lat || !appointment.lng}
              onClick={() => actions.onNavigate?.(appointment)}
            >
              Start Navigation
            </MagneticButton>
            {!stageKeyDone('working') ? (
              <MagneticButton tone="ghost" icon={<Briefcase size={16} />} onClick={() => actions.onStartWork?.(appointment)}>
                Start Work
              </MagneticButton>
            ) : !stageKeyDone('report_submitted') ? (
              <MagneticButton tone="ghost" icon={<Camera size={16} />} onClick={() => actions.onUploadPhoto?.(appointment)}>
                Upload Photos
              </MagneticButton>
            ) : null}
            {stageKeyDone('working') && !stageKeyDone('report_submitted') && (
              <MagneticButton tone="ghost" icon={<FileText size={16} />} onClick={() => actions.onSubmitReport?.(appointment)}>
                Submit Report
              </MagneticButton>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div>
          <SectionLabel>Mission Timeline</SectionLabel>
          <MissionTimeline stages={stages} />
        </div>

        {/* Service report */}
        <div>
          <SectionLabel>Service Report</SectionLabel>
          {reports.length ? (
            <div className="space-y-2">
              {reports.map((r) => (
                <div key={r.id} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
                  <p className="text-[11px] font-medium text-[#D9DEEA] leading-relaxed">{r.summary || r.notes || 'Report on file.'}</p>
                  {r.created_at && <p className="text-[9px] font-bold text-[#4A5578] mt-2">{safeDate(r.created_at)?.toLocaleDateString()}</p>}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<FileText size={20} />} title="No Report Yet" subtitle="A service report will appear here once submitted." />
          )}
        </div>

        {/* Photo gallery */}
        <div>
          <SectionLabel>Photo Gallery</SectionLabel>
          {photos.length ? (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((p) => (
                <motion.div
                  key={p.id}
                  whileHover={{ scale: 1.05 }}
                  className="aspect-square rounded-xl overflow-hidden bg-white/[0.04] border border-white/[0.06]"
                >
                  <img src={p.url} alt={p.caption || 'Job photo'} className="w-full h-full object-cover" />
                </motion.div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<ImageOff size={20} />} title="No Photos Uploaded" subtitle="Field photos will appear here once captured." />
          )}
        </div>

        {/* QC + payment */}
        <div className="grid grid-cols-2 gap-3 pb-2">
          <InfoTile label="QC Status" icon={<ClipboardCheck size={13} />} value={appointment.qc_status || 'Pending'} />
          <InfoTile label="Payment" icon={<CreditCard size={13} />} value={appointment.payment_status || 'Pending'} />
        </div>
        {qcReports.length > 0 && (
          <div className="space-y-2 -mt-4">
            {qcReports.map((q) => (
              <div key={q.id} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 text-[11px] font-medium text-[#D9DEEA]">
                {q.notes || 'QC note on file.'}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.aside>
  );
});

/* ============================================================================
   MAIN COMPONENT
============================================================================
   Props (all real, all optional — the UI degrades gracefully rather than
   inventing data):

   appointments: Array<{
     id, full_name, address, lat, lng, service_type, schedule_date,
     appointment_time, priority, status, manager_notes, payment_status,
     qc_status, started_at, completed_at, requires_survey, materials_notes,
     job_logs: [{ id, type, created_at }],
     job_photos: [{ id, url, caption }],
     service_reports: [{ id, summary, notes, created_at }],
     qc_reports: [{ id, notes }],
   }>
   technicianLocation: { lat, lng, heading }
   onCall, onNavigate, onStartWork, onUploadPhoto, onSubmitReport, onAccept
   emergencyContactNumber: string
============================================================================ */
const TacticalMissionCenter = ({
  appointments = [],
  technicianLocation = null,
  onCall,
  onNavigate,
  onStartWork,
  onUploadPhoto,
  onSubmitReport,
  onAccept,
  emergencyContactNumber,
}) => {
  const [selectedId, setSelectedId] = useState(null);
  const [now, setNow] = useState(new Date());
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const selected = useMemo(() => appointments.find((a) => a.id === selectedId) || null, [appointments, selectedId]);

  const todaysMissions = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return appointments.filter((a) => (a.schedule_date || '').slice(0, 10) === todayStr);
  }, [appointments]);

  const currentMission = useMemo(
    () => appointments.find((a) => a.started_at && !a.completed_at) || null,
    [appointments]
  );

  const mapCenter = useMemo(() => {
    if (technicianLocation?.lat) return [technicianLocation.lat, technicianLocation.lng];
    const withCoords = appointments.find((a) => a.lat && a.lng);
    return withCoords ? [withCoords.lat, withCoords.lng] : [14.5995, 120.9842];
  }, [technicianLocation, appointments]);

  const focusTarget = selected?.lat ? [selected.lat, selected.lng] : null;

  const actions = useMemo(
    () => ({ onCall, onNavigate, onStartWork, onUploadPhoto, onSubmitReport, onAccept }),
    [onCall, onNavigate, onStartWork, onUploadPhoto, onSubmitReport, onAccept]
  );

  const handleSelect = useCallback((id) => setSelectedId((cur) => (cur === id ? cur : id)), []);
  const handleClose = useCallback(() => setSelectedId(null), []);

  const hasAppointments = appointments.length > 0;

  return (
    <div className="relative h-screen w-full overflow-hidden text-slate-200" style={{ background: TOKENS.bgVoid }}>
      <style>{`
        @keyframes nodePing { 0% { opacity:.9; transform:scale(0.6);} 75%,100% { opacity:0; transform:scale(1.6);} }
        @keyframes techBreathe { 0%,100% { opacity:.55; transform:scale(1);} 50% { opacity:.9; transform:scale(1.15);} }
        @keyframes techPulseRing { 0% { opacity:.9; transform:scale(0.7);} 100% { opacity:0; transform:scale(1.9);} }
        @keyframes radarSweep { to { transform: rotate(360deg); } }
        .leaflet-container { background: ${TOKENS.bgVoid} !important; }
        .radar-sweep {
          position:absolute; inset:0; pointer-events:none; z-index:1;
          background: conic-gradient(from 0deg, rgba(232,185,62,0.10), transparent 40%);
          animation: radarSweep 6s linear infinite;
          mix-blend-mode: screen; opacity: 0.5;
        }
      `}</style>

      {/* MAP LAYER */}
      <div className="absolute inset-0 z-0">
        <MapContainer center={mapCenter} zoom={13} className="h-full w-full" zoomControl={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          <MapFocus target={focusTarget} />

          {selected?.lat && (
            <Circle
              center={[selected.lat, selected.lng]}
              radius={350}
              pathOptions={{ color: getStatusTheme(selected.status, selected.priority).color, weight: 1, fillOpacity: 0.05, opacity: 0.35 }}
            />
          )}

          {technicianLocation?.lat && selected?.lat && (
            <Polyline
              positions={[[technicianLocation.lat, technicianLocation.lng], [selected.lat, selected.lng]]}
              pathOptions={{ color: TOKENS.gold, weight: 2, opacity: 0.45, dashArray: '2 8' }}
            />
          )}

          {technicianLocation?.lat && (
            <Marker position={[technicianLocation.lat, technicianLocation.lng]} icon={buildTechnicianIcon(technicianLocation.heading)} />
          )}

          {appointments.filter((a) => a.lat && a.lng).map((a) => (
            <Marker
              key={a.id}
              position={[a.lat, a.lng]}
              icon={buildCustomerIcon(a.status, a.priority, selectedId === a.id)}
              eventHandlers={{ click: () => handleSelect(a.id) }}
            />
          ))}

          <ZoomControl position="bottomright" />
        </MapContainer>
        <div className="radar-sweep" />
      </div>

      {/* TOP BAR */}
      <header className="absolute top-6 left-6 right-6 z-10 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto bg-[#080F22]/85 backdrop-blur-xl px-6 py-4 rounded-[1.75rem] border border-white/[0.08] shadow-2xl flex items-center gap-4">
          <div className="bg-[#E8B93E] p-2.5 rounded-xl">
            <Shield size={19} className="text-[#0B1B3A]" />
          </div>
          <div>
            <h1 className="text-[11px] font-black tracking-[0.25em] uppercase text-white leading-none">Mission Center</h1>
            <p className="text-[8px] font-bold text-[#4A5578] mt-1 uppercase tracking-widest">Field Technician Console</p>
          </div>
        </div>

        <div className="pointer-events-auto bg-[#080F22]/85 backdrop-blur-xl px-6 py-4 rounded-[1.75rem] border border-white/[0.08] flex items-center gap-6 shadow-2xl">
          <HudChip icon={<Clock size={14} />} label="Time" value={formatClock(now)} />
          <div className="w-px h-7 bg-white/[0.08]" />
          <HudChip icon={online ? <Wifi size={14} /> : <WifiOff size={14} />} label="Network" value={online ? 'Online' : 'Offline'} tone={online ? 'gold' : 'red'} />
          <div className="w-px h-7 bg-white/[0.08]" />
          <HudChip icon={<Satellite size={14} />} label="GPS" value={technicianLocation?.lat ? 'Locked' : 'No Fix'} tone={technicianLocation?.lat ? 'gold' : 'red'} />
        </div>
      </header>

      {/* RIGHT MISSION PANEL */}
      <AnimatePresence>
        {selected && (
          <MissionPanel key={selected.id} appointment={selected} technicianLocation={technicianLocation} onClose={handleClose} actions={actions} />
        )}
      </AnimatePresence>

      {/* No appointments at all */}
      {!hasAppointments && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="bg-[#080F22]/85 backdrop-blur-xl rounded-[2rem] border border-white/[0.08] px-10">
            <EmptyState icon={<Radar size={22} />} title="Waiting for Dispatch" subtitle="No assigned customers yet. New missions will appear here the moment they're scheduled." />
          </div>
        </div>
      )}

      {/* BOTTOM HUD */}
      <footer className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 w-[min(92vw,780px)]">
        <div className="bg-[#080F22]/90 backdrop-blur-2xl rounded-[1.75rem] border border-white/[0.08] shadow-2xl px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <HudChip icon={<Briefcase size={14} />} label="Today" value={`${todaysMissions.length} Mission${todaysMissions.length === 1 ? '' : 's'}`} />
          <div className="w-px h-7 bg-white/[0.08] hidden sm:block" />
          <div className="flex-1 min-w-[140px]">
            {currentMission ? (
              <button onClick={() => handleSelect(currentMission.id)} className="flex items-center gap-2 text-left">
                <div className="w-2 h-2 rounded-full bg-[#E8B93E] animate-pulse shrink-0" />
                <div className="leading-none">
                  <p className="text-[8px] font-black uppercase tracking-widest text-[#4A5578]">Current Mission</p>
                  <p className="text-[11px] font-black text-white mt-1 truncate max-w-[160px]">{currentMission.full_name}</p>
                </div>
                <ChevronRight size={14} className="text-[#4A5578] shrink-0" />
              </button>
            ) : (
              <div className="leading-none">
                <p className="text-[8px] font-black uppercase tracking-widest text-[#4A5578]">Current Mission</p>
                <p className="text-[11px] font-black text-[#7C8AA8] mt-1">No Active Mission</p>
              </div>
            )}
          </div>
          <div className="w-px h-7 bg-white/[0.08] hidden sm:block" />
          <div className="flex items-center gap-2">
            <button
              disabled={!currentMission?.lat}
              onClick={() => currentMission && actions.onNavigate?.(currentMission)}
              className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#E8B93E] hover:bg-white/[0.08] transition-colors disabled:opacity-30"
              title="Quick Navigation"
            >
              <Navigation size={16} />
            </button>
            <a
              href={emergencyContactNumber ? `tel:${emergencyContactNumber}` : undefined}
              className={`p-3 rounded-xl bg-transparent border border-[#E5484D]/30 text-[#E5484D] hover:bg-[#E5484D]/10 transition-colors ${!emergencyContactNumber ? 'opacity-30 pointer-events-none' : ''}`}
              title="Emergency Contact"
            >
              <Phone size={16} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default memo(TacticalMissionCenter);
