import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Download,
  User,
  Stethoscope,
  Eye,
  Search,
  AlertCircle,
  Pill,
  Activity
} from 'lucide-react';
import { usePatientAuth } from '@/contexts/PatientAuthContext';
import { toast } from 'sonner';

interface MedicalRecord {
  id: number;
  record_type: string;
  record_date: string;
  doctor_name: string;
  department: string;
  diagnosis?: string;
  treatment?: string;
  prescription?: string;
  lab_results?: string;
  notes?: string;
  status: string;
}

interface Prescription {
  id: number;
  prescription_id: string;
  prescription_date: string;
  doctor_name: string;
  diagnosis: string;
  medicines: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
  }>;
  instructions: string;
  status: string;
}

interface LabResult {
  id: number;
  test_name: string;
  test_date: string;
  doctor_name: string;
  status: string;
  result?: string;
  normal_range?: string;
  is_critical: boolean;
}

const MedicalRecords = () => {
  const { patient } = usePatientAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchMedicalRecords();
  }, []);

  const fetchMedicalRecords = async () => {
    try {
      const token = localStorage.getItem('patientToken');

      if (!token) {
        navigate('/patient/login');
        return;
      }

      // Helper for timeout
      const fetchWithTimeout = async (url: string) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 10000);
        try {
          const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` },
            signal: controller.signal
          });
          clearTimeout(id);
          return response;
        } catch (error) {
          clearTimeout(id);
          throw error;
        }
      };

      // Fetch medical records
      const recordsResponse = await fetchWithTimeout('/api/patient/medical-records');

      if (recordsResponse.status === 401) {
        localStorage.removeItem('patientToken');
        navigate('/patient/login');
        return;
      }

      // Fetch prescriptions
      const prescriptionsResponse = await fetchWithTimeout('/api/patient/prescriptions');

      // Fetch lab results
      const labResponse = await fetchWithTimeout('/api/patient/lab-results');

      if (recordsResponse.ok) {
        const recordsData = await recordsResponse.json();
        setMedicalRecords(recordsData.records || []);
      }

      if (prescriptionsResponse.ok) {
        const prescriptionsData = await prescriptionsResponse.json();
        setPrescriptions(prescriptionsData.prescriptions || []);
      }

      if (labResponse.ok) {
        const labData = await labResponse.json();
        setLabResults(labData.results || []);
      }

    } catch (error) {
      console.error('Error fetching medical records:', error);
      toast.error('Failed to fetch medical records');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'In_Progress':
        return 'bg-blue-100 text-blue-800';
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Dispensed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredRecords = medicalRecords.filter(record =>
    record.doctor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (record.diagnosis && record.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredPrescriptions = prescriptions.filter(prescription =>
    prescription.doctor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prescription.diagnosis.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLabResults = labResults.filter(result =>
    result.test_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    result.doctor_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading medical records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Medical Records</h1>
          <p className="text-gray-600 mt-1">Access your complete medical history and health records</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download All
          </Button>
        </div>
      </div>

      {/* Patient Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 rounded-full p-3">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{patient?.first_name} {patient?.last_name}</h3>
                <p className="text-sm text-gray-600">Patient ID: {patient?.patient_id}</p>
                <p className="text-sm text-gray-600">Date of Birth: {patient?.date_of_birth}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Total Records</p>
              <p className="text-2xl font-bold text-blue-600">
                {filteredRecords.length + filteredPrescriptions.length + filteredLabResults.length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('all')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'all'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            All Records
          </button>
          <button
            onClick={() => setActiveTab('prescriptions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'prescriptions'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Prescriptions
          </button>
          <button
            onClick={() => setActiveTab('lab-results')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'lab-results'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Lab Results
          </button>
        </nav>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'all' && (
        <div className="space-y-6">
          {/* Medical Records */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Visit History</h2>
            {filteredRecords.length > 0 ? (
              <div className="space-y-4">
                {filteredRecords.map((record) => (
                  <Card key={record.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <Badge className={getStatusColor(record.status)}>
                                {record.status}
                              </Badge>
                              <span className="text-sm font-medium text-gray-500">
                                {formatDate(record.record_date)}
                              </span>
                            </div>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center text-sm">
                                <Stethoscope className="h-4 w-4 mr-2 text-gray-400" />
                                <span className="font-medium">{record.doctor_name}</span>
                              </div>
                              <div className="text-sm text-gray-600">
                                <strong>Department:</strong> {record.department}
                              </div>
                              {record.diagnosis && (
                                <div className="text-sm text-gray-600">
                                  <strong>Diagnosis:</strong> {record.diagnosis}
                                </div>
                              )}
                            </div>
                            <div className="space-y-2">
                              {record.treatment && (
                                <div className="text-sm text-gray-600">
                                  <strong>Treatment:</strong> {record.treatment}
                                </div>
                              )}
                              {record.notes && (
                                <div className="text-sm text-gray-600">
                                  <strong>Notes:</strong> {record.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-12 pb-12 text-center">
                  <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No medical records found</h3>
                  <p className="text-gray-600">Your visit history will appear here</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {activeTab === 'prescriptions' && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Prescriptions</h2>
          {filteredPrescriptions.length > 0 ? (
            <div className="space-y-4">
              {filteredPrescriptions.map((prescription) => (
                <Card key={prescription.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center space-x-3 mb-2">
                          <Pill className="h-5 w-5 text-blue-600" />
                          <span className="font-medium">{prescription.prescription_id}</span>
                          <Badge className={getStatusColor(prescription.status)}>
                            {prescription.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          <strong>Date:</strong> {formatDate(prescription.prescription_date)}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Doctor:</strong> {prescription.doctor_name}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Diagnosis</h4>
                        <p className="text-sm text-gray-600">{prescription.diagnosis}</p>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Medicines</h4>
                        <div className="space-y-2">
                          {prescription.medicines.map((medicine, index) => (
                            <div key={index} className="bg-gray-50 rounded-lg p-3">
                              <p className="font-medium text-sm">{medicine.name}</p>
                              <p className="text-xs text-gray-600">
                                {medicine.dosage} - {medicine.frequency} - {medicine.duration}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {prescription.instructions && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-1">Instructions</h4>
                          <p className="text-sm text-gray-600">{prescription.instructions}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <Pill className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No prescriptions found</h3>
                <p className="text-gray-600">Your prescriptions will appear here</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'lab-results' && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Lab Results</h2>
          {filteredLabResults.length > 0 ? (
            <div className="space-y-4">
              {filteredLabResults.map((result) => (
                <Card key={result.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <Activity className="h-5 w-5 text-purple-600" />
                            <span className="font-medium">{result.test_name}</span>
                            {result.is_critical && (
                              <Badge className="bg-red-100 text-red-800">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Critical
                              </Badge>
                            )}
                            <Badge className={getStatusColor(result.status)}>
                              {result.status}
                            </Badge>
                          </div>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View Report
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">
                              <strong>Date:</strong> {formatDate(result.test_date)}
                            </p>
                            <p className="text-gray-600">
                              <strong>Doctor:</strong> {result.doctor_name}
                            </p>
                          </div>
                          <div>
                            {result.result && (
                              <p className="text-gray-600">
                                <strong>Result:</strong> {result.result}
                              </p>
                            )}
                            {result.normal_range && (
                              <p className="text-gray-600">
                                <strong>Normal Range:</strong> {result.normal_range}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <Activity className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No lab results found</h3>
                <p className="text-gray-600">Your lab test results will appear here</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default MedicalRecords;
