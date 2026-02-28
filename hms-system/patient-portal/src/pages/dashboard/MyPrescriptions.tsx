import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  FileText,
  Calendar,
  User,
  Pill,
  Clock,
  Download,
  Printer,
  Search,
  Loader2,
  Eye,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Prescription } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function MyPrescriptions() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      const token = localStorage.getItem('hms_token');
      const response = await fetch(`${API_URL}/prescriptions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setPrescriptions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPrescriptions = prescriptions.filter(
    (p) =>
      p.doctor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.diagnosis?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Prescriptions</h1>
          <p className="text-muted-foreground">
            View and download your medical prescriptions
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search prescriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {filteredPrescriptions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No prescriptions found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPrescriptions.map((prescription) => (
            <Card key={prescription.prescription_id}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                      <FileText className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{prescription.doctor_name}</h3>
                        <Badge variant={prescription.status === 'Active' ? 'default' : 'secondary'}>
                          {prescription.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {prescription.diagnosis}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-sm">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {new Date(prescription.prescription_date).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Pill className="h-4 w-4 text-muted-foreground" />
                          {prescription.medicines?.length || 0} medicines
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedPrescription(prescription)}
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
          ))}
        </div>
      )}

      {/* Prescription Detail Dialog */}
      <Dialog
        open={!!selectedPrescription}
        onOpenChange={() => setSelectedPrescription(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prescription Details</DialogTitle>
          </DialogHeader>
          
          {selectedPrescription && (
            <div className="space-y-6">
              {/* Header */}
              <div className="border-b pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-5 w-5 text-primary" />
                  <span className="font-medium">{selectedPrescription.doctor_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {new Date(selectedPrescription.prescription_date).toLocaleString()}
                </div>
              </div>

              {/* Diagnosis */}
              <div>
                <h4 className="font-semibold mb-2">Diagnosis</h4>
                <p className="text-muted-foreground">{selectedPrescription.diagnosis}</p>
              </div>

              {/* Chief Complaint */}
              {selectedPrescription.chief_complaint && (
                <div>
                  <h4 className="font-semibold mb-2">Chief Complaint</h4>
                  <p className="text-muted-foreground">{selectedPrescription.chief_complaint}</p>
                </div>
              )}

              {/* Medicines */}
              <div>
                <h4 className="font-semibold mb-3">Prescribed Medicines</h4>
                <div className="space-y-3">
                  {selectedPrescription.medicines?.map((medicine, idx) => (
                    <div key={idx} className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{medicine.medicine_name}</span>
                        <Badge variant="outline">{medicine.frequency}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {medicine.strength} • {medicine.duration}
                      </div>
                      {medicine.instructions && (
                        <div className="text-sm mt-1">
                          <span className="text-muted-foreground">Instructions: </span>
                          {medicine.instructions}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              {selectedPrescription.general_instructions && (
                <div>
                  <h4 className="font-semibold mb-2">General Instructions</h4>
                  <p className="text-muted-foreground">{selectedPrescription.general_instructions}</p>
                </div>
              )}

              {/* Follow-up */}
              {selectedPrescription.follow_up_date && (
                <div>
                  <h4 className="font-semibold mb-2">Follow-up Date</h4>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-primary" />
                    {new Date(selectedPrescription.follow_up_date).toLocaleDateString()}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button variant="outline">
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
