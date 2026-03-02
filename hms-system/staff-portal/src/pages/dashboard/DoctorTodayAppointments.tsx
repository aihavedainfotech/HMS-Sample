import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AlertCircle, Phone, CheckCircle2, Play, Clock, Stethoscope } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import socket from '@/lib/socket';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface QueueItem {
  id: string;
  queue_id?: string;
  appointment_id: string;
  patient_id: string;
  patient_name: string;
  token_number: string;
  appointment_time: string;
  status: string;
  reason_for_visit: string;
  patient_dob?: string;
  patient_gender?: string;
  mobile_number?: string;
  email?: string;
  appointment_type?: string;
  department_name?: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function DoctorTodayAppointments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'waiting', 'in-progress', 'completed'

  useEffect(() => {
    if (!user?.staff_id) return;

    const fetchQueue = async () => {
      try {
        const token = localStorage.getItem('hms_staff_token');
        const res = await fetch(
          `${API_URL}/doctor/queue/today?doctor_id=${user.staff_id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.status === 401 || res.status === 422) {
          setQueue([]);
          toast.error('Session expired or unauthorized. Please log in again as a doctor.');
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setQueue(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Failed to fetch queue:', err);
        toast.error('Failed to fetch queue. Please check your login or network.');
      } finally {
        setLoading(false);
      }
    };

    fetchQueue();
    // Polling removed in favor of socket updates
    // Join doctor-specific socket room for targeted updates
    try {
      socket.emit('join_doctor_room', { doctor_id: user.staff_id });
    } catch (e) {
      console.warn('Failed to join doctor room:', e);
    }

    // Listen for real-time queue updates
    const onQueueUpdated = (data: any) => {
      if (data?.doctor_id === user.staff_id) {
        fetchQueue();
        toast.info(`Patient ${data?.queue_item?.patient_name || ''} status updated to ${data?.new_status}`, {
          position: 'top-right',
          duration: 3000,
        });
      }
    };

    const onPatientCalled = (data: any) => {
      if (data?.doctor_id === user.staff_id) {
        fetchQueue();
      }
    };

    const onConsultationCompleted = (data: any) => {
      if (data?.doctor_id === user.staff_id) {
        fetchQueue();
      }
    };

    socket.on('queue_status_updated', onQueueUpdated);
    socket.on('patient_called', onPatientCalled);
    socket.on('consultation_completed', onConsultationCompleted);

    return () => {
      // clearInterval(interval);
      try {
        socket.emit('leave_doctor_room', { doctor_id: user.staff_id });
      } catch (e) {
        // ignore
      }
      socket.off('queue_status_updated', onQueueUpdated);
      socket.off('patient_called', onPatientCalled);
      socket.off('consultation_completed', onConsultationCompleted);
    };
  }, [user?.staff_id]);

  const callNextPatient = async (queueItem: QueueItem) => {
    if (!user?.staff_id) return;

    setLoadingAction(queueItem.id || queueItem.queue_id || queueItem.appointment_id);

    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/doctor/next-patient`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          queue_id: queueItem.id || queueItem.queue_id,
          doctor_id: user.staff_id,
        }),
      });

      if (res.ok) {
        toast.success(`${queueItem.patient_name} called for consultation`, {
          position: 'top-right',
          duration: 3000,
        });
      } else {
        toast.error('Failed to call patient');
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to call patient');
    } finally {
      setLoadingAction(null);
    }
  };

  const startConsultation = (queueItem: QueueItem) => {
    if (!user?.staff_id) return;
    // Only allow consult for 'In Progress' patient
    if (queueItem.status !== 'In_Progress') {
      toast.error('You can only consult patients who are In Progress');
      return;
    }
    navigate(`/doctor/consultation?appointment_id=${queueItem.appointment_id}&patient_id=${queueItem.patient_id}`);
  };

  const completeConsultation = async (queueItem: QueueItem) => {
    if (!user?.staff_id) return;

    setLoadingAction(`complete-${queueItem.id || queueItem.queue_id}`);

    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/doctor/complete-consultation`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          queue_id: queueItem.id || queueItem.queue_id,
          appointment_id: queueItem.appointment_id,
          doctor_id: user.staff_id,
        }),
      });

      if (res.ok) {
        toast.success(`Consultation with ${queueItem.patient_name} completed`, {
          position: 'top-right',
          duration: 3000,
        });
      } else {
        toast.error('Failed to complete consultation');
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to complete consultation');
    } finally {
      setLoadingAction(null);
    }
  };

  const filteredQueue = queue.filter((item) => {
    if (activeTab === 'waiting') return item.status === 'Waiting' || item.status === 'Visited';
    if (activeTab === 'in-progress') return item.status === 'In_Progress';
    if (activeTab === 'completed') return item.status === 'Completed';
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Waiting':
        return 'bg-amber-100 text-amber-800';
      case 'In_Progress':
        return 'bg-blue-100 text-blue-800';
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'Visited':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Waiting':
        return <Clock className="h-4 w-4" />;
      case 'In_Progress':
        return <Phone className="h-4 w-4" />;
      case 'Completed':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Today's Appointments</h1>
        <p className="text-muted-foreground mt-2">Manage your patient queue and consultations</p>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 border-b">
        {['all', 'waiting', 'in-progress', 'completed'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition ${activeTab === tab
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
            {activeTab === tab && (
              <span className="ml-2 inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                {filteredQueue.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Queue List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          <p className="text-muted-foreground mt-4">Loading appointments...</p>
        </div>
      ) : filteredQueue.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Stethoscope className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground text-lg">No appointments in this category</p>
            {user?.staff_id && queue.length === 0 && (
              <p className="text-red-600 mt-4">No queue items found. Please check if you are logged in as a doctor and if appointments are approved for today.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredQueue.map((item) => (
            <Card key={item.id || item.queue_id || item.appointment_id} className="hover:shadow-md transition">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  {/* Patient Info */}
                  <div className="flex-1 flex gap-4">
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarFallback className="bg-blue-100 text-blue-700">
                        {item.patient_name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg truncate">{item.patient_name}</h3>
                        <Badge className={`flex-shrink-0 ${getStatusColor(item.status)}`}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(item.status)}
                            {item.status.replace('_', ' ')}
                          </span>
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Token:</span> {item.token_number}
                        </div>
                        <div>
                          <span className="font-medium">Time:</span> {item.appointment_time}
                        </div>
                        <div>
                          <span className="font-medium">Type:</span> {item.appointment_type || 'Consultation'}
                        </div>
                        <div>
                          <span className="font-medium">ID:</span> {item.patient_id}
                        </div>
                      </div>

                      {item.reason_for_visit && (
                        <div className="mt-2 p-2 bg-muted rounded text-sm">
                          <span className="font-medium">Reason:</span> {item.reason_for_visit}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {item.status === 'Visited' ? (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => callNextPatient(item)}
                          disabled={
                            loadingAction ===
                            (item.id || item.queue_id || item.appointment_id)
                          }
                          className="gap-2"
                        >
                          <Play className="h-4 w-4" />
                          Call Patient
                        </Button>
                      </>
                    ) : item.status === 'Waiting' ? (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => callNextPatient(item)}
                          disabled={
                            loadingAction ===
                            (item.id || item.queue_id || item.appointment_id)
                          }
                          className="gap-2"
                        >
                          <Phone className="h-4 w-4" />
                          Call Next
                        </Button>
                      </>
                    ) : item.status === 'In_Progress' ? (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => startConsultation(item)}
                          className="gap-2"
                        >
                          <Stethoscope className="h-4 w-4" />
                          Consult
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => completeConsultation(item)}
                          disabled={
                            loadingAction ===
                            `complete-${item.id || item.queue_id}`
                          }
                          className="gap-2"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Complete
                        </Button>
                      </>
                    ) : item.status === 'Completed' ? (
                      <Badge className="bg-green-100 text-green-800 justify-center">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Completed
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Queue Summary */}
      {queue.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Today</p>
                <p className="text-2xl font-bold">{queue.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Waiting</p>
                <p className="text-2xl font-bold">
                  {queue.filter((q) => q.status === 'Waiting' || q.status === 'Visited').length}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">
                  {queue.filter((q) => q.status === 'In_Progress').length}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">
                  {queue.filter((q) => q.status === 'Completed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
