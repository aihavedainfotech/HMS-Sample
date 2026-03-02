import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Search, User, Calendar, Droplet, Loader2,
  CheckCircle2, AlertCircle, TestTube, Microscope
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface SampleOrder {
  order_id: string;
  db_id: number;
  patient_id: string;
  patient_name: string;
  doctor_name: string;
  doctor_specialization: string;
  order_date: string;
  test_name: string;
  test_type: 'pathology' | 'radiology';
  sample_type: string;
  status: string;
  collection_status: string;
  urgency: string;
  instructions: string;
  payment_status: string;
  collection_steps: { step_id: string; step_name: string; completed: boolean; completed_at?: string; completed_by?: string; }[];
}

export default function SampleCollection() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<SampleOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SampleOrder | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io(API_URL.replace('/api', ''), {
      reconnection: true,
      reconnectionDelay: 1000,
    });
    setSocket(newSocket);

    newSocket.on('connect', () => console.log('Sample Collection Socket Connected'));

    const handleRefresh = () => fetchSamples();

    newSocket.on('lab:order_received', (data) => {
      handleRefresh();
      toast.info(`🔬 New lab order available for ${data.patient_name}`);
    });

    newSocket.on('lab:payment_collected', (data) => {
      handleRefresh();
      toast.success(`💰 Payment received, sample ready for collection!`);
    });

    newSocket.on('lab:stats_updated', handleRefresh);

    if (location.state?.patientId) {
      setSearchQuery(location.state.patientId);
    }
    fetchSamples();

    return () => {
      newSocket.close();
    };
  }, []);

  const fetchSamples = async () => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/lab/orders/pending-samples`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (e) {
      console.error('Error fetching samples:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) { toast.error('Enter a Patient ID'); return; }
    setSearching(true);
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/patients/${searchQuery}/lab-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Found orders for ${data.patient?.name || searchQuery}`);
      } else {
        toast.error('No orders found');
      }
    } catch (e) { toast.error('Search failed'); }
    finally { setSearching(false); }
  };

  const handleCollectSample = (order: SampleOrder) => {
    setSelectedOrder(order);
    const idx = order.collection_steps.findIndex(s => !s.completed);
    setCurrentStep(idx >= 0 ? idx : order.collection_steps.length - 1);
    setShowModal(true);
  };

  const handleStepComplete = (idx: number) => {
    if (!selectedOrder) return;
    const steps = [...selectedOrder.collection_steps];
    steps[idx] = { ...steps[idx], completed: true, completed_at: new Date().toISOString(), completed_by: 'Lab Technician' };
    const updated = { ...selectedOrder, collection_steps: steps };
    setSelectedOrder(updated);
    setOrders(prev => prev.map(o => o.order_id === updated.order_id ? updated : o));

    if (steps.every(s => s.completed)) {
      completeCollection(updated);
    } else {
      setCurrentStep(idx + 1);
      toast.success(`Step ${idx + 1} completed`);
    }
  };

  const completeCollection = async (order: SampleOrder) => {
    setCompleting(true);
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/lab/orders/${order.db_id}/status`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Sample_Collected' })
      });
      if (res.ok) {
        toast.success('✅ Sample collection completed! Order moved to Testing.');
        setShowModal(false);
        setSelectedOrder(null);
        setCurrentStep(0);
        fetchSamples(); // Refresh to remove completed order
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update order');
      }
    } catch (e) {
      toast.error('Network error');
    } finally {
      setCompleting(false);
    }
  };

  const getTestIcon = (t: string) =>
    t === 'pathology' ? <TestTube className="h-5 w-5 text-purple-600" /> : <Microscope className="h-5 w-5 text-blue-600" />;

  const getUrgencyColor = (u: string) => {
    if (u === 'stat') return 'bg-rose-50 text-rose-600';
    if (u === 'urgent') return 'bg-orange-50 text-orange-600';
    return 'bg-slate-50 text-slate-400';
  };

  const filtered = orders.filter(o =>
    !searchQuery || o.patient_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.patient_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Sample Collection</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Manage laboratory samples & collection workflow</p>
          </div>
        </div>
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
          <Input
            placeholder="Search patient ID or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-12 h-12 bg-white border-slate-200 rounded-2xl focus-visible:ring-2 focus-visible:ring-blue-500/20 shadow-sm"
          />
        </div>
      </motion.div>

      <div className="space-y-6">
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
                    <Droplet className="h-12 w-12 text-slate-300" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2">No Samples Pending</h3>
                  <p className="text-slate-400 font-medium max-w-xs mx-auto">All paid orders have been collected, or no paid orders are available today.</p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            filtered.map((order, idx) => (
              <motion.div
                key={order.order_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="border-0 shadow-xl shadow-slate-200/40 rounded-[2rem] overflow-hidden bg-white group hover:shadow-2xl transition-all duration-300">
                  <CardContent className="p-8">
                    <div className="flex items-start justify-between flex-wrap gap-6">
                      <div className="flex-1 min-w-[280px]">
                        <div className="flex items-center gap-4 mb-4">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${order.test_type === 'pathology' ? 'bg-purple-100 text-purple-600 shadow-purple-100' : 'bg-blue-100 text-blue-600 shadow-blue-100'
                            }`}>
                            {getTestIcon(order.test_type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-xl font-black text-slate-900">{order.order_id}</h3>
                              <Badge className={`rounded-lg px-2.5 py-1 ${order.collection_status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'} border-0 font-bold text-[10px] tracking-widest`}>
                                {order.collection_status === 'completed' ? 'COLLECTED' : 'PENDING COLLECTION'}
                              </Badge>
                              <Badge variant="outline" className={`rounded-lg px-2.5 py-1 ${getUrgencyColor(order.urgency)} border-0 font-bold text-[10px] tracking-widest uppercase`}>
                                {order.urgency}
                              </Badge>
                            </div>
                            <p className="text-lg font-black text-slate-800">{order.test_name}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                          <div className="space-y-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Details</span>
                            <div className="flex items-center gap-2 font-bold text-slate-700">
                              <User className="h-4 w-4 text-slate-400" />
                              {order.patient_name}
                              <span className="text-slate-300">({order.patient_id})</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Requested on</span>
                            <div className="flex items-center gap-2 font-bold text-slate-700">
                              <Calendar className="h-4 w-4 text-slate-400" />
                              {order.order_date}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Specimen Type</span>
                            <div className="flex items-center gap-2 font-bold text-slate-700">
                              <Droplet className="h-4 w-4 text-blue-500" />
                              {order.sample_type || 'N/A'}
                            </div>
                          </div>
                        </div>

                        {order.instructions && (
                          <div className="mt-6 p-4 bg-amber-50/50 rounded-2xl border border-amber-100 flex gap-3">
                            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="text-sm">
                              <span className="font-black text-amber-900 uppercase tracking-tighter text-[10px] block mb-1">Collection Instructions</span>
                              <p className="text-amber-800 font-medium">{order.instructions}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-center gap-3">
                        {order.collection_status === 'completed' ? (
                          <div className="bg-emerald-50 rounded-2xl p-6 flex flex-col items-center justify-center min-w-[140px] border border-emerald-100">
                            <CheckCircle2 className="h-10 w-10 text-emerald-600 mb-2" />
                            <p className="text-sm font-black text-emerald-600 uppercase tracking-widest">Done</p>
                          </div>
                        ) : (
                          <Button
                            onClick={() => {
                              if (order.payment_status !== 'paid') {
                                toast.warning(`Payment pending for ${order.patient_name}`);
                                navigate('/lab/payments', { state: { patientId: order.patient_id } });
                                return;
                              }
                              handleCollectSample(order);
                            }}
                            className={`h-24 px-8 rounded-3xl flex flex-col gap-2 transition-all shadow-xl font-black uppercase tracking-widest text-[10px] w-full min-w-[160px] ${order.payment_status !== 'paid'
                                ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-rose-100'
                                : 'bg-slate-900 text-white hover:bg-blue-600 shadow-slate-200'
                              }`}
                          >
                            {order.payment_status !== 'paid' ? <AlertCircle className="h-8 w-8" /> : <Droplet className="h-8 w-8" />}
                            {order.payment_status !== 'paid' ? 'Payment Reqd' : 'Collect Sample'}
                          </Button>
                        )}
                        <Badge className={`rounded-full px-4 py-1.5 ${order.payment_status === 'paid' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'} border-0 font-black text-[10px] tracking-widest shadow-lg`}>
                          {order.payment_status === 'paid' ? 'PAID' : 'UNPAID'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Collection Modal Overlay */}
      <AnimatePresence>
        {showModal && selectedOrder && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto pt-20 pb-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="w-full max-w-2xl"
            >
              <Card className="border-0 shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
                <CardHeader className="p-8 pb-0 border-b-0">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight">Collection Protocol</h2>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                        {selectedOrder.patient_name} — {selectedOrder.test_name}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => { setShowModal(false); setSelectedOrder(null); }}
                      className="w-10 h-10 rounded-full p-0 hover:bg-slate-100"
                    >
                      <CheckCircle2 className="h-6 w-6 text-slate-400" />
                    </Button>
                  </div>

                  {/* High fidelity progress tracker */}
                  <div className="space-y-4 mb-8">
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                      <motion.div
                        className="h-full bg-blue-600 shadow-lg shadow-blue-200"
                        initial={{ width: 0 }}
                        animate={{ width: `${(selectedOrder.collection_steps.filter(s => s.completed).length / selectedOrder.collection_steps.length) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <span>Protocol Initialization</span>
                      <span className="text-blue-600">
                        {selectedOrder.collection_steps.filter(s => s.completed).length}/{selectedOrder.collection_steps.length} Steps Validated
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-8 pt-0">
                  <div className="space-y-3 mb-8 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {selectedOrder.collection_steps.map((step, i) => (
                      <motion.div
                        key={step.step_id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={`group flex items-center gap-4 p-5 rounded-2xl border transition-all ${step.completed
                            ? 'bg-emerald-50/50 border-emerald-100'
                            : i === currentStep
                              ? 'bg-white border-blue-200 shadow-xl shadow-blue-50 ring-1 ring-blue-100'
                              : 'bg-slate-50 border-slate-100 opacity-50'
                          }`}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black transition-all ${step.completed
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100'
                            : i === currentStep
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                              : 'bg-slate-200 text-slate-400'
                          }`}>
                          {step.completed ? <CheckCircle2 className="h-6 w-6" /> : i + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className={`font-black tracking-tight ${step.completed ? 'text-emerald-900' : 'text-slate-900'}`}>
                            {step.step_name}
                          </h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            {step.completed ? `Verified by ${step.completed_by} at ${new Date(step.completed_at!).toLocaleTimeString()}` : 'Awaiting Validation'}
                          </p>
                        </div>
                        {i === currentStep && !step.completed && (
                          <Button
                            onClick={() => handleStepComplete(i)}
                            disabled={completing}
                            className="bg-slate-900 text-white hover:bg-blue-600 rounded-xl px-6 font-bold shadow-lg shadow-slate-200"
                          >
                            Validate
                          </Button>
                        )}
                      </motion.div>
                    ))}
                  </div>

                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      className="flex-1 h-14 rounded-2xl border-slate-200 font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all"
                      onClick={() => { setShowModal(false); setSelectedOrder(null); }}
                    >
                      Suspend Protocol
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
