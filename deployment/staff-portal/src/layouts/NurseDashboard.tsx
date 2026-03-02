import {
  LayoutDashboard,
  Users,
  HeartPulse,
  Pill,
  FlaskConical,
  BedDouble,
  ClipboardList,
  FileHeart,
  Bell,
  TrendingUp,
} from 'lucide-react';

import StaffDashboardShell from '@/components/StaffDashboardShell';
import NurseHome from '@/pages/dashboard/NurseHome';
import MedicationAdmin from '@/pages/dashboard/MedicationAdmin';
import VitalSigns from '@/pages/dashboard/VitalSigns';
import NurseLabDashboard from '@/pages/dashboard/NurseLabDashboard';
import NurseBedManagement from '@/pages/dashboard/NurseBedManagement';
import ShiftHandover from '@/pages/dashboard/ShiftHandover';
import NurseCarePlan from '@/pages/dashboard/NurseCarePlan';
import NurseAlerts from '@/pages/dashboard/NurseAlerts';
import NurseAnalytics from '@/pages/dashboard/NurseAnalytics';

const navItems = [
  { name: 'Dashboard', href: '/nurse', icon: LayoutDashboard },
  { name: 'Medication', href: '/nurse/medication', icon: Pill },
  { name: 'Vitals', href: '/nurse/vitals', icon: HeartPulse },
  { name: 'Lab Orders', href: '/nurse/lab', icon: FlaskConical },
  { name: 'Beds', href: '/nurse/beds', icon: BedDouble },
  { name: 'Shift Handover', href: '/nurse/handover', icon: ClipboardList },
  { name: 'Care Plans', href: '/nurse/care-plans', icon: FileHeart },
  { name: 'Alerts', href: '/nurse/alerts', icon: Bell },
  { name: 'Analytics', href: '/nurse/analytics', icon: TrendingUp },
];

const routes = [
  { index: true, element: <NurseHome /> },
  { path: 'medication', element: <MedicationAdmin /> },
  { path: 'vitals', element: <VitalSigns /> },
  { path: 'lab', element: <NurseLabDashboard /> },
  { path: 'beds', element: <NurseBedManagement /> },
  { path: 'handover', element: <ShiftHandover /> },
  { path: 'care-plans', element: <NurseCarePlan /> },
  { path: 'alerts', element: <NurseAlerts /> },
  { path: 'analytics', element: <NurseAnalytics /> },
];

export default function NurseDashboard() {
  return (
    <StaffDashboardShell
      roleName="Nurse"
      roleLabel="Nursing Station"
      basePath="/nurse"
      navItems={navItems}
      routes={routes}
    />
  );
}
