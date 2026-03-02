import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    TrendingUp,
    Clock,
    PieChart,
    BarChart3,
    Calendar,
    Download,
    Loader2,
    RefreshCw,
    Activity,
    UserCheck,
    UserMinus,
    ArrowUpRight,
    ArrowDownRight,
    Sparkles,
    ShieldAlert,
    Layers,
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface ReportStats {
    currently_admitted: number;
    today_admissions: number;
    today_discharges: number;
    avg_los: number;
    total_beds: number;
    occupied_beds: number;
    occupancy_rate: number;
}

export default function AdmissionReports() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [period, setPeriod] = useState('weekly');
    const [data, setData] = useState<any>(null);

    const fetchReports = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        try {
            const token = localStorage.getItem('hms_staff_token');
            const res = await fetch(`${API_URL}/admission/reports?period=${period}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const reportsData = await res.json();
            if (res.ok) {
                setData(reportsData);
            }
        } catch (e) {
            console.error('Reports fetch error:', e);
            toast.error('Failed to load analytics data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [period]);

    useEffect(() => {
        fetchReports();
        const socketURL = 'http://localhost:5000';
        const socket = io(socketURL, {
            path: '/socket.io/',
            transports: ['websocket', 'polling']
        });
        socket.on('connect', () => console.log('AdmissionReports WebSocket connected'));
        const handleRemoteUpdate = (data: any) => {
            fetchReports(true);
        };
        socket.on('admission_added', handleRemoteUpdate);
        socket.on('admission_status_updated', handleRemoteUpdate);
        socket.on('admission:discharged', handleRemoteUpdate);
        return () => {
            socket.disconnect();
        };
    }, [fetchReports]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Compiling Analytics Matrix...</p>
                </div>
            </div>
        );
    }

    const stats: ReportStats = data?.stats || {
        currently_admitted: 0, today_admissions: 0, today_discharges: 0,
        avg_los: 0, total_beds: 0, occupied_beds: 0, occupancy_rate: 0
    };

    const maxAdmissions = Math.max(...(data?.daily_admissions?.map((d: any) => d.admissions) || [1]));

    return (
        <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 pb-32">
            <div className="max-w-[1600px] mx-auto space-y-10">
                {/* Premium Analytics Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                            <BarChart3 className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Intelligence & Analytics</h1>
                            <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-[0.2em] flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" /> Admission Command Intelligence
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Select value={period} onValueChange={setPeriod}>
                            <SelectTrigger className="h-14 w-40 rounded-2xl border-slate-200 bg-slate-50/50 font-black uppercase text-[10px] tracking-widest focus:bg-white">
                                <Calendar className="h-4 w-4 mr-2 text-indigo-500" />
                                <SelectValue placeholder="Period" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-slate-100">
                                <SelectItem value="daily" className="font-bold">Protocol Daily</SelectItem>
                                <SelectItem value="weekly" className="font-bold">Protocol Weekly</SelectItem>
                                <SelectItem value="monthly" className="font-bold">Protocol Monthly</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            className="h-14 w-14 rounded-2xl border-slate-200 bg-white text-slate-400 hover:text-slate-900 transition-all"
                            onClick={() => fetchReports(true)}
                            disabled={refreshing}
                        >
                            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button
                            className="h-14 px-8 rounded-2xl bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest text-[10px] shadow-xl shadow-slate-200 flex items-center gap-3"
                            onClick={() => toast.info('Export protocol started...')}
                        >
                            <Download className="h-4 w-4" /> Export Matrix
                        </Button>
                    </div>
                </div>

                {/* KPI Dashboard */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: 'Total Admissions', value: stats.today_admissions, icon: UserCheck, color: 'indigo', trend: '+12%', sub: 'vs last cycle' },
                        { label: 'Exit Protocol', value: stats.today_discharges, icon: UserMinus, color: 'orange', trend: 'Stable', sub: 'Discharged today' },
                        { label: 'Cycle Duration', value: `${stats.avg_los}d`, icon: Clock, color: 'purple', trend: 'Target: 4.5d', sub: 'Avg Length of Stay' },
                        { label: 'Unit Occupancy', value: `${stats.occupancy_rate}%`, icon: Activity, color: stats.occupancy_rate > 90 ? 'red' : 'emerald', trend: `${stats.occupied_beds}/${stats.total_beds} Units`, sub: 'Current utilization' },
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
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-${s.color}-50 text-${s.color}-600 shadow-sm`}>
                                            <s.icon className="h-7 w-7" />
                                        </div>
                                        <Badge className={`bg-${s.color}-50 text-${s.color}-600 border-0 text-[10px] font-black uppercase tracking-widest px-3 h-6 rounded-full`}>
                                            {s.trend}
                                        </Badge>
                                    </div>
                                    <div className="mt-8">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{s.label}</p>
                                        <p className="text-4xl font-black text-slate-900 tracking-tight mt-3">{s.value}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{s.sub}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {/* Core Analytics Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Visual Admission Trends */}
                    <Card className="lg:col-span-2 border-0 shadow-2xl shadow-slate-200/60 rounded-[3rem] overflow-hidden bg-white">
                        <CardHeader className="p-10 pb-0">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                    <Sparkles className="h-6 w-6 text-indigo-500" />
                                    Admission Velocity
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Trending</span>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-10">
                            <div className="h-72 flex items-end justify-between gap-4 pt-10">
                                {data?.daily_admissions?.slice(-7).map((d: any, i: number) => (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-4 group h-full justify-end">
                                        <div className="relative w-full flex justify-center items-end h-full">
                                            <motion.div
                                                initial={{ height: 0 }}
                                                animate={{ height: `${(d.admissions / maxAdmissions) * 100}%` }}
                                                transition={{ duration: 1, delay: i * 0.1, ease: "easeOut" }}
                                                className="w-full max-w-[40px] bg-gradient-to-t from-indigo-600 to-purple-500 rounded-2xl transition-all group-hover:from-indigo-700 group-hover:to-purple-600 relative shadow-lg shadow-indigo-100"
                                            >
                                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-black px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 whitespace-nowrap shadow-xl">
                                                    {d.admissions} ADM
                                                </div>
                                            </motion.div>
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            {new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Operational Breakdown */}
                    <Card className="border-0 shadow-2xl shadow-slate-200/60 rounded-[3rem] overflow-hidden bg-white">
                        <CardHeader className="p-10 pb-0">
                            <CardTitle className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                <PieChart className="h-6 w-6 text-purple-500" />
                                Protocol Mix
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-10 pt-8">
                            <div className="space-y-8">
                                {data?.payment_breakdown?.map((p: any, i: number) => (
                                    <div key={p.payment_type} className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${p.payment_type === 'Insurance' ? 'bg-indigo-500' : p.payment_type === 'Cash' ? 'bg-emerald-500' : 'bg-purple-500'}`} />
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{p.payment_type} Registry</span>
                                            </div>
                                            <span className="text-xs font-black text-slate-900">{p.count} Units</span>
                                        </div>
                                        <div className="h-2.5 bg-slate-50 rounded-full overflow-hidden shadow-inner">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(p.count / (data.stats.total_admitted || 1)) * 100}%` }}
                                                transition={{ duration: 1.5, delay: i * 0.2 }}
                                                className={`h-full rounded-full ${p.payment_type === 'Insurance' ? 'bg-indigo-500' : p.payment_type === 'Cash' ? 'bg-emerald-500' : 'bg-purple-500'} shadow-sm`}
                                            />
                                        </div>
                                    </div>
                                ))}
                                <div className="pt-8 mt-4 border-t border-slate-100">
                                    <div className="p-6 rounded-[2rem] bg-indigo-50/50 border border-indigo-100/50">
                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-3">Total Deposit Flow</p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-2xl font-black text-indigo-600">₹{(data?.revenue?.total_advance || 0).toLocaleString()}</span>
                                            <span className="text-[10px] font-bold text-indigo-400 uppercase">INR</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Section Analysis Board */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Sector Performance */}
                    <Card className="border-0 shadow-2xl shadow-slate-200/60 rounded-[3rem] overflow-hidden bg-white">
                        <CardHeader className="p-10 pb-6 border-b border-slate-50">
                            <CardTitle className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                <Layers className="h-6 w-6 text-emerald-500" />
                                Sector Analysis (LOS)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50/50">
                                        <tr>
                                            <th className="text-left py-6 px-10 font-black text-slate-400 uppercase text-[10px] tracking-widest">Sector</th>
                                            <th className="text-center py-6 px-4 font-black text-slate-400 uppercase text-[10px] tracking-widest">Load</th>
                                            <th className="text-right py-6 px-10 font-black text-slate-400 uppercase text-[10px] tracking-widest">Avg Cycle</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data?.los_by_department?.map((d: any) => (
                                            <tr key={d.department} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                                                <td className="py-6 px-10 font-bold text-slate-900">{d.department}</td>
                                                <td className="py-6 px-4 text-center font-bold text-slate-600">{d.total_admissions} ADM</td>
                                                <td className="py-6 px-10 text-right">
                                                    <Badge className={`bg-${d.avg_los > 7 ? 'red' : 'indigo'}-50 text-${d.avg_los > 7 ? 'red' : 'indigo'}-600 border-0 px-4 h-8 text-[10px] font-black uppercase tracking-widest rounded-full`}>
                                                        {d.avg_los} Days
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Temporal Logistics Heatmap */}
                    <Card className="border-0 shadow-2xl shadow-slate-200/60 rounded-[3rem] overflow-hidden bg-white">
                        <CardHeader className="p-10 pb-6">
                            <CardTitle className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                <Clock className="h-6 w-6 text-indigo-500" />
                                Logistics Pulse
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-10 pt-4">
                            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                                {Array.from({ length: 24 }).map((_, hour) => {
                                    const hourData = data?.peak_hours?.find((ph: any) => ph.hour === hour);
                                    const count = hourData ? hourData.count : 0;
                                    const maxCount = Math.max(...(data?.peak_hours?.map((ph: any) => ph.count) || [1]));
                                    const opacity = count > 0 ? 0.1 + (count / maxCount) * 0.9 : 0.05;

                                    return (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.5 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: hour * 0.02 }}
                                            key={hour}
                                            className="aspect-square rounded-xl relative group cursor-help transition-all hover:ring-4 hover:ring-indigo-100"
                                            style={{ backgroundColor: `rgba(79, 70, 229, ${opacity})` }}
                                        >
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="text-[9px] text-slate-900 font-black">{hour}h</span>
                                            </div>
                                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-black px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-xl">
                                                {count} ARRIVALS
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                            <div className="flex justify-between items-center mt-8 text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-100" /> Quiet</span>
                                <span className="flex items-center gap-2">Peak Hours <div className="w-2 h-2 rounded-full bg-indigo-600" /></span>
                            </div>
                            <div className="mt-10 p-6 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-start gap-4">
                                <ShieldAlert className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                                <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase tracking-wide">
                                    Operational Notice: Temporal density increases during mid-shift cycles. Align staffing protocols to pulse density.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
