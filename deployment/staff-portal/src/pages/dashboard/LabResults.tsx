import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  FlaskConical, Calendar, User, Download, Search, Loader2, Eye,
  CheckCircle2, Printer, FileText, ArrowLeft, X, Activity,
  AlertTriangle, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface TestResult {
  parameter: string;
  value: string;
  unit: string;
  reference_range: string;
  status: string;
}

interface ReportOrder {
  order_id: string;
  db_id: number;
  patient_id: string;
  patient_name: string;
  patient_age: number;
  patient_gender: string;
  patient_blood_group: string;
  patient_phone: string;
  doctor_name: string;
  doctor_specialization: string;
  test_name: string;
  test_type: string;
  test_date: string;
  test_completed_at: string;
  verified_at: string;
  report_generated: boolean;
  report_id: number | null;
  test_results: TestResult[];
}

export default function LabResults() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<ReportOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<ReportOrder | null>(null);
  const [findings, setFindings] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io(API_URL.replace('/api', ''), {
      reconnection: true,
      reconnectionDelay: 1000,
    });
    setSocket(newSocket);

    newSocket.on('connect', () => console.log('Lab Results Socket Connected'));

    const handleRefresh = () => fetchOrders();

    newSocket.on('lab:stats_updated', handleRefresh);

    newSocket.on('lab:status_updated', (data: any) => {
      if (data.status === 'Verified') {
        handleRefresh();
        toast.success(`✅ New report verified and ready!`);
      }
    });

    fetchOrders();

    return () => {
      newSocket.close();
    };
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/lab/orders/verified`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleViewReport = async (order: ReportOrder) => {
    setSelectedOrder(order);

    // If report already generated, fetch it
    if (order.report_generated && order.report_id) {
      try {
        const token = localStorage.getItem('hms_staff_token');
        const res = await fetch(`${API_URL}/lab/reports/${order.report_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setReportData(data.report_data || data);
          setFindings(data.findings || data.report_data?.findings || '');
          setRecommendations(data.recommendations || data.report_data?.recommendations || '');
          return;
        }
      } catch (e) { console.error(e); }
    }

    // Auto-generate findings for new report
    const criticals = order.test_results.filter(r => r.status === 'critical');
    const abnormals = order.test_results.filter(r => r.status === 'abnormal');

    let auto = 'Test results have been reviewed and analyzed.\n\n';
    if (criticals.length > 0) auto += `CRITICAL FINDINGS: ${criticals.map(c => `${c.parameter} = ${c.value} ${c.unit}`).join('; ')}. Immediate attention required.\n\n`;
    if (abnormals.length > 0) auto += `ABNORMAL FINDINGS: ${abnormals.map(a => `${a.parameter} = ${a.value} ${a.unit} (ref: ${a.reference_range})`).join('; ')}.\n\n`;
    if (criticals.length === 0 && abnormals.length === 0) auto += 'All parameters within normal reference ranges.\n';

    let recs = '';
    if (criticals.length > 0) recs = 'Urgent consultation with the referring physician is recommended.\nRepeat testing in 24-48 hours.\nPatient should be monitored closely.';
    else if (abnormals.length > 0) recs = 'Follow-up appointment with referring physician recommended.\nConsider dietary and lifestyle modifications.\nRepeat testing in 4-6 weeks.';
    else recs = 'Continue routine health monitoring.\nNo immediate medical intervention required.\nAnnual health check-up recommended.';

    setFindings(auto);
    setRecommendations(recs);
    setReportData(null);
  };

  const generateAndStore = async () => {
    if (!selectedOrder) return;
    setGenerating(true);
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/lab/reports/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: selectedOrder.db_id,
          findings,
          recommendations
        })
      });
      if (res.ok) {
        const data = await res.json();
        setReportData(data.report_data);
        toast.success('✅ Report generated & stored! Doctor and patient will be notified.');
        fetchOrders();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to generate report');
      }
    } catch (e) { toast.error('Network error'); }
    finally { setGenerating(false); }
  };

  const generateReportHTML = (order: ReportOrder) => {
    const now = new Date();
    const criticals = order.test_results.filter(r => r.status === 'critical').length;
    const abnormals = order.test_results.filter(r => r.status === 'abnormal').length;

    return `<!DOCTYPE html><html><head><title>Lab Report - ${order.order_id}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', 'Segoe UI', sans-serif; color: #1a202c; max-width: 850px; margin: auto; padding: 40px; background: white; }

  .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 120px; color: rgba(26, 86, 219, 0.03); font-weight: 700; pointer-events: none; z-index: 0; }

  .header { text-align: center; border-bottom: 3px solid #1a56db; padding-bottom: 20px; margin-bottom: 25px; position: relative; }
  .header::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #1a56db, #3b82f6, #60a5fa); border-radius: 2px; }
  .header .logo { font-size: 32px; margin-bottom: 5px; }
  .header h1 { color: #1a56db; font-size: 24px; letter-spacing: 2px; font-weight: 700; }
  .header .subtitle { font-size: 13px; color: #4a5568; margin-top: 3px; letter-spacing: 0.5px; }
  .header .contact { font-size: 11px; color: #718096; margin-top: 8px; line-height: 1.6; }
  .header .accreditation { display: inline-block; background: #ebf5ff; color: #1a56db; padding: 3px 12px; border-radius: 12px; font-size: 10px; font-weight: 600; margin-top: 8px; letter-spacing: 0.5px; }

  .report-title { text-align: center; background: linear-gradient(135deg, #ebf5ff, #e0e7ff); padding: 12px; margin-bottom: 25px; border-radius: 8px; border: 1px solid #c7d2fe; }
  .report-title h2 { color: #1a56db; font-size: 16px; font-weight: 600; letter-spacing: 1px; }
  .report-title .report-id { font-size: 11px; color: #6b7280; margin-top: 3px; }

  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; }
  .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; }
  .info-box h3 { font-size: 11px; color: #1a56db; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-bottom: 10px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; }
  .info-box p { font-size: 12px; margin: 5px 0; color: #4a5568; }
  .info-box strong { color: #1a202c; font-weight: 600; }

  .results-section { margin: 20px 0; }
  .results-section h3 { font-size: 14px; color: #1a202c; font-weight: 600; margin-bottom: 10px; padding-left: 10px; border-left: 3px solid #1a56db; }

  table { width: 100%; border-collapse: collapse; margin: 10px 0; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
  th { background: linear-gradient(135deg, #1a56db, #2563eb); color: white; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
  td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
  tr:nth-child(even) { background: #f8fafc; }
  tr:hover { background: #f0f4ff; }
  .critical-row { background: #fef2f2 !important; }
  .critical-row td { color: #991b1b; font-weight: 600; }
  .abnormal-row { background: #fffbeb !important; }
  .abnormal-row td { color: #92400e; }

  .status-badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 600; letter-spacing: 0.3px; }
  .status-normal { background: #d1fae5; color: #065f46; }
  .status-abnormal { background: #fef3c7; color: #92400e; }
  .status-critical { background: #fee2e2; color: #991b1b; }

  .summary-bar { display: flex; gap: 10px; margin: 15px 0; }
  .summary-item { flex: 1; text-align: center; padding: 10px; border-radius: 8px; }
  .summary-normal { background: #d1fae5; }
  .summary-abnormal { background: #fef3c7; }
  .summary-critical { background: #fee2e2; }
  .summary-item .count { font-size: 24px; font-weight: 700; }
  .summary-item .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }

  .findings { margin: 25px 0; padding: 18px; background: #f0f4ff; border-left: 4px solid #1a56db; border-radius: 0 8px 8px 0; }
  .findings h3 { color: #1a56db; font-size: 13px; font-weight: 600; margin-bottom: 10px; letter-spacing: 0.5px; }
  .findings p { font-size: 12px; line-height: 1.8; color: #374151; white-space: pre-wrap; }

  .recommendations { margin: 15px 0; padding: 18px; background: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 0 8px 8px 0; }
  .recommendations h3 { color: #16a34a; font-size: 13px; font-weight: 600; margin-bottom: 10px; letter-spacing: 0.5px; }
  .recommendations p { font-size: 12px; line-height: 1.8; color: #374151; white-space: pre-wrap; }

  .footer { margin-top: 35px; padding-top: 20px; border-top: 2px solid #e2e8f0; }
  .signatures { display: flex; justify-content: space-between; margin-top: 10px; }
  .sign-box { text-align: center; min-width: 180px; }
  .sign-line { border-top: 1px solid #94a3b8; margin-top: 50px; padding-top: 8px; font-size: 11px; color: #4a5568; font-weight: 500; }
  .sign-role { font-size: 10px; color: #94a3b8; margin-top: 2px; }

  .disclaimer { text-align: center; margin-top: 25px; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
  .disclaimer p { font-size: 9px; color: #94a3b8; line-height: 1.6; }

  .barcode { text-align: center; margin-top: 15px; font-family: 'Courier New', monospace; font-size: 14px; letter-spacing: 3px; color: #cbd5e1; }

  @media print {
    body { padding: 20px; }
    .no-print { display: none !important; }
    .watermark { display: none; }
  }
</style></head><body>
<div class="watermark">CITYCARE</div>

<div class="header">
  <div class="logo">🏥</div>
  <h1>CITYCARE HOSPITAL</h1>
  <p class="subtitle">Multi-Speciality Hospital & Diagnostic Centre</p>
  <p class="contact">
    123 Medical Avenue, Healthcare City - 500001<br>
    Phone: +91 40-1234-5678 | Email: lab@citycare.hospital | Web: www.citycare.hospital
  </p>
  <span class="accreditation">NABL ACCREDITED | ISO 15189:2022 CERTIFIED</span>
</div>

<div class="report-title">
  <h2>LABORATORY TEST REPORT</h2>
  <p class="report-id">Report ID: RPT-${order.db_id} | Generated: ${now.toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</p>
</div>

<div class="info-grid">
  <div class="info-box">
    <h3>👤 Patient Information</h3>
    <p><strong>Name:</strong> ${order.patient_name}</p>
    <p><strong>Patient ID:</strong> ${order.patient_id}</p>
    <p><strong>Age / Gender:</strong> ${order.patient_age} years / ${order.patient_gender || 'N/A'}</p>
    <p><strong>Blood Group:</strong> ${order.patient_blood_group || 'N/A'}</p>
    <p><strong>Contact:</strong> ${order.patient_phone || 'N/A'}</p>
  </div>
  <div class="info-box">
    <h3>🧪 Test Information</h3>
    <p><strong>Test Name:</strong> ${order.test_name}</p>
    <p><strong>Order ID:</strong> ${order.order_id}</p>
    <p><strong>Referring Doctor:</strong> Dr. ${order.doctor_name}</p>
    <p><strong>Specialization:</strong> ${order.doctor_specialization}</p>
    <p><strong>Order Date:</strong> ${order.test_date}</p>
    <p><strong>Report Date:</strong> ${now.toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
  </div>
</div>

<div class="summary-bar">
  <div class="summary-item summary-normal">
    <div class="count">${order.test_results.length - abnormals - criticals}</div>
    <div class="label">Normal</div>
  </div>
  <div class="summary-item summary-abnormal">
    <div class="count">${abnormals}</div>
    <div class="label">Abnormal</div>
  </div>
  <div class="summary-item summary-critical">
    <div class="count">${criticals}</div>
    <div class="label">Critical</div>
  </div>
</div>

<div class="results-section">
  <h3>Test Results</h3>
  <table>
    <thead>
      <tr>
        <th style="width:5%">#</th>
        <th style="width:30%">Parameter</th>
        <th style="width:15%">Result</th>
        <th style="width:12%">Unit</th>
        <th style="width:20%">Reference Range</th>
        <th style="width:18%">Status</th>
      </tr>
    </thead>
    <tbody>
      ${order.test_results.map((r, i) => `
      <tr class="${r.status === 'critical' ? 'critical-row' : r.status === 'abnormal' ? 'abnormal-row' : ''}">
        <td>${i + 1}</td>
        <td><strong>${r.parameter}</strong></td>
        <td><strong>${r.value}</strong></td>
        <td>${r.unit}</td>
        <td>${r.reference_range}</td>
        <td><span class="status-badge status-${r.status}">${r.status === 'critical' ? '⚠ CRITICAL' : r.status === 'abnormal' ? '⚡ ABNORMAL' : '✓ NORMAL'}</span></td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>

<div class="findings">
  <h3>📋 ANALYSIS & CLINICAL FINDINGS</h3>
  <p>${findings || 'No additional findings documented.'}</p>
</div>

<div class="recommendations">
  <h3>💡 RECOMMENDATIONS</h3>
  <p>${recommendations || 'No specific recommendations.'}</p>
</div>

<div class="footer">
  <div class="signatures">
    <div class="sign-box">
      <div class="sign-line">Lab Technician</div>
      <div class="sign-role">Department of Laboratory Medicine</div>
    </div>
    <div class="sign-box">
      <div class="sign-line">Dr. ${order.doctor_name}</div>
      <div class="sign-role">${order.doctor_specialization}</div>
    </div>
    <div class="sign-box">
      <div class="sign-line">Pathologist / HOD</div>
      <div class="sign-role">Head of Diagnostics</div>
    </div>
  </div>
</div>

<div class="disclaimer">
  <p>This is an electronically generated report and does not require a physical signature.</p>
  <p>Test results are indicative and should be correlated with clinical findings. For any queries, please contact the laboratory.</p>
  <p>Report generated by CityCare Hospital Laboratory Information System (LIS) on ${now.toLocaleString('en-IN')}</p>
  <p>© ${now.getFullYear()} CityCare Hospital. All rights reserved. | NABL Accreditation No: MC-12345</p>
</div>

<div class="barcode">||||| ${order.order_id} ||||| RPT-${order.db_id} |||||</div>
</body></html>`;
  };

  const handlePrintReport = (order: ReportOrder) => {
    const html = generateReportHTML(order);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);
    }
  };

  const handleDownloadReport = (order: ReportOrder) => {
    const html = generateReportHTML(order);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LabReport_${order.patient_name.replace(/\s+/g, '_')}_${order.order_id}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Report downloaded successfully!');
  };

  const getStatusIcon = (s: string) => {
    if (s === 'critical') return <AlertCircle className="h-4 w-4 text-red-600" />;
    if (s === 'abnormal') return <AlertTriangle className="h-4 w-4 text-orange-600" />;
    return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  };

  const getStatusColor = (s: string) => {
    if (s === 'critical') return 'bg-red-100 text-red-800';
    if (s === 'abnormal') return 'bg-orange-100 text-orange-800';
    return 'bg-green-100 text-green-800';
  };

  const filteredOrders = orders.filter(o =>
    !searchQuery ||
    o.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.patient_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.test_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.doctor_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
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
              <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Lab Reports</h1>
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] ml-5">Validated Diagnostic Archives — Phase 5</p>
          </div>
        </div>
        <div className="relative w-full md:w-[400px] group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors duration-300" />
          <Input
            placeholder="Search patient, test, or doctor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-14 h-16 bg-white border-slate-200 rounded-[2rem] focus-visible:ring-2 focus-visible:ring-indigo-500/20 shadow-xl shadow-slate-200/40 border-0 transition-all duration-300 placeholder:text-slate-400 font-medium"
          />
        </div>
      </motion.div>

      {/* Premium Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {[
          { icon: FileText, label: "Total Verified", value: orders.length, color: "indigo" },
          { icon: CheckCircle2, label: "Generated", value: orders.filter(o => o.report_generated).length, color: "emerald" },
          { icon: FlaskConical, label: "Pending", value: orders.filter(o => !o.report_generated).length, color: "orange" }
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * (i + 1) }}>
            <Card className="border-0 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden bg-white group hover:-translate-y-1 transition-all duration-500">
              <CardContent className="p-10 flex items-center gap-8">
                <div className={`w-20 h-20 bg-${stat.color}-50 rounded-3xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`}>
                  <stat.icon className={`h-10 w-10 text-${stat.color}-600`} />
                </div>
                <div>
                  <p className="text-4xl font-black text-slate-900 tracking-tight mb-1">{stat.value}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Orders List */}
      <AnimatePresence mode="popLayout">
        {filteredOrders.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-[3rem] p-24 text-center border-2 border-dashed border-slate-100 shadow-sm">
            <FlaskConical className="h-20 w-20 mx-auto text-slate-200 mb-6" />
            <h3 className="text-2xl font-black text-slate-900 mb-2">Diagnostic Archives Empty</h3>
            <p className="text-slate-400 font-medium max-w-xs mx-auto">No verified reports match your current search criteria.</p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order, idx) => (
              <motion.div
                key={order.order_id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="border-0 shadow-2xl shadow-slate-200/40 rounded-[2.5rem] overflow-hidden bg-white group hover:shadow-3xl transition-all duration-500 border-l-[6px] border-l-transparent hover:border-l-indigo-600">
                  <CardContent className="p-8">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                      <div className="flex items-start gap-8">
                        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shrink-0 shadow-2xl transition-all duration-500 group-hover:scale-110 ${order.report_generated ? 'bg-emerald-50 text-emerald-600 shadow-emerald-100' : 'bg-indigo-50 text-indigo-600 shadow-indigo-100'}`}>
                          {order.report_generated ? <CheckCircle2 className="h-8 w-8" /> : <FlaskConical className="h-8 w-8" />}
                        </div>
                        <div className="flex-1 min-w-[300px]">
                          <div className="flex items-center gap-4 mb-3 flex-wrap">
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{order.test_name}</h3>
                            <div className="flex gap-2">
                              <Badge className="bg-indigo-50 text-indigo-600 border-0 rounded-lg px-2.5 py-1 font-black text-[10px] tracking-widest uppercase">
                                VERIFIED
                              </Badge>
                              {order.report_generated && (
                                <Badge className="bg-emerald-50 text-emerald-600 border-0 rounded-lg px-2.5 py-1 font-black text-[10px] tracking-widest uppercase">
                                  REPORT READY
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-8 mt-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center shadow-sm">
                                <User className="h-4 w-4 text-slate-400" />
                              </div>
                              <span className="text-sm font-bold text-slate-700">{order.patient_name} <span className="text-slate-400 font-medium ml-1">({order.patient_id})</span></span>
                            </div>
                            <div className="flex items-center gap-3 border-l border-slate-100 pl-8 hidden md:flex">
                              <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center shadow-sm">
                                <Activity className="h-4 w-4 text-slate-400" />
                              </div>
                              <span className="text-sm font-bold text-slate-700">Dr. {order.doctor_name}</span>
                            </div>
                            <div className="flex items-center gap-3 border-l border-slate-100 pl-8">
                              <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center shadow-sm">
                                <Calendar className="h-4 w-4 text-slate-400" />
                              </div>
                              <span className="text-sm font-bold text-slate-400 font-black text-[10px] uppercase tracking-widest">{order.test_date}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 shrink-0 sm:justify-start lg:justify-end">
                        <Button
                          onClick={() => handleViewReport(order)}
                          className={`h-14 px-8 rounded-2xl font-black text-xs gap-3 shadow-xl transition-all duration-300 hover:-translate-y-1 ${order.report_generated ? 'bg-slate-900 text-white hover:bg-indigo-600' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                        >
                          <Eye className="h-5 w-5" />
                          {order.report_generated ? 'VIEW REPORT' : 'GENERATE'}
                        </Button>
                        {order.report_generated && (
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              onClick={() => handleDownloadReport(order)}
                              className="h-14 w-14 rounded-2xl bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all p-0 flex items-center justify-center shadow-sm"
                            >
                              <Download className="h-5 w-5" />
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => handlePrintReport(order)}
                              className="h-14 w-14 rounded-2xl bg-slate-50 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all p-0 flex items-center justify-center shadow-sm"
                            >
                              <Printer className="h-5 w-5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Modern Report Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xl flex items-center justify-center z-[100] p-4 overflow-y-auto py-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="w-full max-w-5xl"
            >
              <Card className="border-0 shadow-3xl rounded-[3rem] overflow-hidden bg-white">
                <CardHeader className="p-12 pb-8 border-b-0 space-y-8 sticky top-0 bg-white/80 backdrop-blur-md z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="bg-indigo-600 w-16 h-16 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-100 transition-transform hover:scale-110 duration-500">
                        <FileText className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-3">Diagnostic Archive</h2>
                        <div className="flex items-center gap-3">
                          <Badge className="bg-indigo-50 text-indigo-600 border-0 rounded-lg px-2.5 py-1 font-black text-[10px] tracking-widest uppercase">
                            DOC-ID: RPT-{selectedOrder.db_id}
                          </Badge>
                          <span className="text-slate-300">|</span>
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{selectedOrder.order_id}</p>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => { setSelectedOrder(null); setReportData(null); }}
                      className="w-14 h-14 rounded-full p-0 hover:bg-slate-100 flex items-center justify-center transition-colors"
                    >
                      <X className="h-6 w-6 text-slate-400" />
                    </Button>
                  </div>

                  {/* Header Branded Section */}
                  <div className="bg-indigo-600 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-indigo-200">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                      <FlaskConical className="w-48 h-48 rotate-12" />
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between gap-10">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-70 mb-2">Diagnostic Entity</p>
                        <h3 className="text-3xl font-black tracking-tight mb-2">CityCare Hospital</h3>
                        <p className="text-sm font-medium opacity-80 max-w-xs">Laboratory Information System (LIS) Verified Diagnostic Protocol</p>
                      </div>
                      <div className="flex flex-col md:items-end md:text-right gap-4">
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Authorization Stage</p>
                          <p className="text-sm font-bold tracking-tight">Level 5 — Consultant Verified</p>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest opacity-70">
                          <Calendar className="h-4 w-4" />
                          {new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-12 pt-6 space-y-12">
                  {/* Subject Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 space-y-6">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Patient Profile</h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Legal Name</span>
                          <span className="text-sm font-black text-slate-900">{selectedOrder.patient_name}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Medical ID</span>
                          <span className="text-sm font-black text-slate-900">{selectedOrder.patient_id}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Demographics</span>
                          <span className="text-sm font-black text-slate-900">{selectedOrder.patient_age}Y / {selectedOrder.patient_gender || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Blood Category</span>
                          <span className="text-sm font-black text-slate-900 uppercase">{selectedOrder.patient_blood_group || 'UNKNOWN'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 space-y-6">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Clinical Context</h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Diagnostic Procedure</span>
                          <span className="text-sm font-black text-slate-900">{selectedOrder.test_name}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Referring Expert</span>
                          <span className="text-sm font-black text-slate-900">Dr. {selectedOrder.doctor_name}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Clinical Specialty</span>
                          <span className="text-sm font-black text-slate-400 font-bold uppercase tracking-widest text-[10px]">{selectedOrder.doctor_specialization}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Order Reference</span>
                          <span className="text-sm font-black text-slate-900">{selectedOrder.order_id}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quantitative Measurements Table */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between ml-2">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Quantitative Measurements</h4>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <span className="text-[9px] font-black text-slate-400">NORMAL</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                          <span className="text-[9px] font-black text-slate-400">ABNORMAL</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-600" />
                          <span className="text-[9px] font-black text-slate-400">CRITICAL</span>
                        </div>
                      </div>
                    </div>
                    <div className="overflow-hidden rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100/50">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-slate-900 text-white">
                            <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest w-12">#</th>
                            <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest">Biochemical Parameter</th>
                            <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest">Result</th>
                            <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest">Analytical Unit</th>
                            <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest">Reference Interval</th>
                            <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest">Clinical Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {selectedOrder.test_results.map((r, i) => (
                            <motion.tr
                              key={i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className={`transition-colors duration-200 hover:bg-slate-50/50 ${r.status === 'critical' ? 'bg-red-50/20' : r.status === 'abnormal' ? 'bg-orange-50/20' : ''}`}
                            >
                              <td className="p-6 text-xs font-black text-slate-300">{i + 1}</td>
                              <td className="p-6 text-sm font-black text-slate-700">{r.parameter}</td>
                              <td className={`p-6 text-lg font-black tracking-tight ${r.status === 'critical' ? 'text-red-600' : r.status === 'abnormal' ? 'text-orange-600' : 'text-slate-900'}`}>
                                {r.value}
                              </td>
                              <td className="p-6 text-xs font-bold text-slate-400">{r.unit}</td>
                              <td className="p-6 text-xs font-bold text-slate-500 tabular-nums">{r.reference_range}</td>
                              <td className="p-6">
                                <Badge className={`rounded-xl px-4 py-2 border-0 flex items-center gap-2 shadow-sm w-fit ${getStatusColor(r.status)}`}>
                                  {getStatusIcon(r.status)}
                                  <span className="font-black text-[10px] tracking-widest uppercase">{r.status}</span>
                                </Badge>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Interpretive Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between ml-2">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Interpretive Observations</h4>
                        <div className="w-2 h-2 rounded-full bg-indigo-500" />
                      </div>
                      {!selectedOrder.report_generated && !reportData ? (
                        <textarea
                          value={findings}
                          onChange={e => setFindings(e.target.value)}
                          className="w-full bg-slate-50 border-2 border-slate-50 rounded-[2.5rem] p-8 min-h-[220px] text-sm font-bold text-slate-700 focus:bg-white focus:border-indigo-200 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none shadow-inner leading-relaxed"
                          placeholder="Synthesize parameters into clinical findings..."
                        />
                      ) : (
                        <div className="bg-slate-50 rounded-[2.5rem] p-10 min-h-[220px] border border-slate-100 shadow-inner">
                          <p className="text-sm font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">{findings}</p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between ml-2">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Clinical Recommendations</h4>
                        <div className="w-2 h-2 rounded-full bg-emerald-500 transition-all hover:scale-110" />
                      </div>
                      {!selectedOrder.report_generated && !reportData ? (
                        <textarea
                          value={recommendations}
                          onChange={e => setRecommendations(e.target.value)}
                          className="w-full bg-slate-50 border-2 border-slate-50 rounded-[2.5rem] p-8 min-h-[220px] text-sm font-bold text-slate-700 focus:bg-white focus:border-emerald-200 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none shadow-inner leading-relaxed"
                          placeholder="Provide actionable medical advice based on analysis..."
                        />
                      ) : (
                        <div className="bg-indigo-900 rounded-[2.5rem] p-10 min-h-[220px] shadow-2xl shadow-indigo-200 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-125 transition-transform duration-700">
                            <CheckCircle2 className="w-48 h-48" />
                          </div>
                          <p className="text-sm font-bold text-white leading-relaxed whitespace-pre-wrap relative z-10">{recommendations}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Verification Signatures (Visible only if report exists) */}
                  {(selectedOrder.report_generated || reportData) && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-8 border-t border-slate-100">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        {[
                          { role: "Laboratory Technician", dept: "Advanced Diagnostics Unit", name: "Technician Verified" },
                          { role: `Dr. ${selectedOrder.doctor_name}`, dept: selectedOrder.doctor_specialization, name: "Consultant Reviewed" },
                          { role: "Authorized Pathologist", dept: "Hospital Quality Board", name: "Final Certification" }
                        ].map((sign, i) => (
                          <div key={i} className="text-center group">
                            <div className="w-32 h-1 bg-slate-100 mx-auto mb-6 rounded-full group-hover:bg-indigo-600 transition-colors duration-500" />
                            <p className="text-sm font-black text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors duration-300">{sign.role}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{sign.dept}</p>
                            <div className="inline-flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{sign.name}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Actions Section */}
                  <div className="flex flex-col sm:flex-row gap-4 pt-8 sticky bottom-0 bg-white/80 backdrop-blur-md pb-4 z-20">
                    <Button
                      variant="ghost"
                      onClick={() => { setSelectedOrder(null); setReportData(null); }}
                      className="h-16 flex-1 rounded-2xl font-black text-slate-400 hover:text-slate-900 transition-all uppercase tracking-widest"
                    >
                      EXIT REVIEW
                    </Button>
                    {!selectedOrder.report_generated && !reportData ? (
                      <Button
                        onClick={generateAndStore}
                        disabled={generating}
                        className="h-16 flex-[2] rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-2xl shadow-indigo-100 transition-all duration-300 hover:-translate-y-1 active:scale-95 text-xs tracking-widest uppercase"
                      >
                        {generating ? (
                          <><Loader2 className="h-5 w-5 animate-spin mr-3" /> PROCESSING...</>
                        ) : (
                          <><FileText className="h-5 w-5 mr-3" /> GENERATE & COMMIT REPORT</>
                        )}
                      </Button>
                    ) : (
                      <div className="flex-[2] flex flex-col sm:flex-row gap-3">
                        <Button
                          onClick={() => handleDownloadReport(selectedOrder)}
                          className="h-16 flex-1 rounded-2xl bg-slate-900 border-0 hover:bg-slate-800 text-white font-black shadow-xl transition-all duration-300 hover:-translate-y-1 active:scale-95 text-[10px] tracking-widest uppercase flex items-center justify-center gap-3"
                        >
                          <Download className="h-5 w-5" /> DOWNLOAD ARCHIVE
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handlePrintReport(selectedOrder)}
                          className="h-16 flex-1 rounded-2xl border-2 border-slate-100 hover:bg-slate-50 text-slate-900 font-black transition-all duration-300 active:scale-95 text-[10px] tracking-widest uppercase flex items-center justify-center gap-3"
                        >
                          <Printer className="h-5 w-5" /> PRINT DIAGNOSTIC
                        </Button>
                      </div>
                    )}
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
