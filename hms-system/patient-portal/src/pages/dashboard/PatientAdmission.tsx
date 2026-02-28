import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  User,
  Bed,
  Stethoscope,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const admissionTypes = [
  { value: 'Emergency', label: 'Emergency' },
  { value: 'Elective', label: 'Elective' },
  { value: 'Maternity', label: 'Maternity' },
  { value: 'Day_Care', label: 'Day Care' },
];

const paymentTypes = [
  { value: 'Cash', label: 'Cash' },
  { value: 'Insurance', label: 'Insurance' },
  { value: 'Corporate', label: 'Corporate' },
  { value: 'Government', label: 'Government' },
];

export default function PatientAdmission() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: '',
    admitting_doctor_id: '',
    bed_id: '',
    admission_reason: '',
    admission_type: '',
    provisional_diagnosis: '',
    guardian_name: '',
    guardian_relation: '',
    guardian_contact: '',
    payment_type: '',
    insurance_provider: '',
    policy_number: '',
    advance_payment: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('hms_token');
      const response = await fetch(`${API_URL}/admissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          advance_payment: parseFloat(formData.advance_payment) || 0,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Patient admitted successfully! Admission ID: ${data.admission_id}`);
        setFormData({
          patient_id: '',
          admitting_doctor_id: '',
          bed_id: '',
          admission_reason: '',
          admission_type: '',
          provisional_diagnosis: '',
          guardian_name: '',
          guardian_relation: '',
          guardian_contact: '',
          payment_type: '',
          insurance_provider: '',
          policy_number: '',
          advance_payment: '',
        });
      } else {
        toast.error(data.error || 'Failed to admit patient');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Patient Admission</h1>
        <p className="text-muted-foreground">Admit a new patient to the hospital</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Patient Information */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <User className="h-5 w-5" />
                Patient Information
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="patient_id">Patient ID *</Label>
                  <Input
                    id="patient_id"
                    placeholder="e.g., P0001"
                    value={formData.patient_id}
                    onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doctor_id">Admitting Doctor ID *</Label>
                  <Input
                    id="doctor_id"
                    placeholder="e.g., DOC001"
                    value={formData.admitting_doctor_id}
                    onChange={(e) => setFormData({ ...formData, admitting_doctor_id: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Admission Details */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Bed className="h-5 w-5" />
                Admission Details
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bed_id">Bed ID *</Label>
                  <Input
                    id="bed_id"
                    placeholder="e.g., ICU-001"
                    value={formData.bed_id}
                    onChange={(e) => setFormData({ ...formData, bed_id: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admission_type">Admission Type *</Label>
                  <Select
                    value={formData.admission_type}
                    onValueChange={(value) => setFormData({ ...formData, admission_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {admissionTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admission_reason">Admission Reason *</Label>
                <Input
                  id="admission_reason"
                  placeholder="Reason for admission"
                  value={formData.admission_reason}
                  onChange={(e) => setFormData({ ...formData, admission_reason: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="diagnosis">Provisional Diagnosis</Label>
                <Input
                  id="diagnosis"
                  placeholder="Initial diagnosis"
                  value={formData.provisional_diagnosis}
                  onChange={(e) => setFormData({ ...formData, provisional_diagnosis: e.target.value })}
                />
              </div>
            </div>

            {/* Guardian Information */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold flex items-center gap-2">
                <User className="h-5 w-5" />
                Guardian Information
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="guardian_name">Guardian Name</Label>
                  <Input
                    id="guardian_name"
                    value={formData.guardian_name}
                    onChange={(e) => setFormData({ ...formData, guardian_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guardian_relation">Relation</Label>
                  <Input
                    id="guardian_relation"
                    value={formData.guardian_relation}
                    onChange={(e) => setFormData({ ...formData, guardian_relation: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guardian_contact">Contact Number</Label>
                  <Input
                    id="guardian_contact"
                    value={formData.guardian_contact}
                    onChange={(e) => setFormData({ ...formData, guardian_contact: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                Payment Information
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment_type">Payment Type *</Label>
                  <Select
                    value={formData.payment_type}
                    onValueChange={(value) => setFormData({ ...formData, payment_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment type" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="advance_payment">Advance Payment (₹)</Label>
                  <Input
                    id="advance_payment"
                    type="number"
                    placeholder="0.00"
                    value={formData.advance_payment}
                    onChange={(e) => setFormData({ ...formData, advance_payment: e.target.value })}
                  />
                </div>
              </div>
              {formData.payment_type === 'Insurance' && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="insurance_provider">Insurance Provider</Label>
                    <Input
                      id="insurance_provider"
                      value={formData.insurance_provider}
                      onChange={(e) => setFormData({ ...formData, insurance_provider: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="policy_number">Policy Number</Label>
                    <Input
                      id="policy_number"
                      value={formData.policy_number}
                      onChange={(e) => setFormData({ ...formData, policy_number: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button type="submit" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Admitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Admit Patient
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
