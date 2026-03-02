import {
  LayoutDashboard,
  UserPlus,
  Calendar,
  Users,
  CreditCard,
} from 'lucide-react';

import StaffDashboardShell from '@/components/StaffDashboardShell';
import ReceptionistHomeRealtime from '@/pages/dashboard/ReceptionistHomeRealtime';
import PatientRegistration from '@/pages/dashboard/PatientRegistration';
import AppointmentManagement from '@/pages/dashboard/AppointmentManagement';
import QueueManagement from '@/pages/dashboard/QueueManagement';
import FeeCollection from '@/pages/dashboard/FeeCollection';
import BookAppointment from '@/pages/dashboard/BookAppointment';

const navItems = [
  { name: 'Dashboard', href: '/receptionist', icon: LayoutDashboard },
  { name: 'Patient Registration', href: '/receptionist/registration', icon: UserPlus },
  { name: 'Appointments', href: '/receptionist/appointments', icon: Calendar },
  { name: 'Queue Management', href: '/receptionist/queue', icon: Users },
  { name: 'Fee Collection', href: '/receptionist/fees', icon: CreditCard },
];

const routes = [
  { index: true, element: <ReceptionistHomeRealtime /> },
  { path: 'registration', element: <PatientRegistration /> },
  { path: 'appointments', element: <AppointmentManagement /> },
  { path: 'appointments/book', element: <BookAppointment /> },
  { path: 'queue', element: <QueueManagement /> },
  { path: 'fees', element: <FeeCollection /> },
];

export default function ReceptionistDashboard() {
  return (
    <StaffDashboardShell
      roleName="Receptionist"
      roleLabel="Reception Portal"
      basePath="/receptionist"
      navItems={navItems}
      routes={routes}
    />
  );
}
