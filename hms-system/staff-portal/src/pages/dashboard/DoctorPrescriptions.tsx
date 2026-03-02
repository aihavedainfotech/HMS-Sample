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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedPrescription, setSelectedPrescription] = useState<Rx | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [medications, setMedications] = useState<Array<{ med: string, dosage: string, frequency: string, duration: string, instructions: string }>>([{ med: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
  const [diagnosis, setDiagnosis] = useState('');
  const [creating, setCreating] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const fetchPrescriptions = async (patientId?: string) => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('hms_staff_token');
      if (!token) {
        setError('No authentication token found');
        setLoading(false);
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      // Build URL - if patient ID provided, filter by patient; otherwise get all for doctor
      let url = `${API_URL}/prescriptions`;
      if (patientId && patientId.trim()) {
        url += `?patient_id=${encodeURIComponent(patientId.trim().toUpperCase())}`;
      }

      console.log('Fetching from:', url);
      const res = await fetch(url, { headers });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Fetch error:', errorData);
        setError(`Failed to fetch prescriptions: ${res.status}`);
        setPrescriptions([]);
        setLoading(false);
        return;
      }

      const data = await res.json();
      console.log('Prescriptions data:', data);

      // Ensure data is an array
      let presArray = Array.isArray(data) ? data : (data.prescriptions || []);

      // Sort by date (most recent first)
      presArray.sort((a: any, b: any) => {
        const dateA = new Date(a.prescription_date || a.date || 0).getTime();
        const dateB = new Date(b.prescription_date || b.date || 0).getTime();
        return dateB - dateA;
      });

      setPrescriptions(presArray);
      console.log('Set prescriptions:', presArray.length);
    } catch (e) {
      console.error('Error fetching prescriptions', e);
      setError(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const lookupPatient = async (pid: string) => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(`${API_URL}/patient/${pid.toUpperCase()}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setPatientName(data.first_name && data.last_name ? `${data.first_name} ${data.last_name}` : 'Patient not found');
      } else {
        setPatientName('Patient not found');
      }
    } catch (e) {
      console.error('Error looking up patient:', e);
      setPatientName('Error loading patient');
    }
  };

  const handlePatientIdChange = (pid: string) => {
    setPatientId(pid.toUpperCase());
    if (pid.trim().length > 0) {
      lookupPatient(pid);
    } else {
      setPatientName('');
    }
  };

  const addMedication = () => {
    setMedications([...medications, { med: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
  };

  const updateMedication = (index: number, field: string, value: string) => {
    const newMeds = [...medications];
    (newMeds[index] as any)[field] = value;
    setMedications(newMeds);
  };

  const removeMedication = (index: number) => {
    if (medications.length > 1) {
      setMedications(medications.filter((_, i) => i !== index));
    }
  };

  const createPrescription = async () => {
    if (!patientId.trim()) {
      alert('Please enter a patient ID');
      return;
    }
    if (!diagnosis.trim()) {
      alert('Please enter a diagnosis');
      return;
    }
    if (!medications[0]?.med) {
      alert('Please add at least one medication');
      return;
    }

    setCreating(true);
    try {
      const token = localStorage.getItem('hms_staff_token');
      if (!token) {
        alert('No authentication token found');
        return;
      }

      const medicinesData = medications
        .filter(m => m.med && m.dosage && m.frequency && m.duration)
        .map(m => ({
          medicine_name: m.med,
          dosage: m.dosage,
          frequency: m.frequency,
          duration: m.duration,
          instructions: m.instructions
        }));

      const payload = {
        patient_id: patientId,
        diagnosis,
        medicines: medicinesData
      };

      console.log('Creating prescription with:', payload);
      const res = await fetch(`${API_URL}/prescriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        alert(`Error creating prescription: ${errorData.error || res.status}`);
        return;
      }

      const newRx = await res.json();

      // Add to prescriptions list
      setPrescriptions([newRx, ...prescriptions]);

      // Reset form
      setPatientId('');
      setPatientName('');
      setDiagnosis('');
      setMedications([{ med: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
      setCreateDialogOpen(false);

      alert('Prescription created successfully!');
    } catch (e) {
      console.error('Error creating prescription:', e);
      alert(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    // Initial load: all prescriptions from this doctor
    fetchPrescriptions();

    const onPrescriptionCreated = (payload: any) => {
      console.log('Prescription created event:', payload);
      // Refresh to show new prescription
      if (searchTerm) {
        fetchPrescriptions(searchTerm);
      } else {
        fetchPrescriptions();
      }
    };

    socket.on('prescription_created', onPrescriptionCreated);
    return () => {
      socket.off('prescription_created', onPrescriptionCreated);
    };
  }, []);

  // Handle search - triggered when user submits
  const handleSearch = (patientId: string) => {
    fetchPrescriptions(patientId);
  };

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

  const handleViewPrescription = (rx: Rx) => {
    setSelectedPrescription(rx);
    setViewDialogOpen(true);
  };

  const handlePrintPrescription = (rx: Rx) => {
    // Create a printable version
    const printContent = `
      <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 800px;">
        <h1 style="text-align: center; margin-bottom: 30px;">PRESCRIPTION</h1>
        
        <div style="border: 1px solid #ccc; padding: 15px; margin-bottom: 20px;">
          <p><strong>Patient Name:</strong> ${rx.patient_name || 'N/A'}</p>
          <p><strong>Patient ID:</strong> ${rx.patient_id || 'N/A'}</p>
          <p><strong>Date:</strong> ${new Date(rx.prescription_date || Date.now()).toLocaleDateString()}</p>
          <p><strong>Doctor:</strong> ${rx.doctor_name || 'N/A'}</p>
          <p><strong>Rx:</strong> ${rx.prescription_id || 'N/A'}</p>
          <p><strong>Status:</strong> ${rx.status || 'active'}</p>
        </div>

        <div style="margin-bottom: 20px;">
          <h3>DIAGNOSIS</h3>
          <p style="padding: 10px; background-color: #f5f5f5; border-radius: 4px;">
            ${rx.diagnosis || 'N/A'}
          </p>
        </div>

        <div style="margin-bottom: 20px;">
          <h3>MEDICATIONS</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f5f5f5;">
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Medicine</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Strength</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Frequency</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Duration</th>
              </tr>
            </thead>
            <tbody>
              ${Array.isArray(rx.medicines)
        ? rx.medicines
          .map(
            (med: any) => `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 10px;">${med.medicine_name || 'N/A'}</td>
                  <td style="border: 1px solid #ddd; padding: 10px;">${med.strength || 'N/A'}</td>
                  <td style="border: 1px solid #ddd; padding: 10px;">${med.frequency || 'N/A'}</td>
                  <td style="border: 1px solid #ddd; padding: 10px;">${med.duration || 'N/A'}</td>
                </tr>
              `
          )
          .join('')
        : '<tr><td colspan="4" style="border: 1px solid #ddd; padding: 10px;">No medications</td></tr>'
      }
            </tbody>
          </table>
        </div>

        ${rx.medicines && rx.medicines.some((m: any) => m.instructions)
        ? `
        <div style="margin-bottom: 20px;">
          <h3>INSTRUCTIONS</h3>
          <ul>
            ${rx.medicines.map((med: any) => (med.instructions ? `<li>${med.medicine_name}: ${med.instructions}</li>` : '')).join('')}
          </ul>
        </div>
        `
        : ''
      }

        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd;">
          <p style="margin-bottom: 60px;">Doctor Signature: ________________________</p>
          <p style="font-size: 12px; color: #666;">Printed on: ${new Date().toLocaleString()}</p>
        </div>
      </div>
    `;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Prescriptions</h1>
          <p className="text-muted-foreground">Manage patient prescriptions</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Prescription
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Prescription</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Patient ID Lookup */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Patient ID</label>
                <Input
                  placeholder="Enter patient ID (e.g., P0001)"
                  value={patientId}
                  onChange={(e) => handlePatientIdChange(e.target.value)}
                  className="uppercase"
                />
                {patientId && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm">
                      <span className="font-medium">Patient Name:</span> {patientName}
                    </p>
                  </div>
                )}
              </div>

              {/* Diagnosis */}
              <div>
                <label className="text-sm font-medium">Diagnosis</label>
                <Textarea
                  placeholder="Enter diagnosis..."
                  rows={2}
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                />
              </div>

              {/* Medications */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Medications</label>
                <div className="space-y-3">
                  {medications.map((med, idx) => (
                    <div key={idx} className="p-4 border rounded-lg space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground">Medicine</label>
                          <Select value={med.med} onValueChange={(val) => updateMedication(idx, 'med', val)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select medication" />
                            </SelectTrigger>
                            <SelectContent>
                              {commonMedications.map((m) => (
                                <SelectItem key={m} value={m.toLowerCase()}>
                                  {m}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Dosage</label>
                          <Input
                            placeholder="e.g., 10mg"
                            value={med.dosage}
                            onChange={(e) => updateMedication(idx, 'dosage', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground">Frequency</label>
                          <Select value={med.frequency} onValueChange={(val) => updateMedication(idx, 'frequency', val)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select frequency" />
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
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Duration</label>
                          <Input
                            placeholder="e.g., 7 days"
                            value={med.duration}
                            onChange={(e) => updateMedication(idx, 'duration', e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Special Instructions</label>
                        <Textarea
                          placeholder="Special instructions..."
                          rows={2}
                          value={med.instructions}
                          onChange={(e) => updateMedication(idx, 'instructions', e.target.value)}
                        />
                      </div>
                      {medications.length > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => removeMedication(idx)}
                        >
                          Remove Medication
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" onClick={addMedication} className="w-full">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Another Medication
                </Button>
              </div>

              <Button
                className="w-full"
                onClick={createPrescription}
                disabled={creating}
              >
                {creating ? 'Creating...' : 'Create Prescription'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by patient ID (e.g., P0001)..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearch(searchTerm);
              }
            }}
          />
        </div>
        <Button onClick={() => handleSearch(searchTerm)}>
          Search
        </Button>
        {searchTerm && (
          <Button variant="outline" onClick={() => {
            setSearchTerm('');
            fetchPrescriptions();
          }}>
            Clear
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800">
            <p className="font-medium">Error: {error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading prescriptions...</p>
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="text-center py-12">
            <Pill className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No prescriptions found</h3>
            <p className="text-muted-foreground">
              {searchTerm
                ? `No prescriptions found for patient ${searchTerm}`
                : 'Create a new prescription to get started'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Showing {prescriptions.length} prescription{prescriptions.length !== 1 ? 's' : ''}
              {searchTerm ? ` for patient ${searchTerm}` : ' (all recent prescriptions)'}
            </p>

            {prescriptions.map((rx) => (
              <Card key={rx.id || rx.prescription_id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <Avatar>
                        <AvatarFallback>
                          {(rx.patient_name || rx.patientName || 'P').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{rx.patient_name || rx.patientName || 'Unknown'}</span>
                          {getStatusBadge(rx.status || 'active')}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {rx.patient_id || rx.patientId || 'N/A'} • Rx: {rx.prescription_id || rx.id || 'N/A'}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(rx.prescription_date || rx.date || Date.now()).toLocaleDateString()}
                          </span>
                        </div>

                        {rx.diagnosis && (
                          <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                            <span className="font-medium">Diagnosis: </span>
                            <span className="text-muted-foreground">{rx.diagnosis}</span>
                          </div>
                        )}

                        <div className="mt-3 space-y-2">
                          {Array.isArray(rx.medicines || rx.medications)
                            ? (rx.medicines || rx.medications).map((med: any, idx: number) => (
                              <div key={idx} className="flex items-start gap-2 text-sm">
                                <Pill className="h-4 w-4 text-primary mt-0.5" />
                                <span>
                                  <span className="font-medium">{med.medicine_name || med.name || 'Unknown'}</span>
                                  <span className="text-muted-foreground"> • {med.strength || med.dosage || 'N/A'} • {med.frequency || 'N/A'} • {med.duration || 'N/A'}</span>
                                  {med.instructions && <div className="text-xs text-muted-foreground mt-1">Instructions: {med.instructions}</div>}
                                </span>
                              </div>
                            ))
                            : <p className="text-sm text-muted-foreground">No medications listed</p>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrintPrescription(rx)}
                      >
                        <Printer className="h-4 w-4 mr-1" />
                        Print
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewPrescription(rx)}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* View Prescription Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prescription Details</DialogTitle>
          </DialogHeader>

          {selectedPrescription && (
            <div className="space-y-4">
              {/* Patient Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Patient Name</p>
                  <p className="text-lg font-semibold">{selectedPrescription.patient_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Patient ID</p>
                  <p className="text-lg font-semibold">{selectedPrescription.patient_id || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Prescription ID</p>
                  <p className="text-lg font-semibold">{selectedPrescription.prescription_id || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date</p>
                  <p className="text-lg font-semibold">
                    {new Date(selectedPrescription.prescription_date || Date.now()).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Doctor Info */}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Prescribed By</p>
                <p className="text-lg font-semibold">{selectedPrescription.doctor_name || 'N/A'}</p>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-muted-foreground">Status:</p>
                {getStatusBadge(selectedPrescription.status || 'active')}
              </div>

              {/* Diagnosis */}
              {selectedPrescription.diagnosis && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Diagnosis</h3>
                  <p className="p-3 bg-blue-50 rounded text-sm">{selectedPrescription.diagnosis}</p>
                </div>
              )}

              {/* Medications */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Medications</h3>
                {Array.isArray(selectedPrescription.medicines) && selectedPrescription.medicines.length > 0 ? (
                  <div className="space-y-3">
                    {selectedPrescription.medicines.map((med: any, idx: number) => (
                      <div key={idx} className="p-3 border rounded">
                        <p className="font-medium">{med.medicine_name || 'Unknown'}</p>
                        <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Strength:</span>
                            <p className="font-medium">{med.strength || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Frequency:</span>
                            <p className="font-medium">{med.frequency || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Duration:</span>
                            <p className="font-medium">{med.duration || 'N/A'}</p>
                          </div>
                        </div>
                        {med.instructions && (
                          <div className="mt-2 text-sm">
                            <span className="text-muted-foreground">Instructions:</span>
                            <p className="text-sm italic">{med.instructions}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No medications listed</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 border-t pt-4">
                <Button
                  onClick={() => handlePrintPrescription(selectedPrescription)}
                  className="flex-1"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Prescription
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setViewDialogOpen(false)}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
