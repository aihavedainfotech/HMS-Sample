import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    BarChart3,
    TrendingUp,
    TestTube,
    DollarSign,
    Download,
    Loader2,
    ArrowLeft,
    Activity,
    Microscope,
    ClipboardList
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
    AreaChart, Area, LineChart, Line
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

interface AnalyticsData {
    daily_revenue: { date: string; revenue: number }[];
    order_trends: { date: string; count: number }[];
    categories: { name: string; value: number; percentage: number }[];
    workload: { pending: number; collected: number; in_progress: number; completed: number };
    top_tests: { name: string; units: number; revenue: number }[];
}

export default function LabAnalytics() {
    const navigate = useNavigate();
    const socketRef = useRef<Socket | null>(null);
    const [dateRange, setDateRange] = useState('7');
    const [activeTab, setActiveTab] = useState('revenue');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [totals, setTotals] = useState({
        totalRevenue: 0,
        totalTestsPerformed: 0,
        totalOrders: 0,
        averageDailyRevenue: 0,
    });

    useEffect(() => {
        fetchAnalytics();
    }, [dateRange]);

    useEffect(() => {
        const apiBase = API_URL;
        const socketUrl = apiBase.replace(/\/api\/?$/, '');
        socketRef.current = io(socketUrl + '/', {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5,
        });

        socketRef.current.on('connect', () => console.log('Lab Analytics Socket Connected'));

        const handleRefresh = () => {
            fetchAnalytics();
            toast.info('Dashboard updated in real-time');
        };

        socketRef.current.on('lab:order_received', handleRefresh);
        socketRef.current.on('lab:status_updated', handleRefresh);
        socketRef.current.on('lab:stats_updated', handleRefresh);
        socketRef.current.on('lab:payment_collected', handleRefresh);

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, []);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('hms_staff_token');
            if (!token) return;

            const res = await fetch(`${API_URL}/lab/analytics?days=${dateRange}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to fetch analytics');
            const result: AnalyticsData = await res.json();
            setData(result);

            const totalRevenue = result.daily_revenue.reduce((s, d) => s + d.revenue, 0);
            const totalTests = result.top_tests.reduce((s, d) => s + d.units, 0);
            const totalOrders = result.order_trends.reduce((s, d) => s + d.count, 0);
            const days = result.daily_revenue.length || 1;

            setTotals({
                totalRevenue,
                totalTestsPerformed: totalTests,
                totalOrders: totalOrders,
                averageDailyRevenue: Math.round(totalRevenue / days),
            });
        } catch (err) {
            console.error('Analytics fetch error:', err);
            toast.error('Failed to load analytics data');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (v: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(v);
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] p-4 sm:p-6 lg:p-8">
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-[120px]" />
                <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-purple-400/10 rounded-full blur-[120px]" />
            </div>

            <div className="relative space-y-8 max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                    <div className="space-y-1">
                        <button
                            onClick={() => navigate('/lab')}
                            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold mb-4 transition-colors group"
                        >
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            BACK TO DASHBOARD
                        </button>
                        <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                            <div className="p-2.5 bg-slate-900 rounded-2xl">
                                <BarChart3 className="h-8 w-8 text-white" />
                            </div>
                            LAB <span className="text-blue-600">ANALYTICS</span>
                        </h1>
                        <p className="text-slate-500 font-bold flex items-center gap-2 uppercase tracking-widest text-xs">
                            <Activity size={14} className="text-emerald-500" /> Real-time Diagnostic Insights
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Select value={dateRange} onValueChange={setDateRange}>
                            <SelectTrigger className="w-[180px] h-14 bg-white/70 backdrop-blur-xl border-2 border-slate-100 rounded-2xl font-black shadow-sm">
                                <SelectValue placeholder="Select Period" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-0 shadow-2xl">
                                <SelectItem value="7">Last 7 Days</SelectItem>
                                <SelectItem value="30">Last 30 Days</SelectItem>
                                <SelectItem value="90">Last 90 Days</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            onClick={() => window.print()}
                            className="h-14 px-6 bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-100 font-black rounded-2xl transition-all shadow-sm"
                        >
                            <Download className="mr-2 h-5 w-5" />
                            EXPORT
                        </Button>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { title: 'TOTAL REVENUE', value: formatCurrency(totals.totalRevenue), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: '+14.2%' },
                        { title: 'AVG REVENUE', value: formatCurrency(totals.averageDailyRevenue), icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50', trend: '+2.5%' },
                        { title: 'TESTS DONE', value: totals.totalTestsPerformed.toLocaleString(), icon: Microscope, color: 'text-purple-600', bg: 'bg-purple-50', trend: '+8.4%' },
                        { title: 'TOTAL ORDERS', value: totals.totalOrders.toLocaleString(), icon: ClipboardList, color: 'text-amber-600', bg: 'bg-amber-50', trend: '+12.1%' },
                    ].map((stat, idx) => (
                        <motion.div
                            key={stat.title}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.05 }}
                            whileHover={{ y: -5 }}
                        >
                            <Card className="h-full border-0 bg-white/70 backdrop-blur-xl shadow-xl shadow-slate-200/50 rounded-[2.5rem] p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`p-4 rounded-2xl ${stat.bg} inline-flex`}>
                                        <stat.icon className={`h-6 w-6 ${stat.color}`} />
                                    </div>
                                    <Badge className="bg-emerald-100 text-emerald-600 font-black border-0 rounded-lg">{stat.trend}</Badge>
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">{stat.value}</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.title}</p>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                    <TabsList className="bg-slate-900/5 backdrop-blur-xl p-1.5 rounded-[2rem] inline-flex">
                        {['revenue', 'tests', 'workload', 'trends'].map((tab) => (
                            <TabsTrigger
                                key={tab}
                                value={tab}
                                className="rounded-[1.5rem] px-8 py-3 font-black uppercase text-xs tracking-widest transition-all data-[state=active]:bg-slate-900 data-[state=active]:text-white shadow-none"
                            >
                                {tab}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <AnimatePresence mode="wait">
                        {loading ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center py-32 bg-white/40 backdrop-blur-sm rounded-[3rem] border-2 border-dashed border-slate-200"
                            >
                                <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
                                <p className="text-xl font-black text-slate-900 uppercase tracking-widest">Compiling Analytics...</p>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4 }}
                            >
                                <TabsContent value="revenue" className="grid lg:grid-cols-3 gap-8 mt-0 focus-visible:ring-0">
                                    <Card className="lg:col-span-2 border-0 bg-white/70 backdrop-blur-xl shadow-xl shadow-slate-200/50 rounded-[3rem] p-8">
                                        <div className="flex items-center justify-between mb-8">
                                            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                                <TrendingUp className="text-blue-500" /> REVENUE GROWTH
                                            </h2>
                                        </div>
                                        <div className="h-[400px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={data?.daily_revenue || []}>
                                                    <defs>
                                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                                    <XAxis
                                                        dataKey="date"
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fontSize: 10, fontWeight: 800, fill: '#94A3B8' }}
                                                        tickFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                                    />
                                                    <YAxis
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fontSize: 10, fontWeight: 800, fill: '#94A3B8' }}
                                                        tickFormatter={(v) => `₹${v / 1000}k`}
                                                    />
                                                    <Tooltip
                                                        contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 800 }}
                                                    />
                                                    <Area type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </Card>

                                    <Card className="border-0 bg-slate-900 shadow-2xl shadow-slate-900/40 rounded-[3rem] p-8 text-white">
                                        <h2 className="text-xl font-black tracking-tight mb-8 uppercase tracking-widest text-blue-400">Tests by Category</h2>
                                        <div className="h-64 mb-8">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={data?.categories}
                                                        cx="50%" cy="50%"
                                                        innerRadius={60} outerRadius={80}
                                                        paddingAngle={5} dataKey="value"
                                                    >
                                                        {data?.categories?.map((_, i) => (
                                                            <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip contentStyle={{ borderRadius: '1rem', color: '#000' }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="space-y-4 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                            {data?.categories?.map((cat, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                                        <span className="text-xs font-black uppercase tracking-widest">{cat.name}</span>
                                                    </div>
                                                    <span className="text-sm font-black text-blue-400">{cat.percentage}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                </TabsContent>

                                <TabsContent value="tests" className="grid lg:grid-cols-1 gap-8 mt-0 focus-visible:ring-0">
                                    <Card className="border-0 bg-white/70 backdrop-blur-xl shadow-xl shadow-slate-200/50 rounded-[3rem] p-8">
                                        <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-8 uppercase flex items-center gap-3">
                                            <Microscope className="text-emerald-500" /> Popular Lab Tests
                                        </h2>
                                        <div className="h-[400px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={data?.top_tests || []}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#94A3B8' }} angle={-45} textAnchor="end" height={80} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94A3B8' }} />
                                                    <Tooltip
                                                        cursor={{ fill: '#F1F5F9', radius: 10 }}
                                                        contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 800 }}
                                                    />
                                                    <Bar dataKey="units" fill="#10B981" radius={[10, 10, 0, 0]} barSize={40} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </Card>
                                </TabsContent>

                                <TabsContent value="workload" className="grid lg:grid-cols-4 gap-8 mt-0 focus-visible:ring-0">
                                    <div className="lg:col-span-3 grid md:grid-cols-2 gap-8">
                                        <Card className="border-0 bg-white/70 backdrop-blur-xl shadow-xl shadow-slate-200/50 rounded-[3rem] p-8">
                                            <h2 className="text-xl font-black text-slate-900 tracking-tight mb-6 uppercase tracking-widest">LAB STATUS</h2>
                                            <div className="space-y-4">
                                                {[
                                                    { label: 'Pending Orders', value: data?.workload.pending, color: 'text-amber-500', bg: 'bg-amber-50' },
                                                    { label: 'Sample Collected', value: data?.workload.collected, color: 'text-blue-500', bg: 'bg-blue-50' },
                                                    { label: 'In Testing', value: data?.workload.in_progress, color: 'text-purple-500', bg: 'bg-purple-50' },
                                                    { label: 'Completed', value: data?.workload.completed, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                                                ].map((item) => (
                                                    <div key={item.label} className={`flex items-center justify-between p-6 ${item.bg} rounded-[2rem] border-2 border-transparent hover:border-white transition-all`}>
                                                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{item.label}</span>
                                                        <span className={`text-2xl font-black ${item.color}`}>{item.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </Card>
                                        <Card className="border-0 bg-white/70 backdrop-blur-xl shadow-xl shadow-slate-200/50 rounded-[3rem] p-8 flex items-center justify-center">
                                            <div className="text-center">
                                                <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 transform rotate-12 transition-transform hover:rotate-0">
                                                    <TestTube size={48} />
                                                </div>
                                                <h3 className="text-4xl font-black text-slate-900 tracking-tight">{data ? data.workload.pending + data.workload.collected + data.workload.in_progress : 0}</h3>
                                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-2">ACTIVE SAMPLES IN LAB</p>
                                            </div>
                                        </Card>
                                    </div>

                                    <Card className="bg-slate-900 rounded-[3rem] shadow-2xl p-8 text-white flex flex-col justify-center gap-6">
                                        <h3 className="text-lg font-black uppercase tracking-widest text-blue-400">Throughput Health</h3>
                                        <div className="space-y-6">
                                            <div>
                                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                                                    <span>Verified Status</span>
                                                    <span>92%</span>
                                                </div>
                                                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                                    <motion.div initial={{ width: 0 }} animate={{ width: '92%' }} className="h-full bg-emerald-400" />
                                                </div>
                                            </div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">System is performing optimally with high result accuracy and low turnaround time.</p>
                                        </div>
                                    </Card>
                                </TabsContent>

                                <TabsContent value="trends" className="grid lg:grid-cols-1 gap-8 mt-0 focus-visible:ring-0">
                                    <Card className="border-0 bg-white/70 backdrop-blur-xl shadow-xl shadow-slate-200/50 rounded-[3rem] p-8">
                                        <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-8 uppercase flex items-center gap-3">
                                            <Activity className="text-blue-500" /> Order Volume Trend
                                        </h2>
                                        <div className="h-[400px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={data?.order_trends || []}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                                    <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94A3B8' }} />
                                                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94A3B8' }} />
                                                    <Tooltip contentStyle={{ borderRadius: '1.5rem', fontWeight: 800 }} />
                                                    <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={4} dot={{ r: 6, fill: '#3B82F6', strokeWidth: 0 }} activeDot={{ r: 8 }} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </Card>
                                </TabsContent>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Tabs>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl shadow-slate-900/40 text-white"
                >
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="space-y-2 text-center md:text-left">
                            <h3 className="text-2xl font-black tracking-tight tracking-widest uppercase text-blue-400">Lab Performance Insights</h3>
                            <p className="text-slate-400 font-bold text-sm">Automated analysis of laboratory throughput and financial metrics.</p>
                        </div>
                        <div className="flex gap-6">
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-center min-w-[120px]">
                                <p className="text-2xl font-black text-emerald-400">98.5%</p>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Accuracy Score</p>
                            </div>
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-center min-w-[120px]">
                                <p className="text-2xl font-black text-blue-400">{data?.top_tests?.[0]?.units || 0}</p>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Top Test Vol</p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
