import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Menu,
  X,
  Phone,
  MapPin,
  Clock,
  User,
  Building2,
} from 'lucide-react';

const HospitalNavbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const hospitalNavItems = [
    { label: 'Home', path: '/' },
    { label: 'Services', path: '/services' },
    { label: 'Doctors', path: '/doctors' },
    { label: 'About Us', path: '/about' },
    { label: 'Contact', path: '/contact' }
  ];

  return (
    <>
      {/* Quick Contact Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white py-2 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-1/4 w-32 h-32 bg-blue-400 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-24 h-24 bg-indigo-400 rounded-full blur-2xl" />
        </div>
        <div className="container mx-auto px-4 relative">
          <div className="flex flex-col sm:flex-row justify-between items-center text-sm">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 hover:text-blue-300 transition-colors">
                <Phone className="h-3.5 w-3.5" />
                <span className="font-medium">Emergency: 108</span>
              </div>
              <div className="hidden sm:flex items-center space-x-2 hover:text-blue-300 transition-colors">
                <Phone className="h-3.5 w-3.5" />
                <span>+91 22 1234 5678</span>
              </div>
            </div>
            <div className="flex items-center space-x-6 mt-1 sm:mt-0">
              <div className="flex items-center space-x-2 hover:text-blue-300 transition-colors">
                <MapPin className="h-3.5 w-3.5" />
                <span>123 Healthcare Avenue, Mumbai</span>
              </div>
              <div className="hidden sm:flex items-center space-x-2 text-emerald-400">
                <Clock className="h-3.5 w-3.5" />
                <span className="font-medium">24/7 Emergency</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <nav className={`sticky top-0 z-50 transition-all duration-300 ${scrolled
          ? 'bg-white/90 backdrop-blur-xl shadow-lg border-b border-gray-100'
          : 'bg-white shadow-md'
        }`}>
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-all group-hover:scale-105">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">CityCare</span>
                <span className="text-[10px] text-blue-600 block font-semibold tracking-wider uppercase">Hospital & Research</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-1">
              {hospitalNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${location.pathname === item.path
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                    }`}
                >
                  {item.label}
                </Link>
              ))}

              <div className="flex items-center space-x-2 ml-6 pl-6 border-l border-gray-200">
                <Button
                  size="sm"
                  onClick={() => navigate('/login')}
                  className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all"
                >
                  <User className="h-4 w-4 mr-2" />
                  Staff Login
                </Button>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="rounded-lg hover:bg-gray-100"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="lg:hidden border-t border-gray-100 bg-white animate-fade-in">
              <div className="py-4 space-y-1">
                {hospitalNavItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${location.pathname === item.path
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                      }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="border-t border-gray-100 pt-4 mt-4 px-4">
                  <Button
                    className="w-full justify-start rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600"
                    onClick={() => {
                      navigate('/login');
                      setIsMenuOpen(false);
                    }}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Staff Login
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>
    </>
  );
};

export default HospitalNavbar;
