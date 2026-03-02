import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Stethoscope, Eye, EyeOff, Loader2, Building2 } from 'lucide-react';

export default function StaffLogin() {
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const success = await login(staffId.toUpperCase(), password);
    if (success) {
      // Redirect based on role from API response
      const redirectMap: Record<string, string> = {
        Doctor: '/doctor',
        Receptionist: '/receptionist',
        Pharmacist: '/pharmacist',
        Lab_Technician: '/lab',
        Admission: '/admission',
        Nurse: '/nurse',
        Admin: '/admin',
        Billing: '/billing',
        Front_Office: '/front-office',
      };

      // Get user data from AuthContext or localStorage
      const storedUser = localStorage.getItem('hms_staff_user');
      const latestUser = user || (storedUser ? JSON.parse(storedUser) : null);

      if (latestUser && latestUser.role) {
        const userRole = latestUser.role;
        const redirectPath = redirectMap[userRole] || '/admin';
        navigate(redirectPath);
      } else {
        // Fallback to admin dashboard if role is not found
        navigate('/admin');
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2053&q=80")',
        }}
      >
        <div className="absolute inset-0 bg-blue-900/80 backdrop-blur-sm" />
      </div>

      <div className="container mx-auto px-4 z-10 flex flex-col md:flex-row items-center justify-center gap-12">
        {/* Left Side Content - Hidden on mobile */}
        <div className="hidden md:block max-w-lg text-white">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md border border-white/20">
              <Building2 className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold">CityCare Hospital</h1>
          </div>
          <h2 className="text-4xl font-bold mb-4 leading-tight">
            Advanced Healthcare Management System
          </h2>
          <p className="text-blue-100 text-lg mb-8">
            Secure access for hospital staff. Manage patients, appointments, and medical records efficiently with our integrated platform.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white/5 rounded-lg border border-white/10 backdrop-blur-md">
              <h3 className="font-semibold text-lg mb-1">Secure</h3>
              <p className="text-sm text-blue-200">End-to-end encrypted data protection</p>
            </div>
            <div className="p-4 bg-white/5 rounded-lg border border-white/10 backdrop-blur-md">
              <h3 className="font-semibold text-lg mb-1">Efficient</h3>
              <p className="text-sm text-blue-200">Streamlined workflows for all departments</p>
            </div>
          </div>
        </div>

        {/* Login Card */}
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-xl">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 shadowed-md">
                <Stethoscope className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">Staff Portal</CardTitle>
              <CardDescription className="text-gray-500">
                Sign in to your authorized account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="staffId" className="text-gray-700">Staff ID</Label>
                  <Input
                    id="staffId"
                    placeholder="e.g., DOC001"
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value)}
                    required
                    className="bg-gray-50 border-gray-200 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-gray-50 border-gray-200 focus:ring-blue-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 transition-all duration-200 shadow-md hover:shadow-lg"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In to Dashboard'
                  )}
                </Button>
              </form>

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white/95 px-2 text-muted-foreground">
                      Demo Credentials
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="space-y-1">
                    <p><span className="font-medium text-gray-700">Doctor:</span> DOC001 / password123</p>
                    <p><span className="font-medium text-gray-700">Reception:</span> REC001 / password123</p>
                    <p><span className="font-medium text-gray-700">Admission:</span> ADM002 / password123</p>
                    <p><span className="font-medium text-gray-700">Front Office:</span> FRONT001 / password123</p>
                  </div>
                  <div className="space-y-1">
                    <p><span className="font-medium text-gray-700">Admin:</span> ADM001 / password123</p>
                    <p><span className="font-medium text-gray-700">Billing:</span> BIL001 / password123</p>
                    <p><span className="font-medium text-gray-700">Lab:</span> LAB001 / password123</p>
                    <p><span className="font-medium text-gray-700">Pharmacist:</span> PHA001 / password123</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
