import { useState, useEffect } from 'react';
function ErrorFallback({ error }: { error: any }) {
  return (
    <div className="flex flex-col items-center justify-center h-96 text-red-600">
      <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
      <pre className="bg-red-50 p-4 rounded border border-red-200 max-w-xl overflow-x-auto text-sm">{error?.message || String(error)}</pre>
      <p className="mt-4">Please try refreshing the page or contact support if the problem persists.</p>
    </div>
  );
}
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Clock, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import socket from '@/lib/socket';
import { AppointmentDetailModal } from '@/components/doctor/AppointmentDetailModal';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:5002/api';

export default function DoctorAppointments() {
  const [error, setError] = useState<any>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    const fetchAppointments = async (isPolling = false) => {
      try {
        if (!isPolling) setLoading(true);
        setError(null);
        const token = localStorage.getItem('hms_staff_token');
        const headers = { Authorization: `Bearer ${token}` };

        let url = `${API_URL}/appointments?doctor_id=${user?.staff_id}&status=Completed`;
        // If searching by patient ID, filter by patient
        if (searchTerm && searchTerm.match(/^P\d{4,}$/)) {
          url += `&patient_id=${searchTerm}`;
        }
        url += `&limit=10`;

        const res = await fetch(url, { headers });
        if (res.ok) {
          const data = await res.json();
          setAppointments(Array.isArray(data) ? data.slice(0, 10) : []);
        } else {
          setAppointments([]);
          setError(new Error(`Failed to fetch appointments: ${res.status} ${res.statusText}`));
        }
      } catch (err: any) {
        setAppointments([]);
        setError(err);
        console.error('Failed to fetch appointments:', err);
      } finally {
        if (!isPolling) setLoading(false);
      }
    };

    if (user?.staff_id) {
      fetchAppointments();
      const interval = setInterval(() => fetchAppointments(true), 5000);
      // Real-time: refresh when appointment/queue changes
      const onApproved = (data: any) => {
        if (data && data.doctor_id && data.doctor_id === user?.staff_id) {
          fetchAppointments();
        }
      };
      const onQueue = (data: any) => {
        if (data && data.doctor_id && data.doctor_id === user?.staff_id) {
          fetchAppointments();
        }
      };

      socket.on('appointment_approved', onApproved);
      socket.on('queue_status_updated', onQueue);
      return () => {
        clearInterval(interval);
        socket.off('appointment_approved', onApproved);
        socket.off('queue_status_updated', onQueue);
      };
    }
  }, [user, searchTerm]);

  const filteredAppointments = appointments.filter((apt) => {
    const matchesStatus = filterStatus === 'all' || apt.status === filterStatus;
    // If searching by patient ID, skip name search
    if (searchTerm && searchTerm.match(/^P\d{4,}$/)) {
      return matchesStatus;
    }
    const matchesSearch =
      apt.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.token_number?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

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
      case 'Visited':
        return <Badge className="bg-teal-100 text-teal-800">Arrived</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleViewDetails = (apt: any) => {
    // Construct a fuller object if needed, but the API response seems to have most fields
    // Mapping flatten structure
    const fullApt = {
      ...apt,
      patient: {
        first_name: apt.patient_name.split(' ')[0],
        last_name: apt.patient_name.split(' ').slice(1).join(' '),
        patient_id: apt.patient_id,
        mobile_number: apt.patient_phone,
        email: apt.patient_email, // Need to ensure API returns this
        age: new Date().getFullYear() - new Date(apt.patient_dob).getFullYear(),
        gender: apt.patient_gender // Need to ensure API returns this
      }
    };
    setSelectedAppointment(fullApt);
    setDetailsOpen(true);
  };

  const startConsultation = (patientId: string, appointmentId?: string) => {
    navigate(`/doctor/consultation?patient_id=${patientId}${appointmentId ? `&appointment_id=${appointmentId}` : ''}`);
  };

  if (error) {
    return <ErrorFallback error={error} />;
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Completed Appointments</h1>
          <p className="text-muted-foreground">
            {searchTerm && searchTerm.match(/^P\d{4,}$/)
              ? `Showing recent completed appointments for patient ${searchTerm}`
              : `Showing ${filteredAppointments.length} most recent completed appointments`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by patient name, ID (e.g., P0001), or token..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Confirmed">Confirmed</SelectItem>
            <SelectItem value="Waiting">Waiting</SelectItem>
            <SelectItem value="In_Progress">In Progress</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Token</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">Loading appointments...</TableCell>
                </TableRow>
              ) : filteredAppointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    {searchTerm && searchTerm.match(/^P\d{4,}$/)
                      ? `No completed appointments found for patient ${searchTerm}`
                      : 'No completed appointments found'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAppointments.map((apt) => (
                  <TableRow key={apt.appointment_id}>
                    <TableCell className="font-medium text-xs font-mono">{apt.token_number}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {apt.appointment_time
                          ? (() => {
                            try {
                              // Strip AM/PM if present (handle both "10:00" and "10:00 AM" formats)
                              const cleanTime = apt.appointment_time.replace(/\s*(AM|PM|am|pm)\s*$/i, '').trim();
                              const date = new Date(`2000-01-01T${cleanTime}`);
                              if (isNaN(date.getTime())) {
                                return apt.appointment_time; // Return original if parsing fails
                              }
                              return format(date, 'h:mm a');
                            } catch (e) {
                              return apt.appointment_time; // Fallback to original value
                            }
                          })()
                          : '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">{apt.patient_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{apt.patient_name}</p>
                          <p className="text-xs text-muted-foreground">{apt.patient_phone}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">{apt.appointment_type}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(apt.status)}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm">
                      {apt.reason_for_visit || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleViewDetails(apt)}>
                        Details
                      </Button>
                      {/* Show Start button only if waiting or confirmed or visited */}
                      {(apt.status === 'Waiting' || apt.status === 'Confirmed' || apt.status === 'Visited') && (
                        <Button size="sm" className="ml-2 bg-blue-600 hover:bg-blue-700" onClick={() => startConsultation(apt.patient_id, apt.appointment_id)}>
                          Start
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AppointmentDetailModal
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        appointment={selectedAppointment}
        onStartConsultation={() => {
          if (selectedAppointment) {
            startConsultation(selectedAppointment.patient_id, selectedAppointment.appointment_id);
          }
        }}
      />
    </div>
  );
}
