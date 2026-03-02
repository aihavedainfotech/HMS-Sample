import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  User,
  Droplet,
  Calendar,
  Loader2,
  Save,
  Lock,
  Camera,
} from 'lucide-react';
import type { Patient } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function Profile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [formData, setFormData] = useState({
    mobile_number: '',
    email: '',
    emergency_contact_name: '',
    emergency_contact_number: '',
    current_address_street: '',
    current_city: '',
    current_state: '',
    current_pincode: '',
    known_allergies: '',
    chronic_conditions: '',
    current_medications: '',
  });

  useEffect(() => {
    fetchPatientProfile();
  }, []);

  const fetchPatientProfile = async () => {
    try {
      const token = localStorage.getItem('hms_token');
      const patientId = (user as {patient_id?: string; staff_id?: string})?.patient_id;
      const response = await fetch(`${API_URL}/patients/${patientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      
      if (data.patient_id) {
        setPatient(data);
        setFormData({
          mobile_number: data.mobile_number || '',
          email: data.email || '',
          emergency_contact_name: data.emergency_contact_name || '',
          emergency_contact_number: data.emergency_contact_number || '',
          current_address_street: data.current_address_street || '',
          current_city: data.current_city || '',
          current_state: data.current_state || '',
          current_pincode: data.current_pincode || '',
          known_allergies: data.known_allergies || '',
          chronic_conditions: data.chronic_conditions || '',
          current_medications: data.current_medications || '',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('hms_token');
      const patientId = (user as {patient_id?: string; staff_id?: string})?.patient_id;
      const response = await fetch(`${API_URL}/patients/${patientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Profile updated successfully');
      } else {
        toast.error('Failed to update profile');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">
          Manage your personal information and preferences
        </p>
      </div>

      <Tabs defaultValue="personal">
        <TabsList>
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="medical">Medical Info</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-6">
          {/* Profile Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="relative">
                  <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="h-12 w-12 text-primary" />
                  </div>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-0 right-0 h-8 w-8"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-center md:text-left">
                  <h2 className="text-xl font-semibold">
                    {patient?.first_name} {patient?.last_name}
                  </h2>
                  <p className="text-muted-foreground">{patient?.patient_id}</p>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-2 text-sm">
                    <span className="flex items-center gap-1">
                      <Droplet className="h-4 w-4 text-red-500" />
                      {patient?.blood_group || 'Not specified'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {patient?.age} years
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile Number</Label>
                  <Input
                    id="mobile"
                    value={formData.mobile_number}
                    onChange={(e) =>
                      setFormData({ ...formData, mobile_number: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Emergency Contact</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergency_name">Contact Name</Label>
                    <Input
                      id="emergency_name"
                      value={formData.emergency_contact_name}
                      onChange={(e) =>
                        setFormData({ ...formData, emergency_contact_name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergency_phone">Contact Number</Label>
                    <Input
                      id="emergency_phone"
                      value={formData.emergency_contact_number}
                      onChange={(e) =>
                        setFormData({ ...formData, emergency_contact_number: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Address</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="street">Street Address</Label>
                    <Input
                      id="street"
                      value={formData.current_address_street}
                      onChange={(e) =>
                        setFormData({ ...formData, current_address_street: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.current_city}
                        onChange={(e) =>
                          setFormData({ ...formData, current_city: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={formData.current_state}
                        onChange={(e) =>
                          setFormData({ ...formData, current_state: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pincode">PIN Code</Label>
                      <Input
                        id="pincode"
                        value={formData.current_pincode}
                        onChange={(e) =>
                          setFormData({ ...formData, current_pincode: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="medical" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Medical Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="allergies">Known Allergies</Label>
                <textarea
                  id="allergies"
                  className="w-full min-h-[100px] p-3 rounded-md border border-input bg-background"
                  placeholder="List any known allergies..."
                  value={formData.known_allergies}
                  onChange={(e) =>
                    setFormData({ ...formData, known_allergies: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="conditions">Chronic Conditions</Label>
                <textarea
                  id="conditions"
                  className="w-full min-h-[100px] p-3 rounded-md border border-input bg-background"
                  placeholder="List any chronic conditions..."
                  value={formData.chronic_conditions}
                  onChange={(e) =>
                    setFormData({ ...formData, chronic_conditions: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="medications">Current Medications</Label>
                <textarea
                  id="medications"
                  className="w-full min-h-[100px] p-3 rounded-md border border-input bg-background"
                  placeholder="List current medications..."
                  value={formData.current_medications}
                  onChange={(e) =>
                    setFormData({ ...formData, current_medications: e.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Change Password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current_password">Current Password</Label>
                <Input id="current_password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_password">New Password</Label>
                <Input id="new_password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirm New Password</Label>
                <Input id="confirm_password" type="password" />
              </div>
              <Button>
                <Lock className="h-4 w-4 mr-2" />
                Update Password
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
