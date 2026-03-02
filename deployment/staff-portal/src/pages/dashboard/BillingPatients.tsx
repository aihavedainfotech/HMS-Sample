import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Users,
  FileText,
  CreditCard,
  Calendar,
  Phone,
  Mail,
  Filter,
  Download,
  Eye,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Receipt,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';

interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  total_bills: number;
  pending_amount: number;
  paid_amount: number;
  last_visit: string;
  status: string;
}

interface PatientSummary {
  total_patients: number;
  active_patients: number;
  patients_with_pending: number;
  total_pending_amount: number;
}

type SortField = 'name' | 'pending' | 'last_visit';

export default function BillingPatients() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [summary, setSummary] = useState<PatientSummary>({ total_patients: 0, active_patients: 0, patients_with_pending: 0, total_pending_amount: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);
  const perPage = 10;

  const fetchPatients = useCallback(async () => {
    try {
      const token = localStorage.getItem('hms_staff_token');
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`${API_URL}/billing/patients?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      setPatients(data.patients || []);
      setSummary(data.summary || { total_patients: 0, active_patients: 0, patients_with_pending: 0, total_pending_amount: 0 });
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  useEffect(() => {
    const timer = setTimeout(() => fetchPatients(), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Sort
  const sorted = [...patients].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortField === 'name') return dir * (a.name || '').localeCompare(b.name || '');
    if (sortField === 'pending') return dir * ((a.pending_amount || 0) - (b.pending_amount || 0));
    return dir * (new Date(a.last_visit || 0).getTime() - new Date(b.last_visit || 0).getTime());
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
  const paginated = sorted.slice((currentPage - 1) * perPage, currentPage * perPage);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  const getStatusBadge = (status: string) => {
    return status?.toLowerCase() === 'active' ? (
      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 text-xs">
        <CheckCircle className="h-3 w-3 mr-1" />
        Active
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200 text-xs">
        <Clock className="h-3 w-3 mr-1" />
        {status || 'Inactive'}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (amount: number) => {
    if (amount <= 0) {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 text-xs">
          <CheckCircle className="h-3 w-3 mr-1" />
          Clear
        </Badge>
      );
    }
    if (amount > 1000) {
      return (
        <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 text-xs">
          <AlertCircle className="h-3 w-3 mr-1" />
          ₹{amount.toLocaleString()} due
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
        <Clock className="h-3 w-3 mr-1" />
        ₹{amount.toLocaleString()} due
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <span className="mt-3 block text-sm text-gray-500">Loading patients...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <style>{`
        .patient-card { transition: all 0.2s ease; }
        .patient-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
        .expand-enter { animation: expandIn 0.3s ease-out; }
        @keyframes expandIn { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 300px; } }
      `}</style>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Portal</h1>
          <p className="text-gray-500 text-sm mt-1">View patient billing details and history</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="sm" className="rounded-xl">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Patients</p>
                <p className="text-2xl font-bold text-gray-900">{summary.total_patients}</p>
              </div>
              <div className="w-11 h-11 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                <Users className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Active Patients</p>
                <p className="text-2xl font-bold text-gray-900">{summary.active_patients}</p>
              </div>
              <div className="w-11 h-11 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-sm">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Pending Payments</p>
                <p className="text-2xl font-bold text-gray-900">{summary.patients_with_pending}</p>
              </div>
              <div className="w-11 h-11 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-sm">
                <Clock className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Pending</p>
                <p className="text-2xl font-bold text-gray-900">₹{summary.total_pending_amount.toLocaleString()}</p>
              </div>
              <div className="w-11 h-11 bg-gradient-to-br from-red-400 to-red-600 rounded-xl flex items-center justify-center shadow-sm">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Sort */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, email, or ID..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="pl-10 rounded-xl border-gray-200"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400 font-medium">Sort:</span>
          {([
            { field: 'name' as SortField, label: 'Name' },
            { field: 'pending' as SortField, label: 'Pending Amount' },
            { field: 'last_visit' as SortField, label: 'Last Visit' },
          ]).map(s => (
            <button
              key={s.field}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border transition-all ${sortField === s.field ? 'bg-blue-50 text-blue-700 border-blue-200 font-semibold' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              onClick={() => handleSort(s.field)}
            >
              <ArrowUpDown className="h-3 w-3" />
              {s.label}
              {sortField === s.field && <span className="text-[10px]">{sortDir === 'asc' ? '↑' : '↓'}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Patient List */}
      <div className="space-y-3">
        {paginated.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-10 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">No patients found</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting your search</p>
            </CardContent>
          </Card>
        ) : (
          paginated.map((patient) => {
            const isExpanded = expandedPatient === patient.id;
            return (
              <Card key={patient.id} className="patient-card border-0 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  {/* Main Row */}
                  <div
                    className="p-5 cursor-pointer hover:bg-gray-50/50 transition-colors"
                    onClick={() => setExpandedPatient(isExpanded ? null : patient.id)}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                          <span className="text-sm font-bold text-white">{patient.name?.[0] || '?'}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-sm text-gray-900">{patient.name}</h3>
                            <span className="text-xs text-gray-400">({patient.id})</span>
                            {getStatusBadge(patient.status)}
                            {getPaymentStatusBadge(patient.pending_amount || 0)}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                            {patient.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {patient.email}
                              </span>
                            )}
                            {patient.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {patient.phone}
                              </span>
                            )}
                            {patient.last_visit && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Last: {new Date(patient.last_visit).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right mr-2">
                          <p className="text-xs text-gray-400">{patient.total_bills || 0} bills</p>
                          <p className="text-sm font-bold text-gray-900">₹{(patient.pending_amount || 0).toLocaleString()}</p>
                        </div>
                        <div className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="expand-enter border-t border-gray-100 bg-gray-50/50 p-5">
                      <div className="grid sm:grid-cols-3 gap-4 mb-4">
                        <div className="p-3 bg-white rounded-xl border border-gray-100">
                          <p className="text-xs text-gray-400 mb-1">Total Bills</p>
                          <p className="text-lg font-bold text-gray-900">{patient.total_bills || 0}</p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-gray-100">
                          <p className="text-xs text-gray-400 mb-1">Total Paid</p>
                          <p className="text-lg font-bold text-green-600">₹{(patient.paid_amount || 0).toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-gray-100">
                          <p className="text-xs text-gray-400 mb-1">Pending</p>
                          <p className="text-lg font-bold text-amber-600">₹{(patient.pending_amount || 0).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline" className="rounded-xl text-xs" onClick={(e) => { e.stopPropagation(); navigate(`/billing/billing?search=${patient.id}`); }}>
                          <FileText className="h-3.5 w-3.5 mr-1" />
                          View Bills
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-xl text-xs" onClick={(e) => { e.stopPropagation(); navigate(`/billing/payments?search=${patient.id}`); }}>
                          <Receipt className="h-3.5 w-3.5 mr-1" />
                          Payment History
                        </Button>
                        {(patient.pending_amount || 0) > 0 && (
                          <Button size="sm" className="rounded-xl text-xs bg-green-600 hover:bg-green-700" onClick={(e) => { e.stopPropagation(); navigate(`/billing/billing?search=${patient.id}`); }}>
                            <CreditCard className="h-3.5 w-3.5 mr-1" />
                            Collect Payment
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-400">
            Showing {(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, sorted.length)} of {sorted.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
                Math.max(0, currentPage - 3),
                Math.min(totalPages, currentPage + 2)
              ).map(page => (
                <button
                  key={page}
                  className={`w-8 h-8 text-xs rounded-lg transition-all ${page === currentPage
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
