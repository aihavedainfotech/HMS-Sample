import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  FileText,
  CreditCard,
  TestTube,
  Microscope,
  FileBarChart,
  Users,
  TrendingUp,
  CheckCircle2,
  Activity,
  Clock,
  ArrowRight,
  BarChart3,
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = 'http://localhost:5002/api';

interface DashboardStats {
  totalPatients: number;
  activePrescriptions: number;
  pendingPayments: number;
  todayRevenue: number;
  pathologyLabProgress: number;
  pathologyLabSamples: number;
  radiologyProgress: number;
  radiologyReports: number;
}

interface TodayOrder {
  order_id: string;
  patient_id: string;
  patient_name: string;
  doctor_name: string;
  doctor_specialization: string;
  order_date: string;
  status: 'active' | 'completed' | 'cancelled';
  payment_status: 'paid' | 'pending';
  lab_tests: {
    test_id: string;
    test_name: string;
    test_type: string;
    urgency: string;
    price: number;
  }[];
}

interface WorkflowStep {
  name: string;
  status: 'completed' | 'active' | 'pending';
  icon: React.ElementType;
  path: string;
}

export default function LabHome() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    activePrescriptions: 0,
    pendingPayments: 0,
    todayRevenue: 0,
    pathologyLabProgress: 0,
    pathologyLabSamples: 0,
    radiologyProgress: 0,
    radiologyReports: 0,
  });
  const [todayOrders, setTodayOrders] = useState<TodayOrder[]>([]);

  const workflowSteps: WorkflowStep[] = [
    { name: 'Patient Lookup', status: 'completed', icon: Search, path: '/lab/patients' },
    { name: 'Prescription', status: 'completed', icon: FileText, path: '/lab/prescriptions' },
    { name: 'Payment', status: 'completed', icon: CreditCard, path: '/lab/payments' },
    { name: 'Sample', status: 'completed', icon: TestTube, path: '/lab/samples' },
    { name: 'Test', status: 'completed', icon: Microscope, path: '/lab/processing' },
    { name: 'Analysis', status: 'completed', icon: FileBarChart, path: '/lab/analysis' },
    { name: 'Report', status: 'completed', icon: FileText, path: '/lab/results' },
    { name: 'Analytics', status: 'completed', icon: TrendingUp, path: '/lab/analytics' },
  ];

  const handleWorkflowClick = (step: WorkflowStep) => {
    navigate(step.path);
    toast.success(`Navigating to ${step.name}`);
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'patient-lookup':
        navigate('/lab/patients');
        break;
      case 'patient-prescription':
        navigate('/lab/prescriptions');
        break;
      case 'verify-payment':
        navigate('/lab/payments');
        break;
      case 'sample-collection':
        navigate('/lab/samples');
        break;
      case 'run-test':
        navigate('/lab/processing');
        break;
    }
  };

  const handleMetricCardClick = (metric: string) => {
    switch (metric) {
      case 'patients':
        navigate('/lab/patients');
        break;
      case 'prescriptions':
        navigate('/lab/prescriptions');
        break;
      case 'payments':
        navigate('/lab/payments');
        break;
      case 'revenue':
        navigate('/lab/results');
        break;
      case 'reports':
        navigate('/lab/results');
        break;
      case 'analytics':
        navigate('/lab/analytics');
        break;
    }
  };

  useEffect(() => {
    const newSocket = io(API_URL.replace('/api', ''), {
      reconnection: true,
      reconnectionDelay: 1000,
    });
    setSocket(newSocket);

    newSocket.on('connect', () => console.log('Lab Socket Connected'));

    const handleRefresh = () => {
      fetchDashboardStats();
      fetchTodayOrders();
    };

    newSocket.on('lab:order_received', (data) => {
      handleRefresh();
      toast.info(`🔬 New lab order received for ${data.patient_name}`);
    });

    newSocket.on('lab:payment_collected', (data) => {
      handleRefresh();
      toast.success(`💰 Payment collected: ₹${data.amount}`);
    });

    newSocket.on('lab:status_updated', (data) => {
      handleRefresh();
      toast.info(`📋 Order ${data.order_id} status updated to ${data.status}`);
    });

    newSocket.on('lab:stats_updated', handleRefresh);

    fetchDashboardStats();
    fetchTodayOrders();

    const interval = setInterval(handleRefresh, 60000);

    return () => {
      newSocket.close();
      clearInterval(interval);
    };
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const response = await fetch(`${API_URL}/lab/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching lab stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayOrders = async () => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const response = await fetch(`${API_URL}/lab/orders/today`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setTodayOrders(data);
      }
    } catch (error) {
      console.error('Error fetching today orders:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount.toFixed(0)}`;
  };

  const pendingOrders = todayOrders.filter(o => o.status === 'active');
  const completedOrders = todayOrders.filter(o => o.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Laboratory Dashboard</h1>
        <p className="text-muted-foreground">Real-time laboratory operations and diagnostics</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-0 bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-2xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">LDIMS WORKFLOW PROGRESS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between py-6 relative">
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/10 -translate-y-[2.5rem]" />
              {workflowSteps.map((step, idx) => (
                <div key={step.name} className="flex flex-col items-center flex-1 z-10">
                  <motion.button
                    whileHover={{ scale: 1.1, y: -5 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleWorkflowClick(step)}
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-all shadow-lg ${step.status === 'completed'
                      ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                      : step.status === 'active'
                        ? 'bg-blue-500 text-white shadow-blue-500/20 ring-4 ring-blue-500/20'
                        : 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-50'
                      }`}
                    disabled={step.status === 'pending'}
                  >
                    <step.icon className="h-6 w-6" />
                  </motion.button>
                  <span className={`text-[10px] font-black uppercase tracking-widest text-center ${step.status === 'pending' ? 'text-slate-500' : 'text-slate-300'
                    }`}>{step.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Key Metrics Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Patients', value: stats.totalPatients, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100', metric: 'patients' },
          { label: 'Active Orders', value: stats.activePrescriptions, icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-100', metric: 'prescriptions' },
          { label: 'Pending Dues', value: formatCurrency(stats.pendingPayments), icon: CreditCard, color: 'text-amber-600', bg: 'bg-amber-100', metric: 'payments' },
          { label: 'Today Revenue', value: formatCurrency(stats.todayRevenue), icon: CheckCircle2, color: 'text-violet-600', bg: 'bg-violet-100', metric: 'revenue' },
        ].map((item, idx) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card
              className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] hover:shadow-2xl transition-all cursor-pointer group overflow-hidden bg-white/70 backdrop-blur-xl"
              onClick={() => handleMetricCardClick(item.metric)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">{item.label}</p>
                    <p className="text-3xl font-black text-slate-900 tracking-tight">{item.value}</p>
                  </div>
                  <div className={`w-14 h-14 ${item.bg} ${item.color} rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-12`}>
                    <item.icon className="h-7 w-7" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <AnimatePresence mode="popLayout">
          {/* Pending Orders */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white/70 backdrop-blur-xl overflow-hidden h-full">
              <CardHeader className="pb-4 border-b border-slate-100/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-slate-900">
                    <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                      <Clock className="h-4 w-4" />
                    </div>
                    Pending Today ({pendingOrders.length})
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700" onClick={() => navigate('/lab/patients')}>
                    ALL ORDERS <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-6 space-y-4">
                  {pendingOrders.length > 0 ? (
                    pendingOrders.map((order, idx) => (
                      <motion.div
                        key={order.order_id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className="group flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-2 border-transparent hover:border-blue-500/20 hover:bg-white transition-all cursor-pointer"
                        onClick={() => navigate('/lab/patients')}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 leading-none">{order.patient_name}</span>
                            <Badge variant="outline" className="text-[9px] font-black px-1.5 h-4 border-slate-200">{order.patient_id}</Badge>
                          </div>
                          <p className="text-[11px] font-bold text-slate-500 line-clamp-1">
                            {order.lab_tests.map(t => t.test_name).join(', ')}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dr. {order.doctor_name}</span>
                            {order.payment_status === 'pending' && (
                              <Badge className="bg-rose-100 text-rose-600 text-[9px] font-black border-0 uppercase px-1.5 h-4">Unpaid</Badge>
                            )}
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                          <ArrowRight className="h-4 w-4 text-blue-500" />
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-3xl flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="h-8 w-8" />
                      </div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No pending orders</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Completed Orders */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white/70 backdrop-blur-xl overflow-hidden h-full">
              <CardHeader className="pb-4 border-b border-slate-100/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-slate-900">
                    <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    Completed Today ({completedOrders.length})
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700" onClick={() => navigate('/lab/results')}>
                    REPORTS <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-6 space-y-4">
                  {completedOrders.length > 0 ? (
                    completedOrders.map((order, idx) => (
                      <motion.div
                        key={order.order_id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className="group flex items-center justify-between p-4 bg-emerald-50/30 rounded-2xl border-2 border-transparent hover:border-emerald-500/20 hover:bg-white transition-all cursor-pointer"
                        onClick={() => navigate('/lab/results')}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 leading-none">{order.patient_name}</span>
                            <Badge variant="outline" className="text-[9px] font-black px-1.5 h-4 border-emerald-200">{order.patient_id}</Badge>
                          </div>
                          <p className="text-[11px] font-bold text-slate-500 line-clamp-1">
                            {order.lab_tests.map(t => t.test_name).join(', ')}
                          </p>
                          <Badge className="bg-emerald-100 text-emerald-700 text-[9px] font-black border-0 uppercase px-1.5 h-4 mt-1">Ready for result</Badge>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                          <FileBarChart className="h-4 w-4 text-emerald-500" />
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-3xl flex items-center justify-center mx-auto mb-4">
                        <Activity className="h-8 w-8" />
                      </div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No completed orders yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="grid sm:grid-cols-2 gap-8">
        <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white p-8">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8">DEPARTMENT LOAD</h2>
          <div className="space-y-8">
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <span className="text-sm font-black text-slate-900 uppercase tracking-widest">Pathology Lab</span>
                <span className="text-[10px] font-black text-slate-500">{stats.pathologyLabSamples} PENDING</span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.pathologyLabProgress}%` }}
                  className="h-full bg-blue-500 rounded-full"
                />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stats.pathologyLabProgress}% CAPACITY REACHED</p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <span className="text-sm font-black text-slate-900 uppercase tracking-widest">Radiology Unit</span>
                <span className="text-[10px] font-black text-slate-500">{stats.radiologyReports} IN PROGRESS</span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.radiologyProgress}%` }}
                  className="h-full bg-violet-500 rounded-full"
                />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stats.radiologyProgress}% COMPLETE</p>
            </div>
          </div>
        </Card>

        <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-slate-900 p-8 text-white">
          <h2 className="text-xs font-black text-blue-400 uppercase tracking-[0.2em] mb-8">SUPER QUICK ACTIONS</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { id: 'patient-lookup', label: 'Patient Search', icon: Search, color: 'text-blue-400', bg: 'bg-white/5' },
              { id: 'patient-prescription', label: 'Lab Orders', icon: FileText, color: 'text-emerald-400', bg: 'bg-white/5' },
              { id: 'verify-payment', label: 'Billing Status', icon: CreditCard, color: 'text-amber-400', bg: 'bg-white/5' },
              { id: 'sample-collection', label: 'Sample Intake', icon: TestTube, color: 'text-rose-400', bg: 'bg-white/5' },
            ].map((action) => (
              <motion.button
                key={action.id}
                whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleQuickAction(action.id)}
                className={`p-5 rounded-2xl ${action.bg} border border-white/5 flex flex-col items-center gap-3 transition-colors`}
              >
                <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${action.color}`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest leading-none">{action.label}</span>
              </motion.button>
            ))}
            <motion.button
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(59, 130, 246, 1)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleQuickAction('run-test')}
              className="col-span-2 p-5 rounded-2xl bg-blue-600 border border-blue-500 flex items-center justify-center gap-4 transition-colors group"
            >
              <Microscope className="h-6 w-6 transform group-hover:rotate-12 transition-transform" />
              <span className="text-xs font-black uppercase tracking-[0.2em]">Start Test Processing</span>
            </motion.button>
          </div>
        </Card>
      </div>
    </div>
  );
}
