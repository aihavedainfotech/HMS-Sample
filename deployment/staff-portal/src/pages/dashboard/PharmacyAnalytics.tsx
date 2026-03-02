import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  TrendingUp,
  Package,
  DollarSign,
  Download,
  Filter,
  Eye,
  ArrowUp,
  ArrowDown,
  Loader2,
  Calendar,
  Clock,
  ArrowLeft,
  Activity,
  FilePieChart,
  Pill
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
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

interface AnalyticsData {
  daily_sales: { date: string; revenue: number; medicines_sold: number; prescriptions: number }[];
  top_medicines: { name: string; units: number; revenue: number; category: string }[];
  categories: { name: string; value: number; percentage: number }[];
  inventory_summary: { total_value: number; total_items: number; low_stock: number; out_of_stock: number };
  prescription_stats: { date: string; dispensed: number; pending: number; cancelled: number }[];
  stock_levels: { name: string; stock: number; value: number; status: string; category: string }[];
}

export default function PharmacyAnalytics() {
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);
  const [dateRange, setDateRange] = useState('7');
  const [activeTab, setActiveTab] = useState('revenue');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [totals, setTotals] = useState({
    totalRevenue: 0,
    totalMedicinesSold: 0,
    totalPrescriptions: 0,
    averageDailyRevenue: 0,
  });

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  useEffect(() => {
    // Initialize Socket.IO for real-time updates
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';
    const socketUrl = apiBase.replace(/\/api\/?$/, '');
    socketRef.current = io(socketUrl + '/', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current.on('connect', () => console.log('Analytics Socket Connected'));

    // Listen for relevant events to refresh analytics
    const handleRefresh = () => {
      fetchAnalytics();
      toast.info('Dashboard updated in real-time');
    };

    socketRef.current.on('pharmacy:sale_completed', handleRefresh);
    socketRef.current.on('pharmacy:stock_updated', handleRefresh);
    socketRef.current.on('pharmacy:stats_updated', handleRefresh);

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('hms_staff_token');
      if (!token) return;

      const res = await fetch(`${API_URL}/pharmacy/analytics?days=${dateRange}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch analytics');
      const result: AnalyticsData = await res.json();
      setData(result);

      const totalRevenue = result.daily_sales.reduce((s, d) => s + d.revenue, 0);
      const totalMeds = result.daily_sales.reduce((s, d) => s + d.medicines_sold, 0);
      const totalRx = result.daily_sales.reduce((s, d) => s + d.prescriptions, 0);
      const days = result.daily_sales.length || 1;

      setTotals({
        totalRevenue,
        totalMedicinesSold: totalMeds,
        totalPrescriptions: totalRx,
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

  const rxTotals = data?.prescription_stats?.reduce(
    (acc, d) => ({
      dispensed: acc.dispensed + (d.dispensed || 0),
      pending: acc.pending + (d.pending || 0),
      cancelled: acc.cancelled + (d.cancelled || 0),
    }),
    { dispensed: 0, pending: 0, cancelled: 0 }
  ) || { dispensed: 0, pending: 0, cancelled: 0 };

  const rxTotal = rxTotals.dispensed + rxTotals.pending + rxTotals.cancelled;
  const accuracy = rxTotal > 0 ? ((rxTotals.dispensed / rxTotal) * 100).toFixed(1) : '0';

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 sm:p-6 lg:p-8">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-emerald-400/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative space-y-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
          <div className="space-y-1">
            <button
              onClick={() => navigate('/pharmacist')}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold mb-4 transition-colors group"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              BACK TO DASHBOARD
            </button>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
              <div className="p-2.5 bg-slate-900 rounded-2xl">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              PHARMACY <span className="text-blue-600">ANALYTICS</span>
            </h1>
            <p className="text-slate-500 font-bold flex items-center gap-2 uppercase tracking-widest text-xs">
              <Activity size={14} className="text-emerald-500" /> Deep Insights & Performance Metrics
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
                <SelectItem value="365">This Year</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => window.print()}
              className="h-14 px-6 bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-100 font-black rounded-2xl transition-all shadow-sm"
            >
              <Download className="mr-2 h-5 w-5" />
              REPORTS
            </Button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: 'TOTAL REVENUE', value: formatCurrency(totals.totalRevenue), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: '+12.5%' },
            { title: 'AVG DAILY', value: formatCurrency(totals.averageDailyRevenue), icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50', trend: '+5.2%' },
            { title: 'MEDS SOLD', value: totals.totalMedicinesSold.toLocaleString(), icon: Package, color: 'text-amber-600', bg: 'bg-amber-50', trend: '+18.4%' },
            { title: 'PRESCRIPTIONS', value: totals.totalPrescriptions.toLocaleString(), icon: FilePieChart, color: 'text-violet-600', bg: 'bg-violet-50', trend: '+9.1%' },
          ].map((stat, idx) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ y: -5 }}
            >
              <Card className="h-full border-0 bg-white/70 backdrop-blur-xl shadow-xl shadow-slate-200/50 rounded-[2.5rem] p-6 text-center lg:text-left">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                  <div className={`p-4 rounded-2xl ${stat.bg} inline-flex mx-auto lg:mx-0`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-600 font-black border-0 rounded-lg mx-auto lg:mx-0">{stat.trend}</Badge>
                </div>
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">{stat.value}</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.title}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Tabs & Charts Container */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-slate-900/5 backdrop-blur-xl p-1.5 rounded-[2rem] inline-flex mb-4">
            {['revenue', 'medicines', 'inventory', 'prescriptions'].map((tab) => (
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
                        <TrendingUp className="text-blue-500" /> DAILY REVENUE TREND
                      </h2>
                    </div>
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data?.daily_sales || []}>
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
                            formatter={(v: any) => [formatCurrency(v), 'Revenue']}
                          />
                          <Area type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  <Card className="border-0 bg-slate-900 shadow-2xl shadow-slate-900/40 rounded-[3rem] p-8 text-white">
                    <h2 className="text-xl font-black tracking-tight mb-8 uppercase tracking-widest text-blue-400">Revenue by Category</h2>
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
                        <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors">
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

                <TabsContent value="medicines" className="grid lg:grid-cols-1 gap-8 mt-0 focus-visible:ring-0">
                  <Card className="border-0 bg-white/70 backdrop-blur-xl shadow-xl shadow-slate-200/50 rounded-[3rem] p-8">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-8 uppercase flex items-center gap-3">
                      <Pill className="text-emerald-500" /> Top Selling Medicines
                    </h2>
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data?.top_medicines || []}>
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

                <TabsContent value="inventory" className="grid lg:grid-cols-4 gap-8 mt-0 focus-visible:ring-0">
                  <div className="lg:col-span-3 grid md:grid-cols-2 gap-8">
                    <Card className="border-0 bg-white/70 backdrop-blur-xl shadow-xl shadow-slate-200/50 rounded-[3rem] p-8">
                      <h2 className="text-xl font-black text-slate-900 tracking-tight mb-6 uppercase tracking-widest">STOCK STATUS</h2>
                      <div className="space-y-4">
                        {[
                          { label: 'Out of Stock', value: data?.inventory_summary?.out_of_stock, color: 'text-red-500', bg: 'bg-red-50' },
                          { label: 'Low Stock', value: data?.inventory_summary?.low_stock, color: 'text-amber-500', bg: 'bg-amber-50' },
                          { label: 'Total Value', value: formatCurrency(data?.inventory_summary?.total_value || 0), color: 'text-emerald-500', bg: 'bg-emerald-50' },
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
                          <Package size={48} />
                        </div>
                        <h3 className="text-4xl font-black text-slate-900 tracking-tight">{data?.inventory_summary?.total_items || 0}</h3>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-2">TOTAL ITEMS IN STOCK</p>
                      </div>
                    </Card>
                  </div>

                  <Card className="bg-slate-900 rounded-[3rem] shadow-2xl p-8 text-white flex flex-col justify-center gap-6">
                    <h3 className="text-lg font-black uppercase tracking-widest text-blue-400">Inventory Health</h3>
                    <div className="space-y-6">
                      <div>
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                          <span>Health Score</span>
                          <span>85%</span>
                        </div>
                        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: '85%' }} className="h-full bg-emerald-400" />
                        </div>
                      </div>
                      <p className="text-xs font-bold text-slate-400">INVENTORY IS GENERALLY HEALTHY BUT REQUIRES {data?.inventory_summary?.low_stock || 0} REORDERS.</p>
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="prescriptions" className="grid lg:grid-cols-1 gap-8 mt-0 focus-visible:ring-0">
                  <Card className="border-0 bg-white/70 backdrop-blur-xl shadow-xl shadow-slate-200/50 rounded-[3rem] p-8">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-8 uppercase flex items-center gap-3">
                      <Clock className="text-violet-500" /> Fulfillment Trends
                    </h2>
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data?.prescription_stats || []}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94A3B8' }} tickFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} />
                          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94A3B8' }} />
                          <Tooltip contentStyle={{ borderRadius: '1.5rem', fontWeight: 800 }} />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', paddingTop: '20px' }} />
                          <Bar dataKey="dispensed" fill="#10B981" radius={[10, 10, 0, 0]} stackId="a" />
                          <Bar dataKey="pending" fill="#F59E0B" radius={[0, 0, 0, 0]} stackId="a" />
                          <Bar dataKey="cancelled" fill="#EF4444" radius={[0, 0, 0, 0]} stackId="a" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
                      {[
                        { label: 'Dispensed', value: rxTotals.dispensed, color: 'text-emerald-500' },
                        { label: 'Pending', value: rxTotals.pending, color: 'text-amber-500' },
                        { label: 'Cancelled', value: rxTotals.cancelled, color: 'text-rose-500' },
                        { label: 'Fulfillment', value: `${accuracy}%`, color: 'text-blue-500' },
                      ].map((rx) => (
                        <div key={rx.label} className="text-center p-6 bg-slate-50 rounded-[2rem]">
                          <p className="text-2xl font-black text-slate-900">{rx.value}</p>
                          <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${rx.color}`}>{rx.label}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                </TabsContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Tabs>

        {/* Action Insights Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl shadow-slate-900/40 text-white"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-2 text-center md:text-left">
              <h3 className="text-2xl font-black tracking-tight tracking-widest uppercase text-blue-400">AI Performance Advisory</h3>
              <p className="text-slate-400 font-bold text-sm">Automated analysis of your pharmacy operations for the last {dateRange} days.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full md:w-auto">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
                <p className="text-2xl font-black text-emerald-400">{accuracy}%</p>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Efficiency</p>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
                <p className="text-2xl font-black text-blue-400">{data?.top_medicines?.[0]?.units || 0}</p>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Top Velocity</p>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
                <p className="text-2xl font-black text-amber-400">{rxTotals.pending}</p>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Backlog</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
