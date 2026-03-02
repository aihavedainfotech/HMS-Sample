import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { io } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  User,
  Bed,
  Stethoscope,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Search,
  Zap,
  UserPlus,
  ShieldAlert,
  Activity,
  Plus,
  CreditCard,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Eye,
  Pause,
  XCircle,
  ShieldCheck,
  Calendar,
  Users,
  Phone,
  UserCircle,
  ArrowRight,
  History,
  Info
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const triageLevels = [
  { value: 'Critical', label: '🔴 Critical (Immediate)', color: 'bg-red-500', icon: ShieldAlert },
  { value: 'Serious', label: '🟠 Serious (Urgent)', color: 'bg-orange-500', icon: AlertCircle },
  { value: 'Stable', label: '🟢 Stable (Non-Urgent)', color: 'bg-green-500', icon: CheckCircle2 },
];

const admissionTypes = [
  { value: 'Emergency', label: 'Emergency' },
  { value: 'Elective', label: 'Elective' },
  { value: 'Maternity', label: 'Maternity' },
  { value: 'Day_Care', label: 'Day Care' },
];

const paymentTypes = [
  { value: 'Cash', label: 'Cash' },
  { value: 'Insurance', label: 'Insurance' },
  { value: 'Corporate', label: 'Corporate' },
  { value: 'Government', label: 'Government' },
];

interface Patient {
  patient_id: string;
  first_name: string;
  last_name: string;
  mobile_number: string;
  date_of_birth: string;
  gender: string;
  blood_group?: string;
  email?: string;
  permanent_address_street?: string;
  permanent_city?: string;
  permanent_state?: string;
  permanent_pincode?: string;
}

interface AvailableBed {
  bed_id: string;
  bed_type: string;
  ward_name: string;
  status: string;
  daily_charge: number;
}

export default function PatientAdmission() {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'General' | 'Emergency'>('General');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [availableBeds, setAvailableBeds] = useState<AvailableBed[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const [doctors, setDoctors] = useState<any[]>([]);
  const [doctorSearchQuery, setDoctorSearchQuery] = useState('');
  const [doctorSearchResults, setDoctorSearchResults] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);

  const [formData, setFormData] = useState({
    // Patient registration (only for Emergency)
    first_name: '',
    last_name: '',
    gender: '',
    date_of_birth: '',
    mobile_number: '',

    // Admission details
    patient_id: '',
    admitting_doctor_id: '',
    bed_id: '',
    admission_reason: '',
    admission_type: 'Elective',
    triage_level: 'Stable',
    provisional_diagnosis: '',
    guardian_name: '',
    guardian_relation: '',
    guardian_contact: '',
    payment_type: 'Cash',
    insurance_provider: '',
    policy_number: '',
    advance_payment: '',
  });

  // Fetch available beds
  const fetchBeds = useCallback(async () => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/beds`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setAvailableBeds(data.filter((b: any) => b.status === 'Vacant'));
      }
    } catch (err) {
      console.error('Failed to fetch beds', err);
    }
  }, []);

  useEffect(() => {
    fetchBeds();

    // Connect WebSocket to detect bed availability changes
    const socketURL = 'http://localhost:5000';
    const socket = io(socketURL, {
      path: '/socket.io/',
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => console.log('PatientAdmission WebSocket connected'));

    const handleRemoteUpdate = () => {
      console.log('Real-time bed inventory update received');
      fetchBeds();
    };

    socket.on('bed_status_changed', handleRemoteUpdate);
    socket.on('bed_inventory_updated', handleRemoteUpdate);
    socket.on('admission_status_updated', handleRemoteUpdate);
    socket.on('admission:discharged', handleRemoteUpdate);

    return () => {
      socket.disconnect();
    };
  }, [fetchBeds]);

  // Fetch doctors
  const fetchDoctors = useCallback(async () => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/doctors`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setDoctors(data);
      }
    } catch (err) {
      console.error('Failed to fetch doctors', err);
    }
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  // Patient search logic
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        try {
          const token = localStorage.getItem('hms_staff_token');
          const res = await fetch(`${API_URL}/patients/search?q=${searchQuery}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          setSearchResults(Array.isArray(data) ? data : []);
        } catch (err) {
          toast.error('Search failed');
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectPatient = async (patient: Patient) => {
    setSelectedPatient(patient);
    setFormData(prev => ({
      ...prev,
      patient_id: patient.patient_id,
      first_name: patient.first_name,
      last_name: patient.last_name,
      gender: patient.gender || prev.gender,
      mobile_number: patient.mobile_number,
      date_of_birth: patient.date_of_birth
    }));
    setSearchQuery('');
    setSearchResults([]);

    // Fetch unallocated advance payment
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/patients/${patient.patient_id}/unallocated-advance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.balance > 0) {
          setFormData(prev => ({ ...prev, advance_payment: data.balance.toString() }));
          toast.success(`Found ₹${data.balance} in unassigned advance deposits`);
        } else {
          setFormData(prev => ({ ...prev, advance_payment: '' }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch advance balance', err);
    }
  };

  // Doctor search logic
  useEffect(() => {
    if (doctorSearchQuery.length >= 2) {
      const q = doctorSearchQuery.toLowerCase();
      const results = doctors.filter(doc =>
        (doc.first_name && doc.first_name.toLowerCase().includes(q)) ||
        (doc.last_name && doc.last_name.toLowerCase().includes(q)) ||
        (doc.staff_id && doc.staff_id.toLowerCase().includes(q)) ||
        (doc.specialization && doc.specialization.toLowerCase().includes(q)) ||
        (doc.dept_name && doc.dept_name.toLowerCase().includes(q))
      );
      setDoctorSearchResults(results);
    } else {
      setDoctorSearchResults([]);
    }
  }, [doctorSearchQuery, doctors]);

  const handleSelectDoctor = (doc: any) => {
    setSelectedDoctor(doc);
    setFormData(prev => ({
      ...prev,
      admitting_doctor_id: doc.staff_id
    }));
    setDoctorSearchQuery('');
    setDoctorSearchResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Auto-select patient if single result matches ID or unique
    if (!formData.patient_id && mode === 'General') {
      if (searchResults.length === 1) {
        const p = searchResults[0];
        setSelectedPatient(p);
        setFormData(prev => ({
          ...prev,
          patient_id: p.patient_id,
          first_name: p.first_name,
          last_name: p.last_name,
          mobile_number: p.mobile_number,
          date_of_birth: p.date_of_birth
        }));
        // Use local variable for immediate payload
        formData.patient_id = p.patient_id;
      } else {
        toast.error('Please select a patient from the search results before finalizing.');
        return;
      }
    }

    if (!formData.patient_id && mode === 'General') {
      toast.error('Patient ID is required. Please search and select a patient.');
      return;
    }

    if (!formData.admitting_doctor_id) {
      toast.error('Please select an admitting doctor');
      return;
    }
    if (!formData.bed_id) {
      toast.error('Please select a bed');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('hms_staff_token');
      const endpoint = mode === 'Emergency' ? '/admissions/quick' : '/admissions';

      const payload = {
        ...formData,
        advance_payment: parseFloat(formData.advance_payment) || 0,
        admission_type: mode === 'Emergency' ? 'Emergency' : formData.admission_type,
      };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(mode === 'Emergency'
          ? `Emergency admission complete! ID: ${data.admission_id}`
          : `Patient admitted successfully! ID: ${data.admission_id}`
        );
        resetForm();
      } else {
        toast.error(data.error || 'Failed to process admission');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '', last_name: '', gender: '', date_of_birth: '', mobile_number: '',
      patient_id: '', admitting_doctor_id: '', bed_id: '', admission_reason: '',
      admission_type: 'Elective', triage_level: 'Stable', provisional_diagnosis: '',
      guardian_name: '', guardian_relation: '', guardian_contact: '',
      payment_type: 'Cash', insurance_provider: '', policy_number: '', advance_payment: '',
    });
    setSelectedPatient(null);
    setSelectedDoctor(null);
    setDoctorSearchQuery('');
    fetchBeds();
  };

  const getDoctorDept = () => selectedDoctor ? (selectedDoctor.dept_name || selectedDoctor.specialization || '').toLowerCase() : '';

  // Suggest bed based on triage and doctor specialization
  const suggestedBeds = availableBeds.filter(bed => {
    const doctorDept = getDoctorDept();
    const isDeptMatch = doctorDept && (bed.ward_name.toLowerCase().includes(doctorDept) || doctorDept.includes(bed.ward_name.toLowerCase()));

    if (formData.triage_level === 'Critical') return bed.bed_type.includes('ICU') || bed.bed_type.includes('NICU');
    if (formData.triage_level === 'Serious') return isDeptMatch || !bed.bed_type.includes('General');

    // For stable, ideally matches ward, else general
    if (doctorDept) {
      return isDeptMatch || bed.bed_type.includes('General');
    }
    return bed.bed_type.includes('General');
  }).sort((a, b) => {
    const doctorDept = getDoctorDept();
    const aMatch = doctorDept && (a.ward_name.toLowerCase().includes(doctorDept) || doctorDept.includes(a.ward_name.toLowerCase()));
    const bMatch = doctorDept && (b.ward_name.toLowerCase().includes(doctorDept) || doctorDept.includes(b.ward_name.toLowerCase()));
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return 0;
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 pb-32">
      <div className="max-w-[1400px] mx-auto space-y-10">
        {/* Immersive Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
              <UserPlus className="h-8 w-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Onboarding</h1>
                <Badge className={`px-3 py-1 text-xs font-bold uppercase tracking-wider ${mode === 'Emergency' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                  {mode} Track
                </Badge>
              </div>
              <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-[0.2em] flex items-center gap-2">
                <Activity className="h-3 w-3" /> System Live — Admission Protocol v2.4
              </p>
            </div>
          </div>

          <Tabs value={mode} onValueChange={(v: any) => setMode(v)} className="w-full lg:w-auto">
            <TabsList className="grid w-full lg:w-[400px] grid-cols-2 h-14 p-1.5 bg-slate-100 rounded-2xl border-0 shadow-inner">
              <TabsTrigger value="General" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md transition-all">
                <User className="h-4 w-4 mr-2" /> General
              </TabsTrigger>
              <TabsTrigger value="Emergency" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:text-red-600 data-[state=active]:shadow-md transition-all">
                <Zap className="h-4 w-4 mr-2" /> Emergency
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-10">
            {/* Step 1: Patient Selection/Identification */}
            <Card className="border-0 shadow-2xl shadow-slate-200/60 rounded-[3rem] bg-white relative">

              <CardContent className="p-10">
                <div className="flex items-center gap-4 mb-10">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${mode === 'Emergency' ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Patient Identification</h2>
                    <p className="text-slate-500 text-sm font-medium">Register new or search existing profile</p>
                  </div>
                </div>

                {mode === 'General' ? (
                  <div className="space-y-8">
                    <div className="relative group">
                      <div className="absolute inset-0 bg-indigo-100/20 rounded-2xl blur-xl group-focus-within:opacity-100 opacity-0 transition-opacity" />
                      <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors z-10" />
                      <Input
                        placeholder="Search by Patient Name, ID or Registered Phone..."
                        className="h-16 pl-16 pr-6 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-lg z-10 relative"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />

                      {searchResults.length > 0 ? (
                        <div className="absolute z-[200] w-full mt-2 bg-white rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.3)] border-2 border-indigo-600 overflow-hidden ring-4 ring-white">
                          <div className="p-4 bg-indigo-600 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Search className="h-4 w-4" />
                              <span className="text-xs font-black uppercase tracking-widest">Matching Patients</span>
                            </div>
                            <div className="bg-white/20 text-white border-white/30 text-[10px] uppercase font-bold px-2 rounded-full border">
                              {searchResults.length} Results
                            </div>
                          </div>
                          <div className="max-h-[350px] overflow-y-auto p-2 space-y-2 bg-slate-50">
                            {searchResults.map((p, idx) => (
                              <button
                                key={p.patient_id || idx}
                                type="button"
                                onClick={() => {
                                  handleSelectPatient(p);
                                  toast.success(`Selected ${p.first_name} ${p.last_name}`);
                                }}
                                className="w-full flex items-center gap-4 p-4 bg-white hover:bg-slate-100 border-2 border-slate-100 hover:border-indigo-500 rounded-2xl transition-all group text-left shadow-sm"
                              >
                                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl font-black shrink-0">
                                  {(p.first_name || 'P')[0].toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-black text-slate-900 text-base truncate">
                                    {p.first_name || 'Unknown'} {p.last_name || ''}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded uppercase">{p.patient_id}</span>
                                    <span className="text-[10px] font-bold text-slate-500">{p.mobile_number || 'No Phone'}</span>
                                  </div>
                                </div>
                                <Plus className="h-5 w-5 text-indigo-400 group-hover:text-indigo-600 shrink-0" />
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        searchQuery.length >= 2 && !isSearching && (
                          <div className="absolute z-[200] w-full mt-2 bg-white rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.3)] border-2 border-red-500 overflow-hidden p-10 text-center ring-4 ring-white">
                            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                              <UserPlus className="h-10 w-10 text-red-500" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Not Registered</h3>
                            <p className="text-slate-500 font-medium max-w-sm mx-auto mb-8">
                              No patient found for "{searchQuery}". Register them first.
                            </p>
                            <Button
                              type="button"
                              size="lg"
                              className="bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl px-10 h-14 w-full shadow-lg shadow-red-100"
                              onClick={() => setMode('Emergency')}
                            >
                              REGISTER NEW PATIENT
                            </Button>
                          </div>
                        )
                      )}
                      {isSearching && (
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10 text-indigo-600 bg-white/80 backdrop-blur pl-4">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Searching</span>
                        </div>
                      )}
                    </div>

                    <AnimatePresence>
                      {selectedPatient && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.98, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          className="bg-indigo-600 rounded-[2.5rem] p-10 shadow-2xl shadow-indigo-200 border-4 border-white relative overflow-visible group mt-8"
                        >
                          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 blur-3xl group-hover:bg-white/20 transition-all duration-700" />

                          <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                            <div className="flex flex-col md:flex-row items-center gap-8">
                              <div className="w-28 h-28 rounded-[2rem] bg-white flex items-center justify-center text-4xl font-black text-indigo-600 shadow-xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                                {(selectedPatient.first_name || 'P')[0].toUpperCase()}
                              </div>
                              <div className="text-center md:text-left">
                                <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase text-white tracking-[0.2em] mb-3">
                                  <ShieldCheck className="h-3 w-3" /> Verified Patient Profile
                                </span>
                                <h3 className="text-4xl font-black text-white tracking-tight mb-2">{(selectedPatient.first_name || '')} {(selectedPatient.last_name || '')}</h3>
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                                  <Badge className="bg-white text-indigo-600 border-none font-black px-4 py-1.5 text-sm rounded-xl">{selectedPatient.patient_id}</Badge>
                                  <span className="text-sm font-bold text-indigo-100 flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    {selectedPatient.date_of_birth ? new Date(selectedPatient.date_of_birth).toLocaleDateString() : 'DOB Not Set'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="secondary"
                              size="lg"
                              className="rounded-2xl font-black px-8 h-16 bg-white text-indigo-600 hover:bg-slate-50 border-none shadow-xl hover:scale-105 active:scale-95 transition-all"
                              onClick={() => setSelectedPatient(null)}
                              type="button"
                            >
                              CHANGE SELECTION
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10 relative z-10">
                            {[
                              { label: 'Gender', value: selectedPatient.gender || 'Not Set', icon: Users },
                              { label: 'Blood Group', value: selectedPatient.blood_group || 'N/A', icon: Activity },
                              { label: 'Mobile', value: selectedPatient.mobile_number || 'N/A', icon: Phone },
                              { label: 'Current Age', value: selectedPatient.date_of_birth ? `${new Date().getFullYear() - new Date(selectedPatient.date_of_birth).getFullYear()} Years` : 'N/A', icon: UserCircle },
                              { label: 'Email', value: selectedPatient.email || 'No Email', icon: History },
                              { label: 'Address', value: selectedPatient.permanent_address_street ? `${selectedPatient.permanent_address_street}, ${selectedPatient.permanent_city}` : 'No Address', icon: Info },
                              { label: 'File Status', value: 'Active Record', icon: CheckCircle2, status: true },
                            ].map((item, i) => (
                              <div key={i} className={`bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 hover:bg-white/15 transition-colors ${item.label === 'Address' ? 'md:col-span-2' : ''}`}>
                                <div className="flex items-center gap-2 mb-2">
                                  <item.icon className="h-3 w-3 text-indigo-200" />
                                  <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest leading-none">{item.label}</p>
                                </div>
                                <p className={`text-lg font-black text-white flex items-center gap-2 truncate ${item.status ? 'text-emerald-300' : ''}`} title={String(item.value)}>
                                  {item.status && <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                                  {item.value}
                                </p>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">First Name *</Label>
                      <Input
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        className="h-14 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all font-bold"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Last Name *</Label>
                      <Input
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        className="h-14 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all font-bold"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Gender *</Label>
                      <Select
                        value={formData.gender}
                        onValueChange={(v) => setFormData({ ...formData, gender: v })}
                      >
                        <SelectTrigger className="h-14 rounded-xl border-slate-200 bg-slate-50/50 font-bold">
                          <SelectValue placeholder="Select Gender" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl overflow-hidden border-slate-100">
                          <SelectItem value="Male" className="font-bold">Male</SelectItem>
                          <SelectItem value="Female" className="font-bold">Female</SelectItem>
                          <SelectItem value="Other" className="font-bold">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Date of Birth *</Label>
                      <Input
                        type="date"
                        value={formData.date_of_birth}
                        onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                        className="h-14 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all font-bold uppercase"
                        required
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Mobile Access Number *</Label>
                      <Input
                        value={formData.mobile_number}
                        onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                        className="h-14 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all font-bold text-lg"
                        required
                        placeholder="+91-0000000000"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Clinical Details */}
            <Card className="border-0 shadow-2xl shadow-slate-200/60 rounded-[3rem] overflow-hidden bg-white">
              <CardContent className="p-10">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-blue-50 text-blue-600">
                    <Stethoscope className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Clinical Directives</h2>
                    <p className="text-slate-500 text-sm font-medium">Define admitting protocols and severity</p>
                  </div>
                </div>

                <div className="space-y-10">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-2 relative group">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Admitting Expert *</Label>
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors z-10" />
                        <Input
                          placeholder="Search Consultant..."
                          className="h-14 pl-12 pr-6 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all font-bold"
                          value={doctorSearchQuery}
                          onChange={(e) => setDoctorSearchQuery(e.target.value)}
                        />

                        <AnimatePresence>
                          {doctorSearchResults.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-3xl border border-slate-100 overflow-hidden"
                            >
                              <div className="max-h-60 overflow-y-auto p-1">
                                {doctorSearchResults.map((d) => (
                                  <button
                                    key={d.staff_id}
                                    type="button"
                                    onClick={() => handleSelectDoctor(d)}
                                    className="w-full flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-all group"
                                  >
                                    <div className="text-left">
                                      <p className="font-black text-slate-900 text-sm">Dr. {d.first_name} {d.last_name}</p>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{d.specialization || d.dept_name}</p>
                                    </div>
                                    <Stethoscope className="h-4 w-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <AnimatePresence>
                        {selectedDoctor && (
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl flex items-center justify-between mt-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-blue-600">
                                <Stethoscope className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="text-sm font-black text-slate-900 leading-tight">Dr. {selectedDoctor.first_name} {selectedDoctor.last_name}</p>
                                <p className="text-[10px] font-black text-blue-600/70 tracking-widest uppercase">{selectedDoctor.specialization || selectedDoctor.dept_name}</p>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase hover:bg-white rounded-lg text-blue-600" onClick={() => {
                              setSelectedDoctor(null);
                              setFormData(prev => ({ ...prev, admitting_doctor_id: '' }));
                            }}>Change</Button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Admission Category *</Label>
                      <Select
                        value={formData.admission_type}
                        onValueChange={(v) => setFormData({ ...formData, admission_type: v })}
                        disabled={mode === 'Emergency'}
                      >
                        <SelectTrigger className="h-14 rounded-xl border-slate-200 bg-slate-50/50 font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl overflow-hidden border-slate-100">
                          {admissionTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value} className="font-bold">{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 block">Triage / Severity Assessment</Label>
                    <div className="grid grid-cols-3 gap-6">
                      {triageLevels.map((lvl) => {
                        const Icon = lvl.icon;
                        const isSelected = formData.triage_level === lvl.value;
                        const colorClass = lvl.value === 'Critical' ? 'red' : lvl.value === 'Serious' ? 'orange' : 'emerald';
                        return (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            key={lvl.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, triage_level: lvl.value })}
                            className={`flex flex-col items-center gap-4 p-6 rounded-[2rem] border-2 transition-all relative overflow-hidden group ${isSelected
                              ? `border-${colorClass}-500 bg-${colorClass}-50/50 ring-4 ring-${colorClass}-500/10`
                              : 'border-slate-100 hover:border-slate-200 bg-white shadow-sm'
                              }`}
                          >
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${isSelected ? `bg-${colorClass}-500 text-white` : `bg-${colorClass}-50 text-${colorClass}-500`}`}>
                              <Icon className="h-7 w-7" />
                            </div>
                            <div className="text-center">
                              <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isSelected ? `text-${colorClass}-700` : 'text-slate-400'}`}>{lvl.value}</span>
                              <p className={`text-[8px] font-bold uppercase tracking-widest mt-0.5 ${isSelected ? `text-${colorClass}-500/80` : 'text-slate-300'}`}>Protocol P1</p>
                            </div>
                            {isSelected && (
                              <motion.div
                                layoutId="triage-active"
                                className={`absolute top-0 right-0 w-12 h-12 bg-${colorClass}-500/10 rounded-bl-[2rem] flex items-center justify-center`}
                              >
                                <CheckCircle2 className={`h-4 w-4 text-${colorClass}-600`} />
                              </motion.div>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Admission Indication *</Label>
                      <Input
                        placeholder="Reason for hospitalization..."
                        className="h-14 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all font-bold"
                        value={formData.admission_reason}
                        onChange={(e) => setFormData({ ...formData, admission_reason: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Provisional Findings</Label>
                      <Input
                        placeholder="Clinical observations..."
                        className="h-14 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all font-bold"
                        value={formData.provisional_diagnosis}
                        onChange={(e) => setFormData({ ...formData, provisional_diagnosis: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-4 space-y-10">
            {/* Step 3: Bed & Resource */}
            <Card className="border-0 shadow-2xl shadow-slate-200/60 rounded-[3rem] overflow-hidden bg-white border-t-4 border-indigo-500">
              <CardContent className="p-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-50 text-indigo-600">
                    <Bed className="h-5 w-5" />
                  </div>
                  <h3 className="font-black text-slate-900 tracking-tight">Resource Allocation</h3>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Available Units</span>
                    <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[10px] font-black uppercase">{availableBeds.length} VACANT</Badge>
                  </div>

                  <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {suggestedBeds.length > 0 ? (
                      suggestedBeds.map((bed, idx) => (
                        <motion.button
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          key={bed.bed_id}
                          type="button"
                          onClick={() => setFormData({ ...formData, bed_id: bed.bed_id })}
                          className={`w-full p-5 rounded-2xl border-2 text-left transition-all relative overflow-hidden group ${formData.bed_id === bed.bed_id
                            ? 'border-indigo-600 bg-indigo-50/50 shadow-lg shadow-indigo-100'
                            : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className={`text-lg font-black tracking-tight ${formData.bed_id === bed.bed_id ? 'text-indigo-900' : 'text-slate-900'}`}>{bed.bed_id}</span>
                            <div className="flex gap-2">
                              {getDoctorDept() && (bed.ward_name.toLowerCase().includes(getDoctorDept()) || getDoctorDept().includes(bed.ward_name.toLowerCase())) && (
                                <Badge className="bg-emerald-50 text-emerald-600 border-0 h-5 px-1.5 text-[8px] font-black uppercase">Pref</Badge>
                              )}
                              <Badge className="bg-slate-900 text-white border-0 h-5 px-1.5 text-[8px] font-black uppercase">{bed.bed_type}</Badge>
                            </div>
                          </div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{bed.ward_name}</p>
                          <div className="flex items-center justify-between mt-4">
                            <p className="text-sm font-black text-indigo-600">₹{bed.daily_charge}<span className="text-[10px] font-medium text-slate-400"> / Cycle</span></p>
                            {formData.bed_id === bed.bed_id && (
                              <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center">
                                <CheckCircle2 className="h-4 w-4 text-white" />
                              </div>
                            )}
                          </div>
                        </motion.button>
                      ))
                    ) : (
                      <div className="py-10 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        <Bed className="h-10 w-12 mx-auto text-slate-300 mb-4 opacity-50" />
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest px-6 leading-relaxed">No matching units found in current protocol</p>
                        <Button variant="link" size="sm" className="mt-2 text-indigo-600 font-black text-xs uppercase" onClick={() => setFormData({ ...formData, bed_id: '' })}>Show All Floors</Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Payment Method</Label>
                      <Select value={formData.payment_type} onValueChange={(v) => setFormData({ ...formData, payment_type: v })}>
                        <SelectTrigger className="h-14 rounded-xl border-slate-200 bg-slate-50/50 font-bold">
                          <SelectValue placeholder="Protocol Mode" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl overflow-hidden border-slate-100">
                          {paymentTypes.map(p => <SelectItem key={p.value} value={p.value} className="font-bold">{p.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Advance Commitment (₹)</Label>
                      <div className="relative">
                        <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          type="number"
                          placeholder="0.00"
                          className="h-14 pl-12 rounded-xl border-slate-200 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all font-black text-lg"
                          value={formData.advance_payment}
                          onChange={(e) => setFormData({ ...formData, advance_payment: e.target.value })}
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-18 py-8 rounded-[1.5rem] bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-100 transition-all text-xl font-black tracking-tight mt-6 group overflow-hidden relative"
                      disabled={loading}
                    >
                      <div className="absolute inset-0 bg-white/10 group-hover:translate-x-full transition-transform duration-500 -translate-x-full" />
                      {loading ? (
                        <>
                          <Loader2 className="mr-3 h-6 w-6 animate-spin stroke-[3px]" />
                          Authorizing...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-3 h-6 w-6 stroke-[3px]" />
                          Finalize Admission
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 4: Guardian / Legal */}
            <Card className="border-0 shadow-2xl shadow-slate-200/60 rounded-[3rem] overflow-hidden bg-white">
              <CardContent className="p-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-50 text-purple-600">
                    <User className="h-5 w-5" />
                  </div>
                  <h3 className="font-black text-slate-900 tracking-tight">Legal Representative</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Full Legal Name</Label>
                    <Input
                      placeholder="Guardian / Emergency Contact"
                      value={formData.guardian_name}
                      onChange={(e) => setFormData({ ...formData, guardian_name: e.target.value })}
                      className="h-12 rounded-xl border-slate-200 bg-slate-50/50 font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 text-left">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Relation</Label>
                      <Input
                        placeholder="Relation"
                        value={formData.guardian_relation}
                        onChange={(e) => setFormData({ ...formData, guardian_relation: e.target.value })}
                        className="h-12 rounded-xl border-slate-200 bg-slate-50/50 font-bold"
                      />
                    </div>
                    <div className="space-y-2 text-left">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Contact</Label>
                      <Input
                        placeholder="Phone Number"
                        value={formData.guardian_contact}
                        onChange={(e) => setFormData({ ...formData, guardian_contact: e.target.value })}
                        className="h-12 rounded-xl border-slate-200 bg-slate-50/50 font-bold"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </div>
  );
}
