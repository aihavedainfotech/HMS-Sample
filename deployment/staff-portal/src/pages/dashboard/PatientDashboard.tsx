import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import {
  Calendar,
  FileText,
  FlaskConical,
  CreditCard,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import type { Appointment, Prescription, LabOrder } from '@/types';
import socket from '@/lib/socket';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';

export default function PatientDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    upcomingAppointments: [] as Appointment[],
    recentPrescriptions: [] as Prescription[],
    pendingLabOrders: [] as LabOrder[],
    stats: {
      totalAppointments: 0,
      totalPrescriptions: 0,
      pendingBills: 0,
      lastVisit: null as string | null,
    },
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      if (!token) return;

      const appointmentsRes = await fetch(`${API_URL}/appointments?status=Confirmed`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const appointments = await appointmentsRes.json();

      // Fetch prescriptions
      const prescriptionsRes = await fetch(`${API_URL}/prescriptions?limit=3`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const prescriptions = await prescriptionsRes.json();

      // Fetch lab orders
      const labRes = await fetch(`${API_URL}/lab/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const labOrders = await labRes.json();

      setDashboardData({
        upcomingAppointments: Array.isArray(appointments) ? appointments.slice(0, 3) : [],
        recentPrescriptions: Array.isArray(prescriptions) ? prescriptions.slice(0, 3) : [],
        pendingLabOrders: Array.isArray(labOrders) ? labOrders.filter((l: LabOrder) => l.status !== 'Delivered').slice(0, 3) : [],
        stats: {
          totalAppointments: Array.isArray(appointments) ? appointments.length : 0,
          totalPrescriptions: Array.isArray(prescriptions) ? prescriptions.length : 0,
          pendingBills: 0,
          lastVisit: Array.isArray(appointments) && appointments.length > 0 
            ? appointments[0].appointment_date 
            : null,
        },
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Real-time: refresh when appointments or prescriptions change
  useEffect(() => {
    const onUpdate = () => fetchDashboardData();
    socket.on('appointment_approved', onUpdate);
    socket.on('new_appointment', onUpdate);
    socket.on('queue_status_updated', onUpdate);
    socket.on('pharmacy:prescription_received', onUpdate);
    socket.on('lab_order_updated', onUpdate);
    return () => {
      socket.off('appointment_approved', onUpdate);
      socket.off('new_appointment', onUpdate);
      socket.off('queue_status_updated', onUpdate);
      socket.off('pharmacy:prescription_received', onUpdate);
      socket.off('lab_order_updated', onUpdate);
    };
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {user?.name?.split(' ')[0]}!</h1>
          <p className="text-muted-foreground">
            Here's an overview of your health journey
          </p>
        </div>
        <Button asChild>
          <Link to="/dashboard/appointments/book">
            <Calendar className="h-4 w-4 mr-2" />
            Book Appointment
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Appointments</p>
                <p className="text-2xl font-bold">{dashboardData.stats.totalAppointments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Prescriptions</p>
                <p className="text-2xl font-bold">{dashboardData.stats.totalPrescriptions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <FlaskConical className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Lab Tests</p>
                <p className="text-2xl font-bold">{dashboardData.pendingLabOrders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Bills</p>
                <p className="text-2xl font-bold">{dashboardData.stats.pendingBills}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Upcoming Appointments */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Upcoming Appointments</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard/appointments">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {dashboardData.upcomingAppointments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No upcoming appointments</p>
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link to="/dashboard/appointments/book">Book Now</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {dashboardData.upcomingAppointments.map((appointment) => (
                  <div
                    key={appointment.appointment_id}
                    className="flex items-start gap-4 p-4 bg-muted rounded-lg"
                  >
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                      <Calendar className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{appointment.doctor_name}</h4>
                        <Badge variant={appointment.status === 'Confirmed' ? 'default' : 'secondary'}>
                          {appointment.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {appointment.department_name}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {appointment.appointment_date}
                        </span>
                        <span>{appointment.appointment_time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/dashboard/appointments/book">
                <Calendar className="h-4 w-4 mr-2" />
                Book Appointment
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/dashboard/prescriptions">
                <FileText className="h-4 w-4 mr-2" />
                View Prescriptions
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/dashboard/lab-results">
                <FlaskConical className="h-4 w-4 mr-2" />
                Check Lab Results
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/dashboard/billing">
                <CreditCard className="h-4 w-4 mr-2" />
                View Bills
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/dashboard/profile">
                <User className="h-4 w-4 mr-2" />
                Update Profile
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Prescriptions & Lab Orders */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Prescriptions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Prescriptions</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard/prescriptions">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {dashboardData.recentPrescriptions.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No prescriptions found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dashboardData.recentPrescriptions.map((prescription) => (
                  <div
                    key={prescription.prescription_id}
                    className="flex items-center gap-3 p-3 border rounded-lg"
                  >
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{prescription.doctor_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {prescription.diagnosis}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(prescription.prescription_date).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Lab Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Lab Test Status</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard/lab-results">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {dashboardData.pendingLabOrders.length === 0 ? (
              <div className="text-center py-8">
                <FlaskConical className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No pending lab tests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dashboardData.pendingLabOrders.map((order) => (
                  <div
                    key={order.lab_order_id}
                    className="flex items-center gap-3 p-3 border rounded-lg"
                  >
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{order.test_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Ordered by {order.doctor_name}
                      </p>
                    </div>
                    <Badge variant="outline">{order.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
