import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import socket from '@/lib/socket';
import {
  Users,
  DollarSign,
  FileText,
  TrendingUp,
  Search,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  QrCode,
  BarChart3,
  Building2,
  Receipt,
  PiggyBank,
  Loader2,
  RefreshCw,
  CreditCard,
  Shield,
  Sparkles,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface DashboardStats {
  total_patients: number;
  today_patients: number;
  today_revenue: number;
  yesterday_revenue: number;
  revenue_change: number;
  ops_capacity: number;
  pending_bills_count: number;
  pending_bills_amount: number;
  today_collections_count: number;
}

interface RevenueBreakdown {
  cash: number;
  card: number;
  upi: number;
  insurance: number;
}

interface Activity {
  action: string;
  user_name: string;
  amount: string;
  timestamp: string;
  status: string;
}

interface DashboardData {
  statistics: DashboardStats;
  revenue_breakdown: RevenueBreakdown;
  recent_activities: Activity[];
}

export default function BillingHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('today');
  const [hoveredStat, setHoveredStat] = useState<number | null>(null);

  const fetchDashboard = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      const token = localStorage.getItem('hms_staff_token');
      const response = await fetch(`${API_URL}/dashboard/billing`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
      setError('');
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(() => fetchDashboard(), 30000);
    const handleUpdate = () => { fetchDashboard(); };
    socket.on('dashboard_fee_collected', handleUpdate);
    socket.on('billing:dashboard_updated', handleUpdate);
    return () => {
      clearInterval(interval);
      socket.off('dashboard_fee_collected', handleUpdate);
      socket.off('billing:dashboard_updated', handleUpdate);
    };
  }, [fetchDashboard]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
      completed: { variant: 'default', icon: CheckCircle },
      pending: { variant: 'secondary', icon: Clock },
      processing: { variant: 'outline', icon: AlertCircle },
    };
    const config = variants[status] || { variant: 'outline', icon: Clock };
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <config.icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const formatTimeAgo = (timestamp: string) => {
    if (!timestamp) return 'Recently';
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const quickActions = [
    {
      title: 'View Bills',
      description: 'Manage all patient bills',
      icon: Receipt,
      color: 'from-blue-500 to-blue-600',
      action: () => navigate('/billing/billing'),
    },
    {
      title: 'Payments',
      description: 'Track payment transactions',
      icon: CreditCard,
      color: 'from-green-500 to-emerald-600',
      action: () => navigate('/billing/payments'),
    },
    {
      title: 'Insurance',
      description: 'Manage insurance claims',
      icon: Shield,
      color: 'from-purple-500 to-violet-600',
      action: () => navigate('/billing/insurance'),
    },
    {
      title: 'AI Insights',
      description: 'Predictions & analytics',
      icon: Sparkles,
      color: 'from-orange-500 to-amber-600',
      action: () => navigate('/billing/ai-prediction'),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <span className="mt-3 block text-sm text-gray-500">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <p className="text-red-600 font-medium">{error}</p>
        <Button onClick={() => fetchDashboard()} className="rounded-xl">Retry</Button>
      </div>
    );
  }

  const stats = data?.statistics;
  const breakdown = data?.revenue_breakdown;
  const activities = data?.recent_activities || [];

  const totalRevBreakdown = (breakdown?.cash || 0) + (breakdown?.card || 0) + (breakdown?.upi || 0) + (breakdown?.insurance || 0);

  const revenueItems = [
    { label: 'Cash', value: breakdown?.cash || 0, color: 'bg-green-500', textColor: 'text-green-600' },
    { label: 'Card', value: breakdown?.card || 0, color: 'bg-blue-500', textColor: 'text-blue-600' },
    { label: 'UPI', value: breakdown?.upi || 0, color: 'bg-purple-500', textColor: 'text-purple-600' },
    { label: 'Insurance', value: breakdown?.insurance || 0, color: 'bg-amber-500', textColor: 'text-amber-600' },
  ];

  const statsCards = [
    {
      title: 'Total Patients',
      value: stats?.total_patients?.toString() || '0',
      change: `+${stats?.today_patients || 0} today`,
      trend: (stats?.today_patients || 0) > 0 ? 'up' : 'neutral',
      icon: Users,
      gradient: 'from-blue-500 to-blue-600',
      bgLight: 'bg-blue-50',
      clickPath: '/billing/patients',
    },
    {
      title: 'Today\'s Revenue',
      value: `₹${(stats?.today_revenue || 0).toLocaleString()}`,
      change: `${(stats?.revenue_change || 0) >= 0 ? '+' : ''}${stats?.revenue_change || 0}%`,
      trend: (stats?.revenue_change || 0) >= 0 ? 'up' : 'down',
      icon: DollarSign,
      gradient: 'from-green-500 to-emerald-600',
      bgLight: 'bg-green-50',
      clickPath: '/billing/payments',
    },
    {
      title: 'Ops Capacity',
      value: `${stats?.ops_capacity || 0}%`,
      change: `${stats?.ops_capacity || 0}% utilized`,
      trend: 'up',
      icon: TrendingUp,
      gradient: 'from-purple-500 to-violet-600',
      bgLight: 'bg-purple-50',
      clickPath: '/billing/ai-prediction',
    },
    {
      title: 'Pending Bills',
      value: stats?.pending_bills_count?.toString() || '0',
      change: `₹${(stats?.pending_bills_amount || 0).toLocaleString()}`,
      trend: (stats?.pending_bills_count || 0) > 0 ? 'down' : 'up',
      icon: FileText,
      gradient: 'from-amber-500 to-orange-600',
      bgLight: 'bg-amber-50',
      clickPath: '/billing/billing',
    },
  ];

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes countUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .stat-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; }
        .stat-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.1); }
        .stat-value { animation: countUp 0.5s ease-out; }
        .quick-action-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; }
        .quick-action-card:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 8px 32px rgba(0,0,0,0.08); }
        .revenue-bar { transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1); }
        .activity-row { transition: all 0.2s ease; }
        .activity-row:hover { transform: translateX(4px); background: rgba(59,130,246,0.04); }
      `}</style>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome Back, <span className="text-blue-600">{user?.name?.split(' ')[0] || 'User'}</span> 👋
          </h1>
          <p className="text-gray-500 mt-1">Here's what's happening with your billing today.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Date range toggle */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1">
            {(['today', 'week', 'month'] as const).map(range => (
              <button
                key={range}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${dateRange === range
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                  }`}
                onClick={() => { setDateRange(range); fetchDashboard(true); }}
              >
                {range === 'today' ? 'Today' : range === 'week' ? 'This Week' : 'This Month'}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDashboard(true)}
            disabled={refreshing}
            className="rounded-xl"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat, index) => (
          <Card
            key={index}
            className="stat-card border-0 shadow-sm overflow-hidden"
            onClick={() => navigate(stat.clickPath)}
            onMouseEnter={() => setHoveredStat(index)}
            onMouseLeave={() => setHoveredStat(null)}
          >
            <CardContent className="p-5 relative">
              {/* Background decoration */}
              <div className={`absolute -top-6 -right-6 w-24 h-24 ${stat.bgLight} rounded-full opacity-60 transition-transform ${hoveredStat === index ? 'scale-150' : 'scale-100'}`} />

              <div className="flex items-start justify-between relative z-10">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{stat.title}</p>
                  <p className="stat-value text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    {stat.trend === 'up' && (
                      <span className="flex items-center gap-0.5 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        <ArrowUpRight className="h-3 w-3" />
                        {stat.change}
                      </span>
                    )}
                    {stat.trend === 'down' && (
                      <span className="flex items-center gap-0.5 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                        <ArrowDownRight className="h-3 w-3" />
                        {stat.change}
                      </span>
                    )}
                    {stat.trend === 'neutral' && (
                      <span className="text-xs text-gray-500">{stat.change}</span>
                    )}
                  </div>
                </div>
                <div className={`w-11 h-11 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center shadow-sm`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-5 w-5 text-blue-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {quickActions.map((action, index) => (
                <div
                  key={index}
                  className="quick-action-card p-4 rounded-xl border border-gray-100 hover:border-gray-200"
                  onClick={action.action}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 bg-gradient-to-br ${action.color} rounded-xl flex items-center justify-center shadow-sm`}>
                      <action.icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-gray-900">{action.title}</h3>
                      <p className="text-xs text-gray-500">{action.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Revenue Overview */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <PiggyBank className="h-5 w-5 text-green-600" />
              Revenue Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              <div className="text-center py-3">
                <p className="text-3xl font-bold text-gray-900">₹{(stats?.today_revenue || 0).toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">Total Revenue Today</p>
                <div className="flex justify-center gap-2 mt-3">
                  <Badge variant="outline" className={`text-xs ${(stats?.revenue_change || 0) >= 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    {(stats?.revenue_change || 0) >= 0 ? (
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 mr-1" />
                    )}
                    {Math.abs(stats?.revenue_change || 0)}% from yesterday
                  </Badge>
                </div>
              </div>

              {/* Revenue Bar Breakdown */}
              <div className="space-y-3">
                {revenueItems.map((item) => {
                  const pct = totalRevBreakdown > 0 ? (item.value / totalRevBreakdown * 100) : 0;
                  return (
                    <div key={item.label} className="group">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-gray-500 font-medium">{item.label}</span>
                        <span className={`font-semibold ${item.textColor}`}>₹{item.value.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`revenue-bar ${item.color} h-full rounded-full group-hover:opacity-80`}
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5 text-blue-600" />
            Recent Activity
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 text-xs" onClick={() => navigate('/billing/payments')}>
            View All →
          </Button>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Clock className="h-7 w-7 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">No recent activity</p>
              <p className="text-xs text-gray-400 mt-1">Transactions will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activities.map((activity, index) => (
                <div key={index} className="activity-row flex items-center justify-between p-3 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${activity.status === 'completed' ? 'bg-green-100' :
                        activity.status === 'pending' ? 'bg-amber-100' : 'bg-blue-100'
                      }`}>
                      {activity.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                      {activity.status === 'pending' && <Clock className="h-4 w-4 text-amber-600" />}
                      {activity.status === 'processing' && <AlertCircle className="h-4 w-4 text-blue-600" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {activity.action === 'payment_received' ? 'Payment received' :
                          activity.action === 'bill_generated' ? 'Bill generated' :
                            activity.action}
                      </p>
                      <p className="text-xs text-gray-400">
                        {activity.user_name} • {formatTimeAgo(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm text-gray-900">{activity.amount}</span>
                    {getStatusBadge(activity.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
