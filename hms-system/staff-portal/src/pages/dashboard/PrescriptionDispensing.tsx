import { useEffect, useState, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { io, Socket } from 'socket.io-client';
import {
  Search,
  CheckCircle,
  Clock,
  Loader2,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Edit3,
  QrCode,
  CreditCard,
  Banknote,
  Shield,
  Smartphone,
  Receipt,
  IndianRupee,
  Download,
  FileCheck,
  TrendingUp,
  X,
  ArrowLeft,
  Activity,
  User,
  Pill,
  Calculator,
  ArrowRight
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || '/api';

/* ─── Types ─── */

interface Medicine {
  id?: string;
  medicine_name: string;
  generic_name?: string;
  brand_name?: string;
  strength?: string;
  quantity: number;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  unit_price: number;
  subtotal: number;
}

interface Prescription {
  id: string;
  prescription_id: string;
  patient_id: string;
  patient_name: string;
  doctor_name: string;
  medicines: Medicine[];
  prescription_date: string;
  status: 'Active' | 'Dispensed' | 'Cancelled' | 'Paid';
}

interface InventoryMedicine {
  medicine_id: string;
  generic_name: string;
  brand_name: string;
  strength: string;
  unit_price: number;
  current_stock: number;
}

/* ─── Simple QR Code Component ─── */

function UpiQrCode({ amount, size = 180 }: { amount: number; size?: number }) {
  const upiUrl = `upi://pay?pa=pharmacy@upi&pn=CityCare%20Pharmacy&am=${amount.toFixed(2)}&cu=INR&tn=Pharmacy%20Bill`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(upiUrl)}`;

  return (
    <div className="flex flex-col items-center gap-3 p-6 bg-slate-900 rounded-[2rem] border-0 shadow-2xl">
      <div className="flex items-center gap-2 text-sm font-black text-blue-400 uppercase tracking-widest">
        <QrCode className="h-4 w-4" />
        SCAN TO PAY VIA UPI
      </div>
      <div className="bg-white p-3 rounded-2xl shadow-inner">
        <img
          src={qrSrc}
          alt="UPI QR Code"
          width={size}
          height={size}
          className="rounded-lg"
        />
      </div>
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
        Google Pay • PhonePe • Paytm • Any UPI App
      </p>
      <div className="text-2xl font-black text-white">₹{amount.toFixed(2)}</div>
    </div>
  );
}

const PAYMENT_METHODS = [
  { value: 'Cash', label: 'CASH', icon: Banknote, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { value: 'Card', label: 'CARD', icon: CreditCard, color: 'text-blue-500', bg: 'bg-blue-50' },
  { value: 'UPI', label: 'UPI', icon: Smartphone, color: 'text-violet-500', bg: 'bg-violet-50' },
  { value: 'Insurance', label: 'INSURANCE', icon: Shield, color: 'text-amber-500', bg: 'bg-amber-50' },
  { value: 'Advance', label: 'ADVANCE', icon: User, color: 'text-purple-500', bg: 'bg-purple-50' },
];

export default function PrescriptionDispensing() {
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);
  const [pendingPrescriptions, setPendingPrescriptions] = useState<Prescription[]>([]);
  const [completedPrescriptions, setCompletedPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientIdSearch, setPatientIdSearch] = useState('');
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [isDispensingDialogOpen, setIsDispensingDialogOpen] = useState(false);
  const [dispensing, setDispensing] = useState(false);
  const [editableMedicines, setEditableMedicines] = useState<Medicine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [todaysCollection, setTodaysCollection] = useState(0);
  const [todaysCount, setTodaysCount] = useState(0);
  const [addMedicineSearch, setAddMedicineSearch] = useState('');
  const [inventoryResults, setInventoryResults] = useState<InventoryMedicine[]>([]);
  const [showAddMedicine, setShowAddMedicine] = useState(false);
  const [searchingInventory, setSearchingInventory] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', holder: '' });
  const [insuranceDetails, setInsuranceDetails] = useState({ provider: '', policyNumber: '' });
  const [upiId, setUpiId] = useState('pharmacy@upi');

  useEffect(() => {
    fetchPrescriptions();
    fetchTodaysStats();

    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const socketUrl = apiBase.replace(/\/api\/?$/, '');
    socketRef.current = io(socketUrl, {
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socketRef.current.on('pharmacy:prescription_received', (data: Prescription) => {
      setPendingPrescriptions((prev) => {
        const exists = prev.find((p) => p.prescription_id === data.prescription_id);
        if (!exists) return [data, ...prev];
        return prev;
      });
      toast.success(`New Rx for ${data.patient_name}`);
    });

    socketRef.current.on('pharmacy:sale_completed', (data: any) => {
      setTodaysCollection((prev) => prev + (data.total_amount || 0));
      setTodaysCount((prev) => prev + 1);
      fetchPrescriptions();
    });

    const interval = setInterval(() => {
      fetchPrescriptions();
      fetchTodaysStats();
    }, 30000);

    return () => {
      clearInterval(interval);
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const fetchPrescriptions = async (patientId?: string) => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const qs = patientId ? `?patient_id=${encodeURIComponent(patientId)}` : '';
      const response = await fetch(`${API_URL}/pharmacy/prescriptions${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (Array.isArray(data)) {
        setPendingPrescriptions(data.filter((p) => (p.status || '').toLowerCase() !== 'dispensed'));
        setCompletedPrescriptions(data.filter((p) => (p.status || '').toLowerCase() === 'dispensed'));
      } else if (data && (data.pending || data.completed)) {
        setPendingPrescriptions(Array.isArray(data.pending) ? data.pending : []);
        setCompletedPrescriptions(Array.isArray(data.completed) ? data.completed : []);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodaysStats = async () => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/pharmacy/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTodaysCollection(data.todays_revenue || 0);
        setTodaysCount(data.prescriptions_dispensed_today || 0);
      }
    } catch (e) { }
  };

  const lookupPricesForMedicines = useCallback(async (medicines: any[]): Promise<Medicine[]> => {
    const token = localStorage.getItem('hms_staff_token');
    const enriched: Medicine[] = [];

    for (const med of medicines) {
      const name = med.medicine_name || med.generic_name || '';
      let unitPrice = 0;
      try {
        const res = await fetch(
          `${API_URL}/pharmacy/medicine-price?name=${encodeURIComponent(name)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const priceData = await res.json();
          unitPrice = priceData.unit_price || 0;
        }
      } catch { }

      const qty = med.quantity || 1;
      enriched.push({
        ...med,
        medicine_name: name,
        unit_price: unitPrice,
        subtotal: Math.round(unitPrice * qty * 100) / 100,
        quantity: qty,
      });
    }
    return enriched;
  }, []);

  const searchInventory = async (search: string) => {
    if (!search.trim()) {
      setInventoryResults([]);
      return;
    }
    setSearchingInventory(true);
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/pharmacy/inventory`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const all: InventoryMedicine[] = await res.json();
        const q = search.toLowerCase();
        const filtered = all.filter(
          (m) =>
            m.generic_name?.toLowerCase().includes(q) ||
            m.brand_name?.toLowerCase().includes(q)
        );
        setInventoryResults(filtered.slice(0, 5));
      }
    } catch { } finally {
      setSearchingInventory(false);
    }
  };

  const handleSelectPrescription = async (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setIsDispensingDialogOpen(true);
    if (prescription.status === 'Paid') {
      setPaymentMethod('Advance');
    } else {
      setPaymentMethod('Cash');
    }
    const enriched = await lookupPricesForMedicines(prescription.medicines);
    setEditableMedicines(enriched);
  };

  const updateMedicineQty = (idx: number, newQty: number) => {
    if (newQty < 1) return;
    setEditableMedicines((prev) =>
      prev.map((m, i) =>
        i === idx ? { ...m, quantity: newQty, subtotal: Math.round(m.unit_price * newQty * 100) / 100 } : m
      )
    );
  };

  const addMedicineFromInventory = (invMed: InventoryMedicine) => {
    const newMed: Medicine = {
      medicine_name: invMed.generic_name || invMed.brand_name,
      generic_name: invMed.generic_name,
      brand_name: invMed.brand_name,
      strength: invMed.strength,
      quantity: 1,
      unit_price: invMed.unit_price || 0,
      subtotal: invMed.unit_price || 0,
    };
    setEditableMedicines((prev) => [...prev, newMed]);
    setShowAddMedicine(false);
    setAddMedicineSearch('');
  };

  const grandTotal = editableMedicines.reduce((sum, m) => sum + m.subtotal, 0);

  const handleDispenseMedicines = async () => {
    if (!selectedPrescription || editableMedicines.length === 0) return;
    setDispensing(true);
    try {
      const token = localStorage.getItem('hms_staff_token');
      const response = await fetch(`${API_URL}/pharmacy/dispense`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prescription_id: selectedPrescription.prescription_id,
          patient_id: selectedPrescription.patient_id,
          patient_name: selectedPrescription.patient_name,
          medicines: editableMedicines,
          total_amount: grandTotal,
          payment_method: paymentMethod,
          payment_details: paymentMethod === 'Card' ? cardDetails :
            paymentMethod === 'Insurance' ? insuranceDetails :
              paymentMethod === 'UPI' ? { upi_id: upiId } : null
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success('Sale Processed Successfully');
        setReceiptData({
          ...result,
          patient_name: selectedPrescription.patient_name,
          patient_id: selectedPrescription.patient_id,
          prescription_id: selectedPrescription.prescription_id,
          doctor_name: selectedPrescription.doctor_name,
          payment_details: paymentMethod === 'Card' ? cardDetails :
            paymentMethod === 'Insurance' ? insuranceDetails :
              paymentMethod === 'UPI' ? { upi_id: upiId } : null,
          date: new Date().toLocaleString(),
        });
        setShowReceipt(true);
        fetchPrescriptions();
        fetchTodaysStats();
      } else {
        const errData = await response.json();
        toast.error(errData.error || 'Dispensing Error');
      }
    } catch (error) {
      toast.error('Network Error while dispensing');
    } finally {
      setDispensing(false);
    }
  };

  const handleViewInvoice = async (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    const enriched = await lookupPricesForMedicines(prescription.medicines);
    setReceiptData({
      sale_id: 'SALE-' + prescription.prescription_id.split('-')[1],
      patient_name: prescription.patient_name,
      patient_id: prescription.patient_id,
      prescription_id: prescription.prescription_id,
      doctor_name: prescription.doctor_name,
      total_amount: enriched.reduce((s, m) => s + m.subtotal, 0),
      medicines: enriched,
      payment_method: 'Cash',
      date: new Date(prescription.prescription_date).toLocaleString(),
    });
    setShowReceipt(true);
    setIsDispensingDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#f8fafc]">
        <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
        <p className="text-xl font-black text-slate-900 uppercase tracking-widest">Waking Portals...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 sm:p-6 lg:p-8">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[10%] w-[40%] h-[40%] bg-blue-400/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] bg-emerald-400/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative space-y-8 max-w-6xl mx-auto">
        {/* Header & Stats Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8"
        >
          <div className="space-y-2">
            <button
              onClick={() => navigate('/pharmacist')}
              className="flex items-center gap-2 text-slate-400 hover:text-white font-bold mb-4 transition-colors group"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              BACK
            </button>
            <h1 className="text-4xl font-black tracking-tighter flex items-center gap-4">
              <div className="p-3 bg-blue-500 rounded-2xl">
                <ShoppingCart className="h-8 w-8 text-white" />
              </div>
              BILLING <span className="text-blue-400">& DISPENSING</span>
            </h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2">
              <Activity size={12} className="text-emerald-500" /> Real-time prescription fulfillment portal
            </p>
          </div>

          <div className="flex items-center gap-8 bg-white/5 p-6 rounded-[2.5rem] border border-white/10">
            <div className="text-center md:text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Today's Revenue</p>
              <p className="text-3xl font-black text-emerald-400 tracking-tighter">₹{todaysCollection.toLocaleString()}</p>
            </div>
            <div className="w-px h-12 bg-white/10 hidden md:block" />
            <div className="text-center md:text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Today's Units</p>
              <p className="text-3xl font-black text-blue-400 tracking-tighter">{todaysCount}</p>
            </div>
          </div>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400" />
          <Input
            placeholder="ENTER PATIENT ID OR NAME TO QUICK FILTER..."
            value={patientIdSearch}
            onChange={(e) => setPatientIdSearch(e.target.value)}
            className="h-20 pl-16 pr-8 bg-white/70 backdrop-blur-xl border-0 rounded-full shadow-xl shadow-slate-200/50 text-xl font-black placeholder:text-slate-300 focus-visible:ring-blue-500 transition-all"
          />
        </motion.div>

        {/* Prescription Lists */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Pending Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-4">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" /> Pending Queue
              </h2>
              <Badge className="bg-amber-100 text-amber-600 font-black border-0">{pendingPrescriptions.length}</Badge>
            </div>

            <div className="grid gap-4">
              <AnimatePresence mode="popLayout">
                {pendingPrescriptions.map((px, idx) => (
                  <motion.div
                    key={px.prescription_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => handleSelectPrescription(px)}
                    className="group cursor-pointer"
                  >
                    <div className="bg-white/70 backdrop-blur-xl p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border-0 hover:shadow-2xl hover:shadow-slate-300/50 transition-all group-active:scale-95">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shrink-0">
                          <User size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-black text-slate-900 truncate uppercase">{px.patient_name}</h3>
                          <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">ID: {px.patient_id} • Dr. {px.doctor_name}</p>
                        </div>
                        <ArrowRight className="text-slate-200 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {px.medicines.map((m, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] font-black border-slate-100 bg-slate-50 text-slate-500 px-2 py-0.5 uppercase">
                            {m.medicine_name} {m.quantity}x
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
                {pendingPrescriptions.length === 0 && (
                  <div className="text-center py-20 bg-white/20 backdrop-blur rounded-[2.5rem] border-2 border-dashed border-slate-200">
                    <Clock className="mx-auto h-12 w-12 text-slate-300 mb-2" />
                    <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Queue is empty</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Completed Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-4">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" /> Completed Today
              </h2>
              <Badge className="bg-emerald-100 text-emerald-600 font-black border-0">{completedPrescriptions.length}</Badge>
            </div>

            <div className="grid gap-4 opacity-70 hover:opacity-100 transition-opacity">
              {completedPrescriptions.map((px) => (
                <div
                  key={px.prescription_id}
                  onClick={() => handleViewInvoice(px)}
                  className="bg-white/40 backdrop-blur p-6 rounded-[2.5rem] border-0 shadow-lg shadow-slate-200/30 cursor-pointer hover:bg-white/80 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-slate-700 uppercase">{px.patient_name}</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PROCESSED AT {new Date(px.prescription_date).toLocaleTimeString()}</p>
                    </div>
                    <Button variant="ghost" className="rounded-xl text-emerald-600 font-black uppercase text-[10px] tracking-widest">
                      <Receipt size={14} className="mr-1" /> REPRINT
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* DISPENSE DIALOG OVERHAUL */}
      <Dialog open={isDispensingDialogOpen} onOpenChange={(o) => { if (!o) { setIsDispensingDialogOpen(false); setShowReceipt(false); } }}>
        <DialogContent className="max-w-3xl bg-white border-0 rounded-[3rem] shadow-2xl p-0 overflow-hidden">
          <AnimatePresence mode="wait">
            {!showReceipt ? (
              <motion.div
                key="dispense"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-10 space-y-8"
              >
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-4">
                      <div className="p-3 bg-slate-900 rounded-2xl text-white">
                        <ShoppingCart size={24} />
                      </div>
                      DISPENSE & BILL
                    </DialogTitle>
                    {selectedPrescription && (
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Focus</p>
                        <p className="text-lg font-black text-blue-600">{selectedPrescription.patient_name}</p>
                      </div>
                    )}
                  </div>
                </DialogHeader>

                {/* Items Area */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Pill size={14} className="text-emerald-500" /> Prescribed Medicines
                    </h3>
                    {selectedPrescription?.status !== 'Paid' ? (
                      <button onClick={() => setShowAddMedicine(!showAddMedicine)} className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:underline">+ Add Custom Item</button>
                    ) : (
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fixed Items</span>
                    )}
                  </div>

                  {showAddMedicine && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="p-4 bg-slate-50 rounded-[1.5rem] border-2 border-slate-100">
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder="Search inventory..."
                          value={addMedicineSearch}
                          onChange={(e) => { setAddMedicineSearch(e.target.value); searchInventory(e.target.value); }}
                          className="h-12 pl-12 rounded-xl border-0 shadow-sm font-bold"
                        />
                      </div>
                      <div className="mt-2 space-y-1">
                        {inventoryResults.map(inv => (
                          <div
                            key={inv.medicine_id}
                            onClick={() => addMedicineFromInventory(inv)}
                            className="p-3 bg-white hover:bg-blue-50 cursor-pointer rounded-xl flex justify-between items-center transition-colors border border-transparent hover:border-blue-100"
                          >
                            <span className="font-black text-xs uppercase">{inv.brand_name || inv.generic_name}</span>
                            <span className="text-xs font-black text-emerald-600">₹{inv.unit_price}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar space-y-3">
                    {editableMedicines.map((med, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-5 bg-slate-50 rounded-[2rem] border-2 border-transparent hover:border-slate-100 transition-all">
                        <div className="flex-1">
                          <p className="font-black text-slate-800 uppercase tracking-tight">{med.medicine_name}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{med.strength} • ₹{med.unit_price}/unit</p>
                        </div>
                        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm">
                          <button
                            onClick={() => updateMedicineQty(idx, med.quantity - 1)}
                            disabled={selectedPrescription?.status === 'Paid'}
                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-400 cursor-pointer disabled:cursor-not-allowed"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-8 text-center font-black text-lg">{med.quantity}</span>
                          <button
                            onClick={() => updateMedicineQty(idx, med.quantity + 1)}
                            disabled={selectedPrescription?.status === 'Paid'}
                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-400 cursor-pointer disabled:cursor-not-allowed"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <div className="text-right min-w-[80px]">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</p>
                          <p className="text-lg font-black text-emerald-600">₹{med.subtotal.toFixed(0)}</p>
                        </div>
                        {selectedPrescription?.status !== 'Paid' && (
                          <button onClick={() => setEditableMedicines(prev => prev.filter((_, i) => i !== idx))} className="text-slate-200 hover:text-rose-500 transition-colors">
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total & Payment */}
                <div className="grid md:grid-cols-2 gap-8 items-end border-t border-slate-100 pt-8">
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Payment Method</p>
                    {selectedPrescription?.status === 'Paid' ? (
                      <div className="bg-emerald-50 text-emerald-600 p-6 rounded-2xl flex items-center justify-center border-2 border-emerald-100 shadow-sm">
                        <CheckCircle className="h-6 w-6 mr-3" />
                        <span className="font-black uppercase tracking-widest">PAID VIA ADVANCE DEPOSIT</span>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          {PAYMENT_METHODS.map(pm => (
                            <button
                              key={pm.value}
                              onClick={() => setPaymentMethod(pm.value)}
                              className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${paymentMethod === pm.value ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'
                                }`}
                            >
                              <pm.icon size={20} className={paymentMethod === pm.value ? 'text-blue-400' : pm.color} />
                              <span className="text-xs font-black uppercase tracking-widest">{pm.label}</span>
                            </button>
                          ))}
                        </div>

                        {/* Payment Details Inputs */}
                        <AnimatePresence mode="wait">
                          {paymentMethod === 'UPI' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4 pt-2">
                              <UpiQrCode amount={grandTotal} />
                              <div className="space-y-1.5 px-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Merchant UPI ID</label>
                                <Input
                                  value={upiId}
                                  onChange={(e) => setUpiId(e.target.value)}
                                  className="bg-slate-50 border-0 rounded-xl font-bold"
                                />
                              </div>
                            </motion.div>
                          )}

                          {paymentMethod === 'Card' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3 pt-2">
                              <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 space-y-4">
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cardholder Name</label>
                                  <Input
                                    placeholder="E.G. JOHN DOE"
                                    value={cardDetails.holder}
                                    onChange={(e) => setCardDetails({ ...cardDetails, holder: e.target.value.toUpperCase() })}
                                    className="bg-white border-0 rounded-xl font-bold shadow-sm"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Card Number</label>
                                  <Input
                                    placeholder="•••• •••• •••• ••••"
                                    value={cardDetails.number}
                                    onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value })}
                                    className="bg-white border-0 rounded-xl font-bold shadow-sm"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expiry</label>
                                    <Input
                                      placeholder="MM/YY"
                                      value={cardDetails.expiry}
                                      onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                                      className="bg-white border-0 rounded-xl font-bold shadow-sm"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CVV</label>
                                    <Input
                                      placeholder="•••"
                                      type="password"
                                      maxLength={3}
                                      className="bg-white border-0 rounded-xl font-bold shadow-sm"
                                    />
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}

                          {paymentMethod === 'Insurance' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3 pt-2">
                              <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 space-y-4">
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Insurance Provider</label>
                                  <Input
                                    placeholder="E.G. STAR HEALTH / LIC"
                                    value={insuranceDetails.provider}
                                    onChange={(e) => setInsuranceDetails({ ...insuranceDetails, provider: e.target.value.toUpperCase() })}
                                    className="bg-white border-0 rounded-xl font-bold shadow-sm"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Policy Number / ID</label>
                                  <Input
                                    placeholder="E.G. POL-12345678"
                                    value={insuranceDetails.policyNumber}
                                    onChange={(e) => setInsuranceDetails({ ...insuranceDetails, policyNumber: e.target.value.toUpperCase() })}
                                    className="bg-white border-0 rounded-xl font-bold shadow-sm"
                                  />
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </>
                    )}
                  </div>

                  <div className="p-8 bg-slate-900 text-white rounded-[2.5rem] text-center md:text-right shadow-2xl shadow-slate-900/40">
                    <div className="flex items-center justify-center md:justify-end gap-2 text-blue-400 mb-2">
                      <Calculator size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Payable Amount</span>
                    </div>
                    <p className="text-5xl font-black tracking-tighter">₹{grandTotal.toFixed(2)}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => setIsDispensingDialogOpen(false)} className="h-16 flex-1 rounded-2xl font-black uppercase tracking-widest text-slate-500 border-2 border-slate-100">CANCEL</Button>
                  <Button
                    onClick={handleDispenseMedicines}
                    disabled={dispensing || editableMedicines.length === 0}
                    className="h-16 flex-[2] rounded-2xl font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/30"
                  >
                    {dispensing ? <Loader2 className="animate-spin" /> : 'CONFIRM & DISPENSE'}
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="receipt"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-10 text-center"
              >
                <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 animate-bounce">
                  <CheckCircle size={48} />
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">SALE COMPLETED</h2>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-8">Stock levels updated and receipt generated</p>

                <div className="bg-slate-50 p-8 rounded-[3rem] border-2 border-slate-100 text-left mb-8 max-w-md mx-auto">
                  <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
                    <h3 className="text-2xl font-black tracking-tighter">RECEIPT</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">#{receiptData?.sale_id}</p>
                  </div>
                  <div className="space-y-4 mb-8">
                    {receiptData?.medicines?.map((m: any, i: number) => (
                      <div key={i} className="flex justify-between items-center text-sm">
                        <span className="font-bold text-slate-600">{m.medicine_name} x{m.quantity}</span>
                        <span className="font-black text-slate-900 font-mono">₹{m.subtotal}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t-2 border-slate-900">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">Total Paid</span>
                    <span className="text-3xl font-black text-emerald-600">₹{receiptData?.total_amount}</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Payment Mode</p>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-slate-900 text-white font-black px-3 py-1 rounded-lg">
                        {receiptData?.payment_method?.toUpperCase()}
                      </Badge>
                      {receiptData?.payment_method === 'Card' && receiptData?.payment_details?.number && (
                        <span className="text-xs font-bold text-slate-500">Ending in {receiptData.payment_details.number.slice(-4)}</span>
                      )}
                      {receiptData?.payment_method === 'Insurance' && receiptData?.payment_details?.provider && (
                        <span className="text-xs font-bold text-slate-500">{receiptData.payment_details.provider}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 max-w-sm mx-auto">
                  <Button variant="outline" className="h-14 flex-1 rounded-2xl font-black" onClick={() => window.print()}>PRINT</Button>
                  <Button className="h-14 flex-[2] rounded-2xl font-black bg-slate-900" onClick={() => { setIsDispensingDialogOpen(false); setShowReceipt(false); }}>DONE</Button>
                </div>

                {paymentMethod === 'UPI' && !receiptData?.insurance_claim && (
                  <div className="mt-8 pt-8 border-t border-slate-100">
                    <UpiQrCode amount={receiptData?.total_amount || grandTotal} />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </div>
  );
}
