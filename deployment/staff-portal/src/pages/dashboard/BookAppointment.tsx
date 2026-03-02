import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Search,
  UserPlus,
  AlertCircle,
  Phone,
  ArrowRight,
  Wallet,
} from 'lucide-react';
import type { Doctor, TimeSlot } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import DoctorCalendar from '@/components/DoctorCalendar';
import PaymentMethod from '@/components/PaymentMethod';

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

  const [step, setStep] = useState(patientIdFromUrl ? 1 : 0);
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  // Date and Time state
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
  const [offDays, setOffDays] = useState<string[]>([]);
  const [isDateUnavailable, setIsDateUnavailable] = useState(false);
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null);

  // Form selections
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedType, setSelectedType] = useState('First_Consultation');
  const [selectedMode, setSelectedMode] = useState('In-person');
  const [reason, setReason] = useState('');

  // Patient Lookup
  const [patientLookupId, setPatientLookupId] = useState(patientIdFromUrl || '');
  const [patientData, setPatientData] = useState<any>(null);
  const [isFetchingPatient, setIsFetchingPatient] = useState(false);

  const fetchPatientDetails = useCallback(async (pid: string) => {
    setIsFetchingPatient(true);
    try {
      const token = localStorage.getItem('hms_staff_token') || localStorage.getItem('hms_token');
      const res = await fetch(`${API_URL}/patients/${pid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPatientData(data);
        return data;
      } else {
        toast.error('Patient not found');
        return null;
      }
    } catch (err) {
      console.error(err);
      toast.error('Error fetching patient details');
      return null;
    } finally {
      setIsFetchingPatient(false);
    }
  }, []);

  useEffect(() => {
    fetchDoctors();
    if (patientIdFromUrl) {
      fetchPatientDetails(patientIdFromUrl);
    }
  }, [patientIdFromUrl, fetchPatientDetails]);

  useEffect(() => {
    if (selectedDoctor) {
      fetchUnavailableDates(selectedDoctor);
    } else {
      setUnavailableDates([]);
      setOffDays([]);
    }
  }, [selectedDoctor]);

  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      fetchTimeSlots();
    } else {
      setTimeSlots([]);
      setIsDateUnavailable(false);
      setUnavailableReason(null);
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

  const fetchUnavailableDates = async (doctorId: string) => {
    try {
      const response = await fetch(`${API_URL}/doctors/${doctorId}/unavailable-dates`);
      const data = await response.json();

      if (data.unavailable_dates) {
        setUnavailableDates(data.unavailable_dates);
      }

      if (data.off_days) {
        setOffDays(data.off_days);
      }
    } catch (error) {
      console.error('Error fetching unavailable dates:', error);
    }
  };

  const fetchTimeSlots = async () => {
    if (!selectedDoctor || !selectedDate) return;

    try {
      const response = await fetch(
        `${API_URL}/doctors/${selectedDoctor}/availability?date=${selectedDate}`
      );
      const data = await response.json();

      if (data.unavailable) {
        setIsDateUnavailable(true);
        setUnavailableReason(data.reason || 'Doctor is unavailable on this date');
        setTimeSlots([]);
      } else {
        setIsDateUnavailable(false);
        setUnavailableReason(null);

        const rawSlots = data.available_slots || data.slots || [];
        const slotsArray = Array.isArray(rawSlots) ? rawSlots : [];

        const formattedSlots: TimeSlot[] = slotsArray.map((s: any) => ({
          time: (s.time || s.time_slot || '').substring(0, 5),
          period: s.period || 'Morning',
          available: s.available
        }));

        setTimeSlots(formattedSlots);
      }

      setSelectedTime(''); // Reset time when date changes
    } catch (error) {
      console.error('Error fetching time slots:', error);
      setTimeSlots([]);
    }
  };

  const handleSubmit = async (paymentDetails?: any) => {
    setLoading(true);

    try {
      const token = localStorage.getItem('hms_token') || localStorage.getItem('hms_staff_token');

      const payload = {
        doctor_id: selectedDoctor,
        patient_id: patientData?.patient_id || patientLookupId,
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        time_slot: selectedTime,
        appointment_type: selectedType,
        consultation_mode: selectedMode,
        reason_for_visit: reason,
        payment_details: paymentDetails,
      };

      const response = await fetch(`${API_URL}/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Appointment booked successfully! Token: ${data.token_number || 'N/A'}`);
        // Go to appointments list
        setTimeout(() => {
          navigate(patientIdFromUrl ? '/receptionist/appointments' : '/dashboard/appointments');
        }, 1500);
      } else {
        toast.error(data.error || 'Failed to book appointment');
        setStep(3); // Reset to details step if error
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
      setStep(3);
    } finally {
      setLoading(false);
    }
  };

  const selectedDoctorData = doctors.find((d) => d.staff_id === selectedDoctor);
  const consultationFee = selectedDoctorData?.consultation_fee || 0;

  // Dynamic step logic
  const maxStep = consultationFee > 0 ? 4 : 3;

  const canProceed = () => {
    switch (step) {
      case 0:
        return !!patientData;
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

  const handleDetailsSubmit = () => {
    // If fee > 0, go to payment. If not, auto confirm
    if (consultationFee > 0) {
      setStep(4);
    } else {
      handleSubmit();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Book Appointment</h1>
          <p className="text-slate-500 font-medium">Schedule a consultation and manage hospital flow.</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex justify-center gap-0 w-full max-w-2xl mx-auto pt-4 hidden sm:flex">
        {[0, 1, 2, 3, ...(maxStep === 4 ? [4] : [])].map((s, idx, arr) => (
          <div key={s} className="flex flex-col items-center flex-1 relative">
            <motion.div
              animate={{
                scale: step === s ? 1.1 : 1,
                backgroundColor: s <= step ? 'var(--primary)' : '#e2e8f0',
                color: s <= step ? 'white' : '#64748b'
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors relative z-10"
            >
              {s < step ? <CheckCircle2 size={18} /> : s + 1}
            </motion.div>
            <span className={`text-[10px] mt-2 font-bold uppercase tracking-widest ${step === s ? 'text-primary' : 'text-slate-400'}`}>
              {s === 0 && 'Patient'}
              {s === 1 && 'Doctor'}
              {s === 2 && 'Schedule'}
              {s === 3 && 'Details'}
              {s === 4 && 'Payment'}
            </span>
            {idx < arr.length - 1 && (
              <div className={`absolute top-5 left-[50%] right-[-50%] h-[2px] transition-colors ${s < step ? 'bg-primary' : 'bg-slate-200'} -z-0`} />
            )}
          </div>
        ))}
      </div>

      {step === 4 ? (
        // Payment Step Component completely takes over card space
        <motion.div
          key="step4"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
        >
          <PaymentMethod
            amount={consultationFee}
            onPaymentComplete={handleSubmit}
            onBack={() => setStep(3)}
          />
        </motion.div>
      ) : (
        <Card className="border-none shadow-xl bg-white overflow-hidden">
          <CardContent className="p-0">
            <AnimatePresence mode="wait">
              {/* Step 0: Patient Identification */}
              {step === 0 && (
                <motion.div
                  key="step0"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-8 space-y-8"
                >
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-slate-800">Identify Patient</h2>
                    <p className="text-slate-500 font-medium">Enter the Patient ID to retrieve record and auto-fill details.</p>
                  </div>

                  <div className="flex gap-3 max-w-md">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
                      <Input
                        placeholder="Enter Patient ID (e.g. P0001)"
                        className="h-12 pl-10 text-lg font-semibold border-slate-200 focus:ring-2 focus:ring-primary/20"
                        value={patientLookupId}
                        onChange={(e) => setPatientLookupId(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && fetchPatientDetails(patientLookupId)}
                      />
                    </div>
                    <Button
                      size="lg"
                      className="h-12 px-8 font-bold"
                      onClick={() => fetchPatientDetails(patientLookupId)}
                      disabled={isFetchingPatient || !patientLookupId}
                    >
                      {isFetchingPatient ? <Loader2 className="animate-spin" /> : 'Search'}
                    </Button>
                  </div>

                  <AnimatePresence>
                    {patientData ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-white rounded-xl shadow-sm">
                            <User className="text-emerald-500" size={24} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">Verified Patient</p>
                            <h4 className="text-xl font-bold text-slate-800">{patientData.first_name} {patientData.last_name}</h4>
                            <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
                              <span>ID: {patientData.patient_id}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1"><Phone size={12} /> {patientData.phone || patientData.mobile_number}</span>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" className="text-emerald-600 font-bold hover:bg-emerald-100" onClick={() => { setPatientData(null); setPatientLookupId(''); }}>Change</Button>
                      </motion.div>
                    ) : patientLookupId && !isFetchingPatient && (
                      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 flex items-start gap-4">
                        <div className="p-2 bg-amber-100 rounded-lg text-amber-600 mt-1">
                          <AlertCircle size={20} />
                        </div>
                        <div className="space-y-3">
                          <h4 className="text-lg font-bold text-slate-800">Unrecognized Patient ID</h4>
                          <p className="text-slate-600 text-sm font-medium">This ID doesn't match any records. New patients must be registered before booking.</p>
                          <Button className="bg-amber-600 hover:bg-amber-700 font-bold" asChild>
                            <Link to="/receptionist/registration">
                              <UserPlus className="mr-2" size={18} />
                              Go to Registration
                            </Link>
                          </Button>
                        </div>
                      </div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {/* Step 1: Select Doctor */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-8 space-y-8"
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-bold text-slate-800">Doctor Selection</h2>
                      <p className="text-slate-500 font-medium">Choose a specialist and specify the consultation type.</p>
                    </div>
                    {patientData && (
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Patient</p>
                        <p className="font-bold text-slate-700">{patientData.first_name} {patientData.last_name}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-bold">Select Doctor *</Label>
                      <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                        <SelectTrigger className="h-12 border-slate-200 font-semibold bg-slate-50/50">
                          <SelectValue placeholder="Choose a doctor" />
                        </SelectTrigger>
                        <SelectContent>
                          {doctors.map((doctor) => (
                            <SelectItem key={doctor.staff_id} value={doctor.staff_id}>
                              <div className="flex items-center gap-2">
                                Dr. {doctor.first_name} {doctor.last_name} — {doctor.specialization}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedDoctorData && (
                      <motion.div
                        initial={{ scale: 0.98, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="p-6 bg-blue-50/50 border border-blue-100 rounded-2xl flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-blue-100">
                            <Stethoscope className="h-8 w-8 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="text-xl font-bold text-slate-800">
                              Dr. {selectedDoctorData.first_name} {selectedDoctorData.last_name}
                            </h4>
                            <p className="text-sm font-bold text-blue-600 uppercase tracking-wide">
                              {selectedDoctorData.specialization}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Consultation Fee</p>
                          <p className="text-2xl font-black text-slate-900">₹{selectedDoctorData.consultation_fee}</p>
                        </div>
                      </motion.div>
                    )}

                    <div className="grid sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-slate-700 font-bold">Appointment Type *</Label>
                        <Select value={selectedType} onValueChange={setSelectedType}>
                          <SelectTrigger className="h-12 border-slate-200">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {appointmentTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-700 font-bold">Consultation Mode *</Label>
                        <Select value={selectedMode} onValueChange={setSelectedMode}>
                          <SelectTrigger className="h-12 border-slate-200">
                            <SelectValue placeholder="Select mode" />
                          </SelectTrigger>
                          <SelectContent>
                            {consultationModes.map((mode) => (
                              <SelectItem key={mode.value} value={mode.value}>{mode.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Select Date & Time */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-8 space-y-8"
                >
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold text-slate-800">Schedule</h2>
                    <p className="text-slate-500 font-medium">Select a date and explore available time slots for Dr. {selectedDoctorData?.last_name}.</p>
                  </div>

                  <div className="grid md:grid-cols-[1fr_1.5fr] gap-8">
                    <div className="space-y-4">
                      <Label className="text-slate-700 font-bold block">1. Choose Date *</Label>
                      <DoctorCalendar
                        value={selectedDate}
                        onChange={(date) => {
                          setSelectedDate(date);
                          setSelectedTime(''); // Clear selected time when date changes
                        }}
                        unavailableDates={unavailableDates}
                        offDays={offDays}
                      />
                    </div>

                    <div className="space-y-4">
                      <Label className="text-slate-700 font-bold block">2. Select Time *</Label>
                      {selectedDate ? (
                        isDateUnavailable ? (
                          <div className="p-4 bg-rose-50 rounded-xl flex items-center gap-3 text-rose-600 font-bold border border-rose-100">
                            <AlertCircle size={20} />
                            {unavailableReason || 'Doctor is unavailable on this date'}
                          </div>
                        ) : timeSlots.length > 0 ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {timeSlots.map((slot, idx) => (
                              <Button
                                key={idx}
                                variant={selectedTime === slot.time ? 'default' : 'outline'}
                                className={`h-11 font-bold transition-all ${!slot.available
                                  ? 'opacity-50 line-through bg-slate-50 text-slate-400 hover:bg-slate-50 cursor-not-allowed border-slate-200'
                                  : selectedTime === slot.time
                                    ? 'bg-primary shadow-lg shadow-primary/20 scale-105'
                                    : 'border-slate-200 bg-white hover:border-primary/50'
                                  }`}
                                onClick={() => {
                                  if (slot.available) {
                                    setSelectedTime(slot.time);
                                  }
                                }}
                                disabled={!slot.available}
                              >
                                <Clock className="h-4 w-4 mr-2" />
                                <span className="flex-1 text-center">{slot.time}</span>
                                {!slot.available && <span className="text-[9px] uppercase tracking-wide ml-1 bg-rose-100 text-rose-600 px-1 py-0.5 rounded">Booked</span>}
                              </Button>
                            ))}
                          </div>
                        ) : (
                          <div className="p-12 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                            <p className="text-slate-400 font-medium">No slots available for this date</p>
                          </div>
                        )
                      ) : (
                        <div className="p-12 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                          <p className="text-slate-400 font-medium italic">Please select a date first</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Confirm & Add Details */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-8 space-y-8"
                >
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold text-slate-800">Final Confirmation</h2>
                    <p className="text-slate-500 font-medium">Finalize the booking and add any specific medical concerns.</p>
                  </div>

                  <div className="grid md:grid-cols-[1.2fr_1fr] gap-8">
                    <div className="space-y-6">
                      <div className="p-6 bg-slate-900 text-white rounded-3xl shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                          <CheckCircle2 size={120} />
                        </div>
                        <div className="relative space-y-4">
                          <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Selected Specialist</p>
                            <h4 className="text-2xl font-bold">Dr. {selectedDoctorData?.first_name} {selectedDoctorData?.last_name}</h4>
                          </div>
                          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date</p>
                              <p className="font-bold">{selectedDate}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Time</p>
                              <p className="font-bold">{selectedTime}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mode</p>
                              <p className="font-bold">{selectedMode}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Type</p>
                              <p className="font-bold">{selectedType.replace('_', ' ')}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 bg-emerald-50 rounded-2xl flex items-center justify-between border border-emerald-100">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-lg shadow-sm border border-emerald-100">
                            <User className="text-emerald-500" size={20} />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Patient</p>
                            <p className="font-bold text-slate-800">{patientData?.first_name} {patientData?.last_name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Consultation Fee</p>
                          <p className="text-2xl font-black text-slate-800">₹{consultationFee}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-slate-700 font-bold block">Symptoms / Notes (Optional)</Label>
                      <textarea
                        className="w-full min-h-[160px] p-4 rounded-2xl border-slate-200 bg-slate-50/50 focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-700 resize-none shadow-sm"
                        placeholder="Briefly describe the patient's symptoms or requirements..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                      <div className="bg-amber-50 p-4 rounded-2xl flex items-start gap-3 border border-amber-100 text-amber-800 text-sm font-medium">
                        <AlertCircle size={18} className="shrink-0 mt-0.5" />
                        <div>
                          <p>Please re-verify the selected doctor and time.</p>
                          {consultationFee > 0 && <p className="mt-1 font-bold">Next Step: Payment Collection (₹{consultationFee})</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons for Card (Steps 0-3) */}
            <div className="p-8 border-t bg-slate-50/50 flex justify-between items-center">
              {step > 0 && (
                <Button variant="ghost" className="h-12 px-6 font-bold text-slate-500 hover:text-slate-800 bg-white shadow-sm border border-slate-200" onClick={() => setStep(step - 1)}>
                  <ArrowLeft className="mr-2" size={18} />
                  Back
                </Button>
              )}
              <div className="ml-auto flex gap-4">
                {step < 3 ? (
                  <Button
                    className="h-12 px-10 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 font-bold text-base group"
                    onClick={() => setStep(step + 1)}
                    disabled={!canProceed()}
                  >
                    Continue
                    <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
                  </Button>
                ) : (
                  <Button
                    className={`h-12 px-10 shadow-lg font-bold text-base ${consultationFee > 0 ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'}`}
                    onClick={handleDetailsSubmit}
                    disabled={loading || !canProceed()}
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : consultationFee > 0 ? (
                      <>Collect Payment ₹{consultationFee} <Wallet className="ml-2" size={18} /></>
                    ) : (
                      'Confirm & Finalize Booking'
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )
      }
    </div >
  );
}
