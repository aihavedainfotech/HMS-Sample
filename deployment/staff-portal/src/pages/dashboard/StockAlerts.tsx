import { useEffect, useState, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Package,
  Calendar,
  ArrowUp,
  Loader2,
  Wifi,
  WifiOff,
  Search,
  Filter,
  Trash2,
  AlertCircle,
  RefreshCcw,
  ShoppingBag,
  History,
  XCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';

interface Medicine {
  id?: string;
  medicine_id: string;
  generic_name: string;
  brand_name: string;
  category?: string;
  dosage_form?: string;
  strength?: string;
  current_stock: number;
  reorder_level: number;
  expiry_date: string;
  unit_price?: number;
  supplier_name?: string;
  status?: string;
}

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function StockAlerts() {
  const socketRef = useRef<Socket | null>(null);
  const [allMedicines, setAllMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [restockQuantity, setRestockQuantity] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchAlerts();

    // Initialize Socket.IO for real-time updates
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';
    const socketUrl = apiBase.replace(/\/api\/?$/, '');
    socketRef.current = io(socketUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current.on('connect', () => {
      setIsConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
    });

    socketRef.current.on('pharmacy:medicine_added', fetchAlerts);
    socketRef.current.on('pharmacy:stock_updated', fetchAlerts);
    socketRef.current.on('pharmacy:medicine_updated', fetchAlerts);

    const interval = setInterval(fetchAlerts, 60000);

    return () => {
      clearInterval(interval);
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const fetchAlerts = async () => {
    try {
      const token = localStorage.getItem('hms_staff_token') || localStorage.getItem('hms_token');
      const inventoryRes = await fetch(`${API_URL}/pharmacy/inventory`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await inventoryRes.json();
      if (Array.isArray(data)) {
        setAllMedicines(data);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast.error('Failed to load stock alerts');
    } finally {
      setLoading(false);
    }
  };

  const categorizedData = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const threeMonthsLater = new Date();
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
    threeMonthsLater.setHours(0, 0, 0, 0);

    const expired: Medicine[] = [];
    const expiring: Medicine[] = [];
    const outOfStock: Medicine[] = [];
    const lowStock: Medicine[] = [];

    allMedicines.forEach(m => {
      const expiryDate = new Date(m.expiry_date);
      expiryDate.setHours(0, 0, 0, 0);

      if (expiryDate < now) {
        expired.push(m);
      } else if (expiryDate <= threeMonthsLater) {
        expiring.push(m);
      } else if (m.current_stock <= 0) {
        outOfStock.push(m);
      } else if (m.current_stock <= m.reorder_level) {
        lowStock.push(m);
      }
    });

    return { expired, expiring, outOfStock, lowStock };
  }, [allMedicines]);

  const filteredItems = useMemo(() => {
    let items: Medicine[] = [];
    if (activeTab === 'all') {
      items = [...categorizedData.expired, ...categorizedData.expiring, ...categorizedData.outOfStock, ...categorizedData.lowStock];
    } else {
      items = categorizedData[activeTab as keyof typeof categorizedData] || [];
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(m =>
        m.brand_name.toLowerCase().includes(q) ||
        m.generic_name.toLowerCase().includes(q) ||
        m.category?.toLowerCase().includes(q)
      );
    }
    return items;
  }, [categorizedData, activeTab, searchQuery]);

  const handleRestock = async () => {
    if (!selectedMedicine || !restockQuantity) return;
    try {
      const token = localStorage.getItem('hms_staff_token') || localStorage.getItem('hms_token');
      const medicineId = selectedMedicine.id || selectedMedicine.medicine_id;

      const response = await fetch(`${API_URL}/pharmacy/inventory/${medicineId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_stock: selectedMedicine.current_stock + parseInt(restockQuantity),
        }),
      });

      if (response.ok) {
        toast.success(`Restocked ${selectedMedicine.brand_name} by ${restockQuantity} units`);
        setSelectedMedicine(null);
        setRestockQuantity('');
        fetchAlerts();
      } else {
        toast.error('Failed to update stock');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  const handleDelete = async (medicineId: string) => {
    if (!window.confirm('Are you sure you want to remove this medicine? This action cannot be undone.')) return;
    try {
      const token = localStorage.getItem('hms_staff_token') || localStorage.getItem('hms_token');
      const response = await fetch(`${API_URL}/pharmacy/inventory/${medicineId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success('Medicine removed successfully');
        fetchAlerts();
      } else {
        toast.error('Failed to remove medicine');
      }
    } catch (error) {
      toast.error('Network error while deleting');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary opacity-50" />
        <p className="text-muted-foreground animate-pulse">Syncing Inventory Status...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Alerts</h1>
          <p className="text-muted-foreground mt-1">Real-time inventory health and critical notifications</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-gray-100 shadow-sm ${isConnected ? 'text-green-600' : 'text-red-500'}`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            {isConnected ? 'LIVE MONITORING' : 'OFFLINE'}
          </div>
          <Button variant="outline" size="sm" onClick={fetchAlerts} className="shadow-sm">
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Out of Stock', value: categorizedData.outOfStock.length, icon: ShoppingBag, color: 'red', key: 'outOfStock' },
          { label: 'Expired', value: categorizedData.expired.length, icon: XCircle, color: 'rose', key: 'expired' },
          { label: 'Low Stock', value: categorizedData.lowStock.length, icon: AlertTriangle, color: 'yellow', key: 'lowStock' },
          { label: 'Expiring Soon', value: categorizedData.expiring.length, icon: Calendar, color: 'orange', key: 'expiring' },
        ].map((stat) => (
          <motion.div
            key={stat.key}
            whileHover={{ y: -4 }}
            className="cursor-pointer"
            onClick={() => setActiveTab(stat.key)}
          >
            <Card className={`border-${stat.color}-100 bg-white hover:border-${stat.color}-300 hover:shadow-lg transition-all`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">{stat.label}</p>
                    <p className={`text-3xl font-bold text-${stat.color}-600`}>{stat.value}</p>
                  </div>
                  <div className={`p-3 bg-${stat.color}-50 rounded-xl`}>
                    <stat.icon className={`h-6 w-6 text-${stat.color}-600`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Navigation and Tools */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sticky top-0 z-10 bg-background/95 backdrop-blur py-2 border-b">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full lg:w-auto">
            <TabsList className="bg-muted/50 p-1">
              <TabsTrigger value="all">All Alerts</TabsTrigger>
              <TabsTrigger value="outOfStock" className="data-[state=active]:bg-red-100 data-[state=active]:text-red-700">Out of Stock</TabsTrigger>
              <TabsTrigger value="expired" className="data-[state=active]:bg-rose-100 data-[state=active]:text-rose-700">Expired</TabsTrigger>
              <TabsTrigger value="lowStock" className="data-[state=active]:bg-yellow-100 data-[state=active]:text-yellow-700">Low Stock</TabsTrigger>
              <TabsTrigger value="expiring" className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700">Expiring Soon</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full lg:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, category, or chemical..."
              className="pl-9 bg-muted/30 border-none shadow-inner"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Content Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + searchQuery}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            {filteredItems.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 bg-muted/20 rounded-2xl border-2 border-dashed border-muted">
                <div className="p-6 bg-white rounded-full shadow-md mb-4 text-muted-foreground">
                  <Filter className="h-10 w-10 opacity-40" />
                </div>
                <h3 className="text-xl font-semibold">No matches found</h3>
                <p className="text-muted-foreground mt-2 max-w-sm text-center">
                  Try adjusting your search criteria or switching to a different category tab.
                </p>
                <Button variant="ghost" className="mt-4 text-primary" onClick={() => { setSearchQuery(''); setActiveTab('all'); }}>
                  Reset Filters
                </Button>
              </div>
            ) : (
              filteredItems.map((item) => {
                const isOutOfStock = item.current_stock <= 0;
                const isExpired = new Date(item.expiry_date) < new Date();

                return (
                  <Card key={item.medicine_id} className="group hover:shadow-md transition-shadow">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between items-start">
                        <Badge variant="secondary" className="px-2 py-0 text-[10px] font-bold uppercase tracking-wider bg-gray-100">
                          {item.category || 'General'}
                        </Badge>
                        {isExpired ? (
                          <Badge className="bg-rose-100 text-rose-700 border-rose-200">EXPIRED</Badge>
                        ) : isOutOfStock ? (
                          <Badge className="bg-red-100 text-red-700 border-red-200 uppercase">OUT OF STOCK</Badge>
                        ) : item.current_stock <= item.reorder_level ? (
                          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">LOW STOCK</Badge>
                        ) : (
                          <Badge className="bg-orange-100 text-orange-700 border-orange-200">EXPIRING</Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg font-bold mt-2 truncate group-hover:text-primary transition-colors">
                        {item.brand_name}
                      </CardTitle>
                      <CardDescription className="text-xs font-semibold uppercase text-muted-foreground truncate">
                        {item.generic_name}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-3">
                      <div className="flex items-center justify-between text-sm py-2 border-y border-dashed">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Stock</span>
                        </div>
                        <span className={`font-bold ${isOutOfStock ? 'text-red-600' : 'text-foreground'}`}>
                          {item.current_stock} units
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm py-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Expiry</span>
                        </div>
                        <span className={`font-medium ${isExpired ? 'text-rose-600 font-bold' : 'text-foreground'}`}>
                          {new Date(item.expiry_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </CardContent>
                    <CardFooter className="p-3 bg-muted/30 flex gap-2">
                      {!isExpired ? (
                        <Button
                          size="sm"
                          className="w-full shadow-sm"
                          onClick={() => setSelectedMedicine(item)}
                        >
                          <ArrowUp className="h-3.5 w-3.5 mr-1.5" />
                          Restock
                        </Button>
                      ) : (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full"
                          onClick={() => handleDelete(item.id || item.medicine_id || '')}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          Remove
                        </Button>
                      )}
                      <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                        <History className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Restock Dialog - Enhanced */}
      <Dialog open={!!selectedMedicine} onOpenChange={() => setSelectedMedicine(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">Restock Inventory</DialogTitle>
                <p className="text-sm text-muted-foreground">Update stock levels for pharmacy fulfillment</p>
              </div>
            </div>
          </DialogHeader>

          {selectedMedicine && (
            <div className="space-y-6 py-4">
              <div className="p-4 rounded-xl bg-muted/30 border space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Medicine</span>
                  <span className="text-sm font-semibold">{selectedMedicine.brand_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Chemical</span>
                  <span className="text-sm font-medium">{selectedMedicine.generic_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Current Stock</span>
                  <Badge variant="secondary" className="px-2">{selectedMedicine.current_stock} units</Badge>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold tracking-tight">ADD NEW QUANTITY</label>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Units (Tablets/Vials)</span>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="E.g. 500"
                    className="h-14 text-2xl font-bold bg-muted/20 border-2 border-transparent focus-visible:border-primary transition-all text-center"
                    value={restockQuantity}
                    onChange={(e) => setRestockQuantity(e.target.value)}
                    autoFocus
                  />
                  {restockQuantity && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-green-600"
                    >
                      <ArrowUp className="h-5 w-5" />
                      <span className="text-lg font-bold">+{restockQuantity}</span>
                    </motion.div>
                  )}
                </div>
                {selectedMedicine.current_stock + parseInt(restockQuantity || '0') > selectedMedicine.reorder_level && (
                  <p className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                    <AlertCircle className="h-3.5 w-3.5" />
                    New total will be safely above reorder level ({selectedMedicine.reorder_level})
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setSelectedMedicine(null)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleRestock} disabled={!restockQuantity || parseInt(restockQuantity) <= 0} className="flex-1">
              Confirm Stock Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
