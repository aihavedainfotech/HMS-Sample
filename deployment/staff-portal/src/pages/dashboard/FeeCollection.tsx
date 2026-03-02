import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { DollarSign, Search, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface PendingPayment {
  id: number;
  patient_id: string;
  reference_type: string;
  reference_id: string;
  description: string;
  amount: number;
  status: string;
  created_at: string;
}

export default function FeeCollection() {
  const [patientId, setPatientId] = useState('');
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [selectedPayments, setSelectedPayments] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [transactionId, setTransactionId] = useState('');
  const [todayTotal, setTodayTotal] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [noPatientError, setNoPatientError] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || '/api';

  useEffect(() => {
    // Fetch today's collection on mount
    fetchTodayTotal();
  }, []);

  const fetchTodayTotal = async () => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/collections/today`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      setTodayTotal(data.total_collected_today || 0);
    } catch (err) {
      console.error('Failed to fetch today total:', err);
    }
  };

  const handleSearchPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId.trim()) {
      setNoPatientError(true);
      setPendingPayments([]);
      setSelectedPayments(new Set());
      return;
    }
    setNoPatientError(false);
    setLoading(true);

    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/patients/${patientId.toUpperCase()}/pending-payments`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 404) {
          setPendingPayments([]);
          setHasSearched(true);
          toast.error('Patient not found');
        } else {
          toast.error('Failed to fetch pending payments');
        }
        setSelectedPayments(new Set());
        return;
      }

      const data = await res.json();
      setPendingPayments(data.pending_payments || []);
      setHasSearched(true);
      setSelectedPayments(new Set());

      if (!data.pending_payments || data.pending_payments.length === 0) {
        toast.info('No pending payments for this patient');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error fetching pending payments');
      setPendingPayments([]);
      setSelectedPayments(new Set());
    } finally {
      setLoading(false);
    }
  };

  const togglePaymentSelection = (paymentId: number) => {
    const updated = new Set(selectedPayments);
    if (updated.has(paymentId)) {
      updated.delete(paymentId);
    } else {
      updated.add(paymentId);
    }
    setSelectedPayments(updated);
  };

  const toggleSelectAll = () => {
    if (selectedPayments.size === pendingPayments.length) {
      setSelectedPayments(new Set());
    } else {
      setSelectedPayments(new Set(pendingPayments.map(p => p.id)));
    }
  };

  const calculateTotal = () => {
    let total = 0;
    selectedPayments.forEach(id => {
      const payment = pendingPayments.find(p => p.id === id);
      if (payment) {
        total += payment.amount;
      }
    });
    return total;
  };

  const handleCollectPayments = async () => {
    if (selectedPayments.size === 0) {
      toast.error('Please select at least one payment to collect');
      return;
    }

    setCollecting(true);
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/payments/collect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_ids: Array.from(selectedPayments),
          method: paymentMethod,
          transaction_id: transactionId || undefined,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || 'Failed to collect payments');
        return;
      }

      const data = await res.json();
      toast.success(`Payment collected successfully! Total: ₹${data.total.toFixed(2)}`);

      // Refresh data
      setPendingPayments(pendingPayments.filter(p => !selectedPayments.has(p.id)));
      setSelectedPayments(new Set());
      setTransactionId('');
      await fetchTodayTotal();
    } catch (err: any) {
      toast.error(err.message || 'Network error during payment collection');
    } finally {
      setCollecting(false);
    }
  };

  const selectedTotal = calculateTotal();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-green-600" />
          Fee Collection
        </h1>
        <p className="text-muted-foreground">Collect fees from walk-in/receptionist-booked appointments</p>
      </div>

      {/* Today's Collection */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Today's Collection</p>
              <p className="text-3xl font-bold text-green-700">₹{todayTotal.toFixed(2)}</p>
            </div>
            <CheckCircle2 className="h-12 w-12 text-green-600 opacity-20" />
          </div>
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert className="bg-blue-50 border-blue-200">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          This section collects <strong>registration and appointment fees</strong> from patients with <strong>walk-in appointments booked by receptionist</strong>. 
          This includes both online-registered and offline-registered patients if they book appointments via receptionist.
        </AlertDescription>
      </Alert>

      {/* Patient Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search Patient
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearchPatient} className="flex gap-3">
            <Input
              placeholder="Enter Patient ID (e.g., P0001)"
              value={patientId}
              onChange={(e) => {
                setPatientId(e.target.value.toUpperCase());
                setNoPatientError(false);
              }}
              className={noPatientError && !patientId.trim() ? 'border-red-500' : ''}
            />
            <Button type="submit" disabled={loading} className="min-w-24">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Search
                </>
              ) : (
                'Search'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Pending Payments List */}
      {hasSearched && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Pending Payments
              {pendingPayments.length > 0 && (
                <Badge className="ml-2" variant="outline">
                  {pendingPayments.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingPayments.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {patientId ? 'No pending payments found for this patient.' : 'Enter a patient ID and search to view pending payments.'}
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {/* Select All */}
                <div className="flex items-center space-x-2 border-b pb-3">
                  <Checkbox
                    id="select-all"
                    checked={selectedPayments.size === pendingPayments.length && pendingPayments.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                  <Label htmlFor="select-all" className="font-semibold cursor-pointer">
                    Select All
                  </Label>
                </div>

                {/* Payments */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {pendingPayments.map((payment) => (
                    <div key={payment.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                      <Checkbox
                        id={`payment-${payment.id}`}
                        checked={selectedPayments.has(payment.id)}
                        onCheckedChange={() => togglePaymentSelection(payment.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{payment.description}</p>
                            <p className="text-sm text-muted-foreground">
                              {payment.reference_type === 'registration'
                                ? 'Registration Fee'
                                : payment.reference_type === 'appointment'
                                  ? `Appointment (${payment.reference_id})`
                                  : payment.reference_type}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(payment.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">₹{payment.amount.toFixed(2)}</p>
                            <Badge variant="secondary" className="mt-1">
                              {payment.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment Collection Form */}
      {pendingPayments.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg">Collect Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Selected Total */}
            {selectedPayments.size > 0 && (
              <div className="bg-white p-4 rounded-lg border-2 border-blue-300">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">Total Amount to Collect:</span>
                  <span className="text-2xl font-bold text-blue-600">₹{selectedTotal.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="method">Payment Method *</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Insurance">Insurance</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Transaction ID */}
            <div className="space-y-2">
              <Label htmlFor="transaction-id">Transaction ID (Optional)</Label>
              <Input
                id="transaction-id"
                placeholder="e.g., TXN123456 or Reference Number"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
              />
            </div>

            {/* Collect Button */}
            <Button
              onClick={handleCollectPayments}
              disabled={selectedPayments.size === 0 || collecting}
              className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
            >
              {collecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Collect Payment (₹{selectedTotal.toFixed(2)})
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
