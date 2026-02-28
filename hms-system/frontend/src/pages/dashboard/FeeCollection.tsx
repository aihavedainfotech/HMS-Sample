import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { IndianRupee, Receipt, Loader2 } from 'lucide-react';

const feeTypes = [
  { value: 'registration', label: 'Registration Fee', amount: 100 },
  { value: 'consultation', label: 'Consultation Fee', amount: 500 },
  { value: 'procedure', label: 'Procedure Charges', amount: 0 },
  { value: 'room', label: 'Room Charges', amount: 0 },
  { value: 'misc', label: 'Miscellaneous', amount: 0 },
];

const paymentModes = ['Cash', 'Card', 'UPI', 'Insurance'];

export default function FeeCollection() {
  const [loading, setLoading] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [feeType, setFeeType] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    toast.success(`Payment of ₹${amount} collected successfully!`);
    setPatientId('');
    setFeeType('');
    setAmount('');
    setPaymentMode('');
    setLoading(false);
  };

  const selectedFeeType = feeTypes.find((f) => f.value === feeType);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fee Collection</h1>
        <p className="text-muted-foreground">Collect fees and generate receipts</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <IndianRupee className="h-5 w-5" />
              Collect Payment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="patient_id">Patient ID *</Label>
                <Input
                  id="patient_id"
                  placeholder="e.g., P0001"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fee_type">Fee Type *</Label>
                <Select value={feeType} onValueChange={setFeeType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select fee type" />
                  </SelectTrigger>
                  <SelectContent>
                    {feeTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label} (₹{type.amount > 0 ? type.amount : 'Custom'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹) *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={selectedFeeType && selectedFeeType.amount > 0 ? selectedFeeType.amount.toString() : 'Enter amount'}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_mode">Payment Mode *</Label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentModes.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {mode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Receipt className="h-4 w-4 mr-2" />
                    Collect & Generate Receipt
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { id: 'TXN001', patient: 'Ramesh Kumar', type: 'Consultation', amount: 500, time: '5 min ago' },
                { id: 'TXN002', patient: 'Priya Sharma', type: 'Registration', amount: 100, time: '15 min ago' },
                { id: 'TXN003', patient: 'Amit Patel', type: 'Lab Test', amount: 800, time: '30 min ago' },
                { id: 'TXN004', patient: 'Sunita Devi', type: 'Consultation', amount: 600, time: '1 hour ago' },
              ].map((txn) => (
                <div key={txn.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{txn.patient}</p>
                    <p className="text-sm text-muted-foreground">{txn.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₹{txn.amount}</p>
                    <p className="text-xs text-muted-foreground">{txn.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
