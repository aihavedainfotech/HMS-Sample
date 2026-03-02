import {
  LayoutDashboard,
  Calendar,
  FileText,
  FlaskConical,
  Users,
  Stethoscope,
  User,
} from 'lucide-react';

import StaffDashboardShell from '@/components/StaffDashboardShell';
import DoctorHome from '@/pages/dashboard/DoctorHome';
import DoctorAppointments from '@/pages/dashboard/DoctorAppointments';
import DoctorTodayAppointments from '@/pages/dashboard/DoctorTodayAppointments';
import Consultation from '@/pages/dashboard/Consultation';
import DoctorPrescriptions from '@/pages/dashboard/DoctorPrescriptions';
import DoctorLabOrders from '@/pages/dashboard/DoctorLabOrders';
import DoctorProfile from '../pages/dashboard/DoctorProfile';

const navItems = [
  { name: 'Dashboard', href: '/doctor', icon: LayoutDashboard },
  { name: "Today's Queue", href: '/doctor/today-appointments', icon: Calendar },
  { name: 'All Appointments', href: '/doctor/appointments', icon: FileText },
  { name: 'Consultation', href: '/doctor/consultation', icon: Users },
  { name: 'Prescriptions', href: '/doctor/prescriptions', icon: Stethoscope },
  { name: 'Lab Orders', href: '/doctor/lab-orders', icon: FlaskConical },
  { name: 'My Info', href: '/doctor/profile', icon: User },
];

const routes = [
  { index: true, element: <DoctorHome /> },
  { path: 'today-appointments', element: <DoctorTodayAppointments /> },
  { path: 'appointments', element: <DoctorAppointments /> },
  { path: 'consultation', element: <Consultation /> },
  { path: 'prescriptions', element: <DoctorPrescriptions /> },
  { path: 'lab-orders', element: <DoctorLabOrders /> },
  { path: 'profile', element: <DoctorProfile /> },
];

export default function DoctorDashboard() {
  return (
    <StaffDashboardShell
      roleName="Doctor"
      roleLabel="Doctor Portal"
      basePath="/doctor"
      navItems={navItems}
      routes={routes}
    />
  );
}
