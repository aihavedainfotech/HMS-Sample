import {
  LayoutDashboard,
  Search,
  FileText,
  CreditCard,
  TestTube,
  Microscope,
  FileBarChart,
  BarChart3,
} from 'lucide-react';

import StaffDashboardShell from '@/components/StaffDashboardShell';
import LabHome from '@/pages/dashboard/LabHome';
import PatientLookup from '@/pages/dashboard/PatientLookup';
import LabPrescriptions from '@/pages/dashboard/LabPrescriptions';
import LabPayments from '@/pages/dashboard/LabPayments';
import TestProcessing from '@/pages/dashboard/TestProcessing';
import LabResults from '@/pages/dashboard/LabResults';
import SampleCollection from '@/pages/dashboard/SampleCollection';
import LabReports from '@/pages/dashboard/LabReports';
import LabAnalysis from '@/pages/dashboard/LabAnalysis';
import LabAnalytics from '@/pages/dashboard/LabAnalytics';

const navItems = [
  { name: 'Dashboard', href: '/lab', icon: LayoutDashboard },
  { name: 'Patient Lookup', href: '/lab/patients', icon: Search },
  { name: 'Prescription', href: '/lab/prescriptions', icon: FileText },
  { name: 'Payment', href: '/lab/payments', icon: CreditCard },
  { name: 'Sample Collection', href: '/lab/samples', icon: TestTube },
  { name: 'Test', href: '/lab/processing', icon: Microscope },
  { name: 'Analysis', href: '/lab/analysis', icon: FileBarChart },
  { name: 'Reports', href: '/lab/results', icon: FileText },
  { name: 'Analytics', href: '/lab/analytics', icon: BarChart3 },
];

const routes = [
  { index: true, element: <LabHome /> },
  { path: 'patients', element: <PatientLookup /> },
  { path: 'prescriptions', element: <LabPrescriptions /> },
  { path: 'payments', element: <LabPayments /> },
  { path: 'processing', element: <TestProcessing /> },
  { path: 'results', element: <LabResults /> },
  { path: 'samples', element: <SampleCollection /> },
  { path: 'reports', element: <LabReports /> },
  { path: 'analysis', element: <LabAnalysis /> },
  { path: 'analytics', element: <LabAnalytics /> },
];

export default function LabDashboard() {
  return (
    <StaffDashboardShell
      roleName="Lab Technician"
      roleLabel="Laboratory Portal"
      basePath="/lab"
      navItems={navItems}
      routes={routes}
    />
  );
}
