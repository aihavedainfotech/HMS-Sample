import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  HeartPulse, Thermometer, Activity, Droplets, Search, Plus, Loader2,
  User, Weight, Gauge, Brain, AlertCircle, CheckCircle2, TrendingUp, ChevronDown, ChevronUp, MapPin, IndianRupee, Clock, History
} from 'lucide-react';
import { toast } from 'sonner';
import socket from '@/lib/socket';
import { motion, AnimatePresence } from 'framer-motion';

const API = import.meta.env.VITE_API_URL || '/api';

export default function VitalSigns() {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<any[]>([]);
  const [latestVitals, setLatestVitals] = useState<Record<string, any>>({});
  const [historyVitals, setHistoryVitals] = useState<Record<string, any[]>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);

  // Vitals form
  const [vitalsForm, setVitalsForm] = useState({
    blood_pressure_systolic: '', blood_pressure_diastolic: '', pulse_rate: '',
    temperature: '', spo2: '', respiratory_rate: '', weight: '',
    pain_score: '', blood_sugar: '', consciousness_level: 'Alert', notes: ''
  });

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API}/nurse/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPatients(data.patients || []);
      setLatestVitals(data.latest_vitals || {});
      setHistoryVitals(data.history_vitals || {});
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Real-time: refresh on vitals/admission changes
  useEffect(() => {
    const onUpdate = () => fetchData();
    socket.on('vitals:recorded', onUpdate);
    socket.on('admission_status_updated', onUpdate);
    socket.on('admission:discharged', onUpdate);
    return () => {
      socket.off('vitals:recorded', onUpdate);
      socket.off('admission_status_updated', onUpdate);
      socket.off('admission:discharged', onUpdate);
    };
  }, [fetchData]);

  const saveVitals = async () => {
    if (!selectedPatient) { toast.error('Please select a patient'); return; }
    setSaving(true);
    try {
      const token = localStorage.getItem('hms_staff_token');
      const body: any = { patient_id: selectedPatient };
      Object.entries(vitalsForm).forEach(([k, v]) => { if (v !== '') body[k] = isNaN(Number(v)) ? v : Number(v); });

      const res = await fetch(`${API}/vitals`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success('Vital signs recorded successfully!');
        setDialogOpen(false);
        setVitalsForm({ blood_pressure_systolic: '', blood_pressure_diastolic: '', pulse_rate: '', temperature: '', spo2: '', respiratory_rate: '', weight: '', pain_score: '', blood_sugar: '', consciousness_level: 'Alert', notes: '' });
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save');
      }
    } catch { toast.error('Failed to save vitals'); } finally { setSaving(false); }
  };

  const getVitalColor = (type: string, value: number) => {
    if (!value) return 'text-gray-500';
    switch (type) {
      case 'bp_sys': return value > 140 ? 'text-red-600 font-bold' : value < 90 ? 'text-amber-600 font-bold' : 'text-green-600';
      case 'pulse': return value > 100 ? 'text-red-600 font-bold' : value < 60 ? 'text-amber-600 font-bold' : 'text-green-600';
      case 'temp': return value > 100 ? 'text-red-600 font-bold' : value < 96 ? 'text-amber-600 font-bold' : 'text-green-600';
      case 'spo2': return value < 90 ? 'text-red-600 font-bold' : value < 95 ? 'text-amber-600 font-bold' : 'text-green-600';
      default: return 'text-gray-700';
    }
  };

  const patientsWithVitals = patients.filter(p => latestVitals[p.patient_id]);
  const patientsWithoutVitals = patients.filter(p => !latestVitals[p.patient_id]);
  const filteredAll = [...patientsWithVitals, ...patientsWithoutVitals].filter(p =>
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) || p.patient_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-pink-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><HeartPulse className="h-7 w-7 text-pink-600" /> Vitals & Monitoring</h1>
          <p className="text-gray-500 text-sm">Record and monitor patient vital signs</p>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search patients..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-pink-600 hover:bg-pink-700"><Plus className="h-4 w-4 mr-2" /> Record Vitals</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Record Vital Signs</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <label className="text-sm font-medium">Patient *</label>
                  <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                    <SelectTrigger><SelectValue placeholder="Choose patient" /></SelectTrigger>
                    <SelectContent>
                      {patients.map(p => (
                        <SelectItem key={p.patient_id} value={p.patient_id}>{p.first_name} {p.last_name} ({p.patient_id})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium">BP Systolic (mmHg)</label><Input type="number" placeholder="120" value={vitalsForm.blood_pressure_systolic} onChange={e => setVitalsForm({ ...vitalsForm, blood_pressure_systolic: e.target.value })} /></div>
                  <div><label className="text-xs font-medium">BP Diastolic (mmHg)</label><Input type="number" placeholder="80" value={vitalsForm.blood_pressure_diastolic} onChange={e => setVitalsForm({ ...vitalsForm, blood_pressure_diastolic: e.target.value })} /></div>
                  <div><label className="text-xs font-medium">Pulse (bpm)</label><Input type="number" placeholder="72" value={vitalsForm.pulse_rate} onChange={e => setVitalsForm({ ...vitalsForm, pulse_rate: e.target.value })} /></div>
                  <div><label className="text-xs font-medium">Temperature (°F)</label><Input type="number" step="0.1" placeholder="98.6" value={vitalsForm.temperature} onChange={e => setVitalsForm({ ...vitalsForm, temperature: e.target.value })} /></div>
                  <div><label className="text-xs font-medium">SpO2 (%)</label><Input type="number" placeholder="98" value={vitalsForm.spo2} onChange={e => setVitalsForm({ ...vitalsForm, spo2: e.target.value })} /></div>
                  <div><label className="text-xs font-medium">Respiratory Rate (/min)</label><Input type="number" placeholder="16" value={vitalsForm.respiratory_rate} onChange={e => setVitalsForm({ ...vitalsForm, respiratory_rate: e.target.value })} /></div>
                  <div><label className="text-xs font-medium">Weight (kg)</label><Input type="number" step="0.1" placeholder="70" value={vitalsForm.weight} onChange={e => setVitalsForm({ ...vitalsForm, weight: e.target.value })} /></div>
                  <div><label className="text-xs font-medium">Pain Score (0-10)</label><Input type="number" min="0" max="10" placeholder="0" value={vitalsForm.pain_score} onChange={e => setVitalsForm({ ...vitalsForm, pain_score: e.target.value })} /></div>
                  <div><label className="text-xs font-medium">Blood Sugar (mg/dL)</label><Input type="number" placeholder="100" value={vitalsForm.blood_sugar} onChange={e => setVitalsForm({ ...vitalsForm, blood_sugar: e.target.value })} /></div>
                  <div>
                    <label className="text-xs font-medium">Consciousness</label>
                    <Select value={vitalsForm.consciousness_level} onValueChange={v => setVitalsForm({ ...vitalsForm, consciousness_level: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Alert">Alert</SelectItem>
                        <SelectItem value="Verbal">Verbal Response</SelectItem>
                        <SelectItem value="Pain">Pain Response</SelectItem>
                        <SelectItem value="Unresponsive">Unresponsive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><label className="text-xs font-medium">Notes</label><Input placeholder="Additional notes..." value={vitalsForm.notes} onChange={e => setVitalsForm({ ...vitalsForm, notes: e.target.value })} /></div>
                <Button className="w-full" onClick={saveVitals} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Save Vital Signs
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="bg-gradient-to-r from-pink-50 to-pink-100 border-pink-200">
          <CardContent className="p-4 flex items-center gap-3">
            <User className="h-6 w-6 text-pink-600" />
            <div><p className="text-2xl font-bold text-pink-900">{patients.length}</p><p className="text-xs text-pink-600">Total Patients</p></div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <div><p className="text-2xl font-bold text-green-900">{patientsWithVitals.length}</p><p className="text-xs text-green-600">Vitals Recorded</p></div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-amber-600" />
            <div><p className="text-2xl font-bold text-amber-900">{patientsWithoutVitals.length}</p><p className="text-xs text-amber-600">Pending Vitals</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Patient Cards Layout */}
      <div className="space-y-4">
        {filteredAll.map(patient => {
          const v = latestVitals[patient.patient_id];
          const history = historyVitals[patient.patient_id] || [];
          const isExpanded = expandedPatientId === patient.patient_id;

          return (
            <Card key={patient.patient_id} className={`overflow-hidden transition-all hover:shadow-md ${v ? (v.temperature > 100 || v.spo2 < 95 || v.blood_pressure_systolic > 140 ? 'border-red-300 border-l-4 border-l-red-500' : 'border-l-4 border-l-green-400') : 'border-l-4 border-l-gray-300'}`}>
              <CardContent className="p-0">
                {/* Header Section (Always Visible) */}
                <div
                  className="p-5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                  onClick={() => setExpandedPatientId(isExpanded ? null : patient.patient_id)}
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center text-pink-700 font-bold text-lg shadow-sm">
                      {patient.first_name?.charAt(0)}{patient.last_name?.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-slate-800 text-lg">{patient.first_name} {patient.last_name}</p>
                        <span className="text-xs font-bold text-slate-400">({patient.patient_id})</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
                        {patient.department_name && (
                          <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-md">
                            <MapPin size={12} className="text-slate-400" /> {patient.department_name}
                          </span>
                        )}
                        {(patient.ward_name || patient.floor_number !== null) && (
                          <span className="bg-slate-100 px-2 py-1 rounded-md">
                            {[patient.ward_name, patient.floor_number ? `Flr ${patient.floor_number}` : null, patient.room_number ? `Rm ${patient.room_number}` : null].filter(Boolean).join(' • ')}
                          </span>
                        )}
                        {patient.advance_payment !== undefined && (
                          <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md border border-emerald-100">
                            <IndianRupee size={12} /> Advance: ₹{patient.advance_payment}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      {v ? (
                        <div className="flex items-center gap-3">
                          <div className="text-center">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">BP</p>
                            <p className={`text-sm font-black ${getVitalColor('bp_sys', v.blood_pressure_systolic)}`}>{v.blood_pressure_systolic}/{v.blood_pressure_diastolic}</p>
                          </div>
                          <div className="h-6 w-px bg-slate-200"></div>
                          <div className="text-center">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pulse</p>
                            <p className={`text-sm font-black ${getVitalColor('pulse', v.pulse_rate)}`}>{v.pulse_rate}</p>
                          </div>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-slate-400 border-slate-200">No Vitals</Badge>
                      )}
                    </div>

                    <button className="text-slate-400 hover:text-pink-600 transition-colors bg-slate-50 p-2 rounded-full">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                  </div>
                </div>

                {/* Patient Historical Data Accordion */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-slate-100 bg-slate-50/50"
                    >
                      <div className="p-5 space-y-4">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <History size={14} /> Vitals History ({history.length} records)
                          </h4>
                          <Button
                            className="bg-pink-600 hover:bg-pink-700 h-8 text-xs font-bold shadow-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPatient(patient.patient_id);
                              setDialogOpen(true);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-1" /> New Entry
                          </Button>
                        </div>

                        {history.length === 0 ? (
                          <div className="py-6 text-center text-slate-400 text-sm font-medium border-2 border-dashed border-slate-200 rounded-xl">
                            <HeartPulse className="h-8 w-8 mx-auto mb-2 text-slate-300 opacity-50" />
                            No historical vitals recorded during this admission.
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                            {history.map((record, i) => (
                              <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">
                                <div className="flex items-center gap-2 min-w-[150px]">
                                  <Clock size={16} className="text-slate-400" />
                                  <div>
                                    <p className="text-xs font-bold text-slate-800">
                                      {new Date(record.recorded_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400">
                                      {new Date(record.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex-1 grid grid-cols-3 sm:grid-cols-6 gap-3 text-sm">
                                  <div className="flex flex-col items-center justify-center bg-slate-50 rounded-lg py-2">
                                    <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1">BP</p>
                                    <p className={`font-black ${getVitalColor('bp_sys', record.blood_pressure_systolic)}`}>{record.blood_pressure_systolic}/{record.blood_pressure_diastolic || '-'}</p>
                                  </div>
                                  <div className="flex flex-col items-center justify-center bg-slate-50 rounded-lg py-2">
                                    <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1">Pulse</p>
                                    <p className={`font-black ${getVitalColor('pulse', record.pulse_rate)}`}>{record.pulse_rate || '-'}</p>
                                  </div>
                                  <div className="flex flex-col items-center justify-center bg-slate-50 rounded-lg py-2">
                                    <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1">Temp</p>
                                    <p className={`font-black ${getVitalColor('temp', record.temperature)}`}>{record.temperature || '-'}</p>
                                  </div>
                                  <div className="flex flex-col items-center justify-center bg-slate-50 rounded-lg py-2">
                                    <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1">SpO2</p>
                                    <p className={`font-black ${getVitalColor('spo2', record.spo2)}`}>{record.spo2 || '-'}</p>
                                  </div>
                                  <div className="flex flex-col items-center justify-center bg-slate-50 rounded-lg py-2">
                                    <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1">Resp</p>
                                    <p className="font-black text-slate-700">{record.respiratory_rate || '-'}</p>
                                  </div>
                                  <div className="flex flex-col items-center justify-center bg-slate-50 rounded-lg py-2">
                                    <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1">Pain</p>
                                    <p className={`font-black ${record.pain_score > 6 ? 'text-red-500' : 'text-slate-700'}`}>{record.pain_score ?? '-'}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
