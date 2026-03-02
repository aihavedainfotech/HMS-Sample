import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Printer, X } from 'lucide-react';

interface LabReportViewModalProps {
  order: any;
  patient: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LabReportViewModal({ order, patient, open, onOpenChange }: LabReportViewModalProps) {
  if (!order) return null;

  const patientName = patient
    ? `${patient.first_name || ''} ${patient.last_name || ''}`.trim()
    : order.patient_name || 'N/A';

  const patientId = patient?.patient_id || order.patient_id || 'N/A';
  const orderId = order.order_id || order.db_id || order.id || 'N/A';
  const testName = order.test_name || order.test_category || 'Lab Test';
  const doctorName = order.doctor_name || 'N/A';
  const orderDate = order.order_date
    ? new Date(order.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'N/A';

  // Build tests array from order data
  const tests = Array.isArray(order.tests) && order.tests.length > 0
    ? order.tests
    : order.result_value
      ? [{
        test_name: testName,
        result: order.result_value,
        unit: order.unit || '-',
        reference_range: order.reference_range || '-',
        status: order.result_status || 'Normal'
      }]
      : [];

  const generateReportHTML = () => {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Lab Report - ${patientName}</title>
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
    <p><strong>Name:</strong> ${patientName}</p>
    <p><strong>Patient ID:</strong> ${patientId}</p>
    <p><strong>Order ID:</strong> ${orderId}</p>
  </div>
  <div class="info-box">
    <h3>🔬 Test Information</h3>
    <p><strong>Test:</strong> ${testName}</p>
    <p><strong>Ordered By:</strong> Dr. ${doctorName}</p>
    <p><strong>Order Date:</strong> ${orderDate}</p>
  </div>
</div>
<table>
  <thead><tr><th>#</th><th>Parameter</th><th>Result</th><th>Unit</th><th>Reference Range</th><th>Status</th></tr></thead>
  <tbody>
    ${tests.map((t: any, i: number) => `<tr>
      <td>${i + 1}</td>
      <td>${t.test_name || 'N/A'}</td>
      <td><strong>${t.result || t.result_value || 'Pending'}</strong></td>
      <td>${t.unit || '-'}</td>
      <td>${t.normal_range || t.reference_range || '-'}</td>
      <td class="status-${(t.status || 'normal').toLowerCase()}">${(t.status || 'Normal')}</td>
    </tr>`).join('')}
  </tbody>
</table>
<div class="signatures">
  <div class="sig-line"><hr /><small>Lab Technician</small></div>
  <div class="sig-line"><hr /><small>Dr. ${doctorName}</small></div>
  <div class="sig-line"><hr /><small>Pathologist</small></div>
</div>
<div class="footer">
  <p>This is a computer-generated report. Results should be interpreted by a qualified medical professional.</p>
  <p>Generated on ${new Date().toLocaleString('en-IN')}</p>
</div>
</body></html>`;
  };

  const handlePrint = () => {
    const html = generateReportHTML();
    const win = window.open('', '', 'width=900,height=700');
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  };

  const handleDownload = () => {
    const html = generateReportHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Lab_Report_${patientName.replace(/\s/g, '_')}_${orderId}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Lab Report — {orderId}
          </DialogTitle>
        </DialogHeader>

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
              <p className="text-sm"><strong>Name:</strong> {patientName}</p>
              <p className="text-sm"><strong>Patient ID:</strong> {patientId}</p>
              <p className="text-sm"><strong>Order ID:</strong> {orderId}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="text-sm font-semibold text-blue-700 mb-2">🔬 Test Information</h4>
              <p className="text-sm"><strong>Test:</strong> {testName}</p>
              <p className="text-sm"><strong>Ordered By:</strong> Dr. {doctorName}</p>
              <p className="text-sm"><strong>Order Date:</strong> {orderDate}</p>
            </div>
          </div>

          {/* Results Table */}
          {tests.length > 0 && (
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
                  {tests.map((t: any, i: number) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="p-2.5 border-b">{i + 1}</td>
                      <td className="p-2.5 border-b font-medium">{t.test_name || testName}</td>
                      <td className="p-2.5 border-b font-bold">{t.result || t.result_value || 'Pending'}</td>
                      <td className="p-2.5 border-b text-gray-600">{t.unit || '-'}</td>
                      <td className="p-2.5 border-b text-gray-600">{t.normal_range || t.reference_range || '-'}</td>
                      <td className="p-2.5 border-b">
                        <Badge className={`text-xs ${t.status === 'Normal' ? 'bg-green-100 text-green-700' :
                            t.status === 'Abnormal' ? 'bg-amber-100 text-amber-700' :
                              t.status === 'Critical' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-600'
                          }`}>
                          {t.status || 'Normal'}
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
            <Button onClick={handleDownload} className="flex-1 flex items-center justify-center gap-2">
              <Download className="h-4 w-4" /> Download Report
            </Button>
            <Button variant="outline" onClick={handlePrint} className="flex-1 flex items-center justify-center gap-2">
              <Printer className="h-4 w-4" /> Print Report
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-2" /> Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
