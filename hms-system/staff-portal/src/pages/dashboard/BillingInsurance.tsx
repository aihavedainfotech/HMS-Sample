import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Search,
  Shield,
  FileText,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  Eye,
  TrendingUp,
  Users,
  X,
  ArrowRight,
  Loader2,
  RefreshCw,
  Plus,
  Send
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface InsuranceClaim {
  claim_id: number;
  claim_ref: string;
  patient_id: string;
  patient_name: string;
  provider: string;
  policy_number: string;
  claim_amount: number;
  approved_amount: number;
  status: string;
  submission_date: string;
  notes: string;
}

interface InsuranceTotals {
  total_claims_amount: number;
  approved_amount: number;
  pending_count: number;
  rejected_count: number;
}

export default function BillingInsurance() {
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [totals, setTotals] = useState<InsuranceTotals>({
    total_claims_amount: 0,
    approved_amount: 0,
    pending_count: 0,
    rejected_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedClaim, setSelectedClaim] = useState<InsuranceClaim | null>(null);
  const [processClaim, setProcessClaim] = useState<InsuranceClaim | null>(null);
  const [processStatus, setProcessStatus] = useState('Approved');
  const [approvedAmount, setApprovedAmount] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // New Request State
  const [newRequestOpen, setNewRequestOpen] = useState(false);
  const [requestProcessing, setRequestProcessing] = useState(false);
  const [patientDetails, setPatientDetails] = useState<any>(null);
  const [searchingPatient, setSearchingPatient] = useState(false);
  const [newRequest, setNewRequest] = useState({
    patient_id: '',
    provider: '',
    provider_email: '',
    policy_number: '',
    claim_amount: '',
    notes: ''
  });

  const fetchInsurance = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      const token = localStorage.getItem('hms_staff_token');
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`${API_URL}/billing/insurance?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

      const data = await response.json();
      setClaims(data.claims || []);
      setTotals(data.totals || {
        total_claims_amount: 0,
        approved_amount: 0,
        pending_count: 0,
        rejected_count: 0,
      });
      setError('');
    } catch (err: any) {
      console.error('Insurance fetch error:', err);
      setError(err.message || 'Failed to load insurance data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterStatus, searchTerm]);

  useEffect(() => {
    setLoading(true);
    fetchInsurance();
  }, [fetchInsurance]);

  useEffect(() => {
    const timer = setTimeout(() => { fetchInsurance(); }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleProcessClaim = async () => {
    if (!processClaim) return;

    if (processStatus === 'Approved' && !approvedAmount) {
      toast.error('Please enter the approved amount');
      return;
    }

    try {
      const token = localStorage.getItem('hms_staff_token');
      const response = await fetch(`${API_URL}/billing/insurance/${processClaim.claim_id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: processStatus,
          approved_amount: processStatus === 'Approved' ? parseFloat(approvedAmount) : undefined
        }),
      });

      if (response.ok) {
        toast.success(`Claim marked as ${processStatus}`);
        setProcessClaim(null);
        setApprovedAmount('');
        fetchInsurance();
      } else {
        const errData = await response.json();
        toast.error(errData.error || 'Failed to update claim');
      }
    } catch (err) {
      console.error('Process claim error:', err);
      toast.error('Network error while processing claim');
    }
  };

  const handlePatientSearch = async () => {
    if (!newRequest.patient_id || newRequest.patient_id.length < 3) {
      toast.error("Please enter a valid Patient ID");
      return;
    }

    setSearchingPatient(true);
    try {
      const token = localStorage.getItem('hms_staff_token');
      const response = await fetch(`${API_URL}/billing/insurance/patient/${newRequest.patient_id.trim()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPatientDetails(data);

        setNewRequest(prev => ({
          ...prev,
          provider: data.insurance_provider || prev.provider,
          policy_number: data.insurance_policy_number || prev.policy_number,
          provider_email: data.email || prev.provider_email,
        }));
        toast.success("Patient details loaded");
      } else {
        setPatientDetails(null);
        toast.error("Patient not found");
      }
    } catch (err) {
      console.error("Error fetching patient:", err);
      setPatientDetails(null);
      toast.error("Network error while searching patient");
    } finally {
      setSearchingPatient(false);
    }
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newRequest.patient_id || !newRequest.provider || !newRequest.provider_email || !newRequest.policy_number || !newRequest.claim_amount) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setRequestProcessing(true);
    try {
      const token = localStorage.getItem('hms_staff_token');
      const response = await fetch(`${API_URL}/billing/insurance/request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newRequest,
          claim_amount: parseFloat(newRequest.claim_amount)
        })
      });

      if (response.ok) {
        toast.success("Insurance request sent successfully!");
        setNewRequestOpen(false);
        setNewRequest({
          patient_id: '', provider: '', provider_email: '', policy_number: '', claim_amount: '', notes: ''
        });
        fetchInsurance();
      } else {
        const errData = await response.json();
        toast.error(errData.error || "Failed to send request");
      }
    } catch (err) {
      console.error("Send request error:", err);
      toast.error("Network error while sending request");
    } finally {
      setRequestProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { icon: any; className: string }> = {
      Approved: { icon: CheckCircle, className: 'bg-green-100 text-green-700 border-green-200' },
      approved: { icon: CheckCircle, className: 'bg-green-100 text-green-700 border-green-200' },
      Pending: { icon: Clock, className: 'bg-amber-100 text-amber-700 border-amber-200' },
      pending: { icon: Clock, className: 'bg-amber-100 text-amber-700 border-amber-200' },
      Under_Review: { icon: AlertCircle, className: 'bg-blue-100 text-blue-700 border-blue-200' },
      processing: { icon: AlertCircle, className: 'bg-blue-100 text-blue-700 border-blue-200' },
      Rejected: { icon: X, className: 'bg-red-100 text-red-700 border-red-200' },
      rejected: { icon: X, className: 'bg-red-100 text-red-700 border-red-200' },
      Settled: { icon: CheckCircle, className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    };
    const config = variants[status] || { icon: Clock, className: 'bg-gray-100 text-gray-700' };
    return (
      <Badge variant="outline" className={`flex items-center gap-1 text-xs font-medium ${config.className}`}>
        <config.icon className="h-3 w-3" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const approvedClaimsCount = claims.filter(c => c.status === 'Approved' || c.status === 'approved').length;
  const uniqueProviders = new Set(claims.map(c => c.provider).filter(Boolean)).size;

  const statusFilters = [
    { value: 'all', label: 'All' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Under_Review', label: 'Under Review' },
    { value: 'Rejected', label: 'Rejected' },
    { value: 'Settled', label: 'Settled' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto" />
          <span className="mt-3 block text-sm text-gray-500">Loading insurance claims...</span>
        </div>
      </div>
    );
  }

  if (error && claims.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <p className="text-red-600 font-medium">{error}</p>
        <Button onClick={() => fetchInsurance()} className="rounded-xl">Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <style>{`
        .claim-card { transition: all 0.2s ease; position: relative; }
        .claim-card:hover { transform: translateX(4px); box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
        .claim-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; border-radius: 4px 0 0 4px; background: transparent; transition: background 0.2s; }
        .claim-card:hover::before { background: #8b5cf6; }
      `}</style>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Insurance Claims</h1>
          <p className="text-gray-500 text-sm mt-1">Manage insurance claims and provider information</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchInsurance(true)}
            disabled={refreshing}
            className="rounded-xl"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
          <Button
            className="rounded-xl bg-purple-600 hover:bg-purple-700 shadow-sm"
            onClick={() => {
              setNewRequest({ patient_id: '', provider: '', provider_email: '', policy_number: '', claim_amount: '', notes: '' });
              setPatientDetails(null);
              setNewRequestOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Send Request
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Claims</p>
                <p className="text-2xl font-bold text-gray-900">₹{(totals.total_claims_amount || 0).toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-xs text-green-600 font-medium">{claims.length} total claims</span>
                </div>
              </div>
              <div className="w-11 h-11 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                <Shield className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Approved Amount</p>
                <p className="text-2xl font-bold text-gray-900">₹{(totals.approved_amount || 0).toLocaleString()}</p>
              </div>
              <div className="w-11 h-11 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-sm">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Pending Claims</p>
                <p className="text-2xl font-bold text-gray-900">{totals.pending_count || 0}</p>
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
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Active Providers</p>
                <p className="text-2xl font-bold text-gray-900">{uniqueProviders}</p>
              </div>
              <div className="w-11 h-11 bg-gradient-to-br from-purple-400 to-violet-600 rounded-xl flex items-center justify-center shadow-sm">
                <Users className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search claims by patient, provider, or policy..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rounded-xl border-gray-200"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400 font-medium">Status:</span>
              {statusFilters.map(f => (
                <button
                  key={f.value}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filterStatus === f.value
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}
                  onClick={() => setFilterStatus(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {claims.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">No insurance claims found</p>
                <p className="text-xs text-gray-400 mt-1">Claims will appear here when submitted</p>
              </div>
            ) : (
              claims.map((claim) => (
                <Card key={claim.claim_id} className="claim-card border-0 shadow-sm overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-11 h-11 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
                          <Shield className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-sm text-gray-900">{claim.patient_name}</h3>
                            <span className="text-xs text-gray-400">({claim.patient_id})</span>
                            {getStatusBadge(claim.status)}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mb-2">
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              Claim: {claim.claim_ref || `#${claim.claim_id}`}
                            </span>
                            {claim.submission_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(claim.submission_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-gray-400">Provider: <span className="font-medium text-gray-600">{claim.provider || 'N/A'}</span></span>
                            <span className="text-gray-400">Policy: <span className="font-medium text-gray-600">{claim.policy_number || 'N/A'}</span></span>
                          </div>
                          <div className="flex items-center gap-4 text-xs mt-1.5">
                            <span className="text-gray-400">Claimed: <span className="font-semibold text-green-600">₹{(claim.claim_amount || 0).toLocaleString()}</span></span>
                            {claim.approved_amount > 0 && (
                              <span className="text-gray-400">Approved: <span className="font-semibold text-blue-600">₹{(claim.approved_amount || 0).toLocaleString()}</span></span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={() => setSelectedClaim(claim)}>
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Details
                        </Button>
                        {(claim.status === 'Pending' || claim.status === 'Under_Review') && (
                          <Button size="sm" className="rounded-xl text-xs" onClick={() => { setProcessClaim(claim); setProcessStatus('Approved'); setApprovedAmount(''); }}>
                            <ArrowRight className="h-3.5 w-3.5 mr-1" />
                            Process
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Claim Detail Dialog */}
      <Dialog open={!!selectedClaim} onOpenChange={() => setSelectedClaim(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-600" />
              Claim Details
            </DialogTitle>
          </DialogHeader>
          {selectedClaim && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-purple-50 rounded-xl border border-purple-100">
                <p className="text-2xl font-bold text-purple-700">₹{(selectedClaim.claim_amount || 0).toLocaleString()}</p>
                <p className="text-xs text-purple-600 mt-1">Claimed Amount</p>
                <div className="mt-2">{getStatusBadge(selectedClaim.status)}</div>
              </div>
              <div className="space-y-3">
                {[
                  ['Claim ID', selectedClaim.claim_ref || `#${selectedClaim.claim_id}`],
                  ['Patient', `${selectedClaim.patient_name} (${selectedClaim.patient_id})`],
                  ['Provider', selectedClaim.provider || 'N/A'],
                  ['Policy #', selectedClaim.policy_number || 'N/A'],
                  ['Approved', selectedClaim.approved_amount ? `₹${selectedClaim.approved_amount.toLocaleString()}` : 'Pending'],
                  ['Date', selectedClaim.submission_date ? new Date(selectedClaim.submission_date).toLocaleDateString() : 'N/A'],
                  ['Notes', selectedClaim.notes || 'None'],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-xs text-gray-500">{label}</span>
                    <span className="text-sm font-medium text-right max-w-[200px] truncate">{val}</span>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full rounded-xl" onClick={() => setSelectedClaim(null)}>Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Process Claim Dialog */}
      <Dialog open={!!processClaim} onOpenChange={() => setProcessClaim(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-blue-600" />
              Process Claim
            </DialogTitle>
          </DialogHeader>
          {processClaim && (
            <div className="space-y-5">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-sm text-blue-700">
                  <span className="font-semibold">{processClaim.patient_name}</span> — ₹{(processClaim.claim_amount || 0).toLocaleString()} from {processClaim.provider || 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Update Status</p>
                <div className="grid grid-cols-2 gap-2">
                  {['Approved', 'Under_Review', 'Rejected', 'Settled'].map(s => (
                    <button
                      key={s}
                      className={`p-3 rounded-xl border-2 text-xs font-medium transition-all ${processStatus === s
                        ? s === 'Approved' || s === 'Settled' ? 'bg-green-50 text-green-700 border-green-300' :
                          s === 'Rejected' ? 'bg-red-50 text-red-700 border-red-300' :
                            'bg-blue-50 text-blue-700 border-blue-300'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      onClick={() => setProcessStatus(s)}
                    >
                      {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {processStatus === 'Approved' && (
                <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                  <label className="text-xs font-semibold text-gray-700">Approved Amount (₹)</label>
                  <Input
                    type="number"
                    placeholder="Enter final approved amount"
                    className="rounded-lg border-gray-200"
                    value={approvedAmount}
                    onChange={(e) => setApprovedAmount(e.target.value)}
                  />
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setProcessClaim(null)}>Cancel</Button>
                <Button className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700" onClick={handleProcessClaim}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Request Dialog */}
      <Dialog open={newRequestOpen} onOpenChange={setNewRequestOpen}>
        <DialogContent className="max-w-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-600" />
              Send Insurance Request
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSendRequest} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-700">Patient ID *</label>
                <div className="flex gap-2">
                  <Input required placeholder="PT-..." className="rounded-lg border-gray-200"
                    value={newRequest.patient_id}
                    onChange={e => setNewRequest({ ...newRequest, patient_id: e.target.value })}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={handlePatientSearch} disabled={searchingPatient}>
                    {searchingPatient ? <Loader2 className="h-4 w-4 animate-spin text-purple-600" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-700">Claim Amount (₹) *</label>
                <Input required type="number" placeholder="0.00" className="rounded-lg border-gray-200"
                  value={newRequest.claim_amount}
                  onChange={e => setNewRequest({ ...newRequest, claim_amount: e.target.value })}
                />
              </div>

              {patientDetails && (
                <div className="col-span-2 p-3 bg-purple-50 rounded-xl border border-purple-100 text-sm text-gray-700 space-y-1 animate-in fade-in zoom-in slide-in-from-top-2">
                  <p><strong className="text-purple-900 font-semibold">Patient:</strong> {patientDetails.first_name} {patientDetails.last_name}</p>
                  <p><strong className="text-purple-900 font-semibold">Contact:</strong> {patientDetails.mobile_number} {patientDetails.email ? `• ${patientDetails.email}` : ''}</p>
                  <p><strong className="text-purple-900 font-semibold">Address:</strong> {[patientDetails.permanent_address_street, patientDetails.permanent_city, patientDetails.permanent_state].filter(Boolean).join(', ') || 'N/A'}</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-700">Insurance Provider *</label>
                <Input required placeholder="e.g. HealthCare Inc." className="rounded-lg border-gray-200"
                  value={newRequest.provider}
                  onChange={e => setNewRequest({ ...newRequest, provider: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-700">Provider Email *</label>
                <Input required type="email" placeholder="claims@provider.com" className="rounded-lg border-gray-200"
                  value={newRequest.provider_email}
                  onChange={e => setNewRequest({ ...newRequest, provider_email: e.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-xs font-semibold text-gray-700">Policy Number *</label>
                <Input required placeholder="Policy ID" className="rounded-lg border-gray-200"
                  value={newRequest.policy_number}
                  onChange={e => setNewRequest({ ...newRequest, policy_number: e.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-xs font-semibold text-gray-700">Additional Notes</label>
                <Input placeholder="Optional remarks..." className="rounded-lg border-gray-200"
                  value={newRequest.notes}
                  onChange={e => setNewRequest({ ...newRequest, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="pt-4 flex gap-3 border-t">
              <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setNewRequestOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={requestProcessing} className="flex-1 rounded-xl bg-purple-600 hover:bg-purple-700">
                {requestProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Request to Provider
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
