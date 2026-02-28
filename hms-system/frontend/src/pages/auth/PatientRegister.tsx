import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, Hospital } from 'lucide-react';
import { toast } from 'sonner';

const registerSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.string().min(1, 'Please select gender'),
  bloodGroup: z.string().optional(),
  mobileNumber: z.string().min(10, 'Mobile number must be at least 10 digits'),
  email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  emergencyContactName: z.string().min(1, 'Emergency contact name is required'),
  emergencyContactNumber: z.string().min(10, 'Emergency contact number must be at least 10 digits'),
  emergencyContactRelation: z.string().min(1, 'Emergency contact relation is required'),
  currentAddressStreet: z.string().min(1, 'Street address is required'),
  currentAddressCity: z.string().min(1, 'City is required'),
  currentAddressState: z.string().min(1, 'State is required'),
  currentAddressPincode: z.string().min(6, 'Pincode must be at least 6 digits'),
  permanentAddressSameAsCurrent: z.boolean().default(true),
  permanentAddressStreet: z.string().optional(),
  permanentAddressCity: z.string().optional(),
  permanentAddressState: z.string().optional(),
  permanentAddressPincode: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Confirm password is required'),
  termsAccepted: z.boolean().refine(val => val === true, 'You must accept the terms and conditions'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

const PatientRegister = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
    setValue,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema) as any,
    defaultValues: {
      permanentAddressSameAsCurrent: true,
    },
  });

  const permanentAddressSameAsCurrent = watch('permanentAddressSameAsCurrent');

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const payload = {
        ...data,
        registered_by: 'Self',
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
        toast.success('Registration successful! Your Patient ID is: ' + result.patient_id);
        navigate('/patient/login');
      } else {
        toast.error(result.message || 'Registration failed');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyCurrentAddress = () => {
    setValue('permanentAddressStreet', watch('currentAddressStreet'));
    setValue('permanentAddressCity', watch('currentAddressCity'));
    setValue('permanentAddressState', watch('currentAddressState'));
    setValue('permanentAddressPincode', watch('currentAddressPincode'));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-4">
            <Hospital className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Patient Registration</h1>
          <p className="text-gray-600 mt-2">Create your account to access healthcare services</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">Register as New Patient</CardTitle>
            <CardDescription className="text-center">
              Fill in your details to create your patient account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      placeholder="Enter your first name"
                      {...register('firstName')}
                    />
                    {errors.firstName && (
                      <p className="text-sm text-red-600">{errors.firstName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      placeholder="Enter your last name"
                      {...register('lastName')}
                    />
                    {errors.lastName && (
                      <p className="text-sm text-red-600">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      {...register('dateOfBirth')}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mobileNumber">Mobile Number *</Label>
                    <Input
                      id="mobileNumber"
                      type="tel"
                      placeholder="Enter your mobile number"
                      {...register('mobileNumber')}
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
                      placeholder="Enter your email address"
                      {...register('email')}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Emergency Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContactName">Contact Name *</Label>
                    <Input
                      id="emergencyContactName"
                      placeholder="Emergency contact name"
                      {...register('emergencyContactName')}
                    />
                    {errors.emergencyContactName && (
                      <p className="text-sm text-red-600">{errors.emergencyContactName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContactNumber">Contact Number *</Label>
                    <Input
                      id="emergencyContactNumber"
                      type="tel"
                      placeholder="Emergency contact number"
                      {...register('emergencyContactNumber')}
                    />
                    {errors.emergencyContactNumber && (
                      <p className="text-sm text-red-600">{errors.emergencyContactNumber.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContactRelation">Relation *</Label>
                    <Input
                      id="emergencyContactRelation"
                      placeholder="e.g., Spouse, Parent, Sibling"
                      {...register('emergencyContactRelation')}
                    />
                    {errors.emergencyContactRelation && (
                      <p className="text-sm text-red-600">{errors.emergencyContactRelation.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Address Information</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-md font-medium text-gray-700 mb-2">Current Address *</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="currentAddressStreet">Street Address</Label>
                        <Input
                          id="currentAddressStreet"
                          placeholder="Enter your street address"
                          {...register('currentAddressStreet')}
                        />
                        {errors.currentAddressStreet && (
                          <p className="text-sm text-red-600">{errors.currentAddressStreet.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currentAddressCity">City</Label>
                        <Input
                          id="currentAddressCity"
                          placeholder="Enter your city"
                          {...register('currentAddressCity')}
                        />
                        {errors.currentAddressCity && (
                          <p className="text-sm text-red-600">{errors.currentAddressCity.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currentAddressState">State</Label>
                        <Input
                          id="currentAddressState"
                          placeholder="Enter your state"
                          {...register('currentAddressState')}
                        />
                        {errors.currentAddressState && (
                          <p className="text-sm text-red-600">{errors.currentAddressState.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currentAddressPincode">Pincode</Label>
                        <Input
                          id="currentAddressPincode"
                          placeholder="Enter your pincode"
                          {...register('currentAddressPincode')}
                        />
                        {errors.currentAddressPincode && (
                          <p className="text-sm text-red-600">{errors.currentAddressPincode.message}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Controller
                      name="permanentAddressSameAsCurrent"
                      control={control}
                      render={({ field }) => (
                        <Checkbox
                          id="permanentAddressSameAsCurrent"
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            if (checked) {
                              copyCurrentAddress();
                            }
                          }}
                        />
                      )}
                    />
                    <Label htmlFor="permanentAddressSameAsCurrent" className="text-sm">
                      Permanent address is same as current address
                    </Label>
                  </div>

                  {!permanentAddressSameAsCurrent && (
                    <div>
                      <h4 className="text-md font-medium text-gray-700 mb-2">Permanent Address</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="permanentAddressStreet">Street Address</Label>
                          <Input
                            id="permanentAddressStreet"
                            placeholder="Enter your permanent street address"
                            {...register('permanentAddressStreet')}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="permanentAddressCity">City</Label>
                          <Input
                            id="permanentAddressCity"
                            placeholder="Enter your permanent city"
                            {...register('permanentAddressCity')}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="permanentAddressState">State</Label>
                          <Input
                            id="permanentAddressState"
                            placeholder="Enter your permanent state"
                            {...register('permanentAddressState')}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="permanentAddressPincode">Pincode</Label>
                          <Input
                            id="permanentAddressPincode"
                            placeholder="Enter your permanent pincode"
                            {...register('permanentAddressPincode')}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Password */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Account Security</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        {...register('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
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
                        placeholder="Confirm your password"
                        {...register('confirmPassword')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="space-y-2">
                <Controller
                  name="termsAccepted"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="termsAccepted"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                      <Label htmlFor="termsAccepted" className="text-sm">
                        I accept the terms and conditions and privacy policy
                      </Label>
                    </div>
                  )}
                />
                {errors.termsAccepted && (
                  <p className="text-sm text-red-600">{errors.termsAccepted.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Registering...' : 'Register'}
              </Button>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <Link to="/patient/login" className="text-blue-600 hover:underline font-medium">
                    Sign in here
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PatientRegister;
