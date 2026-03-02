import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CreditCard,
  Calendar,
  FileText,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Eye,
  Search,
  DollarSign,
  ArrowUpDown,
  X,
  Receipt,
  Banknote,
  Smartphone,
  QrCode,
  Building
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Bill {
  bill_id: number;
  patient_id: string;
  patient_name: string;
  bill_type: string;
  reference_id: string;
  item_description: string;
  amount: number;
  status: string;
  bill_date: string;
}

interface BillTotals {
  total_paid: number;
  total_pending: number;
  total_count: number;
}

type SortField = 'date' | 'amount' | 'status';
type SortDir = 'asc' | 'desc';

export default function Billing() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [totals, setTotals] = useState<BillTotals>({ total_paid: 0, total_pending: 0, total_count: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [paymentBill, setPaymentBill] = useState<Bill | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: '',
    cardName: '',
    expiry: '',
    cvv: '',
    upiId: '',
    bankName: '',
    referenceNumber: ''
  });
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  const fetchBills = useCallback(async () => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const params = new URLSearchParams();
      if (activeTab !== 'all') params.append('status', activeTab);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`${API_URL}/billing/bills?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch bills');

      const data = await response.json();
      setBills(data.bills || []);
      setTotals(data.totals || { total_paid: 0, total_pending: 0, total_count: 0 });
    } catch (error) {
      console.error('Error fetching bills:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchTerm]);

  useEffect(() => {
    setLoading(true);
    fetchBills();
  }, [fetchBills]);

  useEffect(() => {
    const timer = setTimeout(() => { fetchBills(); }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const sortedBills = [...bills].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortField === 'date') {
      return dir * (new Date(a.bill_date || 0).getTime() - new Date(b.bill_date || 0).getTime());
    }
    if (sortField === 'amount') {
      return dir * ((a.amount || 0) - (b.amount || 0));
    }
    return dir * (a.status || '').localeCompare(b.status || '');
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const handleCollectPayment = async () => {
    if (!paymentBill) return;

    let finalNotes = '';

    if (paymentMethod === 'Card') {
      if (!paymentDetails.cardNumber || !paymentDetails.cardName) {
        toast.error('Please enter Card details');
        return;
      }
      finalNotes = `Card ****${paymentDetails.cardNumber.slice(-4)}, Holder: ${paymentDetails.cardName}`;
    } else if (paymentMethod === 'UPI') {
      if (!paymentDetails.upiId) {
        toast.error('Please enter UPI Transaction ID');
        return;
      }
      finalNotes = `UPI Ref: ${paymentDetails.upiId}`;
    } else if (paymentMethod === 'Bank Transfer' || paymentMethod === 'Cheque') {
      if (!paymentDetails.bankName || !paymentDetails.referenceNumber) {
        toast.error('Please enter Bank and Reference details');
        return;
      }
      finalNotes = `${paymentMethod} - Bank: ${paymentDetails.bankName}, Ref: ${paymentDetails.referenceNumber}`;
    }

    setPaymentProcessing(true);
    try {
      const token = localStorage.getItem('hms_staff_token');
      const response = await fetch(`${API_URL}/billing/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bill_id: paymentBill.bill_id,
          patient_id: paymentBill.patient_id,
          amount: paymentBill.amount,
          method: paymentMethod,
          reference_type: paymentBill.bill_type,
          reference_id: paymentBill.reference_id,
          notes: finalNotes || undefined
        }),
      });
      if (response.ok) {
        setPaymentBill(null);
        setPaymentDetails({
          cardNumber: '',
          cardName: '',
          expiry: '',
          cvv: '',
          upiId: '',
          bankName: '',
          referenceNumber: ''
        });
        fetchBills();
        toast.success('Payment collected successfully');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to collect payment');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Network error during payment collection');
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Bill ID', 'Patient', 'Patient ID', 'Type', 'Description', 'Amount', 'Status', 'Date'];
    const rows = sortedBills.map(b => [
      b.bill_id,
      b.patient_name,
      b.patient_id,
      getBillTypeLabel(b.bill_type),
      b.item_description || b.reference_id || '',
      b.amount || 0,
      b.status,
      b.bill_date ? new Date(b.bill_date).toLocaleDateString() : '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bills_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any; className: string }> = {
      Paid: { variant: 'default', icon: CheckCircle2, className: 'bg-green-100 text-green-700 border-green-200' },
      Pending: { variant: 'secondary', icon: Clock, className: 'bg-amber-100 text-amber-700 border-amber-200' },
      Overdue: { variant: 'destructive', icon: AlertCircle, className: 'bg-red-100 text-red-700 border-red-200' },
    };
    const config = variants[status] || { variant: 'outline', icon: Clock, className: '' };
    return (
      <Badge variant="outline" className={`flex items-center gap-1 text-xs font-medium ${config.className}`}>
        <config.icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const getBillTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      registration: 'Registration',
      appointment: 'Consultation',
      lab: 'Lab Test',
      pharmacy: 'Medicine',
      other: 'Other',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <span className="mt-3 block text-sm text-gray-500">Loading bills...</span>
        </div>
      </div>
    );
  }

  const paymentMethods = [
    { value: 'Cash', icon: Banknote, color: 'bg-green-100 text-green-700 border-green-300' },
    { value: 'Card', icon: CreditCard, color: 'bg-blue-100 text-blue-700 border-blue-300' },
    { value: 'UPI', icon: Smartphone, color: 'bg-purple-100 text-purple-700 border-purple-300' },
    { value: 'Bank Transfer', icon: Building, color: 'bg-amber-100 text-amber-700 border-amber-300' },
  ];

  return (
    <div className="space-y-6">
      <style>{`
        .bill-card { transition: all 0.2s ease; position: relative; }
        .bill-card:hover { transform: translateX(4px); box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
        .bill-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; border-radius: 4px 0 0 4px; background: transparent; transition: background 0.2s; }
        .bill-card:hover::before { background: #3b82f6; }
        .sort-btn { transition: all 0.2s ease; }
        .sort-btn:hover { background: rgba(59,130,246,0.1); }
        .sort-btn.active { color: #3b82f6; font-weight: 600; }
      `}</style>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Payments</h1>
          <p className="text-gray-500 text-sm mt-1">View and manage all medical bills and payments</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search bills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-60 rounded-xl border-gray-200"
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="rounded-xl">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-sm">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Paid</p>
                <p className="text-2xl font-bold text-gray-900">₹{totals.total_paid.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-sm">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Pending</p>
                <p className="text-2xl font-bold text-gray-900">₹{totals.total_pending.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Bills</p>
                <p className="text-2xl font-bold text-gray-900">{totals.total_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sort Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400 font-medium">Sort by:</span>
        {([
          { field: 'date' as SortField, label: 'Date' },
          { field: 'amount' as SortField, label: 'Amount' },
          { field: 'status' as SortField, label: 'Status' },
        ]).map(s => (
          <button
            key={s.field}
            className={`sort-btn flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border ${sortField === s.field ? 'active border-blue-200 bg-blue-50' : 'border-gray-200 text-gray-600'
              }`}
            onClick={() => handleSort(s.field)}
          >
            <ArrowUpDown className="h-3 w-3" />
            {s.label}
            {sortField === s.field && (
              <span className="text-[10px]">{sortDir === 'asc' ? '↑' : '↓'}</span>
            )}
          </button>
        ))}
      </div>

      {/* Bills List */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-100 rounded-xl p-1">
          <TabsTrigger value="all" className="rounded-lg text-xs">All Bills</TabsTrigger>
          <TabsTrigger value="Pending" className="rounded-lg text-xs">Pending</TabsTrigger>
          <TabsTrigger value="Paid" className="rounded-lg text-xs">Paid</TabsTrigger>
        </TabsList>

        {['all', 'Pending', 'Paid'].map((tab) => (
          <TabsContent key={tab} value={tab}>
            <div className="space-y-3 mt-4">
              {sortedBills.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-10 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium">No bills found</p>
                    <p className="text-xs text-gray-400 mt-1">Bills will appear here when generated</p>
                  </CardContent>
                </Card>
              ) : (
                sortedBills.map((bill) => (
                  <Card key={bill.bill_id} className="bill-card border-0 shadow-sm overflow-hidden">
                    <CardContent className="p-5">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                            <FileText className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-semibold text-sm text-gray-900">{getBillTypeLabel(bill.bill_type)}</h3>
                              {getStatusBadge(bill.status)}
                            </div>
                            <p className="text-xs text-gray-500">
                              {bill.item_description || bill.reference_id || 'N/A'}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Patient: <span className="font-medium text-gray-600">{bill.patient_name}</span> ({bill.patient_id})
                            </p>
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {bill.bill_date ? new Date(bill.bill_date).toLocaleDateString() : 'N/A'}
                              </span>
                              <span className="flex items-center gap-1 font-semibold text-gray-700">
                                <DollarSign className="h-3 w-3" />
                                ₹{(bill.amount || 0).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedBill(bill)}
                            className="rounded-xl text-xs"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            View
                          </Button>
                          {bill.status === 'Pending' && (
                            <Button size="sm" onClick={() => setPaymentBill(bill)} className="rounded-xl text-xs bg-green-600 hover:bg-green-700">
                              <Receipt className="h-3.5 w-3.5 mr-1" />
                              Collect
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="rounded-xl text-xs">
                            <Download className="h-3.5 w-3.5 mr-1" />
                            Invoice
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Bill Detail Dialog */}
      <Dialog open={!!selectedBill} onOpenChange={() => setSelectedBill(null)}>
        <DialogContent className="max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Bill Details
            </DialogTitle>
          </DialogHeader>

          {selectedBill && (
            <div className="space-y-6">
              <div className="border-b pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Bill ID</p>
                    <p className="font-bold text-lg">#{selectedBill.bill_id}</p>
                  </div>
                  {getStatusBadge(selectedBill.status)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500">Patient</p>
                  <p className="font-medium text-sm">{selectedBill.patient_name}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500">Patient ID</p>
                  <p className="font-medium text-sm">{selectedBill.patient_id}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="font-medium text-sm">
                    {selectedBill.bill_date ? new Date(selectedBill.bill_date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500">Type</p>
                  <p className="font-medium text-sm">{getBillTypeLabel(selectedBill.bill_type)}</p>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Description</p>
                <p className="text-sm">{selectedBill.item_description || selectedBill.reference_id || 'N/A'}</p>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total Amount</span>
                  <span className="text-green-600">₹{(selectedBill.amount || 0).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                {selectedBill.status === 'Pending' && (
                  <Button className="flex-1 rounded-xl bg-green-600 hover:bg-green-700" onClick={() => { setSelectedBill(null); setPaymentBill(selectedBill); }}>
                    <Receipt className="h-4 w-4 mr-2" />
                    Collect Payment
                  </Button>
                )}
                <Button variant="outline" className="flex-1 rounded-xl">
                  <Download className="h-4 w-4 mr-2" />
                  Download Invoice
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Collection Dialog */}
      <Dialog open={!!paymentBill} onOpenChange={() => setPaymentBill(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-green-600" />
              Collect Payment
            </DialogTitle>
          </DialogHeader>

          {paymentBill && (
            <div className="space-y-5">
              <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-green-600 font-medium">Patient</p>
                    <p className="font-semibold text-green-900">{paymentBill.patient_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-green-600 font-medium">Amount Due</p>
                    <p className="text-2xl font-bold text-green-700">₹{(paymentBill.amount || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Payment Method</p>
                <div className="grid grid-cols-4 gap-2">
                  {paymentMethods.map(m => (
                    <button
                      key={m.value}
                      onClick={() => setPaymentMethod(m.value)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${paymentMethod === m.value
                        ? `${m.color} border-current`
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                    >
                      <m.icon className="h-5 w-5" />
                      <span className="text-[10px] sm:text-xs font-medium text-center leading-tight">{m.value}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional fields based on Method */}
              {paymentMethod === 'Card' && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 border border-gray-100 rounded-xl animate-in fade-in zoom-in-95 duration-200">
                  <div className="col-span-2 space-y-2">
                    <label className="text-xs font-semibold text-gray-700">Card Number</label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="0000 0000 0000 0000"
                        className="pl-9 rounded-lg border-gray-200"
                        value={paymentDetails.cardNumber}
                        onChange={(e) => setPaymentDetails(prev => ({ ...prev, cardNumber: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-xs font-semibold text-gray-700">Cardholder Name</label>
                    <Input
                      placeholder="Name on card"
                      className="rounded-lg border-gray-200"
                      value={paymentDetails.cardName}
                      onChange={(e) => setPaymentDetails(prev => ({ ...prev, cardName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-700">Expiry (MM/YY)</label>
                    <Input
                      placeholder="MM/YY"
                      className="rounded-lg border-gray-200"
                      value={paymentDetails.expiry}
                      onChange={(e) => setPaymentDetails(prev => ({ ...prev, expiry: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-700">CVV</label>
                    <Input
                      type="password"
                      placeholder="123"
                      maxLength={4}
                      className="rounded-lg border-gray-200"
                      value={paymentDetails.cvv}
                      onChange={(e) => setPaymentDetails(prev => ({ ...prev, cvv: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {paymentMethod === 'UPI' && (
                <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl flex flex-col items-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100 relative group cursor-pointer hover:border-blue-300 transition-colors">
                    <QrCode className="h-24 w-24 text-gray-800" strokeWidth={1.5} />
                    <div className="absolute inset-0 bg-blue-50/80 items-center justify-center rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex">
                      <span className="text-[10px] font-bold text-blue-700">Click to Enlarge</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 font-medium">Scan to Pay via UPI apps</p>
                  <div className="w-full space-y-2">
                    <label className="text-xs font-semibold text-gray-700">UPI Transaction ID / VPA</label>
                    <Input
                      placeholder="e.g. 1234567890@upi or TXN-1234..."
                      className="rounded-lg border-gray-200"
                      value={paymentDetails.upiId}
                      onChange={(e) => setPaymentDetails(prev => ({ ...prev, upiId: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {paymentMethod === 'Bank Transfer' && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 border border-gray-100 rounded-xl animate-in fade-in zoom-in-95 duration-200">
                  <div className="col-span-2 space-y-2">
                    <label className="text-xs font-semibold text-gray-700">Bank Name</label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="e.g. HDFC Bank"
                        className="pl-9 rounded-lg border-gray-200"
                        value={paymentDetails.bankName}
                        onChange={(e) => setPaymentDetails(prev => ({ ...prev, bankName: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-xs font-semibold text-gray-700">Ref / Cheque Number</label>
                    <Input
                      placeholder="Transaction or Cheque No."
                      className="rounded-lg border-gray-200"
                      value={paymentDetails.referenceNumber}
                      onChange={(e) => setPaymentDetails(prev => ({ ...prev, referenceNumber: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setPaymentBill(null)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 rounded-xl bg-green-600 hover:bg-green-700"
                  onClick={handleCollectPayment}
                  disabled={paymentProcessing}
                >
                  {paymentProcessing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Confirm Payment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
