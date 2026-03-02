import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus, Calendar, Clock, Stethoscope, Phone, User, ChevronDown,
  CheckCircle2, ChevronRight, ChevronLeft, Loader2, AlertCircle
} from 'lucide-react';
import { format, addDays, isSameDay, startOfToday, parseISO, getDay } from 'date-fns';

const API_URL = 'http://localhost:5002/api';

interface Doctor {
  staff_id: string;
  first_name: string;
  last_name: string;
  specialization: string;
  schedule?: Record<string, { start: string; end: string; available: boolean }>;
}

interface DoctorAvailability {
  staff_id: string;
  first_name: string;
  last_name: string;
  specialization: string;
  schedule: Record<string, { start: string; end: string; available: boolean }>;
  unavailable_dates: string[];
}

const ALL_TIME_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
  '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM'
];

const DAY_MAP: Record<number, string> = {
  0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
  4: 'thursday', 5: 'friday', 6: 'saturday'
};

export default function PatientRegistration() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [doctors, setDoctors] = useState<DoctorAvailability[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorAvailability | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [generatedPatientId, setGeneratedPatientId] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    age: '',
    gender: '',
    mobileNumber: '',
    specialization: '',
    doctorId: '',
    appointmentDate: '',
    timeSlot: '',
    reason: '',
    allergies: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);

  // Fetch all doctors with availability on mount
  useEffect(() => {
    fetchDoctorsWithAvailability();
  }, []);

  // Update available time slots when date or doctor changes
  useEffect(() => {
    if (formData.doctorId && formData.appointmentDate && selectedDoctor) {
      calculateAvailableSlots(selectedDoctor, formData.appointmentDate);
    }
  }, [formData.doctorId, formData.appointmentDate]);

  const fetchDoctorsWithAvailability = async () => {
    try {
      const res = await fetch(`${API_URL}/public/doctors/with-availability`);
      if (res.ok) {
        const data = await res.json() as DoctorAvailability[];
        setDoctors(data);
        
        // Extract unique specializations
        const specs = [...new Set(data.map((d: DoctorAvailability) => d.specialization))].sort();
        setSpecializations(specs);
      }
    } catch (err) {
      console.error('Failed to fetch doctors');
      toast.error('Failed to load doctor availability');
    }
  };

  const calculateAvailableSlots = (doctor: DoctorAvailability, dateStr: string) => {
    const date = parseISO(dateStr);
    const dayOfWeek = getDay(date);
    const dayName = DAY_MAP[dayOfWeek];
    
    // Check if doctor works on this day
    const daySchedule = doctor.schedule?.[dayName];
    if (!daySchedule || !daySchedule.available) {
      setAvailableTimeSlots([]);
      return;
    }

    // Check if date is in unavailable dates
    const isUnavailable = doctor.unavailable_dates?.some((unavailableDate: string) => 
      isSameDay(parseISO(unavailableDate), date)
    );
    
    if (isUnavailable) {
      setAvailableTimeSlots([]);
      return;
    }

    // Filter time slots based on doctor's schedule
    const doctorStart = daySchedule.start;
    const doctorEnd = daySchedule.end;
    
    const slots = ALL_TIME_SLOTS.filter(slot => {
      return slot >= doctorStart && slot < doctorEnd;
    });
    
    setAvailableTimeSlots(slots);
  };

  const handleSpecializationChange = (spec: string) => {
    setFormData(prev => ({ ...prev, specialization: spec, doctorId: '', appointmentDate: '', timeSlot: '' }));
    setSelectedDoctor(null);
    setAvailableTimeSlots([]);
  };

  const handleDoctorChange = (doctorId: string) => {
    const doctor = doctors.find(d => d.staff_id === doctorId) || null;
    setSelectedDoctor(doctor);
    setFormData(prev => ({ ...prev, doctorId, appointmentDate: '', timeSlot: '' }));
    setAvailableTimeSlots([]);
  };

  const isDateAvailable = (date: Date): boolean => {
    if (!selectedDoctor) return false;
    
    const dayOfWeek = getDay(date);
    const dayName = DAY_MAP[dayOfWeek];
    const daySchedule = selectedDoctor.schedule?.[dayName];
    
    if (!daySchedule || !daySchedule.available) return false;
    
    // Check unavailable dates
    const isUnavailable = selectedDoctor.unavailable_dates?.some((unavailableDate: string) => 
      isSameDay(parseISO(unavailableDate), date)
    );
    
    return !isUnavailable;
  };

  const validateStep = (currentStep: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!formData.fullName.trim() || formData.fullName.length < 3) {
        newErrors.fullName = 'Full name is required (min 3 characters)';
      }
      if (!formData.age || parseInt(formData.age) < 1 || parseInt(formData.age) > 120) {
        newErrors.age = 'Valid age is required (1-120)';
      }
      if (!formData.gender) {
        newErrors.gender = 'Gender is required';
      }
      if (!formData.mobileNumber || formData.mobileNumber.length < 10) {
        newErrors.mobileNumber = 'Valid mobile number is required (min 10 digits)';
      }
    }

    if (currentStep === 2) {
      if (!formData.specialization) {
        newErrors.specialization = 'Specialization is required';
      }
      if (!formData.doctorId) {
        newErrors.doctorId = 'Doctor is required';
      }
      if (!formData.appointmentDate) {
        newErrors.appointmentDate = 'Appointment date is required';
      }
      if (!formData.timeSlot) {
        newErrors.timeSlot = 'Time slot is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!validateStep(step)) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem('hms_staff_token');
      const payload = {
        full_name: formData.fullName,
        age: parseInt(formData.age),
        gender: formData.gender,
        mobile_number: formData.mobileNumber,
        specialization: formData.specialization,
        doctor_id: formData.doctorId,
        appointment_date: formData.appointmentDate,
        time_slot: formData.timeSlot,
        reason: formData.reason,
        allergies: formData.allergies,
        registered_by: 'Receptionist'
      };

      const res = await fetch(`${API_URL}/receptionist/register-and-book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        setGeneratedPatientId(data.patient_id);
        setShowSuccess(true);
        toast.success(`Registration successful! Patient ID: ${data.patient_id}`);
      } else {
        toast.error(data.error || 'Registration failed');
      }
    } catch (err) {
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate next 30 days
  const generateDateOptions = () => {
    const today = startOfToday();
    const dates = [];
    for (let i = 0; i < 30; i++) {
      dates.push(addDays(today, i));
    }
    return dates;
  };

  const dateOptions = generateDateOptions();
  const filteredDoctors = doctors.filter(d => d.specialization === formData.specialization);

  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <Card className="w-full max-w-md border-none shadow-2xl overflow-hidden">
            <div className="bg-emerald-500 p-6 flex justify-center">
              <div className="bg-white/20 p-4 rounded-full">
                <CheckCircle2 className="h-12 w-12 text-white" />
              </div>
            </div>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-slate-800">Registration Complete</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 px-8 pb-8 text-center">
              <div className="space-y-1">
                <p className="text-slate-500 font-medium">Patient Registered Successfully</p>
                <h3 className="text-xl font-bold text-slate-900">{formData.fullName}</h3>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Patient ID</p>
                <p className="text-3xl font-black text-blue-600 tracking-tight">{generatedPatientId}</p>
              </div>
              <div className="flex flex-col gap-2">
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base font-bold"
                  onClick={() => {
                    setShowSuccess(false);
                    setFormData({
                      fullName: '', age: '', gender: '', mobileNumber: '',
                      specialization: '', doctorId: '', appointmentDate: '', timeSlot: '',
                      reason: '', allergies: ''
                    });
                    setSelectedDoctor(null);
                    setAvailableTimeSlots([]);
                    setStep(1);
                  }}
                >Register Another Patient</Button>
                <Button variant="ghost" className="w-full h-12 text-slate-500 font-semibold" onClick={() => navigate('/receptionist')}>
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <div className="flex justify-center items-center mb-4">
          <div className="bg-blue-600 p-3 rounded-xl">
            <UserPlus className="h-8 w-8 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Patient Registration</h1>
        <p className="text-gray-600 mt-2">Register patient and book appointment with available doctors</p>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-center gap-4">
          {[1, 2, 3].map((s, idx) => (
            <div key={s} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition-all ${
                step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {step > s ? <CheckCircle2 className="h-5 w-5" /> : s}
              </div>
              <span className={`ml-2 text-sm font-medium hidden sm:block ${step >= s ? 'text-blue-600' : 'text-gray-400'}`}>
                {s === 1 ? 'Personal Info' : s === 2 ? 'Appointment' : 'Additional'}
              </span>
              {idx < 2 && <ChevronRight className={`h-5 w-5 mx-4 hidden sm:block ${step > s ? 'text-blue-600' : 'text-gray-300'}`} />}
            </div>
          ))}
        </div>
      </div>

      <Card className="shadow-xl border-none">
        <CardContent className="p-6 md:p-8">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="flex items-center gap-2 mb-6">
                  <User className="h-5 w-5 text-blue-600" />
                  <h2 className="text-xl font-bold text-gray-900">Personal Information</h2>
                  <Badge variant="secondary" className="ml-auto">Step 1 of 3</Badge>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="fullName" className="text-base font-medium">Full Name <span className="text-red-500">*</span></Label>
                    <Input id="fullName" placeholder="Enter patient's full name" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} className="h-12 mt-1.5" />
                    {errors.fullName && <p className="text-sm text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {errors.fullName}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="age" className="text-base font-medium">Age <span className="text-red-500">*</span></Label>
                      <Input id="age" type="number" placeholder="Years" value={formData.age} onChange={(e) => setFormData({ ...formData, age: e.target.value })} className="h-12 mt-1.5" min="1" max="120" />
                      {errors.age && <p className="text-sm text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {errors.age}</p>}
                    </div>

                    <div>
                      <Label className="text-base font-medium">Gender <span className="text-red-500">*</span></Label>
                      <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                        <SelectTrigger className="h-12 mt-1.5"><SelectValue placeholder="Select gender" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.gender && <p className="text-sm text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {errors.gender}</p>}
                    </div>

                    <div>
                      <Label htmlFor="mobile" className="text-base font-medium">Mobile Number <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input id="mobile" placeholder="10-digit number" value={formData.mobileNumber} onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })} className="h-12 mt-1.5 pl-10" maxLength={10} />
                      </div>
                      {errors.mobileNumber && <p className="text-sm text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {errors.mobileNumber}</p>}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={handleNext} className="h-12 px-8 bg-blue-600 hover:bg-blue-700">Next Step <ChevronRight className="ml-2 h-5 w-5" /></Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="flex items-center gap-2 mb-6">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <h2 className="text-xl font-bold text-gray-900">Appointment Details</h2>
                  <Badge variant="secondary" className="ml-auto">Step 2 of 3</Badge>
                </div>

                <div className="space-y-4">
                  {/* Specialization */}
                  <div>
                    <Label className="text-base font-medium">Specialization <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
                      <Select value={formData.specialization} onValueChange={handleSpecializationChange}>
                        <SelectTrigger className="h-12 mt-1.5 pl-10">
                          <SelectValue placeholder="Select specialization" />
                        </SelectTrigger>
                        <SelectContent>
                          {specializations.map((spec) => (
                            <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {errors.specialization && <p className="text-sm text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {errors.specialization}</p>}
                  </div>

                  {/* Doctor */}
                  <div>
                    <Label className="text-base font-medium">Doctor <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
                      <Select value={formData.doctorId} onValueChange={handleDoctorChange} disabled={!formData.specialization || filteredDoctors.length === 0}>
                        <SelectTrigger className="h-12 mt-1.5 pl-10">
                          <SelectValue placeholder={!formData.specialization ? "Select specialization first" : filteredDoctors.length === 0 ? "No doctors available" : "Select doctor"} />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredDoctors.map((doc) => (
                            <SelectItem key={doc.staff_id} value={doc.staff_id}>
                              Dr. {doc.first_name} {doc.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {errors.doctorId && <p className="text-sm text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {errors.doctorId}</p>}
                  </div>

                  {/* Date Selection - Only Available Dates */}
                  <div>
                    <Label className="text-base font-medium">Appointment Date <span className="text-red-500">*</span></Label>
                    <p className="text-sm text-gray-500 mb-2">
                      {selectedDoctor ? "Showing only available dates for selected doctor" : "Select a doctor first to see available dates"}
                    </p>
                    <div className="grid grid-cols-7 sm:grid-cols-10 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
                      {dateOptions.map((date) => {
                        const dateStr = format(date, 'yyyy-MM-dd');
                        const isSelected = formData.appointmentDate === dateStr;
                        const isToday = isSameDay(date, startOfToday());
                        const isAvailable = selectedDoctor ? isDateAvailable(date) : false;
                        
                        return (
                          <button
                            key={dateStr}
                            type="button"
                            disabled={!isAvailable}
                            onClick={() => isAvailable && setFormData({ ...formData, appointmentDate: dateStr, timeSlot: '' })}
                            className={`p-2 rounded-lg text-center text-sm transition-all ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : isAvailable
                                  ? 'bg-gray-50 hover:bg-gray-100 text-gray-700 cursor-pointer'
                                  : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                            } ${isToday ? 'ring-2 ring-blue-300' : ''}`}
                          >
                            <div className="text-xs font-medium">{format(date, 'EEE')}</div>
                            <div className="font-bold">{format(date, 'd')}</div>
                            <div className="text-xs">{format(date, 'MMM')}</div>
                          </button>
                        );
                      })}
                    </div>
                    {errors.appointmentDate && <p className="text-sm text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {errors.appointmentDate}</p>}
                  </div>

                  {/* Time Slot - Only Available Slots */}
                  <div>
                    <Label className="text-base font-medium">Time Slot <span className="text-red-500">*</span></Label>
                    <p className="text-sm text-gray-500 mb-2">
                      {formData.appointmentDate 
                        ? availableTimeSlots.length > 0 
                          ? "Available slots for selected date" 
                          : "No slots available for this date"
                        : "Select a date first"}
                    </p>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
                      <Select 
                        value={formData.timeSlot} 
                        onValueChange={(value) => setFormData({ ...formData, timeSlot: value })}
                        disabled={!formData.appointmentDate || availableTimeSlots.length === 0}
                      >
                        <SelectTrigger className="h-12 mt-1.5 pl-10">
                          <SelectValue placeholder={!formData.appointmentDate ? "Select date first" : availableTimeSlots.length === 0 ? "No slots available" : "Select time slot"} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTimeSlots.map((slot) => (
                            <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {errors.timeSlot && <p className="text-sm text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {errors.timeSlot}</p>}
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={handleBack} className="h-12 px-8"><ChevronLeft className="mr-2 h-5 w-5" /> Back</Button>
                  <Button onClick={handleNext} className="h-12 px-8 bg-blue-600 hover:bg-blue-700">Next Step <ChevronRight className="ml-2 h-5 w-5" /></Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="flex items-center gap-2 mb-6">
                  <Stethoscope className="h-5 w-5 text-blue-600" />
                  <h2 className="text-xl font-bold text-gray-900">Additional Information</h2>
                  <Badge variant="secondary" className="ml-auto">Step 3 of 3</Badge>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="reason" className="text-base font-medium">Reason for Visiting <span className="text-gray-400 font-normal">(Optional)</span></Label>
                    <Textarea id="reason" placeholder="Describe the symptoms or reason for the visit..." value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} className="mt-1.5 min-h-[100px]" />
                  </div>

                  <div>
                    <Label htmlFor="allergies" className="text-base font-medium">Known Allergies <span className="text-gray-400 font-normal">(Optional)</span></Label>
                    <Textarea id="allergies" placeholder="List any known allergies (medications, food, etc.)..." value={formData.allergies} onChange={(e) => setFormData({ ...formData, allergies: e.target.value })} className="mt-1.5 min-h-[80px]" />
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <h4 className="font-semibold text-slate-800">Booking Summary</h4>
                  <div className="text-sm text-slate-600 space-y-1">
                    <p><span className="font-medium">Patient:</span> {formData.fullName}, {formData.age}y, {formData.gender}</p>
                    <p><span className="font-medium">Mobile:</span> {formData.mobileNumber}</p>
                    <p><span className="font-medium">Doctor:</span> {selectedDoctor?.first_name} {selectedDoctor?.last_name} ({selectedDoctor?.specialization})</p>
                    <p><span className="font-medium">Date & Time:</span> {formData.appointmentDate} at {formData.timeSlot}</p>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={handleBack} className="h-12 px-8"><ChevronLeft className="mr-2 h-5 w-5" /> Back</Button>
                  <Button onClick={handleSubmit} disabled={isLoading} className="h-12 px-8 bg-emerald-600 hover:bg-emerald-700">
                    {isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...</> : <><CheckCircle2 className="mr-2 h-5 w-5" /> Complete Registration</>}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}
