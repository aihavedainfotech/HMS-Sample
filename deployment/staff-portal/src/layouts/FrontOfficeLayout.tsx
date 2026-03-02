import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Users,
  Calendar,
  IndianRupee,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Phone,
  Mail,
  Clock,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import socket from '@/lib/socket';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface StaffData {
  staff_id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  phone?: string;
}

interface DashboardStats {
  todayRegistrations: number;
  todayAppointments: number;
  pendingPayments: number;
  todayRevenue: number;
  totalPatients: number;
  waitingQueue: number;
}

interface FrontOfficeLayoutProps {
  children?: React.ReactNode;
}

export default function FrontOfficeLayout({ children }: FrontOfficeLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [staffData, setStaffData] = useState<StaffData | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    todayRegistrations: 0,
    todayAppointments: 0,
    pendingPayments: 0,
    todayRevenue: 0,
    totalPatients: 0,
    waitingQueue: 0,
  });
  const [loading, setLoading] = useState(true);

  const menuItems = [
    { path: '/front-office/dashboard', icon: LayoutDashboard, label: 'Dashboard', badge: null },
    { path: '/front-office/patient-registration', icon: Users, label: 'Patient Registration', badge: 'New' },
    { path: '/front-office/appointment-booking', icon: Calendar, label: 'Appointment Booking', badge: null },
    { path: '/front-office/fee-collection', icon: IndianRupee, label: 'Fee Collection', badge: 'Payment' },
    { path: '/front-office/patient-records', icon: FileText, label: 'Patient Records', badge: null },
    { path: '/front-office/reports', icon: TrendingUp, label: 'Reports', badge: null },
    { path: '/front-office/settings', icon: Settings, label: 'Settings', badge: null },
  ];

  useEffect(() => {
    const token = localStorage.getItem('hms_staff_token');
    if (!token) {
      navigate('/staff/login');
      return;
    }

    // Parse JWT token to get staff data
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setStaffData({
        staff_id: payload.staff_id,
        name: payload.name,
        role: payload.role,
        department: payload.department,
        email: payload.email,
        phone: payload.phone,
      });
    } catch (error) {
      console.error('Error parsing token:', error);
      navigate('/staff/login');
      return;
    }

    fetchDashboardData();
    setupSocketListeners();

    return () => {
      socket.off('front_office_stats_updated');
    };
  }, [navigate]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const response = await fetch(`${API_URL}/dashboard/front-office`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else if (response.status === 401) {
        localStorage.removeItem('hms_staff_token');
        navigate('/staff/login');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const setupSocketListeners = () => {
    socket.on('front_office_stats_updated', (data) => {
      setStats(prev => ({ ...prev, ...data }));
    });

    socket.on('new_patient_registered', () => {
      fetchDashboardData();
      toast.success('New patient registered!');
    });

    socket.on('new_appointment_booked', () => {
      fetchDashboardData();
      toast.success('New appointment booked!');
    });

    socket.on('payment_received', () => {
      fetchDashboardData();
      toast.success('Payment received!');
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('hms_staff_token');
    navigate('/staff/login');
    toast.success('Logged out successfully');
  };

  const isActiveRoute = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white shadow-lg transition-all duration-300 flex flex-col`}>
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center'}`}>
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              {sidebarOpen && (
                <div>
                  <h2 className="font-bold text-gray-900">Front Office</h2>
                  <p className="text-xs text-gray-500">Hospital Management</p>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2"
            >
              {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.path}
                variant={isActiveRoute(item.path) ? 'default' : 'ghost'}
                className={`w-full justify-start ${!sidebarOpen && 'px-3'}`}
                onClick={() => navigate(item.path)}
              >
                <Icon className="w-4 h-4" />
                {sidebarOpen && (
                  <>
                    <span className="ml-3">{item.label}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </>
                )}
              </Button>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t">
          {staffData && (
            <div className="mb-4">
              {sidebarOpen ? (
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{staffData.name}</p>
                  <p className="text-gray-500">{staffData.staff_id}</p>
                  <p className="text-xs text-gray-400">{staffData.department}</p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    {staffData.name.charAt(0)}
                  </div>
                </div>
              )}
            </div>
          )}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            {sidebarOpen && <span className="ml-2">Logout</span>}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {menuItems.find(item => item.path === location.pathname)?.label || 'Front Office'}
              </h1>
              <p className="text-sm text-gray-500">
                Welcome back, {staffData?.name || 'Loading...'}
              </p>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-500">Today's Registrations</p>
                    <p className="text-xl font-bold text-gray-900">{stats.todayRegistrations}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-500">Today's Appointments</p>
                    <p className="text-xl font-bold text-gray-900">{stats.todayAppointments}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <IndianRupee className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-500">Today's Revenue</p>
                    <p className="text-xl font-bold text-gray-900">₹{stats.todayRevenue.toLocaleString()}</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
