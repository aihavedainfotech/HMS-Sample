import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Package,
  Search,
  Plus,
  Edit,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Medicine {
  medicine_id: string;
  generic_name: string;
  brand_name: string;
  category: string;
  dosage_form: string;
  strength: string;
  current_stock: number;
  reorder_level: number;
  unit_price: number;
  expiry_date: string;
  status: string;
}

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function MedicineInventory() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [_selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  useEffect(() => {
    fetchMedicines();
  }, []);

  const fetchMedicines = async () => {
    try {
      const token = localStorage.getItem('hms_token');
      const response = await fetch(`${API_URL}/pharmacy/inventory`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setMedicines(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching medicines:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMedicines = medicines.filter(
    (m) =>
      m.generic_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.brand_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStockStatus = (stock: number, reorderLevel: number) => {
    if (stock <= 0) return { label: 'Out of Stock', variant: 'destructive' as const };
    if (stock <= reorderLevel) return { label: 'Low Stock', variant: 'secondary' as const };
    return { label: 'In Stock', variant: 'default' as const };
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Medicine Inventory</h1>
          <p className="text-muted-foreground">Manage medicine stock and inventory</p>
        </div>
        <div className="flex gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search medicines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Medicine
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Medicines</p>
                <p className="text-2xl font-bold">{medicines.length}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold">
                  {medicines.filter((m) => m.current_stock <= m.reorder_level && m.current_stock > 0).length}
                </p>
              </div>
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Out of Stock</p>
                <p className="text-2xl font-bold">
                  {medicines.filter((m) => m.current_stock <= 0).length}
                </p>
              </div>
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expiring Soon</p>
                <p className="text-2xl font-bold">
                  {medicines.filter((m) => {
                    const expiry = new Date(m.expiry_date);
                    const threeMonths = new Date();
                    threeMonths.setMonth(threeMonths.getMonth() + 3);
                    return expiry <= threeMonths;
                  }).length}
                </p>
              </div>
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Medicines Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Medicine</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Category</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Stock</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Price</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredMedicines.map((medicine) => {
                  const stockStatus = getStockStatus(medicine.current_stock, medicine.reorder_level);
                  return (
                    <tr key={medicine.medicine_id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{medicine.generic_name}</p>
                          <p className="text-sm text-muted-foreground">{medicine.brand_name}</p>
                          <p className="text-xs text-muted-foreground">{medicine.strength}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{medicine.category}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{medicine.current_stock}</span>
                          <span className="text-xs text-muted-foreground">
                            (Reorder: {medicine.reorder_level})
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">₹{medicine.unit_price}</td>
                      <td className="px-4 py-3">
                        <Badge variant={stockStatus.variant}>{stockStatus.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedMedicine(medicine)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Medicine Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Medicine</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Generic Name</label>
                <Input placeholder="e.g., Paracetamol" />
              </div>
              <div>
                <label className="text-sm font-medium">Brand Name</label>
                <Input placeholder="e.g., Crocin" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Category</label>
                <Input placeholder="e.g., Analgesic" />
              </div>
              <div>
                <label className="text-sm font-medium">Dosage Form</label>
                <Input placeholder="e.g., Tablet" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Strength</label>
                <Input placeholder="e.g., 500mg" />
              </div>
              <div>
                <label className="text-sm font-medium">Unit Price</label>
                <Input type="number" placeholder="0.00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Initial Stock</label>
                <Input type="number" placeholder="0" />
              </div>
              <div>
                <label className="text-sm font-medium">Reorder Level</label>
                <Input type="number" placeholder="10" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => { toast.success('Medicine added'); setIsAddDialogOpen(false); }}>
                Add Medicine
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
