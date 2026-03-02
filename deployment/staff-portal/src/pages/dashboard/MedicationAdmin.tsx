import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pill, Clock, CheckCircle2, Search, Loader2,
  User, CalendarClock, Plus, Trash2, FileText, Banknote
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

import socket from '@/lib/socket';

const API = import.meta.env.VITE_API_URL || '/api';

export default function MedicationAdmin() {
  const [loading, setLoading] = useState(true);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [admittedPatients, setAdmittedPatients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'dispensed'>('all');

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newPrescription, setNewPrescription] = useState({
    patient_id: '',
    patient_name: '',
    diagnosis: '',
    medicines: [{ medicine_name: '', quantity: 1, duration: '5 Days', frequency: 'BD', instructions: '' }]
  });

  // Patient Search State
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // Inventory Search State
  const [inventoryResults, setInventoryResults] = useState<any[]>([]);
  const [activeMedicineIndex, setActiveMedicineIndex] = useState<number | null>(null);
  const [medicineSearchQuery, setMedicineSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API}/nurse/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPrescriptions(data.prescriptions || []);
      setAdmittedPatients(data.patients || []);
    } catch {
      toast.error('Failed to load medication data');
    } finally {
      if (loading) setLoading(false);
    }
  }, [loading]);

  const searchInventory = async (query: string) => {
    if (!query.trim()) {
      setInventoryResults([]);
      return;
    }
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API}/pharmacy/inventory`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const all = await res.json();
        const q = query.toLowerCase();
        const filtered = all.filter((m: any) =>
          m.current_stock > 0 &&
          (m.generic_name?.toLowerCase().includes(q) || m.brand_name?.toLowerCase().includes(q))
        );
        setInventoryResults(filtered.slice(0, 10)); // Limit results
      }
    } catch {
      // Silently fail on inventory search error
    }
  };

  const filteredPatients = useMemo(() => {
    if (!patientSearchQuery.trim()) return admittedPatients;
    const q = patientSearchQuery.toLowerCase();
    return admittedPatients.filter(p =>
      p.patient_id.toLowerCase().includes(q) ||
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(q)
    );
  }, [admittedPatients, patientSearchQuery]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Real-time updates
  useEffect(() => {
    const onUpdate = () => { if (!searchTerm.match(/^P\d{4}$/i)) fetchData(); };
    socket.on('pharmacy:prescription_received', onUpdate);
    socket.on('pharmacy:sale_completed', onUpdate);
    return () => {
      socket.off('pharmacy:prescription_received', onUpdate);
      socket.off('pharmacy:sale_completed', onUpdate);
    };
  }, [fetchData, searchTerm]);

  // Handle specific patient search
  useEffect(() => {
    if (searchTerm.match(/^P\d{4}$/i)) {
      const fetchHistory = async () => {
        try {
          const token = localStorage.getItem('hms_staff_token');
          const res = await fetch(`${API}/prescriptions?patient_id=${searchTerm.toUpperCase()}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setPrescriptions(data);
          }
        } catch { }
      };
      fetchHistory();
    } else if (searchTerm === '') {
      fetchData();
    }
  }, [searchTerm, fetchData]);

  // Group prescriptions by patient ID (keep latest) UNLESS searching for specific patient
  const displayPrescriptions = useMemo(() => {
    if (searchTerm.match(/^P\d{4}$/i)) {
      return prescriptions;
    }
    const map = new Map();
    prescriptions.forEach(rx => {
      if (!map.has(rx.patient_id)) {
        map.set(rx.patient_id, rx);
      } else {
        const existing = map.get(rx.patient_id);
        if (new Date(rx.prescription_date) > new Date(existing.prescription_date)) {
          map.set(rx.patient_id, rx);
        }
      }
    });
    return Array.from(map.values()).sort((a: any, b: any) =>
      new Date(b.prescription_date).getTime() - new Date(a.prescription_date).getTime()
    );
  }, [prescriptions, searchTerm]);

  const filtered = displayPrescriptions.filter(rx => {
    const matchSearch = rx.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rx.prescription_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rx.patient_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFilter = filter === 'all' ||
      (filter === 'active' && rx.status !== 'Dispensed') ||
      (filter === 'dispensed' && rx.status === 'Dispensed');
    return matchSearch && matchFilter;
  });

  const activeCount = prescriptions.filter(r => r.status !== 'Dispensed').length;
  const dispensedCount = prescriptions.filter(r => r.status === 'Dispensed').length;
  const totalMeds = prescriptions.reduce((sum, rx) => sum + (rx.medicines?.length || 0), 0);

  const handleAddMedicine = () => {
    setNewPrescription({
      ...newPrescription,
      medicines: [...newPrescription.medicines, { medicine_name: '', quantity: 1, duration: '5 Days', frequency: 'BD', instructions: '' }]
    });
  };

  const handleRemoveMedicine = (idx: number) => {
    setNewPrescription({
      ...newPrescription,
      medicines: newPrescription.medicines.filter((_, i) => i !== idx)
    });
  };

  const submitPrescription = async () => {
    if (!newPrescription.patient_id || !newPrescription.diagnosis) {
      toast.error('Patient and Diagnosis are required');
      return;
    }
    const validMeds = newPrescription.medicines.filter(m => m.medicine_name.trim() !== '');
    if (validMeds.length === 0) {
      toast.error('Add at least one medicine');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('hms_staff_token');
      const payload = {
        ...newPrescription,
        medicines: validMeds,
      };
      const res = await fetch(`${API}/prescriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Prescription Created. Amount auto-deducted from advance.`);
        setShowCreateModal(false);
        setNewPrescription({ patient_id: '', patient_name: '', diagnosis: '', medicines: [{ medicine_name: '', quantity: 1, duration: '5 Days', frequency: 'BD', instructions: '' }] });
        setPatientSearchQuery('');
        fetchData();
      } else {
        toast.error(data.error || 'Failed to create prescription');
      }
    } catch (e) {
      toast.error('Error connecting to server');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-10 w-10 animate-spin text-purple-600" /></div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="bg-purple-100 p-3 rounded-2xl">
            <Pill className="h-8 w-8 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Medications</h1>
            <p className="text-slate-500 font-medium text-sm">Manage pending prescriptions and history</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search ID (e.g. P0007)..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 h-12 bg-slate-50 border-0 rounded-xl focus-visible:ring-purple-500 font-medium"
            />
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg shadow-purple-500/20 font-bold tracking-wide"
          >
            <Plus className="h-5 w-5 mr-2" /> CREATE
          </Button>
        </div>
      </div>

      {/* Stats Components */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Unique', value: displayPrescriptions.length, icon: <Pill className="h-6 w-6 text-purple-600" />, bg: 'bg-purple-50' },
          { label: 'Pending Docs', value: activeCount, icon: <Clock className="h-6 w-6 text-amber-600" />, bg: 'bg-amber-50' },
          { label: 'Dispensed', value: dispensedCount, icon: <CheckCircle2 className="h-6 w-6 text-emerald-600" />, bg: 'bg-emerald-50' },
          { label: 'All Meds', value: totalMeds, icon: <CalendarClock className="h-6 w-6 text-blue-600" />, bg: 'bg-blue-50' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="border-0 shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center gap-4">
                <div className={`p-4 rounded-2xl ${s.bg}`}>
                  {s.icon}
                </div>
                <div>
                  <h3 className="text-3xl font-black text-slate-900">{s.value}</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* View Switcher */}
      <div className="flex gap-2">
        {(['all', 'active', 'dispensed'] as const).map(f => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'ghost'}
            onClick={() => setFilter(f)}
            className={`capitalize rounded-xl h-10 px-6 font-bold ${filter === f ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            {f}
          </Button>
        ))}
      </div>

      {/* Prescription List */}
      <div className="grid gap-4">
        <AnimatePresence>
          {filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center bg-white rounded-3xl border border-slate-100">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-slate-300" />
              </div>
              <h4 className="text-lg font-bold text-slate-400">No prescriptions found</h4>
            </motion.div>
          ) : filtered.map((rx, idx) => (
            <motion.div
              key={rx.id || rx.prescription_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.05, 0.5) }}
            >
              <Card className={`overflow-hidden rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow`}>
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row justify-between gap-6 mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${rx.status === 'Dispensed' ? 'bg-emerald-50 text-emerald-600' : rx.status === 'Paid' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                        {rx.status === 'Dispensed' ? <CheckCircle2 size={24} /> : rx.status === 'Paid' ? <Banknote size={24} /> : <Clock size={24} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-xl font-black text-slate-900">{rx.patient_name}</h3>
                          <Badge className={`${rx.status === 'Dispensed' ? 'bg-emerald-100 text-emerald-800' : rx.status === 'Paid' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-amber-100 text-amber-800'} border-0 uppercase tracking-widest text-[10px] font-black px-2`}>
                            {rx.status}
                          </Badge>
                        </div>
                        <p className="text-sm font-semibold text-slate-400">
                          {rx.patient_id} • {rx.prescription_id} • {new Date(rx.prescription_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl flex-1 max-w-md">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Diagnosis / Notes</p>
                      <p className="font-semibold text-slate-700">{rx.diagnosis || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Medicines Grid */}
                  {rx.medicines && rx.medicines.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2 flex items-center gap-2">
                        <Pill size={12} /> Prescribed List ({rx.medicines.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {rx.medicines.map((med: any, i: number) => (
                          <div key={i} className="bg-white border text-sm flex items-start gap-3 p-4 rounded-2xl shadow-sm hover:border-slate-300 transition-colors">
                            <div className="bg-purple-50 p-2 rounded-xl mt-1">
                              <Pill className="h-4 w-4 text-purple-600" />
                            </div>
                            <div>
                              <p className="font-black text-slate-900 uppercase tracking-tight">{med.medicine_name || med.generic_name}</p>
                              <div className="flex items-center gap-2 mt-1 mb-1">
                                <Badge variant="outline" className="text-[10px] bg-slate-50 font-black text-slate-500 rounded-md border-slate-200 uppercase">
                                  {med.quantity} Units
                                </Badge>
                                <span className="text-[10px] font-bold text-slate-500 uppercase">{med.frequency} • {med.duration}</span>
                              </div>
                              {med.instructions && (
                                <p className="text-[10px] font-bold text-slate-400 italic">"{med.instructions}"</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Create Prescription Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl bg-white border-0 rounded-[2.5rem] shadow-2xl p-8 overflow-hidden">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-xl">
                <Plus className="h-6 w-6 text-purple-600" />
              </div>
              Create Prescription
            </DialogTitle>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
              Advances will be auto-deducted
            </p>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2 relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Patient</label>

                {newPrescription.patient_id ? (
                  <div className="h-14 bg-purple-50 border-2 border-purple-100 rounded-2xl flex items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 font-black text-xs">
                        {newPrescription.patient_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{newPrescription.patient_name}</p>
                        <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest">{newPrescription.patient_id}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setNewPrescription({ ...newPrescription, patient_id: '', patient_name: '' });
                        setPatientSearchQuery('');
                      }}
                      className="text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search ID or Name (Admitted Only)"
                      value={patientSearchQuery}
                      onChange={(e) => {
                        setPatientSearchQuery(e.target.value);
                        setShowPatientDropdown(true);
                      }}
                      onFocus={() => setShowPatientDropdown(true)}
                      className="h-14 pl-12 bg-slate-50 border-0 rounded-2xl shadow-sm focus-visible:ring-purple-500 font-bold"
                    />

                    <AnimatePresence>
                      {showPatientDropdown && patientSearchQuery.trim() && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute z-50 top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 max-h-[250px] overflow-y-auto custom-scrollbar overflow-x-hidden p-2"
                        >
                          <div className="flex justify-between items-center px-2 pb-2 mb-2 border-b border-slate-100">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Matching Admissions</span>
                            <button onClick={() => setShowPatientDropdown(false)} className="text-slate-400 hover:text-slate-900"><Trash2 size={12} /></button>
                          </div>
                          {filteredPatients.length === 0 ? (
                            <div className="p-4 text-center text-sm font-bold text-slate-400">No admitted patient found</div>
                          ) : (
                            filteredPatients.map(p => (
                              <div
                                key={p.patient_id}
                                onClick={() => {
                                  setNewPrescription({ ...newPrescription, patient_id: p.patient_id, patient_name: `${p.first_name} ${p.last_name}` });
                                  setShowPatientDropdown(false);
                                  setPatientSearchQuery('');
                                }}
                                className="p-3 hover:bg-purple-50 rounded-xl cursor-pointer transition-colors flex justify-between items-center group"
                              >
                                <div>
                                  <p className="font-bold text-slate-900 group-hover:text-purple-700">{p.first_name} {p.last_name}</p>
                                  <p className="text-xs font-bold text-slate-500">{p.patient_id}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] font-black text-purple-600 bg-purple-100 px-2 py-1 rounded-md mb-1 uppercase tracking-widest">Available Balance</p>
                                  <p className="text-xs font-bold text-emerald-600">₹{p.advance_payment || 0}</p>
                                </div>
                              </div>
                            ))
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Diagnosis</label>
                <Input
                  placeholder="E.g. Viral Fever"
                  value={newPrescription.diagnosis}
                  onChange={(e) => setNewPrescription({ ...newPrescription, diagnosis: e.target.value })}
                  className="h-14 bg-slate-50 border-0 rounded-2xl shadow-sm focus-visible:ring-purple-500 font-bold"
                />
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Medicines</h3>
                <Button variant="ghost" size="sm" onClick={handleAddMedicine} className="h-8 px-3 text-purple-600 font-black rounded-lg bg-purple-50 hover:bg-purple-100">
                  <Plus className="h-4 w-4 mr-1" /> Add Medicine
                </Button>
              </div>

              <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar space-y-4">
                {newPrescription.medicines.map((med, idx) => (
                  <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3 relative group">
                    <button onClick={() => handleRemoveMedicine(idx)} className="absolute -top-2 -right-2 bg-rose-100 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors h-7 w-7 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100">
                      <Trash2 size={12} />
                    </button>

                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="relative">
                        <Input
                          placeholder="Search Medicine Inventory..."
                          value={activeMedicineIndex === idx ? medicineSearchQuery : med.medicine_name}
                          onFocus={() => {
                            setActiveMedicineIndex(idx);
                            setMedicineSearchQuery(med.medicine_name);
                            if (med.medicine_name) {
                              searchInventory(med.medicine_name);
                            }
                          }}
                          onChange={(e) => {
                            setMedicineSearchQuery(e.target.value);
                            searchInventory(e.target.value);
                            // Also update the state lightly so if they click out, it persists
                            const newMeds = [...newPrescription.medicines];
                            newMeds[idx].medicine_name = e.target.value;
                            setNewPrescription({ ...newPrescription, medicines: newMeds });
                          }}
                          className="h-12 bg-white border-0 rounded-xl shadow-sm font-bold placeholder:text-slate-300 focus-visible:ring-purple-500"
                        />
                        <AnimatePresence>
                          {activeMedicineIndex === idx && medicineSearchQuery.trim() && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="absolute z-40 top-[calc(100%+8px)] left-0 w-full bg-white rounded-2xl shadow-xl border border-slate-100 max-h-[200px] overflow-y-auto custom-scrollbar p-2"
                            >
                              <div className="flex justify-between items-center px-2 pb-2 mb-2 border-b border-slate-100">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">In Stock Medicines</span>
                                <button onClick={() => setActiveMedicineIndex(null)} className="text-slate-400 hover:text-slate-900"><Trash2 size={12} /></button>
                              </div>
                              {inventoryResults.length === 0 ? (
                                <div className="p-3 text-center text-xs font-bold text-slate-400">No stock found</div>
                              ) : (
                                inventoryResults.map(inv => (
                                  <div
                                    key={inv.medicine_id}
                                    onClick={() => {
                                      const newMeds = [...newPrescription.medicines];
                                      newMeds[idx].medicine_name = inv.brand_name || inv.generic_name;
                                      setNewPrescription({ ...newPrescription, medicines: newMeds });
                                      setActiveMedicineIndex(null);
                                      setMedicineSearchQuery('');
                                    }}
                                    className="p-3 hover:bg-purple-50 rounded-xl cursor-pointer transition-colors flex justify-between items-center group"
                                  >
                                    <span className="font-bold text-slate-900 text-sm group-hover:text-purple-700">{inv.brand_name || inv.generic_name}</span>
                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">
                                      {inv.current_stock} in stock
                                    </Badge>
                                  </div>
                                ))
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          type="number" min="1" placeholder="Qty"
                          value={med.quantity}
                          onChange={(e) => {
                            const newMeds = [...newPrescription.medicines];
                            newMeds[idx].quantity = parseInt(e.target.value) || 1;
                            setNewPrescription({ ...newPrescription, medicines: newMeds });
                          }}
                          className="h-12 bg-white border-0 rounded-xl shadow-sm font-bold text-center"
                        />
                        <Select
                          value={med.frequency}
                          onValueChange={(v) => {
                            const newMeds = [...newPrescription.medicines];
                            newMeds[idx].frequency = v;
                            setNewPrescription({ ...newPrescription, medicines: newMeds });
                          }}
                        >
                          <SelectTrigger className="h-12 bg-white border-0 rounded-xl shadow-sm font-bold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-0 shadow-lg">
                            <SelectItem value="OD">OD (Once)</SelectItem>
                            <SelectItem value="BD">BD (Twice)</SelectItem>
                            <SelectItem value="TDS">TDS (Thrice)</SelectItem>
                            <SelectItem value="QID">QID (Four)</SelectItem>
                            <SelectItem value="SOS">SOS (As needed)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={submitPrescription}
              disabled={submitting}
              className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl shadow-xl shadow-slate-900/20 font-black tracking-widest uppercase text-sm mt-4"
            >
              {submitting ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
              {submitting ? 'PROCESSING...' : 'CONFIRM & PRESCRIBE'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
