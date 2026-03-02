import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FlaskConical, Search, Plus, FileText, Clock, Printer, Download,
  CheckCircle2, Loader2, TestTube, Microscope, AlertCircle, Eye,
  User, Calendar, Activity, Droplet, X
} from 'lucide-react';
import { toast } from 'sonner';
import socket from '@/lib/socket';

type LabOrder = any;

const availableTests = [
  'Complete Blood Count (CBC)', 'Lipid Profile', 'Blood Glucose (Fasting)',
  'HbA1c', 'Thyroid Function Test', 'Liver Function Test',
  'Kidney Function Test', 'Urine Analysis', 'Chest X-Ray', 'ECG',
  'Ultrasound', 'CT Scan',
];

export default function DoctorLabOrders() {
  const [searchTerm, setSearchTerm] = useState('');
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [priority, setPriority] = useState('routine');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed'>('all');
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const fetchLabOrders = async (pid?: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('hms_staff_token');
      if (!token) { setLoading(false); return; }
      let url = `${API_URL}/lab/orders`;
      if (pid?.trim()) url += `?patient_id=${encodeURIComponent(pid.trim().toUpperCase())}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        const arr = Array.isArray(data) ? data : (data.orders || []);
        arr.sort((a: any, b: any) => new Date(b.order_date || 0).getTime() - new Date(a.order_date || 0).getTime());
        setLabOrders(arr);
      } else { setLabOrders([]); }
    } catch { setLabOrders([]); }
    finally { setLoading(false); }
  };

  const lookupPatient = async (pid: string) => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      if (!token) return;
      const res = await fetch(`${API_URL}/patient/${pid.toUpperCase()}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setPatientName(data.first_name && data.last_name ? `${data.first_name} ${data.last_name}` : 'Not found');
      } else setPatientName('Not found');
    } catch { setPatientName('Error'); }
  };

  const handlePatientIdChange = (pid: string) => {
    setPatientId(pid.toUpperCase());
    if (pid.trim().length > 0) lookupPatient(pid);
    else setPatientName('');
  };

  const toggleTest = (test: string) => {
    setSelectedTests(prev => prev.includes(test) ? prev.filter(t => t !== test) : [...prev, test]);
  };

  const createLabOrder = async () => {
    if (!patientId.trim()) { toast.error('Enter a patient ID'); return; }
    if (selectedTests.length === 0) { toast.error('Select at least one test'); return; }
    setCreating(true);
    try {
      const token = localStorage.getItem('hms_staff_token');
      if (!token) return;
      const res = await fetch(`${API_URL}/lab/orders`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId, tests: selectedTests, priority, special_instructions: specialInstructions })
      });
      if (res.ok) {
        const response = await res.json();
        if (response.orders && Array.isArray(response.orders)) setLabOrders([...response.orders, ...labOrders]);
        setPatientId(''); setPatientName(''); setSelectedTests([]); setPriority('routine');
        setSpecialInstructions(''); setCreateDialogOpen(false);
        toast.success('Lab order created successfully!');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to create order');
      }
    } catch { toast.error('Network error'); }
    finally { setCreating(false); }
  };

  useEffect(() => {
    fetchLabOrders();
    const onLabOrderCreated = () => { searchTerm ? fetchLabOrders(searchTerm) : fetchLabOrders(); };
    socket.on('lab_order_created', onLabOrderCreated);
    socket.on('lab_report_generated', onLabOrderCreated);
    return () => { socket.off('lab_order_created', onLabOrderCreated); socket.off('lab_report_generated', onLabOrderCreated); };
  }, []);

  // Status helpers
  const isCompleted = (status: string) => ['Verified', 'Delivered', 'Results_Entered', 'completed'].includes(status);
  const isPending = (status: string) => !isCompleted(status);

  const getStatusInfo = (status: string): { label: string; color: string; icon: React.ReactNode } => {
    const s = status || 'Pending';
    switch (s) {
      case 'Pending': return { label: 'Pending', color: 'bg-amber-100 text-amber-800', icon: <Clock className="h-3 w-3" /> };
      case 'Sample_Collected': return { label: 'Sample Collected', color: 'bg-blue-100 text-blue-800', icon: <Droplet className="h-3 w-3" /> };
      case 'In_Progress': return { label: 'In Progress', color: 'bg-indigo-100 text-indigo-800', icon: <Loader2 className="h-3 w-3" /> };
      case 'Results_Entered': return { label: 'Results Ready', color: 'bg-purple-100 text-purple-800', icon: <Activity className="h-3 w-3" /> };
      case 'Verified': return { label: 'Verified', color: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="h-3 w-3" /> };
      case 'Delivered': return { label: 'Report Ready', color: 'bg-emerald-100 text-emerald-800', icon: <FileText className="h-3 w-3" /> };
      default: return { label: s.replace(/_/g, ' '), color: 'bg-gray-100 text-gray-800', icon: <Clock className="h-3 w-3" /> };
    }
  };

  const getPriorityInfo = (p: string): { label: string; color: string } => {
    const pl = (p || 'routine').toLowerCase();
    if (pl === 'urgent' || pl === 'stat') return { label: pl.toUpperCase(), color: 'bg-red-100 text-red-800 border-red-200' };
    return { label: 'Routine', color: 'bg-gray-50 text-gray-600 border-gray-200' };
  };

  // Filter orders
  const filtered = labOrders.filter(o => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = !q || (o.patient_name || '').toLowerCase().includes(q) || (o.patient_id || '').toLowerCase().includes(q) || (o.test_name || '').toLowerCase().includes(q);
    if (activeTab === 'pending') return matchesSearch && isPending(o.status);
    if (activeTab === 'completed') return matchesSearch && isCompleted(o.status);
    return matchesSearch;
  });

  const pendingCount = labOrders.filter(o => isPending(o.status)).length;
  const completedCount = labOrders.filter(o => isCompleted(o.status)).length;

  // Generate professional report HTML
  const generateReportHTML = (order: LabOrder) => {
    const tests = Array.isArray(order.tests) ? order.tests : [];
    const normal = tests.filter((t: any) => t.status === 'Normal').length;
    const abnormal = tests.filter((t: any) => t.status === 'Abnormal').length;
    const critical = tests.filter((t: any) => t.status === 'Critical').length;

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Lab Report - ${order.patient_name}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 30px; color: #333; }
  .header { text-align: center; border-bottom: 3px solid #1a56db; padding-bottom: 15px; margin-bottom: 20px; }
  .header h1 { color: #1a56db; margin: 0; font-size: 24px; }
  .header p { color: #666; margin: 3px 0; font-size: 13px; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; background: #1a56db; color: white; margin-top: 8px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
  .info-box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; }
  .info-box h3 { color: #1a56db; font-size: 13px; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  .info-box p { margin: 4px 0; font-size: 13px; }
  .info-box strong { display: inline-block; min-width: 110px; }
  .stats { display: flex; gap: 12px; margin-bottom: 20px; }
  .stat { flex: 1; text-align: center; padding: 12px; border-radius: 8px; font-weight: 700; font-size: 20px; }
  .stat small { display: block; font-size: 11px; font-weight: 600; margin-top: 2px; }
  .stat.normal { background: #dcfce7; color: #166534; }
  .stat.abnormal { background: #fef3c7; color: #92400e; }
  .stat.critical { background: #fee2e2; color: #991b1b; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #1a56db; color: white; padding: 10px; font-size: 12px; text-align: left; }
  td { padding: 9px 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
  tr:nth-child(even) { background: #f9fafb; }
  .status-normal { color: #166534; font-weight: 600; }
  .status-abnormal { color: #92400e; font-weight: 600; }
  .status-critical { color: #991b1b; font-weight: 700; }
  .footer { margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 15px; font-size: 11px; color: #999; text-align: center; }
  .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
  .sig-line { text-align: center; min-width: 180px; }
  .sig-line hr { border: none; border-top: 1px solid #333; margin-bottom: 4px; }
  @media print { body { padding: 15px; } }
</style></head><body>
<div class="header">
  <h1>🏥 CITYCARE HOSPITAL</h1>
  <p>Multi-Speciality Hospital & Diagnostic Centre</p>
  <p>123 Medical Avenue, Healthcare City - 500001 | +91 40-1234-5678</p>
  <div class="badge">LABORATORY TEST REPORT</div>
</div>
<div class="info-grid">
  <div class="info-box">
    <h3>👤 Patient Information</h3>
    <p><strong>Name:</strong> ${order.patient_name || 'N/A'}</p>
    <p><strong>Patient ID:</strong> ${order.patient_id || 'N/A'}</p>
    <p><strong>Order ID:</strong> LAB-${order.lab_order_id || order.id || 'N/A'}</p>
  </div>
  <div class="info-box">
    <h3>🔬 Test Information</h3>
    <p><strong>Test:</strong> ${order.test_name || order.test_category || 'Lab Test'}</p>
    <p><strong>Ordered By:</strong> Dr. ${order.doctor_name || 'N/A'}</p>
    <p><strong>Order Date:</strong> ${order.order_date ? new Date(order.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</p>
    <p><strong>Report Date:</strong> ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
  </div>
</div>
<div class="stats">
  <div class="stat normal">${normal}<small>NORMAL</small></div>
  <div class="stat abnormal">${abnormal}<small>ABNORMAL</small></div>
  <div class="stat critical">${critical}<small>CRITICAL</small></div>
</div>
<table>
  <thead><tr><th>#</th><th>Parameter</th><th>Result</th><th>Unit</th><th>Reference Range</th><th>Status</th></tr></thead>
  <tbody>
    ${tests.map((t: any, i: number) => `<tr>
      <td>${i + 1}</td>
      <td>${t.test_name || 'N/A'}</td>
      <td><strong>${t.result || 'Pending'}</strong></td>
      <td>${t.unit || '-'}</td>
      <td>${t.normal_range || t.reference_range || '-'}</td>
      <td class="status-${(t.status || 'normal').toLowerCase()}">${(t.status || 'Normal').toUpperCase()}</td>
    </tr>`).join('')}
  </tbody>
</table>
<div class="signatures">
  <div class="sig-line"><hr /><small>Lab Technician</small></div>
  <div class="sig-line"><hr /><small>Dr. ${order.doctor_name || 'N/A'}</small></div>
  <div class="sig-line"><hr /><small>Pathologist</small></div>
</div>
<div class="footer">
  <p>This is a computer-generated report. Results should be interpreted by a qualified medical professional.</p>
  <p>Generated on ${new Date().toLocaleString('en-IN')}</p>
</div>
</body></html>`;
  };

  const handleViewReport = (order: LabOrder) => {
    setSelectedOrder(order);
    setReportDialogOpen(true);
  };

  const handleDownloadReport = (order: LabOrder) => {
    const html = generateReportHTML(order);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Lab_Report_${order.patient_name?.replace(/\s/g, '_') || 'Patient'}_LAB-${order.lab_order_id || order.id}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report downloaded!');
  };

  const handlePrintReport = (order: LabOrder) => {
    const html = generateReportHTML(order);
    const win = window.open('', '', 'width=900,height=700');
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Lab Orders</h1>
          <p className="text-sm text-gray-500">Manage and track laboratory test orders</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> New Lab Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Lab Order</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Patient ID</label>
                <Input placeholder="e.g., P0001" value={patientId} onChange={e => handlePatientIdChange(e.target.value)} className="uppercase" />
                {patientId && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm"><span className="font-medium">Patient:</span> {patientName}</p>
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Priority</label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="stat">STAT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Select Tests</label>
                <div className="border rounded-lg p-3 space-y-2 max-h-60 overflow-y-auto">
                  {availableTests.map(test => (
                    <div key={test} className="flex items-center gap-2">
                      <Checkbox id={test} checked={selectedTests.includes(test)} onCheckedChange={() => toggleTest(test)} />
                      <label htmlFor={test} className="text-sm cursor-pointer">{test}</label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">Selected: {selectedTests.length} test{selectedTests.length !== 1 ? 's' : ''}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Special Instructions</label>
                <Textarea placeholder="Special instructions..." rows={2} value={specialInstructions} onChange={e => setSpecialInstructions(e.target.value)} />
              </div>
              <Button className="w-full" onClick={createLabOrder} disabled={creating}>
                {creating ? 'Creating...' : 'Create Lab Order'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4 flex items-center gap-3">
            <FlaskConical className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-blue-900">{labOrders.length}</p>
              <p className="text-xs text-blue-600 font-medium">Total Orders</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-2xl font-bold text-amber-900">{pendingCount}</p>
              <p className="text-xs text-amber-600 font-medium">In Progress</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-green-900">{completedCount}</p>
              <p className="text-xs text-green-600 font-medium">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-2">
          <Button size="sm" variant={activeTab === 'all' ? 'default' : 'outline'} onClick={() => setActiveTab('all')}>All ({labOrders.length})</Button>
          <Button size="sm" variant={activeTab === 'pending' ? 'default' : 'outline'} onClick={() => setActiveTab('pending')}
            className={activeTab === 'pending' ? '' : 'text-amber-700 border-amber-200 hover:bg-amber-50'}>
            In Progress ({pendingCount})
          </Button>
          <Button size="sm" variant={activeTab === 'completed' ? 'default' : 'outline'} onClick={() => setActiveTab('completed')}
            className={activeTab === 'completed' ? '' : 'text-green-700 border-green-200 hover:bg-green-50'}>
            Completed ({completedCount})
          </Button>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Search patient, test..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') fetchLabOrders(searchTerm); }} className="pl-9" />
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-3" />
          <p className="text-gray-500">Loading lab orders...</p>
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <FlaskConical className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">No lab orders found</h3>
            <p className="text-gray-500">{searchTerm ? `No results for "${searchTerm}"` : 'Create a new lab order to get started'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => {
            const statusInfo = getStatusInfo(order.status);
            const priorityInfo = getPriorityInfo(order.priority);
            const completed = isCompleted(order.status);
            const tests = Array.isArray(order.tests) ? order.tests : [];
            const testName = order.test_name || order.test_category || (tests[0]?.test_name) || 'Lab Test';

            return (
              <Card key={order.lab_order_id || order.id} className={`overflow-hidden hover:shadow-lg transition-all border-l-4 ${completed ? 'border-l-green-500' : 'border-l-amber-400'}`}>
                <CardContent className="p-4 md:p-5">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    {/* Left: Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="font-bold text-base">{order.patient_name || 'Unknown Patient'}</span>
                        <Badge className={statusInfo.color + ' flex items-center gap-1'}>{statusInfo.icon}<span>{statusInfo.label}</span></Badge>
                        <Badge variant="outline" className={priorityInfo.color}>{priorityInfo.label}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap mb-3">
                        <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{order.patient_id}</span>
                        <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />LAB-{order.lab_order_id || order.id}</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{order.order_date ? new Date(order.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</span>
                      </div>
                      {/* Test name and parameters */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${testName.toLowerCase().includes('x-ray') || testName.toLowerCase().includes('ct') || testName.toLowerCase().includes('ultrasound') || testName.toLowerCase().includes('mri') ? 'bg-blue-100' : 'bg-purple-100'}`}>
                          {testName.toLowerCase().includes('x-ray') || testName.toLowerCase().includes('ct') || testName.toLowerCase().includes('ultrasound') || testName.toLowerCase().includes('mri')
                            ? <Microscope className="h-4 w-4 text-blue-600" /> : <TestTube className="h-4 w-4 text-purple-600" />}
                        </div>
                        <span className="font-semibold text-sm">{testName}</span>
                      </div>
                      {tests.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {tests.slice(0, 5).map((t: any, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs py-0.5 flex items-center gap-1">
                              {t.status === 'Normal' ? <CheckCircle2 className="h-3 w-3 text-green-500" /> :
                                t.status === 'Abnormal' ? <AlertCircle className="h-3 w-3 text-amber-500" /> :
                                  t.status === 'Critical' ? <AlertCircle className="h-3 w-3 text-red-500" /> :
                                    <FlaskConical className="h-3 w-3 text-gray-400" />}
                              {t.test_name}{t.result && t.result !== 'Pending' ? `: ${t.result}` : ''}
                            </Badge>
                          ))}
                          {tests.length > 5 && <Badge variant="outline" className="text-xs py-0.5">+{tests.length - 5} more</Badge>}
                        </div>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {completed ? (
                        <>
                          <Button size="sm" onClick={() => handleViewReport(order)} className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700">
                            <Eye className="h-4 w-4" /> View Report
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDownloadReport(order)} className="flex items-center gap-1.5">
                            <Download className="h-4 w-4" /> Download
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handlePrintReport(order)} className="flex items-center gap-1.5">
                            <Printer className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => { setSelectedOrder(order); setViewDialogOpen(true); }} className="flex items-center gap-1.5">
                          <FileText className="h-4 w-4" /> Details
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* View Order Details Dialog (Pending) */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Lab Order Details</DialogTitle></DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 font-medium">Patient</p>
                  <p className="font-semibold">{selectedOrder.patient_name}</p>
                  <p className="text-sm text-gray-500">{selectedOrder.patient_id}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 font-medium">Order</p>
                  <p className="font-semibold">LAB-{selectedOrder.lab_order_id || selectedOrder.id}</p>
                  <p className="text-sm text-gray-500">{selectedOrder.order_date ? new Date(selectedOrder.order_date).toLocaleDateString('en-IN') : 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={getStatusInfo(selectedOrder.status).color}>{getStatusInfo(selectedOrder.status).label}</Badge>
                <Badge variant="outline" className={getPriorityInfo(selectedOrder.priority).color}>{getPriorityInfo(selectedOrder.priority).label}</Badge>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Test: {selectedOrder.test_name || selectedOrder.test_category || 'Lab Test'}</h4>
                {Array.isArray(selectedOrder.tests) && selectedOrder.tests.length > 0 ? (
                  <div className="space-y-2">
                    {selectedOrder.tests.map((t: any, i: number) => (
                      <div key={i} className="p-3 border rounded-lg flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{t.test_name}</p>
                          {t.unit && <p className="text-xs text-gray-500">Unit: {t.unit}</p>}
                          {(t.normal_range || t.reference_range) && <p className="text-xs text-gray-500">Ref: {t.normal_range || t.reference_range}</p>}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">{t.result || 'Pending'}</p>
                          <Badge className={`text-xs ${t.status === 'Normal' ? 'bg-green-100 text-green-700' : t.status === 'Abnormal' ? 'bg-amber-100 text-amber-700' : t.status === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                            {t.status || 'Pending'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-gray-500">Results not yet available</p>}
              </div>
              {selectedOrder.special_instructions && (
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                  <p className="text-xs font-medium text-yellow-700 mb-1">Special Instructions</p>
                  <p className="text-sm">{selectedOrder.special_instructions}</p>
                </div>
              )}
              {selectedOrder.clinical_notes && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-xs font-medium text-blue-700 mb-1">Clinical Notes</p>
                  <p className="text-sm">{selectedOrder.clinical_notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Report Dialog (Completed) */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Lab Report — LAB-{selectedOrder?.lab_order_id || selectedOrder?.id}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              {/* Report Header */}
              <div className="text-center border-b-2 border-blue-600 pb-4">
                <h2 className="text-xl font-bold text-blue-700">🏥 CITYCARE HOSPITAL</h2>
                <p className="text-xs text-gray-500">Multi-Speciality Hospital & Diagnostic Centre</p>
                <p className="text-xs text-gray-500">123 Medical Avenue, Healthcare City - 500001</p>
                <Badge className="bg-blue-600 text-white mt-2">LABORATORY TEST REPORT</Badge>
              </div>

              {/* Patient & Test Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="text-sm font-semibold text-blue-700 mb-2">👤 Patient Information</h4>
                  <p className="text-sm"><strong>Name:</strong> {selectedOrder.patient_name}</p>
                  <p className="text-sm"><strong>Patient ID:</strong> {selectedOrder.patient_id}</p>
                  <p className="text-sm"><strong>Order ID:</strong> LAB-{selectedOrder.lab_order_id || selectedOrder.id}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="text-sm font-semibold text-blue-700 mb-2">🔬 Test Information</h4>
                  <p className="text-sm"><strong>Test:</strong> {selectedOrder.test_name || selectedOrder.test_category || 'Lab Test'}</p>
                  <p className="text-sm"><strong>Ordered By:</strong> Dr. {selectedOrder.doctor_name}</p>
                  <p className="text-sm"><strong>Order Date:</strong> {selectedOrder.order_date ? new Date(selectedOrder.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</p>
                </div>
              </div>

              {/* Results Table */}
              {Array.isArray(selectedOrder.tests) && selectedOrder.tests.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-blue-600 text-white">
                        <th className="p-2.5 text-left rounded-tl-lg">#</th>
                        <th className="p-2.5 text-left">Parameter</th>
                        <th className="p-2.5 text-left">Result</th>
                        <th className="p-2.5 text-left">Unit</th>
                        <th className="p-2.5 text-left">Reference Range</th>
                        <th className="p-2.5 text-left rounded-tr-lg">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.tests.map((t: any, i: number) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                          <td className="p-2.5 border-b">{i + 1}</td>
                          <td className="p-2.5 border-b font-medium">{t.test_name}</td>
                          <td className="p-2.5 border-b font-bold">{t.result || 'Pending'}</td>
                          <td className="p-2.5 border-b text-gray-600">{t.unit || '-'}</td>
                          <td className="p-2.5 border-b text-gray-600">{t.normal_range || t.reference_range || '-'}</td>
                          <td className="p-2.5 border-b">
                            <Badge className={`text-xs ${t.status === 'Normal' ? 'bg-green-100 text-green-700' : t.status === 'Abnormal' ? 'bg-amber-100 text-amber-700' : t.status === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                              {t.status || 'Pending'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button onClick={() => handleDownloadReport(selectedOrder)} className="flex-1 flex items-center justify-center gap-2">
                  <Download className="h-4 w-4" /> Download Report
                </Button>
                <Button variant="outline" onClick={() => handlePrintReport(selectedOrder)} className="flex-1 flex items-center justify-center gap-2">
                  <Printer className="h-4 w-4" /> Print Report
                </Button>
                <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
                  <X className="h-4 w-4 mr-2" /> Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
