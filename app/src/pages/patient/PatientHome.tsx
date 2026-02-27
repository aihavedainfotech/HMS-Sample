import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  FileText,
  User,
  Heart,
  Phone,
  Mail
} from 'lucide-react';
import { usePatientAuth } from '@/contexts/PatientAuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Appointment {
  id: number;
  appointment_id: string;
  doctor_name: string;
  department: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  consultation_mode: string;
}

// interface Doctor {
//   staff_id: string;
//   first_name: string;
//   last_name: string;
//   specialization: string;
//   consultation_fee: number;
//   rating: number;
// }

const PatientHome = () => {
  const { patient } = usePatientAuth();
  const navigate = useNavigate();
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  // const [topDoctors, setTopDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  const lastStatusRef = useRef<Record<string, string>>({});

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('patientToken');

      if (!token) {
        console.log('No token found, redirecting to login...');
        navigate('/patient/login');
        return;
      }

      console.log('Fetching dashboard data...', token);

      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out')), 10000)
      );

      // Fetch with timeout race
      const fetchPromise = fetch('/api/appointments', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const appointmentsResponse = await Promise.race([fetchPromise, timeoutPromise]) as Response;
      console.log('Appointments response status:', appointmentsResponse.status);

      if (appointmentsResponse.ok) {
        const appointmentsData = await appointmentsResponse.json();
        const appointmentsList = Array.isArray(appointmentsData) ? appointmentsData : (appointmentsData.appointments || []);

        // Check for status updates
        appointmentsList.forEach((apt: any) => {
          const oldStatus = lastStatusRef.current[apt.appointment_id];
          if (oldStatus && oldStatus !== apt.status) {
            // Trigger customized toast
            if (oldStatus === 'Pending_Approval' && apt.status === 'Confirmed') {
              toast.success(`Appointment Confirmed!`, {
                description: `Your appointment with ${apt.doctor_name || 'the doctor'} on ${apt.appointment_date} at ${apt.appointment_time} has been confirmed. Token: ${apt.token_number || 'N/A'}`,
                duration: 5000,
              });
            } else if (oldStatus !== 'Completed' && apt.status === 'Completed') {
              // Also handle "Visited" / Completed status update if needed
              // The user said "once she conformed it then the status of that appointment should update in patient portal and trigger a notification about appointment conformation"
              // But they also said "once she confirm visited then it should to update... in doctors dashboard".
              // Maybe the patient also wants to know?
            }
          }
          lastStatusRef.current[apt.appointment_id] = apt.status;
        });

        setUpcomingAppointments(appointmentsList.slice(0, 3));
      } else if (appointmentsResponse.status === 401) {
        console.error('Unauthorized, clearing token');
        localStorage.removeItem('patientToken');
        localStorage.removeItem('patientData');
        navigate('/patient/login');
      }

      // const doctorsResponse = await fetch('/api/public/doctors');
      // if (doctorsResponse.ok) {
      //   const doctorsData = await doctorsResponse.json();
      //   setTopDoctors(doctorsData.doctors?.slice(0, 4) || []);
      // }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data. Please try again.');
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed':
        return 'bg-green-100 text-green-800';
      case 'Pending_Approval':
        return 'bg-yellow-100 text-yellow-800';
      case 'In_Progress':
        return 'bg-blue-100 text-blue-800';
      case 'Completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {patient?.first_name}!
            </h1>
            <p className="text-blue-100">
              Your health is our priority. How can we help you today?
            </p>
          </div>
          <div className="hidden md:block">
            <Heart className="h-16 w-16 text-blue-200" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/book-appointment')}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <Calendar className="mr-2 h-5 w-5 text-blue-600" />
              Book Appointment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Schedule a consultation with our expert doctors
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/patient/appointments')}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <Clock className="mr-2 h-5 w-5 text-green-600" />
              My Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              View and manage your upcoming appointments
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/patient/medical-records')}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <FileText className="mr-2 h-5 w-5 text-purple-600" />
              Medical Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Access your health history and test results
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Upcoming Appointments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                Upcoming Appointments
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/patient/appointments')}
              >
                View All
              </Button>
            </CardTitle>
            <CardDescription>
              Your scheduled consultations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length > 0 ? (
              <div className="space-y-4">
                {upcomingAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium">{appointment.doctor_name}</h4>
                        <Badge className={getStatusColor(appointment.status)}>
                          {appointment.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{appointment.department}</p>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <Calendar className="mr-1 h-3 w-3" />
                        {formatDate(appointment.appointment_date)}
                        <Clock className="ml-3 mr-1 h-3 w-3" />
                        {formatTime(appointment.appointment_time)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                <p className="text-gray-600">No upcoming appointments</p>
                <Button
                  variant="outline"
                  className="mt-3"
                  onClick={() => navigate('/book-appointment')}
                >
                  Book Your First Appointment
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Patient Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="mr-2 h-5 w-5" />
            Your Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Patient ID</p>
                <p className="text-sm text-gray-600">{patient?.patient_id}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Phone className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Contact</p>
                <p className="text-sm text-gray-600">{patient?.mobile_number}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Mail className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-gray-600">{patient?.email || 'Not provided'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PatientHome;
