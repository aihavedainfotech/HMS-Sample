import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  ClipboardList,
  DollarSign,
  Bed,
  CheckCircle2,
  Siren,
  BarChart3,
  LogOut,
  Menu,
  X,
  Building2,
  Settings,
  Bell,
  Search,
  ChevronRight,
  Home,
} from 'lucide-react';

import AdmissionHome from '@/pages/dashboard/AdmissionHome';
import BedManagement from '@/pages/dashboard/BedManagement';
import PatientAdmission from '@/pages/dashboard/PatientAdmission';
import DischargeManagement from '@/pages/dashboard/DischargeManagement';
import FinancialClearance from '@/pages/dashboard/FinancialClearance';
import EmergencyAdmission from '@/pages/dashboard/EmergencyAdmission';
import AdmissionReports from '@/pages/dashboard/AdmissionReports';

const menuItems = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    path: '/admission',
    badge: null,
  },
  {
    title: 'New Admission',
    icon: ClipboardList,
    path: '/admission/new',
    badge: null,
  },
  {
    title: 'Financial',
    icon: DollarSign,
    path: '/admission/financial',
    badge: null,
  },
  {
    title: 'Bed Status',
    icon: Bed,
    path: '/admission/beds',
    badge: null,
  },
  {
    title: 'Discharge',
    icon: CheckCircle2,
    path: '/admission/discharge',
    badge: null,
  },
  {
    title: 'Emergency',
    icon: Siren,
    path: '/admission/emergency',
    badge: '1',
  },
  {
    title: 'Reports',
    icon: BarChart3,
    path: '/admission/reports',
    badge: null,
  },
];

// Bottom nav items (5 main for mobile)
const bottomNavItems = [
  menuItems[0], // Dashboard
  menuItems[1], // New Admission
  menuItems[3], // Bed Status
  menuItems[5], // Emergency
  menuItems[4], // Discharge
];

const mockNotifications = [
  { id: 1, text: 'Emergency Admission: John Smith assigned to ICU Bed 1', time: 'Just now', unread: true },
  { id: 2, text: 'Bed 204 (Ward A) is now available', time: '10 min ago', unread: true },
  { id: 3, text: 'Discharge pending for Sarah Connor', time: '1 hr ago', unread: false },
  { id: 4, text: 'Daily admission report generated', time: '3 hrs ago', unread: false },
];

function getBreadcrumb(pathname: string) {
  const segments = pathname.replace('/admission', '').split('/').filter(Boolean);
  const crumbs = [{ label: 'Admission', path: '/admission' }];
  if (segments.length > 0) {
    const labels: Record<string, string> = {
      new: 'New Admission',
      financial: 'Financial',
      beds: 'Bed Status',
      discharge: 'Discharge',
      emergency: 'Emergency',
      reports: 'Reports',
    };
    crumbs.push({
      label: labels[segments[0]] || segments[0],
      path: pathname,
    });
  }
  return crumbs;
}

export default function AdmissionDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
  };

  const isActive = (path: string) => {
    if (path === '/admission') return location.pathname === '/admission';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const breadcrumbs = getBreadcrumb(location.pathname);
  const unreadCount = mockNotifications.filter(n => n.unread).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ===== STYLES ===== */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .page-enter { animation: fadeSlideIn 0.3s ease-out; }
        .sidebar-link {
          position: relative;
          transition: all 0.2s ease;
        }
        .sidebar-link:hover {
          transform: translateX(4px);
        }
        .sidebar-link.active {
          background: linear-gradient(135deg, rgba(99,102,241,0.1), rgba(99,102,241,0.05));
        }
        .sidebar-link.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 60%;
          background: #6366f1;
          border-radius: 0 4px 4px 0;
        }
        .dropdown-enter {
          animation: dropdownIn 0.2s ease-out;
        }
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .bottom-nav-item {
          transition: all 0.2s ease;
        }
        .bottom-nav-item.active {
          color: #6366f1;
        }
        .bottom-nav-item.active .bottom-nav-dot {
          opacity: 1;
          transform: scale(1);
        }
        .bottom-nav-dot {
          opacity: 0;
          transform: scale(0);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .notification-dot {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      {/* ===== MOBILE SIDEBAR OVERLAY ===== */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ===== SIDEBAR ===== */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-gray-100">
            <Link to="/admission" className="flex items-center gap-3 group">
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">CityCare</h1>
                <p className="text-[10px] text-indigo-600 font-medium tracking-wider uppercase">Admission Portal</p>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden hover:bg-gray-100 rounded-lg"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* User Info */}
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3 p-2 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-sm font-bold text-white">
                  {user?.name?.[0] || 'A'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-indigo-600 font-medium truncate">Admission Officer</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            <p className="px-3 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Navigation</p>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`sidebar-link flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium ${active
                    ? 'active text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  onClick={() => setSidebarOpen(false)}
                  title={item.title}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${active ? 'bg-indigo-100' : 'bg-gray-100 group-hover:bg-gray-200'
                      }`}>
                      <Icon className={`h-4 w-4 ${active ? 'text-indigo-600' : 'text-gray-500'}`} />
                    </div>
                    <span>{item.title}</span>
                  </div>
                  {item.badge && (
                    <Badge className={`h-5 px-1.5 text-[10px] font-bold text-white rounded-full ${active ? 'bg-red-500' : 'bg-red-500 hover:bg-red-600'}`}>
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bottom Actions */}
          <div className="px-3 py-4 border-t border-gray-100 space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl h-10"
              onClick={() => { navigate('/admission/profile'); setSidebarOpen(false); }}
            >
              <Settings className="h-4 w-4 mr-3" />
              Settings
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-red-500 hover:bg-red-50 hover:text-red-700 rounded-xl h-10"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-3" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="lg:ml-64 flex flex-col min-h-screen pb-16 lg:pb-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-gray-200/60 flex-shrink-0">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden hover:bg-gray-100 rounded-lg"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>

              {/* Search - Desktop */}
              <div className="hidden sm:block relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search patients, beds..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="pl-10 pr-4 py-2 w-72 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 focus:bg-white transition-all"
                />
              </div>

              {/* Search toggle - Mobile */}
              {!searchExpanded && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="sm:hidden"
                  onClick={() => setSearchExpanded(true)}
                >
                  <Search className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Mobile expanded search */}
            {searchExpanded && (
              <div className="absolute inset-x-0 top-0 h-16 bg-white z-50 flex items-center px-4 sm:hidden dropdown-enter">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    autoFocus
                    className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setSearchExpanded(false); setSearchValue(''); }} className="ml-2">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="flex items-center gap-2">
              {/* Notification Bell */}
              <div ref={notifRef} className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative hover:bg-gray-100 rounded-lg"
                  onClick={() => { setNotificationOpen(!notificationOpen); setProfileOpen(false); }}
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="notification-dot absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Button>

                {/* Notification Dropdown */}
                {notificationOpen && (
                  <div className="dropdown-enter absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
                      <Badge variant="secondary" className="text-[10px]">{unreadCount} new</Badge>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {mockNotifications.map(n => (
                        <div
                          key={n.id}
                          className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0 ${n.unread ? 'bg-indigo-50/50' : ''
                            }`}
                        >
                          <div className="flex items-start gap-3">
                            {n.unread && (
                              <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0" />
                            )}
                            <div className={!n.unread ? 'ml-5' : ''}>
                              <p className="text-sm text-gray-800 leading-snug">{n.text}</p>
                              <p className="text-xs text-gray-400 mt-1">{n.time}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 py-2 border-t border-gray-100">
                      <Button variant="ghost" size="sm" className="w-full text-indigo-600 hover:text-indigo-700 text-xs">
                        View All Notifications
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Avatar */}
              <div ref={profileRef} className="relative">
                <button
                  onClick={() => { setProfileOpen(!profileOpen); setNotificationOpen(false); }}
                  className="flex items-center gap-2 p-1.5 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
                    <span className="text-xs font-bold text-white">
                      {user?.name?.[0] || 'A'}
                    </span>
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-900 leading-tight">
                      {user?.name}
                    </p>
                    <p className="text-[10px] text-gray-500">Admission Dept.</p>
                  </div>
                </button>

                {/* Profile Dropdown */}
                {profileOpen && (
                  <div className="dropdown-enter absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                      <p className="text-xs text-gray-500">{user?.email || 'admission@citycare.com'}</p>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => { navigate('/admission/profile'); setProfileOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Settings className="h-4 w-4 text-gray-400" />
                        Settings
                      </button>
                      <button
                        onClick={() => { handleLogout(); setProfileOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Breadcrumbs */}
          <div className="px-4 sm:px-6 lg:px-8 py-2 border-t border-gray-100/60 bg-gray-50/50">
            <nav className="flex items-center gap-1.5 text-xs">
              <Link to="/admission" className="text-gray-400 hover:text-indigo-600 transition-colors flex items-center gap-1">
                <Home className="h-3 w-3" />
              </Link>
              {breadcrumbs.map((crumb, i) => (
                <span key={crumb.path} className="flex items-center gap-1.5">
                  <ChevronRight className="h-3 w-3 text-gray-300" />
                  {i === breadcrumbs.length - 1 ? (
                    <span className="font-medium text-gray-700">{crumb.label}</span>
                  ) : (
                    <Link to={crumb.path} className="text-gray-400 hover:text-indigo-600 transition-colors">
                      {crumb.label}
                    </Link>
                  )}
                </span>
              ))}
            </nav>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-gray-50 overflow-auto">
          <div key={location.pathname} className="page-enter">
            <Routes>
              <Route index element={<AdmissionHome />} />
              <Route path="new" element={<PatientAdmission />} />
              <Route path="financial" element={<FinancialClearance />} />
              <Route path="beds" element={<BedManagement />} />
              <Route path="discharge" element={<DischargeManagement />} />
              <Route path="emergency" element={<EmergencyAdmission />} />
              <Route path="reports" element={<AdmissionReports />} />
              <Route path="*" element={
                <div className="text-center py-12">
                  <h2 className="text-2xl font-semibold text-gray-600 mb-2">Page Not Found</h2>
                  <p className="text-gray-500">The admission page you're looking for doesn't exist.</p>
                  <Button className="mt-4" onClick={() => navigate('/admission')}>Go to Dashboard</Button>
                </div>
              } />
            </Routes>
          </div>
        </main>
      </div>

      {/* ===== MOBILE BOTTOM NAV ===== */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-lg border-t border-gray-200 shadow-lg">
        <nav className="flex items-center justify-around h-16 px-1">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`bottom-nav-item flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-xl min-w-0 ${active ? 'active' : 'text-gray-400'
                  }`}
              >
                <div className="relative">
                  <Icon className={`h-5 w-5 transition-colors ${active ? 'text-indigo-600' : ''}`} />
                  {item.badge && (
                    <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-medium truncate ${active ? 'text-indigo-600' : ''}`}>
                  {item.title === 'Bed Status' ? 'Beds' : item.title}
                </span>
                <div className={`bottom-nav-dot w-1 h-1 rounded-full bg-indigo-600 ${active ? 'opacity-100' : ''}`} />
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
