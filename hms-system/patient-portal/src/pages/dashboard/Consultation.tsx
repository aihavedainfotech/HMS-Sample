import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, User, FileText, FlaskConical, Plus, AlertCircle, Save } from 'lucide-react';
import { toast } from 'sonner';
import socket from '@/lib/socket';
import { useSearchParams } from 'react-router-dom';
import { PrescriptionModal } from '@/components/doctor/PrescriptionModal';
import { LabOrderModal } from '@/components/doctor/LabOrderModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function Consultation() {
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('diagnosis');
  // const [isActiveConsultation, setIsActiveConsultation] = useState(false);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);

  // Diagnosis form state
  const [diagnosis, setDiagnosis] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [examinationFindings, setExaminationFindings] = useState('');
  const [vitalSigns, setVitalSigns] = useState('');
  const [savingDiagnosis, setSavingDiagnosis] = useState(false);

  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [labOrders, setLabOrders] = useState<any[]>([]);

  // Modal States
  const [showRxModal, setShowRxModal] = useState(false);
  const [showLabModal, setShowLabModal] = useState(false);

  // Auto-search if patient_id is in URL
  useEffect(() => {
    const pid = searchParams.get('patient_id');
    const aid = searchParams.get('appointment_id');

    if (aid) {
      setAppointmentId(aid);
      // setIsActiveConsultation(true);
      setActiveTab('diagnosis');
    }

    if (pid) {
      setSearchTerm(pid);
      handleSearch(pid, true);
    }
  }, [searchParams]);

  const handleSearch = async (term = searchTerm, isAutomatic = false) => {
    if (!term) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('hms_staff_token');
      const headers = { Authorization: `Bearer ${token}` };

      // If this is a manual search, clear appointment-specific context
      if (!isAutomatic) {
        setAppointmentId(null);
        // setIsActiveConsultation(false);
        setDiagnosis('');
        setChiefComplaint('');
        setExaminationFindings('');
        setVitalSigns('');
        if (activeTab === 'diagnosis' && !patient) setActiveTab('history');
      }

      // 1. Fetch Patient Details
      // Clean input (remove whitespace, uppercase)
      const cleanTerm = term.trim().toUpperCase();

      const res = await fetch(`${API_URL}/patients/${cleanTerm}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setPatient(data);
        setSearchTerm(cleanTerm); // Sync input

        // 2. Fetch History based on Patient ID
        fetchHistory(data.patient_id, headers);
      } else {
        // Patient not found. If an appointment id was provided, try to fetch appointment
        setPatient(null);
        if (appointmentId) {
          try {
            const apptRes = await fetch(`${API_URL}/appointments/${appointmentId}`, { headers });
            if (apptRes.ok) {
              await apptRes.json();
              // Appointment exists but patient record missing. Show a helpful toast and display minimal patient info.
              toast.error('Patient record missing', { description: `Appointment ${appointmentId} exists but no patient record for ID: ${cleanTerm}` });
              setPatient({ patient_id: cleanTerm, first_name: 'Unknown', last_name: '', age: '', gender: '' });
            } else {
              // No appointment found either
              toast.error('Patient not found', { description: `No patient found with ID: ${cleanTerm}` });
            }
          } catch (e) {
            console.error(e);
            toast.error('Patient not found', { description: `No patient found with ID: ${cleanTerm}` });
          }
        } else {
          toast.error('Patient not found', { description: `No patient found with ID: ${cleanTerm}` });
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Error", {
        description: "Failed to fetch patient details"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (patientId: string, headers: any) => {
    try {
      // Fetch all prescriptions for the patient (recent -> old)
      const rxRes = await fetch(`${API_URL}/prescriptions?patient_id=${patientId}`, { headers });
      if (rxRes.ok) setPrescriptions(await rxRes.json());

      // Fetch all lab orders for patient (includes attached results from backend)
      const labRes = await fetch(`${API_URL}/lab/orders?patient_id=${patientId}`, { headers });
      if (labRes.ok) setLabOrders(await labRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  // Real-time listeners: refresh lists when relevant events occur
  useEffect(() => {
    const onPrescriptionCreated = (payload: any) => {
      try {
        const token = localStorage.getItem('hms_staff_token');
        const headers = { Authorization: `Bearer ${token}` };
        if (!patient) {
          fetchRecent();
        } else if (payload.patient_id === patient.patient_id) {
          fetchHistory(patient.patient_id, headers);
        }
      } catch (e) { console.error(e); }
    };

    const onLabOrderCreated = (payload: any) => {
      try {
        const token = localStorage.getItem('hms_staff_token');
        const headers = { Authorization: `Bearer ${token}` };
        if (!patient) {
          fetchRecent();
        } else if (payload.patient_id === patient.patient_id) {
          fetchHistory(patient.patient_id, headers);
        }
      } catch (e) { console.error(e); }
    };

    const onLabResultPosted = (payload: any) => {
      try {
        const token = localStorage.getItem('hms_staff_token');
        const headers = { Authorization: `Bearer ${token}` };
        if (!patient) {
          fetchRecent();
        } else if (payload.patient_id === patient.patient_id) {
          fetchHistory(patient.patient_id, headers);
        }
      } catch (e) { console.error(e); }
    };

    socket.on('prescription_created', onPrescriptionCreated);
    socket.on('lab_order_created', onLabOrderCreated);
    socket.on('lab_result_posted', onLabResultPosted);

    return () => {
      socket.off('prescription_created', onPrescriptionCreated);
      socket.off('lab_order_created', onLabOrderCreated);
      socket.off('lab_result_posted', onLabResultPosted);
    };
  }, [patient]);

  // Fetch recent prescriptions/lab orders when no patient selected
  const fetchRecent = async () => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const headers = { Authorization: `Bearer ${token}` };

      const rxRes = await fetch(`${API_URL}/prescriptions?limit=10`, { headers });
      if (rxRes.ok) setPrescriptions(await rxRes.json());

      const labRes = await fetch(`${API_URL}/lab/orders?limit=10`, { headers });
      if (labRes.ok) setLabOrders(await labRes.json());
    } catch (e) {
      console.error('Failed to fetch recent history', e);
    }
  };

  useEffect(() => {
    if (!patient) fetchRecent();
  }, [patient]);

  const refreshHistory = () => {
    if (patient) {
      const token = localStorage.getItem('hms_staff_token');
      const headers = { Authorization: `Bearer ${token}` };
      fetchHistory(patient.patient_id, headers);
    }
  };

  const saveDiagnosis = async () => {
    setSavingDiagnosis(true);
    try {
      const token = localStorage.getItem('hms_staff_token');
      const res = await fetch(`${API_URL}/doctor/write-diagnosis`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointment_id: appointmentId,
          patient_id: patient.patient_id,
          diagnosis,
          chief_complaint: chiefComplaint,
          examination_findings: examinationFindings,
          vital_signs: vitalSigns,
        }),
      });

      if (res.ok) {
        toast.success('Diagnosis saved successfully');
        refreshHistory();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save diagnosis');
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to save diagnosis');
    } finally {
      setSavingDiagnosis(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold">Clinical Consultation</h1>
          <p className="text-muted-foreground">Search for a patient to view history or start consultation</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Enter Patient ID (e.g. P0001)"
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button onClick={() => handleSearch()} disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </div>
      </div>

      {!patient && (
        <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed">
          <User className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No patient selected</h3>
          <p className="text-sm text-muted-foreground">Showing the 10 most recent records across all patients</p>
        </div>
      )}

      <div className="space-y-6">
        {patient && (
          <div className="animate-in fade-in duration-500">
            {/* Patient Header Card */}
            <Card className="bg-slate-50 border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <Avatar className="h-20 w-20 border-4 border-white shadow-sm">
                    <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                      {patient.first_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold">
                        {patient.first_name} {patient.last_name}
                      </h2>
                      <Badge variant="outline" className="text-sm bg-white font-mono">
                        {patient.patient_id}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" /> {patient.age} yrs / {patient.gender}
                      </span>
                      <span>•</span>
                      <span>Blood Group: <span className="font-semibold text-slate-700">{patient.blood_group || 'Unknown'}</span></span>
                      <span>•</span>
                      <span>{patient.mobile_number}</span>
                    </div>
                    {/* Allergies Alert */}
                    {patient.known_allergies && (
                      <div className="flex items-center gap-2 mt-3 p-2 bg-red-50 text-red-700 text-sm rounded border border-red-100 w-fit">
                        <AlertCircle className="h-4 w-4" />
                        <span className="font-semibold">Allergies:</span> {patient.known_allergies}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 w-full md:w-auto">
                    <Button className="w-full justify-start bg-blue-600 hover:bg-blue-700" onClick={() => setShowRxModal(true)}>
                      <Plus className="mr-2 h-4 w-4" /> New Prescription
                    </Button>
                    <Button variant="outline" className="w-full justify-start border-purple-200 hover:bg-purple-50 text-purple-700 hover:text-purple-800" onClick={() => setShowLabModal(true)}>
                      <FlaskConical className="mr-2 h-4 w-4" /> Order Lab Test
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Clinical Data Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className={`grid w-full ${patient ? 'md:w-[800px] grid-cols-4' : 'md:w-[400px] grid-cols-2'} bg-slate-100 p-1`}>
            {patient && <TabsTrigger value="diagnosis" className="gap-2"><AlertCircle className="h-4 w-4" /> Diagnosis</TabsTrigger>}
            {patient && <TabsTrigger value="history">Clinical History</TabsTrigger>}
            <TabsTrigger value="prescriptions">{patient ? 'Prescriptions' : 'Recent Prescriptions'} ({prescriptions.length})</TabsTrigger>
            <TabsTrigger value="labs">{patient ? 'Lab Results' : 'Recent Lab Results'} ({labOrders.length})</TabsTrigger>
          </TabsList>

          {patient && (
            <TabsContent value="diagnosis" className="space-y-4 pt-2 bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold block mb-2">Chief Complaint</label>
                  <Textarea
                    placeholder="e.g., Headache, Fever, Cough..."
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold block mb-2">Examination Findings</label>
                  <Textarea
                    placeholder="Clinical observations and examination results..."
                    value={examinationFindings}
                    onChange={(e) => setExaminationFindings(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold block mb-2">Vital Signs</label>
                  <Input
                    placeholder="e.g., BP: 120/80, Temp: 98.6°F, HR: 72, RR: 16"
                    value={vitalSigns}
                    onChange={(e) => setVitalSigns(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold block mb-2">Diagnosis</label>
                  <Textarea
                    placeholder="Primary and differential diagnoses..."
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    className="min-h-[120px]"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={saveDiagnosis}
                    disabled={savingDiagnosis || !diagnosis.trim()}
                    className="gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <Save className="h-4 w-4" />
                    {savingDiagnosis ? 'Saving...' : 'Save Diagnosis'}
                  </Button>
                  <Button
                    onClick={() => setShowRxModal(true)}
                    variant="outline"
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Write Prescription
                  </Button>
                  <Button
                    onClick={() => setShowLabModal(true)}
                    variant="outline"
                    className="gap-2"
                  >
                    <FlaskConical className="h-4 w-4" />
                    Order Lab Test
                  </Button>
                </div>
              </div>
            </TabsContent>
          )}

          {patient && (
            <TabsContent value="history" className="space-y-4 pt-2">
              <Card>
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-lg">Medical History Summary</CardTitle>
                  <CardDescription>Overview of chronic conditions and past surgeries</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Chronic Conditions</h4>
                      <div className="p-4 bg-amber-50 rounded-lg border border-amber-100 text-amber-900">
                        {patient.chronic_conditions || 'No chronic conditions recorded.'}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Previous Surgeries</h4>
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-slate-800">
                        {patient.previous_surgeries || 'No previous surgeries recorded.'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="prescriptions" className="space-y-4 pt-2">
            {prescriptions.map((px) => (
              <Card key={px.prescription_id} className="overflow-hidden">
                <CardHeader className="bg-slate-50/50 pb-3 border-b">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base font-bold flex items-center gap-2 font-mono text-blue-700">
                        <FileText className="h-4 w-4" />
                        {px.prescription_id}
                        {!patient && <span className="text-muted-foreground font-normal ml-2">[{px.patient_name}]</span>}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {new Date(px.prescription_date).toLocaleDateString()} • Dr. {px.doctor_name}
                      </CardDescription>
                    </div>
                    <Badge variant={px.status === 'Active' ? 'default' : 'secondary'}>{px.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="mb-4">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">Diagnosis</span>
                    <p className="text-sm font-medium mt-1">{px.diagnosis}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">Medicines</span>
                    <div className="space-y-2">
                      {px.medicines?.map((med: any, i: number) => (
                        <div key={i} className="text-sm bg-slate-50 p-2 rounded border flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <div className="font-medium text-slate-900">{med.medicine_name} <span className="text-muted-foreground font-normal">({med.strength})</span></div>
                          <div className="text-slate-600 text-xs sm:text-sm font-mono bg-white px-2 py-0.5 rounded border">{med.frequency} • {med.duration}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {prescriptions.length === 0 && (
              <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed text-muted-foreground">
                <FileText className="h-10 w-10 opacity-20 mx-auto mb-2" />
                No prescription history found.
              </div>
            )}
          </TabsContent>

          <TabsContent value="labs" className="space-y-4 pt-2">
            {labOrders.map((order) => (
              <Card key={order.lab_order_id || order.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-purple-100 p-2 rounded-full mt-1">
                      <FlaskConical className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">
                        {order.test_name}
                        {!patient && <span className="text-muted-foreground font-normal ml-2">[{order.patient_name}]</span>}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Ordered on {new Date(order.order_date).toLocaleDateString()} by {order.doctor_name}
                      </p>
                      {order.clinical_notes && (
                        <p className="text-xs text-slate-500 mt-1 italic">"{order.clinical_notes}"</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                    <Badge variant={order.status === 'Verified' ? 'default' : 'outline'} className={order.status === 'Pending' ? 'bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200' : ''}>
                      {order.status}
                    </Badge>
                    {order.result_value ? (
                      <div className="text-sm font-mono bg-slate-100 px-2 py-1 rounded">
                        Result: <span className="font-bold">{order.result_value}</span> {order.unit}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Result pending</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {labOrders.length === 0 && (
              <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed text-muted-foreground">
                <FlaskConical className="h-10 w-10 opacity-20 mx-auto mb-2" />
                No lab orders found.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      {patient && (
        <>
          <PrescriptionModal
            patientId={patient.patient_id}
            appointmentId={appointmentId}
            open={showRxModal}
            onOpenChange={setShowRxModal}
            onSuccess={refreshHistory}
          />
          <LabOrderModal
            patientId={patient.patient_id}
            appointmentId={appointmentId}
            open={showLabModal}
            onOpenChange={setShowLabModal}
            onSuccess={refreshHistory}
          />
        </>
      )}
    </div>
  );
}
