import { useEffect, useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Package,
  Search,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  Loader2,
  Scan,
  Pill,
  ArrowLeft,
  ShieldCheck,
  Calendar,
  FlaskConical,
  Clock
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface Medicine {
  id?: string;
  medicine_id?: string;
  generic_name: string;
  brand_name: string;
  category: string;
  dosage_form: string;
  strength: string;
  current_stock: number;
  reorder_level: number;
  unit_price: number;
  expiry_date: string;
  status: string;
  sku?: string;
}

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function MedicineInventory() {
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'all' | 'expired' | 'expiring-soon' | 'out-of-stock' | 'low-stock' | 'in-stock'>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isScanDialogOpen, setIsScanDialogOpen] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);

  // Form state for add/edit medicine
  const [formData, setFormData] = useState<Medicine>({
    generic_name: '',
    brand_name: '',
    category: '',
    dosage_form: '',
    strength: '',
    current_stock: 0,
    reorder_level: 10,
    unit_price: 0,
    expiry_date: '',
    status: 'Active',
    sku: '',
  });

  useEffect(() => {
    fetchMedicines();
    const interval = setInterval(fetchMedicines, 30000);

    // Initialize Socket.IO for real-time updates
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';
    const socketUrl = apiBase.replace(/\/api\/?$/, '');
    socketRef.current = io(socketUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current.on('pharmacy:medicine_added', () => {
      fetchMedicines();
      toast.success('New medicine added to inventory');
    });

    socketRef.current.on('pharmacy:stock_updated', () => {
      fetchMedicines();
    });

    socketRef.current.on('pharmacy:medicine_updated', () => {
      fetchMedicines();
    });

    return () => {
      clearInterval(interval);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const fetchMedicines = async () => {
    try {
      const token = localStorage.getItem('hms_staff_token') || localStorage.getItem('hms_token');
      const response = await fetch(`${API_URL}/pharmacy/inventory`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMedicines(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Fetch inventory error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    resetForm();
    setSelectedMedicine(null);
    setIsAddDialogOpen(true);
  };

  const handleEdit = (medicine: Medicine) => {
    setSelectedMedicine(medicine);
    setFormData({ ...medicine });
    setIsAddDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.generic_name || !formData.brand_name) {
      toast.error('Generic and Brand names are required');
      return;
    }

    try {
      const token = localStorage.getItem('hms_staff_token') || localStorage.getItem('hms_token');
      if (selectedMedicine) {
        // Edit existing
        const medId = selectedMedicine.id || selectedMedicine.medicine_id;
        const response = await fetch(`${API_URL}/pharmacy/inventory/${medId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: formData.brand_name,
            generic_name: formData.generic_name,
            category: formData.category,
            dosage_form: formData.dosage_form,
            strength: formData.strength,
            stock: formData.current_stock,
            reorder_level: formData.reorder_level,
            unit_price: formData.unit_price,
            expiry_date: formData.expiry_date,
            sku: formData.sku,
            status: formData.status,
          }),
        });

        if (response.ok) {
          toast.success('Medicine updated successfully');
          setIsAddDialogOpen(false);
          fetchMedicines();
        }
      } else {
        // Add new
        const response = await fetch(`${API_URL}/pharmacy/inventory`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: formData.brand_name,
            generic_name: formData.generic_name,
            category: formData.category,
            dosage_form: formData.dosage_form,
            strength: formData.strength,
            stock: formData.current_stock,
            reorder_level: formData.reorder_level,
            unit_price: formData.unit_price,
            expiry_date: formData.expiry_date,
            sku: formData.sku,
          }),
        });

        if (response.ok) {
          toast.success('Medicine added successfully');
          setIsAddDialogOpen(false);
          fetchMedicines();
        }
      }
    } catch (error) {
      toast.error('Action failed');
    }
  };

  const handleDelete = async (medicineId: string) => {
    if (!window.confirm('Delete this medicine?')) return;
    try {
      const token = localStorage.getItem('hms_staff_token') || localStorage.getItem('hms_token');
      const response = await fetch(`${API_URL}/pharmacy/inventory/${medicineId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        toast.success('Deleted successfully');
        fetchMedicines();
      }
    } catch (error) {
      toast.error('Deletion failed');
    }
  };

  const handleScanSubmit = () => {
    const med = medicines.find(m => m.sku?.toLowerCase() === scanInput.toLowerCase());
    if (med) {
      handleEdit(med);
      setIsScanDialogOpen(false);
      setScanInput('');
    } else {
      toast.error('Medicine not found');
    }
  };

  const resetForm = () => {
    setFormData({
      generic_name: '',
      brand_name: '',
      category: '',
      dosage_form: '',
      strength: '',
      current_stock: 0,
      reorder_level: 10,
      unit_price: 0,
      expiry_date: '',
      status: 'Active',
      sku: '',
    });
  };

  const filteredMedicines = medicines.filter(m => {
    const matchesSearch =
      m.brand_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.generic_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.sku?.toLowerCase().includes(searchQuery.toLowerCase());

    if (sortBy === 'all') return matchesSearch;
    if (sortBy === 'low-stock') return matchesSearch && m.current_stock <= m.reorder_level;
    if (sortBy === 'expired') return matchesSearch && new Date(m.expiry_date) < new Date();
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 sm:p-6 lg:p-8">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -left-[10%] w-[40%] h-[40%] bg-emerald-400/10 rounded-full blur-[120px]" />
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
                <Package className="h-8 w-8 text-white" />
              </div>
              MEDICINE <span className="text-blue-600">INVENTORY</span>
            </h1>
            <p className="text-slate-500 font-bold flex items-center gap-2 uppercase tracking-widest text-xs">
              <ShieldCheck size={14} className="text-emerald-500" /> Manage & Track Pharmaceutical Stock
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsScanDialogOpen(true)}
              className="bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-100 font-black rounded-2xl px-6 py-6 transition-all group shadow-sm"
            >
              <Scan className="mr-2 h-5 w-5" />
              SCAN SKU
            </Button>
            <Button
              onClick={handleAdd}
              className="bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl px-6 py-6 transition-all shadow-xl shadow-slate-900/20"
            >
              <Plus className="mr-2 h-5 w-5" />
              ADD MEDICINE
            </Button>
          </div>
        </motion.div>

        {/* Search & Filter Bar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/70 backdrop-blur-xl p-4 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border-0 flex flex-col md:flex-row gap-4"
        >
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              placeholder="SEARCH BY BRAND, GENERIC NAME, OR SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 bg-white border-2 border-slate-100 rounded-2xl font-bold focus:border-blue-500 transition-all placeholder:text-slate-300"
            />
          </div>
          <div className="flex gap-2">
            {[
              { id: 'all', label: 'ALL', icon: Package },
              { id: 'low-stock', label: 'LOW STOCK', icon: AlertTriangle, color: 'text-amber-500' },
              { id: 'expired', label: 'EXPIRED', icon: Clock, color: 'text-red-500' },
            ].map((filter) => (
              <Button
                key={filter.id}
                onClick={() => setSortBy(filter.id as any)}
                className={`h-14 px-6 rounded-2xl font-black transition-all ${sortBy === filter.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-500 hover:bg-slate-50 border-2 border-slate-100'
                  }`}
              >
                <filter.icon className={`mr-2 h-4 w-4 ${sortBy === filter.id ? 'text-white' : (filter.color || '')}`} />
                {filter.label}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Inventory List */}
        <div className="grid gap-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white/40 backdrop-blur-sm rounded-[3rem] border-2 border-dashed border-slate-200">
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
              <p className="text-xl font-black text-slate-900 uppercase tracking-widest">Loading Inventory...</p>
            </div>
          ) : filteredMedicines.length === 0 ? (
            <div className="text-center py-24 bg-white/40 backdrop-blur-sm rounded-[3rem] border-2 border-dashed border-slate-200">
              <FlaskConical className="h-20 w-20 text-slate-300 mx-auto mb-6" />
              <p className="text-2xl font-black text-slate-900 uppercase tracking-tight">No Medicines Found</p>
              <p className="text-slate-500 font-bold mt-2">TRY ADJUSTING YOUR SEARCH OR FILTERS</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredMedicines.map((med, idx) => {
                const isLow = med.current_stock <= med.reorder_level;
                const isOut = med.current_stock === 0;
                const isExpired = new Date(med.expiry_date) < new Date();

                return (
                  <motion.div
                    key={med.id || med.medicine_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group"
                  >
                    <div className="bg-white/70 backdrop-blur-xl p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border-0 hover:shadow-2xl hover:shadow-slate-300/50 transition-all duration-300">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                        {/* Status Icon */}
                        <div className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-500 ${isOut ? 'bg-red-50 text-red-500' :
                          isExpired ? 'bg-rose-50 text-rose-500' :
                            isLow ? 'bg-amber-50 text-amber-500' :
                              'bg-emerald-50 text-emerald-500'
                          }`}>
                          <Pill className="h-10 w-10" />
                        </div>

                        {/* Basic Info */}
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                              {med.brand_name}
                            </h3>
                            <Badge className="bg-slate-900 text-white font-black rounded-lg text-[10px] tracking-widest px-2 uppercase">
                              {med.category}
                            </Badge>
                          </div>
                          <p className="text-slate-500 font-bold flex items-center gap-2 uppercase tracking-wide text-sm">
                            <Plus className="h-3 w-3" /> Generic: {med.generic_name}
                          </p>
                          <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest pt-2">
                            <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                              <FlaskConical size={12} className="text-blue-500" /> {med.strength}
                            </span>
                            <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                              <Package size={12} className="text-indigo-500" /> {med.dosage_form}
                            </span>
                            <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                              <Calendar size={12} className={isExpired ? 'text-red-500' : 'text-emerald-500'} /> EXPIRES: {new Date(med.expiry_date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Stock & Price */}
                        <div className="grid grid-cols-2 gap-8 lg:px-8 border-l border-r border-slate-100 py-2">
                          <div className="text-center md:text-left">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Stock Level</p>
                            <div className="flex items-baseline gap-1">
                              <span className={`text-3xl font-black tracking-tight ${isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-slate-900'
                                }`}>{med.current_stock}</span>
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Units</span>
                            </div>
                            {isLow && (
                              <p className="text-[10px] font-black text-amber-600 mt-1 uppercase flex items-center gap-1">
                                <AlertTriangle size={10} /> REORDER SOON
                              </p>
                            )}
                          </div>
                          <div className="text-center md:text-left">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">M.R.P Price</p>
                            <div className="flex items-baseline gap-1">
                              <span className="text-3xl font-black tracking-tight text-emerald-600">₹{med.unit_price}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleEdit(med)}
                            className="bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600 border-2 border-slate-100 w-12 h-12 flex items-center justify-center rounded-2xl transition-all shadow-sm"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(med.id || med.medicine_id || '')}
                            className="bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border-2 border-slate-100 w-12 h-12 flex items-center justify-center rounded-2xl transition-all shadow-sm"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Modernized Dialogs */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl bg-white border-0 rounded-[3rem] shadow-2xl p-0 overflow-hidden">
          <div className="p-10 space-y-8">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black text-slate-900 flex items-center gap-4">
                <div className="p-3 bg-slate-900 rounded-2xl">
                  <Package className="h-6 w-6 text-white" />
                </div>
                {selectedMedicine ? 'EDIT MEDICINE' : 'ADD MEDICINE'}
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[50vh] overflow-y-auto px-1">
              {[
                { label: 'BRAND NAME', name: 'brand_name', placeholder: 'e.g. Crocin' },
                { label: 'GENERIC NAME', name: 'generic_name', placeholder: 'e.g. Paracetamol' },
                { label: 'CATEGORY', name: 'category', placeholder: 'e.g. Analgesic' },
                { label: 'DOSAGE FORM', name: 'dosage_form', placeholder: 'e.g. Tablet' },
                { label: 'STRENGTH', name: 'strength', placeholder: 'e.g. 500mg' },
                { label: 'UNIT PRICE (₹)', name: 'unit_price', type: 'number', placeholder: '0.00' },
                { label: 'CURRENT STOCK', name: 'current_stock', type: 'number', placeholder: '100' },
                { label: 'REORDER LEVEL', name: 'reorder_level', type: 'number', placeholder: '10' },
                { label: 'EXPIRY DATE', name: 'expiry_date', type: 'date' },
                { label: 'SKU / BARCODE', name: 'sku', placeholder: 'Scan or type SKU' },
              ].map((field) => (
                <div key={field.name} className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">{field.label}</label>
                  <Input
                    type={field.type || 'text'}
                    placeholder={field.placeholder}
                    value={formData[field.name as keyof Medicine] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.name]: field.type === 'number' ? Number(e.target.value) : e.target.value })}
                    className="h-12 bg-white border-2 border-slate-100 rounded-xl font-bold focus:border-blue-500 transition-all shadow-sm"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                className="flex-1 h-14 rounded-2xl font-black text-slate-500 border-2 border-slate-100 transition-all hover:bg-slate-50"
              >
                CANCEL
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 h-14 rounded-2xl font-black text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
              >
                {selectedMedicine ? 'UPDATE MEDICINE' : 'SAVE MEDICINE'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isScanDialogOpen} onOpenChange={setIsScanDialogOpen}>
        <DialogContent className="max-w-md bg-white border-0 rounded-[3rem] shadow-2xl p-10">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[1.5rem] flex items-center justify-center mx-auto animate-pulse">
              <Scan size={32} />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">SCAN MEDICINE SKU</DialogTitle>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">Place SKU in the field below</p>
            </div>
            <Input
              autoFocus
              placeholder="ENTER OR SCAN SKU..."
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleScanSubmit()}
              className="h-14 bg-white border-2 border-slate-100 rounded-2xl font-black text-center text-xl focus:border-blue-500 transition-all"
            />
            <Button
              onClick={handleScanSubmit}
              className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl shadow-xl shadow-slate-900/20"
            >
              LOCATE MEDICINE
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
