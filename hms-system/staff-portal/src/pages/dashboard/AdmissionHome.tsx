import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bed, Users, Activity, Plus, Filter, RefreshCw, Clock,
  Eye, Pause, XCircle, CreditCard, Stethoscope, AlertTriangle,
  TrendingUp, ArrowUpRight, ArrowDownRight, Search, CheckCircle2, Loader2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface AdmissionPatient {
  admission_id: string;
  patient_id: string;
  patient_name: string;
  patient_phone?: string;
  doctor_name: string;
  department_name?: string;
  admission_type: string;
  admission_date: string;
  bed_type?: string;
  ward_name?: string;
  room_number?: string;
  assigned_bed?: string;
  status: string;
  provisional_diagnosis?: string;
  advance_payment?: number;
  payment_type?: string;
  wait_minutes?: number;
  is_waiting_long?: boolean;
  gender?: string;
  blood_group?: string;
  guardian_name?: string;
  guardian_contact?: string;
}

interface DashboardStats {
  today_admissions: number;
  yesterday_admissions: number;
  today_discharges: number;
  total_beds: number;
  occupied_beds: number;
  available_beds: number;
  pending_queue: number;
  total_admitted: number;
}

export default function AdmissionHome() {
  const [loading, setLoading] = useState(true);
  const [admissions, setAdmissions] = useState<AdmissionPatient[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    today_admissions: 0, yesterday_admissions: 0, today_discharges: 0,
    total_beds: 0, occupied_beds: 0, available_beds: 0, pending_queue: 0, total_admitted: 0,
  });
  const [departments, setDepartments] = useState<string[]>([]);
  const [doctors, setDoctors] = useState<{ staff_id: string; name: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState<AdmissionPatient | null>(null);
  const [consentChecklist, setConsentChecklist] = useState({
    id_proof: false, consent_form: false, emergency_contact: false, insurance_docs: false, medical_history: false,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const token = localStorage.getItem('hms_staff_token');
      const params = new URLSearchParams();
      if (deptFilter && deptFilter !== 'all') params.append('department', deptFilter);
      if (typeFilter && typeFilter !== 'all') params.append('type', typeFilter);

      const res = await fetch(`${API_URL}/admission/dashboard?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setAdmissions(data.admissions || []);
        setStats(data.stats || stats);
        setDepartments(data.filters?.departments || []);
        setDoctors(data.filters?.doctors || []);
      }
    } catch (e) {
      console.error('Dashboard fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [deptFilter, typeFilter]);

  useEffect(() => {
    fetchDashboard();

    // Connect WebSocket for real-time updates
    const socketURL = 'http://localhost:5000';
    const socket = io(socketURL, {
      path: '/socket.io/',
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => console.log('AdmissionHome WebSocket connected'));

    const handleRemoteUpdate = () => {
      console.log('Real-time admission update received');
      fetchDashboard(true);
    };

    socket.on('admission_added', handleRemoteUpdate);
    socket.on('admission_status_updated', handleRemoteUpdate);
    socket.on('admission:discharged', handleRemoteUpdate);
    socket.on('emergency_admission_added', handleRemoteUpdate);

    return () => {
      socket.disconnect();
    };
  }, [fetchDashboard]);

  const handleAction = async (admissionId: string, action: string) => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/admissions/${admissionId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        toast.success(`Action "${action}" completed successfully`);
        fetchDashboard(true);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Action failed');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const allConsentsChecked = Object.values(consentChecklist).every(Boolean);

  const filteredAdmissions = admissions.filter((a) =>
  (a.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.admission_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.doctor_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const admissionChange = stats.today_admissions - stats.yesterday_admissions;
  const occupancyRate = stats.total_beds > 0 ? Math.round((stats.occupied_beds / stats.total_beds) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-500">Loading admission dashboard...</p>
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
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 shrink-0">
              <Activity className="h-8 w-8 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Admission Center</h1>
                <Badge className="bg-blue-50 text-blue-700 border-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wider">Live Hub</Badge>
              </div>
              <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-[0.2em]">Validated Diagnostic Archives — Phase 5</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 grow max-w-2xl">
            <div className="relative w-full group">
              <div className="absolute inset-0 bg-blue-100/20 rounded-2xl blur-xl group-hover:bg-blue-100/40 transition-all opacity-0 group-focus-within:opacity-100" />
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors z-10" />
              <Input
                placeholder="Search patient, admission ID, or doctor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-14 pl-14 pr-6 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-base z-10 relative"
              />
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button asChild className="h-14 px-8 rounded-2xl bg-slate-900 hover:bg-black text-white shadow-xl shadow-slate-200 transition-all grow sm:grow-0">
                <Link to="/admission/new">
                  <Plus className="h-5 w-5 mr-2 stroke-[3px]" />
                  <span className="font-bold">New Admission</span>
                </Link>
              </Button>
              <Button
                variant="outline"
                className="h-14 w-14 rounded-2xl border-slate-200 hover:bg-slate-50 shrink-0"
                onClick={() => fetchDashboard(true)}
              >
                <RefreshCw className={`h-5 w-5 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              label: "Today's Admissions",
              value: stats.today_admissions,
              sub: `${Math.abs(admissionChange)} vs yesterday`,
              icon: TrendingUp,
              color: "blue",
              trend: admissionChange >= 0 ? 'up' : 'down'
            },
            {
              label: "Available Beds",
              value: stats.available_beds,
              sub: `${stats.total_beds} total beds`,
              icon: Bed,
              color: "emerald"
            },
            {
              label: "Currently Admitted",
              value: stats.total_admitted,
              sub: `${occupancyRate}% occupancy`,
              icon: Users,
              color: "purple"
            },
            {
              label: "Today's Discharges",
              value: stats.today_discharges,
              sub: "beds freed today",
              icon: CheckCircle2,
              color: "orange"
            }
          ].map((s, i) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={i}
            >
              <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-${s.color}-50 text-${s.color}-600 group-hover:scale-110 transition-transform`}>
                      <s.icon className="h-7 w-7" />
                    </div>
                    {s.trend && (
                      <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${s.trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {s.trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {s.trend === 'up' ? 'Increase' : 'Decrease'}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">{s.label}</h3>
                    <div className="flex items-baseline gap-2 mt-2">
                      <p className="text-4xl font-black text-slate-900 tracking-tight">{s.value}</p>
                    </div>
                    <p className="text-slate-400 text-xs font-semibold mt-2">{s.sub}</p>
                  </div>
                </CardContent>
                <div className={`h-1.5 w-full bg-${s.color}-500/10`}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 1, delay: i * 0.2 }}
                    className={`h-full bg-${s.color}-500 group-hover:bg-${s.color}-600 transition-colors`}
                  />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Occupancy Section */}
        <Card className="border-0 shadow-2xl shadow-slate-200/60 rounded-[3rem] overflow-hidden bg-white">
          <CardContent className="p-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-4 space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Facility Utilization</h2>
                  <p className="text-slate-500 font-medium mt-1">Real-time bed capacity analytics</p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 font-bold">
                        {stats.available_beds}
                      </div>
                      <span className="font-bold text-slate-700">Available</span>
                    </div>
                    <Badge className="bg-emerald-50 text-emerald-700">Ready</Badge>
                  </div>
                  <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold">
                        {stats.occupied_beds}
                      </div>
                      <span className="font-bold text-slate-700">Occupied</span>
                    </div>
                    <Badge className="bg-blue-50 text-blue-700">Active</Badge>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-8 p-10 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
                  <div className="flex items-center gap-3">
                    <Activity className="h-6 w-6 text-blue-600" />
                    <span className="text-lg font-black text-slate-900 tracking-tight uppercase">Bed Occupancy Rate</span>
                  </div>
                  <div className={`text-4xl font-black ${occupancyRate > 90 ? 'text-red-600' : occupancyRate > 70 ? 'text-amber-500' : 'text-emerald-600'}`}>
                    {occupancyRate}%
                  </div>
                </div>
                <div className="h-8 bg-white rounded-full p-1.5 shadow-inner border border-slate-200 relative overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${occupancyRate}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className={`h-full rounded-full shadow-lg relative ${occupancyRate > 90 ? 'bg-gradient-to-r from-red-500 to-rose-600' :
                      occupancyRate > 70 ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                        'bg-gradient-to-r from-emerald-400 to-blue-500'
                      }`}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
                  </motion.div>
                </div>
                <div className="flex justify-between items-center mt-6">
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Global Resource Load</p>
                  <p className="text-sm font-black text-slate-600">{stats.occupied_beds} / {stats.total_beds} Units</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Patient Queue Section */}
        <div className="space-y-8">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Live Admission Queue</h2>
              <Badge className="bg-slate-900 text-white rounded-full px-4 h-7 text-xs font-bold font-mono">
                {filteredAdmissions.length} ACTIVE
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={`h-11 rounded-xl transition-all ${showFilters ? 'bg-slate-900 text-white border-slate-900' : 'hover:bg-slate-50'}`}
              >
                <Filter className="h-4 w-4 mr-2" />
                <span className="font-bold">Protocol Filters</span>
              </Button>
            </div>
          </div>

          {showFilters && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-wrap gap-4"
            >
              <div className="flex-1 min-w-[200px]">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-2 block">Specialization</Label>
                <Select value={deptFilter} onValueChange={setDeptFilter}>
                  <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-0 focus:ring-2 focus:ring-blue-500/20 font-bold">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-2 block">Admission Type</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-0 focus:ring-2 focus:ring-blue-500/20 font-bold">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Emergency">Emergency</SelectItem>
                    <SelectItem value="Elective">Planned</SelectItem>
                    <SelectItem value="Maternity">Maternity</SelectItem>
                    <SelectItem value="Day_Care">Day Care</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </motion.div>
          )}

          {filteredAdmissions.length === 0 ? (
            <div className="bg-white rounded-[3rem] p-24 text-center border-4 border-dashed border-slate-100">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8">
                <Users className="h-12 w-12 text-slate-300" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Queue Clear</h3>
              <p className="text-slate-500 font-medium">No patients currently matching active protocols</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredAdmissions.map((adm, idx) => (
                <motion.div
                  key={adm.admission_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className={`group border-0 shadow-lg shadow-slate-200/40 rounded-[2.5rem] overflow-hidden hover:shadow-2xl hover:shadow-blue-200/30 transition-all duration-500 ${adm.is_waiting_long ? 'bg-red-50/50' : 'bg-white'
                    }`}>
                    <CardContent className="p-0">
                      <div className="flex flex-col lg:flex-row items-stretch">
                        <div className={`w-full lg:w-2 shrink-0 ${adm.admission_type === 'Emergency' ? 'bg-red-500' :
                          adm.admission_type === 'Maternity' ? 'bg-pink-500' :
                            'bg-blue-500'
                          }`} />

                        <div className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                          {/* Patient Info Column */}
                          <div className="lg:col-span-3 flex items-center gap-6">
                            <div className={`w-16 h-16 rounded-2xl shrink-0 flex items-center justify-center text-xl font-black text-white shadow-lg ${adm.admission_type === 'Emergency' ? 'bg-gradient-to-br from-red-500 to-rose-600 animate-pulse' :
                              adm.admission_type === 'Maternity' ? 'bg-gradient-to-br from-pink-500 to-rose-500' :
                                'bg-gradient-to-br from-blue-500 to-indigo-600'
                              }`}>
                              {adm.patient_name?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-lg font-black text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
                                {adm.patient_name}
                              </p>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mt-1">{adm.admission_id}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant={adm.admission_type === 'Emergency' ? 'destructive' : 'secondary'} className="rounded-full px-3 text-[10px] font-bold h-6">
                                  {adm.admission_type?.replace('_', ' ')}
                                </Badge>
                                {adm.is_waiting_long && (
                                  <Badge className="bg-red-600 text-white rounded-full px-3 h-6 text-[10px] animate-bounce">PRIORITY</Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Medical/Context Column */}
                          <div className="lg:col-span-3 grid grid-cols-2 lg:grid-cols-1 gap-4">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                <Stethoscope className="h-4 w-4 text-slate-500" />
                              </div>
                              <div>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Attending</p>
                                <p className="text-sm font-bold text-slate-700 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">Dr. {adm.doctor_name}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                <Activity className="h-4 w-4 text-slate-500" />
                              </div>
                              <div>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Department</p>
                                <p className="text-sm font-bold text-slate-700 mt-0.5">{adm.department_name}</p>
                              </div>
                            </div>
                          </div>

                          {/* Allocation Column */}
                          <div className="lg:col-span-3 grid grid-cols-2 lg:grid-cols-1 gap-4">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                <Bed className="h-4 w-4 text-slate-500" />
                              </div>
                              <div>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Bed Unit</p>
                                {adm.assigned_bed ? (
                                  <p className="text-sm font-black text-blue-600 mt-0.5">{adm.assigned_bed} <span className="text-[10px] text-slate-400 font-bold ml-1">({adm.ward_name})</span></p>
                                ) : (
                                  <p className="text-sm font-black text-amber-500 mt-0.5 italic">Unassigned</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                <Clock className="h-4 w-4 text-slate-500" />
                              </div>
                              <div>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Dwell Time</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className={`text-sm font-black ${adm.is_waiting_long ? 'text-red-600' : 'text-slate-700'}`}>
                                    {adm.wait_minutes && adm.wait_minutes > 1440
                                      ? `${Math.floor(adm.wait_minutes / 1440)}d ${Math.floor((adm.wait_minutes % 1440) / 60)}h`
                                      : adm.wait_minutes && adm.wait_minutes > 60
                                        ? `${Math.floor(adm.wait_minutes / 60)}h ${adm.wait_minutes % 60}m`
                                        : `${adm.wait_minutes || 0}m`}
                                  </span>
                                  {adm.is_waiting_long && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Actions Column */}
                          <div className="lg:col-span-3 flex items-center justify-end gap-3">
                            <Button
                              variant="ghost"
                              className="h-14 w-14 rounded-2xl bg-slate-50 hover:bg-blue-50 hover:text-blue-600 transition-all border border-transparent hover:border-blue-100"
                              onClick={() => setSelectedPatient(adm)}
                            >
                              <Eye className="h-5 w-5" />
                            </Button>
                            <Button
                              variant="ghost"
                              className="h-14 w-14 rounded-2xl bg-slate-50 hover:bg-amber-50 hover:text-amber-600 transition-all border border-transparent hover:border-amber-100"
                              onClick={() => handleAction(adm.admission_id, 'hold')}
                            >
                              <Pause className="h-5 w-5" />
                            </Button>
                            <Button
                              variant="ghost"
                              className="h-14 w-14 rounded-2xl bg-slate-50 hover:bg-purple-50 hover:text-purple-600 transition-all border border-transparent hover:border-purple-100"
                            >
                              <CreditCard className="h-5 w-5" />
                            </Button>
                            <Button
                              variant="ghost"
                              className="h-14 w-14 rounded-2xl bg-slate-50 hover:bg-red-50 hover:text-red-600 transition-all border border-transparent hover:border-red-100"
                              onClick={() => handleAction(adm.admission_id, 'cancel')}
                            >
                              <XCircle className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Improved Patient Detail / Consent Dialog */}
        <Dialog open={!!selectedPatient} onOpenChange={() => {
          setSelectedPatient(null);
          setConsentChecklist({ id_proof: false, consent_form: false, emergency_contact: false, insurance_docs: false, medical_history: false });
        }}>
          <DialogContent className="max-w-3xl rounded-[3rem] p-0 overflow-hidden border-0 shadow-3xl bg-white">
            {selectedPatient && (
              <div className="flex flex-col h-full max-h-[90vh]">
                <div className="p-10 pb-6 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-[1.5rem] bg-white/10 flex items-center justify-center text-3xl font-black text-white shrink-0">
                      {selectedPatient.patient_name?.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-3xl font-black tracking-tight">{selectedPatient.patient_name}</h2>
                      <p className="text-slate-400 font-bold tracking-widest text-xs uppercase mt-1">{selectedPatient.admission_id} • PROFILE VERIFICATION</p>
                    </div>
                  </div>
                  <Badge className="bg-blue-600 text-white px-4 h-8 rounded-full font-black text-[10px] tracking-widest uppercase">
                    Protocol {selectedPatient.admission_type}
                  </Badge>
                </div>

                <div className="flex-1 overflow-y-auto p-10 space-y-10">
                  {/* Grid Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {[
                      { label: "Referring Expert", value: `Dr. ${selectedPatient.doctor_name}`, icon: Stethoscope },
                      { label: "Clinical Specialty", value: selectedPatient.department_name || 'General Medicine', icon: Activity },
                      { label: "Payment Protocol", value: `${selectedPatient.payment_type} — ₹${selectedPatient.advance_payment || 0}`, icon: CreditCard },
                      { label: "Allocated Unit", value: selectedPatient.assigned_bed ? `${selectedPatient.assigned_bed} (${selectedPatient.ward_name})` : 'Awaiting Assignment', icon: Bed },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-4 p-5 rounded-[1.5rem] bg-slate-50 border border-slate-100">
                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                          <item.icon className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                          <p className="text-base font-black text-slate-900 mt-0.5">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Diagnosis Card */}
                  <div className="p-8 rounded-[2rem] bg-blue-50/50 border border-blue-100">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Activity className="h-3 w-3" /> Provisional Diagnosis
                    </p>
                    <p className="text-lg font-bold text-slate-900 leading-relaxed italic">
                      " {selectedPatient.provisional_diagnosis || 'No clinical notes provided at admission.'} "
                    </p>
                  </div>

                  {/* Checklist Section */}
                  <div>
                    <h4 className="text-xl font-black text-slate-900 tracking-tight mb-6 flex items-center gap-3">
                      <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                      Admission Readiness Protocol
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                      {[
                        { key: 'id_proof', label: 'ID Proof Verified (Aadhaar / Passport / DL)' },
                        { key: 'consent_form', label: 'Admission Consent Form Signed' },
                        { key: 'emergency_contact', label: 'Emergency Contact Information Collected' },
                        { key: 'insurance_docs', label: 'Insurance / Payment Documents Verified' },
                        { key: 'medical_history', label: 'Medical History Form Completed' },
                      ].map((item) => (
                        <label
                          key={item.key}
                          className={`flex items-center gap-4 p-5 rounded-[1.5rem] border-2 cursor-pointer transition-all ${consentChecklist[item.key as keyof typeof consentChecklist]
                            ? 'bg-emerald-50 border-emerald-500 ring-4 ring-emerald-500/10'
                            : 'bg-white border-slate-100 hover:border-blue-500/30'
                            }`}
                        >
                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${consentChecklist[item.key as keyof typeof consentChecklist] ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'
                            }`}>
                            {consentChecklist[item.key as keyof typeof consentChecklist] && <CheckCircle2 className="h-4 w-4" />}
                          </div>
                          <input
                            type="checkbox"
                            checked={consentChecklist[item.key as keyof typeof consentChecklist]}
                            onChange={(e) =>
                              setConsentChecklist({ ...consentChecklist, [item.key]: e.target.checked })
                            }
                            className="hidden"
                          />
                          <span className={`text-sm font-bold uppercase tracking-wider ${consentChecklist[item.key as keyof typeof consentChecklist] ? 'text-emerald-700' : 'text-slate-600'
                            }`}>
                            {item.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-10 pt-6 bg-slate-50 border-t border-slate-200 flex gap-4">
                  <Button
                    className={`h-16 flex-1 rounded-2xl text-lg font-black shadow-xl transition-all ${allConsentsChecked
                      ? 'bg-gradient-to-r from-emerald-600 to-green-500 hover:scale-[1.02] shadow-emerald-200 active:scale-95'
                      : 'bg-slate-300'
                      }`}
                    disabled={!allConsentsChecked}
                    onClick={() => {
                      toast.success('All documents verified — patient fully admitted');
                      setSelectedPatient(null);
                    }}
                  >
                    {allConsentsChecked ? (
                      <>
                        <CheckCircle2 className="h-6 w-6 mr-3 stroke-[3px]" />
                        Confirm Admission
                      </>
                    ) : 'Complete All Protocols First'}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-16 px-8 rounded-2xl font-black text-slate-600 hover:bg-slate-100"
                    onClick={() => setSelectedPatient(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
