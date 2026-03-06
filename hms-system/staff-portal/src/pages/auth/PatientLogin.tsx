import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Hospital, User, Phone, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { usePatientAuth } from '@/contexts/PatientAuthContext';

// Step 1 Schema: Identifier
const identifierSchema = z.object({
  identifier: z.string().min(1, 'Patient ID or Mobile Number is required'),
});

// Step 2 Schema: OTP
const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be exactly 6 digits').regex(/^\d+$/, 'OTP must contain only numbers'),
});

type IdentifierFormData = z.infer<typeof identifierSchema>;
type OtpFormData = z.infer<typeof otpSchema>;

const PatientLogin = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [patientId, setPatientId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = usePatientAuth();
  const location = useLocation();

  const identifierForm = useForm<IdentifierFormData>({
    resolver: zodResolver(identifierSchema),
    defaultValues: {
      identifier: location.state?.patientId || location.state?.mobileNumber || '',
    },
  });

  useEffect(() => {
    if (location.state?.patientId || location.state?.mobileNumber) {
      identifierForm.setValue('identifier', location.state.patientId || location.state.mobileNumber);
    }
  }, [location.state, identifierForm]);

  const otpForm = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
  });

  const onSendOtp = async (data: IdentifierFormData) => {
    setIsLoading(true);
    try {
      console.log('[PATIENT_LOGIN] Sending OTP for:', data.identifier);
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/auth/patient/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        setPatientId(result.patient_id); // Backend returns the actual Patient ID
        toast.success(result.message || 'OTP sent successfully!');
        setStep(2);
      } else {
        toast.error(result.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('[PATIENT_LOGIN] OTP Send Error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onVerifyOtp = async (data: OtpFormData) => {
    setIsLoading(true);
    try {
      console.log('[PATIENT_LOGIN] Verifying OTP for:', patientId);
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/auth/patient/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, otp: data.otp }),
      });

      const result = await response.json();

      if (response.ok) {
        login(result.access_token, result.patient);
        console.log('[PATIENT_LOGIN] Login successful, navigating to dashboard');
        toast.success('Login successful!');
        navigate('/patient/dashboard');
      } else {
        toast.error(result.message || 'Invalid OTP');
      }
    } catch (error) {
      console.error('[PATIENT_LOGIN] OTP Verify Error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-4">
            <div className="p-3 bg-white rounded-full shadow-lg">
              <Hospital className="h-10 w-10 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Patient Portal</h1>
          <p className="text-gray-600 mt-2">Access your medical records securely</p>
        </div>

        <Card className="shadow-xl border-0 overflow-hidden">
          {/* Progress Indicator */}
          <div className="flex h-1.5 w-full bg-gray-100">
            <div
              className={`h-full bg-blue-600 transition-all duration-500 ease-in-out ${step === 1 ? 'w-1/2' : 'w-full'}`}
            />
          </div>

          <CardHeader className="pt-8">
            <CardTitle className="text-2xl text-center">
              {step === 1 ? 'Sign In' : 'Enter Verification Code'}
            </CardTitle>
            <CardDescription className="text-center text-base mt-2">
              {step === 1
                ? 'Enter your Patient ID or Mobile Number to receive an OTP'
                : 'A 6-digit code has been sent to your registered mobile number via WhatsApp'}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-8 pb-8">
            <div className="relative overflow-hidden">

              {/* STEP 1: IDENTIFIER FORM */}
              <div
                className={`transition-all duration-500 transform ${step === 1 ? 'translate-x-0 opacity-100 absolute inset-0 relative' : '-translate-x-full opacity-0 absolute inset-0'
                  }`}
              >
                <form onSubmit={identifierForm.handleSubmit(onSendOtp)} className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="identifier" className="text-gray-700">Patient ID / Mobile Number</Label>
                    <div className="relative group">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center h-full">
                        <User className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      </div>
                      <Input
                        id="identifier"
                        type="text"
                        placeholder="e.g., P0001 or 9876543210"
                        className="pl-11 py-6 text-lg bg-gray-50 border-gray-200 focus:bg-white transition-all shadow-sm"
                        {...identifierForm.register('identifier')}
                      />
                    </div>
                    {identifierForm.formState.errors.identifier && (
                      <p className="text-sm text-red-500 font-medium animate-in slide-in-from-top-1">
                        {identifierForm.formState.errors.identifier.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full py-6 text-lg font-medium shadow-md hover:shadow-lg transition-all"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <><RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Sending OTP...</>
                    ) : (
                      <>Send OTP <ArrowRight className="ml-2 h-5 w-5" /></>
                    )}
                  </Button>
                </form>
              </div>

              {/* STEP 2: OTP FORM */}
              <div
                className={`transition-all duration-500 transform ${step === 2 ? 'translate-x-0 opacity-100 relative' : 'translate-x-full opacity-0 absolute inset-0 pointer-events-none'
                  }`}
              >
                <form onSubmit={otpForm.handleSubmit(onVerifyOtp)} className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="otp" className="text-gray-700">6-Digit OTP</Label>
                      <button
                        type="button"
                        onClick={() => {
                          setStep(1);
                          otpForm.reset();
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                      >
                        Change Number?
                      </button>
                    </div>
                    <div className="relative group">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center h-full">
                        <Phone className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      </div>
                      <Input
                        id="otp"
                        type="text"
                        maxLength={6}
                        placeholder="••••••"
                        className="pl-11 py-6 text-2xl tracking-[0.5em] text-center font-mono bg-gray-50 border-gray-200 focus:bg-white transition-all shadow-sm"
                        {...otpForm.register('otp')}
                        onChange={(e) => {
                          // Allow only numbers
                          e.target.value = e.target.value.replace(/[^0-9]/g, '');
                          otpForm.setValue('otp', e.target.value);
                          if (e.target.value.length === 6) {
                            otpForm.handleSubmit(onVerifyOtp)();
                          }
                        }}
                      />
                    </div>
                    {otpForm.formState.errors.otp && (
                      <p className="text-sm text-red-500 font-medium animate-in slide-in-from-top-1 text-center">
                        {otpForm.formState.errors.otp.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full py-6 text-lg font-medium shadow-md hover:shadow-lg transition-all"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <><RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Verifying...</>
                    ) : (
                      <>Verify & Login <CheckCircle2 className="ml-2 h-5 w-5" /></>
                    )}
                  </Button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => identifierForm.handleSubmit(onSendOtp)()}
                      className="text-sm text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-50"
                    >
                      Didn't receive code? <span className="text-blue-600 font-medium hover:underline">Resend</span>
                    </button>
                  </div>
                </form>
              </div>

            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 space-y-4 text-center">
              <p className="text-sm text-gray-600">
                New to CityCare?{' '}
                <Link to="/patient/register" className="text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-colors">
                  Create an account
                </Link>
              </p>
              <button
                type="button"
                onClick={() => navigate('/', { replace: true })}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors inline-flex items-center"
              >
                ← Back to home
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PatientLogin;

