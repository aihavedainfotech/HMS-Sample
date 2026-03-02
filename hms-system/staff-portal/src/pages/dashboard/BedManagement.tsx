import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { io } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Bed as BedIcon,
  Search,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  Building,
  User,
  ExternalLink,
  TrendingUp,
  LayoutGrid,
  Plus,
  ShieldCheck,
  ArrowRight,
  UserPlus,
  Layers,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const departments = [
  'General Medicine', 'Cardiology', 'Neurology', 'Orthopedics',
  'Pediatrics', 'Emergency', 'Surgery', 'ICU', 'Radiology'
];

const bedTypes = [
  'General', 'Semi-Private', 'Private', 'Deluxe', 'Suite',
  'ICU', 'NICU', 'PICU', 'Emergency'
];

const wardRates: Record<string, number> = {
  'General': 500,
  'Semi-Private': 1200,
  'Private': 2500,
  'Deluxe': 4500,
  'Suite': 8000,
  'ICU': 3500,
  'NICU': 4000,
  'PICU': 3800,
  'Emergency': 1500
};

interface Bed {
  bed_id: string;
  bed_type: string;
  status: 'Vacant' | 'Occupied' | 'Reserved' | 'Under Maintenance' | 'Blocked';
  ward_name: string;
  department: string;
  room_number: string;
  current_patient_id?: string;
  patient_name?: string;
  admission_date?: string;
  expected_discharge_date?: string;
  daily_charge?: number;
  floor_number?: number;
}

interface WardStats {
  name: string;
  total: number;
  occupied: number;
  available: number;
  occupancyRate: number;
}

export default function BedManagement() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('map');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBed, setNewBed] = useState({
    bed_id: '',
    bed_type: 'General',
    department: 'General Medicine',
    ward_name: '',
    floor_number: '',
    room_number: '',
    daily_charge: '500',
    count: '1'
  });

  const fetchBeds = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/beds`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setBeds(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Beds fetch error:', e);
      toast.error('Failed to load bed inventory');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBeds();

    const socketURL = 'http://localhost:5000';
    const socket = io(socketURL, {
      path: '/socket.io/',
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => console.log('BedManagement WebSocket connected'));

    const handleRemoteUpdate = (data: any) => {
      console.log('Real-time bed update received:', data);
      fetchBeds(true);
    };

    socket.on('bed_status_changed', handleRemoteUpdate);
    socket.on('bed_inventory_updated', handleRemoteUpdate);
    socket.on('admission_status_updated', handleRemoteUpdate);

    return () => {
      socket.disconnect();
    };
  }, [fetchBeds]);

  const handleAddBed = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/beds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...newBed,
          count: parseInt(newBed.count) || 1,
          floor_number: parseInt(newBed.floor_number) || 0,
          daily_charge: parseFloat(newBed.daily_charge) || 0
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `Units commissioned successfully`);
        setShowAddModal(false);
        setNewBed({
          bed_id: '', bed_type: 'General', department: 'General Medicine',
          ward_name: '', floor_number: '', room_number: '', daily_charge: '500', count: '1'
        });
        fetchBeds(true);
      } else {
        toast.error(data.error || 'Failed to add units');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const updateBedStatus = async (bedId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/beds/${bedId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success(`Bed ${bedId} status updated to ${newStatus}`);
        fetchBeds(true);
        setSelectedBed(null);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Update failed');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const deleteBed = async (bedId: string) => {
    if (!window.confirm(`Are you sure you want to decommission unit ${bedId}? This action cannot be undone.`)) return;

    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/beds/${bedId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success(`Unit ${bedId} decommissioned successfully`);
        setSelectedBed(null);
        fetchBeds(true);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Decommission failed');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const openAddModalWithContext = (dept?: string, type?: string, floor?: string, ward?: string) => {
    // Extract floor number from "Floor X" or "Ground Floor"
    const floorNum = floor ? (floor.toLowerCase().includes('ground') ? '0' : floor.replace(/\D/g, '')) : '';

    // Extract bed type from classification string (e.g., "ICU Units" -> "ICU")
    const bedType = type ? type.replace(' Units', '') : (newBed.bed_type || 'General');

    setNewBed({
      bed_id: '',
      bed_type: bedType,
      department: dept || 'General Medicine',
      ward_name: ward || '',
      floor_number: floorNum,
      room_number: '',
      daily_charge: wardRates[bedType]?.toString() || '500',
      count: '1'
    });
    setShowAddModal(true);
  };

  const hierarchy = useMemo(() => {
    const tree: Record<string, Record<string, Record<string, Record<string, Bed[]>>>> = {};
    const stats: WardStats[] = [];

    // First, filter beds
    const filtered = beds.filter((b) => {
      const matchSearch = b.bed_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.patient_name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'all' || b.status === statusFilter;
      const matchType = typeFilter === 'all' || b.bed_type === typeFilter;
      const matchDept = departmentFilter === 'all' || b.department === departmentFilter;
      return matchSearch && matchStatus && matchType && matchDept;
    });

    // Build hierarchy
    filtered.forEach((bed) => {
      const dept = bed.department || 'General Medicine';
      const type = bed.bed_type || 'General';
      const floor = bed.floor_number ? `Floor ${bed.floor_number}` : 'Ground Floor';
      const ward = bed.ward_name || 'General Ward';

      if (!tree[dept]) tree[dept] = {};
      if (!tree[dept][type]) tree[dept][type] = {};
      if (!tree[dept][type][floor]) tree[dept][type][floor] = {};
      if (!tree[dept][type][floor][ward]) tree[dept][type][floor][ward] = [];

      tree[dept][type][floor][ward].push(bed);
    });

    // Calculate stats for top-level departments for the summary cards
    const deptStatsMap = new Map<string, Bed[]>();
    beds.forEach(b => {
      const dept = b.department || 'General Medicine';
      if (!deptStatsMap.has(dept)) deptStatsMap.set(dept, []);
      deptStatsMap.get(dept)!.push(b);
    });

    deptStatsMap.forEach((deptBeds, deptName) => {
      const total = deptBeds.length;
      const occupied = deptBeds.filter(b => b.status === 'Occupied').length;
      stats.push({
        name: deptName,
        total,
        occupied,
        available: total - occupied,
        occupancyRate: total > 0 ? Math.round((occupied / total) * 100) : 0
      });
    });

    return { tree, stats };
  }, [beds, searchQuery, statusFilter, typeFilter, departmentFilter]);

  // Filter logic removed as it's now inside the hierarchy memo


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Vacant': return 'bg-emerald-500 hover:bg-emerald-600';
      case 'Occupied': return 'bg-red-500 hover:bg-red-600';
      case 'Reserved': return 'bg-amber-500 hover:bg-amber-600';
      case 'Under Maintenance': return 'bg-slate-500 hover:bg-slate-600';
      default: return 'bg-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-sm text-gray-500">Scanning bed inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 pb-32">
      <div className="max-w-[1600px] mx-auto space-y-10">
        {/* Modern Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
              <BedIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Bed Inventory & Logistics</h1>
              <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-[0.2em] flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Floor Management System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex p-1.5 bg-slate-50 rounded-[1.25rem] border border-slate-100">
              <Button
                variant={viewMode === 'map' ? 'secondary' : 'ghost'}
                size="sm"
                className={`h-10 px-6 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'map' ? 'bg-white shadow-md text-slate-900' : 'text-slate-400'}`}
                onClick={() => setViewMode('map')}
              >
                <LayoutGrid className="h-4 w-4 mr-2" /> Floor Map
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                className={`h-10 px-6 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'grid' ? 'bg-white shadow-md text-slate-900' : 'text-slate-400'}`}
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4 mr-2 rotate-90" /> List View
              </Button>
            </div>
            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
              <DialogTrigger asChild>
                <Button className="h-14 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-100 transition-all font-black uppercase tracking-widest text-xs">
                  <Plus className="h-5 w-5 mr-2" /> Add Unit
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-[2.5rem] p-8 border-0 shadow-2xl sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">Register New Units</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddBed} className="space-y-6 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Department *</Label>
                      <Select value={newBed.department} onValueChange={v => setNewBed({ ...newBed, department: v })}>
                        <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50 font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-100">
                          {departments.map(d => <SelectItem key={d} value={d} className="font-bold">{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Ward Classification *</Label>
                      <Select value={newBed.bed_type} onValueChange={v => setNewBed({ ...newBed, bed_type: v, daily_charge: wardRates[v]?.toString() || '500' })}>
                        <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50 font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-100">
                          {bedTypes.map(t => <SelectItem key={t} value={t} className="font-bold">{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Sector/Ward Name *</Label>
                      <Input
                        placeholder="e.g. Cardiology Ward A"
                        value={newBed.ward_name}
                        onChange={e => setNewBed({ ...newBed, ward_name: e.target.value })}
                        className="h-12 rounded-xl border-slate-200 bg-slate-50 focus:bg-white font-bold"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Bed Count *</Label>
                      <Input
                        type="number"
                        min="1"
                        max="50"
                        value={newBed.count}
                        onChange={e => setNewBed({ ...newBed, count: e.target.value })}
                        className="h-12 rounded-xl border-slate-200 bg-slate-50 focus:bg-white font-bold"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Floor</Label>
                      <Input
                        type="number"
                        value={newBed.floor_number}
                        onChange={e => setNewBed({ ...newBed, floor_number: e.target.value })}
                        className="h-12 rounded-xl border-slate-200 bg-slate-50 focus:bg-white font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Room Base</Label>
                      <Input
                        value={newBed.room_number}
                        onChange={e => setNewBed({ ...newBed, room_number: e.target.value })}
                        className="h-12 rounded-xl border-slate-200 bg-slate-50 focus:bg-white font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Price (₹)</Label>
                      <Input
                        type="number"
                        value={newBed.daily_charge}
                        onChange={e => setNewBed({ ...newBed, daily_charge: e.target.value })}
                        className="h-12 rounded-xl border-slate-200 bg-slate-50 focus:bg-white font-bold"
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">ID Preview Pattern</p>
                    <p className="text-sm font-black text-slate-900">
                      {newBed.department.substring(0, 3).toUpperCase()}-{newBed.bed_type.substring(0, 2).toUpperCase()}-001 TO ...
                    </p>
                  </div>

                  <Button type="submit" className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest shadow-xl shadow-slate-200 transition-all">Commission {newBed.count} Unit(s)</Button>
                </form>
              </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              className="h-14 w-14 rounded-2xl border-slate-200 bg-white text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-xl"
              onClick={() => fetchBeds(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Summary Analytics Removed Per User Request */}


        {/* Global Filter Bar */}
        <Card className="border-0 shadow-2xl shadow-slate-200/60 rounded-[2.5rem] overflow-hidden bg-white">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Scan unit, patient, or ward..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 pl-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white font-bold"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50/50 font-bold">
                  <SelectValue placeholder="Protocol Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100">
                  <SelectItem value="all" className="font-bold">Global Inventory</SelectItem>
                  <SelectItem value="Vacant" className="font-bold">Available Units</SelectItem>
                  <SelectItem value="Occupied" className="font-bold">Admitted Units</SelectItem>
                  <SelectItem value="Reserved" className="font-bold">Locked Units</SelectItem>
                  <SelectItem value="Under Maintenance" className="font-bold">Service Mode</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50/50 font-bold">
                  <SelectValue placeholder="Classification" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100">
                  <SelectItem value="all" className="font-bold">All Formats</SelectItem>
                  {bedTypes.map(t => <SelectItem key={t} value={t} className="font-bold">{t.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50/50 font-bold">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100">
                  <SelectItem value="all" className="font-bold">All Departments</SelectItem>
                  {departments.map(d => <SelectItem key={d} value={d} className="font-bold">{d}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-6 justify-end col-span-1">
                {[
                  { color: 'bg-emerald-500', label: 'Vac' },
                  { color: 'bg-red-500', label: 'Occ' },
                  { color: 'bg-amber-500', label: 'Res' },
                ].map((l, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${l.color}`} />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hierarchical Logistics Ecosystem */}
        <div className="space-y-16">
          {Object.entries(hierarchy.tree).map(([deptName, classifications], dIdx) => (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: dIdx * 0.1 }}
              key={deptName}
              className="space-y-8"
            >
              {/* Level 1: Department */}
              <div className="flex items-center gap-4 bg-slate-900 text-white p-6 py-4 rounded-3xl shadow-xl">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Building className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-black tracking-tight">{deptName}</h2>
                      <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Primary Department Division</p>
                    </div>
                    <button
                      onClick={() => openAddModalWithContext(deptName)}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors group/add"
                      title={`Add beds to ${deptName}`}
                    >
                      <Plus className="h-4 w-4 transition-transform group-hover/add:rotate-90" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="ml-4 md:ml-8 space-y-10 border-l-2 border-slate-100 pl-4 md:pl-8">
                {Object.entries(classifications).map(([className, floors]) => (
                  <div key={className} className="space-y-6">
                    {/* Level 2: Ward Classification */}
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <h3 className="text-lg font-black text-slate-800 tracking-tight">{className} Units</h3>
                      <button
                        onClick={() => openAddModalWithContext(deptName, className)}
                        className="ml-2 p-1 hover:bg-emerald-50 rounded-lg text-emerald-600 transition-colors group/add"
                        title={`Add more ${className} beds`}
                      >
                        <Plus className="h-3 w-3 transition-transform group-hover/add:rotate-90" />
                      </button>
                      <div className="flex-1 h-px bg-slate-100 ml-4" />
                    </div>

                    <div className="space-y-8">
                      {Object.entries(floors).map(([floorName, wards]) => (
                        <div key={floorName} className="space-y-6">
                          {/* Level 3: Floor */}
                          <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 w-fit rounded-full group/floor">
                            <Layers className="h-3 w-3 text-slate-400" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{floorName}</span>
                            <button
                              onClick={() => openAddModalWithContext(deptName, className, floorName)}
                              className="ml-1 p-0.5 hover:bg-slate-200 rounded-md text-slate-400 hover:text-slate-600 transition-colors opacity-0 group-hover/floor:opacity-100"
                              title={`Add beds to ${floorName}`}
                            >
                              <Plus className="h-2.5 w-2.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 gap-8">
                            {Object.entries(wards).map(([wardName, beds]) => (
                              <div key={wardName} className="space-y-4">
                                {/* Level 4: Sector/Ward Name */}
                                <div className="flex items-center justify-between px-2">
                                  <div className="flex items-center gap-3 font-bold text-sm text-slate-600">
                                    <MapPin className="h-4 w-4 text-emerald-500" />
                                    <span>{wardName}</span>
                                    <button
                                      onClick={() => openAddModalWithContext(deptName, className, floorName, wardName)}
                                      className="p-1 hover:bg-emerald-50 rounded-lg text-emerald-600 transition-colors group/add"
                                      title="Add more beds to this ward"
                                    >
                                      <Plus className="h-3 w-3 transition-transform group-hover/add:rotate-90" />
                                    </button>
                                  </div>
                                  <span className="text-[10px] font-black text-slate-400">{beds.length} Units</span>
                                </div>

                                {/* Units Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
                                  {beds.map((bed, idx) => (
                                    <motion.button
                                      initial={{ scale: 0.9, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      transition={{ delay: idx * 0.01 }}
                                      key={bed.bed_id}
                                      onClick={() => setSelectedBed(bed)}
                                      className={`relative p-5 rounded-[1.75rem] border-2 transition-all flex flex-col items-center gap-3 overflow-hidden group hover:-translate-y-2 hover:shadow-2xl active:scale-95 ${bed.status === 'Occupied' ? 'bg-red-50 shadow-lg shadow-red-100 border-red-100' :
                                        bed.status === 'Reserved' ? 'bg-amber-50 shadow-lg shadow-amber-100 border-amber-100' :
                                          bed.status === 'Under Maintenance' ? 'bg-slate-100 border-slate-200 grayscale opacity-60' :
                                            'bg-white border-slate-100 hover:border-emerald-400 shadow-xl shadow-slate-200/20'
                                        }`}
                                    >
                                      <div className={`w-12 h-12 rounded-[1rem] flex items-center justify-center text-white shadow-lg ${getStatusColor(bed.status)} ${bed.status === 'Occupied' ? 'animate-pulse' : ''}`}>
                                        <BedIcon className="h-6 w-6" />
                                      </div>
                                      <div className="text-center space-y-1">
                                        <p className={`text-sm font-black tracking-tight ${bed.status === 'Occupied' ? 'text-red-900' : 'text-slate-900'}`}>{bed.bed_id}</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{bed.bed_type}</p>
                                      </div>
                                      {bed.status === 'Occupied' && (
                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-600 text-[7px] font-black text-white px-2 py-0.5 rounded-full shadow-md uppercase tracking-[0.1em]">ADMITTED</div>
                                      )}
                                    </motion.button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* High-Fidelity Detail Dialog */}
      <Dialog open={!!selectedBed} onOpenChange={() => setSelectedBed(null)}>
        <DialogContent className="sm:max-w-[500px] rounded-[3rem] p-0 overflow-hidden border-0 shadow-2xl">
          {selectedBed && (
            <div className="relative">
              <div className={`h-32 p-8 flex items-end justify-between relative overflow-hidden ${getStatusColor(selectedBed.status)}`}>
                <div className="absolute top-0 right-0 w-1/2 h-full bg-white/10 skew-x-12 translate-x-1/2" />
                <div className="relative z-10 flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30">
                    <BedIcon className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">{selectedBed.bed_id}</h2>
                    <p className="text-white/80 text-[10px] font-black uppercase tracking-widest">{selectedBed.bed_type.replace('_', ' ')}</p>
                  </div>
                </div>
                <Badge className="bg-white/20 backdrop-blur-md text-white border-0 px-4 h-8 text-[10px] font-black uppercase tracking-widest rounded-full relative z-10">
                  {selectedBed.status}
                </Badge>
              </div>

              <div className="p-8 space-y-8">
                {/* Protocol Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Sector</p>
                      <p className="text-sm font-black text-slate-900">{selectedBed.ward_name}</p>
                    </div>
                  </div>
                  <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-500 shadow-sm">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Base Cost</p>
                      <p className="text-sm font-black text-slate-900">₹{selectedBed.daily_charge || 500}</p>
                    </div>
                  </div>
                </div>

                {/* Status Logic Terminal */}
                {selectedBed.status === 'Occupied' ? (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="p-6 rounded-[2rem] bg-slate-900 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full -mr-16 -mt-16 blur-3xl animate-pulse" />
                      <div className="flex items-center gap-6 relative z-10">
                        <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center">
                          <User className="h-8 w-8 text-red-500" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1">Admitted Registry</p>
                          <h3 className="text-xl font-black text-white tracking-tight">{selectedBed.patient_name}</h3>
                          <p className="text-slate-400 text-xs font-bold font-mono mt-1">{selectedBed.current_patient_id}</p>
                        </div>
                      </div>
                      <div className="mt-8 grid grid-cols-2 gap-8 border-t border-slate-800 pt-6 relative z-10">
                        <div>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Arrival Protocol</p>
                          <p className="text-sm font-black text-slate-300 flex items-center gap-2">
                            <Clock className="h-4 w-4 text-emerald-500" />
                            {selectedBed.admission_date ? new Date(selectedBed.admission_date).toLocaleDateString() : 'REAL-TIME'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Estimated T+0</p>
                          <p className="text-sm font-black text-slate-300 flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-indigo-500" />
                            {selectedBed.expected_discharge_date ? new Date(selectedBed.expected_discharge_date).toLocaleDateString() : 'OPEN END'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest shadow-xl shadow-indigo-100 flex items-center gap-3">
                      View Patient Matrix <ArrowRight className="h-5 w-5" />
                    </Button>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Administrative Override</h3>
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Set Vacant', status: 'Vacant', icon: CheckCircle2, active: selectedBed.status === 'Vacant', color: 'emerald' },
                        { label: 'Set Locked', status: 'Reserved', icon: Clock, active: selectedBed.status === 'Reserved', color: 'amber' },
                        { label: 'Set Service', status: 'Under Maintenance', icon: AlertTriangle, active: selectedBed.status === 'Under Maintenance', color: 'slate' },
                        { label: 'Assign', status: 'Occupied', icon: UserPlus, active: false, color: 'indigo' },
                      ].map((btn, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          className={`h-16 rounded-2xl flex items-center gap-4 px-6 border-2 transition-all ${btn.active ? `border-${btn.color}-500 bg-${btn.color}-50 text-${btn.color}-700` : 'border-slate-100 text-slate-600 hover:bg-slate-50'}`}
                          onClick={() => btn.status !== 'Occupied' && updateBedStatus(selectedBed.bed_id, btn.status)}
                          disabled={btn.active}
                        >
                          <btn.icon className={`h-5 w-5 ${btn.active ? `text-${btn.color}-600` : 'text-slate-400'}`} />
                          <span className="text-[10px] font-black uppercase tracking-wide">{btn.label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex flex-col gap-3">
                  {selectedBed.status !== 'Occupied' && (
                    <Button
                      variant="outline"
                      className="w-full h-14 rounded-2xl border-red-100 text-red-600 hover:bg-red-50 font-black uppercase tracking-widest flex items-center gap-2"
                      onClick={() => deleteBed(selectedBed.bed_id)}
                    >
                      <Trash2 className="h-4 w-4" /> Decommission Unit
                    </Button>
                  )}
                  <Button variant="ghost" className="w-full text-slate-400 font-bold hover:text-slate-900" onClick={() => setSelectedBed(null)}>Dismiss Terminal</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
