import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FlaskConical, Search, Plus, FileText, Clock } from 'lucide-react';

const mockLabOrders = [
  {
    id: 'LAB0001',
    patientName: 'John Smith',
    patientId: 'P0001',
    date: '2024-01-15',
    tests: ['Complete Blood Count (CBC)', 'Lipid Profile', 'Blood Glucose'],
    status: 'pending',
    priority: 'routine',
  },
  {
    id: 'LAB0002',
    patientName: 'Sarah Johnson',
    patientId: 'P0002',
    date: '2024-01-14',
    tests: ['HbA1c', 'Thyroid Function Test'],
    status: 'completed',
    priority: 'routine',
  },
  {
    id: 'LAB0003',
    patientName: 'Michael Brown',
    patientId: 'P0003',
    date: '2024-01-14',
    tests: ['Chest X-Ray', 'ECG'],
    status: 'in-progress',
    priority: 'urgent',
  },
];

const availableTests = [
  'Complete Blood Count (CBC)',
  'Lipid Profile',
  'Blood Glucose',
  'HbA1c',
  'Thyroid Function Test',
  'Liver Function Test',
  'Kidney Function Test',
  'Urine Analysis',
  'Chest X-Ray',
  'ECG',
  'Ultrasound',
  'CT Scan',
];

export default function DoctorLabOrders() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTests, setSelectedTests] = useState<string[]>([]);

  const filteredOrders = mockLabOrders.filter(
    (order) =>
      order.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'in-progress':
        return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800">Pending</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge className="bg-red-100 text-red-800">Urgent</Badge>;
      case 'routine':
        return <Badge variant="outline">Routine</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const toggleTest = (test: string) => {
    setSelectedTests((prev) =>
      prev.includes(test) ? prev.filter((t) => t !== test) : [...prev, test]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lab Orders</h1>
          <p className="text-muted-foreground">Manage and track laboratory test orders</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Lab Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Lab Order</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Patient</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="P0001">John Smith (P0001)</SelectItem>
                    <SelectItem value="P0002">Sarah Johnson (P0002)</SelectItem>
                    <SelectItem value="P0003">Michael Brown (P0003)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Priority</label>
                <Select defaultValue="routine">
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="stat">STAT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Select Tests</label>
                <div className="border rounded-lg p-3 space-y-2 max-h-60 overflow-y-auto">
                  {availableTests.map((test) => (
                    <div key={test} className="flex items-center gap-2">
                      <Checkbox
                        id={test}
                        checked={selectedTests.includes(test)}
                        onCheckedChange={() => toggleTest(test)}
                      />
                      <label htmlFor={test} className="text-sm cursor-pointer">
                        {test}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <Button className="w-full">Create Lab Order</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search lab orders..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {filteredOrders.map((order) => (
          <Card key={order.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <Avatar>
                    <AvatarFallback>{order.patientName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{order.patientName}</span>
                      {getStatusBadge(order.status)}
                      {getPriorityBadge(order.priority)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {order.patientId} • {order.id}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {order.date}
                    </div>
                    <div className="mt-3">
                      <p className="text-sm font-medium mb-2">Ordered Tests:</p>
                      <div className="flex flex-wrap gap-2">
                        {order.tests.map((test, idx) => (
                          <Badge key={idx} variant="outline" className="flex items-center gap-1">
                            <FlaskConical className="h-3 w-3" />
                            {test}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {order.status === 'completed' && (
                    <Button size="sm">
                      <FileText className="h-4 w-4 mr-1" />
                      View Results
                    </Button>
                  )}
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-1" />
                    Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <div className="text-center py-12">
          <FlaskConical className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No lab orders found</h3>
          <p className="text-muted-foreground">Try adjusting your search criteria</p>
        </div>
      )}
    </div>
  );
}
