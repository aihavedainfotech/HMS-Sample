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
import {
  UserPlus,
  Save,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Droplet,
  Heart,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const genders = ['Male', 'Female', 'Other'];
const maritalStatus = ['Single', 'Married', 'Divorced', 'Widowed'];
const idProofTypes = ['Aadhaar Card', 'PAN Card', 'Passport', 'Driving License', 'Voter ID'];

export default function PatientRegistration() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    maritalStatus: '',
    mobileNumber: '',
    email: '',
    emergencyContactName: '',
    emergencyContactNumber: '',
    emergencyContactRelation: '',
    currentAddressStreet: '',
    currentAddressArea: '',
    currentCity: '',
    currentState: '',
    currentPincode: '',
    permanentAddressSame: true,
    permanentAddressStreet: '',
    permanentAddressArea: '',
    permanentCity: '',
    permanentState: '',
    permanentPincode: '',
    idProofType: '',
    idProofNumber: '',
    knownAllergies: '',
    chronicConditions: '',
    currentMedications: '',
    previousSurgeries: '',
    insuranceProvider: '',
    insurancePolicyNumber: '',
    insuranceCoverage: ''
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('hms_staff_token');
      
      // Generate patient ID
      const patientId = `PT${Date.now().toString().slice(-8)}`;
      
      const response = await fetch(`${API_URL}/auth/patient/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          patient_id: patientId,
          first_name: formData.firstName,
          last_name: formData.lastName,
          date_of_birth: formData.dateOfBirth,
          gender: formData.gender,
          blood_group: formData.bloodGroup,
          marital_status: formData.maritalStatus,
          mobile_number: formData.mobileNumber,
          email: formData.email,
          emergency_contact_name: formData.emergencyContactName,
          emergency_contact_number: formData.emergencyContactNumber,
          emergency_contact_relation: formData.emergencyContactRelation,
          current_address_street: formData.currentAddressStreet,
          current_address_area: formData.currentAddressArea,
          current_city: formData.currentCity,
          current_state: formData.currentState,
          current_pincode: formData.currentPincode,
          permanent_address_same_as_current: formData.permanentAddressSame,
          permanent_address_street: formData.permanentAddressStreet,
          permanent_address_area: formData.permanentAddressArea,
          permanent_city: formData.permanentCity,
          permanent_state: formData.permanentState,
          permanent_pincode: formData.permanentPincode,
          id_proof_type: formData.idProofType,
          id_proof_number: formData.idProofNumber,
          known_allergies: formData.knownAllergies,
          chronic_conditions: formData.chronicConditions,
          current_medications: formData.currentMedications,
          previous_surgeries: formData.previousSurgeries,
          insurance_provider: formData.insuranceProvider,
          insurance_policy_number: formData.insurancePolicyNumber,
          insurance_coverage_amount: formData.insuranceCoverage,
          password: formData.mobileNumber // Default password
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Patient registered successfully! ID: ${result.patient_id || patientId}`);
        
        // Option to book appointment immediately
        if (confirm('Patient registered! Would you like to book an appointment now?')) {
          navigate(`/front-office/appointment-booking?patient_id=${result.patient_id || patientId}`);
        } else {
          // Reset form
          setFormData({
            firstName: '',
            lastName: '',
            dateOfBirth: '',
            gender: '',
            bloodGroup: '',
            maritalStatus: '',
            mobileNumber: '',
            email: '',
            emergencyContactName: '',
            emergencyContactNumber: '',
            emergencyContactRelation: '',
            currentAddressStreet: '',
            currentAddressArea: '',
            currentCity: '',
            currentState: '',
            currentPincode: '',
            permanentAddressSame: true,
            permanentAddressStreet: '',
            permanentAddressArea: '',
            permanentCity: '',
            permanentState: '',
            permanentPincode: '',
            idProofType: '',
            idProofNumber: '',
            knownAllergies: '',
            chronicConditions: '',
            currentMedications: '',
            previousSurgeries: '',
            insuranceProvider: '',
            insurancePolicyNumber: '',
            insuranceCoverage: ''
          });
          setStep(1);
        }
      } else {
        const error = await response.json();
        toast.error(error.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Failed to register patient');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    // Validation for current step
    if (step === 1) {
      if (!formData.firstName || !formData.lastName || !formData.mobileNumber) {
        toast.error('Please fill in all required fields');
        return;
      }
    }
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UserPlus className="w-6 h-6" />
            Patient Registration
          </h1>
          <p className="text-gray-500">Register a new patient for the hospital</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/front-office/dashboard')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4 mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}
            >
              {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
            </div>
            <span className={`text-sm ${step >= s ? 'text-blue-600' : 'text-gray-500'}`}>
              {s === 1 && 'Basic Info'}
              {s === 2 && 'Contact Details'}
              {s === 3 && 'Address'}
              {s === 4 && 'Medical History'}
            </span>
          </div>
        ))}
      </div>

      {/* Form Card */}
      <Card>
        <CardContent className="p-6">
          {/* Step 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <User className="w-5 h-5" />
                Basic Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="Enter first name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Enter last name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => handleInputChange('gender', value)}
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
                  <Label htmlFor="bloodGroup">Blood Group</Label>
                  <Select
                    value={formData.bloodGroup}
                    onValueChange={(value) => handleInputChange('bloodGroup', value)}
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
                  <Label htmlFor="maritalStatus">Marital Status</Label>
                  <Select
                    value={formData.maritalStatus}
                    onValueChange={(value) => handleInputChange('maritalStatus', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {maritalStatus.map((ms) => (
                        <SelectItem key={ms} value={ms}>{ms}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="mobileNumber">Mobile Number *</Label>
                  <Input
                    id="mobileNumber"
                    value={formData.mobileNumber}
                    onChange={(e) => handleInputChange('mobileNumber', e.target.value)}
                    placeholder="10-digit mobile number"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="patient@email.com"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Emergency Contact */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Emergency Contact Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactName">Contact Name</Label>
                  <Input
                    id="emergencyContactName"
                    value={formData.emergencyContactName}
                    onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
                    placeholder="Emergency contact name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactNumber">Contact Number</Label>
                  <Input
                    id="emergencyContactNumber"
                    value={formData.emergencyContactNumber}
                    onChange={(e) => handleInputChange('emergencyContactNumber', e.target.value)}
                    placeholder="Emergency contact number"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="emergencyContactRelation">Relationship</Label>
                  <Input
                    id="emergencyContactRelation"
                    value={formData.emergencyContactRelation}
                    onChange={(e) => handleInputChange('emergencyContactRelation', e.target.value)}
                    placeholder="e.g., Parent, Spouse, Sibling"
                  />
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5" />
                  ID Proof Details
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="idProofType">ID Proof Type</Label>
                    <Select
                      value={formData.idProofType}
                      onValueChange={(value) => handleInputChange('idProofType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select ID type" />
                      </SelectTrigger>
                      <SelectContent>
                        {idProofTypes.map((id) => (
                          <SelectItem key={id} value={id}>{id}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="idProofNumber">ID Number</Label>
                    <Input
                      id="idProofNumber"
                      value={formData.idProofNumber}
                      onChange={(e) => handleInputChange('idProofNumber', e.target.value)}
                      placeholder="Enter ID number"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Address */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Address Information
              </h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-3">Current Address</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="currentAddressStreet">Street Address</Label>
                      <Input
                        id="currentAddressStreet"
                        value={formData.currentAddressStreet}
                        onChange={(e) => handleInputChange('currentAddressStreet', e.target.value)}
                        placeholder="House/Building number, Street"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="currentAddressArea">Area/Locality</Label>
                      <Input
                        id="currentAddressArea"
                        value={formData.currentAddressArea}
                        onChange={(e) => handleInputChange('currentAddressArea', e.target.value)}
                        placeholder="Area or locality"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="currentCity">City</Label>
                      <Input
                        id="currentCity"
                        value={formData.currentCity}
                        onChange={(e) => handleInputChange('currentCity', e.target.value)}
                        placeholder="City"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="currentState">State</Label>
                      <Input
                        id="currentState"
                        value={formData.currentState}
                        onChange={(e) => handleInputChange('currentState', e.target.value)}
                        placeholder="State"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="currentPincode">Pincode</Label>
                      <Input
                        id="currentPincode"
                        value={formData.currentPincode}
                        onChange={(e) => handleInputChange('currentPincode', e.target.value)}
                        placeholder="6-digit pincode"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="sameAddress"
                    checked={formData.permanentAddressSame}
                    onChange={(e) => handleInputChange('permanentAddressSame', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="sameAddress" className="mb-0">
                    Permanent address is same as current address
                  </Label>
                </div>
                
                {!formData.permanentAddressSame && (
                  <div>
                    <h4 className="font-medium mb-3">Permanent Address</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="permanentAddressStreet">Street Address</Label>
                        <Input
                          id="permanentAddressStreet"
                          value={formData.permanentAddressStreet}
                          onChange={(e) => handleInputChange('permanentAddressStreet', e.target.value)}
                          placeholder="House/Building number, Street"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="permanentAddressArea">Area/Locality</Label>
                        <Input
                          id="permanentAddressArea"
                          value={formData.permanentAddressArea}
                          onChange={(e) => handleInputChange('permanentAddressArea', e.target.value)}
                          placeholder="Area or locality"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="permanentCity">City</Label>
                        <Input
                          id="permanentCity"
                          value={formData.permanentCity}
                          onChange={(e) => handleInputChange('permanentCity', e.target.value)}
                          placeholder="City"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="permanentState">State</Label>
                        <Input
                          id="permanentState"
                          value={formData.permanentState}
                          onChange={(e) => handleInputChange('permanentState', e.target.value)}
                          placeholder="State"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="permanentPincode">Pincode</Label>
                        <Input
                          id="permanentPincode"
                          value={formData.permanentPincode}
                          onChange={(e) => handleInputChange('permanentPincode', e.target.value)}
                          placeholder="6-digit pincode"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Medical History */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Heart className="w-5 h-5" />
                Medical History
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="knownAllergies">Known Allergies</Label>
                  <Input
                    id="knownAllergies"
                    value={formData.knownAllergies}
                    onChange={(e) => handleInputChange('knownAllergies', e.target.value)}
                    placeholder="e.g., Penicillin, Pollen, None"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="chronicConditions">Chronic Conditions</Label>
                  <Input
                    id="chronicConditions"
                    value={formData.chronicConditions}
                    onChange={(e) => handleInputChange('chronicConditions', e.target.value)}
                    placeholder="e.g., Diabetes, Hypertension, None"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="currentMedications">Current Medications</Label>
                  <Input
                    id="currentMedications"
                    value={formData.currentMedications}
                    onChange={(e) => handleInputChange('currentMedications', e.target.value)}
                    placeholder="List current medications"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="previousSurgeries">Previous Surgeries</Label>
                  <Input
                    id="previousSurgeries"
                    value={formData.previousSurgeries}
                    onChange={(e) => handleInputChange('previousSurgeries', e.target.value)}
                    placeholder="e.g., Appendectomy 2020, None"
                  />
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5" />
                  Insurance Information (Optional)
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="insuranceProvider">Insurance Provider</Label>
                    <Input
                      id="insuranceProvider"
                      value={formData.insuranceProvider}
                      onChange={(e) => handleInputChange('insuranceProvider', e.target.value)}
                      placeholder="e.g., Star Health, ICICI Lombard"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="insurancePolicyNumber">Policy Number</Label>
                    <Input
                      id="insurancePolicyNumber"
                      value={formData.insurancePolicyNumber}
                      onChange={(e) => handleInputChange('insurancePolicyNumber', e.target.value)}
                      placeholder="Policy number"
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="insuranceCoverage">Coverage Amount</Label>
                    <Input
                      id="insuranceCoverage"
                      type="number"
                      value={formData.insuranceCoverage}
                      onChange={(e) => handleInputChange('insuranceCoverage', e.target.value)}
                      placeholder="Coverage amount in INR"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={step === 1}
            >
              Previous
            </Button>
            
            {step < 4 ? (
              <Button onClick={nextStep}>
                Next
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Register Patient
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
