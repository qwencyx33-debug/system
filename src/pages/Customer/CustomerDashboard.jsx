import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import {
  ShieldCheck, PlusCircle, Clock, ChevronRight, Bell,
  Calendar, LayoutGrid, Settings, CreditCard, History, LogOut,
  ArrowLeft, CheckCircle2, X, Headphones, FileText,
  ChevronDown, CheckCheck, Star,
  MapPin, Wallet, UserCheck, Wrench, Truck, Hammer,
  Image as ImageIcon, ChevronLeft, ChevronRight as ChevronRightIcon,
  LifeBuoy, HelpCircle, MessageCircle, PhoneCall, BookOpen,
  ClipboardList, Timer, Flag, Activity, ExternalLink, Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import ProfileSettings from './ProfileSettings';
import RequestService from './RequestService';
import ServiceLogs from './ServiceLogs';


/* ════════════════════════════════════════════════════════════
   DESIGN TOKENS — Yellow + Navy only. Red is reserved for
   errors / cancelled states. No other accent colors are used
   anywhere in this file.
   ════════════════════════════════════════════════════════════ */
const NAVY = {
  deep: '#040810',      // page background
  dark: '#070d1a',      // sidebar / chrome
  mid: '#0a1120',        // panels
  soft: '#101a30',       // elevated panels / hovers
  line: 'rgba(255,255,255,0.07)',
};
const GOLD = '#F2C230'; // single highlight color, used sparingly

/* ─── helpers ───────────────────────────────────────────── */
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const isNegativeStatus = (status) => ['cancelled', 'rejected'].includes((status || '').toLowerCase());
const isDoneStatus = (status) => (status || '').toLowerCase() === 'completed';

/* Status pill — yellow for anything in motion, quiet neutral for
   completed, red only for cancelled/rejected (errors). */
const getStatusStyle = (status) => {
  const s = (status || '').toLowerCase();
  if (isNegativeStatus(s)) return 'border-red-500/30 text-red-400 bg-red-500/10';
  if (isDoneStatus(s)) return 'border-white/15 text-slate-300 bg-white/[0.04]';
  return 'border-amber-400/30 text-amber-300 bg-amber-400/10';
};

const peso = (n) => `₱${Number(n || 0).toLocaleString()}`;

const navItems = [
  { id: 'dashboard', label: 'Overview', icon: LayoutGrid },
  { id: 'request', label: 'Book Service', icon: PlusCircle },
  { id: 'logs', label: 'Service History', icon: History },
  { id: 'profile', label: 'Settings', icon: Settings },
];

const STAGES = [
  { key: 'submitted', label: 'Request Submitted', icon: FileText },
  { key: 'approved', label: 'Manager Approved', icon: UserCheck },
  { key: 'assigned', label: 'Technician Assigned', icon: Wrench },
  { key: 'enroute', label: 'Technician On The Way', icon: Truck },
  { key: 'working', label: 'Work In Progress', icon: Hammer },
  { key: 'qc', label: 'Quality Inspection', icon: ShieldCheck },
  { key: 'done', label: 'Completed', icon: CheckCheck },
];

/* Real-status → stage index. Completed ALWAYS resolves to the
   final stage regardless of any stale started_at/assigned_at
   flags — this is what fixes the "stuck at 67%" bug: status is
   the single source of truth, not intermediate timestamps. */
function deriveStageIndex(appt) {
  const status = (appt.status || '').toLowerCase();
  if (isNegativeStatus(status)) return -1;
  if (status === 'completed') return 6; // always full — never "Work In Progress" again
  if (status === 'quality inspection' || status === 'qc' || appt.qc_status === 'in_review') return 5;
  if (status === 'work in progress' || appt.started_at) return 4;
  if (status === 'technician on the way' || status === 'en route' || status === 'enroute') return 3;
  if (appt.assigned_at || appt.technician_id) return 2;
  if (status === 'approved') return 1;
  return 0;
}

/* Progress percentage derived directly from status, per spec:
   Pending 0 · Approved 15 · Assigned 30 · On The Way 45 ·
   Work In Progress 65 · Quality Inspection 85 · Completed 100 */
function deriveProgressPercent(appt) {
  const status = (appt.status || '').toLowerCase();
  if (isNegativeStatus(status)) return 0;
  if (status === 'completed') return 100;
  const stageIndex = deriveStageIndex(appt);
  const map = [0, 15, 30, 45, 65, 85, 100];
  return map[Math.max(stageIndex, 0)] ?? 0;
}

const fmtTime = (iso) => {
  if (!iso) return null;
  try { return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
  catch { return null; }
};

const fmtDate = (val) => {
  if (!val) return null;
  try { return new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return val; }
};

/* ── Assigned Technician card — hangs off the "assigned" node ── */
const TechnicianCard = ({ technician, appointment }) => {
  if (!technician) return null;
  const initials = `${technician.first_name?.[0] || ''}${technician.last_name?.[0] || ''}`.toUpperCase() || 'T';
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="relative overflow-hidden bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 mt-3 group hover:border-amber-400/25 transition-all"
    >
      <div className="absolute -top-6 -right-6 w-24 h-24 bg-amber-400/10 rounded-full blur-2xl group-hover:bg-amber-400/15 transition-all" />
      <div className="relative z-10 flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-[#140f02] font-black text-sm flex-shrink-0 shadow-lg shadow-amber-500/20 overflow-hidden">
          {technician.avatar_url ? <img src={technician.avatar_url} alt="" className="w-full h-full object-cover" /> : initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{technician.first_name} {technician.last_name}</p>
          <p className="text-[10px] text-slate-500 font-mono truncate">
            Technician · {appointment.service_type}
          </p>
        </div>
        {technician.phone && (
          <a
            href={`tel:${technician.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/25 hover:bg-amber-400/25 transition-colors"
          >
            Contact
          </a>
        )}
      </div>
    </motion.div>
  );
};

/* ── Manager Update card — hangs off "approved" node ─────────── */
const ManagerNoteCard = ({ note }) => {
  if (!note) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative mt-3 rounded-2xl p-4 bg-amber-400/[0.05] border border-amber-400/15 overflow-hidden"
    >
      <p className="relative z-10 text-[9px] font-bold uppercase tracking-[0.2em] text-amber-300/80 mb-1.5">
        Manager Update
      </p>
      <p className="relative z-10 text-sm text-slate-200 leading-relaxed">{note.note}</p>
      <p className="relative z-10 text-[10px] text-slate-500 font-mono mt-2">
        {fmtTime(note.created_at)}
      </p>
    </motion.div>
  );
};

/* ── Quality Inspection — certificate-style card, "qc" node ──── */
const QCCard = ({ qc }) => {
  if (!qc) return null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative mt-3 rounded-2xl p-4 border overflow-hidden ${
        qc.approved ? 'bg-amber-400/[0.05] border-amber-400/25' : 'bg-red-500/[0.06] border-red-500/25'
      }`}
    >
      <div className="absolute inset-3 rounded-xl border border-dashed border-white/[0.06] pointer-events-none" />
      <div className="relative flex items-center gap-3">
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', bounce: 0.5, delay: 0.15 }}
          className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
            qc.approved ? 'bg-amber-400/20 text-amber-300' : 'bg-red-400/20 text-red-300'
          }`}
        >
          {qc.approved ? <ShieldCheck size={16} /> : <X size={16} />}
        </motion.div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white">
            {qc.approved ? 'Inspection Approved' : 'Needs Follow-up'}
          </p>
          {qc.remarks && <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{qc.remarks}</p>}
          {qc.inspector_name && (
            <p className="text-[10px] text-slate-500 font-mono mt-1.5">Inspector · {qc.inspector_name}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/* ── Job Photos gallery — grouped Before/During/After, hangs off "working"/"done" ── */
const PhotoStrip = ({ photos, onOpen }) => {
  if (!photos?.length) return null;
  const groups = ['before', 'during', 'after'];
  const hasGroups = photos.some(p => groups.includes((p.photo_type || '').toLowerCase()));
  return (
    <div className="mt-3">
      {hasGroups && (
        <div className="flex gap-3 mb-2">
          {groups.map(g => {
            const count = photos.filter(p => (p.photo_type || '').toLowerCase() === g).length;
            if (!count) return null;
            return (
              <span key={g} className="text-[9px] font-bold uppercase tracking-widest text-slate-500 capitalize">
                {g} <span className="text-amber-300/80">{count}</span>
              </span>
            );
          })}
        </div>
      )}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-0.5 px-0.5">
        {photos.slice(0, 6).map((p, i) => (
          <motion.button
            key={p.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            whileHover={{ scale: 1.04 }}
            onClick={() => onOpen(i)}
            className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/10 flex-shrink-0 group"
          >
            <img src={p.photo_url} alt={p.photo_type || 'service photo'} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          </motion.button>
        ))}
        {photos.length > 6 && (
          <button
            onClick={() => onOpen(6)}
            className="w-16 h-16 rounded-xl flex-shrink-0 bg-white/5 border border-white/10 flex flex-col items-center justify-center text-slate-400 hover:bg-white/10 transition-colors"
          >
            <ImageIcon size={14} />
            <span className="text-[9px] font-bold mt-0.5">+{photos.length - 6}</span>
          </button>
        )}
      </div>
    </div>
  );
};

/* ── Fullscreen photo lightbox — with swipe support ─────────── */
const PhotoLightbox = ({ photos, index, onClose, onIndexChange }) => {
  const touchStartX = useRef(null);

  useEffect(() => {
    if (index == null) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && index > 0) onIndexChange(index - 1);
      if (e.key === 'ArrowRight' && index < photos.length - 1) onIndexChange(index + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, onClose, onIndexChange, photos.length]);

  if (index == null) return null;
  const photo = photos[index];

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta > 60 && index > 0) onIndexChange(index - 1);
    else if (delta < -60 && index < photos.length - 1) onIndexChange(index + 1);
    touchStartX.current = null;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
        onClick={onClose}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <motion.button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
        >
          <X size={16} />
        </motion.button>
        {index > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); onIndexChange(index - 1); }}
            className="absolute left-3 md:left-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
          >
            <ChevronLeft size={18} />
          </button>
        )}
        {index < photos.length - 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); onIndexChange(index + 1); }}
            className="absolute right-3 md:right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
          >
            <ChevronRightIcon size={18} />
          </button>
        )}
        <motion.img
          key={photo.id}
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          src={photo.photo_url}
          alt={photo.photo_type || 'service photo'}
          onClick={(e) => e.stopPropagation()}
          className="max-h-[85vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl"
        />
        {photo.photo_type && (
          <span className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-widest text-white/70 bg-black/40 px-3 py-1.5 rounded-full capitalize">
            {photo.photo_type}
          </span>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

/* ═════════════════════════════════════════════════════════════
   StatusSpine — one vertical line; each stage hangs its real
   data off the node it belongs to, instead of scattering it
   into separate floating cards. Progress is always derived from
   the live `status` field, so a completed job can never render
   as "Work In Progress" again.
   ═════════════════════════════════════════════════════════════ */
const StatusSpine = ({ appointment, technician, managerNotes = [], qcReport, photos = [] }) => {
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [expanded, setExpanded] = useState(true);

  if (!appointment) return null;

  const currentIndex = deriveStageIndex(appointment);
  const cancelled = currentIndex === -1;
  const completed = isDoneStatus(appointment.status);
  const latestNote = managerNotes[0];

  return (
    <div className={`relative bg-[#080e1c]/80 backdrop-blur-xl border rounded-[1.75rem] p-5 md:p-7 overflow-hidden transition-colors ${
      completed ? 'border-amber-400/25' : 'border-white/[0.08]'
    }`}>
      <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none ${
        completed ? 'bg-amber-400/[0.09]' : 'bg-amber-400/[0.05]'
      }`} />

      <div className="relative z-10 flex items-center justify-between mb-1">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-amber-300/80 mb-1.5 flex items-center gap-1.5">
            {!cancelled && !completed && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
            {completed && <CheckCheck size={11} className="text-amber-400" />}
            {completed ? 'Service Timeline · Completed' : 'Live Service Timeline'}
          </p>
          <h3 className="text-lg font-bold text-white">{appointment.service_type}</h3>
        </div>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors lg:hidden"
        >
          <ChevronDown size={16} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {cancelled ? (
        <div className="mt-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
          This request was {appointment.status}. Contact support if this is unexpected.
        </div>
      ) : (
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-6 relative">
                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-white/8" />
                <motion.div
                  className="absolute left-[15px] top-2 w-px bg-gradient-to-b from-amber-400 to-amber-400/40"
                  initial={{ height: 0 }}
                  animate={{ height: `${(currentIndex / (STAGES.length - 1)) * 100}%` }}
                  transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
                />

                <div className="space-y-1">
                  {STAGES.map((stage, i) => {
                    const done = i < currentIndex || (completed && i <= currentIndex);
                    const active = !completed && i === currentIndex;
                    const Icon = stage.icon;
                    return (
                      <div key={stage.key} className="relative pl-10 pb-5 last:pb-0">
                        <div className={`absolute left-0 top-0 w-[31px] h-[31px] rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                          done ? 'bg-amber-400 border-amber-400' :
                          active ? 'bg-[#0a1322] border-amber-400 shadow-[0_0_14px_rgba(242,194,48,0.45)]' :
                          'bg-[#0a1322] border-white/10'
                        }`}>
                          {done ? <CheckCheck size={13} className="text-[#140f02]" /> : <Icon size={12} className={active ? 'text-amber-300' : 'text-slate-600'} />}
                          {active && (
                            <span className="absolute inset-0 rounded-full border-2 border-amber-400 animate-ping opacity-40" />
                          )}
                        </div>

                        <p className={`text-sm font-semibold pt-1.5 ${done ? 'text-slate-400' : active ? 'text-white' : 'text-slate-600'}`}>
                          {stage.label}
                        </p>

                        {stage.key === 'approved' && latestNote && <ManagerNoteCard note={latestNote} />}
                        {stage.key === 'assigned' && technician && (active || done) && (
                          <TechnicianCard technician={technician} appointment={appointment} />
                        )}
                        {stage.key === 'qc' && qcReport && (active || done) && <QCCard qc={qcReport} />}
                        {stage.key === 'done' && photos.length > 0 && (done || active) && (
                          <PhotoStrip photos={photos} onOpen={setLightboxIndex} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <PhotoLightbox
        photos={photos}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   SERVICE REPORT — appears only once a service_reports row
   exists for the appointment. Fields map 1:1 to the real
   service_reports columns (service_performed, items_used,
   completion_time, technician_name, technician_notes) so
   nothing invented ever shows up.
   ════════════════════════════════════════════════════════════ */
const ServiceReportCard = ({ report }) => {
  if (!report) return null;
  const rows = [
    { label: 'Service Performed', value: report.service_performed },
    { label: 'Materials / Items Used', value: report.items_used },
    { label: 'Technician Notes', value: report.technician_notes },
  ].filter(r => r.value);

  if (rows.length === 0 && !report.completion_time && !report.technician_name) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#080e1c]/80 backdrop-blur-xl border border-white/[0.08] rounded-[1.75rem] p-5 md:p-7"
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300/80 flex items-center gap-2">
          <ClipboardList size={13} className="text-amber-400" /> Service Report
        </h3>
        {report.completion_time && (
          <span className="text-[10px] text-slate-500 font-mono">{report.completion_time}</span>
        )}
      </div>

      <div className="space-y-4">
        {rows.map((r) => (
          <div key={r.label}>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-1.5">{r.label}</p>
            <p className="text-sm text-slate-300 leading-relaxed">{r.value}</p>
          </div>
        ))}
      </div>

      {report.technician_name && (
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-white/[0.06]">
          <UserCheck size={13} className="text-amber-400" />
          <span className="text-xs text-slate-400">Serviced by <span className="text-white font-semibold">{report.technician_name}</span></span>
        </div>
      )}
    </motion.div>
  );
};

/* ════════════════════════════════════════════════════════════
   PAYMENT SUMMARY — small, clean, no oversized widgets.
   Derived only from appointments.price / downpayment_paid /
   payment_status, all already present in the schema.
   ════════════════════════════════════════════════════════════ */
const PaymentSummaryCard = ({ appointment }) => {
  if (!appointment) return null;
  const total = Number(appointment.price || 0);
  const status = (appointment.payment_status || 'pending').toLowerCase();
  const downpayment = Number(appointment.downpayment_paid || 0);
  const paid = status === 'paid' ? total : downpayment;
  const remaining = Math.max(total - paid, 0);

  return (
    <div className="bg-[#080e1c]/80 backdrop-blur-xl border border-white/[0.08] rounded-[1.75rem] p-5">
      <h3 className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300/80 flex items-center gap-2 mb-4">
        <Wallet size={12} className="text-amber-400" /> Payment Summary
      </h3>
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Total</span>
          <motion.span
            key={`total-${total}`}
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            className="text-sm font-bold text-white font-mono"
          >{peso(total)}</motion.span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Paid</span>
          <motion.span
            key={`paid-${paid}`}
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            className="text-sm font-semibold text-slate-300 font-mono"
          >{peso(paid)}</motion.span>
        </div>
        <div className="h-px bg-white/[0.06] my-1" />
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Remaining</span>
          <motion.span
            key={`remaining-${remaining}`}
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            className="text-sm font-bold text-amber-300 font-mono"
          >{peso(remaining)}</motion.span>
        </div>
      </div>
      <div className={`mt-4 inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-full border ${getStatusStyle(status === 'paid' ? 'completed' : 'pending')}`}>
        {status} · {appointment.payment_method || 'COD'}
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   FLOATING HELP BUTTON
   ════════════════════════════════════════════════════════════ */
const HELP_ITEMS = [
  { icon: BookOpen, label: 'Help Center', action: 'help' },
  { icon: HelpCircle, label: 'FAQs', action: 'faq' },
  { icon: MessageCircle, label: 'Contact Support', action: 'support' },
  { icon: PhoneCall, label: 'Emergency Hotline', action: 'hotline' },
];

const FloatingHelp = ({ onAction }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-24 lg:bottom-7 right-5 lg:right-7 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className="absolute bottom-16 right-0 w-56 bg-[#0a1322]/98 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.55)] overflow-hidden"
          >
            {HELP_ITEMS.map(({ icon: Icon, label, action }, i) => (
              <motion.button
                key={action}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => { onAction?.(action); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors border-b border-white/[0.04] last:border-0"
              >
                <Icon size={15} className="text-amber-400" />
                {label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.93 }}
        onClick={() => setOpen((o) => !o)}
        className="w-[52px] h-[52px] rounded-full bg-gradient-to-br from-amber-400 to-amber-500 shadow-lg shadow-amber-500/30 flex items-center justify-center text-[#140f02]"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X size={20} />
            </motion.span>
          ) : (
            <motion.span key="life" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <LifeBuoy size={20} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
};

/* ─── Skeleton (loading state) ──────────────────────────────── */
const Skeleton = ({ className = '' }) => (
  <div
    className={`animate-pulse bg-gradient-to-r from-white/5 via-white/10 to-white/5 rounded-2xl ${className}`}
    style={{ animation: 'shimmer 1.8s infinite', backgroundSize: '200% 100%' }}
  />
);

/* ─── Notification Panel — premium centered dropdown ────────── */
const NotificationPanel = ({ onClose, appointments }) => {
  const pending = appointments.filter(a => ['pending', 'approved'].includes((a.status || '').toLowerCase())).slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.96 }}
      transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
      className="absolute right-0 top-14 w-[340px] bg-[#080e1c]/98 backdrop-blur-3xl border border-white/10 rounded-[1.75rem] shadow-[0_32px_80px_rgba(0,0,0,0.6)] z-50 overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Bell size={13} className="text-amber-400" />
          <span className="text-[11px] font-bold tracking-widest text-white uppercase">Notifications</span>
        </div>
        <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all">
          <X size={11} />
        </button>
      </div>
      <div className="max-h-[320px] overflow-y-auto">
        {pending.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Bell size={28} className="text-slate-700 mx-auto mb-3" />
            <p className="text-[11px] text-slate-500 font-medium">You're all caught up</p>
          </div>
        ) : pending.map((a, i) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="px-5 py-3.5 hover:bg-white/[0.04] transition-colors border-b border-white/[0.04] last:border-0"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-1.5 rounded-lg bg-amber-400/10">
                <Clock size={12} className="text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{a.service_type || 'Service Request'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${getStatusStyle(a.status)}`}>
                    {a.status}
                  </span>
                  <span className="text-[10px] text-slate-600 font-mono">{a.schedule_date || 'TBD'}</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

/* ─── Hero progress ring — yellow only, gold glow + stops
   pulsing once the job is actually complete ─────────────────── */
const ProgressRing = ({ percent = 0, completed = false }) => {
  const r = 38;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      {completed && (
        <motion.div
          className="absolute -inset-2 rounded-full bg-amber-400/25 blur-xl"
          animate={{ opacity: [0.4, 0.75, 0.4] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      <svg viewBox="0 0 96 96" className="relative w-full h-full -rotate-90">
        <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <motion.circle
          cx="48" cy="48" r={r} fill="none" stroke={GOLD} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (percent / 100) * c }}
          transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {completed ? (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.55, delay: 0.3 }}>
            <CheckCircle2 size={26} className="text-amber-300" />
          </motion.div>
        ) : (
          <span className="text-xl font-black text-white tabular-nums">{percent}%</span>
        )}
      </div>
    </div>
  );
};

/* ─── Compact service history row ────────────────────────────── */
const ServiceRow = ({ item, onClick, index = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05, duration: 0.25 }}
    whileHover={{ x: 3 }}
    onClick={onClick}
    className="flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.035] rounded-2xl transition-all group cursor-pointer border border-transparent hover:border-white/[0.06]"
  >
    <div className="flex items-center gap-3.5 min-w-0">
      <div className={`w-8 h-8 flex-shrink-0 rounded-xl flex items-center justify-center ${
        isDoneStatus(item.status) ? 'bg-amber-400/15 text-amber-300' : 'bg-amber-400/10 text-amber-300'
      }`}>
        {isDoneStatus(item.status) ? <CheckCheck size={14} /> : <Activity size={14} />}
      </div>
      <div className="min-w-0">
        <h4 className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors truncate leading-tight">
          {item.service_type || 'Service Request'}
        </h4>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-slate-600 font-mono">{item.schedule_date || 'Date TBD'}</span>
          <span className="text-slate-700">·</span>
          <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md border ${getStatusStyle(item.status)}`}>
            {item.status}
          </span>
        </div>
      </div>
    </div>
    <div className="flex items-center gap-3 flex-shrink-0 ml-3">
      <span className="text-sm font-bold text-white/70 font-mono hidden sm:block">{peso(item.price)}</span>
      <ChevronRight size={14} className="text-slate-700 group-hover:text-amber-400 transition-colors" />
    </div>
  </motion.div>
);

/* ── Recent Service History — compact premium list on the
   dashboard overview, hidden entirely when there's nothing yet ── */
const RecentServiceHistory = ({ items, onOpen }) => {
  if (!items?.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="bg-[#080e1c]/80 backdrop-blur-xl border border-white/[0.08] rounded-[1.75rem] p-3 md:p-4 mt-5"
    >
      <div className="flex items-center justify-between px-3 pt-2 pb-3">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300/80 flex items-center gap-2">
          <History size={12} className="text-amber-400" /> Recent Service History
        </h3>
      </div>
      <div className="space-y-0.5">
        {items.slice(0, 5).map((item, i) => (
          <ServiceRow key={item.id} item={item} index={i} onClick={() => onOpen(item)} />
        ))}
      </div>
    </motion.div>
  );
};

/* ─── Mobile Bottom Nav ─────────────────────────────────── */
const MobileNav = ({ view, setView }) => (
  <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#050a15]/97 backdrop-blur-3xl border-t border-white/[0.06] px-2 pb-safe">
    <div className="flex items-center justify-around py-1.5">
      {navItems.map(({ id, icon: Icon, label }) => {
        const active = view === id;
        return (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`flex flex-col items-center gap-1 py-2 px-3 rounded-2xl transition-all relative ${active ? 'text-amber-300' : 'text-slate-600 hover:text-slate-400'}`}
          >
            {active && (
              <motion.div
                layoutId="mobileNavIndicator"
                className="absolute inset-0 bg-amber-400/10 rounded-2xl border border-amber-400/20"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}
            <Icon size={19} className="relative z-10" />
            <span className="text-[8px] font-bold uppercase tracking-wider relative z-10">{label.split(' ')[0]}</span>
          </button>
        );
      })}
    </div>
  </nav>
);

/* ════════════════════════════════════════════════════════════
   CENTERED MODALS — feedback + notices.
   Replaces every window.alert() / browser confirm() dialog.
   ════════════════════════════════════════════════════════════ */
const FeedbackModal = ({ open, onClose, onSubmit, serviceName }) => {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleSubmit = async () => {
    if (!rating) return;
    setSubmitting(true);
    await onSubmit({ rating, comment });
    setSubmitting(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="relative w-full max-w-sm bg-[#0a1322] border border-white/10 rounded-[1.75rem] p-7 shadow-[0_40px_100px_rgba(0,0,0,0.65)]"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />

            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              <X size={13} />
            </button>

            <div className="relative z-10 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-400/15 border border-amber-400/25 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={22} className="text-amber-300" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Rate Your Experience</h3>
              <p className="text-xs text-slate-500 mb-6">{serviceName || 'Your service'} is complete</p>

              <div className="flex items-center justify-center gap-1.5 mb-6">
                {[1, 2, 3, 4, 5].map((n) => (
                  <motion.button
                    key={n}
                    whileTap={{ scale: 0.85 }}
                    onMouseEnter={() => setHovered(n)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => setRating(n)}
                  >
                    <Star
                      size={30}
                      className={`transition-colors ${
                        n <= (hovered || rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-700'
                      }`}
                    />
                  </motion.button>
                ))}
              </div>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell us about your experience (optional)"
                rows={3}
                className="w-full bg-white/[0.04] border border-white/10 rounded-2xl p-3.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-amber-400/40 focus:ring-2 ring-amber-400/15 resize-none transition-all"
              />

              <motion.button
                whileTap={{ scale: 0.97 }}
                disabled={!rating || submitting}
                onClick={handleSubmit}
                className="w-full mt-5 py-3 rounded-xl font-bold text-sm transition-all bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-[#140f02] shadow-lg shadow-amber-500/25 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting…' : 'Submit Feedback'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const NoticeModal = ({ open, onClose, title, message, tone = 'success' }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const tones = {
    success: { ring: 'border-amber-400/30', glow: 'bg-amber-400/15', icon: '✓', iconBg: 'bg-amber-400/20 text-amber-300' },
    info: { ring: 'border-amber-400/30', glow: 'bg-amber-400/15', icon: 'i', iconBg: 'bg-amber-400/20 text-amber-300' },
    error: { ring: 'border-red-400/30', glow: 'bg-red-400/15', icon: '!', iconBg: 'bg-red-400/20 text-red-300' },
  };
  const t = tones[tone] || tones.success;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-xs bg-[#0a1322] border ${t.ring} rounded-[1.5rem] p-7 text-center shadow-[0_30px_80px_rgba(0,0,0,0.6)]`}
          >
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 ${t.glow} rounded-full blur-3xl pointer-events-none`} />
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', bounce: 0.5, delay: 0.1 }}
              className={`relative z-10 w-12 h-12 rounded-full ${t.iconBg} flex items-center justify-center mx-auto mb-4 font-black text-lg`}
            >
              {t.icon}
            </motion.div>
            <h4 className="relative z-10 text-base font-bold text-white mb-1.5">{title}</h4>
            <p className="relative z-10 text-xs text-slate-400 leading-relaxed">{message}</p>
            <button
              onClick={onClose}
              className="relative z-10 mt-5 w-full py-2.5 rounded-xl bg-amber-400/12 hover:bg-amber-400/20 border border-amber-400/25 text-amber-300 text-xs font-bold transition-colors"
            >
              Got it
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ════════════════════════════════════════════════════════════
   LOGOUT MODAL — confirm → loading → success, all animated,
   zero browser alert()/confirm() calls.
   ════════════════════════════════════════════════════════════ */
const LogoutModal = ({ open, phase, onCancel, onConfirm }) => {
  useEffect(() => {
    if (!open || phase !== 'confirm') return;
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, phase, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={phase === 'confirm' ? onCancel : undefined}
          className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: 'spring', bounce: 0.28, duration: 0.45 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-xs bg-[#0a1322] border border-white/10 rounded-[1.5rem] p-7 text-center shadow-[0_30px_80px_rgba(0,0,0,0.6)] overflow-hidden"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-amber-400/12 rounded-full blur-3xl pointer-events-none" />

            <AnimatePresence mode="wait">
              {phase === 'success' ? (
                <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-10">
                  <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: 'spring', bounce: 0.55, delay: 0.05 }}
                    className="w-14 h-14 rounded-full bg-amber-400/15 border border-amber-400/25 flex items-center justify-center mx-auto mb-4"
                  >
                    <CheckCircle2 size={26} className="text-amber-300" />
                  </motion.div>
                  <h4 className="text-base font-bold text-white mb-1.5">Logged Out Successfully</h4>
                  <p className="text-xs text-slate-400">Thank you for using our service.</p>
                </motion.div>
              ) : (
                <motion.div key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-10">
                  <div className="w-12 h-12 rounded-full bg-amber-400/15 border border-amber-400/25 flex items-center justify-center mx-auto mb-4">
                    <LogOut size={20} className="text-amber-300" />
                  </div>
                  <h4 className="text-base font-bold text-white mb-1.5">Are you sure you want to sign out?</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mb-6">You can log back in anytime.</p>

                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={onCancel}
                      disabled={phase === 'loading'}
                      className="flex-1 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.08] text-xs font-bold uppercase tracking-wide transition-colors disabled:opacity-40"
                    >
                      Cancel
                    </button>
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={onConfirm}
                      disabled={phase === 'loading'}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-[#140f02] text-xs font-bold uppercase tracking-wide transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2"
                    >
                      {phase === 'loading' ? (
                        <motion.span
                          className="w-3.5 h-3.5 rounded-full border-2 border-[#140f02]/30 border-t-[#140f02]"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                        />
                      ) : 'Logout'}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ── Empty active-service state (no bookings at all yet) ─────── */
const NoActiveService = ({ onBook }) => (
  <div className="relative bg-[#080e1c]/80 backdrop-blur-xl border border-white/[0.08] rounded-[2rem] p-8 md:p-12 text-center overflow-hidden">
    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/[0.05] rounded-full blur-3xl pointer-events-none" />
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', bounce: 0.4 }}
      className="relative z-10 w-16 h-16 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mx-auto mb-6"
    >
      <ClipboardList size={26} className="text-amber-400" />
    </motion.div>
    <h3 className="relative z-10 text-xl font-bold text-white mb-2">No Active Service</h3>
    <p className="relative z-10 text-sm text-slate-500 max-w-sm mx-auto mb-7 leading-relaxed">
      You don't have a service in progress right now. Book one whenever you're ready — we'll track it live, right here.
    </p>
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onBook}
      className="relative z-10 inline-flex items-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-[#140f02] rounded-xl font-bold text-sm shadow-lg shadow-amber-500/25 transition-all"
    >
      <PlusCircle size={16} />
      Book a Service
    </motion.button>
  </div>
);

/* ════════════════════════════════════════════════════════════
   AFTER-COMPLETION EXPERIENCE — replaces "No Active Service"
   once the customer has at least one completed appointment and
   nothing currently active. Every field maps to a real column
   on appointments / service_reports; nothing is invented.
   ════════════════════════════════════════════════════════════ */
const CompletedExperience = ({ lastCompleted, technician, report, onViewReport, onBook }) => {
  if (!lastCompleted) return null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="relative overflow-hidden rounded-[2rem] border border-amber-400/20 p-8 md:p-12 text-center"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#0d1a33] via-[#0a1628] to-[#060e1e]" />
      <motion.div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-400/[0.1] rounded-full blur-3xl"
        animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10">
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', bounce: 0.55, delay: 0.1 }}
          className="w-16 h-16 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(242,194,48,0.25)]"
        >
          <Sparkles size={26} className="text-amber-300" />
        </motion.div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-400/12 border border-amber-400/25 rounded-full mb-4">
          <CheckCheck size={12} className="text-amber-300" />
          <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">All Services Completed</span>
        </div>

        <h2 className="text-2xl md:text-3xl font-black text-white mb-1.5">{lastCompleted.service_type}</h2>
        <p className="text-sm text-slate-500 mb-8">Your latest completed service</p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-xl mx-auto mb-8">
          <div className="bg-white/[0.04] rounded-2xl p-3.5 border border-white/[0.06]">
            <p className="text-[9px] font-bold text-amber-300/70 uppercase tracking-widest mb-1.5">Completion Date</p>
            <div className="flex items-center justify-center gap-1.5 text-white font-semibold text-sm">
              <Calendar size={13} className="text-slate-500 flex-shrink-0" />
              <span className="truncate">{fmtDate(lastCompleted.completed_at) || lastCompleted.schedule_date || '—'}</span>
            </div>
          </div>
          <div className="bg-white/[0.04] rounded-2xl p-3.5 border border-white/[0.06]">
            <p className="text-[9px] font-bold text-amber-300/70 uppercase tracking-widest mb-1.5">Completed Time</p>
            <div className="flex items-center justify-center gap-1.5 text-white font-semibold text-sm">
              <Clock size={13} className="text-slate-500 flex-shrink-0" />
              <span className="truncate">{fmtTime(lastCompleted.completed_at) || 'TBD'}</span>
            </div>
          </div>
          {technician && (
            <div className="bg-white/[0.04] rounded-2xl p-3.5 border border-white/[0.06]">
              <p className="text-[9px] font-bold text-amber-300/70 uppercase tracking-widest mb-1.5">Technician</p>
              <div className="flex items-center justify-center gap-1.5 text-white font-semibold text-sm">
                <UserCheck size={13} className="text-slate-500 flex-shrink-0" />
                <span className="truncate">{technician.first_name} {technician.last_name}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {report && (
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={onViewReport}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 hover:text-white text-[12px] font-bold uppercase tracking-wide transition-all"
            >
              <ClipboardList size={14} /> View Service Report
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={onBook}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-[#140f02] rounded-xl font-bold text-[12px] uppercase tracking-wide transition-all shadow-lg shadow-amber-500/25"
          >
            <PlusCircle size={14} /> Book Another Service
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

/* ══════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                            */
/* ══════════════════════════════════════════════════════════ */
const CustomerDashboard = ({ userEmail }) => {
  const [view, setView] = useState('dashboard');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [myAppointments, setMyAppointments] = useState([]);
  const [technicians, setTechnicians] = useState({});       // id -> profile
  const [managerNotes, setManagerNotes] = useState({});      // appointment_id -> [notes]
  const [qcReports, setQcReports] = useState({});            // appointment_id -> report
  const [jobPhotos, setJobPhotos] = useState({});            // appointment_id -> [photos]
  const [serviceReports, setServiceReports] = useState({});  // appointment_id -> report
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [profile, setProfile] = useState({
    first_name: 'User', last_name: '', email: userEmail, phone: '', address: '', avatar_url: null,
  });

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackTarget, setFeedbackTarget] = useState(null);
  const [notice, setNotice] = useState(null); // { title, message, tone }
  const seenCompletedRef = useRef(new Set());

  /* logout: confirm -> loading -> success -> redirect, fully animated */
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutPhase, setLogoutPhase] = useState('confirm'); // 'confirm' | 'loading' | 'success'

  /* ── data fetch — existing tables only, no schema changes ──── */
  const fetchUserData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: profileData } = await supabase
        .from('profiles').select('*').eq('email', userEmail).single();
      if (profileData) setProfile(profileData);

      const userId = profileData?.id;
      if (!userId) { setMyAppointments([]); setLoading(false); return; }

      const { data: appts, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const list = appts || [];
      setMyAppointments(list);

      const apptIds = list.map(a => a.id);
      const techIds = [...new Set(list.map(a => a.technician_id).filter(Boolean))];

      const [techRes, notesRes, qcRes, photosRes, reportsRes] = await Promise.all([
        techIds.length
          ? supabase.from('profiles').select('*').in('id', techIds)
          : Promise.resolve({ data: [] }),
        apptIds.length
          ? supabase.from('manager_notes').select('*').in('appointment_id', apptIds).order('created_at', { ascending: false })
          : Promise.resolve({ data: [] }),
        apptIds.length
          ? supabase.from('qc_reports').select('*').in('appointment_id', apptIds)
          : Promise.resolve({ data: [] }),
        apptIds.length
          ? supabase.from('job_photos').select('*').in('appointment_id', apptIds).order('created_at', { ascending: true })
          : Promise.resolve({ data: [] }),
        apptIds.length
          ? supabase.from('service_reports').select('*').in('appointment_id', apptIds)
          : Promise.resolve({ data: [] }),
      ]);

      const techMap = {};
      (techRes.data || []).forEach(t => { techMap[t.id] = t; });
      setTechnicians(techMap);

      const notesMap = {};
      (notesRes.data || []).forEach(n => {
        if (!notesMap[n.appointment_id]) notesMap[n.appointment_id] = [];
        notesMap[n.appointment_id].push(n);
      });
      setManagerNotes(notesMap);

      const qcMap = {};
      (qcRes.data || []).forEach(q => { qcMap[q.appointment_id] = q; });
      setQcReports(qcMap);

      const photoMap = {};
      (photosRes.data || []).forEach(p => {
        if (!photoMap[p.appointment_id]) photoMap[p.appointment_id] = [];
        photoMap[p.appointment_id].push(p);
      });
      setJobPhotos(photoMap);

      const reportMap = {};
      (reportsRes.data || []).forEach(r => { reportMap[r.appointment_id] = r; });
      setServiceReports(reportMap);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  useEffect(() => { fetchUserData(); }, [fetchUserData]);

  /* ── realtime: re-fetch on any change to own appointments ──── */
  useEffect(() => {
    const channel = supabase
      .channel('customer-dashboard-appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        fetchUserData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchUserData]);

  /* ── derived state ───────────────────────────────────────── */
  const activeRequests = useMemo(
    () => myAppointments.filter(a => !['completed', 'cancelled', 'rejected'].includes((a.status || '').toLowerCase())),
    [myAppointments]
  );
  const completedAppointments = useMemo(
    () => myAppointments.filter(a => isDoneStatus(a.status)),
    [myAppointments]
  );
  const completedCount = completedAppointments.length;
  const latestActive = activeRequests[0] || null;
  const unreadCount = activeRequests.length;
  const lastCompleted = completedAppointments[0] || null;

  /* Progress is derived straight from the live status string —
     this is the actual bug fix: no more stale "started_at" flags
     keeping the ring frozen at 67% after a job is done. */
  const latestActiveProgress = latestActive ? deriveProgressPercent(latestActive) : 0;

  /* Recent history shown under the hero — everything except
     whatever is already featured as the active hero card. */
  const recentHistory = useMemo(
    () => myAppointments.filter(a => a.id !== latestActive?.id).slice(0, 6),
    [myAppointments, latestActive]
  );

  /* ── detect newly-completed service -> trigger feedback modal ── */
  useEffect(() => {
    const justCompleted = completedAppointments.find(
      a => !a.customer_rating && !seenCompletedRef.current.has(a.id)
    );
    if (justCompleted) {
      seenCompletedRef.current.add(justCompleted.id);
      setFeedbackTarget(justCompleted);
      setFeedbackOpen(true);
    }
  }, [completedAppointments]);

  /* ── handlers ───────────────────────────────────────────── */
  const openLogoutModal = () => { setLogoutPhase('confirm'); setLogoutOpen(true); };
  const closeLogoutModal = () => { if (logoutPhase !== 'loading') setLogoutOpen(false); };

  const confirmLogout = async () => {
    setLogoutPhase('loading');
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout error:', err);
    }
    setLogoutPhase('success');
    setTimeout(() => { window.location.href = '/'; }, 1000);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('profiles').update({
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone,
        address: profile.address,
      }).eq('email', userEmail);
      if (!error) {
        setNotice({ title: 'Profile Updated', message: 'Your changes were saved successfully.', tone: 'success' });
        setView('dashboard');
      } else {
        setNotice({ title: 'Update Failed', message: 'We could not save your changes. Please try again.', tone: 'error' });
      }
    } catch (err) {
      console.error('Update error:', err);
      setNotice({ title: 'Update Failed', message: 'Something went wrong. Please try again.', tone: 'error' });
    }
  };

  const handleFeedbackSubmit = async ({ rating, comment }) => {
    if (!feedbackTarget) return;
    try {
      const { error } = await supabase.from('appointments').update({
        customer_rating: rating,
        customer_feedback: comment || null,
      }).eq('id', feedbackTarget.id);
      if (!error) {
        setMyAppointments(prev => prev.map(a => a.id === feedbackTarget.id ? { ...a, customer_rating: rating, customer_feedback: comment } : a));
        setNotice({ title: 'Feedback Submitted', message: 'Thanks for letting us know how it went.', tone: 'success' });
      }
    } catch (err) {
      console.error('Feedback error:', err);
    } finally {
      setFeedbackOpen(false);
      setFeedbackTarget(null);
    }
  };

  const handleHelpAction = (action) => {
    if (action === 'hotline') {
      window.location.href = 'tel:+1234567890';
      return;
    }
    setNotice({
      title: action === 'support' ? 'Contact Support' : action === 'faq' ? 'FAQs' : 'Help Center',
      message: 'Our team is available 24/7. Reach out through the contact options for assistance with this service.',
      tone: 'info',
    });
  };

  const openDetails = (item) => { setSelectedAppointment(item); setView('details'); };

  const initials = `${profile.first_name?.charAt(0) || ''}${profile.last_name?.charAt(0) || ''}`.toUpperCase() || 'U';

  const todayLabel = useMemo(() => new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }), []);

  /* ══════════════════════════════════════════════════════════ */
  return (
    <div className="flex min-h-screen bg-[#040810] text-slate-200 font-sans selection:bg-amber-400/30">

      {/* Ambient background — deep navy, single soft amber glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[700px] h-[700px] bg-[#0d1a33] rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-[#0a1428] rounded-full blur-[100px]" />
        <div className="absolute top-[38%] left-[28%] w-[320px] h-[320px] bg-amber-500/[0.04] rounded-full blur-[90px]" />
      </div>

      {/* ── Sidebar (desktop) ─────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-[240px] border-r border-white/[0.05] bg-[#050a15]/85 backdrop-blur-2xl sticky top-0 h-screen z-10">
        <div className="flex items-center gap-3 px-6 pt-7 pb-6 border-b border-white/[0.05]">
          <div className="p-2 bg-gradient-to-br from-amber-400 to-amber-500 rounded-xl shadow-lg shadow-amber-500/25">
            <ShieldCheck size={18} className="text-[#140f02]" />
          </div>
          <span className="font-black tracking-tighter text-[1.25rem] text-white">RIONTECH</span>
        </div>

        <div className="px-5 py-4 border-b border-white/[0.05]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-amber-500 rounded-xl flex items-center justify-center text-[#140f02] font-black text-sm shadow-lg shadow-amber-500/20 overflow-hidden flex-shrink-0">
              {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{profile.first_name} {profile.last_name}</p>
              <p className="text-[9px] text-slate-500 truncate font-mono">{userEmail}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ id, label, icon: Icon }) => {
            const active = view === id;
            return (
              <button
                key={id}
                onClick={() => setView(id)}
                className={`relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[11px] font-semibold tracking-wide transition-all group ${active ? 'text-white' : 'text-slate-500 hover:text-white/80 hover:bg-white/[0.04]'}`}
              >
                {active && (
                  <motion.div
                    layoutId="sidebarIndicator"
                    className="absolute inset-0 bg-amber-400/10 rounded-xl border border-amber-400/20"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                  />
                )}
                <Icon size={15} className={`relative z-10 ${active ? 'text-amber-300' : 'group-hover:text-white/70 transition-colors'}`} />
                <span className="relative z-10">{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="px-3 pb-5 border-t border-white/[0.05] pt-3">
          <button
            onClick={openLogoutModal}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[11px] font-semibold text-slate-500 hover:text-red-400 hover:bg-red-500/8 transition-all border border-transparent hover:border-red-500/15"
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto pb-24 lg:pb-0 relative z-10">
        <AnimatePresence mode="wait">

          {/* ══════════════ DASHBOARD OVERVIEW ══════════════ */}
          {view === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-7"
            >

              {/* ── HEADER ──────────────────────────────── */}
              <header className="flex items-center justify-between mb-7">
                <div>
                  <h1 className="text-[1.7rem] font-black text-white tracking-tight leading-none mb-1.5">
                    {getGreeting()}, {profile.first_name}
                  </h1>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Welcome back · {todayLabel}
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <motion.button
                      whileTap={{ scale: 0.93 }}
                      onClick={() => setShowNotifications(p => !p)}
                      className="relative p-2.5 bg-white/[0.04] rounded-xl border border-white/8 hover:bg-white/[0.07] hover:border-white/15 transition-all"
                    >
                      <Bell size={16} className="text-slate-400" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-400 rounded-full border-2 border-[#040810] text-[7px] font-black flex items-center justify-center text-[#140f02]">
                          {unreadCount}
                        </span>
                      )}
                    </motion.button>
                    <AnimatePresence>
                      {showNotifications && (
                        <NotificationPanel onClose={() => setShowNotifications(false)} appointments={myAppointments} />
                      )}
                    </AnimatePresence>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.93 }}
                    onClick={() => setView('profile')}
                    className="w-9 h-9 bg-gradient-to-br from-amber-400 to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 overflow-hidden border border-white/10 text-[#140f02] font-black text-xs hover:shadow-amber-500/30 transition-all"
                  >
                    {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : initials}
                  </motion.button>
                </div>
              </header>

              {loading && (
                <div className="space-y-5 mb-6">
                  <Skeleton className="h-48 w-full rounded-[2rem]" />
                  <Skeleton className="h-72 w-full rounded-[1.75rem]" />
                </div>
              )}

              {/* ── ACTIVE SERVICE (biggest card) ─────────── */}
              {!loading && latestActive && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                  className="relative overflow-hidden rounded-[2rem] mb-5 border border-white/[0.08]"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#0d1a33] via-[#0a1628] to-[#060e1e]" />
                  <motion.div
                    className="absolute top-0 right-0 w-80 h-80 bg-amber-400/[0.07] rounded-full blur-3xl"
                    animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.85, 0.5] }}
                    transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

                  <div className="relative z-10 p-6 md:p-9">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6">
                      <div className="flex items-center gap-5">
                        <ProgressRing percent={latestActiveProgress} completed={isDoneStatus(latestActive.status)} />
                        <div>
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-400/12 border border-amber-400/25 rounded-full mb-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">
                              Service In Progress
                            </span>
                          </div>
                          <h2 className="text-2xl md:text-3xl font-black text-white leading-tight mb-1.5">
                            {latestActive.service_type}
                          </h2>
                          <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${getStatusStyle(latestActive.status)}`}>
                            {latestActive.status}
                          </span>
                        </div>
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        onClick={() => openDetails(latestActive)}
                        className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-[#140f02] rounded-xl font-bold text-[12px] uppercase tracking-wide transition-all shadow-lg shadow-amber-500/25"
                      >
                        <Activity size={14} /> Track My Service
                      </motion.button>
                    </div>

                    {/* Key facts grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-white/[0.04] rounded-2xl p-3.5 border border-white/[0.06]">
                        <p className="text-[9px] font-bold text-amber-300/70 uppercase tracking-widest mb-1.5">Schedule</p>
                        <div className="flex items-center gap-1.5 text-white font-semibold text-sm">
                          <Calendar size={13} className="text-slate-500 flex-shrink-0" />
                          <span className="truncate">{latestActive.schedule_date || 'To be scheduled'}</span>
                        </div>
                      </div>
                      <div className="bg-white/[0.04] rounded-2xl p-3.5 border border-white/[0.06]">
                        <p className="text-[9px] font-bold text-amber-300/70 uppercase tracking-widest mb-1.5">Time</p>
                        <div className="flex items-center gap-1.5 text-white font-semibold text-sm">
                          <Clock size={13} className="text-slate-500 flex-shrink-0" />
                          <span className="truncate">{latestActive.appointment_time || 'TBD'}</span>
                        </div>
                      </div>
                      <div className="bg-white/[0.04] rounded-2xl p-3.5 border border-white/[0.06]">
                        <p className="text-[9px] font-bold text-amber-300/70 uppercase tracking-widest mb-1.5">Address</p>
                        <div className="flex items-center gap-1.5 text-white font-semibold text-sm">
                          <MapPin size={13} className="text-slate-500 flex-shrink-0" />
                          <span className="truncate">{latestActive.address || 'Not provided'}</span>
                        </div>
                      </div>
                      {latestActive.priority && (
                        <div className="bg-white/[0.04] rounded-2xl p-3.5 border border-white/[0.06]">
                          <p className="text-[9px] font-bold text-amber-300/70 uppercase tracking-widest mb-1.5">Priority</p>
                          <div className="flex items-center gap-1.5 text-white font-semibold text-sm">
                            <Flag size={13} className="text-slate-500 flex-shrink-0" />
                            <span className="truncate capitalize">{latestActive.priority}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── NO ACTIVE SERVICE ─────────────────────── */}
              {!loading && !latestActive && !lastCompleted && (
                <div className="mb-5">
                  <NoActiveService onBook={() => setView('request')} />
                </div>
              )}

              {/* ── AFTER-COMPLETION EXPERIENCE ───────────── */}
              {!loading && !latestActive && lastCompleted && (
                <div className="mb-5">
                  <CompletedExperience
                    lastCompleted={lastCompleted}
                    technician={technicians[lastCompleted.technician_id]}
                    report={serviceReports[lastCompleted.id]}
                    onViewReport={() => openDetails(lastCompleted)}
                    onBook={() => setView('request')}
                  />
                </div>
              )}

              {/* ── LIVE SERVICE TIMELINE + SERVICE REPORT ── */}
              {!loading && latestActive && (
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
                  <div className="space-y-5">
                    <StatusSpine
                      appointment={latestActive}
                      technician={technicians[latestActive.technician_id]}
                      managerNotes={managerNotes[latestActive.id] || []}
                      qcReport={qcReports[latestActive.id]}
                      photos={jobPhotos[latestActive.id] || []}
                    />
                    {isDoneStatus(latestActive.status) && serviceReports[latestActive.id] && (
                      <ServiceReportCard report={serviceReports[latestActive.id]} />
                    )}
                  </div>

                  {/* ── PAYMENT SUMMARY (small, clean) ──────── */}
                  <div className="space-y-5">
                    <PaymentSummaryCard appointment={latestActive} />
                    <motion.button
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleHelpAction('support')}
                      className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-amber-400/20 text-slate-300 hover:text-white text-xs font-bold uppercase tracking-wide transition-all"
                    >
                      <Headphones size={14} className="text-amber-400" /> Contact Support
                    </motion.button>
                  </div>
                </div>
              )}

              {/* ── RECENT SERVICE HISTORY ────────────────── */}
              {!loading && <RecentServiceHistory items={recentHistory} onOpen={openDetails} />}

            </motion.div>
          )}

          {/* ══════════════ SERVICE DETAILS ══════════════════ */}
          {view === 'details' && selectedAppointment && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
              className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-7"
            >
              <motion.button whileHover={{ x: -2 }} onClick={() => setView('dashboard')} className="group flex items-center gap-2 text-slate-500 hover:text-white transition-all mb-8 text-[11px] font-semibold uppercase tracking-[0.2em]">
                <ArrowLeft size={14} /> Back to Dashboard
              </motion.button>

              <div className="space-y-5">
                <StatusSpine
                  appointment={selectedAppointment}
                  technician={technicians[selectedAppointment.technician_id]}
                  managerNotes={managerNotes[selectedAppointment.id] || []}
                  qcReport={qcReports[selectedAppointment.id]}
                  photos={jobPhotos[selectedAppointment.id] || []}
                />

                {isDoneStatus(selectedAppointment.status) && serviceReports[selectedAppointment.id] && (
                  <ServiceReportCard report={serviceReports[selectedAppointment.id]} />
                )}

                <div className="bg-[#080e1c]/80 backdrop-blur-2xl border border-white/8 rounded-[2rem] p-6 md:p-8 relative overflow-hidden">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                    <div className="bg-white/[0.04] rounded-2xl p-4 border border-white/[0.06]">
                      <p className="text-[9px] font-bold text-amber-300/70 uppercase tracking-widest mb-2">Service Date</p>
                      <div className="flex items-center gap-2 text-white font-semibold text-sm">
                        <Calendar size={14} className="text-slate-500" />
                        {selectedAppointment.schedule_date || 'Awaiting Confirmation'}
                      </div>
                    </div>
                    <PaymentSummaryCard appointment={selectedAppointment} />
                    <div className="bg-white/[0.04] rounded-2xl p-4 border border-white/[0.06]">
                      <p className="text-[9px] font-bold text-amber-300/70 uppercase tracking-widest mb-2">Address</p>
                      <div className="flex items-center gap-2 text-white font-semibold text-sm">
                        <MapPin size={14} className="text-slate-500" />
                        <span className="truncate">{selectedAppointment.address || 'Not provided'}</span>
                      </div>
                    </div>
                  </div>

                  {selectedAppointment.materials_notes && (
                    <div className="p-5 bg-black/20 rounded-2xl border border-white/[0.05] mt-4">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.25em] mb-2.5">Materials Notes</p>
                      <p className="text-sm text-slate-300 leading-relaxed">{selectedAppointment.materials_notes}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 mt-5">
                    <motion.button whileTap={{ scale: 0.97 }} onClick={() => window.print()} className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-[#140f02] rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all shadow-lg">
                      Print Receipt
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={() => handleHelpAction('support')} className="px-5 py-2.5 bg-white/[0.05] border border-white/10 text-slate-400 hover:text-white rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all hover:border-white/20">
                      Get Support
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══════════════ SUB-VIEWS ════════════════════════ */}
          {view === 'logs' && (
            <ServiceLogs
              appointments={myAppointments}
              onBack={() => setView('dashboard')}
              onViewDetails={(item) => { setSelectedAppointment(item); setView('details'); }}
              getStatusStyle={getStatusStyle}
            />
          )}

          {view === 'profile' && (
            <ProfileSettings
              profile={profile}
              setProfile={setProfile}
              onSave={handleUpdateProfile}
              onBack={() => setView('dashboard')}
            />
          )}

          {view === 'request' && (
            <RequestService
              profile={profile}
              onBack={() => setView('dashboard')}
              onSuccess={() => { fetchUserData(); setView('dashboard'); }}
            />
          )}

        </AnimatePresence>
      </main>

      <MobileNav view={view} setView={setView} />
      <FloatingHelp onAction={handleHelpAction} />

      <FeedbackModal
        open={feedbackOpen}
        serviceName={feedbackTarget?.service_type}
        onClose={() => { setFeedbackOpen(false); setFeedbackTarget(null); }}
        onSubmit={handleFeedbackSubmit}
      />

      <NoticeModal
        open={!!notice}
        title={notice?.title}
        message={notice?.message}
        tone={notice?.tone}
        onClose={() => setNotice(null)}
      />

      <LogoutModal
        open={logoutOpen}
        phase={logoutPhase}
        onCancel={closeLogoutModal}
        onConfirm={confirmLogout}
      />

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
};

export default CustomerDashboard;
