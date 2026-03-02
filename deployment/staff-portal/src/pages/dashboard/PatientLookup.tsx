import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  ArrowLeft,
  FileText,
  CreditCard,
  TestTube,
  Microscope,
  Stethoscope,
  Download,
  Play,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface Patient {
  patient_id: string;
  name: string;
  age: number;
  gender: string;
  blood_type: string;
  last_visit: string;
  attending_doctor: string;
  doctor_specialization: string;
  pathologist: string;
  payment_status: 'paid' | 'pending';
  lab_orders: LabOrder[];
}

interface LabOrder {
  order_id: string;
  db_id: number;
  patient_id: string;
  test_name: string;
  test_type: 'pathology' | 'radiology';
  status: 'pending' | 'sample_collected' | 'in_progress' | 'completed' | 'cancelled';
  order_date: string;
  doctor_name: string;
  payment_status: 'paid' | 'pending';
  priority?: string;
}

export default function PatientLookup() {
  const navigate = useNavigate();
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientOrders, setPatientOrders] = useState<LabOrder[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed'>('all');
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io(API_URL.replace('/api', ''), {
      reconnection: true,
      reconnectionDelay: 1000,
    });
    setSocket(newSocket);

    const handleRefresh = () => {
      if (searchQuery && selectedPatient) {
        handleSearch();
      }
    };

    newSocket.on('lab:order_received', handleRefresh);
    newSocket.on('lab:status_updated', handleRefresh);
    newSocket.on('lab:payment_collected', handleRefresh);
    newSocket.on('lab:stats_updated', handleRefresh);

    return () => {
      newSocket.close();
    };
  }, [searchQuery, !!selectedPatient]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a Patient ID');
      return;
    }

    setSearching(true);
    try {
      const token = localStorage.getItem('hms_staff_token');

      const patientResponse = await fetch(`${API_URL}/patients/${searchQuery.trim()}/lab-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (patientResponse.ok) {
        const patientData = await patientResponse.json();
        setSelectedPatient(patientData);
        setPatientOrders(patientData.lab_orders || []);

        if (patientData.lab_orders?.length > 0) {
          toast.success(`Found ${patientData.lab_orders.length} lab order(s) for ${patientData.name}`);
        } else {
          toast.info(`Patient found: ${patientData.name} — No lab orders`);
        }
      } else if (patientResponse.status === 404) {
        toast.error('Patient not found. Check the Patient ID.');
        setSelectedPatient(null);
        setPatientOrders([]);
      } else {
        toast.error('Error searching patient');
      }
    } catch (error) {
      console.error('Error searching:', error);
      toast.error('Network error while searching');
    } finally {
      setSearching(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'sample_collected': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-orange-100 text-orange-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'in_progress': return <Play className="h-4 w-4 text-blue-600" />;
      case 'sample_collected': return <TestTube className="h-4 w-4 text-yellow-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-orange-600" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getNextAction = (order: LabOrder) => {
    if (order.payment_status === 'pending') {
      return {
        label: 'Pay First',
        icon: <CreditCard className="h-4 w-4" />,
        onClick: () => navigate('/lab/payments', { state: { patientId: order.patient_id, patientName: selectedPatient?.name } }),
        variant: 'destructive' as const,
      };
    }
    switch (order.status) {
      case 'pending':
        return {
          label: 'Collect Sample',
          icon: <TestTube className="h-4 w-4" />,
          onClick: () => navigate('/lab/samples', { state: { patientId: order.patient_id, patientName: selectedPatient?.name } }),
          variant: 'default' as const,
        };
      case 'sample_collected':
        return {
          label: 'Run Test',
          icon: <Microscope className="h-4 w-4" />,
          onClick: () => navigate('/lab/processing', { state: { patientId: order.patient_id, patientName: selectedPatient?.name } }),
          variant: 'default' as const,
        };
      case 'in_progress':
        return {
          label: 'Enter Results',
          icon: <FileText className="h-4 w-4" />,
          onClick: () => navigate('/lab/processing', { state: { patientId: order.patient_id, patientName: selectedPatient?.name } }),
          variant: 'default' as const,
        };
      case 'completed':
        return {
          label: 'Download Report',
          icon: <Download className="h-4 w-4" />,
          onClick: () => handleDownloadReport(order),
          variant: 'outline' as const,
        };
      default:
        return null;
    }
  };

  const handleDownloadReport = (order: LabOrder) => {
    const reportContent = `
<!DOCTYPE html>
<html><head><title>Lab Report - ${order.order_id}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: auto; }
  .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
  .header h1 { color: #1a56db; margin: 0; }
  .header p { color: #666; margin: 5px 0; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
  .info-item { padding: 8px; background: #f8f9fa; border-radius: 4px; }
  .info-item label { font-weight: bold; color: #333; display: block; font-size: 12px; }
  .info-item span { color: #666; }
  .test-info { background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0; }
  .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 12px; }
  @media print { body { padding: 20px; } }
</style></head><body>
<div class="header">
  <h1>🏥 CityCare Hospital</h1>
  <p>Laboratory Report</p>
</div>
<div class="info-grid">
  <div class="info-item"><label>Patient ID</label><span>${order.patient_id}</span></div>
  <div class="info-item"><label>Patient Name</label><span>${selectedPatient?.name || 'N/A'}</span></div>
  <div class="info-item"><label>Order ID</label><span>${order.order_id}</span></div>
  <div class="info-item"><label>Order Date</label><span>${order.order_date}</span></div>
  <div class="info-item"><label>Doctor</label><span>${order.doctor_name}</span></div>
  <div class="info-item"><label>Status</label><span>${order.status.toUpperCase()}</span></div>
</div>
<div class="test-info">
  <h3>Test: ${order.test_name}</h3>
  <p>Type: ${order.test_type === 'pathology' ? 'Pathology' : 'Radiology'}</p>
  <p>Priority: ${order.priority || 'Routine'}</p>
</div>
<div class="footer">
  <p>Generated on ${new Date().toLocaleString()} | CityCare Hospital Laboratory</p>
  <p>This is a computer-generated report. No signature required.</p>
</div>
</body></html>`;

    const blob = new Blob([reportContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Lab_Report_${order.order_id}_${order.patient_id}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report downloaded successfully');
  };

  const handleDownloadInvoice = (order: LabOrder) => {
    const invoiceContent = `
<!DOCTYPE html>
<html><head><title>Payment Invoice - ${order.order_id}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: auto; }
  .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
  .header h1 { color: #1a56db; margin: 0; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
  .info-item { padding: 8px; background: #f8f9fa; border-radius: 4px; }
  .info-item label { font-weight: bold; color: #333; display: block; font-size: 12px; }
  .amount { text-align: center; padding: 20px; background: #d4edda; border-radius: 8px; margin: 20px 0; }
  .amount h2 { color: #155724; margin: 0; }
  .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 12px; }
  @media print { body { padding: 20px; } }
</style></head><body>
<div class="header">
  <h1>🏥 CityCare Hospital</h1>
  <p>Payment Invoice</p>
</div>
<div class="info-grid">
  <div class="info-item"><label>Patient ID</label><span>${order.patient_id}</span></div>
  <div class="info-item"><label>Patient Name</label><span>${selectedPatient?.name || 'N/A'}</span></div>
  <div class="info-item"><label>Order ID</label><span>${order.order_id}</span></div>
  <div class="info-item"><label>Date</label><span>${order.order_date}</span></div>
  <div class="info-item"><label>Test</label><span>${order.test_name}</span></div>
  <div class="info-item"><label>Payment Status</label><span>${order.payment_status === 'paid' ? 'PAID ✅' : 'PENDING ⏳'}</span></div>
</div>
<div class="amount">
  <h2>Amount: ₹500.00</h2>
  <p>Payment Status: ${order.payment_status === 'paid' ? 'PAID' : 'PENDING'}</p>
</div>
<div class="footer">
  <p>Generated on ${new Date().toLocaleString()} | CityCare Hospital</p>
</div>
</body></html>`;

    const blob = new Blob([invoiceContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice_${order.order_id}_${order.patient_id}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Invoice downloaded successfully');
  };

  const filteredOrders = patientOrders.filter(order => {
    if (activeTab === 'pending') return ['pending', 'sample_collected', 'in_progress'].includes(order.status);
    if (activeTab === 'completed') return order.status === 'completed';
    return true;
  });

  const pendingCount = patientOrders.filter(o => ['pending', 'sample_collected', 'in_progress'].includes(o.status)).length;
  const completedCount = patientOrders.filter(o => o.status === 'completed').length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* Premium Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-6"
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
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Patient Lookup</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Search records & laboratory history</p>
          </div>
        </div>
      </motion.div>

      {/* Premium Search Bar */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-0 shadow-xl shadow-slate-200/40 rounded-[2.5rem] overflow-hidden bg-white">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                <Input
                  placeholder="Enter Patient ID (e.g. P0007)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                  className="pl-12 h-14 bg-slate-50 border-0 rounded-2xl focus-visible:ring-2 focus-visible:ring-blue-500/20 text-lg font-medium shadow-inner"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={searching}
                className="h-14 px-10 bg-slate-900 text-white rounded-2xl hover:bg-blue-600 transition-all shadow-lg hover:shadow-blue-200 font-bold text-lg"
              >
                {searching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5 mr-2" />}
                {searching ? 'Finding...' : 'Search Patient'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Search Results */}
      {selectedPatient && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-8"
        >
          {/* Enhanced Patient Details */}
          <Card className="border-0 shadow-xl shadow-slate-200/40 rounded-[2.5rem] overflow-hidden bg-white">
            <CardContent className="p-8">
              <div className="flex flex-col lg:flex-row justify-between gap-8">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center">
                      <User className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">{selectedPatient.name}</h2>
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">PATIENT ID: {selectedPatient.patient_id}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                    {[
                      { label: 'Age', value: `${selectedPatient.age} yrs` },
                      { label: 'Gender', value: selectedPatient.gender },
                      { label: 'Blood Type', value: selectedPatient.blood_type || 'N/A' },
                      { label: 'Last Visit', value: selectedPatient.last_visit || 'Today' },
                    ].map((item) => (
                      <div key={item.label} className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{item.label}</p>
                        <p className="text-sm font-bold text-slate-700">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row lg:flex-col gap-4 min-w-[280px]">
                  <div className={`p-4 rounded-2xl border flex items-center justify-between ${selectedPatient.payment_status === 'paid' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                    <div className="flex items-center gap-3">
                      {selectedPatient.payment_status === 'paid' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                      <span className="font-bold text-sm uppercase tracking-wider">Payment Status</span>
                    </div>
                    <Badge className={selectedPatient.payment_status === 'paid' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}>
                      {selectedPatient.payment_status === 'paid' ? 'CLEARED' : 'PENDING'}
                    </Badge>
                  </div>

                  <div className="bg-slate-900 p-4 rounded-2xl text-white flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Primary Doctor</p>
                      <p className="text-sm font-bold">Dr. {selectedPatient.attending_doctor}</p>
                    </div>
                    <Stethoscope className="h-5 w-5 text-blue-400" />
                  </div>
                </div>
              </div>

              {/* Quick Action Pills */}
              <div className="mt-8 pt-8 border-t border-slate-100 flex flex-wrap gap-4">
                <p className="w-full text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Operational Shortcuts</p>
                <Button onClick={() => navigate('/lab/prescriptions', { state: { patientId: selectedPatient.patient_id } })} variant="outline" className="rounded-xl font-bold gap-2">
                  <FileText className="h-4 w-4 text-blue-600" /> Prescriptions
                </Button>
                <Button onClick={() => navigate('/lab/payments', { state: { patientId: selectedPatient.patient_id, patientName: selectedPatient.name } })} variant="outline" className="rounded-xl font-bold gap-2">
                  <CreditCard className="h-4 w-4 text-emerald-600" /> Billing
                </Button>
                <Button onClick={() => navigate('/lab/samples', { state: { patientId: selectedPatient.patient_id, patientName: selectedPatient.name } })} variant="outline" className="rounded-xl font-bold gap-2">
                  <TestTube className="h-4 w-4 text-orange-600" /> Sample Collection
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Premium Lab Orders List */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-4">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Laboratory Orders ({patientOrders.length})</h3>
              <div className="flex p-1 bg-slate-100 rounded-xl">
                {['all', 'pending', 'completed'].map((tab) => (
                  <Button
                    key={tab}
                    variant="ghost"
                    size="sm"
                    className={`rounded-lg px-4 font-bold text-xs uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                    onClick={() => setActiveTab(tab as any)}
                  >
                    {tab}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              <AnimatePresence mode="popLayout">
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order, idx) => {
                    const nextAction = getNextAction(order);
                    return (
                      <motion.div
                        key={order.order_id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <Card className="group border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all rounded-[2rem] overflow-hidden bg-white">
                          <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                              <div className="flex items-center gap-5">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${order.test_type === 'pathology' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                                  {order.test_type === 'pathology' ? <TestTube className="h-7 w-7" /> : <Microscope className="h-7 w-7" />}
                                </div>
                                <div>
                                  <div className="flex items-center gap-3 mb-1">
                                    <h4 className="font-bold text-lg text-slate-900">{order.test_name}</h4>
                                    <Badge className={`${getStatusColor(order.status)} border-0 rounded-lg px-2 py-0.5 text-[10px] font-black`}>
                                      {order.status.replace('_', ' ').toUpperCase()}
                                    </Badge>
                                    {order.payment_status === 'pending' && (
                                      <Badge className="bg-red-50 text-red-600 border-0 rounded-lg px-2 py-0.5 text-[10px] font-black animate-pulse">
                                        PAYMENT OVERDUE
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm font-medium text-slate-400">
                                    {order.order_id} • {order.order_date} • Dr. {order.doctor_name}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 ml-14 md:ml-0">
                                {order.status === 'completed' && (
                                  <Button variant="ghost" size="sm" onClick={() => handleDownloadInvoice(order)} className="rounded-xl font-bold h-11 px-6 border border-slate-100 hover:bg-slate-50">
                                    <Download className="h-4 w-4 mr-2" /> Invoice
                                  </Button>
                                )}
                                {nextAction && (
                                  <Button
                                    variant={nextAction.variant === 'destructive' ? 'destructive' : 'default'}
                                    onClick={nextAction.onClick}
                                    className={`h-11 px-8 rounded-xl font-bold transition-all shadow-lg ${nextAction.variant !== 'destructive' ? 'bg-slate-900 hover:bg-blue-600 shadow-blue-500/10' : ''}`}
                                  >
                                    {nextAction.icon}
                                    <span className="ml-2">{nextAction.label}</span>
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-20 text-center"
                  >
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                      <FileText className="h-10 w-10 text-slate-300" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-400">No matching laboratory orders</h4>
                    <p className="text-sm text-slate-300">Try searching with a different criteria</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
