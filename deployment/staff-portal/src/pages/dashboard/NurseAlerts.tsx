import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Bell, Loader2, Pill, FlaskConical, Clock, AlertCircle,
    HeartPulse, Calendar, AlertTriangle, User, CheckCircle2,
    Package, LogOut, UserPlus, ClipboardCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import socket from '@/lib/socket';

const API = import.meta.env.VITE_API_URL || '/api';

interface Alert {
    id: string;
    type: 'medication' | 'lab' | 'vital' | 'appointment' | 'general' | 'dispensed' | 'lab_report' | 'admitted' | 'discharged';
    priority: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    description: string;
    patientName: string;
    patientId: string;
    timestamp: string;
    read: boolean;
}

export default function NurseAlerts() {
    const [loading, setLoading] = useState(true);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [activeTab, setActiveTab] = useState<string>('all');

    const fetchData = useCallback(async () => {
        try {
            const token = localStorage.getItem('hms_staff_token');
            const res = await fetch(`${API}/nurse/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();

            const generated: Alert[] = [];
            const now = new Date();

            // 1. Pending lab orders
            (data.lab_orders || []).filter((lo: any) => lo.status === 'Pending').forEach((lo: any) => {
                generated.push({
                    id: `lab-${lo.lab_order_id}`,
                    type: 'lab',
                    priority: lo.priority === 'STAT' ? 'critical' : lo.priority === 'Urgent' ? 'high' : 'medium',
                    title: `Lab Sample Pending: ${lo.test_name}`,
                    description: `Sample collection needed. Ordered by Dr. ${lo.doctor_name}`,
                    patientName: lo.patient_name,
                    patientId: lo.patient_id,
                    timestamp: lo.order_date,
                    read: false,
                });
            });

            // 2. Active prescriptions
            (data.prescriptions || []).filter((rx: any) => rx.status === 'Active').forEach((rx: any) => {
                generated.push({
                    id: `med-${rx.prescription_id}`,
                    type: 'medication',
                    priority: 'medium',
                    title: `Active Medication: ${rx.diagnosis || 'Prescription'}`,
                    description: `${rx.medicines?.length || 0} medications prescribed by Dr. ${rx.doctor_name}`,
                    patientName: rx.patient_name,
                    patientId: rx.patient_id,
                    timestamp: rx.prescription_date,
                    read: false,
                });
            });

            // 3. Upcoming appointments in next 30 mins
            (data.today_appointments || []).forEach((appt: any) => {
                const apptTime = new Date(`${appt.appointment_date}T${appt.appointment_time}`);
                const diff = (apptTime.getTime() - now.getTime()) / (1000 * 60);
                if (diff > 0 && diff <= 30) {
                    generated.push({
                        id: `appt-${appt.appointment_id}`,
                        type: 'appointment',
                        priority: 'high',
                        title: `Appointment in ${Math.round(diff)} min`,
                        description: `With Dr. ${appt.doctor_name} at ${appt.appointment_time}`,
                        patientName: appt.patient_name,
                        patientId: appt.patient_id,
                        timestamp: `${appt.appointment_date}T${appt.appointment_time}`,
                        read: false,
                    });
                }
            });

            // 4. Critical vitals
            Object.entries(data.latest_vitals || {}).forEach(([patientId, v]: [string, any]) => {
                const issues: string[] = [];
                if (v.blood_pressure_systolic > 180) issues.push(`BP: ${v.blood_pressure_systolic}/${v.blood_pressure_diastolic}`);
                if (v.temperature > 103) issues.push(`Temp: ${v.temperature}°F`);
                if (v.spo2 < 90) issues.push(`SpO2: ${v.spo2}%`);
                if (v.pulse_rate > 120) issues.push(`HR: ${v.pulse_rate}`);
                if (issues.length > 0) {
                    const patient = (data.patients || []).find((p: any) => p.patient_id === patientId);
                    generated.push({
                        id: `vital-${patientId}`,
                        type: 'vital',
                        priority: 'critical',
                        title: `Critical Vitals Alert`,
                        description: `${issues.join(', ')}`,
                        patientName: patient ? `${patient.first_name} ${patient.last_name}` : patientId,
                        patientId: patientId,
                        timestamp: v.recorded_at || now.toISOString(),
                        read: false,
                    });
                }
            });

            // 5. Prescriptions Dispensed (last 24h)
            (data.recent_dispensed || []).forEach((rx: any) => {
                generated.push({
                    id: `dispensed-${rx.prescription_id}`,
                    type: 'dispensed',
                    priority: 'low',
                    title: `Prescription Dispensed`,
                    description: `${rx.diagnosis || 'Prescription'} dispensed by pharmacy. Confirm receipt by Dr. ${rx.doctor_name}`,
                    patientName: rx.patient_name,
                    patientId: rx.patient_id,
                    timestamp: rx.dispensed_at,
                    read: false,
                });
            });

            // 6. Lab Reports Ready (last 24h)
            (data.recent_lab_reports || []).forEach((lo: any) => {
                generated.push({
                    id: `lab-report-${lo.lab_order_id}`,
                    type: 'lab_report',
                    priority: lo.priority === 'STAT' ? 'high' : 'medium',
                    title: `Lab Report Ready: ${lo.test_name}`,
                    description: `${lo.status === 'Verified' ? '✓ Verified' : 'Results entered'} — notify attending physician Dr. ${lo.doctor_name}`,
                    patientName: lo.patient_name,
                    patientId: lo.patient_id,
                    timestamp: lo.verification_date,
                    read: false,
                });
            });

            // 7. New Admissions (last 24h)
            (data.recent_admissions || []).forEach((a: any) => {
                generated.push({
                    id: `admitted-${a.admission_id}`,
                    type: 'admitted',
                    priority: 'medium',
                    title: `New Patient Admitted`,
                    description: `${a.provisional_diagnosis || 'Assessment pending'} — ${a.department_name || 'Ward'} | Dr. ${a.doctor_name}`,
                    patientName: a.patient_name,
                    patientId: a.patient_id,
                    timestamp: a.admission_date,
                    read: false,
                });
            });

            // 8. Patient Discharges (last 24h)
            (data.recent_discharges || []).forEach((a: any) => {
                generated.push({
                    id: `discharged-${a.admission_id}`,
                    type: 'discharged',
                    priority: 'low',
                    title: `Patient Discharged`,
                    description: `${a.final_diagnosis || 'Discharge complete'}${a.discharge_type ? ` — ${a.discharge_type}` : ''}`,
                    patientName: a.patient_name,
                    patientId: a.patient_id,
                    timestamp: a.actual_discharge_date,
                    read: false,
                });
            });

            const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            generated.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
            setAlerts(generated);
        } catch { toast.error('Failed to load alerts'); } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        const handleRefresh = () => fetchData();
        const events = [
            'lab_order_created', 'lab_order_updated', 'lab_result_verified',
            'prescription_created', 'prescription_updated', 'prescription_dispensed',
            'new_appointment', 'vitals_recorded', 'bed_status_updated',
            'admission_status_updated', 'admission:discharged', 'new_admission'
        ];
        events.forEach(ev => socket.on(ev, handleRefresh));
        return () => { events.forEach(ev => socket.off(ev, handleRefresh)); };
    }, [fetchData]);

    const getAlertConfig = (type: string) => {
        switch (type) {
            case 'medication': return { icon: <Pill className="h-5 w-5" />, color: 'text-purple-600', bg: 'bg-purple-50' };
            case 'lab': return { icon: <FlaskConical className="h-5 w-5" />, color: 'text-amber-600', bg: 'bg-amber-50' };
            case 'vital': return { icon: <HeartPulse className="h-5 w-5" />, color: 'text-red-600', bg: 'bg-red-50' };
            case 'appointment': return { icon: <Calendar className="h-5 w-5" />, color: 'text-blue-600', bg: 'bg-blue-50' };
            case 'dispensed': return { icon: <Package className="h-5 w-5" />, color: 'text-green-600', bg: 'bg-green-50' };
            case 'lab_report': return { icon: <ClipboardCheck className="h-5 w-5" />, color: 'text-teal-600', bg: 'bg-teal-50' };
            case 'admitted': return { icon: <UserPlus className="h-5 w-5" />, color: 'text-indigo-600', bg: 'bg-indigo-50' };
            case 'discharged': return { icon: <LogOut className="h-5 w-5" />, color: 'text-slate-600', bg: 'bg-slate-50' };
            default: return { icon: <Bell className="h-5 w-5" />, color: 'text-gray-600', bg: 'bg-gray-50' };
        }
    };

    const getPriorityConfig = (priority: string) => {
        switch (priority) {
            case 'critical': return { color: 'bg-red-100 text-red-800', border: 'border-l-red-500', dot: '🔴' };
            case 'high': return { color: 'bg-orange-100 text-orange-800', border: 'border-l-orange-400', dot: '🟠' };
            case 'medium': return { color: 'bg-amber-100 text-amber-800', border: 'border-l-amber-400', dot: '🟡' };
            default: return { color: 'bg-green-100 text-green-800', border: 'border-l-green-400', dot: '🟢' };
        }
    };

    const criticalCount = alerts.filter(a => a.priority === 'critical').length;
    const highCount = alerts.filter(a => a.priority === 'high').length;
    const mediumCount = alerts.filter(a => a.priority === 'medium').length;

    const filteredAlerts = useMemo(() => {
        if (activeTab === 'all') return alerts;
        return alerts.filter(a => a.priority === activeTab);
    }, [alerts, activeTab]);

    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-red-600" /></div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="h-7 w-7 text-red-600" /> Alerts & Notifications</h1>
                <p className="text-gray-500 text-sm">Real-time alerts for urgent nursing actions — updates automatically</p>
            </div>

            {/* Alert Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Total Alerts', value: alerts.length, color: 'from-slate-600 to-slate-700', icon: <Bell className="h-5 w-5" /> },
                    { label: 'Critical', value: criticalCount, color: 'from-red-500 to-red-600', icon: <AlertTriangle className="h-5 w-5" /> },
                    { label: 'High Priority', value: highCount, color: 'from-orange-500 to-orange-600', icon: <AlertCircle className="h-5 w-5" /> },
                    { label: 'Medium', value: mediumCount, color: 'from-amber-500 to-amber-600', icon: <Clock className="h-5 w-5" /> },
                ].map((s, i) => (
                    <Card key={i} className="overflow-hidden">
                        <CardContent className="p-0">
                            <div className={`bg-gradient-to-r ${s.color} p-4 flex items-center gap-3`}>
                                <div className="text-white/90">{s.icon}</div>
                                <div><p className="text-2xl font-bold text-white">{s.value}</p><p className="text-xs text-white/80">{s.label}</p></div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Tabbed Alert List */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-slate-100/80 p-1 rounded-xl justify-start mb-6 flex-wrap h-auto gap-1">
                    <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-white shadow-none px-4">
                        <span className="flex items-center gap-2">All <Badge className="bg-slate-200 text-slate-700">{alerts.length}</Badge></span>
                    </TabsTrigger>
                    <TabsTrigger value="critical" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-red-700 shadow-none px-4">
                        <span className="flex items-center gap-2">Critical <Badge className="bg-red-100 text-red-700">{criticalCount}</Badge></span>
                    </TabsTrigger>
                    <TabsTrigger value="high" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-orange-700 shadow-none px-4">
                        <span className="flex items-center gap-2">High <Badge className="bg-orange-100 text-orange-700">{highCount}</Badge></span>
                    </TabsTrigger>
                    <TabsTrigger value="medium" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-amber-700 shadow-none px-4">
                        <span className="flex items-center gap-2">Medium <Badge className="bg-amber-100 text-amber-700">{mediumCount}</Badge></span>
                    </TabsTrigger>
                </TabsList>

                {filteredAlerts.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <CheckCircle2 className="mx-auto h-14 w-14 text-green-300 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-700">All Clear!</h3>
                            <p className="text-gray-500 text-sm">No {activeTab !== 'all' ? activeTab : ''} alerts at the moment.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <AnimatePresence mode="popLayout">
                        <div className="space-y-3">
                            {filteredAlerts.map(alert => {
                                const ac = getAlertConfig(alert.type);
                                const pc = getPriorityConfig(alert.priority);
                                return (
                                    <motion.div
                                        key={alert.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.18 }}
                                        layout
                                    >
                                        <Card className={`border-l-[6px] ${pc.border} hover:shadow-md transition-shadow bg-white rounded-xl border-y border-r border-slate-100`}>
                                            <CardContent className="p-5">
                                                <div className="flex items-start gap-4">
                                                    <div className={`w-11 h-11 rounded-xl ${ac.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                                                        <span className={ac.color}>{ac.icon}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                                            <span className="font-bold text-slate-800 text-base">{alert.title}</span>
                                                            <Badge className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${pc.color} border-0`}>
                                                                {pc.dot} {alert.priority}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-sm text-slate-500 mb-2 leading-relaxed">{alert.description}</p>
                                                        <div className="flex flex-wrap items-center gap-3">
                                                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                                                                <User className="h-3.5 w-3.5 text-indigo-500" />
                                                                {alert.patientName}
                                                                <span className="opacity-50 font-normal">#{alert.patientId}</span>
                                                            </span>
                                                            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                                                                <Clock className="h-3.5 w-3.5" />
                                                                {new Date(alert.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </AnimatePresence>
                )}
            </Tabs>
        </div>
    );
}
