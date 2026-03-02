import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { User, CheckCircle, ArrowLeft, AlertCircle, Phone, Mail, MapPin } from 'lucide-react';
// import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { usePatientAuth } from '@/contexts/PatientAuthContext';
import { toast } from 'sonner';
import PaymentMethod from '@/components/PaymentMethod';
import DoctorCalendar from '@/components/DoctorCalendar';

const appointmentSchema = z.object({
  doctor_id: z.string().min(1, 'Please select a doctor'),
  mobile_number: z.string().regex(/^[0-9]{10}$/, 'Mobile number must be 10 digits'),
  appointment_type: z.string().min(1, 'Please select appointment type'),
  appointment_date: z.string().min(1, 'Please select appointment date'),
  reason: z.string().min(5, 'Please provide a reason for the appointment'),
  symptoms: z.string().optional(),
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
  department: string;
  rating: number;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

const BookAppointment = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { patient } = usePatientAuth();

  const [step, setStep] = useState<'details' | 'payment'>('details');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  // const [loading, setLoading] = useState(false);
  const [bookingData, setBookingData] = useState<AppointmentFormData | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [offDays, setOffDays] = useState<string[]>([]);
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
  const [dateError, setDateError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      appointment_type: 'First_Consultation',
    }
  });

  const watchDoctorId = watch('doctor_id');
  const watchDate = watch('appointment_date');

  const fetchDoctors = useCallback(async () => {
    try {
      // Always fetch to ensure we have latest data. Rate limiting should be handled by backend.
      // If we want caching, we should use a proper query library like React Query.
      // For now, removing the check to fix empty dropdown issue.

      const response = await fetch('/api/public/doctors');
      if (response.ok) {
        const data = await response.json();
        setDoctors(data.doctors);
      }
    } catch (error) {
      console.error('Failed to fetch doctors', error);
      toast.error('Failed to load doctors list');
    }
  }, []);

  useEffect(() => {
    fetchDoctors();

    // Auto-fill mobile number from patient auth context
    if (patient?.mobile_number) {
      setValue('mobile_number', patient.mobile_number);
    }
  }, [fetchDoctors, setValue, patient]);

  // Handle pre-selection when doctors are loaded or URL param changes
  useEffect(() => {
    const doctorParam = searchParams.get('doctor');
    if (doctorParam && doctors.length > 0) {
      // Only set if not already selected or different
      if (selectedDoctor?.staff_id !== doctorParam) {
        const doctor = doctors.find(d => d.staff_id === doctorParam);
        if (doctor) {
          setValue('doctor_id', doctorParam);
          // selectedDoctor will be set by the next effect
        }
      }
    }
  }, [searchParams, doctors, setValue, selectedDoctor]);

  useEffect(() => {
    if (watchDoctorId && doctors.length > 0) {
      const doctor = doctors.find(d => d.staff_id === watchDoctorId);
      setSelectedDoctor(doctor || null);
      // Fetch unavailable dates for this doctor
      fetch(`/api/doctors/${watchDoctorId}/unavailable-dates`)
        .then(r => r.json())
        .then(data => {
          setOffDays(data.off_days || []);
          setUnavailableDates(data.unavailable_dates || []);
        })
        .catch(() => { });
    }
  }, [watchDoctorId, doctors]);

  const isValidDate = (dateStr: string) => {
    // Must be exactly YYYY-MM-DD (10 chars) and a valid date
    if (!dateStr || dateStr.length !== 10) return false;
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) return false;
    if (year < 2020 || year > 2100) return false;
    const d = new Date(dateStr);
    return !isNaN(d.getTime()) && d.getFullYear() === year;
  };

  const fetchAvailability = useCallback(async (doctorId: string, date: string) => {
    if (!doctorId || !date || !isValidDate(date)) return;
    try {
      const response = await fetch(`/api/doctors/${doctorId}/availability?date=${date}`);
      if (response.ok) {
        const data = await response.json();
        // Backend returns: available_slots: [{time, period, available}]
        if (data.unavailable) {
          setTimeSlots([]);
          toast.info('Doctor is unavailable on this date');
        } else {
          setTimeSlots(data.available_slots.map((s: any) => ({
            time: s.time.substring(0, 5), // Convert "09:00:00" to "09:00"
            available: s.available
          })));
        }
      }
    } catch (error) {
      console.error('Failed to fetch availability', error);
    }
  }, []);

  useEffect(() => {
    setDateError(null);
    if (watchDoctorId && watchDate && isValidDate(watchDate)) {
      // Check if selected date is an off-day or specifically unavailable
      const dateObj = new Date(watchDate);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      if (offDays.includes(dayName)) {
        setDateError(`Dr. is not available on ${dayName}s. Please select another date.`);
        setTimeSlots([]);
        setSelectedTimeSlot(null);
        return;
      }
      if (unavailableDates.includes(watchDate)) {
        setDateError('Doctor is not available on this date. Please select another date.');
        setTimeSlots([]);
        setSelectedTimeSlot(null);
        return;
      }
      fetchAvailability(watchDoctorId, watchDate);
      setSelectedTimeSlot(null); // Reset when date/doctor changes
    }
  }, [watchDoctorId, watchDate, fetchAvailability, offDays, unavailableDates]);

  const getConsultationFee = () => {
    if (!selectedDoctor) return 0;
    return selectedDoctor.consultation_fee;
  };

  const onDetailsSubmit = (data: AppointmentFormData) => {
    if (!selectedDoctor) {
      toast.error('Please select a doctor');
      return;
    }
    if (!selectedTimeSlot) {
      toast.error('Please select a time slot');
      return;
    }
    setBookingData(data);
    setStep('payment');
  };

  const handlePaymentComplete = async (paymentDetails: any) => {
    if (!bookingData || !selectedDoctor) return;

    // setLoading(true);

    try {
      const payload = {
        ...bookingData,
        reason_for_visit: bookingData.reason, // Map reason to reason_for_visit
        appointment_time: selectedTimeSlot,
        time_slot: selectedTimeSlot, // Add time_slot field
        doctor_id: selectedDoctor.staff_id,
        consultation_fee: selectedDoctor.consultation_fee,
        payment_details: paymentDetails
      };

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('patientToken')}`
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        // Navigate to success page with details
        navigate('/patient/appointment-success', {
          state: {
            appointment: {
              id: result.appointment_id,
              doctor_name: `Dr. ${selectedDoctor.first_name} ${selectedDoctor.last_name}`,
              department: selectedDoctor.department,
              date: bookingData.appointment_date,
              time: selectedTimeSlot,
              amount: selectedDoctor.consultation_fee
            },
            transactionId: paymentDetails.transactionId
          }
        });
      } else {
        toast.error(result.error || result.message || 'Failed to book appointment');
        console.error('Booking error response:', result);
        setStep('details'); // Go back on error
      }
    } catch (error) {
      console.error('Booking error:', error);
      toast.error('Network error. Please try again.');
      setStep('details');
    } finally {
      // setLoading(false);
    }
  };

  if (step === 'payment' && bookingData && selectedDoctor) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-6">
          <Button variant="ghost" className="pl-0 flex gap-2" onClick={() => setStep('details')}>
            <ArrowLeft className="h-4 w-4" /> Back to Details
          </Button>
          <h1 className="text-3xl font-bold mt-2">Complete Payment</h1>
          <p className="text-gray-500">Secure payment for your appointment</p>
        </div>

        <PaymentMethod
          amount={selectedDoctor.consultation_fee}
          onPaymentComplete={handlePaymentComplete}
          onBack={() => setStep('details')}
        />

        <div className="mt-8 bg-gray-50 p-6 rounded-lg border">
          <h3 className="font-semibold mb-4">Appointment Summary</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 block">Doctor</span>
              <span className="font-medium">Dr. {selectedDoctor.first_name} {selectedDoctor.last_name}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Specialization</span>
              <span className="font-medium">{selectedDoctor.specialization}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Date</span>
              <span className="font-medium">{bookingData.appointment_date}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Time</span>
              <span className="font-medium">{selectedTimeSlot}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Type</span>
              <span className="font-medium">{bookingData.appointment_type}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Book an Appointment</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Booking Form */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <form onSubmit={handleSubmit(onDetailsSubmit)} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Doctor
                  </label>
                  <Controller
                    name="doctor_id"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a doctor" />
                        </SelectTrigger>
                        <SelectContent>
                          {doctors.map((doctor) => (
                            <SelectItem key={doctor.staff_id} value={doctor.staff_id}>
                              Dr. {doctor.first_name} {doctor.last_name} ({doctor.specialization}) - ₹{doctor.consultation_fee}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.doctor_id && (
                    <p className="text-sm text-red-600">{errors.doctor_id.message}</p>
                  )}
                </div>

                {selectedDoctor && (
                  <div className="bg-blue-50 p-4 rounded-md flex items-center gap-4">
                    <div className="bg-blue-100 p-2 rounded-full">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-blue-900">Dr. {selectedDoctor.first_name} {selectedDoctor.last_name}</p>
                      <p className="text-sm text-blue-700">{selectedDoctor.department} • {selectedDoctor.specialization}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-blue-600">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> Fees: ₹{getConsultationFee()}
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> Rating: {selectedDoctor.rating}/5
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mobile Number
                    </label>
                    <Input
                      id="mobile_number"
                      placeholder="Enter 10-digit mobile number"
                      maxLength={10}
                      {...register('mobile_number', {
                        required: 'Mobile number is required',
                        pattern: {
                          value: /^[0-9]{10}$/,
                          message: 'Please enter a valid 10-digit mobile number'
                        }
                      })}
                    />
                    {errors.mobile_number && (
                      <p className="text-sm text-red-600">{errors.mobile_number.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Appointment Type
                    </label>
                    <Controller
                      name="appointment_type"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="w-full rounded-md border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="First_Consultation">First Consultation</option>
                          <option value="Follow_up">Follow-up Visit</option>
                        </select>
                      )}
                    />
                    {errors.appointment_type && (
                      <p className="mt-1 text-sm text-red-600">{errors.appointment_type.message}</p>
                    )}
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preferred Date
                    </label>
                    <DoctorCalendar
                      value={watchDate || ''}
                      onChange={(date) => setValue('appointment_date', date)}
                      offDays={offDays}
                      unavailableDates={unavailableDates}
                      minDate={new Date().toISOString().split('T')[0]}
                    />
                    {errors.appointment_date && (
                      <p className="text-sm text-red-600 mt-1">{errors.appointment_date.message}</p>
                    )}
                  </div>
                </div>

                {selectedDoctor && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Available Time Slots
                    </label>
                    {dateError && (
                      <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
                        ⚠️ {dateError}
                      </div>
                    )}
                    {timeSlots.length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {timeSlots.map((slot, index) => (
                          <button
                            key={index}
                            type="button"
                            disabled={!slot.available}
                            onClick={() => slot.available && setSelectedTimeSlot(slot.time)}
                            title={!slot.available ? 'This slot is already booked' : ''}
                            className={`
                              p-2 text-sm rounded-md border transition-colors relative
                              ${!slot.available
                                ? 'bg-red-50 text-red-400 cursor-not-allowed border-red-200 line-through'
                                : selectedTimeSlot === slot.time
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500 hover:text-blue-600'
                              }
                            `}
                          >
                            {slot.time}
                            {!slot.available && <span className="block text-[9px] font-semibold text-red-400">Booked</span>}
                          </button>
                        ))}
                      </div>
                    )}
                    {timeSlots.length > 0 && !selectedTimeSlot && !dateError && (
                      <p className="mt-1 text-sm text-gray-500">Please select an available time slot</p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason for Visit</Label>
                  <Input
                    id="reason"
                    {...register('reason')}
                    placeholder="e.g., Annual checkup, Fever, Back pain"
                  />
                  {errors.reason && (
                    <p className="text-sm text-red-600">{errors.reason.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="symptoms">Symptoms (Optional)</Label>
                  <Textarea
                    id="symptoms"
                    {...register('symptoms')}
                    placeholder="Describe your symptoms if any..."
                    className="h-24"
                  />
                </div>

                {selectedDoctor && (
                  <div className="bg-blue-50 p-4 rounded-lg flex justify-between items-center border border-blue-100">
                    <div>
                      <h4 className="font-semibold text-blue-900">Consultation Fee</h4>
                      <p className="text-sm text-blue-700">Dr. {selectedDoctor.first_name} {selectedDoctor.last_name}</p>
                    </div>
                    <span className="text-xl font-bold text-blue-700">₹{selectedDoctor.consultation_fee}</span>
                  </div>
                )}

                <Button type="submit" className="w-full" size="lg">
                  Proceed to Payment
                </Button>
              </form>
            </div>
          </div>

          {/* Sidebar Information */}
          <div className="space-y-6">
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
              <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Booking Information
              </h3>
              <ul className="space-y-3 text-sm text-blue-800">
                <li className="flex gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5" />
                  Please arrive 15 minutes before your scheduled time.
                </li>
                <li className="flex gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5" />
                  Carry your previous medical records if available.
                </li>
                <li className="flex gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5" />
                  Cancellations must be done at least 24 hours in advance.
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Need Help?</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>+91 22 1234 5678</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Mail className="h-4 w-4" />
                  <span>appointments@citycare.com</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>123 Healthcare Ave, Mumbai</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookAppointment;
