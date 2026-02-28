import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ClipboardList,
  Calendar,
  User,
  Stethoscope,
  Pill,
  FlaskConical,
  Bed,
  FileText,
  Download,
  Loader2,
  Eye,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';


interface MedicalRecord {
  id: string;
  type: 'Visit' | 'Prescription' | 'Lab_Result' | 'Admission' | 'Surgery';
  title: string;
  date: string;
  doctor: string;
  department: string;
  description: string;
}

export default function MedicalRecords() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);

  useEffect(() => {
    fetchMedicalRecords();
  }, []);

  const fetchMedicalRecords = async () => {
    try {
      // In a real app, this would fetch from an API
      // For now, we'll use mock data
      const mockRecords: MedicalRecord[] = [
        {
          id: '1',
          type: 'Visit',
          title: 'General Checkup',
          date: '2024-01-15',
          doctor: 'Dr. Arun Desai',
          department: 'General Medicine',
          description: 'Routine annual health checkup. All vitals normal.',
        },
        {
          id: '2',
          type: 'Prescription',
          title: 'Fever Treatment',
          date: '2024-01-10',
          doctor: 'Dr. Kavita Malhotra',
          department: 'General Medicine',
          description: 'Prescribed medication for viral fever.',
        },
        {
          id: '3',
          type: 'Lab_Result',
          title: 'Blood Test',
          date: '2024-01-05',
          doctor: 'Dr. Arun Desai',
          department: 'Pathology',
          description: 'Complete blood count test. Results within normal range.',
        },
      ];
      setRecords(mockRecords);
    } catch (error) {
      console.error('Error fetching medical records:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRecordIcon = (type: string) => {
    const icons: Record<string, any> = {
      Visit: Stethoscope,
      Prescription: Pill,
      Lab_Result: FlaskConical,
      Admission: Bed,
      Surgery: FileText,
    };
    return icons[type] || ClipboardList;
  };

  const getRecordColor = (type: string) => {
    const colors: Record<string, string> = {
      Visit: 'bg-blue-100 text-blue-600',
      Prescription: 'bg-green-100 text-green-600',
      Lab_Result: 'bg-purple-100 text-purple-600',
      Admission: 'bg-orange-100 text-orange-600',
      Surgery: 'bg-red-100 text-red-600',
    };
    return colors[type] || 'bg-gray-100 text-gray-600';
  };

  const filterRecordsByType = (type: string) => {
    if (type === 'all') return records;
    return records.filter((r) => r.type === type);
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
        <h1 className="text-2xl font-bold">Medical Records</h1>
        <p className="text-muted-foreground">
          View your complete medical history and health records
        </p>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Records</TabsTrigger>
          <TabsTrigger value="Visit">Visits</TabsTrigger>
          <TabsTrigger value="Prescription">Prescriptions</TabsTrigger>
          <TabsTrigger value="Lab_Result">Lab Results</TabsTrigger>
        </TabsList>

        {['all', 'Visit', 'Prescription', 'Lab_Result'].map((tab) => (
          <TabsContent key={tab} value={tab}>
            <div className="space-y-4">
              {filterRecordsByType(tab).length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No records found</p>
                  </CardContent>
                </Card>
              ) : (
                filterRecordsByType(tab).map((record) => {
                  const Icon = getRecordIcon(record.type);
                  return (
                    <Card key={record.id}>
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${getRecordColor(record.type)}`}>
                              <Icon className="h-6 w-6" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold">{record.title}</h3>
                                <Badge variant="outline">{record.type.replace('_', ' ')}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {record.description}
                              </p>
                              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm">
                                <span className="flex items-center gap-1">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  {record.doctor}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  {new Date(record.date).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedRecord(record)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Record Detail Dialog */}
      <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Medical Record Details</DialogTitle>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-6">
              <div className="border-b pb-4">
                <div className="flex items-center gap-2 mb-2">
                  {(() => {
                    const Icon = getRecordIcon(selectedRecord.type);
                    return <Icon className="h-5 w-5 text-primary" />;
                  })()}
                  <span className="font-semibold text-lg">{selectedRecord.title}</span>
                </div>
                <Badge variant="outline">{selectedRecord.type.replace('_', ' ')}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {new Date(selectedRecord.date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Doctor</p>
                  <p className="font-medium">{selectedRecord.doctor}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p className="font-medium">{selectedRecord.department}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <p>{selectedRecord.description}</p>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Download Record
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
