import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Calendar,
  Users,
  Activity,
  TrendingUp,
  ChevronRight,
  Bell,
  AlertTriangle,
  Stethoscope,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface DashboardStats {
  today_appointments: number;
  pending_consultations: number;
  completed_consultations: number;
  emergency_consultations: number;
  pending_lab_results: number;
  follow_up_due: number;
}

interface QuickMetrics {
  avg_consultation_time: string;
  patient_satisfaction: string;
  pending_approvals: number;
  critical_lab_values: number;
}

interface Notification {
  id: string;
  type: string;
  message: string;
  priority: string;
  timestamp: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function DoctorHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [metrics, setMetrics] = useState<QuickMetrics | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('hms_staff_token');
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        // Fetch Stats
        const statsRes = await fetch(`${API_URL}/doctor/stats`, { headers });
        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data.stats);
          setMetrics(data.metrics);
        }

        // Fetch Notifications
        const notifRes = await fetch(`${API_URL}/doctor/notifications`, { headers });
        if (notifRes.ok) {
          const data = await notifRes.json();
          setNotifications(data);
        }

        // Fetch Today's Appointments (Limit 5)
        const today = new Date().toISOString().split('T')[0];
        const aptRes = await fetch(`${API_URL}/appointments?doctor_id=${user?.staff_id}&date_from=${today}&date_to=${today}`, { headers });
        if (aptRes.ok) {
          const data = await aptRes.json();
          setTodayAppointments(data.slice(0, 5));
        }

      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.staff_id) {
      fetchData();
      const interval = setInterval(fetchData, 5000); // Poll every 5 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'In_Progress':
        return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case 'Waiting':
        return <Badge className="bg-amber-100 text-amber-800">Waiting</Badge>;
      case 'Confirmed':
        return <Badge className="bg-indigo-100 text-indigo-800">Confirmed</Badge>;
      case 'Cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      case 'Pending_Approval':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'Visited':
        return <Badge className="bg-teal-100 text-teal-800">Arrived</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const statCards = [
    {
      title: "Today's Appointments",
      value: stats?.today_appointments || 0,
      icon: Calendar,
      color: 'bg-blue-500'
    },
    {
      title: 'Pending Consultations',
      value: stats?.pending_consultations || 0,
      icon: Users,
      color: 'bg-amber-500'
    },
    {
      title: 'Completed',
      value: stats?.completed_consultations || 0,
      icon: CheckCircle2,
      color: 'bg-green-500'
    },
    {
      title: 'Emergency',
      value: stats?.emergency_consultations || 0,
      icon: AlertTriangle,
      color: 'bg-red-500'
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Doctor Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, Dr. {user?.name}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/doctor/consultation')} className="bg-blue-600 hover:bg-blue-700 shadow-md transition-all hover:shadow-lg">
            <Stethoscope className="mr-2 h-4 w-4" /> Start Consultation
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{loading ? '-' : stat.value}</p>
                </div>
                <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center shadow-sm`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Today's Appointments */}
        <Card className="md:col-span-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
            <CardTitle>Today's Appointments</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/doctor/appointments')}>
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg" />)}
              </div>
            ) : todayAppointments.length > 0 ? (
              <div className="space-y-3">
                {todayAppointments.map((apt) => (
                  <div
                    key={apt.appointment_id}
                    className="flex items-center justify-between p-4 bg-slate-50/50 border rounded-lg hover:bg-slate-100/80 transition-all cursor-pointer group"
                    onClick={() => navigate(`/doctor/appointments`)}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {apt.patient_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-gray-900 group-hover:text-primary transition-colors">
                          {apt.patient_name}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <span>{apt.time_slot || apt.appointment_time}</span>
                          <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                          <span>{apt.appointment_type}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <span className="text-xs font-medium text-muted-foreground block uppercase tracking-wider mb-0.5">Token</span>
                        <span className="text-sm font-semibold flex items-center justify-end">
                          {apt.token_number}
                        </span>
                      </div>
                      {getStatusBadge(apt.status)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed">
                <Calendar className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">No appointments scheduled for today.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications & Quick Metrics */}
        <div className="space-y-6">
          <Card className="h-[350px] flex flex-col shadow-sm">
            <CardHeader className="border-b pb-4">
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-indigo-500" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full p-4">
                {notifications.length > 0 ? (
                  <div className="space-y-3">
                    {notifications.map((notif) => (
                      <div key={notif.id} className={`p-4 rounded-lg border-l-4 shadow-sm ${notif.priority === 'critical'
                        ? 'border-red-500 bg-red-50'
                        : 'border-blue-500 bg-blue-50'
                        }`}>
                        <div className="flex justify-between items-start mb-1">
                          <h4 className={`text-sm font-semibold ${notif.priority === 'critical' ? 'text-red-700' : 'text-blue-700'
                            }`}>
                            {notif.type === 'patient_waiting' ? 'Patient Waiting' : 'Critical Alert'}
                          </h4>
                          <span className="text-[10px] text-muted-foreground bg-white/50 px-1.5 py-0.5 rounded">
                            {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 leading-snug">{notif.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <Bell className="w-8 h-8 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">No new notifications</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="border-b pb-4">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center group">
                  <span className="text-sm text-muted-foreground group-hover:text-gray-900 transition-colors">Avg. Consult Time</span>
                  <Badge variant="outline" className="font-mono">{metrics?.avg_consultation_time || '-'}</Badge>
                </div>
                <div className="flex justify-between items-center group">
                  <span className="text-sm text-muted-foreground group-hover:text-gray-900 transition-colors">Patient Satisfaction</span>
                  <span className="font-medium text-green-600 flex items-center gap-1">
                    {metrics?.patient_satisfaction || '-'}
                    <Activity className="w-3 h-3" />
                  </span>
                </div>
                <div className="flex justify-between items-center group">
                  <span className="text-sm text-muted-foreground group-hover:text-gray-900 transition-colors">Pending Approvals</span>
                  <span className="font-medium text-amber-600">{metrics?.pending_approvals || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
