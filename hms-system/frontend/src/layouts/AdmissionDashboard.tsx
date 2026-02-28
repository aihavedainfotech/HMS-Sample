import { useState } from 'react';
import { Link, Routes, Route, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Bed,
  Users,
  ClipboardList,
  LogOut,
  Menu,
  X,
  Bell,
  Stethoscope,
} from 'lucide-react';

import AdmissionHome from '@/pages/dashboard/AdmissionHome';
import BedManagement from '@/pages/dashboard/BedManagement';
import PatientAdmission from '@/pages/dashboard/PatientAdmission';
import DischargeManagement from '@/pages/dashboard/DischargeManagement';

const navItems = [
  { name: 'Dashboard', href: '/admission', icon: LayoutDashboard },
  { name: 'Bed Management', href: '/admission/beds', icon: Bed },
  { name: 'New Admission', href: '/admission/new', icon: Users },
  { name: 'Discharge', href: '/admission/discharge', icon: ClipboardList },
];

export default function AdmissionDashboard() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const isActive = (path: string) => {
    if (path === '/admission') {
      return location.pathname === '/admission';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b z-50">
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Stethoscope className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-semibold hidden sm:inline">CityCare HMS</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">1</Badge>
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium">{user?.name?.charAt(0)}</span>
              </div>
              <span className="hidden md:inline text-sm">{user?.name}</span>
            </div>
          </div>
        </div>
      </header>

      <aside className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r transition-all duration-300 z-40 ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
        <nav className="p-4">
          <div className="mb-4 px-2">
            <p className="text-xs font-medium text-muted-foreground uppercase">Admission</p>
            <p className="text-sm">{user?.staff_id}</p>
          </div>
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.name}>
                <Link to={item.href} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive(item.href) ? 'bg-primary text-primary-foreground' : 'text-gray-700 hover:bg-gray-100'}`}>
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <Button variant="ghost" className="w-full justify-start" onClick={logout}>
            <LogOut className="h-5 w-5 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      <main className={`pt-16 min-h-screen transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <div className="p-6">
          <Routes>
            <Route index element={<AdmissionHome />} />
            <Route path="beds" element={<BedManagement />} />
            <Route path="new" element={<PatientAdmission />} />
            <Route path="discharge" element={<DischargeManagement />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
