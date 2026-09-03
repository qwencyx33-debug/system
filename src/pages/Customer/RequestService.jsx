import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Package, Zap, ArrowRight, Clock, Search, CheckCircle2, Shield,
  Users, Star, X, Calendar, Tag, ChevronRight, Layers, BadgeCheck, Headphones,
  CheckCheck, Sparkles, Copy, Home as HomeIcon,
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import ServiceFormUI from './ServiceFormUI';
import { MessageCenter, useMessageCenter } from './PremiumMessageCenter';

/* ═══════════════════════════════════════════════════════════
   DESIGN TOKENS (do not scatter raw colors outside this list)
   Navy:   #050912 #080E1C #0A1120 #0F1B32 #16223B
   Yellow: #F5C518 (primary) #FFD43B (hover) #B8930C (on-yellow text)
   Status: emerald-400 (success) red-400 (error) — semantic only
═══════════════════════════════════════════════════════════ */

/* ─── Skeleton ───────────────────────────────────────────── */
const Shimmer = ({ className = '' }) => (
  <div
    className={`rounded-2xl bg-gradient-to-r from-white/[0.04] via-white/[0.08] to-white/[0.04] bg-[length:200%_100%] ${className}`}
    style={{ animation: 'shimmer 1.8s infinite' }}
  />
);

/* ─── Step Indicator ─────────────────────────────────────── */
const BookingSteps = ({ step }) => {
  const steps = [
    { n: 1, label: 'Select Service', icon: Layers },
    { n: 2, label: 'Fill Details',   icon: Calendar },
    { n: 3, label: 'Review & Confirm', icon: CheckCheck },
  ];
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => {
        const done   = step > s.n;
        const active = step === s.n;
        const Icon   = s.icon;
        return (
          <React.Fragment key={s.n}>
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center border-2 transition-all duration-500 ${
                done   ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_16px_rgba(52,211,153,0.3)]' :
                active ? 'bg-[#F5C518] border-[#F5C518] shadow-[0_0_18px_rgba(245,197,24,0.35)]' :
                'bg-white/[0.04] border-white/10'
              }`}>
                {done
                  ? <CheckCheck size={15} className="text-white" />
                  : <Icon size={14} className={active ? 'text-[#0A1120]' : 'text-slate-600'} />
                }
              </div>
              <span className={`text-[8px] font-bold uppercase tracking-wider hidden sm:block ${
                done ? 'text-emerald-400' : active ? 'text-[#F5C518]' : 'text-slate-600'
              }`}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 mx-2 relative h-px bg-white/[0.07] mb-5">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#F5C518] to-emerald-500"
                  initial={{ width: 0 }}
                  animate={{ width: step > s.n ? '100%' : '0%' }}
                  transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/* ─── Trust Card ─────────────────────────────────────────── */
const TrustCard = ({ icon: Icon, title, desc, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
    whileHover={{ y: -3 }}
    className="bg-white/[0.03] border border-white/[0.07] hover:border-[#F5C518]/30 rounded-2xl p-5 transition-all group"
  >
    <div className="w-9 h-9 bg-[#F5C518]/10 rounded-xl flex items-center justify-center mb-3">
      <Icon size={16} className="text-[#F5C518]" />
    </div>
    <p className="text-sm font-bold text-white mb-1">{title}</p>
    <p className="text-[11px] text-slate-500 leading-relaxed">{desc}</p>
  </motion.div>
);

/* ─── Service Card ───────────────────────────────────────── */
const ServiceCard = ({ service: s, onSelect, index = 0 }) => {
  const [hovered, setHovered] = useState(false);
  const downpaymentLabel = s.is_percentage_downpayment
    ? `${s.downpayment_amount}% down`
    : `₱${Number(s.downpayment_amount || 0).toLocaleString()} down`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.38, ease: [0.23, 1, 0.32, 1] }}
      whileHover={{ y: -4 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={() => onSelect(s)}
      className="bg-[#080E1C] border border-white/[0.07] hover:border-[#F5C518]/30 rounded-[1.75rem] overflow-hidden cursor-pointer group flex flex-col relative transition-all duration-300 shadow-xl hover:shadow-[0_20px_50px_rgba(245,197,24,0.08)]"
    >
      {/* Image */}
      <div className="aspect-[16/9] relative overflow-hidden bg-white/[0.04]">
        {s.image_url ? (
          <motion.img
            src={s.image_url}
            alt={s.title}
            className="w-full h-full object-cover"
            animate={{ scale: hovered ? 1.07 : 1 }}
            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
            style={{ opacity: 0.85 }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={36} className="text-slate-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080E1C] via-transparent to-transparent opacity-80" />

        <div className="absolute top-3.5 left-3.5 flex gap-1.5 flex-wrap">
          {s.service_categories?.name && (
            <span className="bg-[#0A1120]/90 border border-white/10 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[8px] font-bold text-slate-200 uppercase tracking-wider">
              {s.service_categories.name}
            </span>
          )}
          {s.requires_survey && (
            <span className="bg-[#F5C518] backdrop-blur-sm px-2.5 py-1 rounded-lg text-[8px] font-black text-[#0A1120] uppercase tracking-wider">
              Survey Required
            </span>
          )}
        </div>

        <div className="absolute bottom-3.5 right-3.5">
          <span className="bg-black/70 backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded-xl text-sm font-black text-white font-mono">
            ₱{Number(s.price).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-sm font-black text-white group-hover:text-[#F5C518] transition-colors uppercase tracking-tight leading-tight mb-2">
          {s.title}
        </h3>

        <div className="flex items-center gap-3 mb-3 flex-wrap">
          {s.duration && (
            <div className="flex items-center gap-1 text-slate-500">
              <Clock size={11} />
              <span className="text-[10px] font-semibold">{s.duration}</span>
            </div>
          )}
          {s.downpayment_amount != null && (
            <div className="flex items-center gap-1 text-slate-500">
              <Tag size={11} />
              <span className="text-[10px] font-semibold">{downpaymentLabel}</span>
            </div>
          )}
        </div>

        <AnimatePresence>
          {hovered ? (
            <motion.p
              key="desc"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              className="text-[11px] text-slate-400 leading-relaxed mb-3 overflow-hidden"
            >
              {s.description}
            </motion.p>
          ) : (
            <p className="text-[11px] text-slate-600 line-clamp-2 mb-3">{s.description}</p>
          )}
        </AnimatePresence>

        <div className="mt-auto">
          <motion.div
            animate={hovered ? { backgroundColor: 'rgba(245,197,24,1)' } : { backgroundColor: 'rgba(255,255,255,0.05)' }}
            transition={{ duration: 0.2 }}
            className={`w-full py-3 rounded-xl text-[10px] font-bold uppercase tracking-[0.15em] flex items-center justify-center gap-2 border border-white/[0.07] group-hover:border-[#F5C518]/30 ${hovered ? 'text-[#0A1120]' : 'text-white'}`}
          >
            <span>Select Service</span>
            <ArrowRight size={13} />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

/* ─── Full-screen Booking Success ────────────────────────── */
const BookingSuccess = ({ result, onTrack, onDashboard }) => {
  const [copied, setCopied] = useState(false);
  const copyRef = () => {
    navigator.clipboard?.writeText(result.reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-[#050912] flex items-center justify-center p-6 overflow-y-auto"
    >
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)', backgroundSize: '44px 44px' }} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] bg-[#F5C518]/[0.06] rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 18 }}
            className="w-20 h-20 rounded-3xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mb-6"
          >
            <CheckCircle2 size={38} className="text-emerald-400" />
          </motion.div>
          <h1 className="text-2xl font-black text-white mb-2">Booking Confirmed</h1>
          <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
            Your request has been received. Our team will review and confirm your appointment shortly.
          </p>
        </div>

        <div className="bg-[#080E1C] border border-white/[0.07] rounded-3xl p-6 space-y-5 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">Reference Number</p>
              <p className="text-lg font-black text-[#F5C518] font-mono tracking-wide">{result.reference}</p>
            </div>
            <button
              onClick={copyRef}
              className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-[#F5C518]/40 transition-all"
            >
              {copied ? <CheckCheck size={14} className="text-emerald-400" /> : <Copy size={14} className="text-slate-400" />}
            </button>
          </div>

          <div className="border-t border-white/[0.06] pt-5 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Current Status</span>
            <span className="px-3 py-1 rounded-full bg-[#F5C518]/15 border border-[#F5C518]/25 text-[#F5C518] text-[10px] font-black uppercase tracking-wider">
              {result.status || 'Pending'}
            </span>
          </div>

          <div className="border-t border-white/[0.06] pt-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">What Happens Next</p>
            <p className="text-[12px] text-slate-400 leading-relaxed">
              Our team verifies your payment and appointment details, then confirms your scheduled slot. You'll be notified once your booking status changes.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onTrack}
            className="w-full py-4 rounded-2xl bg-[#F5C518] hover:bg-[#FFD43B] text-[#0A1120] font-black text-[12px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-lg shadow-[#F5C518]/20 transition-all"
          >
            Track Booking <ArrowRight size={15} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onDashboard}
            className="w-full py-4 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 text-slate-300 font-bold text-[12px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all"
          >
            <HomeIcon size={14} /> Return to Dashboard
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ══════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                            */
/* ══════════════════════════════════════════════════════════ */
const RequestService = ({ profile, onBack, onSuccess }) => {
  const [step,             setStep]             = useState(1);
  const [loading,          setLoading]          = useState(false);
  const [services,         setServices]         = useState([]);
  const [fetchingServices, setFetchingServices] = useState(true);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [searchQuery,      setSearchQuery]      = useState('');
  const [activeFilter,     setActiveFilter]     = useState('All');
  const [selectedService,  setSelectedService]  = useState(null);
  const [bookingResult,    setBookingResult]    = useState(null);

  const mc = useMessageCenter();

  const [formData, setFormData] = useState({
    service_type: '',
    description: '',
    materials_needed: '',
    appointment_address: profile?.address || '',
    date: '',
    time: '',
    price: 0,
    unit_price: 0,
    quantity: 1,
    requires_survey: false,
    downpayment: 0,
    is_percentage: true,
    payment_method: 'COD',
    payment_type: 'downpayment',
    reference_number: '',
    receipt_url: '',
    actual_paid_amount: 0,
  });

  /* ── LOGIC HELPERS (unchanged) ─────────────────────────── */
  const getDownpaymentAmount = () => {
    const totalPrice = formData.unit_price * formData.quantity;
    return formData.is_percentage
      ? (totalPrice * (formData.downpayment / 100))
      : formData.downpayment;
  };

  const getServiceGuidance = (serviceTitle) => {
    const title = serviceTitle?.toLowerCase() || '';
    if (title.includes('cctv')) return "Recommendation: Please ensure the area has a stable Wi-Fi connection and available power outlets for the installation.";
    if (title.includes('alarm') || title.includes('security')) return "Note: For optimal performance, sensors should be placed away from air vents or direct heat sources.";
    return "Please provide a detailed description or upload photos of the site to help us provide an accurate assessment.";
  };

  /* ── FETCH (unchanged) ─────────────────────────────────── */
  useEffect(() => {
    const fetchActiveServices = async () => {
      setFetchingServices(true);
      const { data, error } = await supabase
        .from('service_types')
        .select('*, service_categories(name)')
        .eq('is_archived', false)
        .order('title', { ascending: true });
      if (!error) setServices(data || []);
      else mc.error('Could not load services', error.message);
      setFetchingServices(false);
    };
    fetchActiveServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── HANDLERS (logic unchanged, alerts routed to Message Center) ── */
  const handleServiceSelect = (service) => {
    const basePrice = service.price;
    const minDownpayment = service.is_percentage_downpayment
      ? (basePrice * (service.downpayment_amount / 100))
      : service.downpayment_amount;

    setSelectedService(service);
    setFormData({
      ...formData,
      service_type: service.title,
      price: basePrice,
      unit_price: basePrice,
      quantity: 1,
      requires_survey: service.requires_survey,
      downpayment: service.downpayment_amount,
      is_percentage: service.is_percentage_downpayment,
      description: service.description,
      actual_paid_amount: minDownpayment,
      payment_type: 'downpayment',
    });
    setStep(2);
  };

  const updateQuantity = (val) => {
    const newQty   = Math.max(1, formData.quantity + val);
    const newTotal = formData.unit_price * newQty;
    let amountToPay = formData.payment_type === 'full'
      ? newTotal
      : (formData.is_percentage ? (newTotal * (formData.downpayment / 100)) : formData.downpayment);
    setFormData({ ...formData, quantity: newQty, price: newTotal, actual_paid_amount: amountToPay });
  };

  const handlePaymentTypeChange = (type) => {
    const amount = type === 'full' ? formData.price : getDownpaymentAmount();
    setFormData({ ...formData, payment_type: type, actual_paid_amount: amount });
  };

  const handleReceiptUpload = async (e) => {
    try {
      setUploadingReceipt(true);
      const file = e.target.files[0];
      if (!file) return;
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `receipts/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('assets').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('assets').getPublicUrl(filePath);
      setFormData({ ...formData, receipt_url: data.publicUrl });
      mc.success('Receipt uploaded', 'Your payment receipt was attached successfully.');
    } catch (error) {
      mc.error('Upload failed', error.message);
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.date || !formData.time || !formData.description || !formData.appointment_address) {
      mc.warning('Information Required', 'Please complete all required fields before submitting.');
      return false;
    }

    const confirmed = await mc.confirm(
      'Confirm Booking?',
      `You're about to book "${formData.service_type}" for ₱${Number(formData.actual_paid_amount).toLocaleString()} due now. This cannot be edited after submission.`,
      { confirmLabel: 'Submit Booking' }
    );
    if (!confirmed) return false;

    setLoading(true);
    const loader = mc.loading('Submitting your booking', 'Please don\u2019t close this window.');
    try {
      const { data, error } = await supabase.from('appointments').insert([{
        user_id:           profile.id,
        full_name:         `${profile.first_name} ${profile.last_name}`,
        address:           formData.appointment_address,
        service_type:      formData.service_type,
        details:           `${formData.description} (Qty: ${formData.quantity})`,
        materials_notes:   formData.materials_needed,
        schedule_date:     formData.date,
        appointment_time:  formData.time,
        price:             formData.price,
        payment_method:    formData.payment_method,
        reference_number:  formData.reference_number,
        receipt_image:     formData.receipt_url,
        downpayment_paid:  formData.actual_paid_amount,
        status:            'pending',
        requires_survey:   formData.requires_survey,
        payment_status:    formData.payment_type === 'full' ? 'full_paid' : 'downpayment_paid',
      }]).select().single();
      if (error) throw error;

      loader.close();
      const ref = data?.id ? `BK-${String(data.id).slice(0, 8).toUpperCase()}` : `BK-${Date.now().toString(36).toUpperCase()}`;
      setBookingResult({ reference: ref, status: data?.status || 'pending' });
      return true;
    } catch (error) {
      loader.close();
      mc.error('Submission Error', error.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /* ── Derived data ──────────────────────────────────────── */
  const categories = useMemo(() => {
    const cats = ['All', ...new Set(services.map(s => s.service_categories?.name).filter(Boolean))];
    return cats;
  }, [services]);

  const filteredServices = useMemo(() => {
    return services.filter(s => {
      const matchesSearch =
        !searchQuery ||
        s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.service_categories?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat =
        activeFilter === 'All' || s.service_categories?.name === activeFilter;
      return matchesSearch && matchesCat;
    });
  }, [services, searchQuery, activeFilter]);

  /* ── Booking success — full screen takeover ────────────── */
  if (bookingResult) {
    return (
      <>
        <AnimatePresence>
          <BookingSuccess
            result={bookingResult}
            onTrack={() => { setBookingResult(null); onSuccess(); }}
            onDashboard={() => { setBookingResult(null); onSuccess(); }}
          />
        </AnimatePresence>
        <MessageCenter {...mc} />
      </>
    );
  }

  /* ── Loading skeleton ──────────────────────────────────── */
  if (fetchingServices) return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
      <style>{`@keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }`}</style>
      <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.06] bg-[#080E1C] p-8 md:p-12 mb-8">
        <Shimmer className="h-5 w-32 mb-6" />
        <Shimmer className="h-10 w-2/3 mb-3" />
        <Shimmer className="h-4 w-1/2 mb-8" />
        <div className="flex gap-3">
          <Shimmer className="h-10 w-36" />
          <Shimmer className="h-10 w-28" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-[#080E1C] border border-white/[0.06] rounded-[1.75rem] overflow-hidden">
            <Shimmer className="aspect-video w-full rounded-none" />
            <div className="p-5 space-y-3">
              <Shimmer className="h-5 w-3/4" />
              <Shimmer className="h-3.5 w-1/2" />
              <Shimmer className="h-3 w-full" />
              <Shimmer className="h-3 w-4/5" />
              <Shimmer className="h-11 w-full mt-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  /* ══════════════════════════════════════════════════════════ */
  return (
    <div className="bg-[#050912] min-h-full">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
        className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-7 pb-24 overflow-x-hidden"
      >
        <style>{`@keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }`}</style>

        {/* ── Back nav ─────────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-6">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={step === 1 ? onBack : () => setStep(step - 1)}
            className="group flex items-center gap-1.5 text-slate-500 hover:text-white transition-colors text-[11px] font-semibold uppercase tracking-[0.18em]"
          >
            <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            {step === 1 ? 'Cancel Request' : 'Back'}
          </motion.button>
        </div>

        {/* ── Step Indicator ───────────────────────────────── */}
        <BookingSteps step={step} />

        <AnimatePresence mode="wait">

          {/* ════════════ STEP 1 — SERVICE SELECTION ════════ */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            >

              {/* ── Hero Section ───────────────────────────── */}
              <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.07] mb-7">
                <div className="absolute inset-0 bg-gradient-to-br from-[#0F1B32] via-[#0A1120] to-[#050912]" />
                <div className="absolute inset-0 bg-gradient-to-tr from-[#F5C518]/[0.07] via-transparent to-transparent" />
                <div className="absolute top-0 right-0 w-72 h-72 bg-[#F5C518]/[0.06] rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 left-10 w-56 h-56 bg-white/[0.02] rounded-full blur-3xl pointer-events-none" />
                <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

                <div className="relative z-10 p-7 md:p-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#F5C518]/10 border border-[#F5C518]/25 rounded-full mb-5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-bold text-[#F5C518] uppercase tracking-widest">Services Available</span>
                  </div>
                  <h1 className="text-2xl md:text-4xl font-black text-white leading-tight mb-3">
                    Welcome back, <span className="text-[#F5C518]">{profile?.first_name || 'there'}</span>
                  </h1>
                  <p className="text-slate-400 text-sm leading-relaxed max-w-xl mb-7">
                    Book professional security and technology services. Choose a service below and schedule your appointment in just a few minutes.
                  </p>

                  <div className="flex flex-wrap gap-2.5">
                    {[
                      { icon: BadgeCheck, label: 'Professional Assessment' },
                      { icon: Shield,     label: 'Secure Installation'     },
                      { icon: Tag,        label: 'Transparent Pricing'     },
                      { icon: Headphones, label: 'Appointment Tracking'    },
                    ].map(({ icon: Icon, label }) => (
                      <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.05] border border-white/10 rounded-full">
                        <Icon size={11} className="text-emerald-400" />
                        <span className="text-[10px] font-semibold text-slate-300">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Search ──────────────────────────────────── */}
              <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="relative flex-1 group">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#F5C518] transition-colors" size={14} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by title, category, or description…"
                    className="w-full bg-white/[0.04] border border-white/8 rounded-xl py-3 pl-10 pr-10 text-sm text-slate-300 placeholder:text-slate-700 outline-none focus:border-[#F5C518]/50 focus:bg-white/[0.06] focus:ring-2 ring-[#F5C518]/15 transition-all"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors">
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Category filter chips */}
              {categories.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {categories.map(cat => (
                    <motion.button
                      key={cat}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActiveFilter(cat)}
                      className={`px-3.5 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all border ${
                        activeFilter === cat
                          ? 'bg-[#F5C518] border-[#F5C518] text-[#0A1120] shadow-lg shadow-[#F5C518]/15'
                          : 'bg-white/[0.04] border-white/[0.08] text-slate-500 hover:text-white hover:border-white/20'
                      }`}
                    >
                      {cat}
                    </motion.button>
                  ))}
                </div>
              )}

              {/* ── How to Book ────────────────────────────── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-7">
                {[
                  { n: '01', label: 'Select Service', desc: 'Choose the service or system you would like to book.' },
                  { n: '02', label: 'Fill Details',   desc: 'Provide your address, schedule, and specific requirements.' },
                  { n: '03', label: 'Review & Confirm', desc: 'Check your details and complete the initial payment.' },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="bg-white/[0.03] border border-white/[0.07] p-5 rounded-2xl relative overflow-hidden group hover:border-[#F5C518]/25 transition-all"
                  >
                    <span className="absolute -right-1 -top-1 text-5xl font-black text-white/[0.04] italic group-hover:text-[#F5C518]/[0.08] transition-colors select-none">{item.n}</span>
                    <p className="text-[9px] font-bold text-[#F5C518] uppercase tracking-widest mb-1.5">{item.label}</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{item.desc}</p>
                  </motion.div>
                ))}
              </div>

              {/* ── Service Grid ───────────────────────────── */}
              {filteredServices.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
                  {filteredServices.map((s, i) => (
                    <ServiceCard key={s.id} service={s} onSelect={handleServiceSelect} index={i} />
                  ))}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="py-20 text-center"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mx-auto mb-5">
                    <Search size={24} className="text-slate-700" />
                  </div>
                  <p className="text-base font-bold text-slate-400 mb-2">No services found</p>
                  <p className="text-[12px] text-slate-600 mb-5">
                    {searchQuery ? `No results for "${searchQuery}". Try a different search.` : 'No services match the selected filter.'}
                  </p>
                  <button
                    onClick={() => { setSearchQuery(''); setActiveFilter('All'); }}
                    className="px-4 py-2 bg-[#F5C518]/15 border border-[#F5C518]/25 text-[#F5C518] rounded-xl text-[11px] font-bold hover:bg-[#F5C518]/25 transition-all"
                  >
                    Clear filters
                  </button>
                </motion.div>
              )}

              {/* ── Why Choose Us ──────────────────────────── */}
              {filteredServices.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-5">
                    <Star size={14} className="text-[#F5C518]" />
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Why Choose Us</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <TrustCard icon={Users}     title="Expert Team"          desc="Trained and certified security professionals." delay={0}    />
                    <TrustCard icon={BadgeCheck} title="Verified Technicians" desc="Background-checked and ID-verified staff."     delay={0.07} />
                    <TrustCard icon={Zap}       title="Fast Response"        desc="Quick scheduling with minimal wait times."     delay={0.14} />
                    <TrustCard icon={Shield}    title="Warranty Support"     desc="All installations covered by our warranty."   delay={0.21} />
                  </div>
                </div>
              )}

            </motion.div>
          )}

          {/* ════════════ STEP 2 — FORM ══════════════════════ */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            >
              {formData.service_type && (
                <div className="flex items-center justify-between bg-[#F5C518]/[0.06] border border-[#F5C518]/20 rounded-2xl px-5 py-3.5 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-[#F5C518]/15 rounded-lg flex items-center justify-center">
                      <CheckCircle2 size={14} className="text-[#F5C518]" />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5C518] mb-0.5">Selected Service</p>
                      <p className="text-sm font-bold text-white">{formData.service_type}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setStep(1)}
                    className="text-[10px] font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-wider"
                  >
                    Change
                  </button>
                </div>
              )}

              <ServiceFormUI
                formData={formData}
                setFormData={setFormData}
                selectedService={selectedService}
                updateQuantity={updateQuantity}
                handlePaymentTypeChange={handlePaymentTypeChange}
                handleReceiptUpload={handleReceiptUpload}
                uploadingReceipt={uploadingReceipt}
                getDownpaymentAmount={getDownpaymentAmount}
                getServiceGuidance={getServiceGuidance}
                onBack={() => setStep(1)}
                onContinue={() => setStep(3)}
              />
            </motion.div>
          )}

          {/* ════════════ STEP 3 — REVIEW & CONFIRM ═════════ */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="max-w-2xl mx-auto"
            >
              <ReviewPanel
                profile={profile}
                formData={formData}
                loading={loading}
                onEdit={() => setStep(2)}
                onSubmit={handleSubmit}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>

      <MessageCenter {...mc} />
    </div>
  );
};

/* ─── Review Before Submit — read only ───────────────────── */
const ReviewPanel = ({ profile, formData, loading, onEdit, onSubmit }) => {
  const rows = [
    { label: 'Customer', value: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || '—' },
    { label: 'Selected Service', value: formData.service_type || '—' },
    { label: 'Quantity', value: formData.quantity },
    { label: 'Price', value: `₱${Number(formData.price || 0).toLocaleString()}` },
    { label: 'Schedule', value: formData.date && formData.time ? `${formData.date} • ${formData.time}` : '—' },
    { label: 'Address', value: formData.appointment_address || '—' },
    { label: 'Payment Method', value: formData.payment_method || '—' },
    { label: 'Reference Number', value: formData.reference_number || '—' },
    { label: 'Amount Due Now', value: `₱${Number(formData.actual_paid_amount || 0).toLocaleString()}` },
    { label: 'Special Instructions', value: formData.materials_needed || '—' },
  ];

  return (
    <div className="bg-[#080E1C] border border-white/[0.07] rounded-[2rem] p-7 md:p-9">
      <div className="flex items-center gap-3 pb-5 mb-6 border-b border-white/[0.06]">
        <div className="w-10 h-10 rounded-xl bg-[#F5C518]/10 flex items-center justify-center">
          <CheckCheck size={18} className="text-[#F5C518]" />
        </div>
        <div>
          <h2 className="text-base font-black text-white">Review Your Booking</h2>
          <p className="text-[11px] text-slate-500">Please confirm everything is correct — this step is view-only.</p>
        </div>
      </div>

      <div className="divide-y divide-white/[0.05] mb-8">
        {rows.map((r) => (
          <div key={r.label} className="flex items-start justify-between gap-6 py-3.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">{r.label}</span>
            <span className="text-[13px] font-semibold text-white text-right break-words">{r.value}</span>
          </div>
        ))}
      </div>

      {formData.requires_survey && (
        <div className="flex items-start gap-3 p-4 bg-[#F5C518]/[0.06] border border-[#F5C518]/20 rounded-2xl mb-6">
          <Shield size={15} className="text-[#F5C518] shrink-0 mt-0.5" />
          <p className="text-[11px] text-[#F5C518]/90 font-semibold leading-relaxed">
            This service requires a site survey. Final pricing may be adjusted after inspection.
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onEdit}
          className="flex-1 py-4 rounded-2xl border border-white/10 text-slate-300 font-bold text-[11px] uppercase tracking-[0.2em] hover:bg-white/5 transition-all"
        >
          Edit Details
        </button>
        <motion.button
          whileTap={{ scale: 0.98 }}
          disabled={loading}
          onClick={onSubmit}
          className="flex-[2] py-4 rounded-2xl bg-[#F5C518] hover:bg-[#FFD43B] text-[#0A1120] font-black text-[12px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-lg shadow-[#F5C518]/20 transition-all disabled:opacity-50"
        >
          <Sparkles size={15} /> Confirm & Submit Booking
        </motion.button>
      </div>
    </div>
  );
};

export default RequestService;
