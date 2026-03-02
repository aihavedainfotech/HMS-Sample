import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import {
  Users,
  Calendar,
  Clock,
  IndianRupee,
  TrendingUp,
  ArrowRight,
  Loader2,
  Check,
  X,
  Bell,
  Activity,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import socket from '@/lib/socket';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface DashboardStats {
  today_registrations: number;
  today_appointments: number;
  pending_approvals: number;
  waiting_queue: number;
  today_revenue: number;
}

interface RecentActivity {
  type: 'registration' | 'appointment' | 'fee';
  reference_id: string;
  activity: string;
  timestamp: string;
}

interface Appointment {
  appointment_id: string;
  patient_id: string;
  patient_name: string;
  appointment_date: string;
  appointment_time: string;
  doctor_name: string;
  status: string;
  token_number: string;
  appointment_type: string;
  booking_time: string;
}

const StatCard = ({ title, value, icon: Icon, gradient, subValue }: any) => (
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
              <motion.h3
                key={value}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-3xl font-bold tracking-tight text-slate-800"
              >
                {typeof value === 'number' && title.includes('Revenue') ? `₹${value.toLocaleString()}` : value}
              </motion.h3>
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
          LIVE UPDATES
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

export default function ReceptionistHomeRealtime() {
  const [stats, setStats] = useState<DashboardStats>({
    today_registrations: 0,
    today_appointments: 0,
    pending_approvals: 0,
    waiting_queue: 0,
    today_revenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  const fetchDashboardData = useCallback(async () => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/dashboard/receptionist`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setStats(data.statistics);
        setRecentActivities(data.recent_activities.slice(0, 6));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    const onPatientRegistered = (data: any) => {
      setStats((prev) => ({ ...prev, today_registrations: prev.today_registrations + 1 }));
      setRecentActivities((prev: RecentActivity[]) => {
        const item: RecentActivity = {
          type: 'registration',
          reference_id: data.patient_id,
          activity: `New patient: ${data.patient_name}`,
          timestamp: data.timestamp,
        };
        return [item, ...prev].slice(0, 6);
      });
      toast.success(`New registration: ${data.patient_name}`, { icon: <Users size={16} /> });
    };

    const onFeeCollected = (data: any) => {
      setStats((prev) => ({ ...prev, today_revenue: prev.today_revenue + data.amount }));
      setRecentActivities((prev: RecentActivity[]) => {
        const item: RecentActivity = {
          type: 'fee',
          reference_id: `fee-${Date.now()}`,
          activity: `Payment of ₹${data.amount} received`,
          timestamp: data.timestamp,
        };
        return [item, ...prev].slice(0, 6);
      });
    };

    const onAppointmentApproved = (data: any) => {
      setStats((prev) => ({
        ...prev,
        today_appointments: prev.today_appointments + 1,
        pending_approvals: Math.max(0, prev.pending_approvals - 1),
        waiting_queue: prev.waiting_queue + 1,
      }));
      const q = data.queue_item;
      setRecentActivities((prev: RecentActivity[]) => {
        const item: RecentActivity = {
          type: 'appointment',
          reference_id: q.appointment_id,
          activity: `Approved: ${q.patient_name} (Token: ${q.token_number})`,
          timestamp: data.timestamp,
        };
        return [item, ...prev].slice(0, 6);
      });
    };

    const onNewAppointment = (data: any) => {
      if (data.status === 'Pending_Approval') {
        setStats(prev => ({ ...prev, pending_approvals: prev.pending_approvals + 1 }));
        setRecentActivities((prev: RecentActivity[]) => {
          const item: RecentActivity = {
            type: 'appointment',
            reference_id: data.appointment_id,
            activity: `New request: ${data.appointment_date} @ ${data.appointment_time}`,
            timestamp: new Date().toISOString(),
          };
          return [item, ...prev].slice(0, 6);
        });
        toast.info("New appointment request", { duration: 5000 });
      }
    };

    socket.on('dashboard_patient_registered', onPatientRegistered);
    socket.on('dashboard_fee_collected', onFeeCollected);
    socket.on('appointment_approved', onAppointmentApproved);
    socket.on('new_appointment', onNewAppointment);

    return () => {
      socket.off('dashboard_patient_registered', onPatientRegistered);
      socket.off('dashboard_fee_collected', onFeeCollected);
      socket.off('appointment_approved', onAppointmentApproved);
      socket.off('new_appointment', onNewAppointment);
    };
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-slate-500 font-medium animate-pulse">Initializing Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-bold text-sm tracking-wide uppercase">
            <Activity size={16} />
            Live Reception Management
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Hospital Overview</h1>
          <p className="text-slate-500 font-medium text-lg">Real-time status of registrations, appointments, and flow.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="hidden md:flex gap-2 border-slate-200" onClick={fetchDashboardData}>
            <TrendingUp size={16} />
            Refresh Data
          </Button>
          <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 gap-2" asChild>
            <Link to="/receptionist/registration">
              <Plus size={18} />
              Register Patient
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        <StatCard
          title="Registrations"
          value={stats.today_registrations}
          icon={Users}
          gradient="from-blue-600 to-indigo-600"
          subValue="Today"
        />
        <StatCard
          title="Appointments"
          value={stats.today_appointments}
          icon={Calendar}
          gradient="from-emerald-500 to-teal-600"
          subValue="Live"
        />
        <StatCard
          title="Pending Requests"
          value={stats.pending_approvals}
          icon={Clock}
          gradient="from-amber-400 to-orange-500"
          subValue="Action Needed"
        />
        <StatCard
          title="Waiting Queue"
          value={stats.waiting_queue}
          icon={TrendingUp}
          gradient="from-fuchsia-500 to-purple-600"
          subValue="Patients"
        />
        <StatCard
          title="Today's Revenue"
          value={stats.today_revenue}
          icon={IndianRupee}
          gradient="from-rose-500 to-pink-600"
        />
      </div>

      <div className="grid xl:grid-cols-3 gap-8">
        {/* Left Column - Real-time Lists */}
        <div className="xl:col-span-2 space-y-8">
          <div className="grid lg:grid-cols-2 gap-8">
            <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm overflow-hidden flex flex-col h-[500px]">
              <CardHeader className="border-b bg-white/80 sticky top-0 z-10 p-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Clock className="text-amber-500" size={20} />
                    Pending Requests
                    {stats.pending_approvals > 0 && (
                      <Badge className="bg-amber-500 animate-pulse">{stats.pending_approvals}</Badge>
                    )}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-y-auto custom-scrollbar">
                <PendingAppointmentsList />
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm overflow-hidden flex flex-col h-[500px]">
              <CardHeader className="border-b bg-white/80 sticky top-0 z-10 p-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Activity className="text-emerald-500" size={20} />
                    Active Flow
                  </CardTitle>
                  <Link to="/receptionist/appointments" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                    View Full
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-y-auto custom-scrollbar">
                <TodayAppointmentsList />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column - Activity & Actions */}
        <div className="space-y-8">
          <Card className="border-none shadow-xl bg-slate-900 text-white overflow-hidden">
            <CardHeader className="p-6">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Bell className="text-blue-400" size={22} />
                Recent Activities
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="space-y-6">
                <AnimatePresence mode="popLayout" initial={false}>
                  {recentActivities.length === 0 ? (
                    <motion.p key="empty" className="text-slate-400 text-sm">No recent activity detected.</motion.p>
                  ) : (
                    recentActivities.map((activity, idx) => (
                      <motion.div
                        key={activity.reference_id + idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="flex items-start gap-4"
                      >
                        <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${activity.type === 'registration' ? 'bg-blue-400' :
                          activity.type === 'fee' ? 'bg-emerald-400' : 'bg-amber-400'
                          }`} />
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-tight">{activity.activity}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                            {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-white overflow-hidden">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="text-xl font-bold">Quick Shortcuts</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-3">
              {[
                { label: 'Patient Registration', to: '/receptionist/registration', icon: Users, color: 'hover:bg-blue-50 hover:text-blue-700 hover:border-blue-100' },
                { label: 'Live Appointments', to: '/receptionist/appointments', icon: Calendar, color: 'hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-100' },
                { label: 'Queue Management', to: '/receptionist/queue', icon: TrendingUp, color: 'hover:bg-purple-50 hover:text-purple-700 hover:border-purple-100' },
                { label: 'Instant Billing', to: '/receptionist/fees', icon: IndianRupee, color: 'hover:bg-rose-50 hover:text-rose-700 hover:border-rose-100' },
              ].map((btn) => (
                <Button key={btn.to} variant="outline" className={`w-full justify-between h-14 text-base font-semibold transition-all border-slate-100 ${btn.color}`} asChild>
                  <Link to={btn.to}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-slate-50 group-hover:bg-white">
                        <btn.icon size={18} />
                      </div>
                      {btn.label}
                    </div>
                    <ArrowRight size={18} />
                  </Link>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TodayAppointmentsList() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const API_URL = import.meta.env.VITE_API_URL || '/api';

  const fetchToday = useCallback(async () => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`${API_URL}/appointments?date_from=${today}&date_to=${today}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.appointments || []);
        const filtered = list
          .filter((a: any) => a.status !== 'Pending_Approval' && a.status !== 'Cancelled')
          .sort((a: any, b: any) => a.appointment_time.localeCompare(b.appointment_time));
        setAppointments(filtered);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchToday();
    const onApproved = (_data: any) => fetchToday();
    const onQueue = (_data: any) => fetchToday();
    socket.on('appointment_approved', onApproved);
    socket.on('queue_status_updated', onQueue);
    return () => {
      socket.off('appointment_approved', onApproved);
      socket.off('queue_status_updated', onQueue);
    };
  }, [fetchToday]);

  if (loading && appointments.length === 0) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-300" /></div>;
  if (appointments.length === 0) return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
        <Activity className="text-slate-300" size={32} />
      </div>
      <p className="text-slate-500 font-medium">No active appointments yet.</p>
      <p className="text-slate-400 text-xs mt-1">Confirmed appointments will appear here.</p>
    </div>
  );

  return (
    <div className="divide-y divide-slate-100">
      <AnimatePresence initial={false}>
        {appointments.map((appt) => (
          <motion.div
            key={appt.appointment_id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${appt.status === 'In_Progress' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                {appt.token_number || '---'}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">{appt.patient_name}</p>
                <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
                  <span>{appt.appointment_time}</span>
                  <span>•</span>
                  <span className="truncate max-w-[120px]">Dr. {appt.doctor_name}</span>
                </div>
              </div>
            </div>
            <Badge className={`rounded-full px-3 ${appt.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-none' :
              appt.status === 'In_Progress' ? 'bg-blue-50 text-blue-600 border-none' :
                appt.status === 'No_Show' ? 'bg-rose-50 text-rose-600 border-none' : 'bg-slate-50 text-slate-600 border-none'
              }`}>
              {appt.status.replace('_', ' ')}
            </Badge>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function PendingAppointmentsList() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const API_URL = import.meta.env.VITE_API_URL || '/api';

  const fetchPending = useCallback(async () => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/appointments?status=Pending_Approval`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const pending = Array.isArray(data) ? data : (data.appointments || []);
        setAppointments(pending.filter((a: any) => a.status === 'Pending_Approval'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchPending();

    const onNew = (data: any) => {
      if (data && data.status === 'Pending_Approval') {
        setAppointments(prev => {
          if (prev.find(a => a.appointment_id === data.appointment_id)) return prev;
          return [data, ...prev];
        });
        toast.info("New online request", { position: 'bottom-left' });
      }
    };

    const onApproved = (data: any) => {
      const q = data.queue_item;
      if (q) setAppointments(prev => prev.filter(a => a.appointment_id !== q.appointment_id));
    };

    socket.on('new_appointment', onNew);
    socket.on('appointment_approved', onApproved);
    return () => {
      socket.off('new_appointment', onNew);
      socket.off('appointment_approved', onApproved);
    };
  }, [fetchPending]);

  const handleApprove = async (id: string) => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/appointments/${id}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (res.ok) {
        toast.success('Approved successfully');
        fetchPending();
      }
    } catch (err) { console.error(err); }
  };

  const handleReject = async (id: string) => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/appointments/${id}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Rejected via Dashboard' })
      });
      if (res.ok) {
        toast.success('Rejected');
        fetchPending();
      }
    } catch (err) { console.error(err); }
  };

  if (loading && appointments.length === 0) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-300" /></div>;

  if (appointments.length === 0) return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
        <Check className="text-slate-300" size={32} />
      </div>
      <p className="text-slate-500 font-medium">All caught up!</p>
      <p className="text-slate-400 text-xs mt-1">No pending requests to approve.</p>
    </div>
  );

  return (
    <div className="divide-y divide-slate-100">
      <AnimatePresence initial={false}>
        {appointments.map((appt) => (
          <motion.div
            key={appt.appointment_id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-4 bg-white hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-800">{appt.patient_name}</p>
                  <Badge variant="outline" className="text-[10px] font-bold text-slate-500 bg-slate-50 border-slate-100 uppercase">{appt.appointment_type}</Badge>
                </div>
                <p className="text-xs font-semibold text-slate-500">
                  Dr. {appt.doctor_name} • {appt.appointment_date} @ {appt.appointment_time}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleReject(appt.appointment_id)}>
                  <X size={16} />
                </Button>
                <Button size="icon" className="h-8 w-8 bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-200" onClick={() => handleApprove(appt.appointment_id)}>
                  <Check size={16} />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
