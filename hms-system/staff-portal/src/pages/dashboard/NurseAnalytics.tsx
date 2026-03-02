import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Loader2, BedDouble, Users, FlaskConical, Pill, TrendingUp, TrendingDown,
    Activity, AlertTriangle, UserPlus, LogOut, ClipboardCheck, Package, Clock, RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import socket from '@/lib/socket';

const API = import.meta.env.VITE_API_URL || '/api';

interface AnalyticsData {
    stats: {
        total_admitted: number;
        occupied_beds: number;
        total_beds: number;
        available_beds: number;
        pending_labs: number;
        active_prescriptions: number;
        today_admissions: number;
        today_discharges: number;
        today_lab_reports: number;
        today_dispensed: number;
        urgent_labs: number;
        bed_occupancy_pct: number;
    };
    ward_utilization: Array<{ dept_name: string; total: number; occupied: number; vacant: number }>;
    admit_trend: Array<{ date: string; count: number }>;
    discharge_trend: Array<{ date: string; count: number }>;
    lab_trend: Array<{ date: string; count: number }>;
    recent_activity: Array<{
        event_type: string;
        event_time: string;
        patient_name: string;
        detail: string;
    }>;
}

const eventConfig: Record<string, { label: string; color: string; bg: string; borderColor: string; icon: any }> = {
    admission: { label: 'Admitted', color: 'text-indigo-700', bg: 'bg-indigo-50', borderColor: 'border-l-indigo-400', icon: UserPlus },
    discharge: { label: 'Discharged', color: 'text-slate-600', bg: 'bg-slate-50', borderColor: 'border-l-slate-400', icon: LogOut },
    lab_report: { label: 'Lab Report', color: 'text-teal-700', bg: 'bg-teal-50', borderColor: 'border-l-teal-400', icon: ClipboardCheck },
    dispensed: { label: 'Dispensed', color: 'text-green-700', bg: 'bg-green-50', borderColor: 'border-l-green-400', icon: Package },
};

/* Compact mini bar chart using canvas-free SVG sparkline */
function MiniBarChart({ data, color }: { data: Array<{ date: string; count: number }>; color: string }) {
    const max = Math.max(...data.map(d => d.count), 1);
    return (
        <div className="flex items-end gap-1 h-10">
            {data.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                    <div
                        className={`w-full rounded-t-sm ${color}`}
                        style={{ height: `${(d.count / max) * 36}px`, minHeight: d.count ? 3 : 0 }}
                        title={`${d.date}: ${d.count}`}
                    />
                </div>
            ))}
        </div>
    );
}

export default function NurseAnalytics() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    const fetchData = useCallback(async () => {
        try {
            const token = localStorage.getItem('hms_staff_token');
            const res = await fetch(`${API}/nurse/analytics`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.status === 401 || res.status === 403) {
                // Stale token — clear it and redirect to login
                localStorage.removeItem('hms_staff_token');
                localStorage.removeItem('hms_staff_user');
                toast.error('Session expired — please log in again');
                setTimeout(() => { window.location.href = '/login'; }, 1500);
                return;
            }
            if (!res.ok) throw new Error(`${res.status}`);
            const json = await res.json();
            setData(json);
            setLastUpdated(new Date());
        } catch (e: any) {
            toast.error('Failed to load analytics');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        const events = [
            'admission_status_updated', 'admission:discharged', 'new_admission',
            'lab_order_created', 'lab_order_updated', 'lab_result_verified',
            'prescription_created', 'prescription_updated', 'bed_status_updated',
        ];
        events.forEach(ev => socket.on(ev, fetchData));
        return () => { events.forEach(ev => socket.off(ev, fetchData)); };
    }, [fetchData]);

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
    );

    if (!data) return null;

    const { stats, ward_utilization, admit_trend, discharge_trend, lab_trend, recent_activity } = data;

    const kpiCards = [
        { label: 'Admitted Patients', value: stats.total_admitted, sub: `${stats.today_admissions} today`, color: 'from-indigo-500 to-indigo-600', icon: Users, trend: stats.today_admissions },
        { label: 'Bed Occupancy', value: `${stats.bed_occupancy_pct}%`, sub: `${stats.occupied_beds}/${stats.total_beds} beds`, color: 'from-blue-500 to-blue-600', icon: BedDouble, trend: null },
        { label: 'Pending Lab Orders', value: stats.pending_labs, sub: `${stats.urgent_labs} urgent/STAT`, color: stats.urgent_labs > 0 ? 'from-red-500 to-red-600' : 'from-amber-500 to-amber-600', icon: FlaskConical, trend: null },
        { label: 'Active Prescriptions', value: stats.active_prescriptions, sub: `${stats.today_dispensed} dispensed today`, color: 'from-purple-500 to-purple-600', icon: Pill, trend: null },
        { label: "Today's Admissions", value: stats.today_admissions, sub: `vs yesterday`, color: 'from-emerald-500 to-emerald-600', icon: UserPlus, trend: stats.today_admissions },
        { label: "Today's Discharges", value: stats.today_discharges, sub: 'beds freed', color: 'from-slate-500 to-slate-600', icon: LogOut, trend: null },
        { label: 'Lab Reports Ready', value: stats.today_lab_reports, sub: 'reports today', color: 'from-teal-500 to-teal-600', icon: ClipboardCheck, trend: stats.today_lab_reports },
        { label: 'Available Beds', value: stats.available_beds, sub: `${stats.total_beds} total`, color: 'from-sky-500 to-sky-600', icon: Activity, trend: null },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <TrendingUp className="h-7 w-7 text-indigo-600" /> Nurse Analytics Dashboard
                    </h1>
                    <p className="text-gray-500 text-sm">Real-time operational overview — updates live</p>
                </div>
                <button
                    onClick={fetchData}
                    className="inline-flex items-center gap-2 text-xs text-slate-500 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors self-start sm:self-auto"
                >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Refresh · {lastUpdated.toLocaleTimeString([], { timeStyle: 'short' })}
                </button>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {kpiCards.map((kpi, i) => (
                    <motion.div
                        key={kpi.label}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                    >
                        <Card className="overflow-hidden hover:shadow-md transition-shadow">
                            <CardContent className="p-0">
                                <div className={`bg-gradient-to-br ${kpi.color} p-4 text-white`}>
                                    <div className="flex items-start justify-between mb-2">
                                        <kpi.icon className="h-5 w-5 text-white/80" />
                                        {kpi.trend != null && (
                                            <span className="text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                                {kpi.trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                                {kpi.trend}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-3xl font-extrabold">{kpi.value}</p>
                                    <p className="text-xs text-white/80 mt-0.5">{kpi.label}</p>
                                    <p className="text-[10px] text-white/60 mt-1">{kpi.sub}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Trend Charts + Ward Utilization */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Trend charts */}
                <Card className="lg:col-span-2">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                            <Activity className="h-4 w-4 text-indigo-500" /> 7-Day Activity Trends
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {[
                            { label: 'Admissions', data: admit_trend, color: 'bg-indigo-400' },
                            { label: 'Discharges', data: discharge_trend, color: 'bg-slate-400' },
                            { label: 'Lab Orders', data: lab_trend, color: 'bg-teal-400' },
                        ].map(({ label, data: tData, color }) => (
                            <div key={label}>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-semibold text-slate-600">{label}</span>
                                    <span className="text-xs text-slate-400">
                                        {tData.reduce((acc, d) => acc + d.count, 0)} total
                                    </span>
                                </div>
                                <MiniBarChart data={tData} color={color} />
                                <div className="flex justify-between mt-1">
                                    {tData.map((d, i) => (
                                        <span key={i} className="flex-1 text-center text-[9px] text-slate-400">
                                            {new Date(d.date).toLocaleDateString('en', { weekday: 'short' })}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Ward Utilization */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                            <BedDouble className="h-4 w-4 text-blue-500" /> Ward Utilization
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {ward_utilization.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-4">No ward data available</p>
                        ) : (
                            <div className="space-y-3">
                                {ward_utilization.slice(0, 8).map((ward, i) => {
                                    const pct = ward.total > 0 ? Math.round((ward.occupied / ward.total) * 100) : 0;
                                    return (
                                        <div key={i}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-medium text-slate-700 truncate max-w-[120px]" title={ward.dept_name || 'Unallocated'}>
                                                    {ward.dept_name || 'Unallocated'}
                                                </span>
                                                <span className="text-xs text-slate-500 shrink-0 ml-2">
                                                    {ward.occupied}/{ward.total}
                                                    <span className={`ml-1 font-bold ${pct >= 90 ? 'text-red-600' : pct >= 70 ? 'text-orange-500' : 'text-green-600'}`}>
                                                        {pct}%
                                                    </span>
                                                </span>
                                            </div>
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-orange-400' : 'bg-green-500'}`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Urgent Alerts Summary */}
            {stats.urgent_labs > 0 && (
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
                    <Card className="border-l-4 border-l-red-500 bg-red-50/50">
                        <CardContent className="p-4 flex items-center gap-3">
                            <AlertTriangle className="h-6 w-6 text-red-600 shrink-0" />
                            <div>
                                <p className="font-bold text-red-800">{stats.urgent_labs} STAT / Urgent Lab Order{stats.urgent_labs !== 1 ? 's' : ''} Pending</p>
                                <p className="text-sm text-red-600">Immediate sample collection required. Check Alerts page.</p>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Recent Activity Feed */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-500" /> Recent Activity Feed
                        <Badge className="bg-slate-100 text-slate-600 font-normal text-xs ml-1">{recent_activity.length} events</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {recent_activity.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-6">No recent activity</p>
                    ) : (
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                            {recent_activity.map((event, i) => {
                                const cfg = eventConfig[event.event_type] || eventConfig.admission;
                                const IconComp = cfg.icon;
                                return (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                        className={`flex items-start gap-3 p-3 rounded-lg border-l-4 ${cfg.borderColor} ${cfg.bg}`}
                                    >
                                        <div className={`mt-0.5 ${cfg.color}`}>
                                            <IconComp className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs font-bold text-slate-700">{event.patient_name}</span>
                                                <Badge className={`text-[10px] px-1.5 py-0 ${cfg.bg} ${cfg.color} border-0`}>{cfg.label}</Badge>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-0.5 truncate">{event.detail}</p>
                                        </div>
                                        <span className="text-[10px] text-slate-400 shrink-0 mt-0.5">
                                            {event.event_time ? new Date(event.event_time).toLocaleString([], { timeStyle: 'short', dateStyle: 'short' }) : '—'}
                                        </span>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
