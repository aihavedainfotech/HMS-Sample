import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Pill,
  FileText,
  AlertTriangle,
  Package,
  TrendingUp,
  TrendingDown,
  Loader2,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface DashboardStats {
  totalPrescriptions: number;
  pendingDispensing: number;
  lowStockItems: number;
  totalMedicines: number;
}

export default function PharmacistHome() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalPrescriptions: 0,
    pendingDispensing: 0,
    lowStockItems: 0,
    totalMedicines: 0,
  });

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('hms_token');
      
      // Fetch prescriptions
      const prescriptionsRes = await fetch(`${API_URL}/prescriptions?status=Active`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const prescriptions = await prescriptionsRes.json();

      // Fetch inventory
      const inventoryRes = await fetch(`${API_URL}/pharmacy/inventory`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const inventory = await inventoryRes.json();

      // Fetch low stock items
      const lowStockRes = await fetch(`${API_URL}/pharmacy/inventory?low_stock=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const lowStock = await lowStockRes.json();

      setStats({
        totalPrescriptions: Array.isArray(prescriptions) ? prescriptions.length : 0,
        pendingDispensing: Array.isArray(prescriptions) ? prescriptions.filter((p: { status: string }) => p.status === 'Active').length : 0,
        lowStockItems: Array.isArray(lowStock) ? lowStock.length : 0,
        totalMedicines: Array.isArray(inventory) ? inventory.length : 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
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
        <h1 className="text-2xl font-bold">Pharmacy Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Prescriptions</p>
                <p className="text-2xl font-bold">{stats.totalPrescriptions}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Dispensing</p>
                <p className="text-2xl font-bold">{stats.pendingDispensing}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Pill className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Stock Items</p>
                <p className="text-2xl font-bold">{stats.lowStockItems}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Medicines</p>
                <p className="text-2xl font-bold">{stats.totalMedicines}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Package className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Today's Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">12 prescriptions dispensed</p>
                  <p className="text-sm text-muted-foreground">Today, 10:30 AM</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="font-medium">3 items running low on stock</p>
                  <p className="text-sm text-muted-foreground">Today, 9:15 AM</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-primary/5 rounded-lg text-center cursor-pointer hover:bg-primary/10 transition-colors">
                <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-medium text-sm">Process Prescription</p>
              </div>
              <div className="p-4 bg-primary/5 rounded-lg text-center cursor-pointer hover:bg-primary/10 transition-colors">
                <Package className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-medium text-sm">Update Inventory</p>
              </div>
              <div className="p-4 bg-primary/5 rounded-lg text-center cursor-pointer hover:bg-primary/10 transition-colors">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-medium text-sm">View Alerts</p>
              </div>
              <div className="p-4 bg-primary/5 rounded-lg text-center cursor-pointer hover:bg-primary/10 transition-colors">
                <Pill className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-medium text-sm">Add Medicine</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
