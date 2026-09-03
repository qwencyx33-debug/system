import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, Check, X, MapPin, Calendar, 
  ShieldCheck, Activity, Search, FileText, 
  CheckCircle2, RotateCcw, Clock, Hammer,
  Zap, ArrowUpRight, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../supabaseClient';

const QCVerificationView = () => {
  const [qcRequests, setQcRequests] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchQCRequests();

    const channel = supabase
      .channel('qc_realtime_stream')
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'appointments' }, 
          (payload) => {
            // Optimistic update: trigger fetch or handle payload directly
            fetchQCRequests();
          }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchQCRequests = async () => {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .in('status', ['qc', 'assigned']) 
      .order('updated_at', { ascending: false });

    if (!error) setQcRequests(data || []);
    setIsLoading(false);
  };

  const handleUpdateStatus = async (id, status) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: status, updated_at: new Date() })
      .eq('id', id);

    if (!error) {
      setIsModalOpen(false);
      setSelectedReq(null);
    }
  };

  const filteredQC = qcRequests.filter(req => 
    req.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full space-y-8 pb-20 selection:bg-emerald-500/30">
      
      {/* --- LIVE STATUS HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">System Live: Riontech HQ</p>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Quality Control</h1>
        </div>
        <div className="flex gap-2">
           <div className="px-4 py-2 bg-white/5 border border-white/5 rounded-xl flex items-center gap-3">
              <div className="text-right">
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Server Status</p>
                <p className="text-[10px] font-black text-white uppercase">Operational</p>
              </div>
              <Zap size={14} className="text-emerald-500 fill-emerald-500" />
           </div>
        </div>
      </div>

      {/* --- SMART METRICS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Pending Certification', value: qcRequests.filter(r => r.status === 'qc').length, color: '#10b981', icon: <FileText size={18} />, trend: '+2.4%' },
          { label: 'Active Deployments', value: qcRequests.filter(r => r.status === 'assigned').length, color: '#EAB308', icon: <Hammer size={18} />, trend: 'Live' },
          { label: 'Avg. Compliance', value: '99.2%', color: '#3b82f6', icon: <ShieldCheck size={18} />, trend: 'Steady' }
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            key={i} className="group bg-[#0a0f18] border border-white/5 p-6 rounded-[2rem] relative overflow-hidden transition-all hover:border-white/10"
          >
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-black text-white tracking-tighter">{stat.value}</p>
                  <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded italic">{stat.trend}</span>
                </div>
              </div>
              <div style={{ color: stat.color, backgroundColor: `${stat.color}10` }} className="p-4 rounded-2xl border border-white/5 transition-transform group-hover:rotate-12">
                {stat.icon}
              </div>
            </div>
            <div className="absolute -bottom-2 -right-2 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
               {React.cloneElement(stat.icon, { size: 100 })}
            </div>
          </motion.div>
        ))}
      </div>

      {/* --- CONTROL BAR --- */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-[#0a0f18] p-6 rounded-[2.5rem] border border-white/5 shadow-2xl">
        <div className="relative w-full md:w-full group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search by client name or site address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#020617] border border-white/10 rounded-2xl py-5 pl-16 pr-6 text-[11px] font-bold uppercase tracking-widest text-white outline-none focus:border-emerald-500/40 transition-all placeholder:text-slate-700"
          />
        </div>
      </div>

      {/* --- QC QUEUE --- */}
      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-600 gap-4">
            <Loader2 className="animate-spin" size={40} />
            <p className="text-[10px] font-black uppercase tracking-[0.4em]">Synchronizing Data...</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredQC.length > 0 ? (
              filteredQC.map((req) => (
                <motion.div
                  key={req.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`group relative overflow-hidden border p-1 rounded-[2.2rem] transition-all ${
                    req.status === 'assigned' ? 'border-white/5 bg-white/[0.02]' : 'border-emerald-500/20 bg-[#0a0f18]'
                  }`}
                >
                  <div className="bg-[#0a0f18] rounded-[2rem] p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-6 w-full">
                      {/* Avatar/Status Icon */}
                      <div className={`relative w-20 h-20 rounded-[1.5rem] flex items-center justify-center transition-all ${
                        req.status === 'assigned' ? 'bg-amber-500/5 text-amber-500' : 'bg-emerald-500/5 text-emerald-500'
                      }`}>
                        {req.status === 'assigned' ? <Clock size={32} className="animate-pulse" /> : <ShieldCheck size={32} />}
                        <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-lg border-4 border-[#0a0f18] flex items-center justify-center ${
                           req.status === 'assigned' ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}>
                          <ArrowUpRight size={10} className="text-black font-bold" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-black uppercase tracking-tight text-white truncate">{req.full_name}</h3>
                          <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-tighter border ${
                            req.status === 'assigned' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                          }`}>
                            {req.status === 'assigned' ? 'Deployment Active' : 'Ready for QC'}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-8">
                          <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                            <MapPin size={14} className="text-slate-700" /> <span className="truncate">{req.address}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                            <Calendar size={14} className="text-slate-700" /> {new Date(req.schedule_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 w-full md:w-auto border-t md:border-t-0 border-white/5 pt-6 md:pt-0">
                      {req.status === 'qc' ? (
                        <>
                          <button
                            onClick={() => { setSelectedReq(req); setIsModalOpen(true); }}
                            className="group/btn relative flex-1 md:flex-none px-10 py-4 bg-emerald-600 overflow-hidden rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                          >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                              <CheckCircle2 size={16} /> Certify
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite]" />
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(req.id, 'pending')}
                            className="flex-1 md:flex-none px-6 py-4 bg-white/5 text-rose-500 border border-white/5 rounded-2xl text-[10px] font-black uppercase hover:bg-rose-500/10 transition-all flex items-center justify-center gap-2"
                          >
                            <RotateCcw size={16} />
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-4 px-6 py-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                           <div className="flex flex-col items-end">
                              <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest">In Progress</p>
                              <p className="text-[10px] font-bold text-slate-500 whitespace-nowrap tracking-tight">Deployment Tracked</p>
                           </div>
                           <Activity size={18} className="text-amber-500 animate-pulse" />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-32 bg-[#0a0f18] border border-white/5 rounded-[3.5rem] text-slate-600 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/5 via-transparent to-transparent" />
                <div className="relative z-10 flex flex-col items-center">
                  <div className="p-8 bg-white/5 rounded-full mb-6 border border-white/5">
                    <ShieldCheck size={64} className="text-emerald-500/20" />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-[0.5em] text-white/50">Zero Pending Validations</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest mt-2 text-slate-700 text-center max-w-[200px]">Everything is currently meeting Riontech standards.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* --- PREMIUM MODAL --- */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-[#0a0f18] border border-white/10 p-12 rounded-[4rem] shadow-[0_0_100px_rgba(16,185,129,0.1)] max-w-md w-full text-center overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
              
              <div className="bg-emerald-500/10 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-emerald-500/20 rotate-12 group-hover:rotate-0 transition-transform">
                <ShieldCheck className="text-emerald-500" size={40} />
              </div>

              <h3 className="text-3xl font-black uppercase tracking-tighter mb-4 text-white">Confirm Certification</h3>
              <p className="text-slate-400 text-[11px] leading-relaxed mb-12 font-medium px-6 uppercase tracking-widest">
                By finalizing, you verify that <span className="text-white font-bold">{selectedReq?.full_name}</span>'s installation is fully compliant with <span className="text-emerald-500 font-black">RIONTECH</span> safety protocols.
              </p>

              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => handleUpdateStatus(selectedReq.id, 'completed')}
                  className="w-full py-7 rounded-3xl bg-emerald-600 text-white text-[11px] font-black uppercase tracking-[0.4em] shadow-[0_20px_40px_rgba(16,185,129,0.25)] hover:bg-emerald-500 active:scale-[0.98] transition-all"
                >
                  Authorize System
                </button>
                <button onClick={() => setIsModalOpen(false)} className="w-full py-6 rounded-3xl bg-white/5 text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] hover:text-white transition-colors">
                  Abort Process
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default QCVerificationView;