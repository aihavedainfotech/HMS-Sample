import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  FlaskConical,
  Search,
  User,
  Calendar,
  Loader2,
  Play,
  CheckCircle2,
} from 'lucide-react';
import type { LabOrder } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function TestProcessing() {
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('hms_token');
      const response = await fetch(`${API_URL}/lab/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartProcessing = async (orderId: string) => {
    setProcessing(orderId);
    try {
      const token = localStorage.getItem('hms_token');
      const response = await fetch(`${API_URL}/lab/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'In_Progress' }),
      });

      if (response.ok) {
        toast.success('Test processing started');
        fetchOrders();
      } else {
        toast.error('Failed to start processing');
      }
    } catch (error) {
      toast.error('Network error');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      Pending: { variant: 'secondary', label: 'Pending' },
      Sample_Collected: { variant: 'default', label: 'Sample Collected' },
      In_Progress: { variant: 'default', label: 'In Progress' },
      QC_Pending: { variant: 'outline', label: 'QC Pending' },
      Results_Entered: { variant: 'default', label: 'Results Entered' },
      Verified: { variant: 'default', label: 'Verified' },
      Delivered: { variant: 'default', label: 'Delivered' },
    };
    const config = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredOrders = orders.filter(
    (o) =>
      o.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.test_name?.toLowerCase().includes(searchQuery.toLowerCase())
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
          <h1 className="text-2xl font-bold">Test Processing</h1>
          <p className="text-muted-foreground">Process and manage lab tests</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tests..."
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
            <p className="text-muted-foreground">No lab orders found</p>
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
                        {order.priority !== 'Routine' && (
                          <Badge variant="destructive">{order.priority}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{order.test_category}</p>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-sm">
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {order.patient_name}
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
                    {order.status === 'Pending' && (
                      <Button
                        size="sm"
                        onClick={() => handleStartProcessing(order.lab_order_id)}
                        disabled={processing === order.lab_order_id}
                      >
                        {processing === order.lab_order_id ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4 mr-1" />
                        )}
                        Start
                      </Button>
                    )}
                    {order.status === 'In_Progress' && (
                      <Button size="sm" variant="outline">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
