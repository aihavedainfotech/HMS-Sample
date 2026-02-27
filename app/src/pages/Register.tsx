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
import {
  Eye,
  EyeOff,
  Phone,
  AlertCircle
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
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Confirm password is required'),
  termsAccepted: z.boolean().refine(val => val === true, 'You must accept the terms and conditions')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    control,
    trigger,
    formState: { errors },
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema) as any,
    defaultValues: {
      permanentAddressSameAsCurrent: true,
    }
  });

  const watchedPermanentSameAsCurrent = watch('permanentAddressSameAsCurrent');

  const onSubmit = async (data: RegistrationFormData) => {
    setIsLoading(true);
    try {
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
        password: data.password,
      };

      const response = await fetch('/api/auth/patient/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        // Show success message with patient ID
        toast.success(
          `Registration Successful! 🎉\n\nYour Patient ID: ${result.patient_id}\n\nPlease save this ID for future logins.`,
          {
            duration: 8000,
          }
        );

        // Wait a moment before redirecting to allow user to see the message
        setTimeout(() => {
          navigate('/patient/login', {
            state: {
              patientId: result.patient_id,
              message: `Welcome! Please login with your Patient ID: ${result.patient_id}`
            }
          });
        }, 3000);
      } else {
        toast.error(result.error || result.message || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Patient Registration</h1>
          <p className="text-xl text-gray-600">Join CityCare Hospital for quality healthcare</p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= stepNumber
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
                  }`}>
                  {stepNumber}
                </div>
                {stepNumber < 3 && (
                  <div className={`w-16 h-1 ${step > stepNumber ? 'bg-blue-600' : 'bg-gray-200'
                    }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <CardContent className="p-8">
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold mb-6">Personal Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          {...register('firstName')}
                          placeholder="Enter your first name"
                        />
                        {errors.firstName && (
                          <p className="text-sm text-red-600">{errors.firstName.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          {...register('lastName')}
                          placeholder="Enter your last name"
                        />
                        {errors.lastName && (
                          <p className="text-sm text-red-600">{errors.lastName.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                        <Input
                          id="dateOfBirth"
                          type="date"
                          {...register('dateOfBirth')}
                          max={new Date().toISOString().split('T')[0]}
                        />
                        {errors.dateOfBirth && (
                          <p className="text-sm text-red-600">{errors.dateOfBirth.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gender">Gender *</Label>
                        <Controller
                          name="gender"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
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
                        {errors.gender && (
                          <p className="text-sm text-red-600">{errors.gender.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bloodGroup">Blood Group</Label>
                        <Controller
                          name="bloodGroup"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
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

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={async () => {
                        const isValid = await trigger(['firstName', 'lastName', 'dateOfBirth', 'gender']);
                        if (isValid) {
                          setStep(2);
                        } else {
                          toast.error('Please fill all required fields in Personal Information');
                        }
                      }}
                      className="px-8"
                    >
                      Next Step
                    </Button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold mb-6">Contact Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="mobileNumber">Mobile Number *</Label>
                        <Input
                          id="mobileNumber"
                          type="tel"
                          {...register('mobileNumber')}
                          placeholder="Enter 10-digit mobile number"
                        />
                        {errors.mobileNumber && (
                          <p className="text-sm text-red-600">{errors.mobileNumber.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          {...register('email')}
                          placeholder="Enter your email address"
                        />
                        {errors.email && (
                          <p className="text-sm text-red-600">{errors.email.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="emergencyContactName">Emergency Contact Name *</Label>
                        <Input
                          id="emergencyContactName"
                          {...register('emergencyContactName')}
                          placeholder="Emergency contact person name"
                        />
                        {errors.emergencyContactName && (
                          <p className="text-sm text-red-600">{errors.emergencyContactName.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="emergencyContactNumber">Emergency Contact Number *</Label>
                        <Input
                          id="emergencyContactNumber"
                          type="tel"
                          {...register('emergencyContactNumber')}
                          placeholder="Emergency contact number"
                        />
                        {errors.emergencyContactNumber && (
                          <p className="text-sm text-red-600">{errors.emergencyContactNumber.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="emergencyContactRelation">Relationship *</Label>
                        <Input
                          id="emergencyContactRelation"
                          {...register('emergencyContactRelation')}
                          placeholder="e.g., Spouse, Parent, Sibling"
                        />
                        {errors.emergencyContactRelation && (
                          <p className="text-sm text-red-600">{errors.emergencyContactRelation.message}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      onClick={async () => {
                        const isValid = await trigger(['mobileNumber', 'emergencyContactName', 'emergencyContactNumber', 'emergencyContactRelation']);
                        if (isValid) {
                          setStep(3);
                        } else {
                          toast.error('Please fill all required fields in Contact Information');
                        }
                      }}
                      className="px-8"
                    >
                      Next Step
                    </Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold mb-6">Address & Password</h2>

                    {/* Permanent Address Same as Current */}
                    <div className="flex items-center space-x-2 mb-6">
                      <Checkbox
                        id="permanentAddressSameAsCurrent"
                        {...register('permanentAddressSameAsCurrent')}
                      />
                      <Label htmlFor="permanentAddressSameAsCurrent">
                        Permanent address same as current address
                      </Label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="currentAddressStreet">Current Address Street *</Label>
                        <Textarea
                          id="currentAddressStreet"
                          {...register('currentAddressStreet')}
                          placeholder="Enter your current street address"
                          rows={2}
                        />
                        {errors.currentAddressStreet && (
                          <p className="text-sm text-red-600">{errors.currentAddressStreet.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currentAddressCity">City *</Label>
                        <Input
                          id="currentAddressCity"
                          {...register('currentAddressCity')}
                          placeholder="Enter your city"
                        />
                        {errors.currentAddressCity && (
                          <p className="text-sm text-red-600">{errors.currentAddressCity.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currentAddressState">State *</Label>
                        <Input
                          id="currentAddressState"
                          {...register('currentAddressState')}
                          placeholder="Enter your state"
                        />
                        {errors.currentAddressState && (
                          <p className="text-sm text-red-600">{errors.currentAddressState.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currentAddressPincode">Pincode *</Label>
                        <Input
                          id="currentAddressPincode"
                          {...register('currentAddressPincode')}
                          placeholder="Enter 6-digit pincode"
                        />
                        {errors.currentAddressPincode && (
                          <p className="text-sm text-red-600">{errors.currentAddressPincode.message}</p>
                        )}
                      </div>

                      {!watchedPermanentSameAsCurrent && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="permanentAddressStreet">Permanent Address Street</Label>
                            <Textarea
                              id="permanentAddressStreet"
                              {...register('permanentAddressStreet')}
                              placeholder="Enter your permanent street address"
                              rows={2}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="permanentAddressCity">Permanent City</Label>
                            <Input
                              id="permanentAddressCity"
                              {...register('permanentAddressCity')}
                              placeholder="Enter your permanent city"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="permanentAddressState">Permanent State</Label>
                            <Input
                              id="permanentAddressState"
                              {...register('permanentAddressState')}
                              placeholder="Enter your permanent state"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="permanentAddressPincode">Permanent Pincode</Label>
                            <Input
                              id="permanentAddressPincode"
                              {...register('permanentAddressPincode')}
                              placeholder="Enter 6-digit pincode"
                            />
                          </div>
                        </>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="password">Password *</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            {...register('password')}
                            placeholder="Create a strong password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        {errors.password && (
                          <p className="text-sm text-red-600">{errors.password.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password *</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            {...register('confirmPassword')}
                            placeholder="Confirm your password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        {errors.confirmPassword && (
                          <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Terms and Conditions */}
                  <div className="space-y-2">
                    <div className="flex items-start space-x-2">
                      <Controller
                        name="termsAccepted"
                        control={control}
                        render={({ field }) => (
                          <Checkbox
                            id="termsAccepted"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                      <Label htmlFor="termsAccepted" className="text-sm">
                        I accept the terms and conditions and privacy policy of CityCare Hospital
                      </Label>
                    </div>
                    {errors.termsAccepted && (
                      <p className="text-sm text-red-600">{errors.termsAccepted.message}</p>
                    )}
                  </div>

                  <div className="flex justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(2)}
                    >
                      Previous
                    </Button>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="px-8"
                    >
                      {isLoading ? 'Registering...' : 'Complete Registration'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </form>

        {/* Info Section */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-4">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/patient/login')}
              className="text-blue-600 hover:underline font-medium"
            >
              Login here
            </button>
          </p>
          <div className="flex justify-center space-x-8 text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <Phone className="h-4 w-4" />
              <span>Need Help? +91 22 1234 5678</span>
            </div>
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4" />
              <span>24/7 Support Available</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
