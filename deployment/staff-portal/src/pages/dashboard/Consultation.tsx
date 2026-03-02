import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search, User, FileText, FlaskConical, Plus, AlertCircle,
  Save, History, Activity, ShieldAlert, HeartPulse, ClipboardCheck,
  ChevronRight, ArrowLeft, Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PrescriptionModal } from '@/components/doctor/PrescriptionModal';
import { LabOrderModal } from '@/components/doctor/LabOrderModal';
import { LabReportViewModal } from '@/components/doctor/LabReportViewModal';
import socket from '@/lib/socket';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';

export default function Consultation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('diagnosis');
  const [isActiveConsultation, setIsActiveConsultation] = useState(false);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);

  // Diagnosis form state
  const [diagnosis, setDiagnosis] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [examinationFindings, setExaminationFindings] = useState('');
  const [vitalSigns, setVitalSigns] = useState('');
  const [savingDiagnosis, setSavingDiagnosis] = useState(false);

  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [labOrders, setLabOrders] = useState<any[]>([]);

  // Modal States
  const [showRxModal, setShowRxModal] = useState(false);
  const [showLabModal, setShowLabModal] = useState(false);
  const [selectedLabReport, setSelectedLabReport] = useState<any>(null);

  const fetchHistory = useCallback(async (patientId: string, headers: any) => {
    try {
      const [rxRes, labRes] = await Promise.all([
        fetch(`${API_URL}/patients/${patientId}/prescriptions`, { headers }),
        fetch(`${API_URL}/patients/${patientId}/lab-orders`, { headers })
      ]);

      if (rxRes.ok) {
        const rxData = await rxRes.json();
        setPrescriptions(Array.isArray(rxData) ? rxData : []);
      }
      if (labRes.ok) {
        const labData = await labRes.json();
        // The endpoint returns a wrapper object with 'lab_orders' array
        setLabOrders(labData && Array.isArray(labData.lab_orders) ? labData.lab_orders : []);
      }
    } catch (err) {
      console.error('History fetch failed:', err);
    }
  }, []);

  const handleSearch = useCallback(async (term: string) => {
    if (!term) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('hms_staff_token');
      const headers = { Authorization: `Bearer ${token}` };
      const cleanTerm = term.trim().toUpperCase();

      const res = await fetch(`${API_URL}/patients/${cleanTerm}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setPatient(data);
        fetchHistory(data.patient_id, headers);
      } else {
        setPatient(null);
        toast.error('Patient not found', { description: `No record for ID: ${cleanTerm}` });
      }
    } catch (error) {
      console.error(error);
      toast.error("Error", { description: "Failed to fetch patient details" });
    } finally {
      setLoading(false);
    }
  }, [fetchHistory]);

  const refreshHistory = useCallback(() => {
    if (patient) {
      const token = localStorage.getItem('hms_staff_token');
      const headers = { Authorization: `Bearer ${token}` };
      fetchHistory(patient.patient_id, headers);
    }
  }, [patient, fetchHistory]);

  // Handle URL Parameters
  useEffect(() => {
    const pid = searchParams.get('patient_id');
    const aid = searchParams.get('appointment_id');

    if (aid) {
      setAppointmentId(aid);
      setIsActiveConsultation(true);
      setActiveTab('diagnosis');
    }

    if (pid) {
      setSearchTerm(pid);
      handleSearch(pid);
    }
  }, [searchParams, handleSearch]);

  // Real-time listener for lab results
  useEffect(() => {
    const onLabUpdate = (data: any) => {
      if (patient && data.patient_id === patient.patient_id) {
        toast.info('Lab results updated', { description: 'New clinical data available.' });
        refreshHistory();
      }
    };

    socket.on('critical_lab_result', onLabUpdate);
    socket.on('lab_result_entered', onLabUpdate);

    return () => {
      socket.off('critical_lab_result', onLabUpdate);
      socket.off('lab_result_entered', onLabUpdate);
    };
  }, [patient, refreshHistory]);

  const saveDiagnosis = async () => {
    if (!appointmentId) {
      toast.error('No active appointment');
      return;
    }

    setSavingDiagnosis(true);
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/doctor/write-diagnosis`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointment_id: appointmentId,
          diagnosis,
          chief_complaint: chiefComplaint,
          examination_findings: examinationFindings,
          vital_signs: vitalSigns,
        }),
      });

      if (res.ok) {
        toast.success('Diagnosis saved successfully');
        refreshHistory();
        // Emit update via socket
        socket.emit('diagnosis_written', { appointment_id: appointmentId, patient_id: patient.patient_id });
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save diagnosis');
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to save diagnosis');
    } finally {
      setSavingDiagnosis(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row justify-between gap-6 items-start lg:items-center bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-white/60 shadow-xl shadow-slate-200/50">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs tracking-widest uppercase">
            <HeartPulse size={14} className="animate-pulse" />
            Clinical Excellence Portal
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full hover:bg-slate-100">
              <ArrowLeft size={20} />
            </Button>
            Clinical Consultation
          </h1>
          <p className="text-slate-500 font-medium">Holistic patient assessment and treatment planning.</p>
        </div>

        <div className="flex gap-2 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <Input
              placeholder="Search Patient ID (e.g. P0001)..."
              className="pl-12 h-14 bg-white/80 border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 rounded-2xl font-bold transition-all shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchTerm)}
            />
          </div>
          <Button
            onClick={() => handleSearch(searchTerm)}
            disabled={loading}
            className="h-14 px-8 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 rounded-2xl font-black text-base transition-all active:scale-95"
          >
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </div>
      </div>

      {!patient ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-32 bg-white/30 backdrop-blur-sm rounded-[40px] border-4 border-dashed border-slate-200 text-center"
        >
          <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 shadow-inner ring-8 ring-blue-50/50">
            <User className="h-12 w-12 text-blue-400" />
          </div>
          <h3 className="text-2xl font-black text-slate-800">Identify Patient</h3>
          <p className="text-slate-400 font-medium max-w-xs mt-2 italic">Enter a Patient ID or select from your dashboard to begin the clinical session.</p>
        </motion.div>
      ) : (
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Patient Overview Card (Left Sidebar on Desktop) */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
            <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-md rounded-[32px] overflow-hidden">
              <CardContent className="p-0">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 h-24 relative">
                  <Badge className="absolute top-4 right-4 bg-white/20 backdrop-blur-md border-white/30 text-white font-mono flex items-center gap-1">
                    <ShieldAlert size={12} /> {patient.patient_id}
                  </Badge>
                </div>
                <div className="px-6 pb-8 -mt-12 relative flex flex-col items-center">
                  <Avatar className="h-24 w-24 border-4 border-white shadow-xl ring-2 ring-slate-100 mb-4">
                    <AvatarFallback className="text-3xl bg-white text-blue-600 font-black">
                      {patient.first_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="text-2xl font-black text-slate-900 text-center">
                    {patient.first_name} {patient.last_name}
                  </h2>
                  <div className="flex items-center gap-3 mt-2">
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 font-bold uppercase tracking-tighter">
                      {patient.gender} • {patient.age} Yrs
                    </Badge>
                    <Badge variant="outline" className="border-slate-200 text-slate-600 font-bold">
                      {patient.blood_group || 'O+'}
                    </Badge>
                  </div>

                  <div className="w-full mt-8 space-y-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Contact Info</p>
                      <p className="font-bold text-slate-700">{patient.mobile_number}</p>
                      <p className="text-sm text-slate-500 truncate">{patient.email || 'no-email@patient.com'}</p>
                    </div>

                    {patient.known_allergies && (
                      <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                        <div className="flex items-center gap-2 text-red-600 mb-1">
                          <AlertCircle size={14} className="fill-red-100" />
                          <p className="text-[10px] font-black uppercase tracking-widest">Medical Alert</p>
                        </div>
                        <p className="text-sm font-bold text-red-700">Allergies: {patient.known_allergies}</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 w-full mt-6">
                    <Button
                      className="rounded-xl h-12 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 font-bold text-sm"
                      onClick={() => setShowRxModal(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Prescription
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-xl h-12 border-purple-200 text-purple-700 hover:bg-purple-50 font-bold text-sm"
                      onClick={() => setShowLabModal(true)}
                    >
                      <FlaskConical className="mr-2 h-4 w-4" /> Lab Order
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats / History Preview */}
            <Card className="border-none shadow-xl bg-slate-900 rounded-[32px] overflow-hidden text-white">
              <CardContent className="p-6 space-y-4">
                <h4 className="text-sm font-black text-blue-400 uppercase tracking-widest">Clinical Snapshot</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                    <p className="text-[10px] font-bold text-slate-400 mb-1">PRESCRIPTIONS</p>
                    <p className="text-2xl font-black">{prescriptions.length + 1}</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                    <p className="text-[10px] font-bold text-slate-400 mb-1">LABS</p>
                    <p className="text-2xl font-black">{labOrders.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Clinical Workspace (Right Area) */}
          <div className="lg:col-span-8 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-white/50 backdrop-blur-sm p-1.5 rounded-2xl border border-slate-200 inline-flex w-full overflow-x-auto no-scrollbar">
                {isActiveConsultation && (
                  <TabsTrigger value="diagnosis" className="rounded-xl px-6 py-2.5 font-bold data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all gap-2">
                    <Activity size={16} /> Diagnosis
                  </TabsTrigger>
                )}
                <TabsTrigger value="history" className="rounded-xl px-6 py-2.5 font-bold data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all gap-2">
                  <History size={16} /> History
                </TabsTrigger>
                <TabsTrigger value="prescriptions" className="rounded-xl px-6 py-2.5 font-bold data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all gap-2">
                  <FileText size={16} /> Prescriptions
                </TabsTrigger>
                <TabsTrigger value="labs" className="rounded-xl px-6 py-2.5 font-bold data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all gap-2">
                  <FlaskConical size={16} /> Labs
                </TabsTrigger>
              </TabsList>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="mt-6"
                >
                  {activeTab === 'diagnosis' && isActiveConsultation && (
                    <Card className="border-none shadow-2xl bg-blue-50/50 backdrop-blur-md rounded-[32px] border-2 border-blue-200/50">
                      <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-xl font-black text-blue-900 flex items-center gap-2">
                          <ClipboardCheck className="h-6 w-6" />
                          Clinical Session Details
                        </CardTitle>
                        <CardDescription className="text-blue-700/70 font-medium italic">Documenting current assessment and physical findings.</CardDescription>
                      </CardHeader>
                      <CardContent className="p-8 pt-0 space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-xs font-black text-blue-800 uppercase tracking-widest px-1">Chief Complaint</label>
                            <Textarea
                              placeholder="Describe the primary reason for visit..."
                              value={chiefComplaint}
                              onChange={(e) => setChiefComplaint(e.target.value)}
                              className="bg-white border-blue-100 focus:ring-blue-400 rounded-2xl min-h-[100px] font-medium"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-black text-blue-800 uppercase tracking-widest px-1">Vital Signs</label>
                            <Input
                              placeholder="e.g. BP: 120/80, Temp: 98.6, HR: 72"
                              value={vitalSigns}
                              onChange={(e) => setVitalSigns(e.target.value)}
                              className="bg-white border-blue-100 h-10 rounded-xl font-bold text-blue-900"
                            />
                            <div className="p-4 bg-white/50 border border-blue-100 rounded-2xl space-y-2 mt-2">
                              <label className="text-xs font-black text-blue-800 uppercase tracking-widest">Findings</label>
                              <Textarea
                                placeholder="Physical examination notes..."
                                value={examinationFindings}
                                onChange={(e) => setExaminationFindings(e.target.value)}
                                className="bg-transparent border-none focus:ring-0 p-0 resize-none min-h-[80px]"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-black text-blue-800 uppercase tracking-widest px-1">Primary Diagnosis</label>
                          <Textarea
                            placeholder="Enter definitive or working diagnosis..."
                            value={diagnosis}
                            onChange={(e) => setDiagnosis(e.target.value)}
                            className="bg-white border-blue-100 focus:ring-blue-400 rounded-2xl min-h-[140px] text-lg font-bold"
                          />
                        </div>

                        <div className="flex flex-wrap gap-3 pt-4 border-t border-blue-200/50">
                          <Button
                            onClick={saveDiagnosis}
                            disabled={savingDiagnosis || !diagnosis.trim()}
                            className="h-12 px-8 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 rounded-xl font-black text-sm transition-all active:scale-95"
                          >
                            <Save className="mr-2 h-4 w-4" />
                            {savingDiagnosis ? 'Processing...' : 'Complete & Save Assessment'}
                          </Button>
                          <Button variant="outline" className="h-12 border-slate-200 rounded-xl font-bold" onClick={() => setShowRxModal(true)}>
                            Write Prescription
                          </Button>
                          <Button variant="outline" className="h-12 border-slate-200 rounded-xl font-bold" onClick={() => setShowLabModal(true)}>
                            Order Lab
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {activeTab === 'history' && (
                    <Card className="border-none shadow-xl bg-white/80 rounded-[32px] overflow-hidden">
                      <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-xl font-black text-slate-900">Medical Background</CardTitle>
                      </CardHeader>
                      <CardContent className="p-8 pt-0 space-y-8">
                        <div className="grid md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              <AlertCircle size={14} className="text-amber-500" /> Chronic Conditions
                            </h4>
                            <div className="p-6 bg-amber-50/50 rounded-3xl border border-amber-100 text-amber-900 font-bold leading-relaxed">
                              {patient.chronic_conditions || 'No documented chronic conditions.'}
                            </div>
                          </div>
                          <div className="space-y-4">
                            <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              <ClipboardCheck size={14} className="text-slate-500" /> Past Surgeries
                            </h4>
                            <div className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 text-slate-800 font-bold leading-relaxed">
                              {patient.previous_surgeries || 'No documented surgical history.'}
                            </div>
                          </div>
                        </div>
                        <div className="pt-6 border-t border-slate-100">
                          <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                            Current Medications
                          </h4>
                          <p className="text-slate-600 font-medium italic">
                            {patient.current_medications || 'No information provided.'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {activeTab === 'prescriptions' && (
                    <div className="space-y-4">
                      {prescriptions.map((px, idx) => (
                        <motion.div
                          key={px.prescription_id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                        >
                          <Card className="border-none shadow-lg bg-white overflow-hidden rounded-3xl hover:shadow-xl transition-all border border-slate-100">
                            <CardHeader className="p-6 bg-slate-50 border-b border-slate-100">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                    <FileText className="h-5 w-5 text-blue-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-black text-slate-900 font-mono tracking-tighter">{px.prescription_id}</h4>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                      {new Date(px.prescription_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} • Dr. {px.doctor_name}
                                    </p>
                                  </div>
                                </div>
                                <Badge className={px.status === 'Active' ? 'bg-green-500 font-bold' : 'bg-slate-300 font-bold'}>{px.status}</Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                              <div>
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Clinical Diagnosis</h5>
                                <p className="text-slate-800 font-black text-lg bg-slate-50 p-4 rounded-2xl border border-slate-100">{px.diagnosis}</p>
                              </div>
                              <div className="space-y-3">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Prescribed Regimen</h5>
                                <div className="grid gap-3">
                                  {px.medicines?.map((med: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl group hover:border-blue-200 transition-colors">
                                      <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 bg-slate-50 group-hover:bg-blue-50 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors">
                                          <Plus size={14} />
                                        </div>
                                        <div>
                                          <p className="font-bold text-slate-900 tracking-tight">{med.medicine_name} <span className="text-slate-400 font-medium ml-1">({med.strength})</span></p>
                                          <p className="text-xs font-black text-blue-600 uppercase tracking-widest">{med.frequency} • {med.duration}</p>
                                        </div>
                                      </div>
                                      {med.instructions && (
                                        <Badge variant="outline" className="rounded-lg border-slate-200 text-slate-500 group-hover:bg-slate-50">{med.instructions}</Badge>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                      {prescriptions.length === 0 && (
                        <div className="text-center py-20 bg-white/50 backdrop-blur-sm rounded-[32px] border-2 border-dashed border-slate-200">
                          <FileText className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                          <p className="text-slate-400 font-bold">No historical prescriptions found.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'labs' && (
                    <div className="grid gap-4">
                      {Array.isArray(labOrders) && labOrders.map((order, idx) => (
                        <motion.div
                          key={order.lab_order_id || order.id || `lab-${idx}`}
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.05 }}
                        >
                          <Card className="border-none shadow-lg bg-white hover:shadow-xl transition-all rounded-[32px] overflow-hidden group">
                            <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                              <div className="flex items-center gap-5">
                                <div className="bg-purple-100 h-14 w-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                  <FlaskConical className="h-7 w-7 text-purple-600" />
                                </div>
                                <div className="space-y-1">
                                  <h4 className="font-black text-slate-900 text-lg leading-tight uppercase tracking-tight">{order.test_name || 'Lab Test'}</h4>
                                  <p className="text-xs font-bold text-slate-400 flex items-center gap-2">
                                    <Calendar size={12} /> {order.order_date ? new Date(order.order_date).toLocaleDateString() : 'Date N/A'} • {order.doctor_name || 'Staff'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-col sm:items-end gap-3 w-full sm:w-auto">
                                <Badge className={`h-8 px-4 rounded-xl font-black uppercase tracking-widest text-[10px] ${order.status?.toLowerCase() === 'completed' || order.status?.toLowerCase() === 'verified' ? 'bg-green-500' :
                                  order.status?.toLowerCase() === 'pending' ? 'bg-amber-400' : 'bg-blue-500'
                                  }`}>
                                  {order.status}
                                </Badge>
                                {(order.status?.toLowerCase() === 'completed' || order.status?.toLowerCase() === 'verified') ? (
                                  <Button
                                    onClick={() => setSelectedLabReport(order)}
                                    className="h-10 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-sm flex items-center gap-1.5"
                                  >
                                    <FileText className="h-4 w-4" />
                                    View Report
                                  </Button>
                                ) : (
                                  <span className="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">Processing Analysis...</span>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                      {labOrders.length === 0 && (
                        <div className="text-center py-20 bg-white/50 backdrop-blur-sm rounded-[32px] border-2 border-dashed border-slate-200">
                          <FlaskConical className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                          <p className="text-slate-400 font-bold">No historical lab data available.</p>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </Tabs>
          </div>
        </div>
      )}

      {/* Modals */}
      {patient && (
        <>
          <PrescriptionModal
            patientId={patient.patient_id}
            appointmentId={appointmentId}
            open={showRxModal}
            onOpenChange={setShowRxModal}
            onSuccess={refreshHistory}
          />
          <LabOrderModal
            patientId={patient.patient_id}
            appointmentId={appointmentId}
            open={showLabModal}
            onOpenChange={setShowLabModal}
            onSuccess={refreshHistory}
          />
          <LabReportViewModal
            order={selectedLabReport}
            patient={patient}
            open={!!selectedLabReport}
            onOpenChange={(open) => {
              if (!open) setSelectedLabReport(null);
            }}
          />
        </>
      )}
    </div>
  );
}
