import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { HeartPulse, Thermometer, Activity, Wind, Search, Plus } from 'lucide-react';

const mockPatients = [
  {
    id: 'ADM0001',
    name: 'John Smith',
    age: 45,
    room: '201-A',
    vitals: {
      bp: '120/80',
      pulse: 72,
      temp: 98.6,
      spo2: 98,
      respiration: 16,
    },
    lastUpdated: '2024-01-15 09:30 AM',
    status: 'stable',
  },
  {
    id: 'ADM0002',
    name: 'Sarah Johnson',
    age: 32,
    room: '202-B',
    vitals: {
      bp: '140/90',
      pulse: 88,
      temp: 101.2,
      spo2: 95,
      respiration: 20,
    },
    lastUpdated: '2024-01-15 10:15 AM',
    status: 'critical',
  },
  {
    id: 'ADM0003',
    name: 'Michael Brown',
    age: 58,
    room: '203-A',
    vitals: {
      bp: '118/76',
      pulse: 68,
      temp: 98.4,
      spo2: 99,
      respiration: 14,
    },
    lastUpdated: '2024-01-15 08:45 AM',
    status: 'stable',
  },
];

export default function VitalSigns() {
  const [searchTerm, setSearchTerm] = useState('');
  const [_selectedPatient, _setSelectedPatient] = useState<string | null>(null);

  const filteredPatients = mockPatients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'stable':
        return <Badge className="bg-green-100 text-green-800">Stable</Badge>;
      case 'critical':
        return <Badge className="bg-red-100 text-red-800">Critical</Badge>;
      case 'monitoring':
        return <Badge className="bg-yellow-100 text-yellow-800">Monitoring</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vital Signs Monitoring</h1>
          <p className="text-muted-foreground">Record and monitor patient vital signs</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Record Vitals
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Record Vital Signs</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Select Patient</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockPatients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.name} - Room {patient.room}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Blood Pressure (mmHg)</label>
                  <Input placeholder="120/80" />
                </div>
                <div>
                  <label className="text-sm font-medium">Pulse (bpm)</label>
                  <Input type="number" placeholder="72" />
                </div>
                <div>
                  <label className="text-sm font-medium">Temperature (°F)</label>
                  <Input type="number" step="0.1" placeholder="98.6" />
                </div>
                <div>
                  <label className="text-sm font-medium">SpO2 (%)</label>
                  <Input type="number" placeholder="98" />
                </div>
                <div>
                  <label className="text-sm font-medium">Respiration (/min)</label>
                  <Input type="number" placeholder="16" />
                </div>
              </div>
              <Button className="w-full">Save Vital Signs</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search patients by name or ID..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredPatients.map((patient) => (
          <Card key={patient.id} className={patient.status === 'critical' ? 'border-red-300' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{patient.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">{patient.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {patient.id} • Room {patient.room}
                    </p>
                  </div>
                </div>
                {getStatusBadge(patient.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">BP</p>
                    <p className="font-medium">{patient.vitals.bp}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <HeartPulse className="h-4 w-4 text-red-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Pulse</p>
                    <p className="font-medium">{patient.vitals.pulse} bpm</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Temp</p>
                    <p className="font-medium">{patient.vitals.temp}°F</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Wind className="h-4 w-4 text-cyan-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">SpO2</p>
                    <p className="font-medium">{patient.vitals.spo2}%</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Last updated: {patient.lastUpdated}
              </p>
              <Button variant="outline" className="w-full mt-4" size="sm">
                Update Vitals
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
