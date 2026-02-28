import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pill, Search, Plus, Printer, FileText, Calendar } from 'lucide-react';

import socket from '@/lib/socket';

type Rx = any;


const commonMedications = [
  'Lisinopril',
  'Metformin',
  'Amoxicillin',
  'Atorvastatin',
  'Amlodipine',
  'Omeprazole',
  'Paracetamol',
  'Ibuprofen',
];

export default function DoctorPrescriptions() {
  const [searchTerm, setSearchTerm] = useState('');
  const [prescriptions, setPrescriptions] = useState<Rx[]>([]);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const fetchPrescriptions = async (patientId?: string) => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const headers = { Authorization: `Bearer ${token}` };
      let url = `${API_URL}/prescriptions`;
      if (patientId) url += `?patient_id=${encodeURIComponent(patientId)}`;
      else url += `?limit=10`;

      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        // Normalize array of prescriptions
        setPrescriptions(Array.isArray(data) ? data : []);
      } else {
        setPrescriptions([]);
      }
    } catch (e) {
      console.error('Error fetching prescriptions', e);
      setPrescriptions([]);
    }
  };

  useEffect(() => {
    // Initial load: recent 10
    fetchPrescriptions();

    const onPrescriptionCreated = (payload: any) => {
      // If no patient filter, refresh recent list; else refresh if matches
      if (!searchTerm) fetchPrescriptions();
      else if (payload.patient_id && payload.patient_id.toUpperCase() === searchTerm.toUpperCase()) {
        fetchPrescriptions(payload.patient_id);
      }
    };

    socket.on('prescription_created', onPrescriptionCreated);
    return () => {
      socket.off('prescription_created', onPrescriptionCreated);
    };
  }, [searchTerm]);

  const filteredPrescriptions = prescriptions.filter((rx) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    const pid = (rx.patient_id || rx.patientId || '').toLowerCase();
    const pname = (rx.patient_name || rx.patientName || '').toLowerCase();
    const rid = (rx.prescription_id || rx.id || '').toLowerCase();
    return pid.includes(s) || pname.includes(s) || rid.includes(s);
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'completed':
        return <Badge className="bg-gray-100 text-gray-800">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Prescriptions</h1>
          <p className="text-muted-foreground">Manage patient prescriptions</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Prescription
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Prescription</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Patient</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="P0001">John Smith (P0001)</SelectItem>
                    <SelectItem value="P0002">Sarah Johnson (P0002)</SelectItem>
                    <SelectItem value="P0003">Michael Brown (P0003)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Diagnosis</label>
                <Textarea placeholder="Enter diagnosis..." rows={2} />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium">Medications</label>
                <div className="p-4 border rounded-lg space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select medication" />
                      </SelectTrigger>
                      <SelectContent>
                        {commonMedications.map((med) => (
                          <SelectItem key={med} value={med.toLowerCase()}>
                            {med}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input placeholder="Dosage (e.g., 10mg)" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="once">Once daily</SelectItem>
                        <SelectItem value="twice">Twice daily</SelectItem>
                        <SelectItem value="thrice">Three times daily</SelectItem>
                        <SelectItem value="four">Four times daily</SelectItem>
                        <SelectItem value="bedtime">At bedtime</SelectItem>
                        <SelectItem value="asneeded">As needed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input placeholder="Duration (e.g., 7 days)" />
                  </div>
                  <Textarea placeholder="Special instructions..." rows={2} />
                </div>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Another Medication
                </Button>
              </div>
              <Button className="w-full">Create Prescription</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search prescriptions..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {filteredPrescriptions.map((rx) => (
          <Card key={rx.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <Avatar>
                    <AvatarFallback>{rx.patientName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{rx.patientName}</span>
                      {getStatusBadge(rx.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {rx.patientId} • {rx.id}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {rx.date}
                      </span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {Array.isArray(rx.medicines || rx.medications)
                        ? (rx.medicines || rx.medications).map((med: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <Pill className="h-4 w-4 text-primary" />
                              <span className="font-medium">{med.medicine_name || med.name}</span>
                              <span className="text-muted-foreground">
                                {med.strength || med.dosage} • {med.frequency} • {med.duration}
                              </span>
                            </div>
                          ))
                        : null}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Printer className="h-4 w-4 mr-1" />
                    Print
                  </Button>
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPrescriptions.length === 0 && (
        <div className="text-center py-12">
          <Pill className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No prescriptions found</h3>
          <p className="text-muted-foreground">Try adjusting your search criteria</p>
        </div>
      )}
    </div>
  );
}
