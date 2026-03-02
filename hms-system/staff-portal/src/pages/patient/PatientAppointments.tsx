import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  Stethoscope,
  Phone,
  MapPin,
  Search,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { usePatientAuth } from '@/contexts/PatientAuthContext';
import socket from '@/lib/socket';

interface Appointment {
  id: number;
  appointment_id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  consultation_mode: string;
  reason_for_visit: string;
  doctor_name: string;
  department_name: string; // Backend sends department_name
  department?: string; // Optional/fallback
  consultation_fee?: number;
  token_number?: number;
}

const PatientAppointments = () => {
  const { patient } = usePatientAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // Default to 'active'

  useEffect(() => {
    fetchAppointments();
    // Polling every 5 seconds
    // Polling removed in favor of real-time socket updates

    // Socket listeners: refresh appointments when server emits relevant events
    const onApproved = (data: any) => {
      // If this appointment belongs to the logged in patient, refresh
      if (!data) return;
      if (data.patient_id && patient && data.patient_id === patient.patient_id) {
        fetchAppointments();
      } else {
        // fallback: refresh to keep UI consistent
        fetchAppointments(true);
      }
    };

    const onQueue = (data: any) => {
      if (!data) return;
      if (data.patient_id && patient && data.patient_id === patient.patient_id) {
        fetchAppointments();
      }
    };

    socket.on('appointment_approved', onApproved);
    socket.on('queue_status_updated', onQueue);

    return () => {
      // Cleanup socket listeners
      socket.off('appointment_approved', onApproved);
      socket.off('queue_status_updated', onQueue);
    };
  }, []);

  useEffect(() => {
    filterAppointments();
  }, [appointments, searchTerm, statusFilter]);

  const fetchAppointments = async (silent = false) => {
    try {
      const token = localStorage.getItem('patientToken');
      if (!token) {
        if (!silent) navigate('/patient/login');
        return;
      }

      if (!silent) setLoading(true);

      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch('/api/patient/appointments', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          signal: controller.signal
        });
        clearTimeout(id);

        if (response.ok) {
          const data = await response.json();
          const apts = Array.isArray(data) ? data : (data.appointments || []);
          console.log('Fetched Appointments:', apts); // Debug log
          setAppointments(apts);
        } else if (response.status === 401) {
          localStorage.removeItem('patientToken');
          navigate('/patient/login');
        } else {
          if (!silent) toast.error('Failed to fetch appointments');
        }
      } catch (e) {
        clearTimeout(id);
        throw e;
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      if (!silent) toast.error('Network error. Please try again.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const filterAppointments = () => {
    let filtered = appointments;

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(apt =>
        (apt.doctor_name && apt.doctor_name.toLowerCase().includes(lowerSearch)) ||
        (apt.department_name && apt.department_name.toLowerCase().includes(lowerSearch)) ||
        (apt.appointment_id && apt.appointment_id.toLowerCase().includes(lowerSearch))
      );
    }

    const activeStatuses = ['Pending_Approval', 'Confirmed', 'In_Progress', 'Waiting'];
    // Visited is considered 'Past' in this logic, or maybe 'Active' until Completed?
    // Let's treat 'Visited' as Past (since they saw the doc) or Active (still in hospital)?
    // User goal: "click my appointments it is showing some error" -> Likely 'Visited' disappears from active.
    // Let's include 'Visited' in Active for clarity until it is 'Completed'.
    const somewhatActive = [...activeStatuses, 'Visited'];

    if (statusFilter === 'active') {
      filtered = filtered.filter(apt => somewhatActive.includes(apt.status));
    } else if (statusFilter === 'past') {
      filtered = filtered.filter(apt => !somewhatActive.includes(apt.status) || apt.status === 'Completed' || apt.status === 'Cancelled' || apt.status === 'No_Show');
    }

    setFilteredAppointments(filtered);
  };

  // Helper functions for rendering
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed': return 'bg-green-100 text-green-800';
      case 'Pending_Approval': return 'bg-yellow-100 text-yellow-800';
      case 'In_Progress': return 'bg-blue-100 text-blue-800';
      case 'Waiting': return 'bg-purple-100 text-purple-800';
      case 'Completed': return 'bg-gray-100 text-gray-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      case 'No_Show': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Confirmed': return <CheckCircle className="h-4 w-4" />;
      case 'Pending_Approval': return <AlertCircle className="h-4 w-4" />;
      case 'In_Progress': return <Loader className="h-4 w-4 animate-spin" />;
      case 'Waiting': return <Clock className="h-4 w-4" />;
      case 'Completed': return <CheckCircle className="h-4 w-4" />;
      case 'Cancelled': return <XCircle className="h-4 w-4" />;
      case 'No_Show': return <AlertCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
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

  if (loading && appointments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading appointments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Appointments</h1>
          <p className="text-gray-600 mt-1">Manage your upcoming and past appointments</p>
        </div>
        <Button onClick={() => navigate('/patient/book-appointment')}>
          Book New Appointment
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setStatusFilter('active')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${statusFilter === 'active'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-500 hover:text-gray-900'
            }`}
        >
          Active Appointments
        </button>
        <button
          onClick={() => setStatusFilter('past')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${statusFilter === 'past'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-500 hover:text-gray-900'
            }`}
        >
          Past Appointments
        </button>
      </div>

      {/* Search Filter */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by doctor, department..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-1/3 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        {filteredAppointments.length > 0 ? (
          filteredAppointments.map((appointment) => (
            <Card key={appointment.id} className={`transition-shadow hover:shadow-md ${statusFilter === 'past' ? 'opacity-75' : 'border-l-4 border-l-blue-500'}`}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <Badge className={getStatusColor(appointment.status)}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(appointment.status)}
                            <span>{appointment.status.replace('_', ' ')}</span>
                          </div>
                        </Badge>
                        <span className="text-sm font-medium text-gray-500">
                          {appointment.appointment_id}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {appointment.token_number && (
                          <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                            Token: {appointment.token_number}
                          </Badge>
                        )}
                        <div className="text-right">
                          <p className="text-lg font-semibold text-blue-600">
                            ₹{appointment.consultation_fee || 0}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center text-sm">
                          <Stethoscope className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="font-medium">{appointment.doctor_name}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                          <span>{appointment.department_name || appointment.department}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          <span>{formatDate(appointment.appointment_date)}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="h-4 w-4 mr-2 text-gray-400" />
                          <span>{formatTime(appointment.appointment_time)}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="h-4 w-4 mr-2 text-gray-400" />
                          <span>{appointment.consultation_mode}</span>
                        </div>
                      </div>
                    </div>

                    {appointment.reason_for_visit && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">
                          <strong>Reason for visit:</strong> {appointment.reason_for_visit}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <Calendar className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm
                  ? 'Try adjusting your search'
                  : statusFilter === 'active'
                    ? 'You have no active appointments.'
                    : 'You have no past appointments.'
                }
              </p>
              {statusFilter === 'active' && (
                <Button onClick={() => navigate('/patient/book-appointment')}>
                  Book New Appointment
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PatientAppointments;
