import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Download,
  User,
  Eye,
  Search,
  IndianRupee,
  CheckCircle,
  Clock,
  AlertCircle,
  Receipt,
  Pill,
  FlaskConical,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Printer,
  TestTube,
  Microscope,
  Calendar,
  Activity,
  X,
  Stethoscope,
  Building2,
  ShoppingBag,
  CreditCard,
  QrCode,
  Wallet,
  Banknote,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { usePatientAuth } from '@/contexts/PatientAuthContext';
import { toast } from 'sonner';
import socket from '@/lib/socket';

interface Payment {
  id: number;
  patient_id: string;
  reference_type: string;
  reference_id: string;
  description: string;
  amount: number | string;
  status: 'Pending' | 'Paid' | 'Waived';
  created_at: string;
  updated_at: string;
}

interface Medicine {
  id: number;
  medicine_name: string;
  generic_name: string;
  strength: string;
  dosage_form: string;
  quantity: number;
  frequency: string;
  timing: string;
  duration: string;
  instructions: string;
}

interface Prescription {
  id: number;
  prescription_id: string;
  patient_id: string;
  doctor_id: string;
  appointment_id: string;
  prescription_date: string;
  diagnosis: string;
  chief_complaint: string;
  examination_findings: string;
  general_instructions: string;
  status: 'Active' | 'Dispensed' | 'Cancelled';
  follow_up_date: string;
  created_at: string;
  updated_at: string;
  medicines: Medicine[];
}

interface LabResult {
  id: number;
  lab_order_id: number;
  parameter_name: string;
  result_value: string;
  unit: string;
  reference_range: string;
  status: 'Normal' | 'Abnormal' | 'Critical';
  is_critical: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface LabOrder {
  id: number;
  lab_order_id: number;
  patient_id: string;
  test_category: string;
  test_name: string;
  test_code: string;
  priority: string;
  fasting_required: boolean;
  clinical_notes: string;
  special_instructions: string;
  order_date: string;
  status: string;
  created_at: string;
  updated_at: string;
  results: LabResult[];
}

const MedicalRecords = () => {
  const { patient } = usePatientAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('payments');
  
  // Admissions state
  const [admissions, setAdmissions] = useState<any[]>([]);

  // Payment state
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
  const [paidPayments, setPaidPayments] = useState<Payment[]>([]);
  const [totalPending, setTotalPending] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  // Prescription state
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [expandedPrescription, setExpandedPrescription] = useState<number | null>(null);

  // Lab orders state
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [reportViewOrder, setReportViewOrder] = useState<LabOrder | null>(null);
  const [expandedLabOrder, setExpandedLabOrder] = useState<number | null>(null);

  // Search and loading state
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment modal state
  const [payModalPayment, setPayModalPayment] = useState<Payment | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'qr' | 'cash'>('upi');
  const [payingNow, setPayingNow] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Fetch data on component mount
  useEffect(() => {
    console.log('Medical Records component mounted');
    fetchAllData();

    // Real-time socket listeners for medical records
    const onPaymentUpdated = (data: any) => {
      console.log('[MedicalRecords] Payment updated:', data);
      if (data && data.patient_id === patient?.patient_id) {
        fetchAllData();
      }
    };

    const onPrescriptionAdded = (data: any) => {
      console.log('[MedicalRecords] Prescription added:', data);
      if (data && data.patient_id === patient?.patient_id) {
        fetchAllData();
      }
    };

    const onLabResultsReady = (data: any) => {
      console.log('[MedicalRecords] Lab results ready:', data);
      if (data && data.patient_id === patient?.patient_id) {
        fetchAllData();
      }
    };

    socket.on('payment_updated', onPaymentUpdated);
    socket.on('prescription_added', onPrescriptionAdded);
    socket.on('lab_results_ready', onLabResultsReady);

    return () => {
      socket.off('payment_updated', onPaymentUpdated);
      socket.off('prescription_added', onPrescriptionAdded);
      socket.off('lab_results_ready', onLabResultsReady);
    };
  }, [patient?.patient_id]);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('patientToken');
      console.log('[MedicalRecords] Token:', token ? 'Present' : 'Missing');
      
      if (!token) {
        console.log('[MedicalRecords] No token found, redirecting to login');
        navigate('/patient/login');
        return;
      }

      // Fetch prescriptions and lab orders
      console.log('[MedicalRecords] Fetching medical records');
      const medicalResponse = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/patient/medical-records`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (medicalResponse.ok) {
        const medicalData = await medicalResponse.json();
        console.log('[MedicalRecords] Medical data received:', medicalData);
        setPrescriptions(medicalData.prescriptions || []);
        setLabOrders(medicalData.lab_orders || []);
        
        // Process payments data
        const allPayments = medicalData.payments || [];
        const pending = allPayments.filter((p: Payment) => p.status === 'Pending');
        const paid = allPayments.filter((p: Payment) => p.status === 'Paid' || p.status === 'Waived');
        setPendingPayments(pending);
        setPaidPayments(paid);
        setTotalPending(pending.reduce((sum: number, p: Payment) => sum + parseFloat(String(p.amount)), 0));
        setTotalPaid(paid.reduce((sum: number, p: Payment) => sum + parseFloat(String(p.amount)), 0));
        
        // Process admissions data
        setAdmissions(medicalData.admissions || []);
      } else {
        console.error('[MedicalRecords] Medical records fetch failed:', medicalResponse.status, medicalResponse.statusText);
        if (medicalResponse.status === 401) {
          console.log('[MedicalRecords] Token expired, redirecting to login');
          localStorage.removeItem('patientToken');
          navigate('/patient/login');
          return;
        }
        setError('Failed to load medical records');
      }

      setLoading(false);
    } catch (err) {
      console.error('[MedicalRecords] Error in fetchAllData:', err);
      setError(err instanceof Error ? err.message : 'Failed to load medical records');
      setLoading(false);
    }
  }, [navigate, patient?.patient_id]);

  // Helper functions
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Paid':
      case 'Dispensed':
      case 'Normal':
        return 'bg-green-100 text-green-800';
      case 'Pending':
      case 'Active':
        return 'bg-yellow-100 text-yellow-800';
      case 'Waived':
        return 'bg-blue-100 text-blue-800';
      case 'Abnormal':
        return 'bg-orange-100 text-orange-800';
      case 'Critical':
      case 'Cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getReferenceTypeLabel = (type: string) => {
    switch (type) {
      case 'registration':
        return 'Registration Fee';
      case 'appointment':
        return 'Consultation Fee';
      case 'lab':
        return 'Lab Test';
      case 'pharmacy':
        return 'Medication';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const downloadPaymentReceipt = (payment: Payment) => {
    try {
      const receiptContent = `
PAYMENT RECEIPT
===============================================
Hospital: MediCare+ Hospital Management System
Receipt Date: ${formatDate(new Date().toISOString())}
Receipt Time: ${formatTime(new Date().toISOString())}

PAYMENT DETAILS
-----------------------------------------------
Patient: ${patient?.first_name} ${patient?.last_name}
Patient ID: ${patient?.patient_id}

Payment ID: ${payment.id}
Reference Type: ${getReferenceTypeLabel(payment.reference_type)}
Description: ${payment.description}
Amount: ₹${parseFloat(String(payment.amount)).toFixed(2)}
Status: ${payment.status}
Date: ${formatDate(payment.created_at)}

===============================================
This is an electronically generated receipt.
For any queries, contact hospital billing department.
`;

      const blob = new Blob([receiptContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payment_receipt_${payment.id}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Receipt downloaded successfully');
    } catch (err) {
      toast.error('Failed to download receipt');
      console.error(err);
    }
  };

  const downloadPrescription = (prescription: Prescription) => {
    try {
      let prescriptionContent = `
PRESCRIPTION
===============================================
Hospital: MediCare+ Hospital Management System
Prescription Date: ${formatDate(prescription.prescription_date)}

PATIENT DETAILS
-----------------------------------------------
Name: ${patient?.first_name} ${patient?.last_name}
Patient ID: ${patient?.patient_id}
Date of Birth: ${patient?.date_of_birth}

CLINICAL INFORMATION
-----------------------------------------------
Chief Complaint: ${prescription.chief_complaint || 'N/A'}
Diagnosis: ${prescription.diagnosis || 'N/A'}
Examination Findings: ${prescription.examination_findings || 'N/A'}

MEDICATIONS
-----------------------------------------------
`;

      prescription.medicines.forEach((medicine, index) => {
        prescriptionContent += `
${index + 1}. ${medicine.medicine_name}
   Generic: ${medicine.generic_name || 'N/A'}
   Strength: ${medicine.strength || 'N/A'}
   Form: ${medicine.dosage_form || 'N/A'}
   Quantity: ${medicine.quantity || 'N/A'}
   Frequency: ${medicine.frequency || 'N/A'}
   Timing: ${medicine.timing || 'N/A'}
   Duration: ${medicine.duration || 'N/A'}
   Instructions: ${medicine.instructions || 'N/A'}
`;
      });

      prescriptionContent += `
INSTRUCTIONS
-----------------------------------------------
${prescription.general_instructions || 'No specific instructions'}

FOLLOW-UP
-----------------------------------------------
Follow-up Date: ${prescription.follow_up_date ? formatDate(prescription.follow_up_date) : 'As per requirement'}

===============================================
This is a digitally signed prescription.
Status: ${prescription.status}
`;

      const blob = new Blob([prescriptionContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `prescription_${prescription.prescription_id}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Prescription downloaded successfully');
    } catch (err) {
      toast.error('Failed to download prescription');
      console.error(err);
    }
  };

  const generateLabReportHTML = (labOrder: LabOrder) => {
    const results = labOrder.results || [];
    const normal = results.filter((r: LabResult) => r.status === 'Normal').length;
    const abnormal = results.filter((r: LabResult) => r.status === 'Abnormal').length;
    const critical = results.filter((r: LabResult) => r.status === 'Critical').length;
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
    ${results.map((r: LabResult, i: number) => `<tr>
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

  const downloadLabResults = (labOrder: LabOrder) => {
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
      toast.success('Lab report downloaded!');
    } catch (err) {
      toast.error('Failed to download report');
      console.error(err);
    }
  };

  const printLabReport = (labOrder: LabOrder) => {
    const html = generateLabReportHTML(labOrder);
    const win = window.open('', '', 'width=900,height=700');
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  };

  const processPayment = async (payment: Payment, method: string, txnId: string) => {
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
          payment_id: payment.id,
          method: method,
          transaction_id: txnId,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setPaymentSuccess(true);
        toast.success(`Payment of ₹${parseFloat(String(payment.amount)).toFixed(0)} successful!`);
        // Refresh data after 2 seconds
        setTimeout(() => {
          setPayModalPayment(null);
          setPaymentSuccess(false);
          fetchAllData();
        }, 2500);
      } else {
        toast.error(data.error || 'Payment failed');
      }
    } catch (err) {
      toast.error('Payment failed. Please try again.');
      console.error(err);
    } finally {
      setPayingNow(false);
    }
  };

  const filteredPendingPayments = pendingPayments.filter(
    (payment) =>
      payment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getReferenceTypeLabel(payment.reference_type).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPaidPayments = paidPayments.filter(
    (payment) =>
      payment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getReferenceTypeLabel(payment.reference_type).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPrescriptions = prescriptions.filter(
    (prescription) =>
      prescription.chief_complaint?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prescription.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLabOrders = labOrders.filter(
    (lab) =>
      lab.test_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lab.test_category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  if (error && pendingPayments.length === 0 && prescriptions.length === 0 && labOrders.length === 0 && admissions.length === 0) {
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
          <p className="text-gray-600 mt-1">View your payments, prescriptions, and lab results</p>
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
          <div className="flex items-center justify-between">
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
            <IndianRupee className="h-4 w-4" />
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

      {/* PAYMENTS SECTION */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200">
              <CardContent className="p-4 flex items-center gap-3">
                <Clock className="h-7 w-7 text-amber-600" />
                <div>
                  <p className="text-2xl font-bold text-amber-900">₹{totalPending.toFixed(0)}</p>
                  <p className="text-xs text-amber-600 font-medium">Pending ({pendingPayments.length})</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle className="h-7 w-7 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-900">₹{totalPaid.toFixed(0)}</p>
                  <p className="text-xs text-green-600 font-medium">Paid ({paidPayments.length})</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4 flex items-center gap-3">
                <IndianRupee className="h-7 w-7 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-blue-900">₹{(totalPending + totalPaid).toFixed(0)}</p>
                  <p className="text-xs text-blue-600 font-medium">Total ({pendingPayments.length + paidPayments.length})</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Unpaid Payments */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Pending Payments
            </h2>
            {filteredPendingPayments.length > 0 ? (
              <div className="space-y-3">
                {filteredPendingPayments.map((payment) => {
                  const typeIcon = payment.reference_type === 'registration' ? <Building2 className="h-4 w-4 text-blue-500" />
                    : payment.reference_type === 'appointment' ? <Stethoscope className="h-4 w-4 text-purple-500" />
                      : payment.reference_type === 'lab' ? <FlaskConical className="h-4 w-4 text-indigo-500" />
                        : payment.reference_type === 'pharmacy' ? <ShoppingBag className="h-4 w-4 text-teal-500" />
                          : <IndianRupee className="h-4 w-4 text-gray-500" />;
                  const typeColor = payment.reference_type === 'registration' ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : payment.reference_type === 'appointment' ? 'bg-purple-50 border-purple-200 text-purple-700'
                      : payment.reference_type === 'lab' ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        : payment.reference_type === 'pharmacy' ? 'bg-teal-50 border-teal-200 text-teal-700'
                          : 'bg-gray-50 border-gray-200 text-gray-700';

                  return (
                    <Card key={payment.id} className="overflow-hidden hover:shadow-lg transition-all border-l-4 border-l-amber-400">
                      <CardContent className="p-4 md:p-5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                              {typeIcon}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold">{payment.description}</span>
                                <Badge className={`text-xs ${typeColor}`}>{getReferenceTypeLabel(payment.reference_type)}</Badge>
                                <Badge className="bg-amber-100 text-amber-800 text-xs">{payment.status}</Badge>
                              </div>
                              <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{formatDate(payment.created_at)}</span>
                                <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />#{payment.id}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="text-xl font-bold text-amber-600">₹{parseFloat(String(payment.amount)).toFixed(0)}</p>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => { setPayModalPayment(payment); setPaymentMethod('upi'); setPaymentSuccess(false); setTransactionId(''); }} className="bg-green-600 hover:bg-green-700 text-white">
                                <Wallet className="h-4 w-4 mr-1" /> Pay Now
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => setSelectedPayment(payment)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-10">
                  <CheckCircle className="mx-auto h-12 w-12 text-green-400 mb-3" />
                  <h3 className="font-semibold text-gray-700">No Pending Payments</h3>
                  <p className="text-sm text-gray-500">All dues are cleared!</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Paid History */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Payment History
            </h2>
            {filteredPaidPayments.length > 0 ? (
              <div className="space-y-3">
                {filteredPaidPayments.map((payment) => {
                  const typeIcon = payment.reference_type === 'registration' ? <Building2 className="h-4 w-4 text-blue-500" />
                    : payment.reference_type === 'appointment' ? <Stethoscope className="h-4 w-4 text-purple-500" />
                      : payment.reference_type === 'lab' ? <FlaskConical className="h-4 w-4 text-indigo-500" />
                        : payment.reference_type === 'pharmacy' ? <ShoppingBag className="h-4 w-4 text-teal-500" />
                          : <IndianRupee className="h-4 w-4 text-gray-500" />;
                  const typeColor = payment.reference_type === 'registration' ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : payment.reference_type === 'appointment' ? 'bg-purple-50 border-purple-200 text-purple-700'
                      : payment.reference_type === 'lab' ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        : payment.reference_type === 'pharmacy' ? 'bg-teal-50 border-teal-200 text-teal-700'
                          : 'bg-gray-50 border-gray-200 text-gray-700';

                  return (
                    <Card key={payment.id} className="overflow-hidden hover:shadow-lg transition-all border-l-4 border-l-green-500">
                      <CardContent className="p-4 md:p-5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                              {typeIcon}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold">{payment.description}</span>
                                <Badge className={`text-xs ${typeColor}`}>{getReferenceTypeLabel(payment.reference_type)}</Badge>
                                <Badge className="bg-green-100 text-green-800 text-xs">Paid</Badge>
                              </div>
                              <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{formatDate(payment.updated_at || payment.created_at)}</span>
                                <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />#{payment.id}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="text-xl font-bold text-green-600">₹{parseFloat(String(payment.amount)).toFixed(0)}</p>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => setSelectedPayment(payment)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => downloadPaymentReceipt(payment)}>
                                <Receipt className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-10">
                  <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                  <h3 className="font-semibold text-gray-700">No Payment History</h3>
                  <p className="text-sm text-gray-500">No completed payments yet</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* PRESCRIPTIONS SECTION */}
      {activeTab === 'prescriptions' && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Pill className="h-5 w-5 text-blue-600" />
            Your Prescriptions
          </h2>
          {filteredPrescriptions.length > 0 ? (
            <div className="space-y-4">
              {filteredPrescriptions.map((prescription) => (
                <Card key={prescription.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="bg-blue-100 rounded-full p-2">
                            <Pill className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {prescription.chief_complaint || 'Prescription'}
                            </h3>
                            <p className="text-xs text-gray-500">Diagnosed: {prescription.diagnosis}</p>
                          </div>
                          <Badge className={getStatusBadgeColor(prescription.status)}>
                            {prescription.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 ml-10">
                          <div>
                            <p className="text-xs text-gray-500">Date</p>
                            <p className="text-sm font-medium">
                              {formatDate(prescription.prescription_date)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Medicines</p>
                            <p className="text-sm font-medium">{prescription.medicines.length} items</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Follow-up</p>
                            <p className="text-sm font-medium">
                              {prescription.follow_up_date
                                ? formatDate(prescription.follow_up_date)
                                : 'As needed'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Rx ID</p>
                            <p className="text-sm font-mono">#{prescription.prescription_id}</p>
                          </div>
                        </div>

                        {/* Expandable Medicines List */}
                        {expandedPrescription === prescription.id && (
                          <div className="mt-4 ml-10 pt-4 border-t">
                            <h4 className="font-medium text-gray-900 mb-3">Prescribed Medicines</h4>
                            <div className="space-y-3">
                              {prescription.medicines.map((medicine) => (
                                <div
                                  key={medicine.id}
                                  className="bg-gray-50 p-3 rounded-lg"
                                >
                                  <p className="font-medium text-gray-900">{medicine.medicine_name}</p>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs text-gray-600">
                                    <div>
                                      <p className="font-medium">Generic:</p>
                                      <p>{medicine.generic_name || 'N/A'}</p>
                                    </div>
                                    <div>
                                      <p className="font-medium">Strength:</p>
                                      <p>{medicine.strength || 'N/A'}</p>
                                    </div>
                                    <div>
                                      <p className="font-medium">Frequency:</p>
                                      <p>{medicine.frequency || 'N/A'}</p>
                                    </div>
                                    <div>
                                      <p className="font-medium">Duration:</p>
                                      <p>{medicine.duration || 'N/A'}</p>
                                    </div>
                                  </div>
                                  {medicine.instructions && (
                                    <p className="mt-2 text-xs">
                                      <span className="font-medium">Instructions:</span>{' '}
                                      {medicine.instructions}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 flex-col">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setExpandedPrescription(
                              expandedPrescription === prescription.id ? null : prescription.id
                            )
                          }
                        >
                          {expandedPrescription === prescription.id ? (
                            <>
                              <ChevronUp className="h-4 w-4 mr-2" />
                              Collapse
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4 mr-2" />
                              View Medicines
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadPrescription(prescription)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
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

      {/* LAB RESULTS SECTION */}
      {activeTab === 'labresults' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-4 flex items-center gap-3">
                <FlaskConical className="h-7 w-7 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold text-purple-900">{labOrders.length}</p>
                  <p className="text-xs text-purple-600 font-medium">Total Tests</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200">
              <CardContent className="p-4 flex items-center gap-3">
                <Clock className="h-7 w-7 text-amber-600" />
                <div>
                  <p className="text-2xl font-bold text-amber-900">{labOrders.filter(o => ['Pending', 'Sample_Collected', 'In_Progress'].includes(o.status)).length}</p>
                  <p className="text-xs text-amber-600 font-medium">In Progress</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle className="h-7 w-7 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-900">{labOrders.filter(o => ['Results_Entered', 'Verified', 'Delivered'].includes(o.status)).length}</p>
                  <p className="text-xs text-green-600 font-medium">Completed</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {filteredLabOrders.length > 0 ? (
            <div className="space-y-3">
              {filteredLabOrders.map((labOrder) => {
                const isComplete = ['Results_Entered', 'Verified', 'Delivered'].includes(labOrder.status);
                const results = labOrder.results || [];
                const normal = results.filter((r: LabResult) => r.status === 'Normal').length;
                const abnormal = results.filter((r: LabResult) => r.status === 'Abnormal').length;
                const critical = results.filter((r: LabResult) => r.status === 'Critical').length;
                const statusLabel = labOrder.status === 'Delivered' ? 'Report Ready' : labOrder.status === 'Verified' ? 'Verified' : labOrder.status === 'Results_Entered' ? 'Results Ready' : labOrder.status === 'Sample_Collected' ? 'Sample Collected' : labOrder.status === 'In_Progress' ? 'In Progress' : 'Pending';
                const statusColor = isComplete ? 'bg-green-100 text-green-800' : labOrder.status === 'Sample_Collected' ? 'bg-blue-100 text-blue-800' : labOrder.status === 'In_Progress' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800';

                return (
                  <Card key={labOrder.id} className={`overflow-hidden hover:shadow-lg transition-all border-l-4 ${isComplete ? 'border-l-green-500' : 'border-l-amber-400'}`}>
                    <CardContent className="p-4 md:p-5">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        {/* Left: Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${labOrder.test_name?.toLowerCase().match(/x-ray|ct|ultrasound|mri|scan/) ? 'bg-blue-100' : 'bg-purple-100'}`}>
                              {labOrder.test_name?.toLowerCase().match(/x-ray|ct|ultrasound|mri|scan/)
                                ? <Microscope className="h-4 w-4 text-blue-600" />
                                : <TestTube className="h-4 w-4 text-purple-600" />}
                            </div>
                            <span className="font-bold text-base">{labOrder.test_name}</span>
                            <Badge className={statusColor}>{statusLabel}</Badge>
                            {labOrder.priority?.toLowerCase() === 'urgent' && <Badge className="bg-red-100 text-red-800">URGENT</Badge>}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap mb-3">
                            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{labOrder.order_date ? new Date(labOrder.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</span>
                            <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />LAB-{labOrder.id}</span>
                            <span className="flex items-center gap-1"><Activity className="h-3.5 w-3.5" />{results.length} parameters</span>
                          </div>

                          {/* Inline result tags for completed */}
                          {isComplete && results.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {results.slice(0, 5).map((r: LabResult, i: number) => (
                                <Badge key={i} variant="outline" className={`text-xs py-0.5 ${r.status === 'Normal' ? 'border-green-200 text-green-700' : r.status === 'Abnormal' ? 'border-amber-200 text-amber-700' : r.status === 'Critical' ? 'border-red-200 text-red-700' : ''}`}>
                                  {r.status === 'Normal' ? <CheckCircle className="h-3 w-3 mr-1" /> : r.status === 'Critical' ? <AlertTriangle className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                                  {r.parameter_name}: {r.result_value} {r.unit}
                                </Badge>
                              ))}
                              {results.length > 5 && <Badge variant="outline" className="text-xs py-0.5">+{results.length - 5} more</Badge>}
                            </div>
                          )}

                          {/* Summary stats for completed */}
                          {isComplete && results.length > 0 && (
                            <div className="flex gap-3 text-xs">
                              {normal > 0 && <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full font-medium">{normal} Normal</span>}
                              {abnormal > 0 && <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full font-medium">{abnormal} Abnormal</span>}
                              {critical > 0 && <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded-full font-medium">{critical} Critical</span>}
                            </div>
                          )}

                          {/* Expandable detailed results */}
                          {expandedLabOrder === labOrder.id && results.length > 0 && (
                            <div className="mt-4 pt-4 border-t">
                              <h4 className="font-semibold text-gray-900 mb-3">Detailed Results</h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-purple-600 text-white">
                                      <th className="p-2 text-left rounded-tl-lg">#</th>
                                      <th className="p-2 text-left">Parameter</th>
                                      <th className="p-2 text-left">Result</th>
                                      <th className="p-2 text-left">Unit</th>
                                      <th className="p-2 text-left">Reference</th>
                                      <th className="p-2 text-left rounded-tr-lg">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {results.map((r: LabResult, i: number) => (
                                      <tr key={r.id || i} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                                        <td className="p-2 border-b">{i + 1}</td>
                                        <td className="p-2 border-b font-medium">{r.parameter_name}</td>
                                        <td className="p-2 border-b font-bold">{r.result_value || 'Pending'}</td>
                                        <td className="p-2 border-b text-gray-500">{r.unit || '-'}</td>
                                        <td className="p-2 border-b text-gray-500">{r.reference_range || '-'}</td>
                                        <td className="p-2 border-b">
                                          <Badge className={`text-xs ${r.status === 'Normal' ? 'bg-green-100 text-green-700' : r.status === 'Abnormal' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                            {r.status}{r.is_critical ? ' ⚠️' : ''}
                                          </Badge>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                          {isComplete ? (
                            <>
                              <Button size="sm" onClick={() => setReportViewOrder(labOrder)} className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700">
                                <Eye className="h-4 w-4" /> View Report
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => downloadLabResults(labOrder)} className="flex items-center gap-1.5">
                                <Download className="h-4 w-4" /> Download
                              </Button>
                            </>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => setExpandedLabOrder(expandedLabOrder === labOrder.id ? null : labOrder.id)}>
                              {expandedLabOrder === labOrder.id ? <><ChevronUp className="h-4 w-4 mr-1" />Hide</> : <><ChevronDown className="h-4 w-4 mr-1" />Details</>}
                            </Button>
                          )}
                          {isComplete && (
                            <Button size="sm" variant="outline"
                              onClick={() => setExpandedLabOrder(expandedLabOrder === labOrder.id ? null : labOrder.id)}>
                              {expandedLabOrder === labOrder.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-16">
                <FlaskConical className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700">No Lab Results</h3>
                <p className="text-gray-500">You have no lab test results yet</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ADMISSIONS SECTION */}
      {activeTab === 'admissions' && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-gradient-to-r from-orange-50 to-red-100 border-red-200">
              <CardContent className="p-4 flex items-center gap-3">
                <Building2 className="h-7 w-7 text-red-600" />
                <div>
                  <p className="text-2xl font-bold text-red-900">{admissions.length}</p>
                  <p className="text-xs text-red-600 font-medium">Total Admissions</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4 flex items-center gap-3">
                <Activity className="h-7 w-7 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-900">{admissions.filter(a => a.status === 'Admitted').length}</p>
                  <p className="text-xs text-green-600 font-medium">Currently Admitted</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4 flex items-center gap-3">
                <Calendar className="h-7 w-7 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-blue-900">{admissions.filter(a => a.status === 'Discharged').length}</p>
                  <p className="text-xs text-blue-600 font-medium">Discharged</p>
                </div>
              </CardContent>
            </Card>
          </div>
            
          {/* Admissions List */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Admission History</h2>
            {admissions.length > 0 ? (
              admissions.map((admission) => (
                <Card key={admission.id} className="hover:shadow-lg transition-all border-l-4 border-l-orange-500">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
                              <Building2 className="h-4 w-4 text-orange-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                {admission.admission_date ? new Date(admission.admission_date).toLocaleDateString('en-US', {
                                  month: 'long',
                                  day: 'numeric',
                                  year: 'numeric'
                                }) : 'N/A'}
                              </h4>
                              <p className="text-sm text-gray-600">Admission Date</p>
                            </div>
                          </div>
                          <Badge className={`${
                            admission.status === 'Admitted' ? 'bg-green-100 text-green-800' :
                            admission.status === 'Discharged' ? 'bg-gray-100 text-gray-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {admission.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center text-sm text-gray-600">
                              <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                              <span className="font-medium">Department:</span>
                            </div>
                            <p className="text-sm font-medium">{admission.department_name || 'N/A'}</p>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center text-sm text-gray-600">
                              <Stethoscope className="h-4 w-4 mr-2 text-gray-400" />
                              <span className="font-medium">Doctor:</span>
                            </div>
                            <p className="text-sm font-medium">{admission.doctor_name || 'N/A'}</p>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center text-sm text-gray-600">
                              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                                <div className="w-6 h-6 rounded-full bg-gray-300"></div>
                              </div>
                              <span className="font-medium">Bed:</span>
                            </div>
                            <p className="text-sm font-medium">{admission.bed_type} - {admission.ward_name} - {admission.room_number || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                        
                      <div className="flex items-center gap-3 mt-4">
                        <Badge className={`${
                          admission.status === 'Admitted' ? 'bg-green-100 text-green-800' :
                          admission.status === 'Discharged' ? 'bg-gray-100 text-gray-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {admission.status}
                        </Badge>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            {admission.admission_date && `Admitted: ${new Date(admission.admission_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="pt-12 pb-12 text-center">
                  <Building2 className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Admissions Found</h3>
                  <p className="text-gray-600 mb-4">
                    You have no admission records.
                  </p>
                  <Button onClick={() => navigate('/patient/book-appointment')}>
                    Book Appointment
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
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
                      {reportViewOrder.results.map((r: LabResult, i: number) => (
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

      {/* Payment Details Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Payment Details</h2>
                  <button
                    onClick={() => setSelectedPayment(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Description:</span>
                    <span className="font-medium">{selectedPayment.description}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium">
                      {getReferenceTypeLabel(selectedPayment.reference_type)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-semibold text-lg">
                      ₹{parseFloat(String(selectedPayment.amount)).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <Badge className={getStatusBadgeColor(selectedPayment.status)}>
                      {selectedPayment.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date Created:</span>
                    <span className="text-sm">{formatDate(selectedPayment.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Updated:</span>
                    <span className="text-sm">{formatDate(selectedPayment.updated_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment ID:</span>
                    <span className="font-mono text-sm">#{selectedPayment.id}</span>
                  </div>
                </div>

                <div className="border-t pt-4 flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => downloadPaymentReceipt(selectedPayment)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Receipt
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setSelectedPayment(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Pay Now Modal */}
      {payModalPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardContent className="p-6">
              {paymentSuccess ? (
                /* Success State */
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-green-700 mb-2">Payment Successful!</h2>
                  <p className="text-gray-600 mb-1">{payModalPayment.description}</p>
                  <p className="text-3xl font-bold text-green-600">₹{parseFloat(String(payModalPayment.amount)).toFixed(0)}</p>
                  <p className="text-sm text-gray-500 mt-3">Refreshing your records...</p>
                </div>
              ) : (
                /* Payment Form */
                <>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-green-600" /> Pay Now
                    </h2>
                    <button onClick={() => setPayModalPayment(null)} className="text-gray-500 hover:text-gray-700">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Payment Summary */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl mb-5">
                    <p className="text-sm text-gray-600">{payModalPayment.description}</p>
                    <p className="text-3xl font-bold text-blue-800 mt-1">₹{parseFloat(String(payModalPayment.amount)).toFixed(0)}</p>
                    <p className="text-xs text-gray-500 mt-1">Payment #{payModalPayment.id} • {getReferenceTypeLabel(payModalPayment.reference_type)}</p>
                  </div>

                  {/* Payment Method Tabs */}
                  <div className="grid grid-cols-4 gap-2 mb-5">
                    {[
                      { key: 'upi' as const, icon: <Wallet className="h-4 w-4" />, label: 'UPI' },
                      { key: 'card' as const, icon: <CreditCard className="h-4 w-4" />, label: 'Card' },
                      { key: 'qr' as const, icon: <QrCode className="h-4 w-4" />, label: 'QR Code' },
                      { key: 'cash' as const, icon: <Banknote className="h-4 w-4" />, label: 'Cash' },
                    ].map(m => (
                      <button key={m.key} onClick={() => setPaymentMethod(m.key)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-xs font-medium ${paymentMethod === m.key
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                          }`}>
                        {m.icon}
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {/* UPI Method */}
                  {paymentMethod === 'upi' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID</label>
                        <input type="text" placeholder="yourname@upi" value={transactionId}
                          onChange={(e) => setTransactionId(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                        <p className="text-xs text-gray-500 mt-1">Enter your UPI ID (e.g., name@paytm, number@ybl)</p>
                      </div>
                      <Button className="w-full bg-green-600 hover:bg-green-700 h-11" disabled={payingNow || !transactionId.includes('@')}
                        onClick={() => processPayment(payModalPayment, 'UPI', transactionId)}>
                        {payingNow ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</>
                          : <><Wallet className="h-4 w-4 mr-2" />Pay ₹{parseFloat(String(payModalPayment.amount)).toFixed(0)} via UPI</>}
                      </Button>
                    </div>
                  )}

                  {/* Card Method */}
                  {paymentMethod === 'card' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                        <input type="text" placeholder="1234 5678 9012 3456" maxLength={19}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Expiry</label>
                          <input type="text" placeholder="MM/YY" maxLength={5}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                          <input type="password" placeholder="•••" maxLength={4}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name on Card</label>
                        <input type="text" placeholder="John Doe"
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                      </div>
                      <Button className="w-full bg-green-600 hover:bg-green-700 h-11" disabled={payingNow}
                        onClick={() => processPayment(payModalPayment, 'Card', `CARD-${Date.now()}`)}>
                        {payingNow ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</>
                          : <><CreditCard className="h-4 w-4 mr-2" />Pay ₹{parseFloat(String(payModalPayment.amount)).toFixed(0)} via Card</>}
                      </Button>
                    </div>
                  )}

                  {/* QR Code Method */}
                  {paymentMethod === 'qr' && (
                    <div className="text-center space-y-4">
                      <div className="bg-white border-2 border-gray-100 rounded-2xl p-6 inline-block mx-auto shadow-sm">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=citycarehospital@upi%26pn=CityCare%20Hospital%26am=${payModalPayment.amount}%26cu=INR%26tn=Payment%20${payModalPayment.id}`}
                          alt="UPI QR Code"
                          className="w-48 h-48 mx-auto"
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">Scan to Pay</p>
                        <p className="text-xs text-gray-500 mt-1">Open any UPI app (GPay, PhonePe, Paytm) and scan this QR code</p>
                        <div className="flex items-center justify-center gap-2 mt-3">
                          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/UPI-Logo-vector.svg/100px-UPI-Logo-vector.svg.png" alt="UPI" className="h-5" />
                          <span className="text-sm text-gray-600">UPI Payment</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Enter UTR / Transaction ID after payment</label>
                        <input type="text" placeholder="Enter UTR number" value={transactionId}
                          onChange={(e) => setTransactionId(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                      </div>
                      <Button className="w-full bg-green-600 hover:bg-green-700 h-11" disabled={payingNow || !transactionId}
                        onClick={() => processPayment(payModalPayment, 'UPI-QR', transactionId)}>
                        {payingNow ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verifying...</>
                          : <><CheckCircle2 className="h-4 w-4 mr-2" />I've Paid ₹{parseFloat(String(payModalPayment.amount)).toFixed(0)}</>}
                      </Button>
                    </div>
                  )}

                  {/* Cash Method */}
                  {paymentMethod === 'cash' && (
                    <div className="text-center space-y-4">
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                        <Banknote className="h-12 w-12 text-amber-600 mx-auto mb-3" />
                        <h3 className="font-semibold text-gray-800">Pay at Hospital Reception</h3>
                        <p className="text-sm text-gray-600 mt-2">
                          Visit the hospital billing counter and mention:
                        </p>
                        <div className="bg-white rounded-lg p-3 mt-3 text-left">
                          <p className="text-sm"><strong>Patient ID:</strong> {patient?.patient_id}</p>
                          <p className="text-sm"><strong>Payment #:</strong> {payModalPayment.id}</p>
                          <p className="text-sm"><strong>Amount:</strong> ₹{parseFloat(String(payModalPayment.amount)).toFixed(0)}</p>
                          <p className="text-sm"><strong>For:</strong> {payModalPayment.description}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-3">Payment will be updated once collected at the counter</p>
                      </div>
                      <Button variant="outline" className="w-full" onClick={() => setPayModalPayment(null)}>
                        Close
                      </Button>
                    </div>
                  )}

                  {/* Secure payment badge */}
                  <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-400">
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                    <span>Secure & Encrypted Payment</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MedicalRecords;
