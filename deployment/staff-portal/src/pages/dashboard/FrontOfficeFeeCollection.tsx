import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  IndianRupee,
  Search,
  CreditCard,
  Wallet,
  QrCode,
  Banknote,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Receipt,
  Printer,
  Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface PendingPayment {
  id: number;
  patient_id: string;
  patient_name: string;
  reference_type: string;
  reference_id: string;
  description: string;
  amount: number;
  status: 'Pending' | 'Paid';
  created_at: string;
}

interface PaymentMethod {
  id: string;
  name: string;
  icon: any;
}

const paymentMethods: PaymentMethod[] = [
  { id: 'upi', name: 'UPI', icon: QrCode },
  { id: 'card', name: 'Card', icon: CreditCard },
  { id: 'cash', name: 'Cash', icon: Banknote },
  { id: 'wallet', name: 'Wallet', icon: Wallet },
];

export default function FrontOfficeFeeCollection() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('upi');
  const [transactionId, setTransactionId] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [todayCollections, setTodayCollections] = useState(0);

  useEffect(() => {
    fetchPendingPayments();
    fetchTodayStats();
  }, []);

  const fetchPendingPayments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('hms_staff_token');
      const response = await fetch(`${API_URL}/front-office/pending-payments`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPendingPayments(data);
      }
    } catch (error) {
      console.error('Error fetching pending payments:', error);
      toast.error('Failed to load pending payments');
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayStats = async () => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const response = await fetch(`${API_URL}/front-office/today-collections`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setTodayRevenue(data.total_amount || 0);
        setTodayCollections(data.total_count || 0);
      }
    } catch (error) {
      console.error('Error fetching today stats:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchPendingPayments();
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('hms_staff_token');
      const response = await fetch(`${API_URL}/front-office/search-payments?q=${searchQuery}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPendingPayments(data);
      }
    } catch (error) {
      console.error('Error searching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedPayment || !selectedMethod) {
      toast.error('Please select a payment method');
      return;
    }

    setProcessingPayment(true);
    try {
      const token = localStorage.getItem('hms_staff_token');
      const response = await fetch(`${API_URL}/front-office/collect-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          payment_id: selectedPayment.id,
          payment_method: selectedMethod,
          transaction_id: transactionId,
          amount: selectedPayment.amount,
          patient_id: selectedPayment.patient_id
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Payment collected successfully! Receipt: ${result.receipt_number}`);
        setPaymentDialogOpen(false);
        setSelectedPayment(null);
        setTransactionId('');
        fetchPendingPayments();
        fetchTodayStats();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to process payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  const getPaymentTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      'registration': 'bg-blue-100 text-blue-800',
      'appointment': 'bg-green-100 text-green-800',
      'lab_test': 'bg-purple-100 text-purple-800',
      'medicine': 'bg-orange-100 text-orange-800',
      'admission': 'bg-red-100 text-red-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const totalPending = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <IndianRupee className="w-6 h-6" />
            Fee Collection
          </h1>
          <p className="text-gray-500">Collect payments from patients</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/front-office/dashboard')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Today's Revenue</p>
                <p className="text-2xl font-bold text-blue-900">₹{todayRevenue.toLocaleString()}</p>
              </div>
              <IndianRupee className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Collections Today</p>
                <p className="text-2xl font-bold text-green-900">{todayCollections}</p>
              </div>
              <Receipt className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600">Pending Amount</p>
                <p className="text-2xl font-bold text-orange-900">₹{totalPending.toLocaleString()}</p>
              </div>
              <Wallet className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by patient ID, name, or payment reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch}>
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
            <Button variant="outline" onClick={fetchPendingPayments}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : pendingPayments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <p>No pending payments found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="font-bold text-blue-600">
                        {payment.patient_name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{payment.patient_name}</p>
                      <p className="text-sm text-gray-500">ID: {payment.patient_id}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getPaymentTypeBadge(payment.reference_type)}>
                          {payment.reference_type.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">₹{payment.amount}</p>
                    <p className="text-sm text-gray-500">{payment.description}</p>
                    <Button
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        setSelectedPayment(payment);
                        setPaymentDialogOpen(true);
                      }}
                    >
                      <IndianRupee className="w-4 h-4 mr-1" />
                      Collect
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Collect Payment</DialogTitle>
            <DialogDescription>
              {selectedPayment && (
                <>
                  Collecting ₹{selectedPayment.amount} from {selectedPayment.patient_name}
                  <br />
                  <span className="text-sm text-gray-500">{selectedPayment.description}</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Payment Methods */}
            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      selectedMethod === method.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{method.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Transaction ID */}
            <div className="space-y-2">
              <Label htmlFor="transactionId">Transaction ID / Reference</Label>
              <Input
                id="transactionId"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="Enter transaction reference (optional for cash)"
              />
            </div>

            {/* Amount Display */}
            {selectedPayment && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Amount to Collect</span>
                  <span className="text-2xl font-bold text-gray-900">
                    ₹{selectedPayment.amount}
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setPaymentDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handlePayment}
                disabled={processingPayment}
              >
                {processingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Confirm Payment
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
