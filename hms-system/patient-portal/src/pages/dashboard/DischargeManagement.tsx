import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  CheckCircle2,
  User,
  Bed,
  Calendar,
  Search,
  Loader2,
  FileText,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Admission } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function DischargeManagement() {
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAdmission, setSelectedAdmission] = useState<Admission | null>(null);
  const [discharging, setDischarging] = useState(false);

  useEffect(() => {
    fetchAdmissions();
  }, []);

  const fetchAdmissions = async () => {
    try {
      const token = localStorage.getItem('hms_token');
      const response = await fetch(`${API_URL}/admissions?status=Admitted`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setAdmissions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching admissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDischarge = async () => {
    if (!selectedAdmission) return;

    setDischarging(true);
    try {
      const token = localStorage.getItem('hms_token');
      const response = await fetch(`${API_URL}/admissions/${selectedAdmission.admission_id}/discharge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          discharge_date: new Date().toISOString(),
          discharge_type: 'Normal',
        }),
      });

      if (response.ok) {
        toast.success('Patient discharged successfully');
        setSelectedAdmission(null);
        fetchAdmissions();
      } else {
        toast.error('Failed to discharge patient');
      }
    } catch (error) {
      toast.error('Network error');
    } finally {
      setDischarging(false);
    }
  };

  const filteredAdmissions = admissions.filter(
    (a) =>
      a.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.admission_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <h1 className="text-2xl font-bold">Discharge Management</h1>
          <p className="text-muted-foreground">Process patient discharges</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search patients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {filteredAdmissions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Bed className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No admitted patients found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAdmissions.map((admission) => (
            <Card key={admission.admission_id}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{admission.patient_name}</h3>
                        <Badge>{admission.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {admission.admission_reason}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-sm">
                        <span className="flex items-center gap-1">
                          <Bed className="h-4 w-4 text-muted-foreground" />
                          {admission.bed_type} - {admission.room_number}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          Admitted: {new Date(admission.admission_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedAdmission(admission)}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setSelectedAdmission(admission)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Discharge
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Discharge Dialog */}
      <Dialog open={!!selectedAdmission} onOpenChange={() => setSelectedAdmission(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Discharge Patient</DialogTitle>
          </DialogHeader>

          {selectedAdmission && (
            <div className="space-y-6">
              <div className="border-b pb-4">
                <h4 className="font-semibold">{selectedAdmission.patient_name}</h4>
                <p className="text-sm text-muted-foreground">
                  Admission ID: {selectedAdmission.admission_id}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Admission Date</p>
                  <p className="font-medium">
                    {new Date(selectedAdmission.admission_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bed</p>
                  <p className="font-medium">{selectedAdmission.bed_type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Doctor</p>
                  <p className="font-medium">{selectedAdmission.doctor_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Diagnosis</p>
                  <p className="font-medium">{selectedAdmission.provisional_diagnosis || 'N/A'}</p>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  className="flex-1"
                  onClick={handleDischarge}
                  disabled={discharging}
                >
                  {discharging ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Confirm Discharge
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setSelectedAdmission(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
