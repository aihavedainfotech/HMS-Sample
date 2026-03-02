import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  CheckCircle2,
  UserX,
  Loader2,
  Clock,
  Zap,
} from 'lucide-react';
import socket from '@/lib/socket';

interface QueueItem {
  id: string;
  token_number: string;
  patient_id: string;
  patient_name: string;
  doctor_name: string;
  department_name: string;
  status: 'Waiting' | 'Visited' | 'In_Progress' | 'Completed' | 'No_Show';
  arrival_time: string;
  appointment_time?: string;
  appointment_id?: string;
}

export default function QueueManagement() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const API_URL = import.meta.env.VITE_API_URL || '/api';

  useEffect(() => {
    fetchQueue(selectedDate);
    // Polling removed
    // const interval = setInterval(fetchQueue, 5000); // Polling every 5 seconds

    // Real-time: listen for approvals and queue status updates
    const onApproved = (data: any) => {
      console.log('Appointment approved event received:', data);

      // Show toast notification
      if (data?.queue_item) {
        toast.success(`✓ ${data.queue_item.patient_name} added to queue (Token: ${data.queue_item.token_number})`, {
          position: 'top-right',
          duration: 4000,
        });

        // Highlight the newly added item
        setRecentlyAdded(prev => {
          const newSet = new Set(prev);
          newSet.add(data.queue_item.appointment_id || data.queue_item.id);
          setTimeout(() => {
            setRecentlyAdded(s => {
              const updated = new Set(s);
              updated.delete(data.queue_item.appointment_id || data.queue_item.id);
              return updated;
            });
          }, 5000);
          return newSet;
        });
      }

      // Refresh queue immediately
      fetchQueue(selectedDate);
    };

    const onQueueStatusUpdated = (data: any) => {
      console.log('Queue status updated:', data);
      fetchQueue(selectedDate);
    };

    socket.on('appointment_approved', onApproved);
    socket.on('queue_status_updated', onQueueStatusUpdated);

    return () => {
      // clearInterval(interval);
      socket.off('appointment_approved', onApproved);
      socket.off('queue_status_updated', onQueueStatusUpdated);
    };
  }, [selectedDate]);

  const fetchQueue = async (date?: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('hms_staff_token');
      const targetDate = date || selectedDate;
      const res = await fetch(`${API_URL}/queue/today?date=${targetDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        // Handle if response is wrapped in {queue: [...]}
        const queueList = Array.isArray(data) ? data : (data.queue || []);
        setQueue(queueList);
      }
    } catch (err) {
      console.error('Error fetching queue:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (queueId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/queue/${queueId}/update-status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
        fetchQueue(selectedDate);
      } else {
        toast.error('Failed to update status');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error updating status');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      Waiting: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      Visited: 'bg-teal-100 text-teal-800 border-teal-200',
      In_Progress: 'bg-blue-100 text-blue-800 border-blue-200',
      Completed: 'bg-green-100 text-green-800 border-green-200',
      No_Show: 'bg-red-100 text-red-800 border-red-200',
    };
    return <Badge variant="outline" className={`${colors[status] || ''}`}>{status.replace('_', ' ')}</Badge>;
  };

  if (loading && queue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Loading today's queue...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Queue Management</h1>
          <p className="text-muted-foreground">Manage patient flow for consultations in real-time</p>
        </div>
        <div className="flex gap-4 items-center">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="flex h-9 w-40 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-lg border border-green-100">
            <Zap className="h-4 w-4" />
            Live Updates
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchQueue(selectedDate)} className="gap-2">
            <Clock className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-50/50">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total today</p>
            <p className="text-2xl font-bold">{queue.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50/50">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-amber-700 uppercase tracking-wider">Waiting</p>
            <p className="text-2xl font-bold text-amber-700">{queue.filter((q) => q.status === 'Waiting').length}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50/50">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-blue-700 uppercase tracking-wider">In Progress</p>
            <p className="text-2xl font-bold text-blue-700">{queue.filter((q) => q.status === 'In_Progress').length}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50/50">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-green-700 uppercase tracking-wider">Completed</p>
            <p className="text-2xl font-bold text-green-700">{queue.filter((q) => q.status === 'Completed' || q.status === 'No_Show').length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 pt-2">
        {queue.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg bg-slate-50">
            <p className="text-muted-foreground">No patients in queue for today.</p>
          </div>
        ) : (
          queue.map((item) => {
            const isRecentlyAdded = recentlyAdded.has(item.appointment_id || item.id);
            return (
              <Card
                key={item.id}
                className={`transition-all hover:shadow-md border-l-4 ${isRecentlyAdded ? 'ring-2 ring-green-400 animate-pulse' : ''
                  } ${item.status === 'In_Progress' ? 'border-l-blue-500' :
                    item.status === 'Completed' ? 'border-l-green-500' :
                      item.status === 'Visited' ? 'border-l-teal-500' :
                        item.status === 'No_Show' ? 'border-l-red-500' : 'border-l-amber-500'
                  }`}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 bg-primary/10 rounded-xl flex flex-col items-center justify-center shrink-0 border border-primary/20">
                        <span className="text-[10px] uppercase font-bold text-primary/60">Token</span>
                        <span className="text-xl font-black text-primary leading-tight">{item.token_number.split('-')[1] || item.token_number}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-bold">{item.patient_name}</h3>
                          <Badge variant="secondary" className="font-mono text-[10px]">{item.patient_id}</Badge>
                          {getStatusBadge(item.status)}
                          {isRecentlyAdded && (
                            <Badge className="bg-green-500 animate-pulse">
                              New
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Dr. {item.doctor_name} • <span className="text-primary/70">{item.department_name}</span>
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Slot Time: {item.appointment_time || '---'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {item.status === 'Waiting' && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="hover:bg-red-50 hover:text-red-600 border-red-100"
                            onClick={() => handleStatusChange(item.id, 'No_Show')}
                          >
                            <UserX className="h-4 w-4 mr-2" />
                            No Show
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleStatusChange(item.id, 'Visited')}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Visited
                          </Button>
                        </div>
                      )}
                      {item.status === 'Visited' && (
                        <p className="text-sm font-medium text-teal-600 flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" />
                          Patient Arrived
                        </p>
                      )}
                      {(item.status === 'Completed' || item.status === 'No_Show') && (
                        <p className="text-sm font-medium text-muted-foreground italic">
                          Processing complete
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
