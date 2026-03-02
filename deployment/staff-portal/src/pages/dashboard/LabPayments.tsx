import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, User, Calendar, CreditCard, Smartphone, Building,
  Wallet, CheckCircle, AlertCircle, DollarSign, Printer, Download, X, QrCode, Search,
  RefreshCw, TrendingUp, History
} from 'lucide-react';
import { toast } from 'sonner';
import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin.replace('5173', '5000').replace('5174', '5000');

interface PendingPayment {
  payment_id: string;
  payment_db_id: number;
  patient_id: string;
  patient_name: string;
  order_id: string;
  order_description: string;
  test_name: string;
  doctor_name: string;
  amount: number;
  status: 'pending';
  created_date: string;
}

interface CompletedPayment {
  collection_id: number;
  payment_id: number;
  patient_id: string;
  patient_name: string;
  amount: number;
  method: string;
  transaction_id: string;
  collected_by: string;
  collected_at: string;
  description: string;
  status: 'paid';
}

export default function LabPayments() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [completedPayments, setCompletedPayments] = useState<CompletedPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [transactionId, setTransactionId] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showInvoice, setShowInvoice] = useState<CompletedPayment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchPayments = useCallback(async (showToast = false) => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/lab/payments/today`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPendingPayments(data.pending || []);
        setCompletedPayments(data.completed || []);
        if (showToast) toast.success('Payment list updated');
      } else {
        toast.error('Failed to fetch payments');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();

    const socket = io(SOCKET_URL, {
      auth: { token: localStorage.getItem('hms_staff_token') },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      timeout: 10000
    });

    socket.on('connect', () => console.log('Connected to Lab Payments Socket'));
    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      // Fallback to polling if websocket fails
      if (socket.io.opts.transports![0] === 'websocket') {
        socket.io.opts.transports = ['polling', 'websocket'];
      }
    });

    socket.on('lab:order_received', (data) => {
      fetchPayments();
      toast.info(`🔬 New lab order for ${data.patient_name}. Payment pending.`);
    });

    socket.on('lab:payment_collected', (data) => {
      fetchPayments();
      if (activeTab === 'pending') {
        toast.success(`💰 Payment of ₹${data.amount} collected for ${data.order_id || 'order'}`);
      }
    });

    socket.on('lab:stats_updated', () => fetchPayments());

    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('lab:order_received');
      socket.off('lab:payment_collected');
      socket.off('lab:stats_updated');
      socket.disconnect();
    };
  }, [fetchPayments, activeTab]);

  const handlePayment = (p: PendingPayment) => {
    setSelectedPayment(p);
    setPaymentMethod('Cash');
    setTransactionId('');
    setShowPayModal(true);
  };

  const processPayment = async () => {
    if (!selectedPayment) return;
    if (paymentMethod === 'UPI' && !transactionId.trim()) {
      toast.error('Please enter UPI Transaction ID');
      return;
    }
    setProcessing(true);
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/lab/payments/collect`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_db_id: selectedPayment.payment_db_id,
          method: paymentMethod,
          transaction_id: transactionId || `TXN-${Date.now()}`
        })
      });
      if (res.ok) {
        toast.success('Payment collected successfully!');
        setShowPayModal(false);
        setSelectedPayment(null);
        fetchPayments();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Payment failed');
      }
    } catch (e) {
      toast.error('Network error');
    } finally {
      setProcessing(false);
    }
  };

  const generateInvoiceHTML = (p: CompletedPayment | PendingPayment, isPaid: boolean) => `
<!DOCTYPE html><html><head><title>Invoice</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; max-width: 800px; margin: auto; color: #333; }
  .header { text-align: center; border-bottom: 3px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; }
  .header h1 { color: #4f46e5; font-size: 28px; }
  .header p { color: #666; margin-top: 5px; }
  .invoice-meta { display: flex; justify-content: space-between; margin-bottom: 30px; }
  .invoice-meta div { flex: 1; }
  .invoice-meta label { font-weight: 600; color: #555; display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
  .invoice-meta span { font-size: 14px; font-weight: 500; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th { background: #f8fafc; padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0; font-size: 12px; text-transform: uppercase; color: #64748b; }
  td { padding: 15px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
  .total-row { background: #fdfdfd; font-weight: bold; font-size: 17px; }
  .total-row td { border-top: 2px solid #4f46e5; color: #1e1b4b; }
  .badge { display: inline-block; padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
  .badge-paid { background: #dcfce7; color: #166534; }
  .badge-pending { background: #fef3c7; color: #92400e; }
  .footer { text-align: center; margin-top: 50px; padding-top: 20px; border-top: 1px solid #f1f5f9; color: #94a3b8; font-size: 11px; }
  @media print { body { padding: 20px; } .header { margin-bottom: 20px; } }
</style></head><body>
<div class="header">
  <h1>CityCare LDIMS</h1>
  <p>Premium Laboratory Information Management System</p>
  <p>123 Medical Avenue, Healthcare City - 500001</p>
  <p style="margin-top:15px;font-size:18px;font-weight:700;letter-spacing:1px;color:#1e293b;">LABORATORY BILL / RECEIPT</p>
</div>
<div class="invoice-meta">
  <div><label>Invoice No</label><span>INV-${Date.now().toString(36).toUpperCase()}</span></div>
  <div><label>Date</label><span>${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
  <div><label>Patient ID</label><span>${p.patient_id}</span></div>
  <div><label>Patient Name</label><span>${p.patient_name}</span></div>
</div>
<table>
  <thead><tr><th>#</th><th>Description</th><th>Amount (₹)</th></tr></thead>
  <tbody>
    <tr><td>1</td><td>${'description' in p ? p.description : p.order_description || p.test_name}</td><td>₹${p.amount.toFixed(2)}</td></tr>
    <tr class="total-row"><td colspan="2">GRAND TOTAL</td><td>₹${p.amount.toFixed(2)}</td></tr>
  </tbody>
</table>
<div style="margin-top:20px; display: flex; align-items: center; justify-content: space-between;">
  <div>
    <p style="font-size:12px; color:#64748b; margin-bottom:5px;">PAYMENT STATUS</p>
    <span class="badge ${isPaid ? 'badge-paid' : 'badge-pending'}">${isPaid ? '✅ PAID & CONFIRMED' : '⏳ PAYMENT PENDING'}</span>
  </div>
  <div style="text-align:right">
    ${'method' in p ? `<p style="font-size:14px; color:#1e293b;">Method: <strong>${(p as CompletedPayment).method}</strong></p>` : ''}
    ${'collected_at' in p ? `<p style="font-size:12px; color:#64748b;">Time: ${new Date((p as CompletedPayment).collected_at).toLocaleTimeString('en-IN')}</p>` : ''}
  </div>
</div>
<div class="footer">
  <p>CityCare Hospital & Research Centre</p>
  <p>Quality Healthcare for a Better Life</p>
  <p style="margin-top:10px;">This is a digitally generated invoice, valid without a physical signature.</p>
</div>
</body></html>`;

  const handleDownloadInvoice = (p: CompletedPayment) => {
    const html = generateInvoiceHTML(p, true);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice_${p.patient_id}_${p.collection_id}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Invoice downloaded');
  };

  const handlePrintInvoice = (p: CompletedPayment) => {
    const html = generateInvoiceHTML(p, true);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
        win.close();
      }, 500);
    }
  };

  const generateUPIQR = (amount: number) => {
    const upiString = `upi://pay?pa=citycarehospital@upi&pn=CityCare Hospital&am=${amount}&cu=INR&tn=Lab Test Payment`;
    return (
      <div className="text-center space-y-4 py-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mx-auto w-56 h-56 bg-white border-4 border-indigo-50 shadow-inner rounded-3xl flex flex-col items-center justify-center p-6"
        >
          <QrCode className="h-32 w-32 text-indigo-600 mb-2" />
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Scan with any UPI App</p>
        </motion.div>
        <div className="space-y-1">
          <p className="text-2xl font-black text-indigo-600">₹{amount.toFixed(2)}</p>
          <p className="text-xs text-gray-500 font-medium">UPI ID: <span className="text-black font-bold">citycarehospital@upi</span></p>
        </div>
      </div>
    );
  };

  const methods = [
    { id: 'Cash', icon: <Wallet className="h-5 w-5" />, label: 'Cash', color: 'bg-green-50 text-green-700 border-green-200' },
    { id: 'Card', icon: <CreditCard className="h-5 w-5" />, label: 'Card', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { id: 'UPI', icon: <Smartphone className="h-5 w-5" />, label: 'UPI QR', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { id: 'Insurance', icon: <Building className="h-5 w-5" />, label: 'Insurance', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  ];

  const filteredPending = pendingPayments.filter(p =>
    !searchQuery ||
    p.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.patient_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.order_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCompleted = completedPayments.filter(c =>
    !searchQuery ||
    c.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.patient_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
      <RefreshCw className="h-12 w-12 text-indigo-600 animate-spin" />
      <p className="text-gray-500 font-medium animate-pulse">Synchronizing Laboratory Ledger...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Premium Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center justify-between flex-wrap gap-6 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100"
      >
        <div className="flex items-center gap-6">
          <motion.button
            whileHover={{ x: -5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/lab')}
            className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
          >
            <ArrowLeft className="h-6 w-6" />
          </motion.button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Lab Payments</h1>
            <div className="flex items-center gap-2 text-slate-500 font-medium">
              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
              Real-time Billing Console
            </div>
          </div>
        </div>
        <div className="relative group w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
          <Input
            placeholder="Search by Patient ID, Name or Order #..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-12 h-14 bg-slate-50 border-0 rounded-2xl focus-visible:ring-2 focus-visible:ring-indigo-500/20 text-lg font-medium shadow-inner"
          />
        </div>
      </motion.div>

      {/* Modern Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Pending Dues', value: pendingPayments.length, icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50', gradient: 'from-orange-50/50 to-orange-100/50' },
          { label: 'Collected Today', value: completedPayments.length, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', gradient: 'from-emerald-50/50 to-emerald-100/50' },
          { label: 'Daily Revenue', value: `₹${completedPayments.reduce((s, c) => s + c.amount, 0).toLocaleString()}`, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50', gradient: 'from-indigo-50/50 to-indigo-100/50' },
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className={`overflow-hidden border-0 shadow-xl shadow-slate-200/40 rounded-[2.5rem] bg-gradient-to-br ${stat.gradient}`}>
              <CardContent className="p-8 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
                  <p className="text-4xl font-black text-slate-900">{stat.value}</p>
                </div>
                <div className={`h-16 w-16 ${stat.bg} ${stat.color} rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-black/5`}>
                  <stat.icon className="h-8 w-8" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div className="flex p-1.5 bg-slate-100/80 backdrop-blur-md rounded-[1.5rem] w-fit border border-white/50 shadow-sm">
        <Button
          variant="ghost"
          onClick={() => setActiveTab('pending')}
          className={`h-12 px-8 rounded-2xl font-bold transition-all ${activeTab === 'pending' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <CreditCard className="h-4 w-4 mr-2" />
          Pending Orders ({pendingPayments.length})
        </Button>
        <Button
          variant="ghost"
          onClick={() => setActiveTab('completed')}
          className={`h-12 px-8 rounded-2xl font-bold transition-all ${activeTab === 'completed' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <History className="h-4 w-4 mr-2" />
          Today's Collections ({completedPayments.length})
        </Button>
      </div>

      {/* List Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab + searchQuery}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="grid grid-cols-1 gap-4"
        >
          {activeTab === 'pending' ? (
            filteredPending.length === 0 ? (
              <Card className="border-0 shadow-lg rounded-[2.5rem] bg-white">
                <CardContent className="flex flex-col items-center justify-center py-20">
                  <div className="h-24 w-24 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle className="h-12 w-12 text-emerald-500" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900">All Cleared!</h3>
                  <p className="text-slate-500 mt-2 font-medium">No pending lab payments found.</p>
                </CardContent>
              </Card>
            ) : filteredPending.map((p, idx) => (
              <motion.div
                key={p.payment_id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="border-0 shadow-lg shadow-slate-200/30 rounded-[2rem] hover:shadow-2xl hover:shadow-indigo-500/10 transition-all border border-transparent hover:border-indigo-100 bg-white group overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row md:items-center justify-between p-6 gap-6">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-[1.5rem] flex items-center justify-center shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                          <User className="h-8 w-8 text-indigo-600 group-hover:text-white transition-colors" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <p className="text-xl font-bold text-slate-900">{p.patient_name}</p>
                            <Badge className="bg-slate-100 text-slate-600 border-0 rounded-lg px-2 text-[10px] font-black">{p.patient_id}</Badge>
                          </div>
                          <p className="text-sm text-slate-500 font-medium flex items-center gap-2">
                            <span className="text-indigo-600 font-bold">{p.test_name}</span>
                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                            <span>Order: {p.order_id}</span>
                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                            <span>Dr. {p.doctor_name}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 justify-between md:justify-end">
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Due Amount</p>
                          <p className="text-3xl font-black text-indigo-600 tracking-tight">₹{p.amount.toFixed(2)}</p>
                        </div>
                        <Button
                          onClick={() => handlePayment(p)}
                          className="h-14 px-8 bg-slate-900 text-white rounded-2xl hover:bg-indigo-600 transition-all shadow-lg hover:shadow-indigo-200 font-bold group"
                        >
                          Collect Payment
                          <ArrowLeft className="h-5 w-5 ml-3 rotate-180 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          ) : (
            filteredCompleted.length === 0 ? (
              <Card className="border-0 shadow-lg rounded-[2.5rem] bg-white">
                <CardContent className="flex flex-col items-center justify-center py-20">
                  <div className="h-24 w-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                    <DollarSign className="h-12 w-12 text-slate-300" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-400">No Collections Today</h3>
                </CardContent>
              </Card>
            ) : filteredCompleted.map((c, idx) => (
              <motion.div
                key={c.collection_id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="border-0 shadow-md shadow-slate-200/20 rounded-[2rem] bg-white/70 backdrop-blur-xl border border-white hover:border-emerald-100 transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center">
                          <CheckCircle className="h-7 w-7 text-emerald-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-lg text-slate-900">{c.patient_name}</p>
                            <span className="text-xs font-black bg-slate-100 px-2 py-0.5 rounded text-slate-500">{c.patient_id}</span>
                          </div>
                          <p className="text-sm text-slate-500 font-medium">
                            {c.description} • <span className="text-emerald-600 font-bold">{c.method}</span> • {c.collected_at ? new Date(c.collected_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-2xl font-black text-emerald-600 mr-4">₹{c.amount.toFixed(2)}</span>
                        <div className="flex gap-2">
                          <Button variant="outline" size="icon" onClick={() => setShowInvoice(c)} className="h-11 w-11 rounded-xl border-slate-200 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm">
                            <Download className="h-5 w-5" />
                          </Button>
                          <Button variant="outline" size="icon" onClick={() => handlePrintInvoice(c)} className="h-11 w-11 rounded-xl border-slate-200 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm">
                            <Printer className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </motion.div>
      </AnimatePresence>

      {/* Modern Payment Modal */}
      <AnimatePresence>
        {showPayModal && selectedPayment && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden border border-white/20"
            >
              <div className="p-8 space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black text-slate-900">Secure Checkout</h2>
                  <Button variant="ghost" size="icon" onClick={() => setShowPayModal(false)} className="rounded-2xl hover:bg-slate-100">
                    <X className="h-6 w-6" />
                  </Button>
                </div>

                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                      <User className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-black text-slate-900">{selectedPayment.patient_name}</p>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{selectedPayment.patient_id}</p>
                    </div>
                  </div>
                  <div className="border-t border-slate-200 pt-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Service</p>
                      <p className="text-sm font-black text-slate-700">{selectedPayment.test_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Order ID</p>
                      <p className="text-sm font-black text-slate-700">{selectedPayment.order_id}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Select Payment Method</p>
                  <div className="grid grid-cols-2 gap-3">
                    {methods.map(m => (
                      <motion.button
                        key={m.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setPaymentMethod(m.id)}
                        className={`p-4 rounded-[1.5rem] border-2 transition-all flex flex-col items-center gap-2 ${paymentMethod === m.id ? 'border-slate-900 bg-slate-900 text-white shadow-xl shadow-slate-900/20' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'}`}
                      >
                        {m.icon}
                        <span className="text-xs font-bold capitalize">{m.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {paymentMethod === 'UPI' && (
                    <motion.div
                      key="upi-panel"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-4 overflow-hidden"
                    >
                      {generateUPIQR(selectedPayment.amount)}
                      <div className="relative">
                        <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input
                          placeholder="Reference / Transaction ID"
                          value={transactionId}
                          onChange={e => setTransactionId(e.target.value)}
                          className="pl-12 h-14 bg-slate-50 border-0 rounded-2xl focus-visible:ring-2 focus-visible:ring-indigo-500/20 font-bold"
                        />
                      </div>
                    </motion.div>
                  )}
                  {['Card', 'Insurance'].includes(paymentMethod) && (
                    <motion.div
                      key="input-panel"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="relative"
                    >
                      <Input
                        placeholder={`Enter ${paymentMethod} Reference ID`}
                        value={transactionId}
                        onChange={e => setTransactionId(e.target.value)}
                        className="pl-6 h-14 bg-slate-50 border-0 rounded-2xl focus-visible:ring-2 focus-visible:ring-indigo-500/20 font-bold"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  className="w-full h-16 text-xl bg-slate-900 hover:bg-indigo-600 text-white rounded-[1.5rem] transition-all font-black shadow-xl shadow-indigo-600/10 disabled:bg-slate-200"
                  onClick={processPayment}
                  disabled={processing}
                >
                  {processing ? (
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  ) : (
                    <>Confirm Payment of ₹{selectedPayment.amount.toFixed(2)}</>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modern Invoice Modal */}
      <AnimatePresence>
        {showInvoice && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Invoice Details</h3>
                  <Button variant="ghost" size="icon" onClick={() => setShowInvoice(null)} className="rounded-xl">
                    <X className="h-6 w-6" />
                  </Button>
                </div>

                <div className="text-center py-8 border-b border-dashed border-slate-200">
                  <div className="h-16 w-16 bg-indigo-50 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4">
                    <Building className="h-8 w-8 text-indigo-600" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900">CityCare LDIMS</h2>
                  <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">Laboratory Receipt</p>
                </div>

                <div className="grid grid-cols-2 gap-y-6 text-sm py-4">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Patient Name</p>
                    <p className="font-black text-slate-900">{showInvoice.patient_name}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Patient ID</p>
                    <p className="font-black text-slate-900">{showInvoice.patient_id}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Payment Method</p>
                    <p className="font-black text-slate-900">{showInvoice.method}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Date</p>
                    <p className="font-black text-slate-900">{showInvoice.collected_at ? new Date(showInvoice.collected_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}</p>
                  </div>
                </div>

                <div className="bg-emerald-50 p-6 rounded-[2rem] text-center border border-emerald-100">
                  <p className="text-4xl font-black text-emerald-600 tracking-tight">₹{showInvoice.amount.toFixed(2)}</p>
                  <Badge className="bg-emerald-600 text-white border-0 mt-3 px-4 py-1 rounded-full font-black text-[10px] tracking-[0.2em] shadow-lg shadow-emerald-600/20">
                    TRANSACTION VERIFIED
                  </Badge>
                </div>

                <div className="flex gap-4">
                  <Button className="flex-1 h-14 bg-slate-900 text-white rounded-[1.5rem] font-bold shadow-lg hover:shadow-slate-300" onClick={() => handleDownloadInvoice(showInvoice)}>
                    <Download className="h-5 w-5 mr-3" /> Download PDF
                  </Button>
                  <Button variant="outline" className="flex-1 h-14 rounded-[1.5rem] font-bold border-2" onClick={() => handlePrintInvoice(showInvoice)}>
                    <Printer className="h-5 w-5 mr-3" /> Quick Print
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
