import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import {
  MapPin,
  CreditCard,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

const appointmentSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  mobileNumber: z.string().min(10, 'Mobile number is required'),
  email: z.string().email('Valid email is required').optional().or(z.literal('')),
  doctor_id: z.string().min(1, 'Please select a doctor'),
  appointment_type: z.string().min(1, 'Please select appointment type'),
  appointment_date: z.string().min(1, 'Please select appointment date'),
  appointment_time: z.string().min(1, 'Please select appointment time'),
  consultation_mode: z.string().min(1, 'Please select consultation mode'),
  reason_for_visit: z.string().min(10, 'Please provide reason for visit (min 10 characters)'),
  special_requirements: z.string().optional(),
}).refine((data) => {
  const selectedDate = new Date(data.appointment_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return selectedDate >= today;
}, {
  message: 'Appointment date cannot be in the past',
  path: ['appointment_date'],
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface Doctor {
  staff_id: string;
  first_name: string;
  last_name: string;
  specialization: string;
  consultation_fee: number;
  follow_up_fee: number;
  rating: number;
  department: string;
}

const BookAppointment = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
  });

  const watchedDoctorId = watch('doctor_id');
  const watchedDate = watch('appointment_date');
  const watchedAppointmentType = watch('appointment_type');

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (watchedDoctorId) {
      const doctor = doctors.find(d => d.staff_id === watchedDoctorId);
      setSelectedDoctor(doctor || null);
      if (doctor) {
        generateTimeSlots();
      }
    }
  }, [watchedDoctorId, doctors]);

  useEffect(() => {
    if (watchedDoctorId && watchedDate) {
      generateTimeSlots();
    }
  }, [watchedDate, watchedDoctorId]);

  const fetchDoctors = async () => {
    try {
      const response = await fetch('/api/public/doctors');
      if (response.ok) {
        const data = await response.json();
        setDoctors(data.doctors || []);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast.error('Failed to fetch doctors');
    }
  };

  const generateTimeSlots = () => {
    const slots: string[] = [];
    const startHour = 9;
    const endHour = 18;

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }

    setAvailableSlots(slots);
  };

  const getConsultationFee = () => {
    if (!selectedDoctor) return 0;
    return watchedAppointmentType === 'First_Consultation'
      ? selectedDoctor.consultation_fee
      : selectedDoctor.follow_up_fee;
  };

  const onSubmit = async (data: AppointmentFormData) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        consultation_fee: getConsultationFee(),
        booked_by: 'Online',
        booking_source: 'Website',
      };

      const response = await fetch('/api/patient/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Appointment request submitted successfully! Please register or login to track your appointment.');
        setStep(3);
      } else {
        toast.error(result.message || 'Failed to book appointment');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (step === 3) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <div className="mx-auto bg-green-100 rounded-full p-3 w-fit mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Appointment Request Submitted!</h2>
              <p className="text-gray-600 mb-6">
                Your appointment request has been received. Please register as a patient or login to track your appointment status.
              </p>
              <div className="space-y-3">
                <Button
                  onClick={() => navigate('/register')}
                  className="w-full"
                >
                  Register as New Patient
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/patient/login')}
                  className="w-full"
                >
                  Login as Existing Patient
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate('/')}
                  className="w-full"
                >
                  Back to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Book Appointment</h1>
          <p className="text-xl text-gray-600">Schedule a consultation with our expert doctors</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Patient Information */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Patient Information</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  </div>
                </CardContent>
              </Card>

              {/* Doctor Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>Select Doctor</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="doctor_id">Choose Doctor *</Label>
                      <Select onValueChange={(value) => setValue('doctor_id', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a doctor" />
                        </SelectTrigger>
                        <SelectContent>
                          {doctors.map((doctor) => (
                            <SelectItem key={doctor.staff_id} value={doctor.staff_id}>
                              Dr. {doctor.first_name} {doctor.last_name} - {doctor.specialization}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.doctor_id && (
                        <p className="text-sm text-red-600">{errors.doctor_id.message}</p>
                      )}
                    </div>

                    {selectedDoctor && (
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">
                              Dr. {selectedDoctor.first_name} {selectedDoctor.last_name}
                            </h3>
                            <p className="text-gray-600">{selectedDoctor.specialization}</p>
                            <Badge variant="secondary" className="mt-1">
                              {selectedDoctor.department}
                            </Badge>
                            <div className="mt-3 space-y-1 text-sm">
                              <div className="flex items-center text-gray-600">
                                <MapPin className="h-4 w-4 mr-2" />
                                {selectedDoctor.department}
                              </div>
                              <div className="flex items-center text-gray-600">
                                <CreditCard className="h-4 w-4 mr-2" />
                                Consultation: ₹{selectedDoctor.consultation_fee}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Appointment Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Appointment Details</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="appointment_type">Appointment Type *</Label>
                      <Select onValueChange={(value) => setValue('appointment_type', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="First_Consultation">First Consultation</SelectItem>
                          <SelectItem value="Follow_up">Follow-up</SelectItem>
                          <SelectItem value="Emergency">Emergency</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.appointment_type && (
                        <p className="text-sm text-red-600">{errors.appointment_type.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="consultation_mode">Consultation Mode *</Label>
                      <RadioGroup
                        onValueChange={(value) => setValue('consultation_mode', value)}
                        className="flex space-x-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="In-person" id="in-person" />
                          <Label htmlFor="in-person">In-person</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Teleconsultation" id="tele" />
                          <Label htmlFor="tele">Teleconsultation</Label>
                        </div>
                      </RadioGroup>
                      {errors.consultation_mode && (
                        <p className="text-sm text-red-600">{errors.consultation_mode.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="appointment_date">Preferred Date *</Label>
                      <Input
                        id="appointment_date"
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        {...register('appointment_date')}
                      />
                      {errors.appointment_date && (
                        <p className="text-sm text-red-600">{errors.appointment_date.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="appointment_time">Preferred Time *</Label>
                      <Select onValueChange={(value) => setValue('appointment_time', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSlots.map((slot) => (
                            <SelectItem key={slot} value={slot}>
                              {formatTime(slot)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.appointment_time && (
                        <p className="text-sm text-red-600">{errors.appointment_time.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <Label htmlFor="reason_for_visit">Reason for Visit *</Label>
                    <Textarea
                      id="reason_for_visit"
                      placeholder="Please describe your symptoms or reason for consultation..."
                      rows={3}
                      {...register('reason_for_visit')}
                    />
                    {errors.reason_for_visit && (
                      <p className="text-sm text-red-600">{errors.reason_for_visit.message}</p>
                    )}
                  </div>

                  <div className="mt-4 space-y-2">
                    <Label htmlFor="special_requirements">Special Requirements (Optional)</Label>
                    <Textarea
                      id="special_requirements"
                      placeholder="Any special requirements or accommodations needed..."
                      rows={2}
                      {...register('special_requirements')}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary & Fee */}
            <div>
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle>Appointment Summary</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Consultation Fee</h4>
                      <div className="text-2xl font-bold text-blue-600">
                        ₹{getConsultationFee()}
                      </div>
                    </div>

                    <div className="bg-yellow-50 rounded-lg p-3">
                      <div className="flex items-start">
                        <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                        <div className="text-sm text-yellow-800">
                          <p className="font-medium">Important Information:</p>
                          <ul className="mt-1 space-y-1">
                            <li>• Please arrive 15 minutes before appointment</li>
                            <li>• Bring valid ID and medical records</li>
                            <li>• Payment to be made at the hospital</li>
                            <li>• Register or login to track appointment status</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loading || !selectedDoctor}
                    >
                      {loading ? 'Submitting...' : 'Book Appointment'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>

        {/* Help Section */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-4">
            Need help with booking? Call us at{' '}
            <a href="tel:+912212345678" className="text-blue-600 hover:underline font-medium">
              +91 22 1234 5678
            </a>
          </p>
          <Button
            variant="outline"
            onClick={() => navigate('/')}
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BookAppointment;
