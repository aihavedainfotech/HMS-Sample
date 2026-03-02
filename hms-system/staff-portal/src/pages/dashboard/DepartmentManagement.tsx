import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Building2, Users, Bed, RefreshCw, Loader2, Plus, MoreVertical, Edit, Trash2, AlertCircle } from 'lucide-react';
import { io } from 'socket.io-client';

interface Department {
  id: number;
  dept_name: string;
}

interface DeptOccupancy {
  name: string;
  patients: number;
  staff: number;
  occupancy: number;
}

export default function DepartmentManagement() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [occupancyData, setOccupancyData] = useState<DeptOccupancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add/Edit state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptName, setDeptName] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const getToken = () => localStorage.getItem('hms_staff_token');

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getToken();
      if (!token) return;

      const [deptRes, dashRes] = await Promise.all([
        fetch(`${API_URL}/admin/departments`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/admin/dashboard`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (deptRes.ok) {
        const deptData = await deptRes.json();
        setDepartments(deptData.departments || []);
      }
      if (dashRes.ok) {
        const dashData = await dashRes.json();
        setOccupancyData(dashData.department_occupancy || []);
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
      setError('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();

    const socketUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';
    const socket = io(socketUrl, {
      transports: ['websocket'],
      reconnection: true,
    });

    socket.on('admin_metrics_updated', () => {
      fetchAll();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/departments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({ dept_name: deptName.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setIsAddOpen(false);
        setDeptName('');
        fetchAll();
      } else {
        alert(data.error || 'Failed to add department');
      }
    } catch (err) {
      console.error('Add dept error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept || !deptName.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/departments/${editingDept.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({ dept_name: deptName.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setIsEditOpen(false);
        setEditingDept(null);
        setDeptName('');
        fetchAll();
      } else {
        alert(data.error || 'Failed to update department');
      }
    } catch (err) {
      console.error('Edit dept error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteDept = async (dept: Department) => {
    if (!confirm(`Are you sure you want to delete "${dept.dept_name}"?`)) return;
    try {
      const res = await fetch(`${API_URL}/admin/departments/${dept.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (res.ok) {
        fetchAll();
      } else {
        alert(data.error || 'Failed to delete department');
      }
    } catch (err) {
      console.error('Delete dept error:', err);
    }
  };

  const openEditModal = (dept: Department) => {
    setEditingDept(dept);
    setDeptName(dept.dept_name);
    setIsEditOpen(true);
  };

  // Merge occupancy data with department list
  const getOccupancy = (deptName: string): DeptOccupancy | undefined => {
    return occupancyData.find(o => o.name === deptName);
  };

  if (loading && departments.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Department Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage departments, monitor capacity and staff</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchAll} variant="outline" size="sm" disabled={loading}
            className="border-gray-200">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Department
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Add New Department</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddDept} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Department Name <span className="text-red-500">*</span></label>
                  <Input
                    required
                    placeholder="e.g. Cardiology"
                    value={deptName}
                    onChange={e => setDeptName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <Button type="button" variant="outline" onClick={() => { setIsAddOpen(false); setDeptName(''); }}>Cancel</Button>
                  <Button type="submit" disabled={actionLoading} className="bg-indigo-600 hover:bg-indigo-700">
                    {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Create Department
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditDept} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Department Name <span className="text-red-500">*</span></label>
              <Input
                required
                placeholder="Department name"
                value={deptName}
                onChange={e => setDeptName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => { setIsEditOpen(false); setDeptName(''); }}>Cancel</Button>
              <Button type="submit" disabled={actionLoading} className="bg-indigo-600 hover:bg-indigo-700">
                {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Building2 className="h-5 w-5 text-indigo-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Total</p>
                <p className="text-xl font-bold text-gray-900">{departments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <Users className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Staff</p>
                <p className="text-xl font-bold text-gray-900">{occupancyData.reduce((a, b) => a + b.staff, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Bed className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Patients</p>
                <p className="text-xl font-bold text-gray-900">{occupancyData.reduce((a, b) => a + b.patients, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">High Load</p>
                <p className="text-xl font-bold text-gray-900">{occupancyData.filter(d => d.occupancy > 75).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Cards Grid */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {departments.map((dept) => {
          const occ = getOccupancy(dept.dept_name);
          return (
            <Card key={dept.id} className="border-none shadow-sm hover:shadow-md transition-all duration-300 group">
              <CardHeader className="pb-3 border-b border-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                      <Building2 className="h-5 w-5 text-indigo-500" />
                    </div>
                    <div>
                      <CardTitle className="text-base text-gray-900">{dept.dept_name}</CardTitle>
                      <p className="text-xs text-gray-500 font-medium tracking-wide uppercase mt-0.5">Active</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="bg-green-50 text-green-700 bg-opacity-50 border-none px-2 py-0.5 text-[10px]">
                      Online
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                          <MoreVertical className="h-4 w-4 text-gray-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 rounded-xl shadow-lg">
                        <DropdownMenuItem onClick={() => openEditModal(dept)} className="cursor-pointer py-2">
                          <Edit className="h-4 w-4 mr-2 text-indigo-500" />
                          Edit Name
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteDept(dept)} className="cursor-pointer py-2 text-red-600 focus:bg-red-50 focus:text-red-700">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-lg">
                    <Users className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-[10px] uppercase text-gray-500 font-semibold tracking-wider">Staff</p>
                      <p className="text-sm font-bold text-gray-900 leading-none mt-1">{occ?.staff ?? 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-lg">
                    <Bed className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-[10px] uppercase text-gray-500 font-semibold tracking-wider">Patients</p>
                      <p className="text-sm font-bold text-gray-900 leading-none mt-1">{occ?.patients ?? 0}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-gray-500">Occupancy Level</span>
                    <span className={(occ?.occupancy ?? 0) > 85 ? 'text-red-600' : (occ?.occupancy ?? 0) > 60 ? 'text-amber-600' : 'text-emerald-600'}>
                      {occ?.occupancy ?? 0}%
                    </span>
                  </div>
                  <Progress
                    value={occ?.occupancy ?? 0}
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {departments.length === 0 && !loading && (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200 shadow-sm">
          <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No departments found</h3>
          <p className="text-gray-500 text-sm">Get started by adding your first department.</p>
          <Button onClick={() => setIsAddOpen(true)} className="mt-4 bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Department
          </Button>
        </div>
      )}
    </div>
  );
}
