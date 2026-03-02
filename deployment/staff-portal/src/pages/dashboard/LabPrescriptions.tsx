import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, FileText, User, Calendar, Clock, CheckCircle, XCircle,
  TestTube, Microscope, Stethoscope, CreditCard, Activity, Droplet, Search
} from 'lucide-react';
import { toast } from 'sonner';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface LabOrder {
  order_id: string;
  patient_id: string;
  patient_name: string;
  doctor_name: string;
  doctor_specialization: string;
  order_date: string;
  status: string;
  lab_tests: { test_name: string; test_type: string; urgency: string; price: number; sample_type: string; }[];
  notes: string;
  payment_status: 'paid' | 'pending';
}

export default function LabPrescriptions() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed'>('all');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const newSocket = io(API_URL.replace('/api', ''), {
      reconnection: true,
      reconnectionDelay: 1000,
    });
    setSocket(newSocket);

    const handleRefresh = () => fetchTodayLabOrders();

    newSocket.on('lab:order_received', handleRefresh);
    newSocket.on('lab:status_updated', handleRefresh);
    newSocket.on('lab:payment_collected', handleRefresh);
    newSocket.on('lab:stats_updated', handleRefresh);

    fetchTodayLabOrders();
    const interval = setInterval(fetchTodayLabOrders, 60000);
    return () => {
      newSocket.close();
      clearInterval(interval);
    };
  }, []);

  const fetchTodayLabOrders = async () => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const response = await fetch(`${API_URL}/lab/orders/today`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const mapped: LabOrder[] = (Array.isArray(data) ? data : data.orders || []).map((o: any) => ({
          order_id: String(o.order_id || o.id || '').startsWith('LAB-') ? String(o.order_id || o.id) : `LAB-${o.id || o.order_id || ''}`,
          patient_id: o.patient_id,
          patient_name: o.patient_name || 'Unknown',
          doctor_name: o.doctor_name || 'N/A',
          doctor_specialization: o.doctor_specialization || '',
          order_date: (o.order_date || '').substring(0, 10),
          status: o.status === 'active' || o.status === 'completed' || o.status === 'cancelled' ? o.status : mapStatus(o.status),
          payment_status: o.payment_status || 'pending',
          notes: o.clinical_notes || o.notes || '',
          lab_tests: Array.isArray(o.lab_tests) && o.lab_tests.length > 0 ? o.lab_tests.map((t: any) => ({
            test_name: t.test_name || 'Lab Test',
            test_type: t.test_type || detectTestType(t.test_name),
            urgency: (t.urgency || t.priority || 'routine').toLowerCase(),
            price: t.price || 500,
            sample_type: t.sample_type || 'Blood',
          })) : [{
            test_name: o.test_name || o.test_category || 'Lab Test',
            test_type: detectTestType(o.test_name),
            urgency: (o.priority || 'Routine').toLowerCase(),
            price: o.price || 500,
            sample_type: o.sample_type || 'Blood',
          }]
        }));
        setOrders(mapped);
      }
    } catch (error) {
      console.error('Error fetching lab orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const mapStatus = (s: string) => {
    const map: Record<string, string> = {
      Pending: 'active', Sample_Collected: 'active', In_Progress: 'active',
      Results_Entered: 'completed', Verified: 'completed', Delivered: 'completed', Cancelled: 'cancelled'
    };
    return map[s] || 'active';
  };

  const detectTestType = (name: string) =>
    ['mri', 'xray', 'x-ray', 'ct', 'scan', 'ultrasound'].some(kw => (name || '').toLowerCase().includes(kw)) ? 'radiology' : 'pathology';

  const getStatusColor = (s: string) => {
    if (s === 'active') return 'bg-blue-50 text-blue-600';
    if (s === 'completed') return 'bg-emerald-50 text-emerald-600';
    return 'bg-slate-50 text-slate-400';
  };

  const getStatusIcon = (s: string) => {
    if (s === 'active') return <Clock className="h-4 w-4" />;
    if (s === 'completed') return <CheckCircle className="h-4 w-4" />;
    return <XCircle className="h-4 w-4" />;
  };

  const getUrgencyColor = (u: string) => {
    if (u === 'stat') return 'bg-rose-100 text-rose-600';
    if (u === 'urgent') return 'bg-orange-100 text-orange-600';
    return 'bg-slate-100 text-slate-600';
  };

  const filtered = orders.filter(o => {
    const matchTab = activeTab === 'all' ? true : o.status === activeTab;
    const matchSearch = !searchQuery || o.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.patient_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.lab_tests?.some(t => t.test_name?.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchTab && matchSearch;
  });
  const activeCount = orders.filter(o => o.status === 'active').length;
  const completedCount = orders.filter(o => o.status === 'completed').length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* Premium Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex mb-8 items-center justify-between flex-wrap gap-6"
      >
        <div className="flex items-center gap-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/lab')}
            className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 p-0 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Lab Prescriptions</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Today's active & pending lab orders</p>
          </div>
        </div>
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
          <Input
            placeholder="Search patient or test..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 bg-white border-slate-200 rounded-2xl focus-visible:ring-2 focus-visible:ring-blue-500/20 shadow-sm"
          />
        </div>
      </motion.div>

      {/* Modern Tabs */}
      <div className="flex items-center gap-4 bg-slate-100/50 p-1.5 rounded-2xl w-fit">
        {[
          { id: 'all', label: 'All Orders', count: orders.length },
          { id: 'active', label: 'Active', count: activeCount },
          { id: 'completed', label: 'Completed', count: completedCount }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-md ring-1 ring-slate-200'
                : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
              }`}
          >
            {tab.label}
            <span className={`px-2 py-0.5 rounded-lg text-xs ${activeTab === tab.id ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Orders List */}
      <AnimatePresence mode="popLayout">
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <Card className="border-0 shadow-xl shadow-slate-200/40 rounded-[2.5rem] overflow-hidden bg-white">
              <CardContent className="text-center py-20">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="h-12 w-12 text-slate-300" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">No Lab Orders Found</h3>
                <p className="text-slate-400 font-medium max-w-xs mx-auto">We couldn't find any {activeTab !== 'all' ? activeTab : ''} lab orders for today.</p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filtered.map((order, idx) => (
              <motion.div
                key={order.order_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="border-0 shadow-xl shadow-slate-200/40 rounded-[2rem] overflow-hidden bg-white group hover:shadow-2xl hover:shadow-slate-200 transition-all duration-300">
                  <div className="p-8">
                    <div className="flex items-center justify-between flex-wrap gap-6 mb-8">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-200">
                          <Activity className="h-7 w-7" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-xl font-black text-slate-900">{order.order_id}</h3>
                            <Badge className={`rounded-lg px-2.5 py-1 ${getStatusColor(order.status)} border-0 font-bold text-[10px] tracking-widest`}>
                              {order.status.toUpperCase()}
                            </Badge>
                            <Badge className={`rounded-lg px-2.5 py-1 ${order.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} border-0 font-bold text-[10px] tracking-widest`}>
                              {order.payment_status === 'paid' ? 'PAID' : 'PENDING'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                            <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" />{order.patient_name} ({order.patient_id})</span>
                            <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{order.order_date}</span>
                          </div>
                        </div>
                      </div>

                      {order.status === 'active' && (
                        <div className="flex items-center gap-3">
                          {order.payment_status === 'pending' ? (
                            <Button
                              onClick={() => navigate('/lab/payments', { state: { patientId: order.patient_id, patientName: order.patient_name } })}
                              className="h-12 px-6 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-100 font-bold"
                            >
                              <CreditCard className="h-4 w-4 mr-2" />
                              Process Payment
                            </Button>
                          ) : (
                            <Button
                              onClick={() => navigate('/lab/samples', { state: { patientId: order.patient_id, patientName: order.patient_name } })}
                              className="h-12 px-6 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 font-bold"
                            >
                              <Droplet className="h-4 w-4 mr-2" />
                              Collect Sample
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">Requested Tests</h4>
                        <div className="grid gap-3">
                          {order.lab_tests.map((test, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:border-blue-100 transition-all group/test">
                              <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${test.test_type === 'pathology' ? 'bg-indigo-100 text-indigo-600 group-hover/test:bg-indigo-600 group-hover/test:text-white' : 'bg-cyan-100 text-cyan-600 group-hover/test:bg-cyan-600 group-hover/test:text-white'
                                  }`}>
                                  {test.test_type === 'pathology' ? <TestTube className="h-6 w-6" /> : <Microscope className="h-6 w-6" />}
                                </div>
                                <div>
                                  <p className="font-black text-slate-900">{test.test_name}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-tighter ${getUrgencyColor(test.urgency)} border-0`}>
                                      {test.urgency}
                                    </Badge>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type: {test.test_type}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right font-black text-slate-900">
                                <span className="text-[10px] text-slate-400 block mb-0.5">COST</span>
                                ₹{test.price.toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl shadow-slate-200">
                          <div className="flex justify-between items-center mb-6">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Order Summary</span>
                            <Badge className="bg-white/10 text-white border-0 font-bold">{order.lab_tests.length} Tests</Badge>
                          </div>
                          <div className="space-y-3">
                            <div className="flex justify-between text-slate-400 text-sm font-bold">
                              <span>Assigned Doctor</span>
                              <span className="text-white">Dr. {order.doctor_name}</span>
                            </div>
                            <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                              <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Total Billable</span>
                                <span className="text-2xl font-black">₹{order.lab_tests.reduce((s, t) => s + t.price, 0).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {order.notes && (
                          <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-8 h-8 rounded-lg bg-amber-200 flex items-center justify-center">
                                <FileText className="h-4 w-4 text-amber-700" />
                              </div>
                              <h4 className="text-xs font-black text-amber-900 uppercase tracking-widest">Clinical Notes</h4>
                            </div>
                            <p className="text-sm font-medium text-amber-800 leading-relaxed italic">"{order.notes}"</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
