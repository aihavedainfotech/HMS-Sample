import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  Calendar,
  DollarSign,
  Activity,
  Download,
  FileText,
  Printer,
} from 'lucide-react';

const mockMonthlyData = [
  { month: 'Jan', patients: 450, revenue: 125000, appointments: 380 },
  { month: 'Feb', patients: 520, revenue: 142000, appointments: 420 },
  { month: 'Mar', patients: 480, revenue: 138000, appointments: 400 },
  { month: 'Apr', patients: 590, revenue: 165000, appointments: 510 },
  { month: 'May', patients: 620, revenue: 178000, appointments: 540 },
  { month: 'Jun', patients: 680, revenue: 195000, appointments: 590 },
];

const mockDepartmentStats = [
  { name: 'Cardiology', patients: 156, revenue: 450000, occupancy: 85 },
  { name: 'Orthopedics', patients: 124, revenue: 380000, occupancy: 78 },
  { name: 'Pediatrics', patients: 198, revenue: 290000, occupancy: 92 },
  { name: 'General Medicine', patients: 267, revenue: 420000, occupancy: 88 },
];

const mockTopDoctors = [
  { name: 'Dr. Emily Johnson', department: 'Cardiology', patients: 145, rating: 4.9 },
  { name: 'Dr. Michael Chen', department: 'Orthopedics', patients: 132, rating: 4.8 },
  { name: 'Dr. Sarah Wilson', department: 'Pediatrics', patients: 189, rating: 4.9 },
  { name: 'Dr. Robert Brown', department: 'General Medicine', patients: 156, rating: 4.7 },
];

export default function ReportsAnalytics() {
  const [dateRange, setDateRange] = useState('last_30_days');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">View hospital performance metrics and reports</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="last_7_days">Last 7 Days</SelectItem>
              <SelectItem value="last_30_days">Last 30 Days</SelectItem>
              <SelectItem value="last_90_days">Last 90 Days</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Patients</p>
                <p className="text-2xl font-bold">3,240</p>
                <p className="text-xs text-green-600 mt-1">+12% from last month</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">$1.24M</p>
                <p className="text-xs text-green-600 mt-1">+8% from last month</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Appointments</p>
                <p className="text-2xl font-bold">2,840</p>
                <p className="text-xs text-green-600 mt-1">+15% from last month</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Satisfaction</p>
                <p className="text-2xl font-bold">4.8/5</p>
                <p className="text-xs text-green-600 mt-1">+0.2 from last month</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <Activity className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="doctors">Doctors</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockMonthlyData.map((data, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <span className="w-12 text-sm font-medium">{data.month}</span>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-20">Patients</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${(data.patients / 700) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm w-12 text-right">{data.patients}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-20">Revenue</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${(data.revenue / 200000) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm w-12 text-right">
                          ${(data.revenue / 1000).toFixed(0)}k
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {mockDepartmentStats.map((dept, index) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{dept.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">{dept.patients}</p>
                      <p className="text-xs text-muted-foreground">Patients</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">${(dept.revenue / 1000).toFixed(0)}k</p>
                      <p className="text-xs text-muted-foreground">Revenue</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{dept.occupancy}%</p>
                      <p className="text-xs text-muted-foreground">Occupancy</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="doctors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Doctors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockTopDoctors.map((doctor, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{doctor.name}</p>
                        <p className="text-sm text-muted-foreground">{doctor.department}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="font-medium">{doctor.patients}</p>
                        <p className="text-xs text-muted-foreground">Patients</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{doctor.rating}</p>
                        <p className="text-xs text-muted-foreground">Rating</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">$1.24M</p>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg text-center">
                  <p className="text-2xl font-bold">$485K</p>
                  <p className="text-sm text-muted-foreground">Operating Costs</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">$755K</p>
                  <p className="text-sm text-muted-foreground">Net Profit</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg text-center">
                  <p className="text-2xl font-bold">61%</p>
                  <p className="text-sm text-muted-foreground">Profit Margin</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Revenue Breakdown</h4>
                <div className="space-y-2">
                  {[
                    { label: 'Consultations', value: 450000, percent: 36 },
                    { label: 'Procedures', value: 380000, percent: 31 },
                    { label: 'Laboratory', value: 210000, percent: 17 },
                    { label: 'Pharmacy', value: 125000, percent: 10 },
                    { label: 'Other', value: 75000, percent: 6 },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <span className="w-32 text-sm">{item.label}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-3">
                        <div
                          className="bg-primary h-3 rounded-full"
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                      <span className="w-20 text-sm text-right">
                        ${(item.value / 1000).toFixed(0)}k
                      </span>
                      <span className="w-12 text-sm text-muted-foreground text-right">
                        {item.percent}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button variant="outline">
          <Printer className="h-4 w-4 mr-2" />
          Print Report
        </Button>
        <Button>
          <FileText className="h-4 w-4 mr-2" />
          Generate Full Report
        </Button>
      </div>
    </div>
  );
}
