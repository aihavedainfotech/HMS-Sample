import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  Calendar,
  DollarSign,
  Activity,
  Download,
  FileText,
  Printer,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Loader2,
  Building2,
  Stethoscope,
  Pill,
  FlaskConical,
  AlertCircle,
} from 'lucide-react';

interface Summary {
  total_patients: number;
  total_appointments: number;
  total_revenue: number;
  patient_change: number;
  revenue_change: number;
  month_appointments: number;
}

interface MonthlyData {
  month: string;
  patients: number;
  revenue: number;
  appointments: number;
}

interface DeptStat {
  id: number;
  name: string;
  staff: number;
  patients: number;
  revenue: number;
}

interface Doctor {
  name: string;
  department: string;
  patients: number;
}

interface Financial {
  total_revenue: number;
  admission_revenue: number;
  pharmacy_revenue: number;
  lab_revenue: number;
}

export default function ReportsAnalytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyData[]>([]);
  const [deptStats, setDeptStats] = useState<DeptStat[]>([]);
  const [topDoctors, setTopDoctors] = useState<Doctor[]>([]);
  const [financial, setFinancial] = useState<Financial | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('hms_staff_token');
      if (!token) throw new Error('Auth required');

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';
      const res = await fetch(`${API_URL}/admin/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch analytics');
      const data = await res.json();

      setSummary(data.summary);
      setMonthlyTrends(data.monthly_trends || []);
      setDeptStats(data.department_stats || []);
      setTopDoctors(data.top_doctors || []);
      setFinancial(data.financial);
    } catch (err: any) {
      console.error('Analytics fetch error:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const formatCurrency = (val: number) => {
    if (val >= 1000000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
    return `₹${val.toFixed(0)}`;
  };

  const formatMonth = (m: string) => {
    try {
      const [year, month] = m.split('-');
      const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${names[parseInt(month) - 1]} ${year.slice(2)}`;
    } catch {
      return m;
    }
  };

  const ChangeIndicator = ({ value }: { value: number }) => (
    <div className={`flex items-center gap-0.5 text-xs font-medium ${value >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
      {value >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {value >= 0 ? '+' : ''}{value}%
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
        <p className="text-red-500 font-medium">{error}</p>
        <Button onClick={fetchAnalytics} variant="outline" className="mt-4">Retry</Button>
      </div>
    );
  }

  const maxPatients = Math.max(...monthlyTrends.map(d => d.patients), 1);
  const maxRevenue = Math.max(...monthlyTrends.map(d => d.revenue), 1);
  const maxAppts = Math.max(...monthlyTrends.map(d => d.appointments), 1);

  const totalDeptRevenue = deptStats.reduce((a, b) => a + b.revenue, 0) || 1;

  const grandTotal = financial?.total_revenue || 1;
  const revenueBreakdown = [
    { label: 'Admissions', value: financial?.admission_revenue || 0, icon: Building2, color: 'bg-indigo-500' },
    { label: 'Pharmacy', value: financial?.pharmacy_revenue || 0, icon: Pill, color: 'bg-emerald-500' },
    { label: 'Laboratory', value: financial?.lab_revenue || 0, icon: FlaskConical, color: 'bg-amber-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Hospital performance metrics from live database</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchAnalytics} variant="outline" size="sm" disabled={loading}
            className="border-gray-200">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Total Patients</p>
                <p className="text-2xl font-bold text-gray-900">{summary?.total_patients?.toLocaleString() || 0}</p>
                <ChangeIndicator value={summary?.patient_change || 0} />
              </div>
              <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Revenue (30d)</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary?.total_revenue || 0)}</p>
                <ChangeIndicator value={summary?.revenue_change || 0} />
              </div>
              <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Appointments</p>
                <p className="text-2xl font-bold text-gray-900">{summary?.total_appointments?.toLocaleString() || 0}</p>
                <p className="text-xs text-gray-500">{summary?.month_appointments || 0} this month</p>
              </div>
              <div className="w-11 h-11 bg-purple-50 rounded-xl flex items-center justify-center">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Departments</p>
                <p className="text-2xl font-bold text-gray-900">{deptStats.length}</p>
                <p className="text-xs text-gray-500">{deptStats.reduce((a, b) => a + b.staff, 0)} staff</p>
              </div>
              <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center">
                <Building2 className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-gray-100/80 p-1 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm">Overview</TabsTrigger>
          <TabsTrigger value="departments" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm">Departments</TabsTrigger>
          <TabsTrigger value="doctors" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm">Doctors</TabsTrigger>
          <TabsTrigger value="financial" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm">Financial</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card className="border-none shadow-sm">
            <CardHeader className="border-b border-gray-50 pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-indigo-500" />
                Monthly Trends (Current → 6 Months Ago)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              {monthlyTrends.length > 0 ? (
                <div className="space-y-5">
                  {[...monthlyTrends].reverse().map((data, index) => (
                    <div key={index} className="flex items-start gap-4 group">
                      <span className="w-14 text-sm font-semibold text-gray-600 pt-0.5 flex-shrink-0">{formatMonth(data.month)}</span>
                      <div className="flex-1 space-y-2.5">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400 w-20 flex-shrink-0">Patients</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-blue-400 to-blue-500 h-2.5 rounded-full transition-all duration-700"
                              style={{ width: `${Math.max(2, (data.patients / maxPatients) * 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700 w-12 text-right">{data.patients}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400 w-20 flex-shrink-0">Revenue</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-2.5 rounded-full transition-all duration-700"
                              style={{ width: `${Math.max(2, (data.revenue / maxRevenue) * 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700 w-12 text-right">
                            {formatCurrency(data.revenue)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400 w-20 flex-shrink-0">Appts</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-purple-400 to-purple-500 h-2.5 rounded-full transition-all duration-700"
                              style={{ width: `${Math.max(2, (data.appointments / maxAppts) * 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700 w-12 text-right">{data.appointments}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-400 py-8">No trend data available yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Departments Tab */}
        <TabsContent value="departments" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {deptStats.length > 0 ? deptStats.map((dept) => (
              <Card key={dept.id} className="border-none shadow-sm hover:shadow-md transition-all">
                <CardHeader className="pb-3 border-b border-gray-50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-indigo-500" />
                      {dept.name}
                    </CardTitle>
                    <Badge variant="secondary" className="text-[10px] bg-indigo-50 text-indigo-600 border-none">
                      {dept.staff} Staff
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-2 bg-blue-50/60 rounded-lg">
                      <p className="text-xl font-bold text-gray-900">{dept.patients}</p>
                      <p className="text-[10px] text-gray-500 font-medium uppercase mt-0.5">Patients</p>
                    </div>
                    <div className="p-2 bg-emerald-50/60 rounded-lg">
                      <p className="text-xl font-bold text-gray-900">{formatCurrency(dept.revenue)}</p>
                      <p className="text-[10px] text-gray-500 font-medium uppercase mt-0.5">Revenue</p>
                    </div>
                    <div className="p-2 bg-purple-50/60 rounded-lg">
                      <p className="text-xl font-bold text-gray-900">{totalDeptRevenue > 0 ? Math.round((dept.revenue / totalDeptRevenue) * 100) : 0}%</p>
                      <p className="text-[10px] text-gray-500 font-medium uppercase mt-0.5">Share</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <div className="col-span-2 text-center py-12 text-gray-400">
                <Building2 className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                No department statistics available
              </div>
            )}
          </div>
        </TabsContent>

        {/* Doctors Tab */}
        <TabsContent value="doctors" className="space-y-4">
          <Card className="border-none shadow-sm">
            <CardHeader className="border-b border-gray-50 pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-indigo-500" />
                Active Doctors
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {topDoctors.length > 0 ? (
                <div className="space-y-3">
                  {topDoctors.map((doctor, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50/70 hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{doctor.name}</p>
                          <p className="text-xs text-gray-500">{doctor.department || 'Unassigned'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{doctor.patients}</p>
                        <p className="text-[10px] text-gray-400 uppercase font-medium">Appointments</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Stethoscope className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  No doctor data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-4">
          <Card className="border-none shadow-sm">
            <CardHeader className="border-b border-gray-50 pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-500" />
                Financial Summary (All Time)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-6">
              {/* Grand Total */}
              <div className="text-center p-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl">
                <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider mb-1">Total Revenue</p>
                <p className="text-4xl font-bold text-gray-900">{formatCurrency(financial?.total_revenue || 0)}</p>
              </div>

              {/* Revenue Breakdown */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-700 text-sm">Revenue by Source</h4>
                {revenueBreakdown.map((item, idx) => {
                  const Icon = item.icon;
                  const pct = grandTotal > 0 ? Math.round((item.value / grandTotal) * 100) : 0;
                  return (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 ${item.color} bg-opacity-10 rounded-lg flex items-center justify-center`}>
                            <Icon className={`h-3.5 w-3.5 ${item.color.replace('bg-', 'text-')}`} />
                          </div>
                          <span className="text-sm font-medium text-gray-700">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-gray-900">{formatCurrency(item.value)}</span>
                          <Badge variant="secondary" className="text-[10px] bg-gray-100 text-gray-600 border-none min-w-[40px] justify-center">
                            {pct}%
                          </Badge>
                        </div>
                      </div>
                      <div className="bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`${item.color} h-2.5 rounded-full transition-all duration-700`}
                          style={{ width: `${Math.max(2, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
