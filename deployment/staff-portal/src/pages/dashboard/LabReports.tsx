import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  ArrowLeft, FileText, CheckCircle, AlertTriangle, AlertCircle,
  Printer, Activity, User, Calendar, Loader2, X, Download
} from 'lucide-react';
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

export default function LabReports() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<ReportOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);
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

    const handleRefresh = () => fetchOrders();

    newSocket.on('lab:status_updated', (data) => {
      if (data.status === 'Verified') handleRefresh();
    });
    newSocket.on('lab:stats_updated', handleRefresh);

    fetchOrders();
    const interval = setInterval(fetchOrders, 60000);
    return () => {
      newSocket.close();
      clearInterval(interval);
    };
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/lab/orders/verified`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setOrders(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleGenerateReport = async (order: ReportOrder) => {
    setSelectedOrder(order);

    // If already generated, fetch existing report
    if (order.report_generated && order.report_id) {
      try {
        const token = localStorage.getItem('hms_staff_token');
        const res = await fetch(`${API_URL}/lab/reports/${order.report_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setReportData(data.report_data || data);
          setFindings(data.findings || '');
          setRecommendations(data.recommendations || '');
          setShowReport(true);
          return;
        }
      } catch (e) { console.error(e); }
    }

    // Auto-generate findings
    const criticals = order.test_results.filter(r => r.status === 'critical');
    const abnormals = order.test_results.filter(r => r.status === 'abnormal');

    let auto = 'Test results have been reviewed and analyzed.\n\n';
    if (criticals.length > 0) auto += `CRITICAL FINDINGS: ${criticals.map(c => `${c.parameter} = ${c.value} ${c.unit}`).join('; ')}. Immediate attention required.\n\n`;
    if (abnormals.length > 0) auto += `ABNORMAL FINDINGS: ${abnormals.map(a => `${a.parameter} = ${a.value} ${a.unit} (ref: ${a.reference_range})`).join('; ')}.\n\n`;
    if (criticals.length === 0 && abnormals.length === 0) auto += 'All parameters are within normal reference ranges.\n';

    let recs = '';
    if (criticals.length > 0) recs = 'Urgent consultation with the referring physician is recommended.\nRepeat testing in 24-48 hours.\nPatient should be monitored closely.';
    else if (abnormals.length > 0) recs = 'Follow-up appointment with referring physician recommended.\nConsider dietary and lifestyle modifications.\nRepeat testing in 4-6 weeks.';
    else recs = 'Continue routine health monitoring.\nNo immediate medical intervention required.\nAnnual health check-up recommended.';

    setFindings(auto);
    setRecommendations(recs);
    setReportData(null);
    setShowReport(true);
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

  const getReportHTML = (order: ReportOrder) => {
    const now = new Date();
    return `<!DOCTYPE html><html><head><title>Lab Report - ${order.order_id}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, sans-serif; color: #2d3748; max-width: 800px; margin: auto; padding: 30px; }
  .header { text-align: center; border-bottom: 3px double #1a56db; padding-bottom: 15px; margin-bottom: 25px; }
  .header h1 { color: #1a56db; font-size: 26px; letter-spacing: 1px; }
  .header .subtitle { font-size: 14px; color: #4a5568; margin-top: 4px; }
  .header .contact { font-size: 11px; color: #718096; margin-top: 8px; }
  .report-title { text-align: center; background: #ebf5ff; padding: 10px; margin-bottom: 20px; border-radius: 6px; }
  .report-title h2 { color: #1a56db; font-size: 18px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
  .info-box { background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; }
  .info-box h3 { font-size: 12px; color: #4a5568; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
  .info-box p { font-size: 13px; margin: 4px 0; }
  .info-box strong { color: #2d3748; }
  table { width: 100%; border-collapse: collapse; margin: 15px 0; }
  th { background: #1a56db; color: white; padding: 8px 10px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
  tr:nth-child(even) { background: #f7fafc; }
  .critical { background: #fff5f5 !important; color: #c53030; font-weight: 600; }
  .abnormal { background: #fffbeb !important; color: #c05621; font-weight: 600; }
  .status-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
  .status-normal { background: #c6f6d5; color: #22543d; }
  .status-abnormal { background: #feebc8; color: #7b341e; }
  .status-critical { background: #fed7d7; color: #9b2c2c; }
  .findings { margin: 20px 0; padding: 15px; background: #f7fafc; border-left: 4px solid #1a56db; border-radius: 0 6px 6px 0; }
  .findings h3 { color: #1a56db; font-size: 14px; margin-bottom: 8px; }
  .findings p { font-size: 13px; line-height: 1.6; white-space: pre-wrap; }
  .recommendations { margin: 15px 0; padding: 15px; background: #f0fff4; border-left: 4px solid #38a169; border-radius: 0 6px 6px 0; }
  .recommendations h3 { color: #38a169; font-size: 14px; margin-bottom: 8px; }
  .recommendations p { font-size: 13px; line-height: 1.6; white-space: pre-wrap; }
  .footer { margin-top: 30px; padding-top: 15px; border-top: 2px solid #e2e8f0; display: flex; justify-content: space-between; }
  .footer .sign-box { text-align: center; min-width: 200px; }
  .footer .sign-line { border-top: 1px solid #a0aec0; margin-top: 40px; padding-top: 5px; font-size: 12px; color: #4a5568; }
  .disclaimer { text-align: center; margin-top: 20px; font-size: 10px; color: #a0aec0; }
  .report-id { text-align: right; font-size: 11px; color: #a0aec0; margin-bottom: 10px; }
  @media print {
    body { padding: 15px; }
    .no-print { display: none !important; }
  }
</style></head><body>
<div class="report-id">Report ID: RPT-${order.db_id} | Generated: ${now.toLocaleString('en-IN')}</div>

<div class="header">
  <h1>🏥 CITYCARE HOSPITAL</h1>
  <p class="subtitle">Multi-Speciality Hospital & Research Centre</p>
  <p class="contact">123 Medical Avenue, Healthcare City - 500001 | Phone: +91 40-1234-5678</p>
  <p class="contact">Email: lab@citycare.hospital | NABL Accredited Laboratory</p>
</div>

<div class="report-title">
  <h2>LABORATORY TEST REPORT</h2>
</div>

<div class="info-grid">
  <div class="info-box">
    <h3>Patient Information</h3>
    <p><strong>Name:</strong> ${order.patient_name}</p>
    <p><strong>Patient ID:</strong> ${order.patient_id}</p>
    <p><strong>Age/Gender:</strong> ${order.patient_age} yrs / ${order.patient_gender || 'N/A'}</p>
    <p><strong>Blood Group:</strong> ${order.patient_blood_group || 'N/A'}</p>
    <p><strong>Contact:</strong> ${order.patient_phone || 'N/A'}</p>
  </div>
  <div class="info-box">
    <h3>Test Information</h3>
    <p><strong>Test Name:</strong> ${order.test_name}</p>
    <p><strong>Order ID:</strong> ${order.order_id}</p>
    <p><strong>Ordered By:</strong> Dr. ${order.doctor_name}</p>
    <p><strong>Specialization:</strong> ${order.doctor_specialization}</p>
    <p><strong>Order Date:</strong> ${order.test_date}</p>
    <p><strong>Report Date:</strong> ${now.toLocaleDateString('en-IN')}</p>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>Parameter</th>
      <th>Result</th>
      <th>Unit</th>
      <th>Reference Range</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    ${order.test_results.map(r => `
    <tr class="${r.status === 'critical' ? 'critical' : r.status === 'abnormal' ? 'abnormal' : ''}">
      <td><strong>${r.parameter}</strong></td>
      <td><strong>${r.value}</strong></td>
      <td>${r.unit}</td>
      <td>${r.reference_range}</td>
      <td><span class="status-badge status-${r.status}">${r.status.toUpperCase()}</span></td>
    </tr>`).join('')}
  </tbody>
</table>

<div class="findings">
  <h3>📋 ANALYSIS & FINDINGS</h3>
  <p>${findings || 'No additional findings.'}</p>
</div>

<div class="recommendations">
  <h3>💡 RECOMMENDATIONS</h3>
  <p>${recommendations || 'No specific recommendations.'}</p>
</div>

<div class="footer">
  <div class="sign-box">
    <div class="sign-line">Lab Technician</div>
  </div>
  <div class="sign-box">
    <div class="sign-line">Pathologist / HOD</div>
  </div>
</div>

<div class="disclaimer">
  <p>This report is electronically generated and does not require a physical signature.</p>
  <p>Results are indicative and should be correlated clinically. For queries, contact the laboratory.</p>
  <p>© ${now.getFullYear()} CityCare Hospital. All rights reserved.</p>
</div>
</body></html>`;
  };

  const handleViewReport = (order: ReportOrder) => {
    handleGenerateReport(order);
  };

  const handlePrintReport = (order: ReportOrder) => {
    const html = getReportHTML(order);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);
    }
  };

  const handleDownloadReport = (order: ReportOrder) => {
    const html = getReportHTML(order);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LabReport_${order.patient_id}_${order.order_id}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report downloaded');
  };

  const getStatusIcon = (s: string) => {
    if (s === 'critical') return <AlertCircle className="h-4 w-4 text-red-600" />;
    if (s === 'abnormal') return <AlertTriangle className="h-4 w-4 text-orange-600" />;
    return <CheckCircle className="h-4 w-4 text-green-600" />;
  };

  const getStatusColor = (s: string) => {
    if (s === 'critical') return 'bg-red-100 text-red-800';
    if (s === 'abnormal') return 'bg-orange-100 text-orange-800';
    return 'bg-green-100 text-green-800';
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate('/lab')} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Lab Reports</h1>
          <p className="text-sm text-gray-600">Verified orders — Generate & deliver reports ({orders.length})</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold">No Reports Pending</h3>
            <p className="text-gray-600">All verified orders have been reported</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <Card key={order.order_id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg font-semibold">{order.order_id}</h3>
                      <Badge className="bg-indigo-100 text-indigo-800">VERIFIED</Badge>
                      {order.report_generated && (
                        <Badge className="bg-green-100 text-green-800">📄 REPORT READY</Badge>
                      )}
                    </div>
                    <p className="font-medium">{order.test_name}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1 flex-wrap">
                      <span className="flex items-center gap-1"><User className="h-4 w-4" />{order.patient_name} ({order.patient_id}) • {order.patient_age}yrs/{order.patient_gender}</span>
                      <span className="flex items-center gap-1"><Activity className="h-4 w-4" />Dr. {order.doctor_name}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{order.test_date}</span>
                    </div>

                    <div className="mt-3 flex gap-2 flex-wrap">
                      {order.test_results.slice(0, 3).map((r, i) => (
                        <Badge key={i} variant="outline" className={getStatusColor(r.status)}>
                          {getStatusIcon(r.status)}
                          <span className="ml-1">{r.parameter}: {r.value}</span>
                        </Badge>
                      ))}
                      {order.test_results.length > 3 && (
                        <Badge variant="outline">+{order.test_results.length - 3} more</Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {!order.report_generated ? (
                      <Button onClick={() => handleGenerateReport(order)} className="flex items-center gap-2">
                        <FileText className="h-4 w-4" /> Generate Report
                      </Button>
                    ) : (
                      <>
                        <Button variant="outline" size="sm" onClick={() => handleViewReport(order)} className="flex items-center gap-1">
                          <FileText className="h-3 w-3" /> View Report
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handlePrintReport(order)} className="flex items-center gap-1">
                          <Printer className="h-3 w-3" /> Print Report
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDownloadReport(order)} className="flex items-center gap-1">
                          <Download className="h-3 w-3" /> Download
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Report Generation / View Modal */}
      {showReport && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10 border-b">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Lab Report — {selectedOrder.order_id}
                </CardTitle>
                <p className="text-sm text-gray-600">{selectedOrder.patient_name} • {selectedOrder.test_name}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowReport(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              {/* Hospital Header */}
              <div className="text-center border-b-2 border-blue-600 pb-4">
                <h2 className="text-2xl font-bold text-blue-700">🏥 CITYCARE HOSPITAL</h2>
                <p className="text-sm text-gray-500">Multi-Speciality Hospital & Research Centre</p>
                <p className="text-xs text-gray-400">123 Medical Avenue, Healthcare City - 500001 | +91 40-1234-5678</p>
                <div className="mt-2 inline-block bg-blue-50 px-4 py-1 rounded-full">
                  <p className="font-semibold text-blue-700">LABORATORY TEST REPORT</p>
                </div>
              </div>

              {/* Patient & Test Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-sm text-gray-500 mb-2">PATIENT INFORMATION</h4>
                  <p className="text-sm"><strong>Name:</strong> {selectedOrder.patient_name}</p>
                  <p className="text-sm"><strong>ID:</strong> {selectedOrder.patient_id}</p>
                  <p className="text-sm"><strong>Age/Gender:</strong> {selectedOrder.patient_age} yrs / {selectedOrder.patient_gender || 'N/A'}</p>
                  <p className="text-sm"><strong>Blood Group:</strong> {selectedOrder.patient_blood_group || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-sm text-gray-500 mb-2">TEST INFORMATION</h4>
                  <p className="text-sm"><strong>Test:</strong> {selectedOrder.test_name}</p>
                  <p className="text-sm"><strong>Doctor:</strong> Dr. {selectedOrder.doctor_name}</p>
                  <p className="text-sm"><strong>Specialization:</strong> {selectedOrder.doctor_specialization}</p>
                  <p className="text-sm"><strong>Order Date:</strong> {selectedOrder.test_date}</p>
                </div>
              </div>

              {/* Results Table */}
              <div>
                <h4 className="font-semibold mb-2">Test Results</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-blue-600 text-white">
                        <th className="p-2 text-left">Parameter</th>
                        <th className="p-2 text-left">Result</th>
                        <th className="p-2 text-left">Unit</th>
                        <th className="p-2 text-left">Reference Range</th>
                        <th className="p-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.test_results.map((r, i) => (
                        <tr key={i} className={r.status === 'critical' ? 'bg-red-50' : r.status === 'abnormal' ? 'bg-orange-50' : i % 2 === 0 ? 'bg-gray-50' : ''}>
                          <td className="p-2 font-medium">{r.parameter}</td>
                          <td className="p-2 font-bold">{r.value}</td>
                          <td className="p-2">{r.unit}</td>
                          <td className="p-2">{r.reference_range}</td>
                          <td className="p-2">
                            <Badge className={getStatusColor(r.status)}>
                              {getStatusIcon(r.status)}
                              <span className="ml-1">{r.status.toUpperCase()}</span>
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Findings */}
              {!selectedOrder.report_generated && (
                <div>
                  <h4 className="font-semibold mb-2">Findings *</h4>
                  <textarea value={findings} onChange={e => setFindings(e.target.value)}
                    className="w-full border rounded-lg p-3 min-h-[100px] text-sm" />
                </div>
              )}
              {selectedOrder.report_generated && findings && (
                <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r-lg">
                  <h4 className="font-semibold text-blue-700 mb-2">📋 Analysis & Findings</h4>
                  <p className="text-sm whitespace-pre-wrap">{findings}</p>
                </div>
              )}

              {!selectedOrder.report_generated && (
                <div>
                  <h4 className="font-semibold mb-2">Recommendations</h4>
                  <textarea value={recommendations} onChange={e => setRecommendations(e.target.value)}
                    className="w-full border rounded-lg p-3 min-h-[80px] text-sm" />
                </div>
              )}
              {selectedOrder.report_generated && recommendations && (
                <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded-r-lg">
                  <h4 className="font-semibold text-green-700 mb-2">💡 Recommendations</h4>
                  <p className="text-sm whitespace-pre-wrap">{recommendations}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 flex-wrap">
                <Button variant="outline" onClick={() => setShowReport(false)}>Close</Button>
                {!selectedOrder.report_generated ? (
                  <Button onClick={generateAndStore} disabled={generating} className="flex-1">
                    {generating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating...</> :
                      <><FileText className="h-4 w-4 mr-2" /> Generate & Store Report</>}
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => handlePrintReport(selectedOrder)}>
                      <Printer className="h-4 w-4 mr-2" /> Print
                    </Button>
                    <Button variant="outline" onClick={() => handleDownloadReport(selectedOrder)}>
                      <Download className="h-4 w-4 mr-2" /> Download
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
