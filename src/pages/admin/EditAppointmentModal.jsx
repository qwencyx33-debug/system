import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Save, Loader2, User, Wrench, DollarSign, FileText,
  CheckCircle2, MapPin, Phone, AlertCircle, Check, Sparkles,
} from 'lucide-react';
import Swal from 'sweetalert2';

/* ────────────────────────────────────────────────────────────
   DESIGN TOKENS — shared visual language with ServiceManagement
   ──────────────────────────────────────────────────────────── */
const T = {
  bg:        '#050D10',
  ink:       '#08191D',
  ink2:      '#030B0D',
  surface:   'rgba(255,255,255,0.025)',
  surfaceHi: 'rgba(255,255,255,0.045)',
  border:    'rgba(232,176,0,0.12)',
  borderHi:  'rgba(232,176,0,0.32)',
  gold:      '#E8B000',
  goldSoft:  'rgba(232,176,0,0.10)',
  goldLine:  'rgba(232,176,0,0.22)',
  text:      '#F4F8F9',
  sub:       '#7E9CA1',
  success:   '#22C55E',
  danger:    '#EF4444',
  info:      '#3B82F6',
  warn:      '#F59E0B',
};

const STATUS_OPTIONS = [
  { value: 'pending',     label: 'Pending',      color: T.warn },
  { value: 'approved',    label: 'Approved',     color: T.info },
  { value: 'scheduled',   label: 'Scheduled',    color: '#8B5CF6' },
  { value: 'in_progress', label: 'In Progress',  color: '#F97316' },
  { value: 'completed',   label: 'Completed',    color: T.success },
  { value: 'cancelled',   label: 'Cancelled',    color: T.danger },
];

const PAYMENT_OPTIONS = [
  { value: 'pending',    label: 'Pending',    color: T.warn },
  { value: 'downpaid',   label: 'Downpaid',   color: T.info },
  { value: 'paid',       label: 'Paid',       color: T.success },
  { value: 'cancelled',  label: 'Cancelled',  color: T.danger },
];

const swalTheme = {
  background: T.ink2,
  color: T.text,
  confirmButtonColor: T.gold,
};

/* ── Primitive: field wrapper ── */
const Field = ({ label, hint, children, error }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
      <label style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.sub }}>
        {label}
      </label>
      {hint && <span style={{ fontSize: 10, color: T.sub, opacity: 0.7 }}>{hint}</span>}
    </div>
    {children}
    <AnimatePresence>
      {error && (
        <motion.span
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
          style={{ fontSize: 11, color: T.danger, display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <AlertCircle size={11} /> {error}
        </motion.span>
      )}
    </AnimatePresence>
  </div>
);

/* ── Primitive: input ── */
const DInput = ({ icon, ...props }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      {icon && (
        <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: focused ? T.gold : T.sub, display: 'flex', pointerEvents: 'none', zIndex: 1, transition: 'color 0.2s' }}>
          {icon}
        </div>
      )}
      <input
        style={{
          width: '100%', background: focused ? T.surfaceHi : T.surface,
          border: `1px solid ${focused ? T.gold : T.border}`, borderRadius: 10,
          color: T.text, fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, fontWeight: 500,
          padding: icon ? '12px 14px 12px 40px' : '12px 14px',
          outline: 'none', transition: 'all 0.18s', boxSizing: 'border-box',
          boxShadow: focused ? `0 0 0 3px ${T.goldSoft}` : 'none',
        }}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
        {...props}
      />
    </div>
  );
};

/* ── Primitive: textarea ── */
const DTextarea = (props) => {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      style={{
        width: '100%', background: focused ? T.surfaceHi : T.surface,
        border: `1px solid ${focused ? T.gold : T.border}`, borderRadius: 10,
        color: T.text, fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, fontWeight: 500,
        padding: '12px 14px', outline: 'none', resize: 'vertical',
        transition: 'all 0.18s', minHeight: 86, boxSizing: 'border-box', lineHeight: 1.6,
        boxShadow: focused ? `0 0 0 3px ${T.goldSoft}` : 'none',
      }}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
      {...props}
    />
  );
};

/* ── Status / payment pill selector ── */
const PillSelector = ({ options, value, onChange }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }} role="radiogroup">
    {options.map((opt) => {
      const active = value === opt.value;
      return (
        <motion.button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={active}
          onClick={() => onChange(opt.value)}
          whileTap={{ scale: 0.95 }}
          style={{
            padding: '7px 14px', fontSize: 10.5, fontWeight: 700,
            letterSpacing: '0.03em', borderRadius: 999,
            background: active ? `${opt.color}1F` : T.surface,
            border: `1px solid ${active ? opt.color : T.border}`,
            color: active ? opt.color : T.sub,
            cursor: 'pointer', transition: 'background 0.18s, border-color 0.18s, color 0.18s',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <motion.span
            initial={false}
            animate={{ width: active ? 12 : 0, opacity: active ? 1 : 0 }}
            style={{ overflow: 'hidden', display: 'flex' }}
          >
            <Check size={11} strokeWidth={3} />
          </motion.span>
          {opt.label}
        </motion.button>
      );
    })}
  </div>
);

/* ── Info chip for the customer strip ── */
const InfoChip = ({ icon, label, value }) => {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
      <div style={{ width: 26, height: 26, borderRadius: 8, background: T.goldSoft, border: `1px solid ${T.goldLine}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.gold, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.sub, marginBottom: 1 }}>{label}</div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
      </div>
    </div>
  );
};

/* ── Section wrapper ── */
const Section = ({ icon, title, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: T.gold, opacity: 0.85, display: 'flex' }}>{icon}</span>
      <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: T.text, opacity: 0.85 }}>{title}</span>
      <span style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(232,176,0,0.18), transparent)' }} />
    </div>
    {children}
  </div>
);

/* ────────────────────────────────────────────────────────────
   MAIN COMPONENT
   ──────────────────────────────────────────────────────────── */
const EditAppointmentModal = ({ appointment, isOpen, onClose, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    service_type:   '',
    status:         'pending',
    payment_status: 'pending',
    price:          0,
    notes:          '',
  });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (appointment) {
      setForm({
        service_type:   appointment.service_type   || '',
        status:         appointment.status         || 'pending',
        payment_status: appointment.payment_status || 'pending',
        price:          appointment.price          || 0,
        notes:          appointment.notes          || '',
      });
      setDirty(false);
    }
  }, [appointment, isOpen]);

  const upd = (key, val) => { setForm((f) => ({ ...f, [key]: val })); setDirty(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          service_type:   form.service_type,
          status:         form.status,
          payment_status: form.payment_status,
          price:          Number(form.price),
          notes:          form.notes,
        })
        .eq('id', appointment.id);

      if (error) throw error;

      Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2500, background: T.ink2, color: T.text })
        .fire({ icon: 'success', title: 'Appointment updated' });

      onUpdate();
      onClose();
    } catch (err) {
      Swal.fire({ ...swalTheme, title: 'Update Failed', text: err.message, icon: 'error' });
    }
    setLoading(false);
  };

  const handleClose = async () => {
    if (dirty) {
      const res = await Swal.fire({
        ...swalTheme,
        title: 'Discard Changes?', text: 'Unsaved changes will be lost.',
        icon: 'question', showCancelButton: true,
        confirmButtonColor: T.danger, cancelButtonColor: '#0C2B30',
        confirmButtonText: 'Discard',
      });
      if (!res.isConfirmed) return;
    }
    onClose();
  };

  const statusMeta = STATUS_OPTIONS.find((s) => s.value === form.status);

  const infoRows = useMemo(() => (appointment ? [
    { icon: <User size={12} />,   label: 'Client',  value: appointment.full_name },
    { icon: <Phone size={12} />,  label: 'Phone',   value: appointment.phone },
    { icon: <MapPin size={12} />, label: 'Address', value: appointment.address },
  ] : []), [appointment]);

  if (!isOpen || !appointment) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(3,11,13,0.82)', backdropFilter: 'blur(14px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}
        onClick={handleClose}
      >
        <motion.div
          key="panel"
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ type: 'spring', stiffness: 340, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Edit appointment"
          style={{
            width: '100%', maxWidth: 600,
            background: T.ink, border: `1px solid ${T.borderHi}`,
            borderRadius: 20,
            boxShadow: '0 30px 90px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.2)',
            overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          }}
        >
          {/* ── Header ── */}
          <div style={{ background: T.ink2, borderBottom: `1px solid ${T.border}`, padding: '22px 26px', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
            <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 15% 0%, ${T.goldSoft}, transparent 55%)`, pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: T.goldSoft, border: `1px solid ${T.goldLine}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.gold, flexShrink: 0 }}>
                  <Sparkles size={17} />
                </div>
                <div>
                  <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, letterSpacing: '0.03em', color: T.text, lineHeight: 1.1 }}>
                    Edit Appointment
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: T.sub }}>{appointment.full_name}</span>
                    <span style={{
                      fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
                      background: `${statusMeta?.color}1F`, border: `1px solid ${statusMeta?.color}55`,
                      color: statusMeta?.color, padding: '2px 9px', borderRadius: 999,
                    }}>
                      {statusMeta?.label}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleClose}
                aria-label="Close"
                style={{ width: 32, height: 32, borderRadius: 10, background: T.surface, border: `1px solid ${T.border}`, color: T.sub, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 }}
                onMouseEnter={(e) => { e.currentTarget.style.color = T.gold; e.currentTarget.style.borderColor = T.borderHi; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = T.sub; e.currentTarget.style.borderColor = T.border; }}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* ── Customer strip ── */}
          <div style={{ background: 'rgba(232,176,0,0.025)', borderBottom: `1px solid ${T.border}`, padding: '16px 26px', display: 'flex', gap: 24, flexWrap: 'wrap', flexShrink: 0 }}>
            {infoRows.map((row, i) => <InfoChip key={i} {...row} />)}
          </div>

          {/* ── Form body (scrollable) ── */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div style={{ padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: 26, overflowY: 'auto' }}>

              <Section icon={<Wrench size={13} />} title="Service">
                <Field label="Service Type">
                  <DInput icon={<Wrench size={13} />} value={form.service_type} onChange={(e) => upd('service_type', e.target.value)} placeholder="e.g. CCTV Maintenance" required />
                </Field>
              </Section>

              <Section icon={<CheckCircle2 size={13} />} title="Status">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <Field label="Appointment Status">
                    <PillSelector options={STATUS_OPTIONS} value={form.status} onChange={(v) => upd('status', v)} />
                  </Field>
                  <Field label="Payment Status">
                    <PillSelector options={PAYMENT_OPTIONS} value={form.payment_status} onChange={(v) => upd('payment_status', v)} />
                  </Field>
                </div>
              </Section>

              <Section icon={<DollarSign size={13} />} title="Payment">
                <Field label="Service Price">
                  <DInput icon={<span style={{ fontSize: 13, fontWeight: 700 }}>₱</span>} type="number" min="0" value={form.price} onChange={(e) => upd('price', e.target.value)} />
                </Field>
              </Section>

              <Section icon={<FileText size={13} />} title="Notes">
                <Field label="Admin Notes" hint="Internal only">
                  <DTextarea value={form.notes} onChange={(e) => upd('notes', e.target.value)} placeholder="Internal notes, special instructions, technician briefing…" rows={3} />
                </Field>
              </Section>

              {/* Status change warnings */}
              <AnimatePresence mode="wait">
                {form.status === 'cancelled' && (
                  <motion.div
                    key="cancel-warn"
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '13px 15px', background: 'rgba(239,68,68,0.07)', border: `1px solid ${T.danger}33`, borderRadius: 12, overflow: 'hidden' }}
                  >
                    <AlertCircle size={15} style={{ color: T.danger, flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: 11.5, color: T.danger, margin: 0, lineHeight: 1.55 }}>
                      Marking as Cancelled will archive this appointment and notify the client.
                    </p>
                  </motion.div>
                )}
                {form.status === 'completed' && (
                  <motion.div
                    key="complete-warn"
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '13px 15px', background: 'rgba(34,197,94,0.07)', border: `1px solid ${T.success}33`, borderRadius: 12, overflow: 'hidden' }}
                  >
                    <CheckCircle2 size={15} style={{ color: T.success, flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: 11.5, color: T.success, margin: 0, lineHeight: 1.55 }}>
                      Marking as Completed will finalize this appointment and update revenue records.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Footer ── */}
            <div style={{ padding: '16px 26px', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: T.ink2, flexShrink: 0 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700 }}>
                <AnimatePresence mode="wait">
                  {dirty ? (
                    <motion.span key="dirty" initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} style={{ color: T.gold, display: 'flex', alignItems: 'center', gap: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.gold, boxShadow: `0 0 8px ${T.gold}` }} />
                      Unsaved changes
                    </motion.span>
                  ) : (
                    <motion.span key="clean" initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.success, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      <Check size={12} /> Up to date
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <motion.button
                  type="button" onClick={handleClose} whileTap={{ scale: 0.96 }}
                  style={{ padding: '11px 20px', borderRadius: 10, background: T.surface, border: `1px solid ${T.border}`, color: T.sub, fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', cursor: 'pointer', transition: 'all 0.18s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.borderHi; e.currentTarget.style.color = T.text; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.sub; }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="submit" disabled={loading} whileTap={{ scale: loading ? 1 : 0.96 }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 10,
                    background: loading ? 'rgba(232,176,0,0.55)' : T.gold,
                    color: T.ink2, border: 'none', padding: '11px 22px',
                    fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 800,
                    letterSpacing: '0.06em', cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: loading ? 'none' : `0 6px 20px ${T.gold}30`,
                    transition: 'background 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#F7C948'; }}
                  onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = T.gold; }}
                >
                  {loading
                    ? <><Loader2 size={14} style={{ animation: 'eam-spin 0.8s linear infinite' }} /> Saving…</>
                    : <><Save size={14} /> Save Changes</>}
                </motion.button>
              </div>
            </div>
          </form>
        </motion.div>
      </motion.div>
      <style>{`
        @keyframes eam-spin { to { transform: rotate(360deg); } }
        @media (max-width: 560px) {
          input, textarea, button { font-size: 16px !important; }
        }
      `}</style>
    </AnimatePresence>
  );
};

export default EditAppointmentModal;
