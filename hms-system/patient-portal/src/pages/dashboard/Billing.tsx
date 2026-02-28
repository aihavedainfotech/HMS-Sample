import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CreditCard,
  Calendar,
  FileText,
  Download,
  IndianRupee,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Eye,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Bill } from '@/types';

export default function Billing() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      // Mock data for now
      const mockBills: Bill[] = [
        {
          bill_id: 'BILL001',
          patient_id: 'P0001',
          bill_type: 'Consultation',
          bill_date: '2024-01-15',
          item_description: 'Doctor Consultation - Dr. Arun Desai',
          quantity: 1,
          unit_price: 500,
          total_amount: 500,
          discount_amount: 0,
          tax_amount: 0,
          grand_total: 500,
          status: 'Paid',
        },
        {
          bill_id: 'BILL002',
          patient_id: 'P0001',
          bill_type: 'Lab Test',
          bill_date: '2024-01-10',
          item_description: 'Blood Test - CBC',
          quantity: 1,
          unit_price: 800,
          total_amount: 800,
          discount_amount: 0,
          tax_amount: 72,
          grand_total: 872,
          status: 'Paid',
        },
        {
          bill_id: 'BILL003',
          patient_id: 'P0001',
          bill_type: 'Medicine',
          bill_date: '2024-01-20',
          item_description: 'Prescription Medicines',
          quantity: 5,
          unit_price: 150,
          total_amount: 750,
          discount_amount: 50,
          tax_amount: 63,
          grand_total: 763,
          status: 'Pending',
        },
      ];
      setBills(mockBills);
    } catch (error) {
      console.error('Error fetching bills:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
      Paid: { variant: 'default', icon: CheckCircle2 },
      Pending: { variant: 'secondary', icon: Clock },
      Overdue: { variant: 'destructive', icon: AlertCircle },
    };
    const config = variants[status] || { variant: 'outline', icon: Clock };
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <config.icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const totalPaid = bills
    .filter((b) => b.status === 'Paid')
    .reduce((sum, b) => sum + b.grand_total, 0);
  const totalPending = bills
    .filter((b) => b.status === 'Pending')
    .reduce((sum, b) => sum + b.grand_total, 0);

  const filterBillsByStatus = (status: string) => {
    if (status === 'all') return bills;
    return bills.filter((b) => b.status === status);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing & Payments</h1>
        <p className="text-muted-foreground">
          View and manage your medical bills and payments
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="text-2xl font-bold">₹{totalPaid.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">₹{totalPending.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Bills</p>
                <p className="text-2xl font-bold">{bills.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bills List */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Bills</TabsTrigger>
          <TabsTrigger value="Pending">Pending</TabsTrigger>
          <TabsTrigger value="Paid">Paid</TabsTrigger>
        </TabsList>

        {['all', 'Pending', 'Paid'].map((tab) => (
          <TabsContent key={tab} value={tab}>
            <div className="space-y-4">
              {filterBillsByStatus(tab).length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No bills found</p>
                  </CardContent>
                </Card>
              ) : (
                filterBillsByStatus(tab).map((bill) => (
                  <Card key={bill.bill_id}>
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                            <FileText className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{bill.bill_type}</h3>
                              {getStatusBadge(bill.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {bill.item_description}
                            </p>
                            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {new Date(bill.bill_date).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <IndianRupee className="h-4 w-4 text-muted-foreground" />
                                {bill.grand_total.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedBill(bill)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          {bill.status === 'Pending' && (
                            <Button size="sm">Pay Now</Button>
                          )}
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-1" />
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bill Details</DialogTitle>
          </DialogHeader>

          {selectedBill && (
            <div className="space-y-6">
              <div className="border-b pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Bill ID</p>
                    <p className="font-semibold">{selectedBill.bill_id}</p>
                  </div>
                  {getStatusBadge(selectedBill.status)}
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <p>{selectedBill.item_description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {new Date(selectedBill.bill_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium">{selectedBill.bill_type}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Bill Breakdown</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>₹{selectedBill.total_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount</span>
                    <span>- ₹{selectedBill.discount_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span>₹{selectedBill.tax_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg border-t pt-2">
                    <span>Total</span>
                    <span>₹{selectedBill.grand_total.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                {selectedBill.status === 'Pending' && (
                  <Button className="flex-1">Pay Now</Button>
                )}
                <Button variant="outline" className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Download Invoice
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
