import { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';
import socket from '@/lib/socket';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface DashboardStats {
  todayRegistrations: number;
  todayAppointments: number;
  pendingApprovals: number;
  waitingQueue: number;
  todayRevenue: number;
}

export default function ReceptionistHome() {
  const [stats, setStats] = useState<DashboardStats>({
    todayRegistrations: 0,
    todayAppointments: 0,
    pendingApprovals: 0,
    waitingQueue: 0,
    todayRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000); // Poll every 10 seconds for stats
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('hms_staff_token');

      // Fetch appointments
      const appointmentsRes = await fetch(`${API_URL}/appointments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const appointments = await appointmentsRes.json();

      // Calculate stats
      const today = new Date().toISOString().split('T')[0];
      const todayAppointments = Array.isArray(appointments)
        ? appointments.filter((a: any) => a.appointment_date === today).length
        : 0;
      const pendingApprovals = Array.isArray(appointments)
        ? appointments.filter((a: any) => a.status === 'Pending_Approval').length
        : 0;

      setStats({
        todayRegistrations: 12, // Mocked
        todayAppointments,
        pendingApprovals,
        waitingQueue: 8, // Mocked
        todayRevenue: 24500, // Mocked
      });

      // Mock recent activity
      setRecentActivity([
        { type: 'registration', message: 'New patient registered: P0156', time: '5 min ago' },
        { type: 'appointment', message: 'Appointment approved: APT0089', time: '15 min ago' },
        { type: 'payment', message: 'Fee collected: ₹1,200', time: '30 min ago' },
        { type: 'appointment', message: 'New appointment request received', time: '1 hour ago' },
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
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
      <div>
        <h1 className="text-2xl font-bold">Receptionist Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Today's Registrations</p>
                <p className="text-2xl font-bold">{stats.todayRegistrations}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Today's Appointments</p>
                <p className="text-2xl font-bold">{stats.todayAppointments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Approvals</p>
                <p className="text-2xl font-bold">{stats.pendingApprovals}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Waiting Queue</p>
                <p className="text-2xl font-bold">{stats.waitingQueue}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <IndianRupee className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Today's Revenue</p>
                <p className="text-2xl font-bold">₹{stats.todayRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-between" asChild>
              <Link to="/receptionist/registration">
                Register New Patient
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-between" asChild>
              <Link to="/receptionist/appointments">
                Manage Appointments
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-between" asChild>
              <Link to="/receptionist/queue">
                View Queue
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-between" asChild>
              <Link to="/receptionist/fees">
                Collect Fees
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">
                    {activity.type}
                  </Badge>
                  <div className="flex-1">
                    <p className="text-sm">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Appointments Sections */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-lg">Pending Online Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <PendingAppointmentsList />
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-lg">Today's Appointments Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <TodayAppointmentsList />
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

function TodayAppointmentsList() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const API_URL = import.meta.env.VITE_API_URL || '/api';

  useEffect(() => {
    fetchToday();
    const interval = setInterval(fetchToday, 5000);

    // Real-time: refresh today's appointments when approvals or queue updates happen
    const onApproved = (_data: any) => fetchToday();
    const onQueue = (_data: any) => fetchToday();

    socket.on('appointment_approved', onApproved);
    socket.on('queue_status_updated', onQueue);

    return () => {
      clearInterval(interval);
      socket.off('appointment_approved', onApproved);
      socket.off('queue_status_updated', onQueue);
    };
  }, []);

  const fetchToday = async () => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`${API_URL}/appointments?date_from=${today}&date_to=${today}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.appointments || []);
        // Ignore pending ones here as they are in the other list
        setAppointments(list.filter((a: any) => a.status !== 'Pending_Approval'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && appointments.length === 0) return <Loader2 className="h-6 w-6 animate-spin" />;

  if (appointments.length === 0) return <p className="text-muted-foreground text-sm">No confirmed appointments for today.</p>;

  return (
    <div className="space-y-3">
      {appointments.map((appt) => (
        <div key={appt.appointment_id} className="flex items-center justify-between p-3 border rounded-lg bg-card bg-slate-50/30">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">{appt.patient_name}</p>
              <Badge variant="outline" className="text-[10px]">{appt.patient_id}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {appt.appointment_time} • Token: {appt.token_number || '---'}
            </p>
          </div>
          <Badge className={
            appt.status === 'Completed' ? 'bg-green-100 text-green-800' :
              appt.status === 'In_Progress' ? 'bg-blue-100 text-blue-800' :
                appt.status === 'No_Show' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-800'
          }>
            {appt.status.replace('_', ' ')}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function PendingAppointmentsList() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const API_URL = import.meta.env.VITE_API_URL || '/api';

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, 5000); // Poll every 5 seconds

    // Real-time: add new pending appointments and remove approved ones
    const onNew = (data: any) => {
      if (data && data.status === 'Pending_Approval') {
        setAppointments(prev => [data, ...prev]);
      }
    };

    const onApproved = (data: any) => {
      if (data && data.appointment_id) {
        setAppointments(prev => prev.filter(a => a.appointment_id !== data.appointment_id));
      }
    };

    socket.on('new_appointment', onNew);
    socket.on('appointment_approved', onApproved);

    return () => {
      clearInterval(interval);
      socket.off('new_appointment', onNew);
      socket.off('appointment_approved', onApproved);
    };
  }, []);

  const fetchPending = async () => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/appointments?status=Pending_Approval`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const pending = Array.isArray(data) ? data : (data.appointments || []);
        // Double check status client side just in case
        setAppointments(pending.filter((a: any) => a.status === 'Pending_Approval'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/appointments/${id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (res.ok) {
        toast.success('Appointment approved');
        fetchPending(); // Refresh list immediately
      } else {
        toast.error('Failed to approve appointment');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error approving appointment');
    }
  };

  const handleReject = async (id: string) => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/appointments/${id}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: 'Rejected by receptionist' })
      });

      if (res.ok) {
        toast.success('Appointment rejected');
        fetchPending(); // Refresh list immediately
      } else {
        toast.error('Failed to reject appointment');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error rejecting appointment');
    }
  };

  if (loading) return <Loader2 className="h-6 w-6 animate-spin" />;

  if (appointments.length === 0) return <p className="text-muted-foreground text-sm">No pending appointments.</p>;

  return (
    <div className="space-y-3">
      {appointments.map((appt) => (
        <div key={appt.appointment_id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">{appt.patient_name}</p>
              <Badge variant="outline" className="text-xs">{appt.patient_id}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {appt.appointment_date} at {appt.appointment_time}
            </p>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <span>With {appt.doctor_name}</span>
              <span>•</span>
              <span>{appt.appointment_type || 'Consultation'}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleReject(appt.appointment_id)}>
              <X className="h-4 w-4 mr-1" />
              Reject
            </Button>
            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApprove(appt.appointment_id)}>
              <Check className="h-4 w-4 mr-1" />
              Approve
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
