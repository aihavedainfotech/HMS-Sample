import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Pill,
  FileText,
  AlertTriangle,
  Package,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Clock,
  CheckCircle2,
  RefreshCw,
  Activity,
  ArrowRight,
  Loader2,
  DollarSign,
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface DashboardStats {
  totalPrescriptions: number;
  pendingDispensing: number;
  lowStockItems: number;
  totalMedicines: number;
  todaysRevenue: number;
  dispensedToday: number;
}

interface PendingPrescription {
  prescription_id: string;
  patient_name: string;
  doctor_name: string;
  medicines: any[];
  prescription_date: string;
}

interface RecentSale {
  id: number;
  prescription_id: string;
  patient_name: string;
  total_amount: number;
  created_at: string;
  medicines: any[];
}

export default function PharmacistHome() {
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalPrescriptions: 0,
    pendingDispensing: 0,
    lowStockItems: 0,
    totalMedicines: 0,
    todaysRevenue: 0,
    dispensedToday: 0,
  });
  const [pendingRx, setPendingRx] = useState<PendingPrescription[]>([]);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [lastRefresh, setLastRefresh] = useState<string>(new Date().toLocaleTimeString());

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000); // 30s as backup

    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';
    const socketUrl = apiBase.replace(/\/api\/?$/, '');
    socketRef.current = io(socketUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current.on('connect', () => console.log('Pharmacy Socket Connected'));
    socketRef.current.on('pharmacy:prescription_received', () => {
      toast.info('New prescription received!');
      fetchAll();
    });
    socketRef.current.on('pharmacy:sale_completed', () => fetchAll());
    socketRef.current.on('pharmacy:stats_updated', () => fetchAll());
    socketRef.current.on('pharmacy:stock_updated', () => fetchAll());

    return () => {
      clearInterval(interval);
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const fetchAll = async () => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      if (!token) { setLoading(false); return; }
      const headers = { Authorization: `Bearer ${token}` };

      const [prescRes, invRes, statsRes, salesRes] = await Promise.all([
        fetch(`${API_URL}/pharmacy/prescriptions`, { headers }),
        fetch(`${API_URL}/pharmacy/inventory`, { headers }),
        fetch(`${API_URL}/pharmacy/stats`, { headers }),
        fetch(`${API_URL}/pharmacy/sales`, { headers }),
      ]);

      const prescData = await prescRes.json();
      const inventory = await invRes.json();
      const statsData = statsRes.ok ? await statsRes.json() : {};
      const salesData = salesRes.ok ? await salesRes.json() : [];

      const allRx = [...(prescData.pending || []), ...(prescData.completed || [])];
      const pending = prescData.pending || [];
      const lowStock = Array.isArray(inventory)
        ? inventory.filter((i: any) => (i.current_stock || 0) <= (i.reorder_level || 10))
        : [];

      setStats({
        totalPrescriptions: allRx.length,
        pendingDispensing: pending.length,
        lowStockItems: lowStock.length,
        totalMedicines: Array.isArray(inventory) ? inventory.length : 0,
        todaysRevenue: statsData.todays_revenue || 0,
        dispensedToday: statsData.prescriptions_dispensed_today || 0,
      });

      setPendingRx(pending.slice(0, 5));
      setRecentSales(Array.isArray(salesData) ? salesData.slice(0, 5) : []);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const seedInventory = async () => {
    setRefreshing(true);
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/pharmacy/seed-inventory`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchAll();
    } catch (err) {
      console.error('Seeding failed:', err);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground animate-pulse">Loading pharmacy dashboard...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Prescriptions',
      value: stats.totalPrescriptions,
      icon: FileText,
      gradient: 'from-blue-500 to-blue-600',
      bgLight: 'bg-blue-50',
      textColor: 'text-blue-600',
      subtitle: 'Today',
    },
    {
      title: 'Pending Dispensing',
      value: stats.pendingDispensing,
      icon: Clock,
      gradient: 'from-amber-500 to-orange-500',
      bgLight: 'bg-amber-50',
      textColor: 'text-amber-600',
      subtitle: stats.pendingDispensing > 0 ? 'Needs attention' : 'All clear',
      urgent: stats.pendingDispensing > 0,
    },
    {
      title: 'Low Stock Items',
      value: stats.lowStockItems,
      icon: AlertTriangle,
      gradient: 'from-red-500 to-rose-500',
      bgLight: 'bg-red-50',
      textColor: 'text-red-600',
      subtitle: stats.lowStockItems > 0 ? 'Reorder needed' : 'Stock OK',
      urgent: stats.lowStockItems > 3,
    },
    {
      title: 'Total Medicines',
      value: stats.totalMedicines,
      icon: Package,
      gradient: 'from-emerald-500 to-green-500',
      bgLight: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      subtitle: 'In inventory',
    },
    {
      title: "Today's Revenue",
      value: `₹${stats.todaysRevenue.toLocaleString()}`,
      icon: DollarSign,
      gradient: 'from-violet-500 to-purple-600',
      bgLight: 'bg-violet-50',
      textColor: 'text-violet-600',
      subtitle: `${stats.dispensedToday} dispensed`,
      isText: true,
    },
    {
      title: 'Dispensed Today',
      value: stats.dispensedToday,
      icon: CheckCircle2,
      gradient: 'from-teal-500 to-cyan-500',
      bgLight: 'bg-teal-50',
      textColor: 'text-teal-600',
      subtitle: 'Prescriptions fulfilled',
    },
  ];

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
            <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
              <div className="p-2.5 bg-slate-900 rounded-2xl">
                <Pill className="h-8 w-8 text-white" />
              </div>
              PHARMACY <span className="text-blue-600">DASHBOARD</span>
            </h1>
            <p className="text-slate-500 font-bold flex items-center gap-2">
              <Clock size={16} /> Welcome back, {lastRefresh} Live Update
            </p>
          </div>

          <div className="flex items-center gap-3">
            {stats.totalMedicines === 0 && (
              <Button
                onClick={seedInventory}
                disabled={refreshing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl px-6 py-6 transition-all hover:scale-105"
              >
                <Package className="mr-2" /> SEED INVENTORY
              </Button>
            )}
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-100 font-black rounded-2xl px-6 py-6 transition-all group shadow-sm"
            >
              <RefreshCw className={`mr-2 h-5 w-5 ${refreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
              REFRESH
            </Button>
            <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl shadow-slate-900/20">
              <Activity className="h-6 w-6 animate-pulse text-emerald-400" />
            </div>
          </div>
        </motion.div>

        {/* Real-time Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          <AnimatePresence mode="popLayout">
            {statCards.map((card, idx) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ y: -5 }}
                className="group"
              >
                <Card className="relative h-full overflow-hidden border-0 bg-white/70 backdrop-blur-xl shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-slate-300/50 transition-all duration-300 rounded-[2rem]">
                  <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${card.gradient}`} />
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-2xl ${card.bgLight} group-hover:scale-110 transition-transform duration-300`}>
                        <card.icon className={`h-6 w-6 ${card.textColor}`} />
                      </div>
                      {card.urgent && (
                        <div className="bg-red-500 h-3 w-3 rounded-full animate-ping" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-1">
                        {card.value}
                      </h3>
                      <p className="text-sm font-black text-slate-400 uppercase tracking-widest leading-tight">
                        {card.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${card.urgent ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                          {card.subtitle}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Pending Prescriptions & Quick Actions */}
          <div className="lg:col-span-2 space-y-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/70 backdrop-blur-xl p-8 rounded-[3rem] shadow-xl shadow-slate-200/50 border-0"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-100 rounded-2xl">
                    <Clock className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">PENDING ORDERS</h2>
                    <p className="text-sm font-bold text-slate-400">NEEDS DISPENSING</p>
                  </div>
                </div>
                <Button
                  onClick={() => navigate('/pharmacist/prescriptions')}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-black rounded-xl px-4"
                >
                  VIEW ALL <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-4">
                {pendingRx.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                    <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
                    <p className="text-xl font-black text-slate-900">ALL CAUGHT UP!</p>
                    <p className="font-bold text-slate-400 uppercase tracking-widest text-xs mt-1">NO PENDING PRESCRIPTIONS</p>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {pendingRx.map((rx, idx) => (
                      <motion.div
                        key={rx.prescription_id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        onClick={() => navigate('/pharmacist/prescriptions')}
                        className="group flex items-center gap-6 p-5 bg-white rounded-3xl border-2 border-transparent hover:border-amber-200 hover:shadow-xl hover:shadow-amber-100/50 transition-all cursor-pointer"
                      >
                        <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                          <Pill className="h-7 w-7 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-lg font-black text-slate-900 tracking-tight uppercase">{rx.patient_name || 'Anonymous'}</p>
                          <p className="text-sm font-bold text-slate-400 flex items-center gap-2">
                            <FileText size={14} /> {rx.prescription_id} • Dr. {rx.doctor_name || 'N/A'}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-slate-900 text-white font-black rounded-xl px-3 py-1 scale-110">
                            {rx.medicines?.length || 0} MEDS
                          </Badge>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </motion.div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {[
                { label: 'DISPENSE', icon: FileText, path: '/pharmacist/prescriptions', color: 'from-blue-600 to-indigo-600', bg: 'bg-blue-50', text: 'text-blue-600' },
                { label: 'INVENTORY', icon: Package, path: '/pharmacist/inventory', color: 'from-emerald-600 to-teal-600', bg: 'bg-emerald-50', text: 'text-emerald-600' },
                { label: 'ALERTS', icon: AlertTriangle, path: '/pharmacist/alerts', color: 'from-rose-600 to-red-600', bg: 'bg-rose-50', text: 'text-rose-600' },
                { label: 'ANALYTICS', icon: BarChart3, path: '/pharmacist/analytics', color: 'from-violet-600 to-purple-600', bg: 'bg-violet-50', text: 'text-violet-600' },
              ].map((action, idx) => (
                <motion.div
                  key={action.label}
                  whileHover={{ y: -5 }}
                  onClick={() => navigate(action.path)}
                  className="group relative h-40 bg-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/50 cursor-pointer overflow-hidden border-0"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  <div className="relative z-10 h-full flex flex-col items-center justify-center gap-4">
                    <div className={`w-16 h-16 ${action.bg} rounded-2xl flex items-center justify-center group-hover:bg-white/20 transition-colors duration-500`}>
                      <action.icon className={`h-8 w-8 ${action.text} group-hover:text-white transition-colors duration-500`} />
                    </div>
                    <span className="font-black text-slate-900 uppercase tracking-widest text-xs group-hover:text-white transition-colors duration-500">{action.label}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right: Recent Sales */}
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="h-full bg-slate-900 p-8 rounded-[3rem] shadow-2xl shadow-slate-900/40 text-white"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 rounded-2xl">
                    <TrendingUp className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight">RECENT SALES</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">LIVE TRANSACTIONS</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {recentSales.length === 0 ? (
                  <div className="text-center py-20 bg-white/5 rounded-[2rem] border-2 border-dashed border-white/10">
                    <TrendingDown className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                    <p className="text-lg font-black text-slate-400">NO SALES RECORDED</p>
                  </div>
                ) : (
                  recentSales.map((sale, idx) => (
                    <motion.div
                      key={sale.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="p-5 bg-white/5 rounded-[2rem] border border-white/10 hover:bg-white/10 transition-colors group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-black tracking-tight group-hover:text-emerald-400 transition-colors">{sale.patient_name || sale.prescription_id}</p>
                        <p className="text-lg font-black text-emerald-400">₹{sale.total_amount.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center justify-between opacity-50">
                        <span className="text-[10px] font-black uppercase tracking-widest">{sale.medicines?.length || 0} ITEMS</span>
                        <span className="text-[10px] font-black uppercase tracking-widest">{new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {recentSales.length > 0 && (
                <Button
                  onClick={() => navigate('/pharmacist/analytics')}
                  className="w-full mt-8 bg-white/10 hover:bg-white/20 text-white font-black rounded-2xl h-14 uppercase tracking-widest text-xs"
                >
                  VIEW FULL ANALYTICS
                </Button>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
