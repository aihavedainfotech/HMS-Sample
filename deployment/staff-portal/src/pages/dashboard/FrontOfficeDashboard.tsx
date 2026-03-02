import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Calendar,
  IndianRupee,
  TrendingUp,
  Clock,
  Activity,
  ArrowUp,
  ArrowDown,
  Phone,
  Mail,
  Eye,
  Download
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface DashboardStats {
  todayRegistrations: number;
  todayAppointments: number;
  pendingPayments: number;
  todayRevenue: number;
  totalPatients: number;
  waitingQueue: number;
  weeklyRegistrations: number;
  weeklyAppointments: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
}

interface RecentActivity {
  id: string;
  type: 'registration' | 'appointment' | 'payment';
  patientName: string;
  description: string;
  timestamp: string;
  amount?: number;
}

interface QuickStats {
  label: string;
  value: string | number;
  change: number;
  icon: any;
  color: string;
}

export default function FrontOfficeDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    todayRegistrations: 0,
    todayAppointments: 0,
    pendingPayments: 0,
    todayRevenue: 0,
    totalPatients: 0,
    waitingQueue: 0,
    weeklyRegistrations: 0,
    weeklyAppointments: 0,
    weeklyRevenue: 0,
    monthlyRevenue: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const response = await fetch(`${API_URL}/dashboard/front-office`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        toast.error('Failed to load dashboard data');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const response = await fetch(`${API_URL}/front-office/recent-activity`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setRecentActivity(data);
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const quickStats: QuickStats[] = [
    {
      label: 'Today\'s Registrations',
      value: stats.todayRegistrations,
      change: 12,
      icon: Users,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Today\'s Appointments',
      value: stats.todayAppointments,
      change: 8,
      icon: Calendar,
      color: 'text-green-600 bg-green-50',
    },
    {
      label: 'Pending Payments',
      value: stats.pendingPayments,
      change: -5,
      icon: IndianRupee,
      color: 'text-orange-600 bg-orange-50',
    },
    {
      label: 'Today\'s Revenue',
      value: `₹${stats.todayRevenue.toLocaleString()}`,
      change: 15,
      icon: TrendingUp,
      color: 'text-purple-600 bg-purple-50',
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'registration':
        return <Users className="w-4 h-4 text-blue-600" />;
      case 'appointment':
        return <Calendar className="w-4 h-4 text-green-600" />;
      case 'payment':
        return <IndianRupee className="w-4 h-4 text-purple-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'registration':
        return 'bg-blue-50 border-blue-200';
      case 'appointment':
        return 'bg-green-50 border-green-200';
      case 'payment':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Front Office Dashboard</h1>
          <p className="text-gray-500">Manage patient registrations, appointments, and payments</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => window.print()}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button onClick={fetchDashboardData}>
            <Activity className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="relative overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                    <div className="flex items-center mt-2">
                      {stat.change > 0 ? (
                        <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
                      ) : (
                        <ArrowDown className="w-4 h-4 text-red-500 mr-1" />
                      )}
                      <span className={`text-sm ${stat.change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {Math.abs(stat.change)}% from yesterday
                      </span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Overview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Weekly Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-900">{stats.weeklyRegistrations}</p>
                <p className="text-sm text-blue-600">Weekly Registrations</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-900">{stats.weeklyAppointments}</p>
                <p className="text-sm text-green-600">Weekly Appointments</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-900">₹{stats.weeklyRevenue.toLocaleString()}</p>
                <p className="text-sm text-purple-600">Weekly Revenue</p>
              </div>
            </div>
            
            {/* Simple Chart Placeholder */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-end justify-between h-32">
                {[65, 80, 45, 90, 70, 85, 95].map((height, index) => (
                  <div
                    key={index}
                    className="w-8 bg-blue-200 rounded-t"
                    style={{ height: `${height}%` }}
                  ></div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <Users className="w-4 h-4 mr-3" />
              New Patient Registration
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Calendar className="w-4 h-4 mr-3" />
              Book Appointment
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <IndianRupee className="w-4 h-4 mr-3" />
              Collect Payment
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Eye className="w-4 h-4 mr-3" />
              Patient Records
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Activity
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchRecentActivity}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No recent activity</p>
              </div>
            ) : (
              recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${getActivityColor(
                    activity.type
                  )}`}
                >
                  <div className="flex items-center gap-3">
                    {getActivityIcon(activity.type)}
                    <div>
                      <p className="font-medium text-gray-900">{activity.patientName}</p>
                      <p className="text-sm text-gray-600">{activity.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {activity.amount && (
                      <p className="font-medium text-gray-900">₹{activity.amount}</p>
                    )}
                    <p className="text-xs text-gray-500">{activity.timestamp}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="w-8 h-8 text-blue-600 mx-auto mb-3" />
            <p className="text-2xl font-bold text-gray-900">{stats.totalPatients}</p>
            <p className="text-sm text-gray-600">Total Patients</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="w-8 h-8 text-orange-600 mx-auto mb-3" />
            <p className="text-2xl font-bold text-gray-900">{stats.waitingQueue}</p>
            <p className="text-sm text-gray-600">Waiting Queue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <IndianRupee className="w-8 h-8 text-green-600 mx-auto mb-3" />
            <p className="text-2xl font-bold text-gray-900">₹{stats.monthlyRevenue.toLocaleString()}</p>
            <p className="text-sm text-gray-600">Monthly Revenue</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
