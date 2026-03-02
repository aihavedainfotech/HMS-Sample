import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    DollarSign, TrendingUp, Building2, Search, Loader2, IndianRupee, ArrowUpRight,
    ArrowDownRight, Clock, Users, Receipt, Pill, FlaskConical, UserSearch, X,
    Calendar, CreditCard, AlertCircle, CheckCircle2, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react';
import { io } from 'socket.io-client';

interface Overview {
    today_total: number;
    today_pharmacy: number;
    today_payments: number;
    today_admissions: number;
    month_total: number;
    pending_total: number;
    all_time_total: number;
}

interface DeptRevenue {
    department: string;
    admission: number;
    pharmacy: number;
    lab: number;
    total: number;
}

interface Transaction {
    id: string;
    patient: string;
    amount: number;
    type: string;
    method: string;
    date: string;
    status: string;
}

interface MonthlyRevenue {
    month: string;
    pharmacy: number;
    payments: number;
    admissions: number;
    total: number;
}

interface PatientResult {
    patient_id: string;
    first_name: string;
    last_name: string;
    email: string;
    mobile_number: string;
}

interface Payment {
    ref: string;
    amount: number;
    category: string;
    status: string;
    method: string;
    date: string;
    description: string;
}

interface CategorySummary {
    category: string;
    paid: number;
    pending: number;
    total: number;
}

interface PatientDetail {
    patient: PatientResult;
    payments: Payment[];
    total_paid: number;
    total_pending: number;
    total_billed: number;
    category_summary: CategorySummary[];
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';
const getToken = () => localStorage.getItem('hms_staff_token');
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' });

const formatCurrency = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const formatDate = (s: string) => {
    if (!s) return 'N/A';
    const d = new Date(s);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const formatTime = (s: string) => {
    if (!s) return '';
    const d = new Date(s);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};
const formatMonth = (s: string) => {
    if (!s) return '';
    const [y, m] = s.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(m) - 1]} ${y.slice(2)}`;
};

export default function FinancialDashboard() {
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState<Overview | null>(null);
    const [deptRevenue, setDeptRevenue] = useState<DeptRevenue[]>([]);
    const [recentTx, setRecentTx] = useState<Transaction[]>([]);
    const [monthlyRev, setMonthlyRev] = useState<MonthlyRevenue[]>([]);

    // Patient search
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<PatientResult[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<PatientDetail | null>(null);
    const [patientDialogOpen, setPatientDialogOpen] = useState(false);
    const [patientLoading, setPatientLoading] = useState(false);

    const [showAllDepts, setShowAllDepts] = useState(false);

    const fetchDashboard = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/admin/financials/dashboard`, { headers: authHeaders() });
            if (res.ok) {
                const data = await res.json();
                setOverview(data.overview);
                setDeptRevenue(data.dept_revenue || []);
                setRecentTx(data.recent_transactions || []);
                setMonthlyRev(data.monthly_revenue || []);
            }
        } catch (err) { console.error('Financial dashboard error:', err); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        fetchDashboard();
        const socketUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5002';
        const socket = io(socketUrl, { transports: ['websocket'], reconnection: true });
        socket.on('payment_updated', fetchDashboard);
        socket.on('admin_metrics_updated', fetchDashboard);
        const interval = setInterval(fetchDashboard, 60000); // Refresh every minute
        return () => { socket.disconnect(); clearInterval(interval); };
    }, [fetchDashboard]);

    // Patient search with debounce
    useEffect(() => {
        if (searchQuery.length < 2) { setSearchResults([]); return; }
        const timer = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const res = await fetch(`${API_URL}/admin/financials/patient-search?q=${encodeURIComponent(searchQuery)}`, { headers: authHeaders() });
                if (res.ok) { const data = await res.json(); setSearchResults(data.patients || []); }
            } catch (err) { console.error('Search error:', err); }
            finally { setSearchLoading(false); }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const loadPatientDetail = async (patientId: string) => {
        setPatientLoading(true);
        setPatientDialogOpen(true);
        try {
            const res = await fetch(`${API_URL}/admin/financials/patient/${patientId}`, { headers: authHeaders() });
            if (res.ok) { setSelectedPatient(await res.json()); }
        } catch (err) { console.error('Patient detail error:', err); }
        finally { setPatientLoading(false); }
    };

    const getStatusColor = (status: string) => {
        const s = status?.toLowerCase();
        if (s === 'completed' || s === 'paid' || s === 'collected') return 'bg-emerald-100 text-emerald-700';
        if (s === 'pending') return 'bg-amber-100 text-amber-700';
        return 'bg-gray-100 text-gray-600';
    };

    const getTypeIcon = (type: string) => {
        const t = type?.toLowerCase();
        if (t?.includes('pharmacy')) return <Pill className="h-4 w-4 text-pink-500" />;
        if (t?.includes('lab') || t?.includes('laboratory')) return <FlaskConical className="h-4 w-4 text-teal-500" />;
        if (t?.includes('admission')) return <Building2 className="h-4 w-4 text-blue-500" />;
        if (t?.includes('registration')) return <Users className="h-4 w-4 text-purple-500" />;
        if (t?.includes('appointment') || t?.includes('consultation')) return <Calendar className="h-4 w-4 text-indigo-500" />;
        return <Receipt className="h-4 w-4 text-gray-500" />;
    };

    const maxMonthlyTotal = Math.max(...monthlyRev.map(m => m.total), 1);

    const visibleDepts = showAllDepts ? deptRevenue : deptRevenue.slice(0, 6);

    if (loading) {
        return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Financial Dashboard</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Real-time revenue tracking, transactions & patient billing</p>
                </div>
                <Button variant="outline" onClick={() => { setLoading(true); fetchDashboard(); }} className="border-gray-200">
                    <RefreshCw className="h-4 w-4 mr-2" />Refresh
                </Button>
            </div>

            {/* KPI Cards */}
            {overview && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50 overflow-hidden relative">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Today's Revenue</span>
                                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                                    <IndianRupee className="h-5 w-5 text-emerald-600" />
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-gray-900">{formatCurrency(overview.today_total)}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                <span className="flex items-center gap-1"><Pill className="h-3 w-3 text-pink-400" />{formatCurrency(overview.today_pharmacy)}</span>
                                <span className="flex items-center gap-1"><Receipt className="h-3 w-3 text-blue-400" />{formatCurrency(overview.today_payments)}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 overflow-hidden">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">This Month</span>
                                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                    <TrendingUp className="h-5 w-5 text-blue-600" />
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-gray-900">{formatCurrency(overview.month_total)}</p>
                            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                                Accumulated this month
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Pending</span>
                                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                                    <Clock className="h-5 w-5 text-amber-600" />
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-gray-900">{formatCurrency(overview.pending_total)}</p>
                            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3 text-amber-500" />
                                Awaiting collection
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-gradient-to-br from-purple-50 to-violet-50 overflow-hidden">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">All-Time Revenue</span>
                                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                                    <DollarSign className="h-5 w-5 text-purple-600" />
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-gray-900">{formatCurrency(overview.all_time_total)}</p>
                            <p className="text-xs text-gray-500 mt-2">Lifetime earnings</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Patient Search */}
            <Card className="border-none shadow-sm">
                <CardHeader className="pb-3 border-b border-gray-50">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <UserSearch className="h-5 w-5 text-indigo-500" />
                        Patient Payment Lookup
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search by patient name, ID, or phone number..."
                            className="pl-10 pr-10 bg-gray-50 border-gray-200 rounded-xl text-sm"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded">
                                <X className="h-3.5 w-3.5 text-gray-400" />
                            </button>
                        )}
                    </div>

                    {searchLoading && <div className="flex items-center justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-indigo-500" /></div>}

                    {searchResults.length > 0 && (
                        <div className="mt-3 border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-64 overflow-y-auto">
                            {searchResults.map(p => (
                                <button
                                    key={p.patient_id}
                                    onClick={() => { loadPatientDetail(p.patient_id); setSearchQuery(''); setSearchResults([]); }}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-indigo-50 transition-colors text-left"
                                >
                                    <Avatar className="h-9 w-9 flex-shrink-0">
                                        <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-purple-500 text-white text-xs font-semibold">
                                            {p.first_name?.charAt(0)}{p.last_name?.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-gray-900 truncate">{p.first_name} {p.last_name}</p>
                                        <p className="text-xs text-gray-500">{p.patient_id} • {p.mobile_number || 'No phone'}</p>
                                    </div>
                                    <ArrowUpRight className="h-4 w-4 text-gray-400" />
                                </button>
                            ))}
                        </div>
                    )}

                    {searchQuery.length >= 2 && !searchLoading && searchResults.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-4">No patients found for "{searchQuery}"</p>
                    )}
                </CardContent>
            </Card>

            {/* Two-column layout: Department Revenue + Monthly Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Today's Revenue by Department */}
                <Card className="border-none shadow-sm">
                    <CardHeader className="pb-3 border-b border-gray-50">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-blue-500" />
                            Today's Revenue by Department
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        {deptRevenue.every(d => d.total === 0) ? (
                            <div className="text-center py-8">
                                <IndianRupee className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                                <p className="text-sm text-gray-400">No revenue recorded today yet</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {visibleDepts.filter(d => d.total > 0).map((dept, i) => {
                                    const maxDeptTotal = Math.max(...deptRevenue.map(d => d.total), 1);
                                    const pct = (dept.total / maxDeptTotal) * 100;
                                    return (
                                        <div key={dept.department} className="group">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-sm font-medium text-gray-700 truncate max-w-[60%]">{dept.department}</span>
                                                <span className="text-sm font-bold text-gray-900">{formatCurrency(dept.total)}</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                                <div className="h-3 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                                            </div>
                                            <div className="flex gap-3 mt-1 text-[10px] text-gray-400">
                                                {dept.admission > 0 && <span>Admission: {formatCurrency(dept.admission)}</span>}
                                                {dept.pharmacy > 0 && <span>Pharmacy: {formatCurrency(dept.pharmacy)}</span>}
                                                {dept.lab > 0 && <span>Lab: {formatCurrency(dept.lab)}</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                                {deptRevenue.filter(d => d.total > 0).length === 0 && (
                                    <p className="text-sm text-gray-400 text-center py-4">No department revenue today</p>
                                )}
                            </div>
                        )}
                        {deptRevenue.filter(d => d.total > 0).length > 6 && (
                            <Button variant="ghost" size="sm" onClick={() => setShowAllDepts(!showAllDepts)} className="w-full mt-3 text-xs text-indigo-600">
                                {showAllDepts ? <><ChevronUp className="h-3 w-3 mr-1" />Show Less</> : <><ChevronDown className="h-3 w-3 mr-1" />Show All ({deptRevenue.filter(d => d.total > 0).length})</>}
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* Monthly Revenue Trend */}
                <Card className="border-none shadow-sm">
                    <CardHeader className="pb-3 border-b border-gray-50">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-emerald-500" />
                            Monthly Revenue (Current → 6 Months Ago)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="space-y-4">
                            {[...monthlyRev].reverse().map((m, i) => (
                                <div key={m.month} className="group">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-sm font-semibold text-gray-600 w-14">{formatMonth(m.month)}</span>
                                        <span className="text-sm font-bold text-gray-900">{formatCurrency(m.total)}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                        <div className="h-3 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-700"
                                            style={{ width: `${(m.total / maxMonthlyTotal) * 100}%` }} />
                                    </div>
                                    <div className="flex gap-3 mt-1 text-[10px] text-gray-400">
                                        <span className="flex items-center gap-0.5"><Pill className="h-2.5 w-2.5 text-pink-400" />{formatCurrency(m.pharmacy)}</span>
                                        <span className="flex items-center gap-0.5"><Receipt className="h-2.5 w-2.5 text-blue-400" />{formatCurrency(m.payments)}</span>
                                        <span className="flex items-center gap-0.5"><Building2 className="h-2.5 w-2.5 text-indigo-400" />{formatCurrency(m.admissions)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Transactions */}
            <Card className="border-none shadow-sm">
                <CardHeader className="pb-3 border-b border-gray-50">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-amber-500" />
                        Recent Transactions
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-gray-50">
                        {recentTx.length === 0 ? (
                            <div className="text-center py-10">
                                <Receipt className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                                <p className="text-sm text-gray-400">No transactions yet</p>
                            </div>
                        ) : recentTx.map((tx, i) => (
                            <div key={`${tx.id}-${i}`} className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                                        {getTypeIcon(tx.type)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{tx.patient || 'Unknown'}</p>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span>{tx.type}</span>
                                            <span>•</span>
                                            <span>{formatDate(tx.date)}</span>
                                            <span className="hidden sm:inline">{formatTime(tx.date)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <Badge className={`${getStatusColor(tx.status)} border-none text-[10px] px-2`}>
                                        {tx.status}
                                    </Badge>
                                    <span className="text-sm font-bold text-gray-900 w-20 text-right">{formatCurrency(tx.amount)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Patient Detail Dialog */}
            <Dialog open={patientDialogOpen} onOpenChange={setPatientDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                                <IndianRupee className="h-4 w-4 text-indigo-600" />
                            </div>
                            Patient Financial Summary
                        </DialogTitle>
                    </DialogHeader>

                    {patientLoading ? (
                        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>
                    ) : selectedPatient ? (
                        <div className="space-y-5 pt-2">
                            {/* Patient Header */}
                            <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-gray-50 to-indigo-50/30 rounded-xl">
                                <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold text-sm">
                                        {selectedPatient.patient.first_name?.charAt(0)}{selectedPatient.patient.last_name?.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-bold text-gray-900">{selectedPatient.patient.first_name} {selectedPatient.patient.last_name}</p>
                                    <p className="text-xs text-gray-500">{selectedPatient.patient.patient_id} • {selectedPatient.patient.mobile_number || 'No phone'}</p>
                                </div>
                            </div>

                            {/* Financial Summary Cards */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-3 bg-emerald-50 rounded-xl text-center">
                                    <p className="text-xl font-bold text-emerald-700">{formatCurrency(selectedPatient.total_paid)}</p>
                                    <p className="text-[10px] uppercase font-semibold text-emerald-600 mt-1 tracking-wider">Paid</p>
                                </div>
                                <div className="p-3 bg-amber-50 rounded-xl text-center">
                                    <p className="text-xl font-bold text-amber-700">{formatCurrency(selectedPatient.total_pending)}</p>
                                    <p className="text-[10px] uppercase font-semibold text-amber-600 mt-1 tracking-wider">Pending</p>
                                </div>
                                <div className="p-3 bg-indigo-50 rounded-xl text-center">
                                    <p className="text-xl font-bold text-indigo-700">{formatCurrency(selectedPatient.total_billed)}</p>
                                    <p className="text-[10px] uppercase font-semibold text-indigo-600 mt-1 tracking-wider">Total Billed</p>
                                </div>
                            </div>

                            {/* Category Breakdown */}
                            {selectedPatient.category_summary.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Payment by Category</h4>
                                    <div className="space-y-2">
                                        {selectedPatient.category_summary.map(cs => (
                                            <div key={cs.category} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    {getTypeIcon(cs.category)}
                                                    <span className="text-sm font-medium text-gray-700">{cs.category}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs">
                                                    {cs.paid > 0 && <span className="text-emerald-600 font-medium">{formatCurrency(cs.paid)} paid</span>}
                                                    {cs.pending > 0 && <span className="text-amber-600 font-medium">{formatCurrency(cs.pending)} pending</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Payment History Table */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">Payment History ({selectedPatient.payments.length})</h4>
                                {selectedPatient.payments.length === 0 ? (
                                    <p className="text-sm text-gray-400 text-center py-6">No payment records found</p>
                                ) : (
                                    <div className="border border-gray-100 rounded-xl overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="bg-gray-50 text-left">
                                                        <th className="p-3 text-xs font-semibold text-gray-500">Date</th>
                                                        <th className="p-3 text-xs font-semibold text-gray-500">Category</th>
                                                        <th className="p-3 text-xs font-semibold text-gray-500">Description</th>
                                                        <th className="p-3 text-xs font-semibold text-gray-500 text-right">Amount</th>
                                                        <th className="p-3 text-xs font-semibold text-gray-500 text-center">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {selectedPatient.payments.map((p, i) => (
                                                        <tr key={`${p.ref}-${i}`} className="hover:bg-gray-50/50">
                                                            <td className="p-3 text-xs text-gray-600 whitespace-nowrap">{formatDate(p.date)}</td>
                                                            <td className="p-3">
                                                                <div className="flex items-center gap-1.5">
                                                                    {getTypeIcon(p.category)}
                                                                    <span className="text-xs font-medium text-gray-700">{p.category}</span>
                                                                </div>
                                                            </td>
                                                            <td className="p-3 text-xs text-gray-600 max-w-[200px] truncate">{p.description}</td>
                                                            <td className="p-3 text-sm font-bold text-gray-900 text-right">{formatCurrency(p.amount)}</td>
                                                            <td className="p-3 text-center">
                                                                <Badge className={`${getStatusColor(p.status)} border-none text-[10px] px-2`}>
                                                                    {p.status}
                                                                </Badge>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </div>
    );
}
