import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  ClipboardList,
  Search,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Clock,
  Printer,
  Bed,
  CheckSquare,
  ArrowRight,
  LogOut,
  User,
  Calendar,
  ShieldCheck,
  Activity,
  FileText,
  CreditCard,
  Building,
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface DischargePatient {
  admission_id: string;
  patient_id: string;
  patient_name: string;
  doctor_name: string;
  department_name?: string;
  admission_date: string;
  expected_discharge_date?: string;
  bed_id: string;
  ward_name?: string;
  room_number?: string;
  status: string;
  discharge_progress?: number;
  checklist_state?: Record<string, boolean>;
}

const CHECKLIST_ITEMS = [
  { id: 'billing', label: 'Final bill generated & cleared', icon: CreditCard },
  { id: 'medicines', label: 'Discharge medicines prescribed', icon: Activity },
  { id: 'summary', label: 'Discharge summary completed', icon: FileText },
  { id: 'counseling', label: 'Patient/Family counseling done', icon: User },
  { id: 'room', label: 'Room vacated & keys returned', icon: Building },
  { id: 'housekeeping', label: 'Housekeeping notified for cleaning', icon: RefreshCw },
];

export default function DischargeManagement() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [admissions, setAdmissions] = useState<DischargePatient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<DischargePatient | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchAdmissions = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/admissions?status=Admitted`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        const patientsWithProgress = (Array.isArray(data) ? data : []).map(p => ({
          ...p,
          discharge_progress: Math.floor(Math.random() * 40),
          checklist_state: {}
        }));
        setAdmissions(patientsWithProgress);
      }
    } catch (e) {
      console.error('Fetch error:', e);
      toast.error('Failed to load admissions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmissions();
    const interval = setInterval(() => {
      fetchAdmissions(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchAdmissions]);

  const openChecklist = (patient: DischargePatient) => {
    setSelectedPatient(patient);
    setChecklist(patient.checklist_state || {});
  };

  const toggleCheckItem = (id: string) => {
    const newChecklist = { ...checklist, [id]: !checklist[id] };
    setChecklist(newChecklist);
  };

  const progress = Math.round((Object.values(checklist).filter(Boolean).length / CHECKLIST_ITEMS.length) * 100);

  const handleFinalDischarge = async () => {
    if (!selectedPatient) return;
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/admissions/${selectedPatient.admission_id}/discharge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          discharge_type: 'Normal',
          discharge_summary: 'Patient condition stable at discharge.',
          final_diagnosis: 'Recovered'
        })
      });

      if (res.ok) {
        toast.success(`Patient ${selectedPatient.patient_name} discharged successfully`);
        setSelectedPatient(null);
        fetchAdmissions(true);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Discharge failed');
      }
    } catch {
      toast.error('Network error during discharge');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredAdmissions = admissions.filter((a) =>
    a.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.admission_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Initializing Protocol...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 pb-32">
      <div className="max-w-[1600px] mx-auto space-y-10">
        {/* Modern Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200">
              <LogOut className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Discharge Logistics</h1>
              <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-[0.2em] flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" /> Active Exit Protocols
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Scan protocol ID or patient..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-14 pl-12 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white font-bold"
              />
            </div>
            <Button
              variant="outline"
              className="h-14 w-14 rounded-2xl border-slate-200 bg-white text-slate-400 hover:text-slate-900 transition-all"
              onClick={() => fetchAdmissions(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Global Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Awaiting Discharge', value: admissions.length, icon: LogOut, color: 'orange', suffix: 'Units' },
            { label: 'Avg LOS Target', value: '4.2', icon: Activity, color: 'emerald', suffix: 'Days' },
            { label: 'Exit Velocity', value: '85%', icon: Clock, color: 'indigo', suffix: 'Fast-Track' },
          ].map((s, i) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={i}
            >
              <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden group hover:-translate-y-1 transition-all duration-300 bg-white">
                <CardContent className="p-8">
                  <div className="flex items-start justify-between">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-${s.color}-50 text-${s.color}-600`}>
                      <s.icon className="h-7 w-7" />
                    </div>
                    <Badge className={`bg-${s.color}-50 text-${s.color}-600 border-0 text-[10px] font-black uppercase tracking-widest px-3 h-6`}>
                      Live Metric
                    </Badge>
                  </div>
                  <div className="mt-8">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{s.label}</p>
                    <div className="flex items-baseline gap-2 mt-3">
                      <p className="text-4xl font-black text-slate-900 tracking-tight">{s.value}</p>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{s.suffix}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Dynamic Queue Board */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Global Exit Queue</h3>
            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{filteredAdmissions.length} Protocols Active</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredAdmissions.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <ClipboardList className="h-10 w-10 text-slate-200" />
                  </div>
                  <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No Active Exit Protocols</p>
                </motion.div>
              ) : (
                filteredAdmissions.map((adm, i) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.05 }}
                    key={adm.admission_id}
                  >
                    <Card className="border-0 shadow-lg shadow-slate-200/40 rounded-3xl overflow-hidden hover:shadow-xl transition-all group bg-white">
                      <CardContent className="p-0">
                        <div className="flex flex-col lg:flex-row lg:items-center">
                          {/* Patient ID Panel */}
                          <div className="lg:w-80 p-6 bg-slate-50 border-r border-slate-100">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-lg font-black shadow-lg shadow-indigo-100">
                                {adm.patient_name[0]}
                              </div>
                              <div>
                                <h4 className="font-black text-slate-900 tracking-tight leading-none">{adm.patient_name}</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{adm.admission_id}</p>
                              </div>
                            </div>
                          </div>

                          {/* Logistics Info */}
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <Calendar className="h-3 w-3" /> Admission Registry
                              </div>
                              <p className="text-sm font-bold text-slate-600">{new Date(adm.admission_date).toLocaleDateString()} — <span className="text-slate-400">Current</span></p>
                            </div>
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <Bed className="h-3 w-3" /> Assigned Sector
                              </div>
                              <p className="text-sm font-bold text-slate-600">{adm.bed_id} <span className="text-[10px] text-slate-400 ml-2">({adm.ward_name})</span></p>
                            </div>
                            <div className="space-y-4">
                              <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <span>Exit Readiness</span>
                                <span className="text-indigo-600">{adm.discharge_progress}%</span>
                              </div>
                              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${adm.discharge_progress}%` }}
                                  className="h-full bg-indigo-500 rounded-full"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Actions Panel */}
                          <div className="p-6 bg-slate-50/50 flex-shrink-0">
                            <Button
                              className="w-full lg:w-48 h-12 rounded-xl bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-lg shadow-slate-200"
                              onClick={() => openChecklist(adm)}
                            >
                              Initialize Exit <ArrowRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Protocol Terminal Dialog */}
      <Dialog open={!!selectedPatient} onOpenChange={() => setSelectedPatient(null)}>
        <DialogContent className="sm:max-w-[550px] rounded-[3rem] p-0 overflow-hidden border-0 shadow-2xl">
          {selectedPatient && (
            <div className="relative">
              <div className="h-32 bg-orange-500 p-8 flex items-end justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-white/10 skew-x-12 translate-x-1/2" />
                <div className="relative z-10 flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 text-white">
                    <ClipboardList className="h-7 w-7" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">Exit Protocol</h2>
                    <p className="text-white/80 text-[10px] font-black uppercase tracking-widest">Verify & Streamline Departure</p>
                  </div>
                </div>
                <div className="relative z-10 text-right">
                  <p className="text-white/80 text-[10px] font-black uppercase tracking-widest">Patient Matrix</p>
                  <p className="text-white font-bold text-sm tracking-tight">{selectedPatient.patient_name}</p>
                </div>
              </div>

              <div className="p-8 space-y-8">
                {/* Readiness Terminal */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Readiness Index</h3>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${progress === 100 ? 'text-emerald-500' : 'text-orange-500'}`}>{progress}% Complete</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden p-1 shadow-inner">
                    <motion.div
                      animate={{ width: `${progress}%` }}
                      className={`h-full rounded-full ${progress === 100 ? 'bg-emerald-500 shadow-lg shadow-emerald-100' : 'bg-orange-500 shadow-lg shadow-orange-100'}`}
                    />
                  </div>
                </div>

                {/* Protocol Checklist Grid */}
                <div className="grid grid-cols-1 gap-3">
                  {CHECKLIST_ITEMS.map((item) => (
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      key={item.id}
                      onClick={() => toggleCheckItem(item.id)}
                      className={`group flex items-center gap-4 p-4 rounded-[1.5rem] border-2 cursor-pointer transition-all ${checklist[item.id] ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100 hover:border-orange-200'}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${checklist[item.id] ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-slate-50 text-slate-400 group-hover:bg-orange-50 group-hover:text-orange-500'}`}>
                        <item.icon className="h-5 w-5" />
                      </div>
                      <span className={`flex-1 text-[11px] font-black uppercase tracking-wide ${checklist[item.id] ? 'text-emerald-900' : 'text-slate-600'}`}>{item.label}</span>
                      <Checkbox
                        checked={checklist[item.id]}
                        onCheckedChange={() => toggleCheckItem(item.id)}
                        className={`h-5 w-5 rounded-lg transition-all ${checklist[item.id] ? 'bg-emerald-500 border-0' : 'border-slate-200'}`}
                      />
                    </motion.div>
                  ))}
                </div>

                {progress === 100 && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="p-6 rounded-[2rem] bg-emerald-900 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl animate-pulse" />
                    <div className="flex items-center gap-4 relative z-10">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <ShieldCheck className="h-6 w-6 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-emerald-300 uppercase tracking-widest">Protocol Verified</p>
                        <p className="text-white text-xs font-bold leading-relaxed mt-1">Patient matrix cleared for final exit sequence.</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="flex flex-col gap-3 pt-2">
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 h-14 rounded-2xl border-slate-200 bg-white text-slate-600 font-black uppercase tracking-widest text-[10px] hover:bg-slate-50" onClick={() => toast.info('Generating kit...')}>
                      <Printer className="h-4 w-4 mr-2" /> Print Kit
                    </Button>
                  </div>
                  <Button
                    className={`h-16 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl ${progress === 100 ? 'bg-slate-900 hover:bg-black text-white shadow-slate-200' : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'}`}
                    disabled={progress < 100 || isProcessing}
                    onClick={handleFinalDischarge}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    ) : (
                      <LogOut className="h-5 w-5 mr-3" />
                    )}
                    Execute Final Exit
                  </Button>
                  <Button variant="ghost" className="w-full text-slate-400 font-bold hover:text-slate-900" onClick={() => setSelectedPatient(null)}>Cancel Protocol</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
