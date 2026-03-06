import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Phone,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';

const registrationSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.string().min(1, 'Gender is required'),
  bloodGroup: z.string().optional(),
  mobileNumber: z.string().min(10, 'Mobile number must be at least 10 digits'),
  email: z.string().email('Valid email is required').optional().or(z.literal('')),
  emergencyContactName: z.string().min(2, 'Emergency contact name is required'),
  emergencyContactNumber: z.string().min(10, 'Emergency contact number must be at least 10 digits'),
  emergencyContactRelation: z.string().min(2, 'Emergency contact relation is required'),
  currentAddressStreet: z.string().min(5, 'Current address is required'),
  currentAddressCity: z.string().min(2, 'City is required'),
  currentAddressState: z.string().min(2, 'State is required'),
  currentAddressPincode: z.string().min(6, 'Pincode must be at least 6 digits'),
  permanentAddressSameAsCurrent: z.boolean().default(true),
  permanentAddressStreet: z.string().optional(),
  permanentAddressCity: z.string().optional(),
  permanentAddressState: z.string().optional(),
  permanentAddressPincode: z.string().optional(),
  termsAccepted: z.boolean().refine(val => val === true, 'You must accept the terms and conditions')
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

const Register = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema) as any,
    defaultValues: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: '',
      bloodGroup: '',
      mobileNumber: '',
      email: '',
      emergencyContactName: '',
      emergencyContactNumber: '',
      emergencyContactRelation: '',
      currentAddressStreet: '',
      currentAddressCity: '',
      currentAddressState: '',
      currentAddressPincode: '',
      permanentAddressSameAsCurrent: true,
      permanentAddressStreet: '',
      permanentAddressCity: '',
      permanentAddressState: '',
      permanentAddressPincode: '',
      termsAccepted: false,
    }
  });

  const watchedPermanentSameAsCurrent = watch('permanentAddressSameAsCurrent');

  const [isOtpDialogOpen, setIsOtpDialogOpen] = useState(false);
  const [otp, setOtp] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [pendingRegistrationData, setPendingRegistrationData] = useState<RegistrationFormData | null>(null);

  const onSubmit = async (data: RegistrationFormData) => {
    setIsLoading(true);
    try {
      // First step: Send OTP
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/auth/patient/register/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mobileNumber: data.mobileNumber,
          firstName: data.firstName
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setPendingRegistrationData(data);
        setIsOtpDialogOpen(true);
        toast.success(`OTP sent to ${data.mobileNumber}`);
      } else {
        toast.error(result.error || result.message || 'Failed to send OTP.');
      }
    } catch (error: any) {
      console.error('OTP request error:', error);
      toast.error(`Network error: ${error?.message || 'Please try again.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 4) {
      toast.error('Please enter a valid OTP');
      return;
    }
    if (!pendingRegistrationData) return;

    setIsVerifyingOtp(true);
    try {
      const data = pendingRegistrationData;
      const payload = {
        first_name: data.firstName,
        last_name: data.lastName,
        date_of_birth: data.dateOfBirth,
        gender: data.gender,
        blood_group: data.bloodGroup,
        mobile_number: data.mobileNumber,
        email: data.email,
        emergency_contact_name: data.emergencyContactName,
        emergency_contact_number: data.emergencyContactNumber,
        emergency_contact_relation: data.emergencyContactRelation,
        current_address_street: data.currentAddressStreet,
        current_city: data.currentAddressCity,
        current_state: data.currentAddressState,
        current_pincode: data.currentAddressPincode,
        permanent_address_same_as_current: data.permanentAddressSameAsCurrent,
        permanent_address_street: data.permanentAddressStreet,
        permanent_city: data.permanentAddressCity,
        permanent_state: data.permanentAddressState,
        permanent_pincode: data.permanentAddressPincode,
        otp: otp
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/auth/patient/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        setIsOtpDialogOpen(false);
        toast.success(
          `Registration Successful! 🎉\n\nYour Patient ID: ${result.patient_id}\n\nPlease save this ID for future logins.`,
          { duration: 8000 }
        );

        setTimeout(() => {
          navigate('/patient/login', {
            state: {
              patientId: result.patient_id,
              message: `Welcome! Please login with your Mobile Number: ${data.mobileNumber}`
            }
          });
        }, 3000);
      } else {
        toast.error(result.error || result.message || 'Registration failed.');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(`Verification error: ${error?.message || 'Please try again.'}`);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8 animate-in fade-in zoom-in duration-500">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Patient Registration</h1>
          <p className="text-xl text-gray-600">Join CityCare Hospital for quality healthcare</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
          <Card className="shadow-lg border-0">
            <CardContent className="p-8">

              {/* Section 1: Personal Information */}
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold border-b pb-2 text-gray-800">Personal Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input id="firstName" {...register('firstName')} placeholder="Enter your first name" className="bg-gray-50 focus:bg-white" />
                    {errors.firstName && <p className="text-sm text-red-600">{errors.firstName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input id="lastName" {...register('lastName')} placeholder="Enter your last name" className="bg-gray-50 focus:bg-white" />
                    {errors.lastName && <p className="text-sm text-red-600">{errors.lastName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                    <Input id="dateOfBirth" type="date" {...register('dateOfBirth')} max={new Date().toISOString().split('T')[0]} className="bg-gray-50 focus:bg-white" />
                    {errors.dateOfBirth && <p className="text-sm text-red-600">{errors.dateOfBirth.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender *</Label>
                    <Controller
                      name="gender"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="bg-gray-50 focus:bg-white">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.gender && <p className="text-sm text-red-600">{errors.gender.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bloodGroup">Blood Group</Label>
                    <Controller
                      name="bloodGroup"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="bg-gray-50 focus:bg-white">
                            <SelectValue placeholder="Select blood group" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A+">A+</SelectItem>
                            <SelectItem value="A-">A-</SelectItem>
                            <SelectItem value="B+">B+</SelectItem>
                            <SelectItem value="B-">B-</SelectItem>
                            <SelectItem value="O+">O+</SelectItem>
                            <SelectItem value="O-">O-</SelectItem>
                            <SelectItem value="AB+">AB+</SelectItem>
                            <SelectItem value="AB-">AB-</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Contact Information */}
              <div className="space-y-6 mt-10">
                <h2 className="text-2xl font-semibold border-b pb-2 text-gray-800">Contact Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="mobileNumber">Mobile Number *</Label>
                    <Input id="mobileNumber" type="tel" {...register('mobileNumber')} placeholder="Enter 10-digit mobile number" className="bg-gray-50 focus:bg-white" />
                    {errors.mobileNumber && <p className="text-sm text-red-600">{errors.mobileNumber.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" {...register('email')} placeholder="Enter your email address" className="bg-gray-50 focus:bg-white" />
                    {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
                  </div>
                  <div className="space-y-2 md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="emergencyContactName">Emergency Contact Name *</Label>
                      <Input id="emergencyContactName" {...register('emergencyContactName')} placeholder="Emergency contact person name" className="bg-gray-50 focus:bg-white" />
                      {errors.emergencyContactName && <p className="text-sm text-red-600">{errors.emergencyContactName.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergencyContactNumber">Emergency Contact Number *</Label>
                      <Input id="emergencyContactNumber" type="tel" {...register('emergencyContactNumber')} placeholder="Emergency contact number" className="bg-gray-50 focus:bg-white" />
                      {errors.emergencyContactNumber && <p className="text-sm text-red-600">{errors.emergencyContactNumber.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergencyContactRelation">Relationship *</Label>
                      <Input id="emergencyContactRelation" {...register('emergencyContactRelation')} placeholder="e.g., Spouse, Parent, Sibling" className="bg-gray-50 focus:bg-white" />
                      {errors.emergencyContactRelation && <p className="text-sm text-red-600">{errors.emergencyContactRelation.message}</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Address Information */}
              <div className="space-y-6 mt-10">
                <h2 className="text-2xl font-semibold border-b pb-2 text-gray-800">Address Information</h2>

                <div className="flex items-center space-x-2 mb-4 bg-blue-50 p-4 rounded-md border border-blue-100">
                  <Checkbox id="permanentAddressSameAsCurrent" {...register('permanentAddressSameAsCurrent')} />
                  <Label htmlFor="permanentAddressSameAsCurrent" className="font-medium text-blue-900 cursor-pointer">
                    Permanent address is the same as current address
                  </Label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                  {/* Current Address */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-700">Current Address</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentAddressStreet">Street Address *</Label>
                        <Textarea id="currentAddressStreet" {...register('currentAddressStreet')} placeholder="Enter your current street address" rows={2} className="bg-gray-50 focus:bg-white resize-none" />
                        {errors.currentAddressStreet && <p className="text-sm text-red-600">{errors.currentAddressStreet.message}</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="currentAddressCity">City *</Label>
                          <Input id="currentAddressCity" {...register('currentAddressCity')} placeholder="Enter city" className="bg-gray-50 focus:bg-white" />
                          {errors.currentAddressCity && <p className="text-sm text-red-600">{errors.currentAddressCity.message}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="currentAddressState">State *</Label>
                          <Input id="currentAddressState" {...register('currentAddressState')} placeholder="Enter state" className="bg-gray-50 focus:bg-white" />
                          {errors.currentAddressState && <p className="text-sm text-red-600">{errors.currentAddressState.message}</p>}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currentAddressPincode">Pincode *</Label>
                        <Input id="currentAddressPincode" {...register('currentAddressPincode')} placeholder="Enter 6-digit pincode" className="bg-gray-50 focus:bg-white" />
                        {errors.currentAddressPincode && <p className="text-sm text-red-600">{errors.currentAddressPincode.message}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Permanent Address */}
                  {!watchedPermanentSameAsCurrent && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      <h3 className="font-medium text-gray-700">Permanent Address</h3>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="permanentAddressStreet">Street Address</Label>
                          <Textarea id="permanentAddressStreet" {...register('permanentAddressStreet')} placeholder="Enter your permanent street address" rows={2} className="bg-gray-50 focus:bg-white resize-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="permanentAddressCity">City</Label>
                            <Input id="permanentAddressCity" {...register('permanentAddressCity')} placeholder="Enter city" className="bg-gray-50 focus:bg-white" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="permanentAddressState">State</Label>
                            <Input id="permanentAddressState" {...register('permanentAddressState')} placeholder="Enter state" className="bg-gray-50 focus:bg-white" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="permanentAddressPincode">Pincode</Label>
                          <Input id="permanentAddressPincode" {...register('permanentAddressPincode')} placeholder="Enter 6-digit pincode" className="bg-gray-50 focus:bg-white" />
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Terms and Submission */}
              <div className="space-y-6 mt-10 pt-6 border-t">
                <div className="space-y-2">
                  <div className="flex items-start space-x-3">
                    <Controller
                      name="termsAccepted"
                      control={control}
                      render={({ field }) => (
                        <Checkbox id="termsAccepted" checked={field.value} onCheckedChange={field.onChange} className="mt-1" />
                      )}
                    />
                    <Label htmlFor="termsAccepted" className="text-sm text-gray-700 leading-relaxed cursor-pointer">
                      I accept the terms and conditions and privacy policy of CityCare Hospital. I agree that the information provided is accurate and true to the best of my knowledge.
                    </Label>
                  </div>
                  {errors.termsAccepted && <p className="text-sm text-red-600 ml-7">{errors.termsAccepted.message}</p>}
                </div>

                <div className="pt-4 flex justify-end">
                  <Button type="submit" disabled={isLoading} className="w-full md:w-auto px-12 py-6 text-lg shadow-md hover:shadow-lg transition-all">
                    {isLoading ? 'Registering...' : 'Complete Registration'}
                  </Button>
                </div>
              </div>

            </CardContent>
          </Card>
        </form>

        {/* Info Section */}
        <div className="mt-8 text-center animate-in fade-in duration-1000">
          <p className="text-gray-600 mb-6">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/patient/login')}
              className="text-blue-600 hover:text-blue-800 font-semibold hover:underline"
            >
              Login here
            </button>
          </p>
          <div className="flex flex-col md:flex-row justify-center items-center space-y-2 md:space-y-0 md:space-x-8 text-sm text-gray-500">
            <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
              <Phone className="h-4 w-4 text-gray-400" />
              <span>Need Help? +91 22 1234 5678</span>
            </div>
            <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span>24/7 Support Available</span>
            </div>
          </div>
        </div>

        {/* OTP Verification Dialog */}
        <Dialog open={isOtpDialogOpen} onOpenChange={setIsOtpDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6 text-blue-600" />
              </div>
              <DialogTitle className="text-center text-xl">Verify Mobile Number</DialogTitle>
              <DialogDescription className="text-center text-gray-600">
                Please enter the 6-digit verification code sent to
                <br />
                <span className="font-bold text-gray-900">{pendingRegistrationData?.mobileNumber}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  className="text-center text-xl tracking-widest py-6"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleVerifyOtp();
                    }
                  }}
                />
              </div>

              <Button
                onClick={handleVerifyOtp}
                className="w-full py-6 text-lg"
                disabled={isVerifyingOtp || otp.length < 4}
              >
                {isVerifyingOtp ? 'Verifying...' : 'Verify & Register'}
              </Button>

              <p className="text-center text-sm text-gray-500 mt-4">
                Didn't receive the code?{' '}
                <button
                  type="button"
                  className="text-blue-600 hover:underline font-medium"
                  onClick={() => pendingRegistrationData && onSubmit(pendingRegistrationData)}
                  disabled={isLoading}
                >
                  Resend Code
                </button>
              </p>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};

export default Register;
