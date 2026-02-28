import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { UserPlus, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const genders = ['Male', 'Female', 'Other'];

export default function PatientRegistration() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    blood_group: '',
    mobile_number: '',
    email: '',
    emergency_contact_name: '',
    emergency_contact_number: '',
    current_address_street: '',
    current_city: '',
    current_state: '',
    current_pincode: '',
  });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [registeredPatientId, setRegisteredPatientId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('hms_staff_token');
      const API_URL = import.meta.env.VITE_API_URL || '/api';

      const res = await fetch(`${API_URL}/patients/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Registration failed');

      toast.success(`Patient registered successfully! ID: ${data.patient_id}`);
      setRegisteredPatientId(data.patient_id);
      setShowSuccessModal(true);

      setFormData({
        first_name: '',
        last_name: '',
        date_of_birth: '',
        gender: '',
        blood_group: '',
        mobile_number: '',
        email: '',
        emergency_contact_name: '',
        emergency_contact_number: '',
        current_address_street: '',
        current_city: '',
        current_state: '',
        current_pincode: '',
      });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (showSuccessModal) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-green-600 flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Registration Successful
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>Patient <strong>{formData.first_name} {formData.last_name}</strong> has been registered with ID: <strong>{registeredPatientId}</strong></p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowSuccessModal(false)}>
                Close
              </Button>
              <Button asChild>
                <Link to={`/receptionist/appointments/book?patient_id=${registeredPatientId}`}>
                  Book Appointment
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Patient Registration</h1>
        <p className="text-muted-foreground">Register a new patient in the system</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            New Patient Registration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth *</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => setFormData({ ...formData, gender: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {genders.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="blood_group">Blood Group</Label>
                <Select
                  value={formData.blood_group}
                  onValueChange={(value) => setFormData({ ...formData, blood_group: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select blood group" />
                  </SelectTrigger>
                  <SelectContent>
                    {bloodGroups.map((bg) => (
                      <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile_number">Mobile Number *</Label>
                <Input
                  id="mobile_number"
                  value={formData.mobile_number}
                  onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Emergency Contact</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_name">Contact Name</Label>
                  <Input
                    id="emergency_contact_name"
                    value={formData.emergency_contact_name}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_number">Contact Number</Label>
                  <Input
                    id="emergency_contact_number"
                    value={formData.emergency_contact_number}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_number: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Address</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current_address_street">Street Address</Label>
                  <Input
                    id="current_address_street"
                    value={formData.current_address_street}
                    onChange={(e) => setFormData({ ...formData, current_address_street: e.target.value })}
                  />
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="current_city">City</Label>
                    <Input
                      id="current_city"
                      value={formData.current_city}
                      onChange={(e) => setFormData({ ...formData, current_city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="current_state">State</Label>
                    <Input
                      id="current_state"
                      value={formData.current_state}
                      onChange={(e) => setFormData({ ...formData, current_state: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="current_pincode">PIN Code</Label>
                    <Input
                      id="current_pincode"
                      value={formData.current_pincode}
                      onChange={(e) => setFormData({ ...formData, current_pincode: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Registering...
                </>
              ) : (
                'Register Patient'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
