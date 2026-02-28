import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  HeartPulse,
  Pill,
  ClipboardList,
  Loader2,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface DashboardStats {
  totalPatients: number;
  pendingVitals: number;
  pendingMedications: number;
  criticalPatients: number;
}

export default function NurseHome() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    pendingVitals: 0,
    pendingMedications: 0,
    criticalPatients: 0,
  });

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('hms_token');
      
      // Fetch admissions
      const admissionsRes = await fetch(`${API_URL}/admissions?status=Admitted`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const admissions = await admissionsRes.json();

      setStats({
        totalPatients: Array.isArray(admissions) ? admissions.length : 0,
        pendingVitals: 5, // Mock data
        pendingMedications: 8, // Mock data
        criticalPatients: 2, // Mock data
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nursing Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's your nursing station overview.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Patients</p>
                <p className="text-2xl font-bold">{stats.totalPatients}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Vitals</p>
                <p className="text-2xl font-bold">{stats.pendingVitals}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <HeartPulse className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Meds</p>
                <p className="text-2xl font-bold">{stats.pendingMedications}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Pill className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold">{stats.criticalPatients}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <ClipboardList className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-primary/5 rounded-lg text-center cursor-pointer hover:bg-primary/10 transition-colors">
              <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="font-medium text-sm">View Patients</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-lg text-center cursor-pointer hover:bg-primary/10 transition-colors">
              <HeartPulse className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="font-medium text-sm">Record Vitals</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-lg text-center cursor-pointer hover:bg-primary/10 transition-colors">
              <Pill className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="font-medium text-sm">Give Medication</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-lg text-center cursor-pointer hover:bg-primary/10 transition-colors">
              <ClipboardList className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="font-medium text-sm">Nursing Notes</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
