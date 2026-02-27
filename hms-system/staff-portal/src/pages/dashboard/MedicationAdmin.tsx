import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Pill, Clock, CheckCircle2, AlertCircle, Search, Calendar } from 'lucide-react';

const mockMedications = [
  {
    id: 1,
    patientId: 'ADM0001',
    patientName: 'John Smith',
    room: '201-A',
    medication: 'Amoxicillin 500mg',
    dosage: '1 tablet',
    route: 'Oral',
    frequency: 'Three times daily',
    time: '08:00 AM',
    status: 'pending',
    instructions: 'Take with food',
  },
  {
    id: 2,
    patientId: 'ADM0001',
    patientName: 'John Smith',
    room: '201-A',
    medication: 'Paracetamol 650mg',
    dosage: '1 tablet',
    route: 'Oral',
    frequency: 'Every 6 hours',
    time: '08:00 AM',
    status: 'administered',
    administeredAt: '08:15 AM',
    administeredBy: 'Nurse Jane',
    instructions: 'For fever',
  },
  {
    id: 3,
    patientId: 'ADM0002',
    patientName: 'Sarah Johnson',
    room: '202-B',
    medication: 'Insulin Glargine',
    dosage: '20 units',
    route: 'Subcutaneous',
    frequency: 'Once daily',
    time: '09:00 AM',
    status: 'pending',
    instructions: 'Before breakfast',
  },
  {
    id: 4,
    patientId: 'ADM0003',
    patientName: 'Michael Brown',
    room: '203-A',
    medication: 'Metformin 500mg',
    dosage: '1 tablet',
    route: 'Oral',
    frequency: 'Twice daily',
    time: '08:00 AM',
    status: 'overdue',
    instructions: 'With meals',
  },
];

export default function MedicationAdmin() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredMeds = mockMedications.filter(
    (med) =>
      (filterStatus === 'all' || med.status === filterStatus) &&
      (med.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        med.medication.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'administered':
        return <Badge className="bg-green-100 text-green-800">Administered</Badge>;
      case 'pending':
        return <Badge className="bg-blue-100 text-blue-800">Pending</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800">Overdue</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'administered':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'overdue':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Medication Administration</h1>
          <p className="text-muted-foreground">Track and record medication administration</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search patients or medications..."
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
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="administered">Administered</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {filteredMeds.map((med) => (
          <Card key={med.id} className={med.status === 'overdue' ? 'border-red-300' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="mt-1">{getStatusIcon(med.status)}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Pill className="h-4 w-4 text-primary" />
                      <span className="font-medium">{med.medication}</span>
                      {getStatusBadge(med.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {med.patientName} • {med.patientId} • Room {med.room}
                    </p>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm">
                      <span>
                        <span className="text-muted-foreground">Dosage:</span> {med.dosage}
                      </span>
                      <span>
                        <span className="text-muted-foreground">Route:</span> {med.route}
                      </span>
                      <span>
                        <span className="text-muted-foreground">Frequency:</span> {med.frequency}
                      </span>
                      <span>
                        <span className="text-muted-foreground">Time:</span> {med.time}
                      </span>
                    </div>
                    {med.instructions && (
                      <p className="text-sm text-amber-600 mt-2">
                        <span className="font-medium">Instructions:</span> {med.instructions}
                      </p>
                    )}
                    {med.status === 'administered' && (
                      <p className="text-sm text-green-600 mt-2">
                        Administered at {med.administeredAt} by {med.administeredBy}
                      </p>
                    )}
                  </div>
                </div>
                {med.status === 'pending' && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm">Administer</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Confirm Medication Administration</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="bg-slate-50 p-4 rounded-lg">
                          <p className="font-medium">{med.medication}</p>
                          <p className="text-sm text-muted-foreground">
                            {med.dosage} • {med.route}
                          </p>
                          <p className="text-sm mt-2">Patient: {med.patientName}</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <Checkbox id="confirm" />
                          <label htmlFor="confirm" className="text-sm">
                            I confirm that I have verified the patient's identity and the
                            medication details before administration.
                          </label>
                        </div>
                        <Button className="w-full">Confirm Administration</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMeds.length === 0 && (
        <div className="text-center py-12">
          <Pill className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No medications found</h3>
          <p className="text-muted-foreground">Try adjusting your search or filter criteria</p>
        </div>
      )}
    </div>
  );
}
