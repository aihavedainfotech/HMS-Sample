import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Building2,
  Users,
  Bed,
  Plus,
  Edit,
  Trash2,
  Stethoscope,
  FlaskConical,
  Pill,
} from 'lucide-react';

const mockDepartments = [
  {
    id: 1,
    name: 'Cardiology',
    code: 'CARD',
    head: 'Dr. Emily Johnson',
    staffCount: 12,
    bedCount: 20,
    occupiedBeds: 15,
    status: 'active',
    icon: Stethoscope,
    color: 'bg-red-500',
  },
  {
    id: 2,
    name: 'Orthopedics',
    code: 'ORTHO',
    head: 'Dr. Michael Chen',
    staffCount: 8,
    bedCount: 15,
    occupiedBeds: 10,
    status: 'active',
    icon: Stethoscope,
    color: 'bg-blue-500',
  },
  {
    id: 3,
    name: 'Pediatrics',
    code: 'PEDS',
    head: 'Dr. Sarah Wilson',
    staffCount: 15,
    bedCount: 25,
    occupiedBeds: 18,
    status: 'active',
    icon: Stethoscope,
    color: 'bg-green-500',
  },
  {
    id: 4,
    name: 'Laboratory',
    code: 'LAB',
    head: 'Dr. Robert Brown',
    staffCount: 10,
    bedCount: 0,
    occupiedBeds: 0,
    status: 'active',
    icon: FlaskConical,
    color: 'bg-purple-500',
  },
  {
    id: 5,
    name: 'Pharmacy',
    code: 'PHARM',
    head: 'Lisa Anderson',
    staffCount: 6,
    bedCount: 0,
    occupiedBeds: 0,
    status: 'active',
    icon: Pill,
    color: 'bg-amber-500',
  },
  {
    id: 6,
    name: 'General Ward',
    code: 'GW',
    head: 'Nurse Manager Jane',
    staffCount: 25,
    bedCount: 40,
    occupiedBeds: 32,
    status: 'active',
    icon: Bed,
    color: 'bg-cyan-500',
  },
];

export default function DepartmentManagement() {
  const [searchTerm, _setSearchTerm] = useState('');

  const filteredDepts = mockDepartments.filter(
    (dept) =>
      dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dept.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Department Management</h1>
          <p className="text-muted-foreground">Manage hospital departments and resources</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Department
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Department</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Department Name</label>
                <Input placeholder="Enter department name" />
              </div>
              <div>
                <label className="text-sm font-medium">Department Code</label>
                <Input placeholder="e.g., CARD" />
              </div>
              <div>
                <label className="text-sm font-medium">Department Head</label>
                <Input placeholder="Select department head" />
              </div>
              <div>
                <label className="text-sm font-medium">Number of Beds (if applicable)</label>
                <Input type="number" placeholder="0" />
              </div>
              <Button className="w-full">Add Department</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredDepts.map((dept) => (
          <Card key={dept.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${dept.color} rounded-lg flex items-center justify-center`}>
                    <dept.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{dept.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{dept.code}</p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Head:</span>
                <span className="font-medium">{dept.head}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Staff</p>
                    <p className="font-medium">{dept.staffCount}</p>
                  </div>
                </div>
                {dept.bedCount > 0 && (
                  <div className="flex items-center gap-2">
                    <Bed className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Beds</p>
                      <p className="font-medium">{dept.bedCount}</p>
                    </div>
                  </div>
                )}
              </div>

              {dept.bedCount > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Bed Occupancy</span>
                    <span className="font-medium">
                      {dept.occupiedBeds}/{dept.bedCount} (
                      {Math.round((dept.occupiedBeds / dept.bedCount) * 100)}%)
                    </span>
                  </div>
                  <Progress
                    value={(dept.occupiedBeds / dept.bedCount) * 100}
                    className="h-2"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-red-600">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredDepts.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No departments found</h3>
          <p className="text-muted-foreground">Try adjusting your search criteria</p>
        </div>
      )}
    </div>
  );
}
