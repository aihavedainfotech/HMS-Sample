import {
  LayoutDashboard,
  FileText,
  Package,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';

import StaffDashboardShell from '@/components/StaffDashboardShell';
import PharmacistHome from '@/pages/dashboard/PharmacistHome';
import PrescriptionDispensing from '@/pages/dashboard/PrescriptionDispensing';
import MedicineInventory from '@/pages/dashboard/MedicineInventory';
import StockAlerts from '@/pages/dashboard/StockAlerts';
import PharmacyAnalytics from '@/pages/dashboard/PharmacyAnalytics';

const navItems = [
  { name: 'Dashboard', href: '/pharmacist', icon: LayoutDashboard },
  { name: 'Prescriptions', href: '/pharmacist/prescriptions', icon: FileText },
  { name: 'Inventory', href: '/pharmacist/inventory', icon: Package },
  { name: 'Stock Alerts', href: '/pharmacist/alerts', icon: AlertTriangle },
  { name: 'Analytics', href: '/pharmacist/analytics', icon: BarChart3 },
];

const routes = [
  { index: true, element: <PharmacistHome /> },
  { path: 'prescriptions', element: <PrescriptionDispensing /> },
  { path: 'inventory', element: <MedicineInventory /> },
  { path: 'alerts', element: <StockAlerts /> },
  { path: 'analytics', element: <PharmacyAnalytics /> },
];

export default function PharmacistDashboard() {
  return (
    <StaffDashboardShell
      roleName="Pharmacist"
      roleLabel="Pharmacy Portal"
      basePath="/pharmacist"
      navItems={navItems}
      routes={routes}
    />
  );
}
