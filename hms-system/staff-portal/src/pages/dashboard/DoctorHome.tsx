import { useState, useEffect, useCallback } from 'react';
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
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Loader2,
  Zap,
  User,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import socket from '@/lib/socket';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

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

const StatCard = ({ title, value, icon: Icon, gradient, subValue, loading }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ scale: 1.02 }}
    transition={{ duration: 0.3 }}
  >
    <Card className={`overflow-hidden border-none shadow-lg relative group h-full`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5 group-hover:opacity-10 transition-opacity`} />
      <CardContent className="p-6 relative">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <div className="flex items-baseline gap-2">
              {loading ? (
                <Loader2 className="h-8 w-8 animate-spin text-slate-200" />
              ) : (
                <motion.h3
                  key={value}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-3xl font-bold tracking-tight text-slate-800"
                >
                  {value}
                </motion.h3>
              )}
              {subValue && (
                <span className="text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                  {subValue}
                </span>
              )}
            </div>
          </div>
          <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} text-white shadow-inner`}>
            <Icon size={24} />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-1 text-[10px] font-semibold text-slate-400">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          LIVE
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

export default function DoctorHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [metrics, setMetrics] = useState<QuickMetrics | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user?.staff_id) return;
    try {
      const token = localStorage.getItem('hms_staff_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const statsRes = await fetch(`${API_URL}/doctor/stats`, { headers });
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
        setMetrics(data.metrics);
      }

      const notifRes = await fetch(`${API_URL}/doctor/notifications`, { headers });
      if (notifRes.ok) {
        const data = await notifRes.json();
        setNotifications(data);
      }

      const aptRes = await fetch(`${API_URL}/doctor/queue/today?doctor_id=${user.staff_id}`, { headers });
      if (aptRes.ok) {
        const data = await aptRes.json();
        setTodayAppointments(Array.isArray(data) ? data.slice(0, 10) : []);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.staff_id]);

  useEffect(() => {
    if (user?.staff_id) fetchData();

    const onUpdate = (data: any) => {
      // If the update involves this specific doctor
      if (data && data.doctor_id && data.doctor_id !== user?.staff_id) return;
      fetchData();
      if (data && data.message) {
        toast.info(data.message);
      }
    };

    const onCriticalLab = (data: any) => {
      if (data && data.doctor_id === user?.staff_id) {
        toast.error(`CRITICAL RESULT: ${data.patient_name}`, {
          description: data.result_summary,
          duration: 10000,
        });
        fetchData();
      }
    };

    socket.on('appointment_approved', onUpdate);
    socket.on('queue_status_updated', onUpdate);
    socket.on('new_appointment', onUpdate);
    socket.on('consultation_completed', onUpdate);
    socket.on('patient_called', onUpdate);
    socket.on('diagnosis_written', onUpdate);
    socket.on('critical_lab_result', onCriticalLab);

    return () => {
      socket.off('appointment_approved', onUpdate);
      socket.off('queue_status_updated', onUpdate);
      socket.off('new_appointment', onUpdate);
      socket.off('consultation_completed', onUpdate);
      socket.off('patient_called', onUpdate);
      socket.off('diagnosis_written', onUpdate);
      socket.off('critical_lab_result', onCriticalLab);
    };
  }, [user?.staff_id, fetchData]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return <Badge className="bg-emerald-50 text-emerald-600 border-none px-3">Completed</Badge>;
      case 'In_Progress':
        return <Badge className="bg-blue-50 text-blue-600 border-none px-3">In Progress</Badge>;
      case 'Waiting':
        return <Badge className="bg-amber-50 text-amber-600 border-none px-3">Waiting</Badge>;
      case 'Confirmed':
        return <Badge className="bg-indigo-50 text-indigo-600 border-none px-3">Confirmed</Badge>;
      case 'Visited':
        return <Badge className="bg-teal-50 text-teal-600 border-none px-3">Arrived</Badge>;
      case 'Cancelled':
        return <Badge className="bg-rose-50 text-rose-600 border-none px-3">Cancelled</Badge>;
      default:
        return <Badge variant="secondary" className="px-3">{status.replace('_', ' ')}</Badge>;
    }
  };

  const statCards = [
    {
      title: "Today's Appointments",
      value: stats?.today_appointments || 0,
      icon: Calendar,
      gradient: 'from-blue-600 to-indigo-600',
      subValue: 'Assigned'
    },
    {
      title: 'Pending Consultations',
      value: stats?.pending_consultations || 0,
      icon: Users,
      gradient: 'from-amber-400 to-orange-500',
      subValue: 'Active'
    },
    {
      title: 'Completed',
      value: stats?.completed_consultations || 0,
      icon: CheckCircle2,
      gradient: 'from-emerald-500 to-teal-600',
      subValue: 'Today'
    },
    {
      title: 'Emergency',
      value: stats?.emergency_consultations || 0,
      icon: AlertTriangle,
      gradient: 'from-rose-500 to-pink-600',
      subValue: 'Priority'
    },
  ];

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-slate-500 font-medium animate-pulse">Initializing Medical Portal...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-bold text-sm tracking-wide uppercase">
            <ShieldCheck size={16} />
            Secure Physician Dashboard
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Dr. {user?.name}</h1>
          <p className="text-slate-500 font-medium text-lg">Hospital management and patient care console.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="outline" className="h-12 px-6 gap-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50" onClick={fetchData}>
            <Activity size={18} />
            Refresh Data
          </Button>
          <Button className="h-12 px-8 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 gap-2 font-bold text-base" onClick={() => navigate('/doctor/profile')}>
            <User size={20} />
            My Info
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <StatCard
            key={index}
            {...stat}
            loading={loading}
          />
        ))}
      </div>

      <div className="grid xl:grid-cols-3 gap-8">
        {/* Appointments List */}
        <Card className="xl:col-span-2 border-none shadow-xl bg-white/50 backdrop-blur-sm overflow-hidden flex flex-col h-[600px]">
          <CardHeader className="border-b bg-white/80 sticky top-0 z-10 p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Clock className="text-blue-500" size={20} />
                Today's Appointments
                {todayAppointments.length > 0 && (
                  <Badge className="bg-blue-500">{todayAppointments.length}</Badge>
                )}
              </CardTitle>
              <Link to="/doctor/appointments" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                View Full Schedule
                <ChevronRight size={14} />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto custom-scrollbar">
            {todayAppointments.length > 0 ? (
              <div className="divide-y divide-slate-100">
                <AnimatePresence mode="popLayout">
                  {todayAppointments.map((apt) => (
                    <motion.div
                      key={apt.appointment_id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/doctor/consultation?appointment_id=${apt.appointment_id}&patient_id=${apt.patient_id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 border-2 border-white shadow-sm ring-1 ring-slate-100">
                          <AvatarFallback className="bg-blue-50 text-blue-600 font-bold">
                            {apt.patient_name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                          <p className="font-bold text-slate-800 group-hover:text-primary transition-colors">
                            {apt.patient_name}
                          </p>
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                            <span className="flex items-center gap-1"><Clock size={12} /> {apt.time_slot || apt.appointment_time}</span>
                            <span>•</span>
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-wider">{apt.appointment_type}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Token</span>
                          <span className="text-sm font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                            {apt.token_number || '---'}
                          </span>
                        </div>
                        {getStatusBadge(apt.status)}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-12 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <Calendar className="text-slate-300" size={40} />
                </div>
                <h4 className="text-lg font-bold text-slate-800">No Appointments</h4>
                <p className="text-slate-400 font-medium max-w-[200px] mt-1">Your schedule is currently clear for today.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar: Notifications & Metrics */}
        <div className="space-y-8">
          <Card className="flex flex-col shadow-xl bg-slate-900 border-none text-white h-[350px]">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-blue-400" />
                  Live Alerts
                </div>
                {notifications.length > 0 && (
                  <Badge className="bg-blue-500 animate-pulse">{notifications.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full p-6 pt-2">
                {notifications.length > 0 ? (
                  <div className="space-y-4">
                    {notifications.map((notif) => (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`p-4 rounded-2xl border-l-4 overflow-hidden relative group transition-all hover:bg-white/5 ${notif.priority === 'critical' ? 'border-rose-500 bg-rose-500/10' : 'border-blue-500 bg-blue-500/10'
                          }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className={`text-xs font-black uppercase tracking-wider ${notif.priority === 'critical' ? 'text-rose-400' : 'text-blue-400'
                            }`}>
                            {notif.priority === 'critical' ? 'Emergency' : 'Information'}
                          </h4>
                          <span className="text-[10px] font-bold text-slate-500">
                            {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-300 leading-snug">{notif.message}</p>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <Bell className="w-12 h-12 text-slate-800 mb-2 opacity-20" />
                    <p className="text-sm text-slate-500 font-medium">Clear for now</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="shadow-xl bg-white border-none overflow-hidden">
            <CardHeader className="p-6 border-b bg-slate-50/50">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-2 text-sm text-slate-500 font-semibold">
                    <Clock size={14} className="text-blue-500" />
                    Avg. Consult Time
                  </div>
                  <Badge variant="outline" className="font-bold border-slate-200">
                    {metrics?.avg_consultation_time || '15 min'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <div className="flex items-center gap-2 text-sm text-slate-700 font-bold">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    Patient Satisfaction
                  </div>
                  <span className="font-black text-emerald-600 flex items-center gap-1">
                    {metrics?.patient_satisfaction || '4.9/5.0'}
                    <Activity className="w-3 h-3 animate-pulse" />
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-2 text-sm text-slate-500 font-semibold">
                    <Zap size={14} className="text-amber-500" />
                    Pending Lab Review
                  </div>
                  <span className="font-bold text-slate-700">{stats?.pending_lab_results || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
