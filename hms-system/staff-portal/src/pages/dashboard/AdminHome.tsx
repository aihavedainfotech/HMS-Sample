import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { io } from 'socket.io-client';
import {
  Users,
  UserCog,
  Bed,
  DollarSign,
  Calendar,
  Activity,
  Building2,
  RefreshCw,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Pill,
  FlaskConical,
} from 'lucide-react';

interface DashboardMetrics {
  total_staff: number;
  active_patients: number;
  occupied_beds: string;
  monthly_revenue: string;
}

interface TodayAppointments {
  total: number;
  completed: number;
  pending: number;
}

interface DeptOccupancy {
  name: string;
  patients: number;
  staff: number;
  occupancy: number;
}

interface RecentActivity {
  id: number;
  action: string;
  user: string;
  time: string;
  type: string;
}

export default function AdminHome() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [todayAppt, setTodayAppt] = useState<TodayAppointments>({ total: 0, completed: 0, pending: 0 });
  const [departments, setDepartments] = useState<DeptOccupancy[]>([]);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('hms_staff_token');
      if (!token) throw new Error('Authentication required');

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${API_URL}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      setMetrics(data.metrics);
      setTodayAppt(data.today_appointments || { total: 0, completed: 0, pending: 0 });
      setDepartments(data.department_occupancy);
      setActivities(data.recent_activity);
    } catch (err: any) {
      console.error('Error fetching admin dashboard:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const socketUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';
    const socket = io(socketUrl, {
      transports: ['websocket'],
      reconnection: true,
    });

    socket.on('connect', () => {
      console.log('Connected to WebSocket for admin metrics');
    });

    socket.on('admin_metrics_updated', () => {
      console.log('Admin metrics updated, fetching new data...');
      fetchDashboardData();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'patient': return <Users className="h-4 w-4" />;
      case 'staff': return <UserCog className="h-4 w-4" />;
      case 'lab': return <FlaskConical className="h-4 w-4" />;
      case 'pharmacy': return <Pill className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'patient': return 'bg-blue-50 text-blue-600';
      case 'staff': return 'bg-purple-50 text-purple-600';
      case 'lab': return 'bg-emerald-50 text-emerald-600';
      case 'pharmacy': return 'bg-amber-50 text-amber-600';
      default: return 'bg-gray-50 text-gray-600';
    }
  };

  const formatTime = (time: string) => {
    if (!time || time === 'Recently') return 'Recently';
    try {
      const d = new Date(time);
      const now = new Date();
      const diff = Math.floor((now.getTime() - d.getTime()) / 1000 / 60);
      if (diff < 1) return 'Just now';
      if (diff < 60) return `${diff}m ago`;
      if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
      return `${Math.floor(diff / 1440)}d ago`;
    } catch { return time; }
  };

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
        <p className="text-red-500 font-medium">{error}</p>
        <Button onClick={fetchDashboardData} variant="outline" className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  const statsCards = [
    {
      title: 'Total Staff',
      value: metrics?.total_staff || 0,
      icon: UserCog,
      color: 'from-indigo-500 to-indigo-600',
      bgLight: 'bg-indigo-50',
      textColor: 'text-indigo-600',
    },
    {
      title: 'Active Patients',
      value: metrics?.active_patients || 0,
      icon: Users,
      color: 'from-emerald-500 to-emerald-600',
      bgLight: 'bg-emerald-50',
      textColor: 'text-emerald-600',
    },
    {
      title: 'Occupied Beds',
      value: metrics?.occupied_beds || '0/0',
      icon: Bed,
      color: 'from-amber-500 to-amber-600',
      bgLight: 'bg-amber-50',
      textColor: 'text-amber-600',
    },
    {
      title: 'Monthly Revenue',
      value: metrics?.monthly_revenue || '$0',
      icon: DollarSign,
      color: 'from-purple-500 to-purple-600',
      bgLight: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Real-time overview of hospital operations</p>
        </div>
        <Button onClick={fetchDashboardData} variant="outline" size="sm" disabled={loading}
          className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat, index) => (
          <Card key={index} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-all duration-300 group">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{stat.title}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`w-11 h-11 ${stat.bgLight} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <stat.icon className={`h-5 w-5 ${stat.textColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Department Occupancy & Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-none shadow-sm">
          <CardHeader className="border-b border-gray-50 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-500" />
                Department Occupancy
              </CardTitle>
              <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-600 border-none">
                {departments.length} Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            {departments.length > 0 ? departments.map((dept, index) => (
              <div key={index} className="space-y-2 p-3 rounded-xl bg-gray-50/70 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-800 text-sm">{dept.name}</span>
                  <span className="text-xs text-gray-500">
                    {dept.patients} patients • {dept.staff} staff
                  </span>
                </div>
                <Progress value={dept.occupancy} className="h-2" />
                <div className="flex justify-between text-[11px] font-medium text-gray-400">
                  <span className="uppercase tracking-wider">Occupancy</span>
                  <span className={dept.occupancy > 85 ? 'text-red-500' : dept.occupancy > 60 ? 'text-amber-500' : 'text-emerald-500'}>
                    {dept.occupancy}%
                  </span>
                </div>
              </div>
            )) : (
              <p className="text-center text-gray-400 py-6 text-sm">No department data available</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b border-gray-50 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-500" />
              Recent Activity
            </CardTitle>
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 border-none">
              Live
            </Badge>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
              {activities.length > 0 ? activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className={`rounded-lg p-2 flex-shrink-0 ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{activity.action}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      <span className="font-medium text-gray-600">{activity.user}</span> • {formatTime(activity.time)}
                    </p>
                  </div>
                </div>
              )) : (
                <p className="text-center text-gray-400 py-6 text-sm">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Appointments, Beds, Departments */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        <Card className="border-none shadow-sm bg-gradient-to-br from-indigo-600 to-indigo-700 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-indigo-100 text-base">
              <Calendar className="h-5 w-5" />
              Today's Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-3">
              <p className="text-4xl font-bold">{todayAppt.total}</p>
              <p className="text-sm text-indigo-200 mt-1 font-medium">Scheduled today</p>
              <div className="flex justify-center gap-3 mt-4">
                <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-none gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {todayAppt.completed} Done
                </Badge>
                <Badge variant="secondary" className="bg-white/10 text-white hover:bg-white/20 border-none gap-1">
                  <Clock className="h-3 w-3" />
                  {todayAppt.pending} Pending
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-gray-700 text-base">
              <Bed className="h-5 w-5 text-amber-500" />
              Bed Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-3">
              <p className="text-4xl font-bold text-gray-900">
                {metrics ? (parseInt(metrics.occupied_beds.split('/')[1]) - parseInt(metrics.occupied_beds.split('/')[0])) || 0 : 0}
              </p>
              <p className="text-sm text-gray-500 mt-1 font-medium">Available beds</p>
              <div className="flex justify-center gap-3 mt-4">
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
                  <Bed className="h-3 w-3" />
                  {metrics?.occupied_beds.split('/')[0] || 0} Occupied
                </Badge>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {metrics?.occupied_beds.split('/')[1] || 0} Total
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-gray-700 text-base">
              <Building2 className="h-5 w-5 text-blue-500" />
              Departments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-3">
              <p className="text-4xl font-bold text-gray-900">{departments.length}</p>
              <p className="text-sm text-gray-500 mt-1 font-medium">Active departments</p>
              <div className="flex justify-center gap-3 mt-4">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1">
                  <UserCog className="h-3 w-3" />
                  {metrics?.total_staff || 0} Staff Total
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
