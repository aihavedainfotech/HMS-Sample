import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { io } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
    AlertTriangle,
    Clock,
    Bed,
    Users,
    Loader2,
    RefreshCw,
    Siren,
    HeartPulse,
    ArrowRight,
    Shield,
    Phone,
    CheckCircle2,
    XCircle,
    Timer,
    Activity,
    ShieldAlert,
    ShieldCheck,
    ShieldCheck as ShieldCheckIcon,
    User,
    Eye,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface EmergencyPatient {
    admission_id: string;
    patient_id: string;
    patient_name: string;
    patient_phone?: string;
    doctor_name: string;
    department_name?: string;
    admission_date: string;
    admission_reason: string;
    provisional_diagnosis?: string;
    bed_type?: string;
    ward_name?: string;
    room_number?: string;
    gender?: string;
    blood_group?: string;
    known_allergies?: string;
    advance_payment?: number;
    wait_minutes: number;
    triage_level: 'Critical' | 'Serious' | 'Stable';
    bill_paid: boolean;
    has_bed: boolean;
}

export default function EmergencyAdmission() {
    const [loading, setLoading] = useState(true);
    const [patients, setPatients] = useState<EmergencyPatient[]>([]);
    const [stats, setStats] = useState({
        total_emergency: 0, today_emergency: 0, critical_count: 0,
        icu_beds_available: 0, total_beds_available: 0,
    });
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        try {
            const token = localStorage.getItem('hms_staff_token');
            const res = await fetch(`${API_URL}/admission/emergency`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok) {
                setPatients(data.patients || []);
                setStats(data.stats || stats);
            }
        } catch (e) {
            console.error('Emergency data error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();

        const socketURL = 'http://localhost:5000';
        const socket = io(socketURL, {
            path: '/socket.io/',
            transports: ['websocket', 'polling']
        });

        socket.on('connect', () => console.log('EmergencyAdmission WebSocket connected'));

        const handleRemoteUpdate = (data: any) => {
            console.log('Real-time emergency update received:', data);
            fetchData(true);
        };

        socket.on('emergency_admission_added', handleRemoteUpdate);
        socket.on('admission_status_updated', handleRemoteUpdate);
        socket.on('bed_status_changed', handleRemoteUpdate);

        return () => {
            socket.disconnect();
        };
    }, [fetchData]);

    const getTriageBadge = (level: string) => {
        const config: Record<string, { color: string; bg: string }> = {
            Critical: { color: 'text-red-700 border-red-300', bg: 'bg-red-100' },
            Serious: { color: 'text-orange-700 border-orange-300', bg: 'bg-orange-100' },
            Stable: { color: 'text-green-700 border-green-300', bg: 'bg-green-100' },
        };
        const c = config[level] || config.Stable;
        return <Badge variant="outline" className={`${c.color} ${c.bg} font-semibold text-xs`}>{level}</Badge>;
    };

    const formatWaitTime = (mins: number) => {
        if (mins > 1440) return `${Math.floor(mins / 1440)}d ${Math.floor((mins % 1440) / 60)}h`;
        if (mins > 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
        return `${mins}m`;
    };

    const handleICUEscalation = (patient: EmergencyPatient) => {
        toast.success(`ICU escalation request sent for ${patient.patient_name}`);
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 pb-32">
            <div className="max-w-[1500px] mx-auto space-y-10">
                {/* Mission Control Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl border border-slate-800 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-red-600/10 to-transparent pointer-events-none" />
                    <div className="flex items-center gap-6 relative z-10">
                        <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-rose-700 rounded-2xl flex items-center justify-center shadow-lg shadow-red-900/20 shrink-0">
                            <Siren className="h-8 w-8 text-white animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-black text-white tracking-tight">Emergency Mission Control</h1>
                                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 px-3 py-1 text-xs font-bold uppercase tracking-wider">High Priority</Badge>
                            </div>
                            <p className="text-slate-400 font-medium mt-1 uppercase text-[10px] tracking-[0.2em] flex items-center gap-2">
                                <Activity className="h-3 w-3 text-red-500" /> Global Protocol P1 — Real-time Triage Analytics
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 relative z-10">
                        <div className="px-6 py-3 bg-slate-800/50 rounded-2xl border border-slate-700 backdrop-blur-md hidden sm:block">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">System Health</p>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-sm font-bold text-slate-300">Fast-Track Active</span>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            className="h-14 w-14 rounded-2xl border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all shadow-xl"
                            onClick={() => fetchData(true)}
                            disabled={refreshing}
                        >
                            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>

                {/* Critical Patient Ticker */}
                <AnimatePresence>
                    {stats.critical_count > 0 && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="bg-gradient-to-r from-red-600 to-rose-700 p-6 rounded-[2rem] shadow-xl flex items-center gap-6 relative group">
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md shrink-0">
                                    <ShieldAlert className="h-6 w-6 text-white" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                                        CRITICAL CAPACITY ALERT
                                        <span className="text-xs bg-white/20 px-2 py-0.5 rounded uppercase">{stats.critical_count} ACTIVE CASES</span>
                                    </h3>
                                    <p className="text-red-100 font-medium text-sm mt-1">Resource load exceeds 85%. Available ICU Units: <span className="font-black text-white">{stats.icu_beds_available}</span>. Immediate triage escalation mandated.</p>
                                </div>
                                <div className="hidden md:flex gap-2">
                                    <div className="w-2 h-8 bg-white/10 rounded-full overflow-hidden">
                                        <motion.div
                                            animate={{ height: ['0%', '100%'] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                            className="w-full bg-white"
                                        />
                                    </div>
                                    <div className="w-2 h-8 bg-white/10 rounded-full overflow-hidden">
                                        <motion.div
                                            animate={{ height: ['0%', '100%'] }}
                                            transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                                            className="w-full bg-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Premium Stat Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    {[
                        { label: "Active Emergency", value: stats.total_emergency, icon: Siren, color: "red", sub: "Live queue" },
                        { label: "Today's Volume", value: stats.today_emergency, icon: Activity, color: "orange", sub: "24h window" },
                        { label: "Critical Load", value: stats.critical_count, icon: HeartPulse, color: "rose", sub: "Priority P1", pulse: stats.critical_count > 0 },
                        { label: "ICU Available", value: stats.icu_beds_available, icon: Bed, color: "blue", sub: "Critical care" },
                        { label: "Floor Vacancy", value: stats.total_beds_available, icon: ShieldCheck, color: "emerald", sub: "Ready for transition" },
                    ].map((s, i) => (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            key={i}
                        >
                            <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden group hover:-translate-y-1 transition-all duration-300 bg-white">
                                <CardContent className="p-8">
                                    <div className={`w-14 h-14 rounded-2xl mb-6 flex items-center justify-center bg-${s.color}-50 text-${s.color}-600 group-hover:scale-110 transition-transform ${s.pulse ? 'animate-pulse' : ''}`}>
                                        <s.icon className="h-7 w-7" />
                                    </div>
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{s.label}</h3>
                                    <p className="text-4xl font-black text-slate-900 tracking-tight mt-3">{s.value}</p>
                                    <p className="text-slate-400 text-xs font-bold mt-2 flex items-center gap-1.5 uppercase tracking-wide">
                                        {s.sub}
                                    </p>
                                </CardContent>
                                <div className={`h-1.5 w-full bg-${s.color}-500/10`}>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: '100%' }}
                                        transition={{ duration: 1, delay: i * 0.2 }}
                                        className={`h-full bg-${s.color}-500`}
                                    />
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {/* Emergency Patient Queue */}
                <div className="space-y-8">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-4">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Live Triage Board</h2>
                            <Badge className="bg-slate-900 text-white rounded-full px-4 h-7 text-xs font-bold font-mono">
                                {patients.length} ACTIVE
                            </Badge>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex -space-x-3">
                                {[1, 2, 3].map((_, i) => (
                                    <div key={i} className="w-10 h-10 rounded-full border-4 border-[#f8fafc] bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                        S{i + 1}
                                    </div>
                                ))}
                            </div>
                            <span className="text-xs text-slate-400 font-bold ml-2">Surge Protocol Ready</span>
                        </div>
                    </div>

                    {patients.length === 0 ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <Card className="rounded-[3rem] p-24 text-center border-4 border-dashed border-slate-100 bg-white/50">
                                <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8">
                                    <ShieldCheck className="h-12 w-12 text-emerald-300" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Facility Secured</h3>
                                <p className="text-slate-500 font-medium">No active emergency protocols currently executing</p>
                            </Card>
                        </motion.div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            {patients.map((pt, idx) => (
                                <motion.div
                                    key={pt.admission_id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                >
                                    <Card className={`group border-0 shadow-lg shadow-slate-200/40 rounded-[3rem] overflow-hidden hover:shadow-2xl hover:shadow-red-200/20 transition-all duration-500 ${pt.triage_level === 'Critical' ? 'bg-red-50/50' : 'bg-white'}`}>
                                        <CardContent className="p-0">
                                            <div className="flex flex-col lg:flex-row items-stretch min-h-[220px]">
                                                {/* Triage Side Strip */}
                                                <div className={`w-full lg:w-4 shrink-0 flex flex-col justify-center items-center gap-4 ${pt.triage_level === 'Critical' ? 'bg-gradient-to-b from-red-600 to-rose-700' :
                                                    pt.triage_level === 'Serious' ? 'bg-gradient-to-b from-orange-400 to-amber-600' :
                                                        'bg-gradient-to-b from-emerald-400 to-blue-500'
                                                    }`}>
                                                    <div className="hidden lg:block w-1.5 h-1/4 bg-white/30 rounded-full animate-pulse" />
                                                </div>

                                                <div className="flex-1 p-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                                                    {/* Patient Unit Info */}
                                                    <div className="lg:col-span-4 flex items-center gap-8">
                                                        <div className={`w-24 h-24 rounded-[2rem] shrink-0 flex items-center justify-center text-3xl font-black text-white shadow-2xl ${pt.triage_level === 'Critical' ? 'bg-gradient-to-br from-red-500 to-rose-600 animate-pulse' :
                                                            pt.triage_level === 'Serious' ? 'bg-gradient-to-br from-orange-500 to-amber-600' :
                                                                'bg-gradient-to-br from-emerald-500 to-blue-600'
                                                            }`}>
                                                            {pt.patient_name?.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                                <h3 className="text-2xl font-black text-slate-900 tracking-tight group-hover:text-red-600 transition-colors">{pt.patient_name}</h3>
                                                                {getTriageBadge(pt.triage_level)}
                                                            </div>
                                                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{pt.admission_id}</p>
                                                            <div className="flex items-center gap-4">
                                                                {pt.blood_group && (
                                                                    <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1 rounded-full text-[10px] font-black">
                                                                        <div className="w-2 h-2 rounded-full bg-red-500" /> {pt.blood_group}
                                                                    </div>
                                                                )}
                                                                {pt.known_allergies && (
                                                                    <Badge className="bg-red-50 text-red-600 border-red-100 uppercase text-[9px] font-black flex items-center gap-1">
                                                                        <AlertTriangle className="h-3 w-3" /> Allergy Alert
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Medical Context */}
                                                    <div className="lg:col-span-4 lg:border-x border-slate-100 lg:px-10 py-4 lg:py-0 space-y-6">
                                                        <div className="space-y-4">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Medical Directive</p>
                                                            <p className="text-lg font-bold text-slate-700 leading-snug line-clamp-2">
                                                                {pt.admission_reason || pt.provisional_diagnosis || 'Emergency Stabilization Required'}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-8">
                                                            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                                                                <Timer className={`h-4 w-4 ${pt.wait_minutes > 60 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`} />
                                                                <span className={`text-sm font-black ${pt.wait_minutes > 60 ? 'text-red-600' : 'text-slate-900'}`}>{formatWaitTime(pt.wait_minutes)}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                                                                <Bed className="h-4 w-4 text-slate-400" />
                                                                <span className="text-xs font-black text-slate-700 uppercase tracking-tighter">
                                                                    {pt.has_bed ? pt.room_number : 'Awaiting Bed'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Direct Action Terminal */}
                                                    <div className="lg:col-span-4 flex flex-col justify-center gap-4">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                                    <User className="h-4 w-4" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Command</p>
                                                                    <p className="text-xs font-bold text-slate-600 mt-1">Dr. {pt.doctor_name}</p>
                                                                </div>
                                                            </div>
                                                            <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${pt.bill_paid ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                                {pt.bill_paid ? 'Secured' : 'Billing Hold'}
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3">
                                                            <Button
                                                                className="h-14 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-xs uppercase shadow-xl active:scale-95 transition-all"
                                                                onClick={() => handleICUEscalation(pt)}
                                                            >
                                                                ICU Escalation
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                className="h-14 rounded-2xl border-slate-200 text-slate-600 hover:bg-slate-50 font-black text-xs uppercase active:scale-95 transition-all flex items-center gap-2"
                                                            >
                                                                {pt.patient_phone ? <Phone className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                                {pt.patient_phone ? 'Contact' : 'Details'}
                                                            </Button>
                                                        </div>
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
            </div>
        </div>
    );
}
