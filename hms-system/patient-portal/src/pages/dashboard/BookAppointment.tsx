import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Clock,
  User,
  Stethoscope,
  Loader2,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import type { Doctor, TimeSlot } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const appointmentTypes = [
  { value: 'First_Consultation', label: 'First Consultation' },
  { value: 'Follow_up', label: 'Follow-up' },
  { value: 'Emergency', label: 'Emergency' },
];

const consultationModes = [
  { value: 'In-person', label: 'In-person' },
  { value: 'Teleconsultation', label: 'Teleconsultation' },
];

export default function BookAppointment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientIdFromUrl = searchParams.get('patient_id');

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedMode, setSelectedMode] = useState('In-person');
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      fetchTimeSlots();
    }
  }, [selectedDoctor, selectedDate]);

  const fetchDoctors = async () => {
    try {
      const response = await fetch(`${API_URL}/doctors`);
      const data = await response.json();
      setDoctors(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const fetchTimeSlots = async () => {
    if (!selectedDoctor || !selectedDate) return;

    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const response = await fetch(
        `${API_URL}/doctors/${selectedDoctor}/availability?date=${dateStr}`
      );
      const data = await response.json();
      setTimeSlots(data.available_slots || []);
    } catch (error) {
      console.error('Error fetching time slots:', error);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const token = localStorage.getItem('hms_token') || localStorage.getItem('hms_staff_token');
      const response = await fetch(`${API_URL}/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          doctor_id: selectedDoctor,
          patient_id: patientIdFromUrl, // Include patient_id if present (Receptionist flow)
          appointment_date: selectedDate?.toISOString().split('T')[0],
          appointment_time: selectedTime,
          appointment_type: selectedType,
          consultation_mode: selectedMode,
          reason_for_visit: reason,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Appointment booked successfully! Your appointment ID is ${data.appointment_id}`);
        // If receptionist, go back to appointments list
        if (patientIdFromUrl) {
          navigate('/receptionist/appointments');
        } else {
          navigate('/dashboard/appointments');
        }
      } else {
        toast.error(data.error || 'Failed to book appointment');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedDoctorData = doctors.find((d) => d.staff_id === selectedDoctor);

  const canProceed = () => {
    switch (step) {
      case 1:
        return selectedDoctor && selectedType;
      case 2:
        return selectedDate && selectedTime;
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Book Appointment</h1>
          <p className="text-muted-foreground">
            {patientIdFromUrl ? `Scheduling for Patient ID: ${patientIdFromUrl}` : 'Schedule a consultation with our doctors'}
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${s === step
                  ? 'bg-primary text-primary-foreground'
                  : s < step
                    ? 'bg-primary/20 text-primary'
                    : 'bg-gray-200 text-gray-500'
                }`}
            >
              {s < step ? <CheckCircle2 className="h-4 w-4" /> : s}
            </div>
            {s < 3 && <div className="w-8 h-0.5 bg-gray-200" />}
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          {/* Step 1: Select Doctor */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Select Doctor & Appointment Type</h2>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Doctor *</Label>
                  <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.map((doctor) => (
                        <SelectItem key={doctor.staff_id} value={doctor.staff_id}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Dr. {doctor.first_name} {doctor.last_name} - {doctor.specialization}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedDoctorData && (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Stethoscope className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">
                          Dr. {selectedDoctorData.first_name} {selectedDoctorData.last_name}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {selectedDoctorData.specialization}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Fee: ₹{selectedDoctorData.consultation_fee}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Appointment Type *</Label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {appointmentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Consultation Mode</Label>
                  <Select value={selectedMode} onValueChange={setSelectedMode}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      {consultationModes.map((mode) => (
                        <SelectItem key={mode.value} value={mode.value}>
                          {mode.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Select Date & Time */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Select Date & Time</h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label className="mb-2 block">Select Date *</Label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date() || date.getDay() === 0}
                    className="rounded-md border"
                  />
                </div>

                <div>
                  <Label className="mb-2 block">Available Time Slots *</Label>
                  {selectedDate ? (
                    timeSlots.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {timeSlots.map((slot, idx) => (
                          <Button
                            key={idx}
                            variant={selectedTime === slot.time ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedTime(slot.time)}
                          >
                            <Clock className="h-4 w-4 mr-1" />
                            {slot.time.substring(0, 5)}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No slots available for this date</p>
                    )
                  ) : (
                    <p className="text-muted-foreground">Please select a date first</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Confirm & Add Details */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Confirm & Add Details</h2>

              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Doctor</span>
                  <span className="font-medium">
                    Dr. {selectedDoctorData?.first_name} {selectedDoctorData?.last_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">{selectedDate?.toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-medium">{selectedTime.substring(0, 5)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium">{selectedType.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mode</span>
                  <span className="font-medium">{selectedMode}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground">Consultation Fee</span>
                  <span className="font-medium">₹{selectedDoctorData?.consultation_fee}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Reason for Visit</Label>
                <textarea
                  className="w-full min-h-[100px] p-3 rounded-md border border-input bg-background"
                  placeholder="Briefly describe your symptoms or reason for visit..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                Previous
              </Button>
            )}
            {step < 3 ? (
              <Button
                className="ml-auto"
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
              >
                Next
              </Button>
            ) : (
              <Button
                className="ml-auto"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Booking...
                  </>
                ) : (
                  'Confirm Booking'
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
