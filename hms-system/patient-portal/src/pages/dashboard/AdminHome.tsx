import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  UserCog,
  Bed,
  DollarSign,
  Calendar,
  Activity,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

const statsCards = [
  {
    title: 'Total Staff',
    value: '156',
    change: '+5',
    trend: 'up',
    icon: UserCog,
    color: 'bg-blue-500',
  },
  {
    title: 'Active Patients',
    value: '89',
    change: '+12',
    trend: 'up',
    icon: Users,
    color: 'bg-green-500',
  },
  {
    title: 'Occupied Beds',
    value: '67/100',
    change: '67%',
    trend: 'neutral',
    icon: Bed,
    color: 'bg-amber-500',
  },
  {
    title: 'Monthly Revenue',
    value: '$245K',
    change: '+8%',
    trend: 'up',
    icon: DollarSign,
    color: 'bg-purple-500',
  },
];

const recentActivities = [
  { id: 1, action: 'New patient registered', user: 'Receptionist John', time: '5 min ago', type: 'patient' },
  { id: 2, action: 'Appointment scheduled', user: 'Dr. Emily Johnson', time: '15 min ago', type: 'appointment' },
  { id: 3, action: 'Lab report uploaded', user: 'Lab Tech Lisa', time: '30 min ago', type: 'lab' },
  { id: 4, action: 'Prescription created', user: 'Dr. Michael Chen', time: '1 hour ago', type: 'prescription' },
  { id: 5, action: 'Patient discharged', user: 'Nurse Sarah', time: '2 hours ago', type: 'discharge' },
];

const departmentStats = [
  { name: 'Cardiology', occupancy: 85, patients: 24, staff: 12 },
  { name: 'Orthopedics', occupancy: 72, patients: 18, staff: 8 },
  { name: 'Pediatrics', occupancy: 90, patients: 32, staff: 15 },
  { name: 'General Ward', occupancy: 65, patients: 28, staff: 20 },
];

export default function AdminHome() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of hospital operations and key metrics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {stat.trend === 'up' && (
                      <ArrowUpRight className="h-4 w-4 text-green-500" />
                    )}
                    {stat.trend === 'down' && (
                      <ArrowDownRight className="h-4 w-4 text-red-500" />
                    )}
                    <span
                      className={`text-xs ${
                        stat.trend === 'up'
                          ? 'text-green-600'
                          : stat.trend === 'down'
                          ? 'text-red-600'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {stat.change}
                    </span>
                  </div>
                </div>
                <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Department Occupancy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {departmentStats.map((dept, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{dept.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {dept.patients} patients • {dept.staff} staff
                  </span>
                </div>
                <Progress value={dept.occupancy} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Occupancy</span>
                  <span>{dept.occupancy}%</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div
                    className={`w-2 h-2 rounded-full mt-2 ${
                      activity.type === 'patient'
                        ? 'bg-blue-500'
                        : activity.type === 'appointment'
                        ? 'bg-green-500'
                        : activity.type === 'lab'
                        ? 'bg-purple-500'
                        : activity.type === 'prescription'
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                    }`}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{activity.action}</p>
                    <p className="text-sm text-muted-foreground">
                      {activity.user} • {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Today's Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-4xl font-bold">48</p>
              <p className="text-sm text-muted-foreground mt-1">Scheduled appointments</p>
              <div className="flex justify-center gap-4 mt-4">
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  32 Completed
                </Badge>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  16 Pending
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Bed Availability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-4xl font-bold">33</p>
              <p className="text-sm text-muted-foreground mt-1">Beds available</p>
              <div className="flex justify-center gap-4 mt-4">
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  67 Occupied
                </Badge>
                <Badge variant="outline" className="bg-amber-50 text-amber-700">
                  33 Available
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Departments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-4xl font-bold">8</p>
              <p className="text-sm text-muted-foreground mt-1">Active departments</p>
              <div className="flex justify-center gap-4 mt-4">
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  156 Staff
                </Badge>
                <Badge variant="outline" className="bg-purple-50 text-purple-700">
                  24 Doctors
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
