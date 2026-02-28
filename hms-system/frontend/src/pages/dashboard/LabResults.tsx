import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  FlaskConical,
  Calendar,
  User,
  Download,
  Search,
  Loader2,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { LabOrder } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function LabResults() {
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);

  useEffect(() => {
    fetchLabOrders();
  }, []);

  const fetchLabOrders = async () => {
    try {
      const token = localStorage.getItem('hms_token');
      const response = await fetch(`${API_URL}/lab/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setLabOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching lab orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
      Delivered: { variant: 'default', icon: CheckCircle2 },
      Verified: { variant: 'default', icon: CheckCircle2 },
      Results_Entered: { variant: 'secondary', icon: Clock },
      In_Progress: { variant: 'secondary', icon: Clock },
      Pending: { variant: 'outline', icon: Clock },
      Cancelled: { variant: 'destructive', icon: AlertCircle },
    };
    const config = variants[status] || { variant: 'outline', icon: Clock };
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <config.icon className="h-3 w-3" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const filteredOrders = labOrders.filter(
    (o) =>
      o.test_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.doctor_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Lab Results</h1>
          <p className="text-muted-foreground">
            View your laboratory test results and reports
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search lab tests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FlaskConical className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No lab tests found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.lab_order_id}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                      <FlaskConical className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{order.test_name}</h3>
                        {getStatusBadge(order.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {order.test_category}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-sm">
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {order.doctor_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {new Date(order.order_date).toLocaleDateString()}
                        </span>
                        {order.fasting_required && (
                          <Badge variant="outline">Fasting Required</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {['Verified', 'Delivered', 'Results_Entered'].includes(order.status) && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Results
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-1" />
                          Download
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

      {/* Lab Result Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lab Test Results</DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Header */}
              <div className="border-b pb-4">
                <h3 className="font-semibold text-lg">{selectedOrder.test_name}</h3>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    Ordered by: {selectedOrder.doctor_name}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(selectedOrder.order_date).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Clinical Notes */}
              {selectedOrder.clinical_notes && (
                <div>
                  <h4 className="font-semibold mb-2">Clinical Notes</h4>
                  <p className="text-muted-foreground">{selectedOrder.clinical_notes}</p>
                </div>
              )}

              {/* Results Table */}
              <div>
                <h4 className="font-semibold mb-3">Test Results</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium">Parameter</th>
                        <th className="px-4 py-2 text-left text-sm font-medium">Result</th>
                        <th className="px-4 py-2 text-left text-sm font-medium">Unit</th>
                        <th className="px-4 py-2 text-left text-sm font-medium">Reference Range</th>
                        <th className="px-4 py-2 text-left text-sm font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {/* Mock results - in real app, these would come from API */}
                      <tr>
                        <td className="px-4 py-3 text-sm">Sample Parameter</td>
                        <td className="px-4 py-3 text-sm font-medium">12.5</td>
                        <td className="px-4 py-3 text-sm">mg/dL</td>
                        <td className="px-4 py-3 text-sm">10.0 - 15.0</td>
                        <td className="px-4 py-3">
                          <Badge variant="default" className="text-xs">Normal</Badge>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
