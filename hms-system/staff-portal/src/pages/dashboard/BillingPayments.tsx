import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Search,
  CreditCard,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Filter,
  Download,
  Receipt,
  TrendingUp,
  TrendingDown,
  Loader2,
  Eye,
  X,
  Banknote,
  Smartphone,
  Shield,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Payment {
  payment_id: number;
  patient_id: string;
  patient_name: string;
  amount: number;
  method: string;
  transaction_id: string;
  collected_by: string;
  collected_by_name: string;
  reference_type: string;
  reference_id: string;
  date: string;
  status: string;
}

interface PaymentTotals {
  total_revenue: number;
  today_revenue: number;
  today_count: number;
  pending_total: number;
}

export default function BillingPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totals, setTotals] = useState<PaymentTotals>({ total_revenue: 0, today_revenue: 0, today_count: 0, pending_total: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const fetchPayments = useCallback(async () => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`${API_URL}/billing/payments?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch payments');

      const data = await response.json();
      setPayments(data.payments || []);
      setTotals(data.totals || { total_revenue: 0, today_revenue: 0, today_count: 0, pending_total: 0 });
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    const timer = setTimeout(() => fetchPayments(), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Client-side filtering
  const filteredPayments = payments.filter(p => {
    if (methodFilter !== 'all' && (p.method || 'Cash') !== methodFilter) return false;
    if (dateRange !== 'all' && p.date) {
      const payDate = new Date(p.date);
      const now = new Date();
      if (dateRange === 'today') {
        if (payDate.toDateString() !== now.toDateString()) return false;
      } else if (dateRange === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (payDate < weekAgo) return false;
      } else if (dateRange === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (payDate < monthAgo) return false;
      }
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { icon: any; className: string }> = {
      completed: { icon: CheckCircle, className: 'bg-green-100 text-green-700 border-green-200' },
      pending: { icon: Clock, className: 'bg-amber-100 text-amber-700 border-amber-200' },
      processing: { icon: AlertCircle, className: 'bg-blue-100 text-blue-700 border-blue-200' },
    };
    const config = variants[status] || { icon: Clock, className: 'bg-gray-100 text-gray-700' };
    return (
      <Badge variant="outline" className={`flex items-center gap-1 text-xs font-medium ${config.className}`}>
        <config.icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const getMethodIcon = (method: string) => {
    const icons: Record<string, any> = {
      Cash: Banknote,
      Card: CreditCard,
      UPI: Smartphone,
      Insurance: Shield,
    };
    return icons[method] || DollarSign;
  };

  const getMethodBadge = (method: string) => {
    const styles: Record<string, string> = {
      Cash: 'bg-green-100 text-green-700 border-green-200',
      Card: 'bg-blue-100 text-blue-700 border-blue-200',
      UPI: 'bg-purple-100 text-purple-700 border-purple-200',
      Insurance: 'bg-amber-100 text-amber-700 border-amber-200',
    };
    const Icon = getMethodIcon(method);
    return (
      <Badge variant="outline" className={`flex items-center gap-1 text-xs font-medium ${styles[method] || 'bg-gray-100 text-gray-700'}`}>
        <Icon className="h-3 w-3" />
        {method || 'Cash'}
      </Badge>
    );
  };

  const handleExportCSV = () => {
    const headers = ['Payment ID', 'Patient', 'Amount', 'Method', 'Status', 'Date', 'Collected By'];
    const rows = filteredPayments.map(p => [
      p.payment_id, p.patient_name, p.amount || 0, p.method || 'Cash', p.status,
      p.date ? new Date(p.date).toLocaleDateString() : '', p.collected_by_name || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <span className="mt-3 block text-sm text-gray-500">Loading payments...</span>
        </div>
      </div>
    );
  }

  const methodChips = [
    { value: 'all', label: 'All', icon: Filter },
    { value: 'Cash', label: 'Cash', icon: Banknote },
    { value: 'Card', label: 'Card', icon: CreditCard },
    { value: 'UPI', label: 'UPI', icon: Smartphone },
    { value: 'Insurance', label: 'Insurance', icon: Shield },
  ];

  return (
    <div className="space-y-6">
      <style>{`
        .payment-card { transition: all 0.2s ease; position: relative; }
        .payment-card:hover { transform: translateX(4px); box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
        .payment-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; border-radius: 4px 0 0 4px; background: transparent; transition: background 0.2s; }
        .payment-card:hover::before { background: #3b82f6; }
        .method-chip { transition: all 0.2s ease; }
        .method-chip:hover { transform: translateY(-1px); }
      `}</style>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-500 text-sm mt-1">Track and manage all payment transactions</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="rounded-xl">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm" className="rounded-xl">
            <CreditCard className="h-4 w-4 mr-2" />
            Process Payment
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">₹{totals.total_revenue.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-xs text-green-600 font-medium">All time</span>
                </div>
              </div>
              <div className="w-11 h-11 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-sm">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Pending</p>
                <p className="text-2xl font-bold text-gray-900">₹{totals.pending_total.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1.5">
                  <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-xs text-red-600 font-medium">Awaiting</span>
                </div>
              </div>
              <div className="w-11 h-11 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-sm">
                <Clock className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Today's Revenue</p>
                <p className="text-2xl font-bold text-gray-900">₹{totals.today_revenue.toLocaleString()}</p>
              </div>
              <div className="w-11 h-11 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Today's Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{totals.today_count}</p>
              </div>
              <div className="w-11 h-11 bg-gradient-to-br from-purple-400 to-violet-600 rounded-xl flex items-center justify-center shadow-sm">
                <Receipt className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4">
            {/* Search + Date Range */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search payments by patient, ID, or bill..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rounded-xl border-gray-200"
                />
              </div>
              <div className="flex items-center bg-gray-100 rounded-xl p-1">
                {(['all', 'today', 'week', 'month'] as const).map(range => (
                  <button
                    key={range}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${dateRange === range
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                      }`}
                    onClick={() => setDateRange(range)}
                  >
                    {range === 'all' ? 'All Time' : range === 'today' ? 'Today' : range === 'week' ? 'This Week' : 'This Month'}
                  </button>
                ))}
              </div>
            </div>

            {/* Method Filter Chips */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400 font-medium">Method:</span>
              {methodChips.map(chip => (
                <button
                  key={chip.value}
                  className={`method-chip flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${methodFilter === chip.value
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}
                  onClick={() => setMethodFilter(chip.value)}
                >
                  <chip.icon className="h-3 w-3" />
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-3">
            {filteredPayments.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">No payments found</p>
                <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              filteredPayments.map((payment) => (
                <Card key={payment.payment_id} className="payment-card border-0 shadow-sm overflow-hidden cursor-pointer" onClick={() => setSelectedPayment(payment)}>
                  <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                          <CreditCard className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-sm text-gray-900">{payment.patient_name}</h3>
                            <span className="text-xs text-gray-400">({payment.patient_id})</span>
                            {getStatusBadge(payment.status)}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mb-2">
                            <span className="flex items-center gap-1">
                              <Receipt className="h-3 w-3" />
                              Ref: {payment.reference_id || 'N/A'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {payment.date ? new Date(payment.date).toLocaleDateString() : 'N/A'}
                            </span>
                            {payment.collected_by_name && (
                              <span className="text-xs">By: {payment.collected_by_name}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-lg text-gray-900">₹{(payment.amount || 0).toLocaleString()}</span>
                            {getMethodBadge(payment.method)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={(e) => { e.stopPropagation(); setSelectedPayment(payment); }}>
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          View Receipt
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Receipt Detail Dialog */}
      <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-600" />
              Payment Receipt
            </DialogTitle>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-5">
              {/* Receipt Header */}
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <p className="text-3xl font-bold text-blue-700">₹{(selectedPayment.amount || 0).toLocaleString()}</p>
                <div className="mt-2">{getStatusBadge(selectedPayment.status)}</div>
              </div>

              {/* Details Grid */}
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-xs text-gray-500">Payment ID</span>
                  <span className="text-sm font-medium">#{selectedPayment.payment_id}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-xs text-gray-500">Patient</span>
                  <span className="text-sm font-medium">{selectedPayment.patient_name}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-xs text-gray-500">Patient ID</span>
                  <span className="text-sm font-medium">{selectedPayment.patient_id}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-xs text-gray-500">Method</span>
                  {getMethodBadge(selectedPayment.method)}
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-xs text-gray-500">Date</span>
                  <span className="text-sm font-medium">
                    {selectedPayment.date ? new Date(selectedPayment.date).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-xs text-gray-500">Reference</span>
                  <span className="text-sm font-medium">{selectedPayment.reference_id || 'N/A'}</span>
                </div>
                {selectedPayment.transaction_id && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-xs text-gray-500">Transaction ID</span>
                    <span className="text-sm font-mono">{selectedPayment.transaction_id}</span>
                  </div>
                )}
                {selectedPayment.collected_by_name && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-xs text-gray-500">Collected By</span>
                    <span className="text-sm font-medium">{selectedPayment.collected_by_name}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setSelectedPayment(null)}>
                  Close
                </Button>
                <Button className="flex-1 rounded-xl">
                  <Download className="h-4 w-4 mr-2" />
                  Download Receipt
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
