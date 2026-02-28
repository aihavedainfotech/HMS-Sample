import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  Clock,
  User,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import type { Appointment } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function MyAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const token = localStorage.getItem('hms_token');
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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
      Confirmed: { variant: 'default', icon: CheckCircle2 },
      Pending_Approval: { variant: 'secondary', icon: AlertCircle },
      Completed: { variant: 'default', icon: CheckCircle2 },
      Cancelled: { variant: 'destructive', icon: XCircle },
      No_Show: { variant: 'destructive', icon: XCircle },
    };
    const config = variants[status] || { variant: 'outline', icon: AlertCircle };
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <config.icon className="h-3 w-3" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const filterAppointments = (type: string) => {
    const today = new Date().toISOString().split('T')[0];
    switch (type) {
      case 'upcoming':
        return appointments.filter(
          (a) => a.appointment_date >= today && ['Confirmed', 'Pending_Approval'].includes(a.status)
        );
      case 'past':
        return appointments.filter(
          (a) => a.appointment_date < today || ['Completed', 'Cancelled', 'No_Show'].includes(a.status)
        );
      case 'all':
        return appointments;
      default:
        return [];
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Appointments</h1>
          <p className="text-muted-foreground">
            Manage your appointments and bookings
          </p>
        </div>
        <Button asChild>
          <Link to="/dashboard/appointments/book">
            <Plus className="h-4 w-4 mr-2" />
            Book New Appointment
          </Link>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        {['upcoming', 'past', 'all'].map((tab) => (
          <TabsContent key={tab} value={tab}>
            <div className="space-y-4">
              {filterAppointments(tab).length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">
                      No {tab} appointments found
                    </p>
                    {tab === 'upcoming' && (
                      <Button className="mt-4" asChild>
                        <Link to="/dashboard/appointments/book">Book Appointment</Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                filterAppointments(tab).map((appointment) => (
                  <Card key={appointment.appointment_id}>
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                            <Calendar className="h-7 w-7 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{appointment.doctor_name}</h3>
                              {getStatusBadge(appointment.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {appointment.department_name}
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
                            {appointment.reason_for_visit && (
                              <p className="text-sm text-muted-foreground mt-2">
                                Reason: {appointment.reason_for_visit}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {appointment.status === 'Confirmed' && tab === 'upcoming' && (
                            <Button variant="outline" size="sm">
                              Cancel
                            </Button>
                          )}
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
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
