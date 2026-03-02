import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart3,
  Download,
  Eye,
  FileText,
  Package,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Activity,
  Calendar,
  ChevronRight,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface SaleDay {
  date: string;
  revenue: number;
  medicines_sold: number;
  prescriptions: number;
}

interface StockItem {
  name: string;
  stock: number;
  value: number;
  status: string;
  category: string;
}

interface TopMedicine {
  name: string;
  units: number;
  revenue: number;
  category: string;
}

interface PrescriptionStat {
  date: string;
  dispensed: number;
  pending: number;
  cancelled: number;
}

export default function PharmacyReports() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState('30');
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<SaleDay[]>([]);
  const [stockData, setStockData] = useState<StockItem[]>([]);
  const [topMedicines, setTopMedicines] = useState<TopMedicine[]>([]);
  const [prescriptionStats, setPrescriptionStats] = useState<PrescriptionStat[]>([]);
  const [inventorySummary, setInventorySummary] = useState({ total_value: 0, total_items: 0, low_stock: 0, out_of_stock: 0 });

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('hms_staff_token');
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };

      const res = await fetch(`${API_URL}/pharmacy/analytics?days=${dateRange}`, { headers });
      if (!res.ok) throw new Error('Failed to fetch report data');
      const data = await res.json();

      setSalesData(data.daily_sales || []);
      setStockData(data.stock_levels || []);
      setTopMedicines(data.top_medicines || []);
      setPrescriptionStats(data.prescription_stats || []);
      setInventorySummary(data.inventory_summary || { total_value: 0, total_items: 0, low_stock: 0, out_of_stock: 0 });
    } catch (err) {
      console.error('Report data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalSales = salesData.reduce((s, d) => s + d.revenue, 0);
  const totalMedsSold = salesData.reduce((s, d) => s + d.medicines_sold, 0);
  const totalRx = prescriptionStats.reduce((s, d) => s + d.dispensed, 0);
  const avgPerDay = salesData.length > 0 ? Math.round(totalSales / salesData.length) : 0;

  const formatCurrency = (v: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(v);
  };

  const handleExportCSV = (reportName: string) => {
    let csv = '';
    if (reportName === 'Sales') {
      csv = 'Date,Revenue,MedicinesSold,Prescriptions\n' +
        salesData.map(d => `${d.date},${d.revenue},${d.medicines_sold},${d.prescriptions}`).join('\n');
    } else if (reportName === 'Inventory') {
      csv = 'Name,Stock,Value,Status,Category\n' +
        stockData.map(d => `${d.name},${d.stock},${d.value},${d.status},${d.category || ''}`).join('\n');
    } else if (reportName === 'Prescriptions') {
      csv = 'Date,Dispensed,Pending,Cancelled\n' +
        prescriptionStats.map(d => `${d.date},${d.dispensed},${d.pending},${d.cancelled}`).join('\n');
    }
    if (!csv) return;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pharmacy_${reportName.toLowerCase()}_report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 sm:p-6 lg:p-8">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] left-[20%] w-[40%] h-[40%] bg-blue-400/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] -right-[10%] w-[40%] h-[40%] bg-emerald-400/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative space-y-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
          <div className="space-y-1">
            <button
              onClick={() => navigate('/pharmacist')}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold mb-4 transition-colors group"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              BACK TO CONSOLE
            </button>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
              <div className="p-2.5 bg-slate-900 rounded-2xl">
                <FileText className="h-8 w-8 text-white" />
              </div>
              REPORTS & <span className="text-blue-600">ARCHIVES</span>
            </h1>
            <p className="text-slate-500 font-bold flex items-center gap-2 uppercase tracking-widest text-[10px]">
              <Activity size={14} className="text-emerald-500" /> Compliance, Sales & Inventory Documentation
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px] h-14 bg-white/70 backdrop-blur-xl border-2 border-slate-100 rounded-2xl font-black shadow-sm">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-0 shadow-2xl">
                <SelectItem value="1">Today</SelectItem>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="365">This Year</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => window.print()}
              className="h-14 px-6 bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-100 font-black rounded-2xl transition-all shadow-sm"
            >
              <Printer className="mr-2 h-5 w-5" />
              PRINT
            </Button>
          </div>
        </motion.div>

        {/* Quick Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'GROSS REVENUE', value: formatCurrency(totalSales), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'MEDICINES DISPENSED', value: totalMedsSold.toLocaleString(), icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'RX COMPLETED', value: totalRx.toLocaleString(), icon: FileText, color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'CRITICAL STOCK', value: inventorySummary.low_stock + inventorySummary.out_of_stock, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
          ].map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className="border-0 bg-white/70 backdrop-blur-xl shadow-xl shadow-slate-200/50 rounded-[2.5rem] p-6 group hover:bg-white transition-colors">
                <div className={`p-4 rounded-2xl ${stat.bg} w-14 h-14 flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">{stat.value}</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Reports Content */}
        <Tabs defaultValue="sales" className="space-y-8">
          <TabsList className="bg-slate-900/5 backdrop-blur-xl p-1.5 rounded-[2rem] inline-flex">
            {['sales', 'inventory', 'medicine-ranks', 'prescriptions'].map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="rounded-[1.5rem] px-8 py-3 font-black uppercase text-[10px] tracking-widest transition-all data-[state=active]:bg-slate-900 data-[state=active]:text-white shadow-none"
              >
                {tab.replace('-', ' ')}
              </TabsTrigger>
            ))}
          </TabsList>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-32 bg-white/40 backdrop-blur-sm rounded-[3rem] border-2 border-dashed border-slate-200"
              >
                <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
                <p className="text-xl font-black text-slate-900 uppercase tracking-widest leading-none">Fetching Ledger...</p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <TabsContent value="sales" className="grid lg:grid-cols-3 gap-8 mt-0 focus-visible:ring-0">
                  <Card className="lg:col-span-2 border-0 bg-white/70 backdrop-blur-xl shadow-xl shadow-slate-200/50 rounded-[3rem] p-8">
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp className="text-emerald-500" /> Daily Revenue Ledger
                      </h2>
                      <Button size="sm" variant="ghost" className="font-black text-[10px] uppercase tracking-widest text-blue-600" onClick={() => handleExportCSV('Sales')}>
                        <Download size={14} className="mr-2" /> EXPORT CSV
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {salesData.map((day, idx) => (
                        <div key={idx} className="flex items-center justify-between p-5 bg-white rounded-[1.5rem] border border-slate-50 hover:border-slate-200 shadow-sm transition-all group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
                              <Calendar size={18} />
                            </div>
                            <div>
                              <p className="font-black text-slate-800 uppercase text-xs tracking-tight">
                                {new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
                              </p>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {day.medicines_sold} UNITS • {day.prescriptions} RX
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black text-emerald-600">{formatCurrency(day.revenue)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card className="border-0 bg-slate-900 shadow-2xl shadow-slate-900/40 rounded-[3rem] p-8 text-white flex flex-col">
                    <h2 className="text-lg font-black tracking-widest uppercase text-blue-400 mb-8">Sales Performance</h2>
                    <div className="space-y-8 flex-1">
                      <div className="p-6 bg-white/5 rounded-[2rem] border border-white/10">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">AVERAGE DAILY REVENUE</p>
                        <p className="text-4xl font-black text-white tracking-tighter">{formatCurrency(avgPerDay)}</p>
                      </div>
                      <div className="p-6 bg-white/5 rounded-[2rem] border border-white/10">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">CUMULATIVE TRANSACTIONS</p>
                        <p className="text-4xl font-black text-blue-400 tracking-tighter">{salesData.reduce((s, d) => s + d.prescriptions, 0)}</p>
                      </div>
                    </div>
                    <Button className="mt-8 h-14 bg-blue-600 hover:bg-blue-700 rounded-2xl font-black uppercase tracking-widest">GENERATE FULL AUDIT</Button>
                  </Card>
                </TabsContent>

                <TabsContent value="inventory" className="mt-0 focus-visible:ring-0">
                  <Card className="border-0 bg-white/70 backdrop-blur-xl shadow-xl shadow-slate-200/50 rounded-[3rem] p-8">
                    <div className="flex items-center justify-between mb-8 px-4">
                      <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest">Inventory Status Report</h2>
                      <Button size="sm" variant="ghost" className="font-black text-[10px] uppercase tracking-widest text-blue-600" onClick={() => handleExportCSV('Inventory')}>
                        <Download size={14} className="mr-2" /> EXPORT XLS
                      </Button>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      {stockData.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-6 bg-white rounded-[2rem] border border-slate-100 hover:shadow-md transition-all">
                          <div>
                            <p className="font-black text-slate-800 uppercase text-xs mb-1">{item.name}</p>
                            <div className="flex gap-4">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">QTY: <span className="text-slate-900">{item.stock}</span></p>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">VAL: <span className="text-slate-900">{formatCurrency(item.value)}</span></p>
                            </div>
                          </div>
                          <Badge className={`border-0 font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-full ${item.status === 'out_of_stock' ? 'bg-rose-100 text-rose-600' :
                            item.status === 'low' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                            }`}>
                            {item.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="medicine-ranks" className="mt-0 focus-visible:ring-0">
                  <Card className="border-0 bg-white/70 backdrop-blur-xl shadow-xl shadow-slate-200/50 rounded-[3rem] p-8">
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest mb-8 px-4">Best Selling Medications</h2>
                    <div className="space-y-4">
                      {topMedicines.map((med, idx) => (
                        <div key={idx} className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border-2 border-transparent hover:border-white hover:bg-white transition-all group">
                          <div className="flex items-center gap-6">
                            <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-xl">
                              {idx + 1}
                            </div>
                            <div>
                              <h3 className="font-black text-slate-800 uppercase tracking-tighter text-lg">{med.name}</h3>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{med.category} • {med.units} UNITS SOLD</p>
                            </div>
                          </div>
                          <p className="text-2xl font-black text-slate-900 font-mono tracking-tighter">{formatCurrency(med.revenue)}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="prescriptions" className="mt-0 focus-visible:ring-0">
                  <Card className="border-0 bg-white/70 backdrop-blur-xl shadow-xl shadow-slate-200/50 rounded-[3rem] p-8">
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest mb-8 px-4">Prescription Fulfillment Logs</h2>
                    <div className="space-y-6">
                      {prescriptionStats.map((stat, idx) => (
                        <div key={idx} className="p-8 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100">
                          <div className="flex items-center justify-between mb-6">
                            <p className="font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                              <Calendar size={16} className="text-blue-500" /> {new Date(stat.date).toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </p>
                            <Badge className="bg-slate-900 text-white rounded-lg font-black uppercase text-[10px] px-3">Total: {stat.dispensed + stat.pending + stat.cancelled}</Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-6">
                            <div className="p-4 bg-white rounded-2xl text-center">
                              <p className="text-2xl font-black text-emerald-600">{stat.dispensed}</p>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">DISPENSED</p>
                            </div>
                            <div className="p-4 bg-white rounded-2xl text-center">
                              <p className="text-2xl font-black text-amber-500">{stat.pending}</p>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">PENDING</p>
                            </div>
                            <div className="p-4 bg-white rounded-2xl text-center">
                              <p className="text-2xl font-black text-rose-500">{stat.cancelled}</p>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">CANCELLED</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </TabsContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Tabs>

        {/* Custom Exports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: 'SALES ARCHIVE', desc: 'Full Revenue Transactional Ledger', onClick: () => handleExportCSV('Sales'), icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-50' },
            { title: 'STOCK AUDIT', desc: 'Current Valuation & Status Logs', onClick: () => handleExportCSV('Inventory'), icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { title: 'RX STATISTICS', desc: 'Prescription Volume & Logs', onClick: () => handleExportCSV('Prescriptions'), icon: FileText, color: 'text-violet-600', bg: 'bg-violet-50' },
            { title: 'FULL YEARLY', desc: 'Annual Performance Summary', onClick: () => window.print(), icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map((item, idx) => (
            <motion.div
              key={item.title}
              whileHover={{ y: -5 }}
              onClick={item.onClick}
              className="cursor-pointer"
            >
              <Card className="border-0 bg-white shadow-xl shadow-slate-200/50 rounded-[2rem] p-6 group">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${item.bg} ${item.color} group-hover:scale-110 transition-transform`}>
                    <item.icon size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-black text-slate-800 uppercase tracking-tight text-xs mb-1">{item.title}</h4>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.desc}</p>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-900 transition-colors" />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
