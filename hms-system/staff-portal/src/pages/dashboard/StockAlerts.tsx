import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Package,
  Calendar,
  ArrowUp,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface Medicine {
  medicine_id: string;
  generic_name: string;
  brand_name: string;
  current_stock: number;
  reorder_level: number;
  expiry_date: string;
  supplier_name?: string;
}

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function StockAlerts() {
  const [lowStockItems, setLowStockItems] = useState<Medicine[]>([]);
  const [expiringItems, setExpiringItems] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [restockQuantity, setRestockQuantity] = useState('');

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const token = localStorage.getItem('hms_token');
      
      // Fetch low stock items
      const lowStockRes = await fetch(`${API_URL}/pharmacy/inventory?low_stock=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const lowStock = await lowStockRes.json();
      setLowStockItems(Array.isArray(lowStock) ? lowStock : []);

      // Fetch expiring items
      const expiringRes = await fetch(`${API_URL}/pharmacy/inventory?expiring=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const expiring = await expiringRes.json();
      setExpiringItems(Array.isArray(expiring) ? expiring : []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestock = async () => {
    if (!selectedMedicine || !restockQuantity) return;
    
    try {
      const token = localStorage.getItem('hms_token');
      const response = await fetch(`${API_URL}/pharmacy/inventory/${selectedMedicine.medicine_id}/restock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quantity: parseInt(restockQuantity) }),
      });

      if (response.ok) {
        toast.success('Stock updated successfully');
        setSelectedMedicine(null);
        setRestockQuantity('');
        fetchAlerts();
      } else {
        toast.error('Failed to update stock');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    }
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
        <h1 className="text-2xl font-bold">Stock Alerts</h1>
        <p className="text-muted-foreground">Monitor low stock and expiring medicines</p>
      </div>

      {/* Alert Summary */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Low Stock Items</p>
                <p className="text-2xl font-bold">{lowStockItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expiring Soon</p>
                <p className="text-2xl font-bold">{expiringItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Low Stock Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lowStockItems.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No low stock items</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockItems.map((item) => (
                <div
                  key={item.medicine_id}
                  className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Package className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-medium">{item.generic_name}</p>
                      <p className="text-sm text-muted-foreground">{item.brand_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Current: {item.current_stock} | Reorder at: {item.reorder_level}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setSelectedMedicine(item)}
                  >
                    <ArrowUp className="h-4 w-4 mr-1" />
                    Restock
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expiring Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-600" />
            Expiring Soon (Within 3 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {expiringItems.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No medicines expiring soon</p>
            </div>
          ) : (
            <div className="space-y-3">
              {expiringItems.map((item) => (
                <div
                  key={item.medicine_id}
                  className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium">{item.generic_name}</p>
                      <p className="text-sm text-muted-foreground">{item.brand_name}</p>
                      <p className="text-xs text-orange-600">
                        Expires: {new Date(item.expiry_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-orange-300 text-orange-700">
                    Action Required
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Restock Dialog */}
      <Dialog open={!!selectedMedicine} onOpenChange={() => setSelectedMedicine(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restock Medicine</DialogTitle>
          </DialogHeader>
          {selectedMedicine && (
            <div className="space-y-4">
              <div>
                <p className="font-medium">{selectedMedicine.generic_name}</p>
                <p className="text-sm text-muted-foreground">{selectedMedicine.brand_name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Current Stock: {selectedMedicine.current_stock}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Quantity to Add</label>
                <Input
                  type="number"
                  placeholder="Enter quantity"
                  value={restockQuantity}
                  onChange={(e) => setRestockQuantity(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedMedicine(null)}>
                  Cancel
                </Button>
                <Button onClick={handleRestock} disabled={!restockQuantity}>
                  Update Stock
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
