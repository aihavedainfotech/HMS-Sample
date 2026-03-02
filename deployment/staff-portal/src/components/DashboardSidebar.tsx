import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  CalendarPlus,
  FileText,
  FlaskConical,
  ClipboardList,
  CreditCard,
  UserCircle,
  LogOut,
  ChevronRight,
} from 'lucide-react';

const sidebarLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'My Appointments', href: '/dashboard/appointments', icon: Calendar },
  { name: 'Book Appointment', href: '/dashboard/appointments/book', icon: CalendarPlus },
  { name: 'Prescriptions', href: '/dashboard/prescriptions', icon: FileText },
  { name: 'Lab Results', href: '/dashboard/lab-results', icon: FlaskConical },
  { name: 'Medical Records', href: '/dashboard/medical-records', icon: ClipboardList },
  { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
  { name: 'My Profile', href: '/dashboard/profile', icon: UserCircle },
];

export default function DashboardSidebar() {
  const location = useLocation();
  const { logout, user } = useAuth();

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="fixed left-0 top-16 w-64 h-[calc(100vh-4rem)] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 overflow-y-auto z-40">
      {/* User Info */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <UserCircle className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.staff_id}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-2">
        <ul className="space-y-1">
          {sidebarLinks.map((link) => (
            <li key={link.name}>
              <Link
                to={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <link.icon className="h-5 w-5 shrink-0" />
                <span className="flex-1">{link.name}</span>
                {isActive(link.href) && (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
