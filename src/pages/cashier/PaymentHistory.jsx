import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, X, ChevronDown, ChevronRight, Calendar, Wallet, Banknote,
  Smartphone, Landmark, TrendingUp, Receipt, Eye, Printer, Download,
  User, Car, Wrench, UserCog, CreditCard, Hash, Clock, CheckCircle2,
  SlidersHorizontal, ArrowUpDown, FileText, Phone
} from 'lucide-react';
import { supabase } from '../../supabaseClient';

/* ============================================================
   DESIGN TOKENS — extends the existing palette. No colors were
   invented outside the brand's Dark Navy / Deep Black / Gold set.
   ============================================================ */
const C = {
  bg: '#05090f',
  surface: '#060e18',
  surfaceAlt: '#081120',
  panel: '#0b1623',
  panelHover: '#0e1b2c',
  border: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.12)',
  gold: '#EAB308',
  goldSoft: 'rgba(234,179,8,0.12)',
  goldBorder: 'rgba(234,179,8,0.25)',
  emerald: '#10b981',
  emeraldSoft: 'rgba(16,185,129,0.1)',
  sky: '#38bdf8',
  violet: '#a78bfa',
  rose: '#fb7185',
  muted: '#64748b',
  mutedSoft: '#475569',
  text: '#e2e8f0',
  textDim: '#94a3b8',
  white: '#ffffff',
};

/* ============================================================
   DATA HELPERS
   These read ONLY from the row object returned by the existing
   Supabase query (select('*') on `appointments`). Nothing here
   fabricates data — if a field isn't present, it simply isn't
   shown. `pick` exists because column naming can vary slightly
   across schemas; adjust the key lists below to match your
   actual Supabase columns if any section shows as empty.
   ============================================================ */
const pick = (row, keys) => {
  for (const k of keys) {
    if (row?.[k] !== undefined && row?.[k] !== null && row?.[k] !== '') return row[k];
  }
  return undefined;
};

const FIELD_MAP = {
  customerName: ['full_name', 'customer_name'],
  phone: ['phone', 'phone_number', 'contact_number', 'mobile_number'],
  vehicle: ['vehicle', 'vehicle_model', 'vehicle_info'],
  plate: ['plate_number', 'vehicle_plate', 'plate'],
  service: ['service_type', 'service', 'service_name'],
  technician: ['technician', 'technician_name', 'assigned_technician'],
  cashier: ['cashier', 'cashier_name', 'processed_by'],
  method: ['payment_method', 'method'],
  amount: ['price', 'amount_paid', 'total_amount'],
  discount: ['discount', 'discount_amount'],
  downpayment: ['downpayment', 'down_payment'],
  remainingBalance: ['remaining_balance', 'balance'],
  grandTotal: ['grand_total', 'total'],
  referenceNumber: ['reference_number', 'ref_number', 'transaction_reference'],
  receiptNumber: ['receipt_number', 'receipt_no'],
  appointmentNumber: ['appointment_number', 'appointment_no', 'appointment_code'],
  status: ['payment_status', 'status'],
  notes: ['notes', 'remarks'],
  completedAt: ['completed_at', 'completed_date', 'updated_at'],
};

const get = (row, field) => pick(row, FIELD_MAP[field] || [field]);

const fmtCurrency = (n) => `₱${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date)) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const fmtTime = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date)) return '—';
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const isSameDay = (d1, d2) =>
  d1.getFullYear() === d2.getFullYear() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getDate() === d2.getDate();

const methodIcon = (method = '') => {
  const m = method.toLowerCase();
  if (m.includes('gcash')) return Smartphone;
  if (m.includes('bank')) return Landmark;
  if (m.includes('cod')) return Wallet;
  return Banknote;
};

const methodColor = (method = '') => {
  const m = method.toLowerCase();
  if (m.includes('gcash')) return C.sky;
  if (m.includes('bank')) return C.violet;
  if (m.includes('cod')) return C.rose;
  return C.emerald;
};

/* ============================================================
   ANIMATED COUNT-UP (lightweight, no extra deps)
   ============================================================ */
const CountUp = ({ value, prefix = '', decimals = 0, duration = 0.9 }) => {
  const [display, setDisplay] = useState(0);
  const raf = useRef();
  const start = useRef();

  useEffect(() => {
    cancelAnimationFrame(raf.current);
    start.current = null;
    const from = 0;
    const to = Number(value) || 0;
    const step = (ts) => {
      if (!start.current) start.current = ts;
      const progress = Math.min((ts - start.current) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (to - from) * eased);
      if (progress < 1) raf.current = requestAnimationFrame(step);
      else setDisplay(to);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <span>
      {prefix}
      {display.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
    </span>
  );
};

/* ============================================================
   SUMMARY CARD
   ============================================================ */
const SummaryCard = ({ icon: Icon, label, value, prefix = '', decimals = 0, accent, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    whileHover={{ y: -3, boxShadow: `0 12px 32px -8px ${accent}33` }}
    style={{
      background: `linear-gradient(160deg, ${C.panel} 0%, ${C.surface} 100%)`,
      border: `1px solid ${C.border}`,
      borderRadius: 16,
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      minWidth: 0,
      position: 'relative',
      overflow: 'hidden',
      cursor: 'default',
    }}
  >
    <div style={{
      position: 'absolute', top: -30, right: -30, width: 90, height: 90, borderRadius: '50%',
      background: `${accent}14`, filter: 'blur(2px)'
    }} />
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10, background: `${accent}18`,
        border: `1px solid ${accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <Icon size={16} color={accent} strokeWidth={2.2} />
      </div>
    </div>
    <div style={{ zIndex: 1 }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: C.white, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
        <CountUp value={value} prefix={prefix} decimals={decimals} />
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.mutedSoft, marginTop: 2 }}>{label}</div>
    </div>
  </motion.div>
);

/* ============================================================
   STATUS BADGE
   ============================================================ */
const StatusBadge = ({ status }) => {
  const label = (status || 'paid').replace(/_/g, ' ');
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: C.emeraldSoft, color: C.emerald, border: `1px solid rgba(16,185,129,0.25)`,
        padding: '4px 10px', borderRadius: 7, fontSize: 10, fontWeight: 700, textTransform: 'capitalize'
      }}
    >
      <CheckCircle2 size={11} />
      {label}
    </motion.span>
  );
};

/* ============================================================
   DRAWER SECTION
   ============================================================ */
const DrawerSection = ({ icon: Icon, title, children }) => (
  <div style={{ marginBottom: 22 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <Icon size={13} color={C.gold} />
      <span style={{ fontSize: 10, fontWeight: 800, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
  </div>
);

const InfoRow = ({ label, value }) => {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
      <span style={{ fontSize: 11.5, color: C.mutedSoft }}>{label}</span>
      <span style={{ fontSize: 12, color: C.text, fontWeight: 600, textAlign: 'right' }}>{value}</span>
    </div>
  );
};

/* ============================================================
   RECEIPT PREVIEW
   ============================================================ */
const ReceiptPreview = ({ t, printRef }) => {
  const amount = Number(get(t, 'amount')) || 0;
  const discount = Number(get(t, 'discount')) || 0;
  const downpayment = Number(get(t, 'downpayment')) || 0;
  const grandTotalRaw = get(t, 'grandTotal');
  const grandTotal = grandTotalRaw !== undefined ? Number(grandTotalRaw) : amount;
  const remainingRaw = get(t, 'remainingBalance');
  const remaining = remainingRaw !== undefined ? Number(remainingRaw) : Math.max(grandTotal - downpayment, 0);

  return (
    <div
      ref={printRef}
      style={{
        background: 'linear-gradient(180deg, #0c1826 0%, #081120 100%)',
        border: `1px solid ${C.goldBorder}`,
        borderRadius: 14,
        padding: '22px 20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)`
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: C.gold, fontSize: 15
        }}>
          {(get(t, 'customerName') || 'B')[0]?.toUpperCase() || 'R'}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.white, letterSpacing: '0.01em' }}>Official Receipt</div>
          <div style={{ fontSize: 10, color: C.mutedSoft }}>#{get(t, 'receiptNumber') || get(t, 'referenceNumber') || t.id}</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <StatusBadge status={get(t, 'status')} />
        </div>
      </div>

      <div style={{ borderTop: `1px dashed ${C.border}`, margin: '12px 0' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <InfoRow label="Customer" value={get(t, 'customerName')} />
        <InfoRow label="Phone Number" value={get(t, 'phone')} />
        <InfoRow label="Vehicle" value={get(t, 'vehicle')} />
        <InfoRow label="Plate Number" value={get(t, 'plate')} />
        <InfoRow label="Service" value={get(t, 'service')} />
        <InfoRow label="Technician" value={get(t, 'technician')} />
        <InfoRow label="Cashier" value={get(t, 'cashier')} />
        <InfoRow label="Reference No." value={get(t, 'referenceNumber')} />
        <InfoRow label="Appointment No." value={get(t, 'appointmentNumber')} />
        <InfoRow label="Payment Method" value={get(t, 'method') || 'Cash'} />
        <InfoRow label="Completed Date" value={fmtDate(get(t, 'completedAt'))} />
        <InfoRow label="Completed Time" value={fmtTime(get(t, 'completedAt'))} />
      </div>

      <div style={{ borderTop: `1px dashed ${C.border}`, margin: '14px 0' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <InfoRow label="Amount" value={fmtCurrency(amount)} />
        {discount > 0 && <InfoRow label="Discount" value={`− ${fmtCurrency(discount)}`} />}
        {downpayment > 0 && <InfoRow label="Downpayment" value={fmtCurrency(downpayment)} />}
        {remainingRaw !== undefined && <InfoRow label="Remaining Balance" value={fmtCurrency(remaining)} />}
      </div>

      <div style={{
        marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.borderStrong}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.mutedSoft, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Grand Total</span>
        <span style={{ fontSize: 20, fontWeight: 900, color: C.gold }}>{fmtCurrency(grandTotal)}</span>
      </div>

      {get(t, 'notes') && (
        <div style={{ marginTop: 14, fontSize: 10.5, color: C.mutedSoft, fontStyle: 'italic' }}>
          "{get(t, 'notes')}"
        </div>
      )}
    </div>
  );
};

/* ============================================================
   TRANSACTION DETAILS DRAWER
   ============================================================ */
const TransactionDrawer = ({ transaction, onClose }) => {
  const printRef = useRef(null);

  const handlePrint = () => {
    if (!printRef.current) return;
    const win = window.open('', '_blank', 'width=420,height=720');
    win.document.write(`
      <html>
        <head>
          <title>Receipt</title>
          <style>
            body { background:#081120; margin:0; padding:24px; font-family: -apple-system, Segoe UI, sans-serif; }
          </style>
        </head>
        <body>${printRef.current.outerHTML}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 250);
  };

  return (
    <AnimatePresence>
      {transaction && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)', zIndex: 60 }}
          />
          <motion.div
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0, width: 420, maxWidth: '92vw',
              background: C.surface, borderLeft: `1px solid ${C.border}`, zIndex: 61,
              display: 'flex', flexDirection: 'column', boxShadow: '-24px 0 60px rgba(0,0,0,0.5)'
            }}
          >
            <div style={{
              padding: '18px 22px', borderBottom: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.white }}>Transaction Details</div>
                <div style={{ fontSize: 10.5, color: C.mutedSoft, marginTop: 2 }}>
                  {get(transaction, 'receiptNumber') ? `Receipt #${get(transaction, 'receiptNumber')}` : `ID ${transaction.id}`}
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.06, background: C.panelHover }}
                whileTap={{ scale: 0.94 }}
                onClick={onClose}
                style={{
                  width: 30, height: 30, borderRadius: 8, background: C.panel, border: `1px solid ${C.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.textDim
                }}
              >
                <X size={15} />
              </motion.button>
            </div>

            <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1 }}>
              <DrawerSection icon={User} title="Customer Information">
                <InfoRow label="Full Name" value={get(transaction, 'customerName')} />
                <InfoRow label="Phone Number" value={get(transaction, 'phone')} />
              </DrawerSection>

              <DrawerSection icon={Hash} title="Appointment Information">
                <InfoRow label="Appointment No." value={get(transaction, 'appointmentNumber')} />
                <InfoRow label="Reference No." value={get(transaction, 'referenceNumber')} />
              </DrawerSection>

              <DrawerSection icon={Car} title="Vehicle Information">
                <InfoRow label="Vehicle" value={get(transaction, 'vehicle')} />
                <InfoRow label="Plate Number" value={get(transaction, 'plate')} />
              </DrawerSection>

              <DrawerSection icon={Wrench} title="Service Information">
                <InfoRow label="Service" value={get(transaction, 'service')} />
                <InfoRow label="Technician" value={get(transaction, 'technician')} />
              </DrawerSection>

              <DrawerSection icon={CreditCard} title="Payment Information">
                <InfoRow label="Payment Method" value={get(transaction, 'method') || 'Cash'} />
                <InfoRow label="Amount Paid" value={fmtCurrency(get(transaction, 'amount'))} />
                <InfoRow label="Completed Date" value={fmtDate(get(transaction, 'completedAt'))} />
                <InfoRow label="Completed Time" value={fmtTime(get(transaction, 'completedAt'))} />
                <InfoRow label="Cashier" value={get(transaction, 'cashier')} />
                <InfoRow label="Status" value={(get(transaction, 'status') || 'paid')} />
                <InfoRow label="Notes" value={get(transaction, 'notes')} />
              </DrawerSection>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Receipt size={13} color={C.gold} />
                <span style={{ fontSize: 10, fontWeight: 800, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Receipt Preview</span>
              </div>
              <ReceiptPreview t={transaction} printRef={printRef} />
            </div>

            <div style={{ padding: '16px 22px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10, flexShrink: 0 }}>
              <motion.button
                whileHover={{ y: -1, boxShadow: `0 8px 20px -6px ${C.gold}55` }}
                whileTap={{ scale: 0.97 }}
                onClick={handlePrint}
                style={{
                  flex: 1, background: C.gold, color: '#1a1305', border: 'none', borderRadius: 10,
                  padding: '11px 0', fontSize: 12, fontWeight: 800, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7
                }}
              >
                <Printer size={14} /> Print Receipt
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

/* ============================================================
   FILTER CHIP
   ============================================================ */
const Chip = ({ active, onClick, children, icon: Icon }) => (
  <motion.button
    whileHover={{ y: -1 }}
    whileTap={{ scale: 0.96 }}
    onClick={onClick}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '7px 13px', borderRadius: 9, fontSize: 11, fontWeight: 700, cursor: 'pointer',
      border: `1px solid ${active ? C.goldBorder : C.border}`,
      background: active ? C.goldSoft : C.panel,
      color: active ? C.gold : C.mutedSoft,
      transition: 'border-color .15s, color .15s',
      whiteSpace: 'nowrap',
    }}
  >
    {Icon && <Icon size={12} />}
    {children}
  </motion.button>
);

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
const PaymentHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [selected, setSelected] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  // Unchanged: same table, same filter, same order as the original implementation.
  const fetchHistory = async () => {
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .eq('payment_status', 'paid')
      .order('completed_at', { ascending: false });

    if (data) setHistory(data);
    setLoading(false);
  };

  const today = new Date();

  /* ---------- derived summary metrics (client-side only, no new queries) ---------- */
  const summary = useMemo(() => {
    const completed = history.length;
    const todays = history.filter(t => {
      const d = get(t, 'completedAt');
      return d && isSameDay(new Date(d), today);
    });
    const todaysRevenue = todays.reduce((s, t) => s + (Number(get(t, 'amount')) || 0), 0);
    const cash = history.filter(t => (get(t, 'method') || 'cash').toLowerCase().includes('cash') && !(get(t, 'method') || '').toLowerCase().includes('gcash'));
    const gcash = history.filter(t => (get(t, 'method') || '').toLowerCase().includes('gcash'));
    const bank = history.filter(t => (get(t, 'method') || '').toLowerCase().includes('bank'));
    const totalRevenue = history.reduce((s, t) => s + (Number(get(t, 'amount')) || 0), 0);
    const avg = completed ? totalRevenue / completed : 0;
    const largest = history.reduce((m, t) => Math.max(m, Number(get(t, 'amount')) || 0), 0);

    return {
      completed,
      todaysRevenue,
      cashCount: cash.length,
      gcashCount: gcash.length,
      bankCount: bank.length,
      avg,
      largest,
    };
  }, [history]);

  /* ---------- search + filter + sort ---------- */
  const filteredHistory = useMemo(() => {
    let rows = [...history];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      rows = rows.filter(t => {
        const haystack = [
          get(t, 'customerName'), get(t, 'phone'), get(t, 'referenceNumber'),
          get(t, 'appointmentNumber'), get(t, 'plate'), get(t, 'service'),
          get(t, 'technician'), get(t, 'method'), get(t, 'receiptNumber'),
        ].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(q);
      });
    }

    if (dateFilter !== 'all') {
      rows = rows.filter(t => {
        const raw = get(t, 'completedAt');
        if (!raw) return false;
        const d = new Date(raw);
        const now = new Date();
        if (dateFilter === 'today') return isSameDay(d, now);
        if (dateFilter === 'yesterday') {
          const y = new Date(now); y.setDate(now.getDate() - 1);
          return isSameDay(d, y);
        }
        if (dateFilter === 'week') {
          const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
          return d >= weekAgo && d <= now;
        }
        if (dateFilter === 'month') {
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }
        return true;
      });
    }

    if (methodFilter !== 'all') {
      rows = rows.filter(t => (get(t, 'method') || 'cash').toLowerCase().includes(methodFilter));
    }

    rows.sort((a, b) => {
      const da = new Date(get(a, 'completedAt') || 0);
      const db = new Date(get(b, 'completedAt') || 0);
      return sortOrder === 'newest' ? db - da : da - db;
    });

    return rows;
  }, [history, searchTerm, dateFilter, methodFilter, sortOrder]);

  const columns = ['Receipt No.', 'Customer', 'Vehicle', 'Service', 'Technician', 'Method', 'Amount', 'Completed', 'Status', ''];

  return (
    <div style={{ padding: '28px 36px 60px', maxWidth: 1360, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22, color: C.text }}>

      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          paddingBottom: 18, borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap', gap: 12
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 9, background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Receipt size={15} color={C.gold} />
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: C.white, letterSpacing: '-0.02em', margin: 0 }}>Payment History</h1>
          </div>
          <p style={{ fontSize: 12, color: C.mutedSoft, margin: '6px 0 0 39px' }}>
            Completed Transactions · {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 9, background: C.panel, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: '10px 16px'
        }}>
          <TrendingUp size={14} color={C.gold} />
          <div>
            <div style={{ fontSize: 9, color: C.mutedSoft, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Completed</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.white }}>{summary.completed} payments</div>
          </div>
        </div>
      </motion.div>

      {/* SUMMARY CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        <SummaryCard index={0} icon={CheckCircle2} label="Completed Payments" value={summary.completed} accent={C.emerald} />
        <SummaryCard index={1} icon={TrendingUp} label="Today's Revenue" value={summary.todaysRevenue} prefix="₱" decimals={2} accent={C.gold} />
        <SummaryCard index={2} icon={Banknote} label="Cash Payments" value={summary.cashCount} accent={C.emerald} />
        <SummaryCard index={3} icon={Smartphone} label="GCash Payments" value={summary.gcashCount} accent={C.sky} />
        <SummaryCard index={4} icon={Landmark} label="Bank Payments" value={summary.bankCount} accent={C.violet} />
        <SummaryCard index={5} icon={Wallet} label="Average Transaction" value={summary.avg} prefix="₱" decimals={2} accent={C.gold} />
        <SummaryCard index={6} icon={Receipt} label="Largest Payment" value={summary.largest} prefix="₱" decimals={2} accent={C.gold} />
      </div>

      {/* SEARCH + FILTERS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 320px' }}>
            <Search size={14} style={{ position: 'absolute', left: 14, top: 12, color: C.muted }} />
            <input
              type="text"
              placeholder="Search by customer, phone, reference #, plate, service, technician..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%', background: C.panel, border: `1px solid ${C.border}`, borderRadius: 11,
                padding: '11px 14px 11px 38px', fontSize: 12.5, color: C.text, outline: 'none', boxSizing: 'border-box'
              }}
            />
            {searchTerm && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setSearchTerm('')}
                style={{ position: 'absolute', right: 12, top: 10, background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}
              >
                <X size={14} />
              </motion.button>
            )}
          </div>
          <Chip active={filtersOpen} onClick={() => setFiltersOpen(v => !v)} icon={SlidersHorizontal}>
            Filters {filtersOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </Chip>
          <Chip active={false} onClick={() => setSortOrder(o => o === 'newest' ? 'oldest' : 'newest')} icon={ArrowUpDown}>
            {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
          </Chip>
        </div>

        <AnimatePresence>
          {filtersOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 8, padding: '14px 16px',
                background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12
              }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: C.mutedSoft, textTransform: 'uppercase', alignSelf: 'center', marginRight: 4 }}>Date</span>
                {[['all', 'All Time'], ['today', 'Today'], ['yesterday', 'Yesterday'], ['week', 'This Week'], ['month', 'This Month']].map(([val, label]) => (
                  <Chip key={val} active={dateFilter === val} onClick={() => setDateFilter(val)} icon={Calendar}>{label}</Chip>
                ))}
                <div style={{ width: 1, background: C.border, margin: '0 4px' }} />
                <span style={{ fontSize: 10, fontWeight: 800, color: C.mutedSoft, textTransform: 'uppercase', alignSelf: 'center', marginRight: 4 }}>Method</span>
                {[['all', 'All Methods'], ['cash', 'Cash'], ['gcash', 'GCash'], ['bank', 'Bank'], ['cod', 'COD']].map(([val, label]) => (
                  <Chip key={val} active={methodFilter === val} onClick={() => setMethodFilter(val)}>{label}</Chip>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* TABLE */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, overflow: 'hidden' }}>
        <div style={{ padding: '16px 22px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: C.white }}>Completed Settlements</span>
          <span style={{ fontSize: 11, color: C.mutedSoft }}>{filteredHistory.length} of {history.length} records</span>
        </div>

        <div style={{ maxHeight: 560, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 5, background: C.surfaceAlt }}>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {columns.map(h => (
                  <th key={h} style={{ padding: '11px 18px', textAlign: 'left', fontSize: 9.5, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={columns.length} style={{ padding: 60, textAlign: 'center', color: C.muted, fontSize: 12 }}>Loading history...</td></tr>
              ) : filteredHistory.length === 0 ? (
                <tr><td colSpan={columns.length} style={{ padding: 60, textAlign: 'center', color: C.muted, fontSize: 12 }}>No completed payment records found.</td></tr>
              ) : (
                filteredHistory.map((t, i) => {
                  const MethodIcon = methodIcon(get(t, 'method') || 'cash');
                  const mColor = methodColor(get(t, 'method') || 'cash');
                  return (
                    <motion.tr
                      key={t.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.015, 0.3) }}
                      whileHover={{ background: C.panelHover }}
                      onClick={() => setSelected(t)}
                      style={{
                        borderBottom: `1px solid ${C.border}`,
                        background: i % 2 === 1 ? 'rgba(255,255,255,0.012)' : 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      <td style={{ padding: '13px 18px', fontSize: 11, color: C.mutedSoft, fontFamily: 'monospace' }}>
                        {get(t, 'receiptNumber') || get(t, 'referenceNumber') || `#${String(t.id).slice(0, 8)}`}
                      </td>
                      <td style={{ padding: '13px 18px', fontSize: 12, fontWeight: 700, color: C.text }}>{get(t, 'customerName') || '—'}</td>
                      <td style={{ padding: '13px 18px', fontSize: 11, color: C.mutedSoft }}>
                        {get(t, 'vehicle') || get(t, 'plate') || '—'}
                      </td>
                      <td style={{ padding: '13px 18px', fontSize: 11, color: C.mutedSoft }}>{get(t, 'service') || '—'}</td>
                      <td style={{ padding: '13px 18px', fontSize: 11, color: C.mutedSoft }}>{get(t, 'technician') || '—'}</td>
                      <td style={{ padding: '13px 18px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: mColor, fontWeight: 700 }}>
                          <MethodIcon size={12} /> {get(t, 'method') || 'Cash'}
                        </span>
                      </td>
                      <td style={{ padding: '13px 18px', fontSize: 13, fontWeight: 800, color: C.emerald, fontVariantNumeric: 'tabular-nums' }}>
                        {fmtCurrency(get(t, 'amount'))}
                      </td>
                      <td style={{ padding: '13px 18px', fontSize: 11, color: C.mutedSoft }}>{fmtDate(get(t, 'completedAt'))}</td>
                      <td style={{ padding: '13px 18px' }}><StatusBadge status={get(t, 'status')} /></td>
                      <td style={{ padding: '13px 18px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <motion.button
                            whileHover={{ scale: 1.08, background: C.goldSoft, color: C.gold }}
                            whileTap={{ scale: 0.94 }}
                            onClick={() => setSelected(t)}
                            title="View Details"
                            style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${C.border}`, background: C.panel, color: C.mutedSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          >
                            <Eye size={12} />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.08, background: C.goldSoft, color: C.gold }}
                            whileTap={{ scale: 0.94 }}
                            onClick={() => setSelected(t)}
                            title="View Receipt"
                            style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${C.border}`, background: C.panel, color: C.mutedSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          >
                            <FileText size={12} />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TransactionDrawer transaction={selected} onClose={() => setSelected(null)} />
    </div>
  );
};

export default PaymentHistory;
