import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import socket from '@/lib/socket';
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface Appointment {
  appointment_id: string;
  patient_name: string;
  doctor_name: string;
  department_name: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  token_number: string;
}

export default function AppointmentManagement() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
    const interval = setInterval(fetchAppointments, 8000); // Polling every 8 seconds
    
    // Listen for real-time appointment approval events
    const handleApprovalEvent = (_data: any) => {
      // Refresh appointments when someone approves
      fetchAppointments();
      toast.success('Appointment approved and added to queue!', {
        position: 'top-right',
        duration: 3000
      });
    };
    
    socket.on('appointment_approved', handleApprovalEvent);
    
    return () => {
      clearInterval(interval);
      socket.off('appointment_approved', handleApprovalEvent);
    };
  }, []);

  const fetchAppointments = async () => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const response = await fetch(`${API_URL}/appointments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setAppointments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (appointmentId: string) => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const response = await fetch(`${API_URL}/appointments/${appointmentId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (response.ok) {
        toast.success('Appointment approved successfully');
        fetchAppointments();
      } else {
        toast.error('Failed to approve appointment');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  const handleCancel = async (appointmentId: string) => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const response = await fetch(`${API_URL}/appointments/${appointmentId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (response.ok) {
        toast.success('Appointment cancelled');
        fetchAppointments();
      } else {
        toast.error('Failed to cancel appointment');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      Confirmed: { variant: 'default', icon: CheckCircle2 },
      Pending_Approval: { variant: 'secondary', icon: Clock },
      Cancelled: { variant: 'destructive', icon: XCircle },
    };
    const config = variants[status] || { variant: 'outline', icon: Clock };
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <config.icon className="h-3 w-3" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const filterAppointments = (status: string) => {
    if (status === 'all') return appointments;
    if (status === 'pending') return appointments.filter((a) => a.status === 'Pending_Approval');
    return appointments.filter((a) => a.status === status);
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
        <h1 className="text-2xl font-bold">Appointment Management</h1>
        <p className="text-muted-foreground">Manage patient appointments</p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending Approval</TabsTrigger>
          <TabsTrigger value="Confirmed">Confirmed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        {['pending', 'Confirmed', 'all'].map((tab) => (
          <TabsContent key={tab} value={tab}>
            <div className="space-y-4">
              {filterAppointments(tab).length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No appointments found</p>
                  </CardContent>
                </Card>
              ) : (
                filterAppointments(tab).map((appointment) => (
                  <Card key={appointment.appointment_id}>
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                            <Calendar className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{appointment.patient_name}</h3>
                              {getStatusBadge(appointment.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Dr. {appointment.doctor_name} • {appointment.department_name}
                            </p>
                            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm">
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                {appointment.appointment_date} at {appointment.appointment_time}
                              </span>
                              <span className="flex items-center gap-1">
                                <User className="h-4 w-4 text-muted-foreground" />
                                Token: {appointment.token_number}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {appointment.status === 'Pending_Approval' && (
                            <>
                              <Button size="sm" onClick={() => handleApprove(appointment.appointment_id)}>
                                Approve
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleCancel(appointment.appointment_id)}>
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
