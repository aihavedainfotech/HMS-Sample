import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Bed,
  Users,
  Clock,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface DashboardStats {
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  todayAdmissions: number;
  todayDischarges: number;
}

export default function AdmissionHome() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalBeds: 0,
    occupiedBeds: 0,
    availableBeds: 0,
    todayAdmissions: 0,
    todayDischarges: 0,
  });

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('hms_token');
      
      // Fetch bed availability
      const bedsRes = await fetch(`${API_URL}/beds/availability`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const beds = await bedsRes.json();

      // Fetch admissions
      const admissionsRes = await fetch(`${API_URL}/admissions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const admissions = await admissionsRes.json();

      if (Array.isArray(beds)) {
        const totalBeds = beds.reduce((sum, b) => sum + b.total_beds, 0);
        const occupiedBeds = beds.reduce((sum, b) => sum + b.occupied_beds, 0);
        setStats({
          totalBeds,
          occupiedBeds,
          availableBeds: totalBeds - occupiedBeds,
          todayAdmissions: Array.isArray(admissions) ? admissions.filter((a: { admission_date: string }) => 
            new Date(a.admission_date).toDateString() === new Date().toDateString()
          ).length : 0,
          todayDischarges: 0,
        });
      }
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
        <h1 className="text-2xl font-bold">Admission Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's the admission status today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Beds</p>
                <p className="text-2xl font-bold">{stats.totalBeds}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Bed className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Occupied</p>
                <p className="text-2xl font-bold">{stats.occupiedBeds}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-2xl font-bold">{stats.availableBeds}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Bed className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Admissions</p>
                <p className="text-2xl font-bold">{stats.todayAdmissions}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Discharges</p>
                <p className="text-2xl font-bold">{stats.todayDischarges}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Occupancy Rate */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bed Occupancy Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(stats.occupiedBeds / stats.totalBeds) * 100}%` }}
                />
              </div>
            </div>
            <span className="font-medium">
              {Math.round((stats.occupiedBeds / stats.totalBeds) * 100)}%
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {stats.occupiedBeds} out of {stats.totalBeds} beds are currently occupied
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
