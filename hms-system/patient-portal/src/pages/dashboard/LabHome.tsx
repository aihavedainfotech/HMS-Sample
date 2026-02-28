import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FlaskConical,
  ClipboardList,
  Clock,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface DashboardStats {
  pendingSamples: number;
  inProgress: number;
  pendingResults: number;
  completedToday: number;
}

export default function LabHome() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    pendingSamples: 0,
    inProgress: 0,
    pendingResults: 0,
    completedToday: 0,
  });

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('hms_token');
      const response = await fetch(`${API_URL}/lab/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setStats({
          pendingSamples: data.filter((o: { status: string }) => o.status === 'Pending').length,
          inProgress: data.filter((o: { status: string }) => o.status === 'In_Progress').length,
          pendingResults: data.filter((o: { status: string }) => o.status === 'Results_Entered').length,
          completedToday: data.filter((o: { status: string }) => o.status === 'Verified').length,
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
        <h1 className="text-2xl font-bold">Laboratory Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's the lab status today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Samples</p>
                <p className="text-2xl font-bold">{stats.pendingSamples}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FlaskConical className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Results</p>
                <p className="text-2xl font-bold">{stats.pendingResults}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <ClipboardList className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed Today</p>
                <p className="text-2xl font-bold">{stats.completedToday}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
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
              <FlaskConical className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="font-medium text-sm">Process Tests</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-lg text-center cursor-pointer hover:bg-primary/10 transition-colors">
              <ClipboardList className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="font-medium text-sm">Enter Results</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-lg text-center cursor-pointer hover:bg-primary/10 transition-colors">
              <Clock className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="font-medium text-sm">Collect Samples</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-lg text-center cursor-pointer hover:bg-primary/10 transition-colors">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="font-medium text-sm">Verify Results</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
