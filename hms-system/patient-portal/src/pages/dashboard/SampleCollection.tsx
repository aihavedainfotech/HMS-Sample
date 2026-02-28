import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Search,
  User,
  Calendar,
  Droplet,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import type { LabOrder } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function SampleCollection() {
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [collecting, setCollecting] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('hms_token');
      const response = await fetch(`${API_URL}/lab/orders?status=Pending`, {
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

  const handleCollectSample = async (orderId: string) => {
    setCollecting(orderId);
    try {
      const token = localStorage.getItem('hms_token');
      const response = await fetch(`${API_URL}/lab/orders/${orderId}/collect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sample_id: `SMP-${Date.now()}`,
          collected_at: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        toast.success('Sample collected successfully');
        fetchOrders();
      } else {
        toast.error('Failed to collect sample');
      }
    } catch (error) {
      toast.error('Network error');
    } finally {
      setCollecting(null);
    }
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
          <h1 className="text-2xl font-bold">Sample Collection</h1>
          <p className="text-muted-foreground">Collect samples for pending lab tests</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search patients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Droplet className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No pending samples to collect</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.lab_order_id}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                      <Droplet className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{order.patient_name}</h3>
                        {order.priority !== 'Routine' && (
                          <Badge variant="destructive">{order.priority}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{order.test_name}</p>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-sm">
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4 text-muted-foreground" />
                          Dr. {order.doctor_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {new Date(order.order_date).toLocaleDateString()}
                        </span>
                        {order.sample_type && (
                          <Badge variant="outline">{order.sample_type}</Badge>
                        )}
                        {order.fasting_required && (
                          <Badge variant="outline">Fasting Required</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleCollectSample(order.lab_order_id)}
                    disabled={collecting === order.lab_order_id}
                  >
                    {collecting === order.lab_order_id ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                    )}
                    Collect Sample
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
