import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users, HeartPulse, Pill, FlaskConical, Calendar, Loader2,
  Search, Activity, Thermometer, Droplets, Clock, AlertCircle,
  UserCheck, BedDouble, ChevronDown, ChevronUp, Stethoscope,
  FileText, TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import socket from '@/lib/socket';

const API = import.meta.env.VITE_API_URL || '/api';

interface Stats {
  total_patients: number;
  admitted_patients: number;
  today_appointments: number;
  pending_labs: number;
  active_prescriptions: number;
  total_beds: number;
  occupied_beds: number;
  available_beds: number;
}

export default function NurseHome() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [todayAppts, setTodayAppts] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [labOrders, setLabOrders] = useState<any[]>([]);
  const [latestVitals, setLatestVitals] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API}/nurse/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setStats(data.stats);
      setPatients(data.patients || []);
      setAdmissions(data.admissions || []);
      setTodayAppts(data.today_appointments || []);
      setPrescriptions(data.prescriptions || []);
      setLabOrders(data.lab_orders || []);
      setLatestVitals(data.latest_vitals || {});
    } catch (err) {
      console.error(err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Real-time: refresh when beds, admissions, labs, prescriptions change
  useEffect(() => {
    const onUpdate = () => fetchData();
    socket.on('bed_inventory_updated', onUpdate);
    socket.on('bed_status_changed', onUpdate);
    socket.on('bed:status_changed', onUpdate);
    socket.on('admission_status_updated', onUpdate);
    socket.on('admission:discharged', onUpdate);
    socket.on('new_lab_order', onUpdate);
    socket.on('lab_order_updated', onUpdate);
    socket.on('lab_report_verified', onUpdate);
    socket.on('pharmacy:prescription_received', onUpdate);
    return () => {
      socket.off('bed_inventory_updated', onUpdate);
      socket.off('bed_status_changed', onUpdate);
      socket.off('bed:status_changed', onUpdate);
      socket.off('admission_status_updated', onUpdate);
      socket.off('admission:discharged', onUpdate);
      socket.off('new_lab_order', onUpdate);
      socket.off('lab_order_updated', onUpdate);
      socket.off('lab_report_verified', onUpdate);
      socket.off('pharmacy:prescription_received', onUpdate);
    };
  }, [fetchData]);

  const getVitalStatus = (v: any) => {
    if (!v) return 'unknown';
    const sys = v.blood_pressure_systolic;
    const temp = v.temperature;
    const spo2 = v.spo2;
    if ((sys && sys > 180) || (temp && temp > 103) || (spo2 && spo2 < 90)) return 'critical';
    if ((sys && (sys > 140 || sys < 90)) || (temp && (temp > 100 || temp < 96)) || (spo2 && spo2 < 95)) return 'warning';
    return 'normal';
  };

  const getPatientStatus = (patientId: string) => {
    const admission = admissions.find(a => a.patient_id === patientId);
    if (admission) {
      if (admission.status === 'Discharged') return { label: 'Discharged', color: 'bg-gray-100 text-gray-700' };
      const vs = getVitalStatus(latestVitals[patientId]);
      if (vs === 'critical') return { label: 'Critical', color: 'bg-red-100 text-red-800' };
      return { label: 'Admitted', color: 'bg-blue-100 text-blue-800' };
    }
    const hasAppt = todayAppts.some(a => a.patient_id === patientId);
    if (hasAppt) return { label: 'Outpatient', color: 'bg-green-100 text-green-800' };
    return { label: 'Registered', color: 'bg-gray-100 text-gray-600' };
  };

  const filteredPatients = patients.filter(p =>
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.patient_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingLabsForPatient = (pid: string) => labOrders.filter(lo => lo.patient_id === pid && ['Pending', 'Sample_Collected'].includes(lo.status));
  const rxForPatient = (pid: string) => prescriptions.filter(rx => rx.patient_id === pid);
  const apptForPatient = (pid: string) => todayAppts.filter(a => a.patient_id === pid);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Stethoscope className="h-7 w-7 text-indigo-600" /> Nursing Station
          </h1>
          <p className="text-gray-500 text-sm mt-1">Hospitalized Patient Oversight</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Search admitted patients..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)} className="pl-10 h-11 rounded-xl shadow-sm border-gray-200" />
        </div>

      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[
            { label: 'Admitted Today', value: stats.admitted_patients, icon: <BedDouble className="h-5 w-5" />, color: 'from-indigo-600 to-indigo-700' },
            { label: 'Active Meds', value: stats.active_prescriptions, icon: <Pill className="h-5 w-5" />, color: 'from-purple-600 to-purple-700' },
            { label: 'Pending Labs', value: stats.pending_labs, icon: <FlaskConical className="h-5 w-5" />, color: 'from-amber-600 to-amber-700' },
            { label: 'Ward Availability', value: `${stats.occupied_beds}/${stats.total_beds}`, icon: <Users className="h-5 w-5" />, color: 'from-teal-600 to-teal-700' },
          ].map((s, i) => (
            <Card key={i} className="overflow-hidden border-0 shadow-lg shadow-slate-200/50 rounded-2xl">
              <CardContent className="p-0">
                <div className={`bg-gradient-to-br ${s.color} p-4 flex items-center gap-4`}>
                  <div className="bg-white/20 p-2.5 rounded-xl text-white">{s.icon}</div>
                  <div>
                    <p className="text-2xl font-black text-white">{s.value}</p>
                    <p className="text-xs font-bold text-white/80 uppercase tracking-wider">{s.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}


      {/* Patient List */}

      <div className="pt-2">
        <h2 className="font-bold text-xl text-slate-800 mb-5 flex items-center gap-2 leading-none">
          <UserCheck className="h-6 w-6 text-indigo-600" /> Admitted Patients ({filteredPatients.length})
        </h2>

        <div className="space-y-3">
          {filteredPatients.length === 0 ? (
            <Card>
              <CardContent className="text-center py-10">
                <Users className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                <p className="font-semibold text-gray-700">No patients found</p>
              </CardContent>
            </Card>
          ) : (
            filteredPatients.map(patient => {
              const pid = patient.patient_id;
              const vitals = latestVitals[pid];
              const status = getPatientStatus(pid);
              const vitalStatus = getVitalStatus(vitals);
              const expanded = expandedPatient === pid;
              const patientLabs = pendingLabsForPatient(pid);
              const patientRx = rxForPatient(pid);
              const patientAppts = apptForPatient(pid);

              return (
                <Card key={pid} className={`overflow-hidden transition-all hover:shadow-md ${vitalStatus === 'critical' ? 'border-l-4 border-l-red-500' :
                  vitalStatus === 'warning' ? 'border-l-4 border-l-amber-400' :
                    'border-l-4 border-l-green-400'
                  }`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      {/* Patient Info */}
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-white text-sm ${vitalStatus === 'critical' ? 'bg-red-500' : vitalStatus === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                          }`}>
                          {patient.first_name?.charAt(0)}{patient.last_name?.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{patient.first_name} {patient.last_name}</span>
                            <Badge className={`text-xs ${status.color}`}>{status.label}</Badge>
                            {patient.blood_group && <Badge variant="outline" className="text-xs">{patient.blood_group}</Badge>}
                            {patient.allergies && <Badge className="bg-red-50 text-red-700 text-xs">⚠ Allergies</Badge>}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 flex-wrap">
                            <span>{pid}</span>
                            {patient.gender && <span>{patient.gender}</span>}
                            {patient.date_of_birth && <span>DOB: {patient.date_of_birth}</span>}
                            {patient.phone && <span>📱 {patient.phone}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Vitals at a glance */}
                      {vitals ? (
                        <div className="flex items-center gap-4 text-sm">
                          {vitals.blood_pressure_systolic && (
                            <div className="flex items-center gap-1">
                              <Activity className={`h-3.5 w-3.5 ${vitals.blood_pressure_systolic > 140 ? 'text-red-500' : 'text-blue-500'}`} />
                              <span className="font-medium">{vitals.blood_pressure_systolic}/{vitals.blood_pressure_diastolic}</span>
                            </div>
                          )}
                          {vitals.pulse_rate && (
                            <div className="flex items-center gap-1">
                              <HeartPulse className={`h-3.5 w-3.5 ${vitals.pulse_rate > 100 ? 'text-red-500' : 'text-pink-500'}`} />
                              <span className="font-medium">{vitals.pulse_rate}</span>
                            </div>
                          )}
                          {vitals.temperature && (
                            <div className="flex items-center gap-1">
                              <Thermometer className={`h-3.5 w-3.5 ${vitals.temperature > 100 ? 'text-red-500' : 'text-orange-500'}`} />
                              <span className="font-medium">{vitals.temperature}°</span>
                            </div>
                          )}
                          {vitals.spo2 && (
                            <div className="flex items-center gap-1">
                              <Droplets className={`h-3.5 w-3.5 ${vitals.spo2 < 95 ? 'text-red-500' : 'text-cyan-500'}`} />
                              <span className="font-medium">{vitals.spo2}%</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No vitals recorded</span>
                      )}

                      {/* Quick stats & expand */}
                      <div className="flex items-center gap-2">
                        {patientLabs.length > 0 && (
                          <Badge className="bg-amber-100 text-amber-800 text-xs">
                            <FlaskConical className="h-3 w-3 mr-1" />{patientLabs.length} Lab
                          </Badge>
                        )}
                        {patientRx.length > 0 && (
                          <Badge className="bg-purple-100 text-purple-800 text-xs">
                            <Pill className="h-3 w-3 mr-1" />{patientRx.length} Rx
                          </Badge>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => setExpandedPatient(expanded ? null : pid)}>
                          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expanded && (
                      <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Appointments */}
                        <div className="bg-blue-50 rounded-lg p-3">
                          <h4 className="font-medium text-blue-800 text-sm mb-2 flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" /> Today's Appointments
                          </h4>
                          {patientAppts.length > 0 ? patientAppts.map(a => (
                            <div key={a.appointment_id} className="text-xs bg-white p-2 rounded mb-1">
                              <p className="font-medium">{a.appointment_time} • Dr. {a.doctor_name}</p>
                              <p className="text-gray-500">{a.reason || a.department}</p>
                            </div>
                          )) : <p className="text-xs text-gray-500">No appointments today</p>}
                        </div>

                        {/* Prescriptions */}
                        <div className="bg-purple-50 rounded-lg p-3">
                          <h4 className="font-medium text-purple-800 text-sm mb-2 flex items-center gap-1">
                            <Pill className="h-3.5 w-3.5" /> Recent Prescriptions
                          </h4>
                          {patientRx.length > 0 ? patientRx.slice(0, 3).map(rx => (
                            <div key={rx.prescription_id} className="text-xs bg-white p-2 rounded mb-1">
                              <p className="font-medium">{rx.diagnosis}</p>
                              <p className="text-gray-500">Dr. {rx.doctor_name} • {rx.medicines?.length || 0} meds</p>
                            </div>
                          )) : <p className="text-xs text-gray-500">No recent prescriptions</p>}
                        </div>

                        {/* Lab Orders */}
                        <div className="bg-amber-50 rounded-lg p-3">
                          <h4 className="font-medium text-amber-800 text-sm mb-2 flex items-center gap-1">
                            <FlaskConical className="h-3.5 w-3.5" /> Lab Orders
                          </h4>
                          {patientLabs.length > 0 ? patientLabs.map(lo => (
                            <div key={lo.lab_order_id} className="text-xs bg-white p-2 rounded mb-1">
                              <p className="font-medium">{lo.test_name}</p>
                              <p className="text-gray-500">{lo.status.replace(/_/g, ' ')} • {lo.priority || 'Normal'}</p>
                            </div>
                          )) : <p className="text-xs text-gray-500">No pending lab orders</p>}
                        </div>

                        {/* Allergy / Chronic info */}
                        {(patient.allergies || patient.chronic_conditions) && (
                          <div className="md:col-span-3 bg-red-50 rounded-lg p-3 flex gap-6">
                            {patient.allergies && (
                              <div>
                                <h4 className="font-medium text-red-800 text-xs mb-1">⚠️ Allergies</h4>
                                <p className="text-xs text-red-700">{patient.allergies}</p>
                              </div>
                            )}
                            {patient.chronic_conditions && (
                              <div>
                                <h4 className="font-medium text-red-800 text-xs mb-1">🩺 Chronic Conditions</h4>
                                <p className="text-xs text-red-700">{patient.chronic_conditions}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
