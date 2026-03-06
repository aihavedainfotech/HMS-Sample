import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock, Pill, FlaskConical, Building2, User, Search, FileText, Download, Printer, X, CheckCircle } from 'lucide-react';
import { usePatientAuth } from '@/contexts/PatientAuthContext';
import { useNavigate } from 'react-router-dom';

const MedicalRecordsSimple = () => {
  const { patient } = usePatientAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('payments');
  const [loading, setLoading] = useState(true);
  const [payingNow, setPayingNow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [reportViewOrder, setReportViewOrder] = useState<any | null>(null);
  // Data states
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [paidPayments, setPaidPayments] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [labOrders, setLabOrders] = useState<any[]>([]);
  const [admissions, setAdmissions] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const generateLabReportHTML = (labOrder: any) => {
    const results = labOrder.results || [];
    const normal = results.filter((r: any) => r.status === 'Normal').length;
    const abnormal = results.filter((r: any) => r.status === 'Abnormal').length;
    const critical = results.filter((r: any) => r.status === 'Critical').length;
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Lab Report - ${patient?.first_name} ${patient?.last_name}</title>
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:30px;color:#333}
  .header{text-align:center;border-bottom:3px solid #1a56db;padding-bottom:15px;margin-bottom:20px}
  .header h1{color:#1a56db;margin:0;font-size:24px}
  .header p{color:#666;margin:3px 0;font-size:13px}
  .badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;background:#1a56db;color:white;margin-top:8px}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}
  .info-box{border:1px solid #e5e7eb;border-radius:8px;padding:14px}
  .info-box h3{color:#1a56db;font-size:13px;margin:0 0 10px;text-transform:uppercase;letter-spacing:.5px}
  .info-box p{margin:4px 0;font-size:13px}
  .info-box strong{display:inline-block;min-width:110px}
  .stats{display:flex;gap:12px;margin-bottom:20px}
  .stat{flex:1;text-align:center;padding:12px;border-radius:8px;font-weight:700;font-size:20px}
  .stat small{display:block;font-size:11px;font-weight:600;margin-top:2px}
  .stat.normal{background:#dcfce7;color:#166534}
  .stat.abnormal{background:#fef3c7;color:#92400e}
  .stat.critical{background:#fee2e2;color:#991b1b}
  table{width:100%;border-collapse:collapse;margin-bottom:20px}
  th{background:#1a56db;color:white;padding:10px;font-size:12px;text-align:left}
  td{padding:9px 10px;border-bottom:1px solid #e5e7eb;font-size:13px}
  tr:nth-child(even){background:#f9fafb}
  .footer{margin-top:30px;border-top:1px solid #e5e7eb;padding-top:15px;font-size:11px;color:#999;text-align:center}
  @media print{body{padding:15px}}
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
    <p><strong>Name:</strong> ${patient?.first_name} ${patient?.last_name}</p>
    <p><strong>Patient ID:</strong> ${patient?.patient_id}</p>
    <p><strong>Date of Birth:</strong> ${patient?.date_of_birth || 'N/A'}</p>
  </div>
  <div class="info-box">
    <h3>🔬 Test Information</h3>
    <p><strong>Test:</strong> ${labOrder.test_name}</p>
    <p><strong>Category:</strong> ${labOrder.test_category || 'Pathology'}</p>
    <p><strong>Order Date:</strong> ${labOrder.order_date ? new Date(labOrder.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</p>
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
    ${results.map((r: any, i: number) => `<tr>
      <td>${i + 1}</td><td>${r.parameter_name}</td>
      <td><strong>${r.result_value || 'Pending'}</strong></td>
      <td>${r.unit || '-'}</td><td>${r.reference_range || '-'}</td>
      <td style="color:${r.status === 'Normal' ? '#166534' : r.status === 'Abnormal' ? '#92400e' : '#991b1b'};font-weight:600">${r.status}</td>
    </tr>`).join('')}
  </tbody>
</table>
<div class="footer">
  <p>This is a computer-generated report. Results should be interpreted by a qualified medical professional.</p>
  <p>Generated on ${new Date().toLocaleString('en-IN')}</p>
</div>
</body></html>`;
  };

  const downloadLabResults = (labOrder: any) => {
    try {
      const html = generateLabReportHTML(labOrder);
      const blob = new Blob([html], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Lab_Report_${patient?.first_name}_${patient?.last_name}_LAB-${labOrder.id}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      alert('Lab report downloaded!');
    } catch (err) {
      alert('Failed to download report');
      console.error(err);
    }
  };

  const printLabReport = (labOrder: any) => {
    const html = generateLabReportHTML(labOrder);
    const win = window.open('', '', 'width=900,height=700');
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  };

  const processPayment = async (paymentId: string | number) => {
    try {
      setPayingNow(true);
      const token = localStorage.getItem('patientToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/patient/pay`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_id: paymentId,
          method: 'Online',
        })
      });

      if (!response.ok) {
        throw new Error('Payment processing failed');
      }

      alert('Payment successful!');
      fetchData(); // Refresh records
    } catch (err) {
      alert('Failed to process payment');
      console.error(err);
    } finally {
      setPayingNow(false);
    }
  };

  const downloadInvoice = (payment: any) => {
    try {
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice - ${payment.id}</title>
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:40px;color:#333;line-height:1.6}
  .header{text-align:center;border-bottom:2px solid #1a56db;padding-bottom:20px;margin-bottom:30px}
  .header h1{color:#1a56db;margin:0;font-size:28px}
  .header p{color:#666;margin:5px 0;font-size:14px}
  .invoice-details{display:flex;justify-content:space-between;margin-bottom:40px;background:#f8fafc;padding:20px;border-radius:8px}
  .invoice-details h3{margin-top:0;color:#1e40af;font-size:16px}
  .invoice-details p{margin:5px 0;font-size:14px}
  table{width:100%;border-collapse:collapse;margin-bottom:30px}
  th{background:#1a56db;color:white;padding:12px;font-size:14px;text-align:left}
  td{padding:12px;border-bottom:1px solid #e2e8f0;font-size:14px}
  .total-row{font-weight:bold;background:#f1f5f9;font-size:16px}
  .status{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;background:#dcfce7;color:#166534}
  .footer{text-align:center;color:#64748b;font-size:12px;margin-top:50px;padding-top:20px;border-top:1px solid #e2e8f0}
</style></head><body>
<div class="header">
  <h1>🏥 CITYCARE HOSPITAL</h1>
  <p>123 Medical Avenue, Healthcare City - 500001</p>
  <p>Phone: +91 40-1234-5678 | Email: billing@citycare.com</p>
</div>
<div class="invoice-details">
  <div>
    <h3>BILL TO</h3>
    <p><strong>Patient Name:</strong> ${patient?.first_name} ${patient?.last_name}</p>
    <p><strong>Patient ID:</strong> ${patient?.patient_id}</p>
  </div>
  <div style="text-align:right">
    <h3>RECEIPT DETAILS</h3>
    <p><strong>Receipt #:</strong> RCPT-${payment.id}</p>
    <p><strong>Date:</strong> ${new Date(payment.updated_at || payment.created_at).toLocaleString('en-IN')}</p>
    <span class="status">PAID</span>
  </div>
</div>
<table>
  <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
  <tbody>
    <tr><td>${payment.description}</td><td style="text-align:right">₹${payment.amount}</td></tr>
    <tr class="total-row"><td>Grand Total</td><td style="text-align:right;color:#1a56db">₹${payment.amount}</td></tr>
  </tbody>
</table>
<div class="footer">
  <p>Thank you for choosing CityCare Hospital.</p>
  <p>This is a computer generated receipt and does not require a physical signature.</p>
  <p>Generated on ${new Date().toLocaleString('en-IN')}</p>
</div>
</body></html>`;
      const blob = new Blob([html], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice_${patient?.first_name}_${patient?.last_name}_RCPT-${payment.id}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download invoice');
      console.error(err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('patientToken');

      if (!token) {
        navigate('/patient/login');
        return;
      }

      // Fetch all data in parallel
      const [paymentRes, medicalRes, admissionsRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL || '/api'}/patient/payment-history`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${import.meta.env.VITE_API_URL || '/api'}/patient/medical-records`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${import.meta.env.VITE_API_URL || '/api'}/admissions?patient_id=${patient?.patient_id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      // Handle payment data
      if (paymentRes.ok) {
        const paymentData = await paymentRes.json();
        setPendingPayments(paymentData.pending_payments || []);
        setPaidPayments(paymentData.paid_payments || []);
      }

      // Handle medical records data
      if (medicalRes.ok) {
        const medicalData = await medicalRes.json();
        setPrescriptions(medicalData.prescriptions || []);
        setLabOrders(medicalData.lab_orders || []);
      }

      // Handle admissions data
      if (admissionsRes.ok) {
        const admissionsData = await admissionsRes.json();
        setAdmissions(admissionsData.admissions || []);
      }

    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load medical records');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading medical records...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <AlertCircle className="mx-auto h-16 w-16 text-red-400 mb-4" />
            <h3 className="text-lg font-medium text-red-900 mb-2">Error Loading Records</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Medical Records</h1>
          <p className="text-gray-600 mt-1">View your payments, prescriptions, lab results, and admissions</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search records..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Patient Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-100 rounded-full p-3">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {patient?.first_name} {patient?.last_name}
              </h3>
              <p className="text-sm text-gray-600">Patient ID: {patient?.patient_id}</p>
              <p className="text-sm text-gray-600">Date of Birth: {patient?.date_of_birth}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('payments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'payments'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <Clock className="h-4 w-4" />
            Payments ({pendingPayments.length + paidPayments.length})
          </button>
          <button
            onClick={() => setActiveTab('prescriptions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'prescriptions'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <Pill className="h-4 w-4" />
            Prescriptions ({prescriptions.length})
          </button>
          <button
            onClick={() => setActiveTab('labresults')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'labresults'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <FlaskConical className="h-4 w-4" />
            Lab Results ({labOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('admissions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'admissions'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <Building2 className="h-4 w-4" />
            Admissions ({admissions.length})
          </button>
        </nav>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200">
              <CardContent className="p-4">
                <h3 className="font-semibold text-amber-900">Pending Payments</h3>
                <p className="text-2xl font-bold text-amber-900">{pendingPayments.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4">
                <h3 className="font-semibold text-green-900">Paid</h3>
                <p className="text-2xl font-bold text-green-900">{paidPayments.length}</p>
              </CardContent>
            </Card>
          </div>

          {pendingPayments.length > 0 && (
            <div>
              <h2 className="text-lg font-bold mb-4">Pending Payments</h2>
              <div className="space-y-3">
                {pendingPayments.map((payment) => (
                  <Card key={payment.id}>
                    <CardContent className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h4 className="font-semibold">{payment.description}</h4>
                        <p className="text-sm text-gray-600">Reference: {payment.reference_type.toUpperCase()} #{payment.reference_id}</p>
                        <p className="text-sm text-gray-600">Date: {new Date(payment.created_at).toLocaleDateString()}</p>
                        <p className="font-medium text-amber-900 mt-1 flex items-center gap-1">
                          Amount Due: ₹{payment.amount}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Badge className="bg-amber-100 text-amber-800 self-end md:self-auto">Pending</Badge>
                        <Button
                          onClick={() => processPayment(payment.id)}
                          disabled={payingNow}
                          className="w-full md:w-auto mt-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                        >
                          {payingNow ? 'Processing...' : 'Pay Now'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {paidPayments.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-bold mb-4">Payment History</h2>
              <div className="space-y-3">
                {paidPayments.map((payment) => (
                  <Card key={payment.id}>
                    <CardContent className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h4 className="font-semibold">{payment.description}</h4>
                        <p className="text-sm text-gray-600">Reference: {payment.reference_type.toUpperCase()} #{payment.reference_id}</p>
                        <p className="text-sm text-gray-600">Paid On: {new Date(payment.updated_at || payment.created_at).toLocaleDateString()}</p>
                        <p className="font-medium text-green-900 mt-1 flex items-center gap-1">
                          Amount Paid: ₹{payment.amount}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Badge className="bg-green-100 text-green-800 self-end md:self-auto flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> Paid
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadInvoice(payment)}
                          className="w-full md:w-auto mt-2 flex items-center gap-2"
                        >
                          <FileText className="h-4 w-4" /> View Invoice
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'prescriptions' && (
        <div className="space-y-6">
          <h2 className="text-lg font-bold">Prescriptions</h2>
          {prescriptions.length > 0 ? (
            <div className="space-y-3">
              {prescriptions.map((prescription) => (
                <Card key={prescription.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold">{prescription.chief_complaint || 'Prescription'}</h4>
                        <p className="text-sm text-gray-600">Diagnosis: {prescription.diagnosis}</p>
                        <p className="text-sm text-gray-600">Date: {new Date(prescription.prescription_date).toLocaleDateString()}</p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800">{prescription.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <Pill className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Prescriptions</h3>
                <p className="text-gray-600">You have no prescription records</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'labresults' && (
        <div className="space-y-6">
          <h2 className="text-lg font-bold">Lab Results</h2>
          {labOrders.length > 0 ? (
            <div className="space-y-3">
              {labOrders.map((lab) => (
                <Card key={lab.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold">{lab.test_name}</h4>
                        <p className="text-sm text-gray-600">Category: {lab.test_category}</p>
                        <p className="text-sm text-gray-600">Date: {new Date(lab.order_date).toLocaleDateString()}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className="bg-purple-100 text-purple-800">{lab.status}</Badge>
                        {lab.status === 'Delivered' && (
                          <Button size="sm" variant="outline" onClick={() => setReportViewOrder(lab)}>
                            <FileText className="h-4 w-4 mr-1" /> View Report
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <FlaskConical className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Lab Results</h3>
                <p className="text-gray-600">You have no lab test results</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'admissions' && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-gradient-to-r from-orange-50 to-red-100 border-red-200">
              <CardContent className="p-4">
                <h3 className="font-semibold text-red-900">Total Admissions</h3>
                <p className="text-2xl font-bold text-red-900">{admissions.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4">
                <h3 className="font-semibold text-green-900">Currently Admitted</h3>
                <p className="text-2xl font-bold text-green-900">{admissions.filter(a => a.status === 'Admitted').length}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <h3 className="font-semibold text-blue-900">Discharged</h3>
                <p className="text-2xl font-bold text-blue-900">{admissions.filter(a => a.status === 'Discharged').length}</p>
              </CardContent>
            </Card>
          </div>

          {admissions.length > 0 ? (
            <div>
              <h2 className="text-lg font-bold mb-4">Admission History</h2>
              <div className="space-y-3">
                {admissions.map((admission) => (
                  <Card key={admission.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-semibold">
                            {admission.admission_date ? new Date(admission.admission_date).toLocaleDateString() : 'N/A'}
                          </h4>
                          <p className="text-sm text-gray-600">Department: {admission.department_name || 'N/A'}</p>
                          <p className="text-sm text-gray-600">Doctor: {admission.doctor_name || 'N/A'}</p>
                          <p className="text-sm text-gray-600">Bed: {admission.bed_type} - {admission.ward_name} - {admission.room_number || 'N/A'}</p>
                        </div>
                        <Badge className={
                          admission.status === 'Admitted' ? 'bg-green-100 text-green-800' :
                            admission.status === 'Discharged' ? 'bg-gray-100 text-gray-800' :
                              'bg-blue-100 text-blue-800'
                        }>
                          {admission.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <Building2 className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Admissions Found</h3>
                <p className="text-gray-600">You have no admission records</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Lab Report View Modal */}
      {reportViewOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2"><FileText className="h-5 w-5" />Lab Report — LAB-{reportViewOrder.id}</h2>
                <button onClick={() => setReportViewOrder(null)} className="text-gray-500 hover:text-gray-700"><X className="h-5 w-5" /></button>
              </div>

              {/* Hospital Header */}
              <div className="text-center border-b-2 border-blue-600 pb-4 mb-4">
                <h3 className="text-xl font-bold text-blue-700">🏥 CITYCARE HOSPITAL</h3>
                <p className="text-xs text-gray-500">Multi-Speciality Hospital & Diagnostic Centre</p>
                <Badge className="bg-blue-600 text-white mt-2">LABORATORY TEST REPORT</Badge>
              </div>

              {/* Patient & Test Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="text-sm font-semibold text-blue-700 mb-2">👤 Patient Information</h4>
                  <p className="text-sm"><strong>Name:</strong> {patient?.first_name} {patient?.last_name}</p>
                  <p className="text-sm"><strong>Patient ID:</strong> {patient?.patient_id}</p>
                  <p className="text-sm"><strong>DOB:</strong> {patient?.date_of_birth || 'N/A'}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="text-sm font-semibold text-blue-700 mb-2">🔬 Test Information</h4>
                  <p className="text-sm"><strong>Test:</strong> {reportViewOrder.test_name}</p>
                  <p className="text-sm"><strong>Category:</strong> {reportViewOrder.test_category || 'Pathology'}</p>
                  <p className="text-sm"><strong>Order Date:</strong> {reportViewOrder.order_date ? new Date(reportViewOrder.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</p>
                </div>
              </div>

              {/* Results Table */}
              {reportViewOrder.results?.length > 0 && (
                <div className="overflow-x-auto mb-4">
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
                      {reportViewOrder.results.map((r: any, i: number) => (
                        <tr key={r.id || i} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                          <td className="p-2.5 border-b">{i + 1}</td>
                          <td className="p-2.5 border-b font-medium">{r.parameter_name}</td>
                          <td className="p-2.5 border-b font-bold">{r.result_value || 'Pending'}</td>
                          <td className="p-2.5 border-b text-gray-600">{r.unit || '-'}</td>
                          <td className="p-2.5 border-b text-gray-600">{r.reference_range || '-'}</td>
                          <td className="p-2.5 border-b">
                            <Badge className={`text-xs ${r.status === 'Normal' ? 'bg-green-100 text-green-700' : r.status === 'Abnormal' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                              {r.status}{r.is_critical ? ' ⚠️' : ''}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button onClick={() => downloadLabResults(reportViewOrder)} className="flex-1 flex items-center justify-center gap-2">
                  <Download className="h-4 w-4" /> Download Report
                </Button>
                <Button variant="outline" onClick={() => printLabReport(reportViewOrder)} className="flex-1 flex items-center justify-center gap-2">
                  <Printer className="h-4 w-4" /> Print Report
                </Button>
                <Button variant="outline" onClick={() => setReportViewOrder(null)}>
                  <X className="h-4 w-4 mr-2" /> Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
};

export default MedicalRecordsSimple;
