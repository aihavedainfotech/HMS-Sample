import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search, Plus, MoreVertical, Mail, Phone, Edit, Trash2, UserCog, Loader2,
  KeyRound, Eye, EyeOff, Shield, CheckCircle2, Copy, RefreshCw,
  ChevronDown, ChevronRight, Stethoscope, Building2, Users, Activity,
  Pill, FlaskConical, ClipboardList, ShieldCheck, UserCheck,
} from 'lucide-react';
import { io } from 'socket.io-client';

interface Staff {
  id: number;
  staff_id: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile_number: string;
  role: string;
  is_active: number;
  date_of_joining: string;
  dept_name: string;
}

interface Department {
  id: number;
  dept_name: string;
}

const rolesList = ['Admin', 'Doctor', 'Nurse', 'Receptionist', 'Lab Technician', 'Pharmacist', 'Staff'];

const roleConfig: Record<string, { icon: any; color: string; bgLight: string; gradient: string }> = {
  Admin: { icon: ShieldCheck, color: 'text-purple-600', bgLight: 'bg-purple-50', gradient: 'from-purple-500 to-purple-700' },
  Doctor: { icon: Stethoscope, color: 'text-blue-600', bgLight: 'bg-blue-50', gradient: 'from-blue-500 to-blue-700' },
  Nurse: { icon: Activity, color: 'text-emerald-600', bgLight: 'bg-emerald-50', gradient: 'from-emerald-500 to-emerald-700' },
  Receptionist: { icon: ClipboardList, color: 'text-amber-600', bgLight: 'bg-amber-50', gradient: 'from-amber-500 to-amber-600' },
  'Lab Technician': { icon: FlaskConical, color: 'text-teal-600', bgLight: 'bg-teal-50', gradient: 'from-teal-500 to-teal-700' },
  Pharmacist: { icon: Pill, color: 'text-pink-600', bgLight: 'bg-pink-50', gradient: 'from-pink-500 to-pink-700' },
  Staff: { icon: UserCheck, color: 'text-gray-600', bgLight: 'bg-gray-100', gradient: 'from-gray-500 to-gray-700' },
};

export default function StaffManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Collapsed state per role and department
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set(rolesList));
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

  // Dialogs
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCredentialsOpen, setIsCredentialsOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [credStaff, setCredStaff] = useState<Staff | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [credMessage, setCredMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', phone: '', role: '', department_id: ''
  });
  const [credForm, setCredForm] = useState({
    new_staff_id: '', email: '', new_password: '', confirm_password: '', is_active: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      if (!token) return;
      const [staffRes, deptRes] = await Promise.all([
        fetch(`${API_URL}/admin/staff`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/admin/departments`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (staffRes.ok && deptRes.ok) {
        const staffData = await staffRes.json();
        const deptData = await deptRes.json();
        setStaffList(staffData.staff || []);
        setDepartments(deptData.departments || []);
      }
    } catch (err) { console.error('Error fetching staff data:', err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
    const socketUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5002';
    const socket = io(socketUrl, { transports: ['websocket'], reconnection: true });
    socket.on('staff_updated', () => fetchData());
    return () => { socket.disconnect(); };
  }, []);

  // ===== Hierarchy: Role → Department → Staff =====
  const hierarchy = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    const filtered = staffList.filter(s => {
      if (!searchTerm) return true;
      return s.first_name?.toLowerCase().includes(searchLower) ||
        s.last_name?.toLowerCase().includes(searchLower) ||
        s.staff_id?.toLowerCase().includes(searchLower) ||
        s.email?.toLowerCase().includes(searchLower) ||
        s.dept_name?.toLowerCase().includes(searchLower);
    });

    const map: Record<string, Record<string, Staff[]>> = {};
    for (const s of filtered) {
      const role = s.role || 'Staff';
      const dept = s.dept_name || 'Unassigned';
      if (!map[role]) map[role] = {};
      if (!map[role][dept]) map[role][dept] = [];
      map[role][dept].push(s);
    }

    // Sort: roles by predefined order, then departments alphabetically
    const order = rolesList;
    const sorted: { role: string; departments: { dept: string; staff: Staff[] }[] }[] = [];
    for (const role of order) {
      if (!map[role]) continue;
      const depts = Object.entries(map[role])
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dept, staff]) => ({ dept, staff: staff.sort((a, b) => (a.first_name || '').localeCompare(b.first_name || '')) }));
      sorted.push({ role, departments: depts });
    }
    // Any roles not in the preset list
    for (const role of Object.keys(map)) {
      if (!order.includes(role)) {
        const depts = Object.entries(map[role])
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([dept, staff]) => ({ dept, staff }));
        sorted.push({ role, departments: depts });
      }
    }
    return sorted;
  }, [staffList, searchTerm]);

  // Auto-expand departments when searching
  useEffect(() => {
    if (searchTerm) {
      const allDeptKeys = new Set<string>();
      const allRoles = new Set<string>();
      hierarchy.forEach(h => {
        allRoles.add(h.role);
        h.departments.forEach(d => allDeptKeys.add(`${h.role}::${d.dept}`));
      });
      setExpandedRoles(allRoles);
      setExpandedDepts(allDeptKeys);
    }
  }, [searchTerm, hierarchy]);

  const toggleRole = (role: string) => {
    setExpandedRoles(prev => {
      const next = new Set(prev);
      next.has(role) ? next.delete(role) : next.add(role);
      return next;
    });
  };

  const toggleDept = (key: string) => {
    setExpandedDepts(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedRoles(new Set(hierarchy.map(h => h.role)));
    const allKeys = new Set<string>();
    hierarchy.forEach(h => h.departments.forEach(d => allKeys.add(`${h.role}::${d.dept}`)));
    setExpandedDepts(allKeys);
  };
  const collapseAll = () => { setExpandedRoles(new Set()); setExpandedDepts(new Set()); };

  // ===== CRUD handlers (same as before) =====
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setActionLoading(true);
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/admin/staff`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      if (res.ok) { setIsAddOpen(false); setFormData({ first_name: '', last_name: '', email: '', phone: '', role: '', department_id: '' }); fetchData(); }
    } catch (err) { console.error('Add staff error:', err); }
    finally { setActionLoading(false); }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editingStaff) return; setActionLoading(true);
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/admin/staff/${editingStaff.staff_id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      if (res.ok) { setIsEditOpen(false); setEditingStaff(null); fetchData(); }
    } catch (err) { console.error('Edit staff error:', err); }
    finally { setActionLoading(false); }
  };

  const handleDelete = async (staff_id: string) => {
    if (!confirm('Are you sure you want to deactivate this staff member?')) return;
    try {
      const token = localStorage.getItem('hms_staff_token');
      await fetch(`${API_URL}/admin/staff/${staff_id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch (err) { console.error('Delete staff error:', err); }
  };

  const openEditModal = (staff: Staff) => {
    setEditingStaff(staff);
    const dept = departments.find(d => d.dept_name === staff.dept_name);
    setFormData({ first_name: staff.first_name || '', last_name: staff.last_name || '', email: staff.email || '', phone: staff.mobile_number || '', role: staff.role || '', department_id: dept ? dept.id.toString() : '' });
    setIsEditOpen(true);
  };

  const openCredentialsModal = (staff: Staff) => {
    setCredStaff(staff);
    setCredForm({ new_staff_id: staff.staff_id, email: staff.email || '', new_password: '', confirm_password: '', is_active: staff.is_active === 1 });
    setCredMessage(null); setShowPassword(false); setShowConfirmPassword(false); setIsCredentialsOpen(true);
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
    let pwd = ''; for (let i = 0; i < 12; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    setCredForm({ ...credForm, new_password: pwd, confirm_password: pwd }); setShowPassword(true);
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!credStaff) return; setCredMessage(null);
    if (credForm.new_password && credForm.new_password !== credForm.confirm_password) { setCredMessage({ type: 'error', text: 'Passwords do not match' }); return; }
    if (credForm.new_password && credForm.new_password.length < 6) { setCredMessage({ type: 'error', text: 'Password must be at least 6 characters' }); return; }
    if (!credForm.new_staff_id.trim()) { setCredMessage({ type: 'error', text: 'Staff ID is required' }); return; }

    const payload: Record<string, any> = {};
    if (credForm.new_staff_id.trim().toUpperCase() !== credStaff.staff_id) payload.new_staff_id = credForm.new_staff_id.trim();
    if (credForm.email.trim() && credForm.email.trim() !== credStaff.email) payload.email = credForm.email.trim();
    if (credForm.new_password) payload.new_password = credForm.new_password;
    if (credForm.is_active !== (credStaff.is_active === 1)) payload.is_active = credForm.is_active;
    if (Object.keys(payload).length === 0) { setCredMessage({ type: 'error', text: 'No changes to save' }); return; }

    setActionLoading(true);
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/admin/staff/${credStaff.staff_id}/credentials`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) { setCredMessage({ type: 'success', text: data.message || 'Credentials updated!' }); fetchData(); setTimeout(() => setIsCredentialsOpen(false), 2000); }
      else { setCredMessage({ type: 'error', text: data.error || 'Failed to update credentials' }); }
    } catch (err) { setCredMessage({ type: 'error', text: 'Network error. Please try again.' }); }
    finally { setActionLoading(false); }
  };

  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); };

  const totalStaff = staffList.length;
  const activeStaff = staffList.filter(s => s.is_active === 1).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // ===== Render Staff Card =====
  const renderStaffCard = (staff: Staff) => {
    const rc = roleConfig[staff.role] || roleConfig['Staff'];
    return (
      <div key={staff.staff_id}
        className="flex items-center justify-between p-3 sm:p-4 bg-white rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-sm transition-all group"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Avatar className="h-10 w-10 border-2 border-white shadow-sm flex-shrink-0">
            <AvatarFallback className={`bg-gradient-to-br ${rc.gradient} text-white font-semibold text-sm`}>
              {staff.first_name?.charAt(0)}{staff.last_name?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 text-sm truncate">{staff.first_name} {staff.last_name}</span>
              {staff.is_active !== 1 && <Badge className="bg-red-100 text-red-700 border-none text-[10px] px-1.5">Inactive</Badge>}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500 mt-0.5">
              <span className="font-mono text-gray-600 font-medium">{staff.staff_id}</span>
              <span className="hidden sm:flex items-center gap-1 truncate">
                <Mail className="h-3 w-3 text-gray-400" />{staff.email || 'N/A'}
              </span>
              <span className="hidden md:flex items-center gap-1">
                <Phone className="h-3 w-3 text-gray-400" />{staff.mobile_number || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-indigo-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <MoreVertical className="h-4 w-4 text-gray-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-lg border-gray-100">
            <DropdownMenuItem onClick={() => openEditModal(staff)} className="cursor-pointer py-2.5">
              <Edit className="h-4 w-4 mr-3 text-indigo-500" />Edit Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openCredentialsModal(staff)} className="cursor-pointer py-2.5">
              <KeyRound className="h-4 w-4 mr-3 text-amber-500" />Manage Login
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {staff.is_active === 1 ? (
              <DropdownMenuItem onClick={() => handleDelete(staff.staff_id)} className="text-red-600 cursor-pointer py-2.5 focus:bg-red-50">
                <Trash2 className="h-4 w-4 mr-3" />Deactivate
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => openCredentialsModal(staff)} className="text-emerald-600 cursor-pointer py-2.5 focus:bg-emerald-50">
                <CheckCircle2 className="h-4 w-4 mr-3" />Reactivate
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalStaff} staff members • {activeStaff} active • Organized by role and department
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
              <Plus className="h-4 w-4 mr-2" />Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add New Staff Member</DialogTitle></DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">First Name <span className="text-red-500">*</span></label>
                  <Input required placeholder="First name" value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Last Name <span className="text-red-500">*</span></label>
                  <Input required placeholder="Last name" value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Email <span className="text-red-500">*</span></label>
                <Input required type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Phone</label>
                <Input placeholder="Phone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Role <span className="text-red-500">*</span></label>
                  <Select value={formData.role} onValueChange={v => setFormData({ ...formData, role: v })} required>
                    <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent>{rolesList.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Department</label>
                  <Select value={formData.department_id} onValueChange={v => setFormData({ ...formData, department_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select dept" /></SelectTrigger>
                    <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.dept_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-xs text-amber-700 font-medium"><KeyRound className="h-3.5 w-3.5 inline mr-1.5" />Default password: <span className="font-mono bg-amber-100 px-1 py-0.5 rounded">password123</span></p>
                <p className="text-xs text-amber-600 mt-1 ml-5">Change via "Manage Login" after adding.</p>
              </div>
              <div className="pt-4 flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={actionLoading} className="bg-indigo-600 hover:bg-indigo-700">
                  {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Confirm & Add
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, ID, email, or department..."
            className="pl-10 bg-white border-gray-200 rounded-xl"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={expandAll} className="text-xs border-gray-200 hover:bg-gray-50">
            <ChevronDown className="h-3 w-3 mr-1" />Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll} className="text-xs border-gray-200 hover:bg-gray-50">
            <ChevronRight className="h-3 w-3 mr-1" />Collapse All
          </Button>
        </div>
      </div>

      {/* ===== HIERARCHICAL VIEW: Role → Department → Staff ===== */}
      <div className="space-y-4">
        {hierarchy.map(({ role, departments: roleDepts }) => {
          const rc = roleConfig[role] || roleConfig['Staff'];
          const RoleIcon = rc.icon;
          const isRoleExpanded = expandedRoles.has(role);
          const totalInRole = roleDepts.reduce((a, d) => a + d.staff.length, 0);

          return (
            <Card key={role} className="border-none shadow-sm overflow-hidden">
              {/* Role Header */}
              <button
                onClick={() => toggleRole(role)}
                className={`w-full flex items-center justify-between p-4 sm:p-5 hover:bg-gray-50/80 transition-colors cursor-pointer ${isRoleExpanded ? 'border-b border-gray-100' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${rc.bgLight} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <RoleIcon className={`h-5 w-5 ${rc.color}`} />
                  </div>
                  <div className="text-left">
                    <h2 className="text-base font-bold text-gray-900">{role}s</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {totalInRole} member{totalInRole !== 1 ? 's' : ''} • {roleDepts.length} department{roleDepts.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${rc.bgLight} ${rc.color} border-none text-xs font-bold px-2.5 py-1`}>
                    {totalInRole}
                  </Badge>
                  {isRoleExpanded
                    ? <ChevronDown className="h-5 w-5 text-gray-400 transition-transform" />
                    : <ChevronRight className="h-5 w-5 text-gray-400 transition-transform" />
                  }
                </div>
              </button>

              {/* Departments inside this role */}
              {isRoleExpanded && (
                <div className="bg-gray-50/30">
                  {roleDepts.map(({ dept, staff }) => {
                    const deptKey = `${role}::${dept}`;
                    const isDeptExpanded = expandedDepts.has(deptKey);

                    return (
                      <div key={deptKey} className="border-b border-gray-100 last:border-b-0">
                        {/* Department Sub-Header */}
                        <button
                          onClick={() => toggleDept(deptKey)}
                          className={`w-full flex items-center justify-between px-5 sm:px-7 py-3 hover:bg-white/60 transition-colors cursor-pointer`}
                        >
                          <div className="flex items-center gap-2.5">
                            {isDeptExpanded
                              ? <ChevronDown className="h-4 w-4 text-gray-400" />
                              : <ChevronRight className="h-4 w-4 text-gray-400" />
                            }
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-semibold text-gray-700">{dept}</span>
                          </div>
                          <Badge variant="outline" className="text-xs text-gray-500 border-gray-200 bg-white">
                            {staff.length} {staff.length === 1 ? 'member' : 'members'}
                          </Badge>
                        </button>

                        {/* Staff inside this department */}
                        {isDeptExpanded && (
                          <div className="px-5 sm:px-7 pb-4 space-y-2">
                            {staff.map(s => renderStaffCard(s))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {hierarchy.length === 0 && !loading && (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200 shadow-sm">
          <UserCog className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No staff found</h3>
          <p className="text-gray-500 text-sm max-w-sm mx-auto">
            {searchTerm ? 'Try adjusting your search criteria.' : 'Add your first staff member to get started.'}
          </p>
          {searchTerm && (
            <Button variant="outline" className="mt-4 border-indigo-200 text-indigo-700" onClick={() => setSearchTerm('')}>
              Clear Search
            </Button>
          )}
        </div>
      )}

      {/* ===== EDIT PROFILE DIALOG ===== */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Staff: {editingStaff?.staff_id}</DialogTitle></DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><label className="text-sm font-medium text-gray-700">First Name</label><Input required value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} /></div>
              <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Last Name</label><Input required value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Email</label><Input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} /></div>
            <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Phone</label><Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Role</label>
                <Select value={formData.role} onValueChange={v => setFormData({ ...formData, role: v })} required>
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>{rolesList.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Department</label>
                <Select value={formData.department_id} onValueChange={v => setFormData({ ...formData, department_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select dept" /></SelectTrigger>
                  <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.dept_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="pt-4 flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={actionLoading} className="bg-indigo-600 hover:bg-indigo-700">
                {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== CREDENTIALS DIALOG ===== */}
      <Dialog open={isCredentialsOpen} onOpenChange={setIsCredentialsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center"><KeyRound className="h-4 w-4 text-indigo-600" /></div>
              Login Credentials
            </DialogTitle>
          </DialogHeader>
          {credStaff && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-5 pt-2">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold text-sm">
                    {credStaff.first_name?.charAt(0)}{credStaff.last_name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{credStaff.first_name} {credStaff.last_name}</p>
                  <p className="text-xs text-gray-500">{credStaff.role} • {credStaff.dept_name || 'No Department'}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-gray-400" />Staff ID (Login ID) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Input required value={credForm.new_staff_id} onChange={e => setCredForm({ ...credForm, new_staff_id: e.target.value.toUpperCase() })} className="font-mono pr-10" />
                  <button type="button" onClick={() => copyToClipboard(credForm.new_staff_id)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded text-gray-400">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-[11px] text-gray-400">Used for login. Changing it affects the staff member's login.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-gray-400" />Email</label>
                <Input type="email" value={credForm.email} onChange={e => setCredForm({ ...credForm, email: e.target.value })} />
              </div>

              <div className="space-y-3 p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/60 rounded-xl">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-amber-800 flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" />Reset Password</label>
                  <Button type="button" variant="outline" size="sm" onClick={generatePassword} className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100">
                    <RefreshCw className="h-3 w-3 mr-1" />Generate
                  </Button>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-600">New Password</label>
                  <div className="relative">
                    <Input type={showPassword ? 'text' : 'password'} placeholder="Leave empty to keep current" value={credForm.new_password} onChange={e => setCredForm({ ...credForm, new_password: e.target.value })} className="pr-10 font-mono text-sm bg-white" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded text-gray-400">
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-600">Confirm Password</label>
                  <div className="relative">
                    <Input type={showConfirmPassword ? 'text' : 'password'} placeholder="Re-enter" value={credForm.confirm_password} onChange={e => setCredForm({ ...credForm, confirm_password: e.target.value })} className="pr-10 font-mono text-sm bg-white" />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded text-gray-400">
                      {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                {credForm.new_password && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => copyToClipboard(credForm.new_password)} className="h-7 text-xs text-amber-700 hover:bg-amber-100">
                    <Copy className="h-3 w-3 mr-1" />Copy Password
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-700">Account Status</p>
                  <p className="text-xs text-gray-500">{credForm.is_active ? 'Active — can log in' : 'Inactive — login disabled'}</p>
                </div>
                <button type="button" onClick={() => setCredForm({ ...credForm, is_active: !credForm.is_active })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${credForm.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${credForm.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {credMessage && (
                <div className={`p-3 rounded-xl text-sm font-medium flex items-center gap-2 ${credMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {credMessage.type === 'success' ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> : <Shield className="h-4 w-4 flex-shrink-0" />}
                  {credMessage.text}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-1">
                <Button type="button" variant="outline" onClick={() => setIsCredentialsOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={actionLoading} className="bg-indigo-600 hover:bg-indigo-700">
                  {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />}Update Credentials
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
