import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Calendar, Clock, FileText, ClipboardList,
  CreditCard, Banknote, Camera, Loader2, Plus, Minus,
  ArrowRight, Info, Layers, Home, CheckCircle2, Coins,
  ChevronDown, Shield, Zap, Star, Upload, X,
  Phone, BadgeCheck, Timer, Package,
  Wallet, Receipt, TrendingUp, Lock, CheckCheck, Sparkles, ImageOff,
} from 'lucide-react';

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const luzonRegions = {
  "NCR (Metro Manila)": {
    "Quezon City": ["Batasan Hills", "Commonwealth", "Holy Spirit", "Payatas", "Bagong Silangan"],
    "Manila": ["Sampaloc", "Ermita", "Malate", "Binondo", "Quiapo"],
    "Caloocan": ["Bagong Barrio", "Monumento", "Camarin"]
  },
  "Region III (Central Luzon)": {
    "Pampanga": ["Angeles City", "San Fernando", "Mabalacat"],
    "Bulacan": ["Malolos", "Meycauayan", "San Jose del Monte"],
    "Zambales": ["Olongapo", "Subic", "Iba"]
  },
  "Region IV-A (CALABARZON)": {
    "Cavite": ["Tagaytay", "Dasmariñas", "Bacoor", "Imus"],
    "Laguna": ["Sta. Rosa", "Calamba", "Biñan"],
    "Batangas": ["Batangas City", "Lipa", "Tanauan"]
  },
  "CAR (Cordillera)": {
    "Benguet": ["Baguio City", "La Trinidad", "Itogon"],
    "Ifugao": ["Banaue", "Lagawe"]
  }
};

const timeGroups = {
  Morning: ['07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM'],
  Afternoon: ['12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'],
  Evening: ['05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM']
};

/* ── tiny reusable primitives ── */
const SectionLabel = ({ icon: Icon, color = 'text-[#F5C518]', children }) => (
  <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] ${color} mb-1`}>
    {Icon && <Icon size={11} />}
    {children}
  </div>
);

const FieldWrapper = ({ children, className = '' }) => (
  <div className={`relative ${className}`}>{children}</div>
);

const inputBase =
  'w-full bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white placeholder-slate-600 outline-none focus:border-[#F5C518]/60 focus:bg-white/[0.06] focus:ring-2 ring-[#F5C518]/10 transition-all duration-200';

const selectBase =
  'w-full bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white outline-none focus:border-[#F5C518]/60 appearance-none cursor-pointer transition-all duration-200 disabled:opacity-30';

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } })
};

/* ── progress checker ── */
function useFormProgress(formData, selectedRegion, selectedCity, selectedBarangay) {
  const steps = [
    { label: 'Service Selected', done: !!formData.service_type },
    { label: 'Address Added', done: !!(selectedRegion && selectedCity && selectedBarangay) },
    { label: 'Date Selected', done: !!formData.date },
    { label: 'Time Selected', done: !!formData.time },
    { label: 'Payment Selected', done: !!formData.payment_method },
    { label: 'Ready to Review', done: !!(formData.payment_method && formData.date && formData.time && formData.appointment_address) }
  ];
  const done = steps.filter(s => s.done).length;
  const pct = Math.round((done / steps.length) * 100);
  return { steps, done, pct };
}

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */
const ServiceFormUI = ({
  formData,
  setFormData,
  selectedService,
  updateQuantity,
  handlePaymentTypeChange,
  handleReceiptUpload,
  uploadingReceipt,
  getDownpaymentAmount,
  getServiceGuidance,
  onBack,
  onContinue,
  bookedDates = [],
  bookedTimes = []
}) => {
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedBarangay, setSelectedBarangay] = useState('');
  const [streetInput, setStreetInput] = useState('');
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isReceiptDragging, setIsReceiptDragging] = useState(false);
  const photoInputRef = useRef();
  const receiptInputRef = useRef();

  const { steps, pct } = useFormProgress(formData, selectedRegion, selectedCity, selectedBarangay);

  /* sync address */
  useEffect(() => {
    const base = [selectedBarangay, selectedCity, selectedRegion].filter(Boolean).join(', ');
    const full = streetInput ? `${streetInput}, ${base}` : base;
    setFormData(prev => ({ ...prev, appointment_address: full }));
  }, [selectedRegion, selectedCity, selectedBarangay, streetInput]);

  const handleTimeSelect = (slot) => {
    setFormData({ ...formData, time: slot });
    setIsTimePickerOpen(false);
  };

  const handlePhotoAdd = (files) => {
    const arr = Array.from(files).slice(0, 5 - photoFiles.length);
    setPhotoFiles(p => [...p, ...arr]);
    arr.forEach(f => {
      const r = new FileReader();
      r.onload = (e) => setPhotoPreviews(p => [...p, e.target.result]);
      r.readAsDataURL(f);
    });
  };

  const removePhoto = (i) => {
    setPhotoFiles(p => p.filter((_, idx) => idx !== i));
    setPhotoPreviews(p => p.filter((_, idx) => idx !== i));
  };

  const triggerReceiptUpload = (fileList) => {
    if (!fileList || !fileList[0]) return;
    handleReceiptUpload({ target: { files: fileList } });
  };

  const canContinue = !!(formData.date && formData.time && formData.description && formData.appointment_address);
  const balance = formData.price - formData.actual_paid_amount;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-sans">

      {/* ── LEFT: main form ── */}
      <div className="lg:col-span-2 space-y-5">

        {/* ── S0: Dynamic Service Details ── */}
        {selectedService && (
          <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible"
            className="bg-[#080E1C] border border-white/[0.06] rounded-3xl overflow-hidden">
            <div className="aspect-[21/9] relative bg-white/[0.03]">
              {selectedService.image_url ? (
                <img src={selectedService.image_url} alt={selectedService.title} className="w-full h-full object-cover opacity-90" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageOff size={28} className="text-slate-700" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#080E1C] via-[#080E1C]/40 to-transparent" />
              <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between gap-4">
                <div>
                  {selectedService.service_categories?.name && (
                    <span className="text-[9px] font-bold text-[#F5C518] uppercase tracking-widest">{selectedService.service_categories.name}</span>
                  )}
                  <h2 className="text-xl font-black text-white leading-tight mt-0.5">{selectedService.title}</h2>
                </div>
                <span className="text-2xl font-black text-white font-mono shrink-0">₱{Number(selectedService.price).toLocaleString()}</span>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <p className="text-[12.5px] text-slate-400 leading-relaxed">{selectedService.description}</p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {selectedService.duration && (
                  <div className="flex items-center gap-2.5 p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                    <Timer size={14} className="text-[#F5C518] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Duration</p>
                      <p className="text-[11px] font-bold text-white truncate">{selectedService.duration}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2.5 p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                  <Coins size={14} className="text-[#F5C518] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Downpayment</p>
                    <p className="text-[11px] font-bold text-white truncate">
                      {selectedService.is_percentage_downpayment ? `${selectedService.downpayment_amount}%` : `₱${Number(selectedService.downpayment_amount || 0).toLocaleString()}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                  <Shield size={14} className={selectedService.requires_survey ? 'text-[#F5C518] shrink-0' : 'text-emerald-400 shrink-0'} />
                  <div className="min-w-0">
                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Survey</p>
                    <p className="text-[11px] font-bold text-white truncate">{selectedService.requires_survey ? 'Required' : 'Not Required'}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── S1: Service Guidance Banner ── */}
        <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible"
          className="relative overflow-hidden bg-[#F5C518]/[0.05] border border-[#F5C518]/15 rounded-3xl p-5 flex gap-4 items-start">
          <div className="p-2.5 rounded-xl bg-[#F5C518]/15 shrink-0">
            <Info className="text-[#F5C518]" size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <SectionLabel>Service Information</SectionLabel>
            <p className="text-xs text-slate-400 leading-relaxed mt-1">{getServiceGuidance(formData.service_type)}</p>
          </div>
        </motion.div>

        {/* ── S2: Progress Tracker ── */}
        <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible"
          className="bg-[#080E1C] border border-white/[0.06] rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <SectionLabel icon={TrendingUp} color="text-slate-400">Booking Progress</SectionLabel>
            <span className="text-xs font-black text-[#F5C518]">{pct}% Complete</span>
          </div>
          <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#F5C518] to-[#FFD43B] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {steps.map((step, i) => (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.06 }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wide transition-all duration-300 ${
                  step.done
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    : 'bg-white/[0.03] border border-white/[0.06] text-slate-600'
                }`}
              >
                <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${step.done ? 'bg-emerald-500' : 'bg-white/10'}`}>
                  {step.done
                    ? <CheckCheck size={10} className="text-white" />
                    : <span className="text-[7px] text-slate-600 font-black">{i + 1}</span>
                  }
                </div>
                <span className="truncate">{step.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── MAIN FORM CARD ── */}
        <motion.div custom={3} variants={cardVariants} initial="hidden" animate="visible"
          className="bg-[#080E1C] border border-white/[0.06] rounded-3xl p-7 md:p-9 space-y-8">

          {/* ── Quantity ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 pb-3 border-b border-white/[0.06]">
              <div className="p-2.5 rounded-xl bg-[#F5C518]/10 text-[#F5C518]"><Package size={16} /></div>
              <div>
                <h3 className="text-sm font-black text-white">Quantity</h3>
                <p className="text-[10px] text-slate-500">Number of units for this service</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => updateQuantity(-1)}
                className="w-11 h-11 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-slate-300 hover:border-[#F5C518]/40 hover:text-[#F5C518] transition-all"
              >
                <Minus size={15} />
              </button>
              <span className="text-lg font-black text-white w-10 text-center">{formData.quantity}</span>
              <button
                type="button"
                onClick={() => updateQuantity(1)}
                className="w-11 h-11 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-slate-300 hover:border-[#F5C518]/40 hover:text-[#F5C518] transition-all"
              >
                <Plus size={15} />
              </button>
            </div>
          </div>

          {/* ── S3: Address ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-white/[0.06]">
              <div className="p-2.5 rounded-xl bg-[#F5C518]/10 text-[#F5C518]"><MapPin size={16} /></div>
              <div>
                <h3 className="text-sm font-black text-white">Service Address</h3>
                <p className="text-[10px] text-slate-500">Where should our team come?</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <FieldWrapper>
                <SectionLabel color="text-slate-500">Region</SectionLabel>
                <div className="relative">
                  <select
                    value={selectedRegion}
                    onChange={(e) => { setSelectedRegion(e.target.value); setSelectedCity(''); setSelectedBarangay(''); }}
                    className={`${selectBase} bg-[#0A1120]`}
                  >
                    <option value="" className="bg-[#0A1120]">Select Region</option>
                    {Object.keys(luzonRegions).map(r => (
                      <option key={r} value={r} className="bg-[#0A1120]">{r}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
              </FieldWrapper>

              <FieldWrapper>
                <SectionLabel color="text-slate-500">City / Province</SectionLabel>
                <div className="relative">
                  <select
                    disabled={!selectedRegion}
                    value={selectedCity}
                    onChange={(e) => { setSelectedCity(e.target.value); setSelectedBarangay(''); }}
                    className={`${selectBase} bg-[#0A1120]`}
                  >
                    <option value="" className="bg-[#0A1120]">Select City</option>
                    {selectedRegion && Object.keys(luzonRegions[selectedRegion]).map(c => (
                      <option key={c} value={c} className="bg-[#0A1120]">{c}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
              </FieldWrapper>

              <FieldWrapper>
                <SectionLabel color="text-slate-500">Barangay / Area</SectionLabel>
                <div className="relative">
                  <select
                    disabled={!selectedCity}
                    value={selectedBarangay}
                    onChange={(e) => setSelectedBarangay(e.target.value)}
                    className={`${selectBase} bg-[#0A1120]`}
                  >
                    <option value="" className="bg-[#0A1120]">Select Barangay</option>
                    {selectedCity && luzonRegions[selectedRegion][selectedCity].map(b => (
                      <option key={b} value={b} className="bg-[#0A1120]">{b}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
              </FieldWrapper>
            </div>

            <FieldWrapper>
              <SectionLabel icon={Home} color="text-slate-500">House No. / Street / Landmark</SectionLabel>
              <input
                type="text"
                value={streetInput}
                onChange={(e) => setStreetInput(e.target.value)}
                className={inputBase}
                placeholder="e.g. 12B Sampaguita St., near SM City"
              />
            </FieldWrapper>

            <AnimatePresence>
              {formData.appointment_address && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-start gap-3 p-4 bg-[#F5C518]/[0.06] border border-[#F5C518]/20 rounded-2xl"
                >
                  <div className="p-2 bg-[#F5C518]/15 rounded-lg shrink-0 mt-0.5"><MapPin size={13} className="text-[#F5C518]" /></div>
                  <div>
                    <p className="text-[9px] font-black text-[#F5C518]/70 uppercase tracking-widest mb-0.5">Confirmed Location</p>
                    <p className="text-xs text-white font-semibold leading-snug">{formData.appointment_address}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── S4: Scheduling ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-white/[0.06]">
              <div className="p-2.5 rounded-xl bg-[#F5C518]/10 text-[#F5C518]"><Calendar size={16} /></div>
              <div>
                <h3 className="text-sm font-black text-white">Schedule</h3>
                <p className="text-[10px] text-slate-500">Pick your preferred date and time</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <SectionLabel icon={Calendar}>Preferred Date</SectionLabel>
                <div className="custom-datepicker">
                  <DatePicker
                    selected={formData.date ? new Date(formData.date) : null}
                    onChange={(date) => setFormData({ ...formData, date: date.toISOString().split('T')[0] })}
                    excludeDates={bookedDates.map(d => new Date(d))}
                    minDate={new Date()}
                    placeholderText="Select available date"
                    className={inputBase}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <SectionLabel icon={Clock}>Preferred Time</SectionLabel>
                <button
                  type="button"
                  onClick={() => setIsTimePickerOpen(!isTimePickerOpen)}
                  className={`${inputBase} flex justify-between items-center cursor-pointer`}
                >
                  <span className={formData.time ? 'text-[#F5C518] font-semibold' : 'text-slate-600'}>
                    {formData.time || 'Select preferred time'}
                  </span>
                  <ChevronDown size={14} className={`transition-transform duration-300 text-slate-500 ${isTimePickerOpen ? 'rotate-180 text-[#F5C518]' : ''}`} />
                </button>
              </div>
            </div>

            <AnimatePresence>
              {isTimePickerOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] p-5 space-y-5">
                    <div className="flex flex-wrap gap-4 text-[9px] font-black uppercase tracking-widest">
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#F5C518]/25 border border-[#F5C518]/50 inline-block" />Available</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#F5C518] inline-block" />Selected</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500/30 border border-red-500/30 inline-block" />Occupied</span>
                    </div>

                    {Object.entries(timeGroups).map(([group, slots]) => (
                      <div key={group} className="space-y-2">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{group}</p>
                        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                          {slots.map((slot) => {
                            const isSelected = formData.time === slot;
                            const isBooked = bookedTimes.includes(slot);
                            return (
                              <button
                                key={slot}
                                type="button"
                                disabled={isBooked}
                                onClick={() => handleTimeSelect(slot)}
                                className={`py-2.5 rounded-xl text-[9px] font-bold border transition-all duration-150 ${
                                  isBooked
                                    ? 'bg-red-500/[0.07] border-red-500/20 text-red-900 cursor-not-allowed'
                                    : isSelected
                                    ? 'bg-[#F5C518] border-[#F5C518] text-[#0A1120] shadow-lg shadow-[#F5C518]/20'
                                    : 'bg-[#F5C518]/[0.05] border-[#F5C518]/20 text-slate-400 hover:border-[#F5C518]/40 hover:bg-[#F5C518]/10'
                                }`}
                              >
                                {slot}
                                {isBooked && <span className="block text-[7px] text-red-800 mt-0.5 uppercase">Occupied</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    <AnimatePresence>
                      {formData.date && formData.time && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-3 p-3 bg-emerald-500/[0.08] border border-emerald-500/20 rounded-xl"
                        >
                          <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                          <p className="text-[10px] text-emerald-300 font-bold">
                            Scheduled: {formData.date} at {formData.time}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <SectionLabel icon={FileText} color="text-slate-400">Work Description</SectionLabel>
              <textarea
                rows={3}
                value={formData.description}
                readOnly
                className={`${inputBase} resize-none cursor-not-allowed opacity-60 italic`}
                placeholder="Project requirements defined by system administrator..."
              />
            </div>
          </div>

          {/* ── S5: Special Instructions ── */}
          <div className="space-y-1.5">
            <SectionLabel icon={ClipboardList} color="text-slate-400">Special Instructions / Notes</SectionLabel>
            <textarea
              rows={3}
              value={formData.materials_needed}
              onChange={(e) => setFormData({ ...formData, materials_needed: e.target.value })}
              className={`${inputBase} resize-none`}
              placeholder="Add any additional notes, access instructions, or special requests for our team..."
            />
          </div>

          {/* ── S5b: Photo Attachment ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <SectionLabel icon={Camera} color="text-slate-400">Site Photos (Optional)</SectionLabel>
              <span className="text-[9px] text-slate-600 uppercase tracking-widest">{photoFiles.length}/5</span>
            </div>
            <div
              onClick={() => photoInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); handlePhotoAdd(e.dataTransfer.files); }}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
                isDragging
                  ? 'border-[#F5C518] bg-[#F5C518]/10'
                  : 'border-white/10 hover:border-[#F5C518]/40 hover:bg-[#F5C518]/[0.03]'
              }`}
            >
              <Upload size={20} className="text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Drag & drop or <span className="text-[#F5C518] font-bold">browse files</span></p>
              <p className="text-[9px] text-slate-600 mt-1">Upload installation area, equipment, or property photos</p>
              <input ref={photoInputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => handlePhotoAdd(e.target.files)} />
            </div>
            {photoPreviews.length > 0 && (
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {photoPreviews.map((src, i) => (
                  <div key={i} className="relative group aspect-square">
                    <img src={src} alt="" className="w-full h-full object-cover rounded-xl border border-white/10" />
                    <button
                      onClick={(e) => { e.stopPropagation(); removePhoto(i); }}
                      className="absolute top-1 right-1 p-1 bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={10} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── S6: Payment Method ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-white/[0.06]">
              <div className="p-2.5 rounded-xl bg-[#F5C518]/10 text-[#F5C518]"><CreditCard size={16} /></div>
              <div>
                <h3 className="text-sm font-black text-white">Payment</h3>
                <p className="text-[10px] text-slate-500">Choose your preferred payment method</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, payment_method: 'COD', payment_type: 'downpayment' })}
                className={`relative group p-5 rounded-2xl border flex flex-col items-start gap-3 transition-all duration-200 text-left ${
                  formData.payment_method === 'COD'
                    ? 'bg-[#F5C518]/10 border-[#F5C518]/50 shadow-lg shadow-[#F5C518]/10'
                    : 'bg-white/[0.03] border-white/[0.08] hover:border-white/20'
                }`}
              >
                <div className={`p-2.5 rounded-xl ${formData.payment_method === 'COD' ? 'bg-[#F5C518]/20 text-[#F5C518]' : 'bg-white/5 text-slate-400'}`}>
                  <Banknote size={18} />
                </div>
                <div>
                  <p className={`text-xs font-black uppercase tracking-wide ${formData.payment_method === 'COD' ? 'text-[#F5C518]' : 'text-slate-300'}`}>Cash on Site</p>
                  <p className="text-[9px] text-slate-600 mt-0.5">Pay remaining balance when technician arrives</p>
                </div>
                {formData.payment_method === 'COD' && (
                  <div className="absolute top-3 right-3"><CheckCircle2 size={14} className="text-[#F5C518]" /></div>
                )}
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, payment_method: 'GCASH' })}
                className={`relative group p-5 rounded-2xl border flex flex-col items-start gap-3 transition-all duration-200 text-left ${
                  formData.payment_method === 'GCASH'
                    ? 'bg-[#F5C518]/10 border-[#F5C518]/50 shadow-lg shadow-[#F5C518]/10'
                    : 'bg-white/[0.03] border-white/[0.08] hover:border-white/20'
                }`}
              >
                <div className={`p-2.5 rounded-xl ${formData.payment_method === 'GCASH' ? 'bg-[#F5C518]/20 text-[#F5C518]' : 'bg-white/5 text-slate-400'}`}>
                  <Wallet size={18} />
                </div>
                <div>
                  <p className={`text-xs font-black uppercase tracking-wide ${formData.payment_method === 'GCASH' ? 'text-[#F5C518]' : 'text-slate-300'}`}>GCash Online</p>
                  <p className="text-[9px] text-slate-600 mt-0.5">Instant e-wallet payment, upload receipt</p>
                </div>
                {formData.payment_method === 'GCASH' && (
                  <div className="absolute top-3 right-3"><CheckCircle2 size={14} className="text-[#F5C518]" /></div>
                )}
              </button>
            </div>

            <AnimatePresence>
              {(formData.payment_method === 'GCASH' || formData.payment_method === 'COD') && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  className="p-6 bg-white/[0.03] border border-white/[0.07] rounded-2xl space-y-5"
                >
                  {formData.payment_method === 'COD' && (
                    <div className="flex gap-3 items-start p-3.5 bg-[#F5C518]/[0.06] border border-[#F5C518]/20 rounded-xl">
                      <Info size={14} className="text-[#F5C518] shrink-0 mt-0.5" />
                      <p className="text-[10px] text-[#F5C518]/80 font-semibold leading-snug">
                        A downpayment via GCash is still required for booking confirmation.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <SectionLabel color="text-slate-400">Payment Option</SectionLabel>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => handlePaymentTypeChange('downpayment')}
                        className={`py-3 px-4 rounded-xl border flex items-center justify-between text-[10px] font-black uppercase tracking-wider transition-all ${
                          formData.payment_type === 'downpayment'
                            ? 'bg-[#F5C518] border-[#F5C518] text-[#0A1120] shadow-md shadow-[#F5C518]/20'
                            : 'bg-white/[0.03] border-white/10 text-slate-500 hover:border-white/20'
                        }`}
                      >
                        Downpayment
                        {formData.payment_type === 'downpayment' && <CheckCircle2 size={13} />}
                      </button>
                      <button
                        type="button"
                        disabled={formData.payment_method === 'COD'}
                        onClick={() => handlePaymentTypeChange('full')}
                        className={`py-3 px-4 rounded-xl border flex items-center justify-between text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-25 disabled:cursor-not-allowed ${
                          formData.payment_type === 'full'
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20'
                            : 'bg-white/[0.03] border-white/10 text-slate-500 hover:border-white/20'
                        }`}
                      >
                        Full Payment
                        {formData.payment_type === 'full' && <CheckCircle2 size={13} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <SectionLabel icon={Coins} color="text-slate-400">Amount Due Now</SectionLabel>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-white font-black text-sm">₱</span>
                      <input
                        type="text"
                        value={formData.actual_paid_amount.toLocaleString()}
                        readOnly
                        className={`${inputBase} pl-9 opacity-70 cursor-not-allowed font-black text-base`}
                      />
                    </div>
                    <p className="text-[9px] text-slate-600 ml-1">
                      {formData.payment_type === 'full' ? 'Full service total' : `Downpayment required: ₱${getDownpaymentAmount().toLocaleString()}`}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={formData.reference_number}
                      onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                      className={inputBase}
                      placeholder="GCash Reference Number"
                    />
                  </div>

                  {/* ── Premium receipt drag-drop uploader ── */}
                  <div className="space-y-2">
                    <SectionLabel icon={Receipt} color="text-slate-400">Payment Receipt</SectionLabel>
                    {!formData.receipt_url ? (
                      <div
                        onClick={() => !uploadingReceipt && receiptInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setIsReceiptDragging(true); }}
                        onDragLeave={() => setIsReceiptDragging(false)}
                        onDrop={(e) => { e.preventDefault(); setIsReceiptDragging(false); triggerReceiptUpload(e.dataTransfer.files); }}
                        className={`relative border-2 border-dashed rounded-2xl p-7 text-center transition-all duration-200 ${
                          uploadingReceipt ? 'cursor-wait' : 'cursor-pointer'
                        } ${
                          isReceiptDragging
                            ? 'border-[#F5C518] bg-[#F5C518]/10'
                            : 'border-white/10 hover:border-[#F5C518]/40 hover:bg-[#F5C518]/[0.03]'
                        }`}
                      >
                        {uploadingReceipt ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 size={20} className="text-[#F5C518] animate-spin" />
                            <p className="text-xs text-slate-400 font-semibold">Uploading receipt…</p>
                            <div className="w-40 h-1 bg-white/10 rounded-full overflow-hidden mt-1">
                              <motion.div
                                className="h-full bg-[#F5C518] rounded-full"
                                animate={{ x: ['-100%', '100%'] }}
                                transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                                style={{ width: '50%' }}
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            <Camera size={20} className="text-slate-600 mx-auto mb-2" />
                            <p className="text-xs text-slate-500">Drag & drop or <span className="text-[#F5C518] font-bold">browse</span> your GCash receipt</p>
                            <p className="text-[9px] text-slate-600 mt-1">PNG or JPG, up to 5MB</p>
                          </>
                        )}
                        <input ref={receiptInputRef} type="file" className="hidden" onChange={handleReceiptUpload} accept="image/*" />
                      </div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative group overflow-hidden rounded-2xl border border-[#F5C518]/25"
                      >
                        <img src={formData.receipt_url} className="w-full h-40 object-cover" alt="Receipt" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent flex items-end justify-between p-3">
                          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                            <CheckCircle2 size={13} /> Uploaded
                          </p>
                          <button
                            type="button"
                            onClick={() => { setFormData({ ...formData, receipt_url: '' }); }}
                            className="p-1.5 bg-black/60 rounded-full hover:bg-black/80 transition-colors"
                          >
                            <X size={12} className="text-white" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── S7: Cost Breakdown ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 pb-3 border-b border-white/[0.06]">
              <div className="p-2.5 rounded-xl bg-[#F5C518]/10 text-[#F5C518]"><Receipt size={16} /></div>
              <div>
                <h3 className="text-sm font-black text-white">Cost Breakdown</h3>
                <p className="text-[10px] text-slate-500">Transparent invoice summary</p>
              </div>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Base Price</span>
                  <span className="text-sm font-black text-white">₱{formData.unit_price?.toLocaleString()}</span>
                </div>
                {formData.quantity > 1 && (
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Quantity</span>
                    <span className="text-sm font-black text-white">× {formData.quantity}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Subtotal</span>
                  <span className="text-sm font-black text-white">₱{formData.price?.toLocaleString()}</span>
                </div>
              </div>
              <div className="border-t border-white/[0.06] p-5 space-y-3 bg-[#F5C518]/[0.04]">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-black text-[#F5C518] uppercase tracking-wider">Required Payment</span>
                  <span className="text-base font-black text-white">₱{formData.actual_paid_amount?.toLocaleString()}</span>
                </div>
                {balance > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Remaining Balance</span>
                    <span className="text-sm font-black text-slate-400">₱{balance.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-white/[0.06]">
                  <span className="text-xs font-black text-white uppercase tracking-wider">Estimated Total</span>
                  <span className="text-xl font-black text-[#F5C518]">₱{formData.price?.toLocaleString()}</span>
                </div>
              </div>
            </div>
            {formData.requires_survey && (
              <div className="flex gap-3 items-center p-3.5 bg-[#F5C518]/[0.05] border border-[#F5C518]/15 rounded-xl">
                <Info size={13} className="text-[#F5C518] shrink-0" />
                <p className="text-[9px] text-[#F5C518]/70 font-semibold">Final pricing may vary based on site inspection results.</p>
              </div>
            )}
          </div>

          {/* ── S9: Trust Indicators ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: BadgeCheck, label: 'Verified Technicians' },
              { icon: Lock, label: 'Secure Transactions' },
              { icon: Zap, label: 'Fast Support' },
              { icon: Shield, label: 'Warranty Coverage' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2 p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl text-center">
                <div className="p-2.5 rounded-xl bg-[#F5C518]/10 text-[#F5C518]"><Icon size={16} /></div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide leading-tight">{label}</p>
              </div>
            ))}
          </div>

          {/* ── S10: Continue Button ── */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={onBack}
              className="sm:w-40 py-4 rounded-2xl border border-white/10 text-slate-300 font-bold text-[11px] uppercase tracking-[0.2em] hover:bg-white/5 transition-all"
            >
              Back
            </button>
            <motion.button
              onClick={onContinue}
              disabled={!canContinue || uploadingReceipt}
              whileHover={{ scale: canContinue ? 1.01 : 1 }}
              whileTap={{ scale: canContinue ? 0.98 : 1 }}
              className="flex-1 relative py-4 rounded-2xl font-black uppercase text-sm tracking-[0.25em] transition-all flex items-center justify-center gap-3 overflow-hidden bg-[#F5C518] hover:bg-[#FFD43B] text-[#0A1120] shadow-xl shadow-[#F5C518]/20 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <span>Continue to Review</span>
              <ArrowRight size={16} />
            </motion.button>
          </div>
          {!canContinue && (
            <p className="text-center text-[10px] text-slate-600 -mt-4">Complete address, date, and time to continue.</p>
          )}
        </motion.div>
      </div>

      {/* ── RIGHT: Sticky Sidebar ── */}
      <div className="hidden lg:block">
        <div className="sticky top-8 space-y-4">

          <motion.div
            custom={4} variants={cardVariants} initial="hidden" animate="visible"
            className="bg-[#080E1C] border border-white/[0.06] rounded-3xl p-6 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Booking Summary</h4>
              <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest ${
                pct === 100 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-[#F5C518]/15 text-[#F5C518]'
              }`}>
                {pct}%
              </span>
            </div>

            <div className="space-y-3">
              {[
                { icon: Layers, label: 'Service', value: formData.service_type },
                { icon: Home, label: 'Location', value: formData.appointment_address || 'Not specified' },
                { icon: Calendar, label: 'Schedule', value: formData.date ? `${formData.date}${formData.time ? ` @ ${formData.time}` : ''}` : 'Not set' },
                { icon: CreditCard, label: 'Payment', value: formData.payment_method || 'Not selected' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl shrink-0 bg-[#F5C518]/10 text-[#F5C518]"><Icon size={14} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{label}</p>
                    <p className="text-[11px] font-bold text-white truncate leading-snug mt-0.5">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white/[0.03] border border-dashed border-white/[0.08] rounded-2xl p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Base Cost</span>
                <span className="text-xs font-black text-white">₱{formData.unit_price?.toLocaleString()}</span>
              </div>
              <div className="border-t border-white/[0.06] pt-3 flex justify-between items-center">
                <span className="text-[10px] font-black text-white uppercase">Estimated Total</span>
                <span className="text-lg font-black text-[#F5C518]">₱{formData.price?.toLocaleString()}</span>
              </div>
              <div className="p-3 bg-[#F5C518]/[0.08] rounded-xl border border-[#F5C518]/15 mt-1">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black text-[#F5C518] uppercase tracking-wide">Due Now</span>
                  <span className="text-sm font-black text-white">₱{formData.actual_paid_amount?.toLocaleString()}</span>
                </div>
              </div>
              {formData.payment_method === 'COD' && balance > 0 && (
                <div className="flex justify-between items-center px-1">
                  <span className="text-[9px] font-bold text-slate-600 uppercase">COD Balance</span>
                  <span className="text-[11px] font-black text-slate-500">₱{balance.toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                <span className="text-slate-600">Completion</span>
                <span className="text-[#F5C518]">{pct}%</span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#F5C518] to-[#FFD43B] rounded-full"
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>
          </motion.div>

          {formData.requires_survey && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 p-4 bg-[#F5C518]/[0.05] border border-[#F5C518]/15 rounded-2xl"
            >
              <Info size={14} className="text-[#F5C518] shrink-0 mt-0.5" />
              <p className="text-[9px] font-semibold text-[#F5C518]/70 leading-snug">Final pricing may vary based on site inspection results.</p>
            </motion.div>
          )}

          <div className="space-y-2">
            {[
              { icon: BadgeCheck, text: 'Verified Technicians' },
              { icon: Lock, text: 'Secure Transactions' },
              { icon: Zap, text: 'Fast Support Response' },
              { icon: Shield, text: 'Warranty Coverage' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2.5 px-3 py-2 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                <Icon size={11} className="text-emerald-400 shrink-0" />
                <span className="text-[10px] text-slate-500 font-semibold">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Mobile sticky bottom bar ── */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 p-4 bg-[#050912]/95 backdrop-blur-xl border-t border-white/[0.08]">
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total</p>
            <p className="text-lg font-black text-[#F5C518]">₱{formData.price?.toLocaleString()}</p>
          </div>
          <motion.button
            onClick={onContinue}
            disabled={!canContinue || uploadingReceipt}
            whileTap={{ scale: 0.97 }}
            className="flex-1 py-4 bg-[#F5C518] rounded-2xl font-black uppercase text-[10px] tracking-widest text-[#0A1120] flex items-center justify-center gap-2 shadow-lg shadow-[#F5C518]/20 disabled:opacity-40"
          >
            <Sparkles size={14} /> Continue to Review
          </motion.button>
        </div>
      </div>

    </motion.div>
  );
};

export default ServiceFormUI;
