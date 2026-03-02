import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, TestTube, Microscope, Play, CheckCircle2,
  Activity, User, Calendar, Loader2, Search
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface TestOrder {
  order_id: string;
  db_id: number;
  patient_id: string;
  patient_name: string;
  doctor_name: string;
  doctor_specialization: string;
  order_date: string;
  sample_collected_at: string;
  test_name: string;
  test_type: string;
  sample_type: string;
  priority: string;
  status: string;
}

interface ResultParam {
  parameter_name: string;
  result_value: string;
  unit: string;
  reference_range: string;
  status: string;
}

export default function TestProcessing() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<TestOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<TestOrder | null>(null);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ResultParam[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io(API_URL.replace('/api', ''), {
      reconnection: true,
      reconnectionDelay: 1000,
    });
    setSocket(newSocket);

    newSocket.on('connect', () => console.log('Test Processing Socket Connected'));

    const handleRefresh = () => fetchOrders();

    newSocket.on('lab:status_updated', (data) => {
      if (data.status === 'Sample_Collected') {
        handleRefresh();
        toast.info('🧪 New sample collected and ready for testing!');
      }
    });

    newSocket.on('lab:stats_updated', handleRefresh);

    fetchOrders();

    return () => {
      newSocket.close();
    };
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/lab/orders/ready-for-testing`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setOrders(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleStartTest = async (order: TestOrder) => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/lab/orders/${order.db_id}/status`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'In_Progress' })
      });
      if (res.ok) {
        toast.success('Test started');
        setSelectedOrder(order);
        // Initialize default parameters based on test name
        const defaultParams = getDefaultParams(order.test_name);
        setResults(defaultParams);
        setShowTestModal(true);
      } else toast.error('Failed to start test');
    } catch (e) { toast.error('Network error'); }
  };

  const getDefaultParams = (testName: string): ResultParam[] => {
    const lower = testName.toLowerCase();
    if (lower.includes('cbc') || lower.includes('blood count')) {
      return [
        { parameter_name: 'Hemoglobin', result_value: '', unit: 'g/dL', reference_range: '13.0-17.0', status: 'Normal' },
        { parameter_name: 'WBC Count', result_value: '', unit: 'cells/µL', reference_range: '4500-11000', status: 'Normal' },
        { parameter_name: 'RBC Count', result_value: '', unit: 'million/µL', reference_range: '4.5-5.5', status: 'Normal' },
        { parameter_name: 'Platelet Count', result_value: '', unit: 'lakhs/µL', reference_range: '1.5-4.0', status: 'Normal' },
        { parameter_name: 'Hematocrit', result_value: '', unit: '%', reference_range: '38-50', status: 'Normal' },
        { parameter_name: 'MCV', result_value: '', unit: 'fL', reference_range: '80-100', status: 'Normal' },
      ];
    }
    if (lower.includes('lipid')) {
      return [
        { parameter_name: 'Total Cholesterol', result_value: '', unit: 'mg/dL', reference_range: '<200', status: 'Normal' },
        { parameter_name: 'HDL Cholesterol', result_value: '', unit: 'mg/dL', reference_range: '>40', status: 'Normal' },
        { parameter_name: 'LDL Cholesterol', result_value: '', unit: 'mg/dL', reference_range: '<130', status: 'Normal' },
        { parameter_name: 'Triglycerides', result_value: '', unit: 'mg/dL', reference_range: '<150', status: 'Normal' },
        { parameter_name: 'VLDL', result_value: '', unit: 'mg/dL', reference_range: '5-40', status: 'Normal' },
      ];
    }
    if (lower.includes('thyroid') || lower.includes('tsh')) {
      return [
        { parameter_name: 'TSH', result_value: '', unit: 'mIU/L', reference_range: '0.4-4.0', status: 'Normal' },
        { parameter_name: 'T3', result_value: '', unit: 'ng/dL', reference_range: '80-200', status: 'Normal' },
        { parameter_name: 'T4', result_value: '', unit: 'µg/dL', reference_range: '5.0-12.0', status: 'Normal' },
      ];
    }
    if (lower.includes('liver') || lower.includes('lft')) {
      return [
        { parameter_name: 'SGPT (ALT)', result_value: '', unit: 'U/L', reference_range: '7-56', status: 'Normal' },
        { parameter_name: 'SGOT (AST)', result_value: '', unit: 'U/L', reference_range: '10-40', status: 'Normal' },
        { parameter_name: 'Bilirubin Total', result_value: '', unit: 'mg/dL', reference_range: '0.1-1.2', status: 'Normal' },
        { parameter_name: 'Alkaline Phosphatase', result_value: '', unit: 'U/L', reference_range: '44-147', status: 'Normal' },
        { parameter_name: 'Albumin', result_value: '', unit: 'g/dL', reference_range: '3.5-5.0', status: 'Normal' },
      ];
    }
    return [
      { parameter_name: 'Parameter 1', result_value: '', unit: '', reference_range: '', status: 'Normal' },
      { parameter_name: 'Parameter 2', result_value: '', unit: '', reference_range: '', status: 'Normal' },
    ];
  };

  const updateResult = (i: number, field: keyof ResultParam, value: string) => {
    setResults(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  };

  const addParameter = () => {
    setResults(prev => [...prev, { parameter_name: '', result_value: '', unit: '', reference_range: '', status: 'Normal' }]);
  };

  const submitResults = async () => {
    if (!selectedOrder) return;
    const empty = results.filter(r => !r.result_value.trim());
    if (empty.length > 0) { toast.error('Please fill all result values'); return; }

    setProcessing(true);
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/lab/results/${selectedOrder.db_id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ results, patient_id: selectedOrder.patient_id })
      });
      if (res.ok) {
        toast.success('✅ Results entered successfully! Order moved to Analysis.');
        setShowTestModal(false);
        setSelectedOrder(null);
        setResults([]);
        fetchOrders();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to submit results');
      }
    } catch (e) { toast.error('Network error'); }
    finally { setProcessing(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Premium Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex mb-12 items-center justify-between flex-wrap gap-8"
      >
        <div className="flex items-center gap-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/lab')}
            className="w-14 h-14 rounded-[1.5rem] bg-white shadow-xl shadow-slate-200/50 border border-slate-100 p-0 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all duration-300"
          >
            <ArrowLeft className="h-7 w-7" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Test Processing</h1>
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] ml-5">Laboratory Diagnostics — Phase 3</p>
          </div>
        </div>
        <div className="relative w-full md:w-[400px] group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors duration-300" />
          <Input
            placeholder="Search patient ID or test name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-14 h-16 bg-white border-slate-200 rounded-[2rem] focus-visible:ring-2 focus-visible:ring-blue-500/20 shadow-xl shadow-slate-200/40 border-0 transition-all duration-300 placeholder:text-slate-400 font-medium"
          />
        </div>
      </motion.div>

      <div className="grid gap-8">
        <AnimatePresence mode="popLayout">
          {orders.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-slate-100 shadow-sm"
            >
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8">
                <TestTube className="h-12 w-12 text-slate-300" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Queue is Empty</h3>
              <p className="text-slate-500 max-w-xs mx-auto font-medium">All collected samples have been successfully processed for today.</p>
            </motion.div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between px-4">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Ready for Diagnostics ({orders.length})
                </h2>
              </div>
              {orders.filter(o => !searchQuery || o.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) || o.patient_id?.toLowerCase().includes(searchQuery.toLowerCase()) || o.test_name?.toLowerCase().includes(searchQuery.toLowerCase())).map((order, idx) => (
                <motion.div
                  key={order.order_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="border-0 shadow-2xl shadow-slate-200/40 rounded-[2.5rem] overflow-hidden bg-white group hover:shadow-3xl transition-all duration-500 border-l-[6px] border-l-transparent hover:border-l-blue-600">
                    <CardContent className="p-10">
                      <div className="flex items-start justify-between flex-wrap gap-8">
                        <div className="flex-1 min-w-[300px]">
                          <div className="flex items-center gap-5 mb-6">
                            <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 ${order.test_type === 'pathology' ? 'bg-purple-100 text-purple-600 shadow-purple-100/50' : 'bg-blue-100 text-blue-600 shadow-blue-100/50'
                              }`}>
                              {order.test_type === 'pathology' ? <TestTube className="h-8 w-8" /> : <Microscope className="h-8 w-8" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{order.order_id}</h3>
                                <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 rounded-lg px-3 py-1 font-black text-[10px] tracking-widest uppercase shadow-sm">
                                  SAMPLE READY
                                </Badge>
                                <Badge variant="outline" className={`rounded-lg px-3 py-1 font-black text-[10px] tracking-widest uppercase ${order.priority === 'Stat' || order.priority === 'Urgent'
                                    ? 'bg-rose-50 text-rose-600 border-rose-100'
                                    : 'bg-slate-50 text-slate-500 border-slate-100'
                                  }`}>
                                  {order.priority}
                                </Badge>
                              </div>
                              <p className="text-xl font-black text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors duration-300">{order.test_name}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-6 border-t border-slate-50">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                                <User className="h-5 w-5 text-slate-400" />
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Patient Details</p>
                                <p className="text-sm font-bold text-slate-700">{order.patient_name} ({order.patient_id})</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                                <Activity className="h-5 w-5 text-slate-400" />
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Ordering Physician</p>
                                <p className="text-sm font-bold text-slate-700">Dr. {order.doctor_name}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Collection Status</p>
                                <p className="text-sm font-bold text-emerald-600">Sample Validated</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 min-w-[200px] justify-center h-full sm:pt-4 lg:pt-0">
                          <Button
                            onClick={() => handleStartTest(order)}
                            className="w-full bg-slate-900 text-white hover:bg-blue-600 h-16 rounded-2xl flex items-center justify-center gap-3 font-black text-sm shadow-xl shadow-slate-200 transition-all duration-300 hover:-translate-y-1 active:scale-95"
                          >
                            <Play className="h-5 w-5 fill-current" />
                            PROCESS TEST
                          </Button>
                          <div className="flex items-center justify-center gap-2 py-2">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">{order.order_date}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Modern Test Results Entry Modal */}
      <AnimatePresence>
        {showTestModal && selectedOrder && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl flex items-center justify-center z-[100] p-4 overflow-y-auto py-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 40 }}
              className="w-full max-w-5xl"
            >
              <Card className="border-0 shadow-3xl rounded-[3rem] overflow-hidden bg-white">
                <CardHeader className="p-10 pb-6 border-b-0 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <div className="bg-blue-600 w-16 h-16 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-200 group transition-transform hover:scale-110 duration-500">
                        <Activity className="h-8 w-8 text-white transition-transform group-hover:rotate-12" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">Test Results Protocol</h2>
                        <div className="flex items-center gap-3">
                          <Badge className="bg-blue-50 text-blue-600 border-0 rounded-lg px-2.5 py-1 font-black text-[10px] tracking-widest uppercase">
                            {selectedOrder.order_id}
                          </Badge>
                          <span className="text-slate-300">|</span>
                          <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{selectedOrder.test_name}</p>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => { setShowTestModal(false); setSelectedOrder(null); }}
                      className="w-12 h-12 rounded-full p-0 hover:bg-slate-100 flex items-center justify-center"
                    >
                      <ArrowLeft className="h-6 w-6 text-slate-400" />
                    </Button>
                  </div>

                  <div className="bg-slate-50 rounded-[2rem] p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 border border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                        <User className="h-5 w-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Subject</p>
                        <p className="text-sm font-bold text-slate-900">{selectedOrder.patient_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 border-l border-slate-200 pl-6 hidden md:flex">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                        <Microscope className="h-5 w-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Specimen</p>
                        <p className="text-sm font-bold text-slate-900">{selectedOrder.sample_type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 border-l border-slate-200 pl-6 hidden lg:flex">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                        <Calendar className="h-5 w-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Ready Date</p>
                        <p className="text-sm font-bold text-slate-900">{new Date().toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-10 pt-4 space-y-8">
                  <div className="grid gap-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                    <AnimatePresence mode="popLayout">
                      {results.map((r, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: i * 0.05 }}
                          className="group p-6 bg-white rounded-[2rem] border-2 border-slate-50 transition-all duration-300 hover:border-blue-100 hover:shadow-xl hover:shadow-blue-50/50"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                            <div className="md:col-span-4">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Parameter Name</label>
                              <Input
                                value={r.parameter_name}
                                onChange={e => updateResult(i, 'parameter_name', e.target.value)}
                                placeholder="Parameter"
                                className="h-12 bg-slate-50/50 border-0 rounded-2xl font-black text-slate-700 focus-visible:ring-2 focus-visible:ring-blue-500/20 px-5"
                              />
                            </div>
                            <div className="md:col-span-3">
                              <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 block ml-1 flex items-center gap-2">
                                Result Value
                                <div className="w-1 h-1 rounded-full bg-blue-600" />
                              </label>
                              <Input
                                value={r.result_value}
                                onChange={e => updateResult(i, 'result_value', e.target.value)}
                                placeholder="Value"
                                className="h-12 bg-white border-2 border-blue-50 rounded-2xl font-black text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-500/20 px-5 shadow-sm shadow-blue-50"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Unit</label>
                              <Input
                                value={r.unit}
                                onChange={e => updateResult(i, 'unit', e.target.value)}
                                placeholder="Unit"
                                className="h-12 bg-slate-50/50 border-0 rounded-2xl font-bold text-slate-600 focus-visible:ring-2 focus-visible:ring-blue-500/20 px-4"
                              />
                            </div>
                            <div className="md:col-span-3">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Clinical Status</label>
                              <div className="relative group/select">
                                <select
                                  value={r.status}
                                  onChange={e => updateResult(i, 'status', e.target.value)}
                                  className={`h-12 w-full appearance-none rounded-2xl px-5 text-sm font-black outline-none transition-all duration-300 ${r.status === 'Normal' ? 'bg-emerald-50 text-emerald-600 ring-0 hover:bg-emerald-100' :
                                      r.status === 'Abnormal' ? 'bg-amber-50 text-amber-600 ring-0 hover:bg-amber-100' :
                                        'bg-rose-50 text-rose-600 ring-0 hover:bg-rose-100'
                                    }`}
                                >
                                  <option value="Normal">Normal Range</option>
                                  <option value="Abnormal">Abnormal Entry</option>
                                  <option value="Critical">Critical Threshold</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-current opacity-50">
                                  <Activity className="h-4 w-4" />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-4">
                            <div className="flex items-center gap-2">
                              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Expected Reference:</p>
                              <p className="text-[10px] font-black text-slate-500">{r.reference_range || '--'}</p>
                            </div>
                            <div className="group-hover:opacity-100 opacity-0 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setResults(prev => prev.filter((_, idx) => idx !== i))}
                                className="h-8 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 font-black text-[10px] tracking-widest px-3"
                              >
                                REMOVE
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <Button
                      variant="outline"
                      onClick={addParameter}
                      className="flex-1 h-16 rounded-2xl border-2 border-dashed border-slate-100 text-slate-400 hover:border-blue-200 hover:text-blue-600 transition-all font-black uppercase tracking-widest text-[10px] bg-slate-50/30"
                    >
                      + Append Measurement Parameter
                    </Button>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 mt-8">
                    <Button
                      variant="ghost"
                      className="h-16 flex-1 rounded-2xl font-black text-slate-400 hover:text-slate-900 transition-all"
                      onClick={() => { setShowTestModal(false); setSelectedOrder(null); }}>
                      DISCARD CHANGES
                    </Button>
                    <Button
                      className="h-16 flex-[2] rounded-2xl bg-slate-900 hover:bg-blue-600 text-white font-black shadow-xl shadow-slate-200 transition-all duration-300 hover:-translate-y-1 active:scale-95 disabled:opacity-50"
                      onClick={submitResults}
                      disabled={processing}
                    >
                      {processing ? (
                        <><Loader2 className="h-5 w-5 animate-spin mr-3" /> ANALYZING...</>
                      ) : (
                        <><CheckCircle2 className="h-5 w-5 mr-3" /> COMMENCE ANALYSIS PROTOCOL</>
                      )}
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
