import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Menu,
  X,
  Phone,
  MapPin,
  Clock,
  User,
  Calendar,
  Heart
} from 'lucide-react';

const HospitalNavbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isPatientPortal = location.pathname.startsWith('/patient');

  const hospitalNavItems = [
    { label: 'Home', path: '/' },
    { label: 'Services', path: '/services' },
    { label: 'Doctors', path: '/doctors' },
    { label: 'About Us', path: '/about' },
    { label: 'Contact', path: '/contact' }
  ];

  const patientNavItems = [
    { label: 'Dashboard', path: '/patient/dashboard' },
    { label: 'Appointments', path: '/patient/appointments' },
    { label: 'Medical Records', path: '/patient/medical-records' }
  ];

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Heart className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-gray-900">CityCare</span>
              <span className="text-xs text-gray-500 block">Hospital</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            {!isPatientPortal ? (
              <>
                {hospitalNavItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`text-gray-700 hover:text-blue-600 font-medium transition-colors ${location.pathname === item.path ? 'text-blue-600' : ''
                      }`}
                  >
                    {item.label}
                  </Link>
                ))}

                {/* Patient Actions */}
                <div className="flex items-center space-x-3 ml-8 pl-8 border-l border-gray-200">
                  <Button variant="secondary" size="sm" onClick={() => navigate('/register')}>
                    <User className="h-4 w-4 mr-2" />
                    Register
                  </Button>
                  <Button size="sm" onClick={() => navigate('/patient/login')}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Patient Login
                  </Button>
                </div>
              </>
            ) : (
              <>
                {patientNavItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`text-gray-700 hover:text-blue-600 font-medium transition-colors ${location.pathname === item.path ? 'text-blue-600' : ''
                      }`}
                  >
                    {item.label}
                  </Link>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/')}
                  className="ml-8"
                >
                  Exit Patient Portal
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white">
            <div className="py-4 space-y-3">
              {!isPatientPortal ? (
                <>
                  {hospitalNavItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="block px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="px-4 space-y-3">
                      <Button
                        variant="secondary"
                        className="w-full justify-start"
                        onClick={() => {
                          navigate('/register');
                          setIsMenuOpen(false);
                        }}
                      >
                        <User className="h-4 w-4 mr-2" />
                        Register as Patient
                      </Button>
                      <Button
                        className="w-full justify-start"
                        onClick={() => {
                          navigate('/patient/login');
                          setIsMenuOpen(false);
                        }}
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Patient Login
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {patientNavItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="block px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        navigate('/');
                        setIsMenuOpen(false);
                      }}
                    >
                      Exit Patient Portal
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Contact Bar */}
      {!isPatientPortal && (
        <div className="bg-blue-900 text-white py-2">
          <div className="container mx-auto px-4">
            <div className="flex flex-col sm:flex-row justify-between items-center text-sm">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4" />
                  <span>Emergency: 108</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4" />
                  <span>+91 22 1234 5678</span>
                </div>
              </div>
              <div className="flex items-center space-x-6 mt-2 sm:mt-0">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4" />
                  <span>123 Healthcare Avenue, Mumbai</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>24/7 Emergency</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default HospitalNavbar;
