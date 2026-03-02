import { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
    DollarSign,
    AlertTriangle,
    Shield,
    Users,
    Loader2,
    Search,
    RefreshCw,
    Phone,
    ChevronDown,
    ChevronUp,
    TrendingDown,
    Wallet,
    CreditCard,
    Filter,
} from 'lucide-react';

const API_URL = 'http://localhost:5002/api';

interface FinancialPatient {
    admission_id: string;
    patient_id: string;
    patient_name: string;
    patient_phone?: string;
    doctor_name: string;
    admission_type: string;
    admission_date: string;
    advance_payment: number;
    payment_type: string;
    insurance_provider?: string;
    policy_number?: string;
    coverage_amount?: number;
    bed_type?: string;
    ward_name?: string;
    daily_charge?: number;
    days_admitted: number;
    estimated_bill: number;
    remaining_advance: number;
    advance_consumed_pct: number;
    is_low_advance: boolean;
    insurance_status: string;
}

export default function FinancialClearance() {
    const [loading, setLoading] = useState(true);
    const [patients, setPatients] = useState<FinancialPatient[]>([]);
    const [stats, setStats] = useState({ total_admitted: 0, total_advance_collected: 0, low_advance_count: 0, insurance_patients: 0, self_pay_patients: 0 });
    const [searchQuery, setSearchQuery] = useState('');
    const [showIssuesOnly, setShowIssuesOnly] = useState(false);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        try {
            const token = localStorage.getItem('hms_staff_token');
            const res = await fetch(`${API_URL}/admission/financial`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok) {
                setPatients(data.patients || []);
                setStats(data.stats || stats);
            }
        } catch (e) {
            console.error('Financial data error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();

        // Connect WebSocket for real-time updates
        const socketURL = 'http://localhost:5002';
        const socket = io(socketURL, {
            path: '/socket.io/',
            transports: ['websocket', 'polling']
        });

        socket.on('connect', () => console.log('FinancialClearance WebSocket connected'));

        const handleRemoteUpdate = (data: any) => {
            console.log('Real-time financial update received:', data);
            fetchData(true);
        };

        socket.on('admission_added', handleRemoteUpdate);
        socket.on('admission_status_updated', handleRemoteUpdate);
        socket.on('admission:discharged', handleRemoteUpdate);
        socket.on('payment_recorded', handleRemoteUpdate);

        return () => {
            socket.disconnect();
        };
    }, [fetchData]);

    const notifyFamily = (patient: FinancialPatient) => {
        toast.success(`Notification sent to ${patient.patient_name}'s family at ${patient.patient_phone || 'N/A'}`);
    };

    const getProgressColor = (pct: number) => {
        if (pct >= 80) return 'bg-gradient-to-r from-red-400 to-red-600';
        if (pct >= 50) return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
        return 'bg-gradient-to-r from-green-400 to-green-600';
    };

    const getProgressBg = (pct: number) => {
        if (pct >= 80) return 'bg-red-50';
        if (pct >= 50) return 'bg-yellow-50';
        return 'bg-green-50';
    };

    const filtered = patients.filter((p) => {
        const matchSearch = p.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.admission_id?.toLowerCase().includes(searchQuery.toLowerCase());
        if (showIssuesOnly) return matchSearch && p.is_low_advance;
        return matchSearch;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <p className="text-sm text-gray-500">Loading financial data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent">
                        💰 Financial Clearance
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Advance payments, insurance & billing status</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant={showIssuesOnly ? 'default' : 'outline'} size="sm"
                        onClick={() => setShowIssuesOnly(!showIssuesOnly)}
                        className="gap-1.5"
                    >
                        <Filter className="h-4 w-4" />
                        {showIssuesOnly ? 'Showing Issues Only' : 'Show Payment Issues'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={refreshing}>
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200/60">
                    <CardContent className="p-4 text-center">
                        <Users className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                        <p className="text-xs text-blue-600 font-medium">Total Admitted</p>
                        <p className="text-2xl font-bold text-blue-900">{stats.total_admitted}</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200/60">
                    <CardContent className="p-4 text-center">
                        <Wallet className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
                        <p className="text-xs text-emerald-600 font-medium">Advance Collected</p>
                        <p className="text-2xl font-bold text-emerald-900">₹{(stats.total_advance_collected / 1000).toFixed(1)}K</p>
                    </CardContent>
                </Card>
                <Card className={`bg-gradient-to-br ${stats.low_advance_count > 0 ? 'from-red-50 to-red-100/50 border-red-200/60' : 'from-gray-50 to-gray-100/50 border-gray-200/60'}`}>
                    <CardContent className="p-4 text-center">
                        <AlertTriangle className={`h-5 w-5 mx-auto mb-1 ${stats.low_advance_count > 0 ? 'text-red-600' : 'text-gray-400'}`} />
                        <p className={`text-xs font-medium ${stats.low_advance_count > 0 ? 'text-red-600' : 'text-gray-500'}`}>Low Advance</p>
                        <p className={`text-2xl font-bold ${stats.low_advance_count > 0 ? 'text-red-900' : 'text-gray-400'}`}>{stats.low_advance_count}</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200/60">
                    <CardContent className="p-4 text-center">
                        <Shield className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                        <p className="text-xs text-purple-600 font-medium">Insurance</p>
                        <p className="text-2xl font-bold text-purple-900">{stats.insurance_patients}</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200/60">
                    <CardContent className="p-4 text-center">
                        <CreditCard className="h-5 w-5 text-orange-600 mx-auto mb-1" />
                        <p className="text-xs text-orange-600 font-medium">Self-Pay</p>
                        <p className="text-2xl font-bold text-orange-900">{stats.self_pay_patients}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                    placeholder="Search patients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                />
            </div>

            {/* Patient Financial Cards */}
            <div className="space-y-3">
                {filtered.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <DollarSign className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                            <p className="text-gray-500 font-medium">No patients found</p>
                        </CardContent>
                    </Card>
                ) : (
                    filtered.map((pt) => (
                        <Card key={pt.admission_id} className={`transition-all hover:shadow-md ${pt.is_low_advance ? 'border-red-200 bg-red-50/20' : ''}`}>
                            <CardContent className="p-4">
                                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                                    {/* Patient Info */}
                                    <div className="flex items-center gap-3 lg:w-1/4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0 ${pt.is_low_advance ? 'bg-gradient-to-br from-red-500 to-red-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                                            }`}>
                                            {pt.patient_name?.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-gray-900 truncate">{pt.patient_name}</p>
                                            <p className="text-xs text-gray-400">{pt.admission_id} • {pt.days_admitted}d</p>
                                        </div>
                                        {pt.is_low_advance && (
                                            <Badge variant="destructive" className="shrink-0 text-xs">
                                                <AlertTriangle className="h-3 w-3 mr-1" />
                                                Low
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Financial Progress */}
                                    <div className="flex-1 lg:w-1/3">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-xs text-gray-500">Advance: ₹{pt.advance_payment?.toLocaleString()}</span>
                                            <span className="text-xs font-medium text-gray-700">{pt.advance_consumed_pct}% used</span>
                                        </div>
                                        <div className={`h-3 rounded-full overflow-hidden ${getProgressBg(pt.advance_consumed_pct)}`}>
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ${getProgressColor(pt.advance_consumed_pct)}`}
                                                style={{ width: `${Math.min(100, pt.advance_consumed_pct)}%` }}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between mt-1">
                                            <span className="text-xs text-gray-400">Bill: ₹{pt.estimated_bill?.toLocaleString()}</span>
                                            <span className={`text-xs font-semibold ${pt.remaining_advance <= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                Balance: ₹{pt.remaining_advance?.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Insurance & Payment Type */}
                                    <div className="lg:w-1/6 text-center">
                                        <Badge variant={pt.payment_type === 'Insurance' ? 'default' : 'secondary'} className="mb-1">
                                            {pt.payment_type}
                                        </Badge>
                                        {pt.insurance_provider && (
                                            <p className="text-xs text-gray-500">{pt.insurance_provider}</p>
                                        )}
                                        <Badge variant="outline" className={`text-xs mt-1 ${pt.insurance_status === 'Active' ? 'text-green-600 border-green-300' : 'text-gray-500'
                                            }`}>
                                            {pt.insurance_status}
                                        </Badge>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 lg:w-1/6 justify-end">
                                        {pt.is_low_advance && (
                                            <Button size="sm" variant="outline" className="gap-1 text-xs border-red-200 text-red-600 hover:bg-red-50" onClick={() => notifyFamily(pt)}>
                                                <Phone className="h-3 w-3" />
                                                Notify Family
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost" size="sm"
                                            onClick={() => setExpandedRow(expandedRow === pt.admission_id ? null : pt.admission_id)}
                                            className="h-8 w-8 p-0"
                                        >
                                            {expandedRow === pt.admission_id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>

                                {/* Expanded Payment Details */}
                                {expandedRow === pt.admission_id && (
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div>
                                                <p className="text-xs text-gray-500">Bed Type</p>
                                                <p className="font-medium">{pt.bed_type?.replace('_', ' ') || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Ward</p>
                                                <p className="font-medium">{pt.ward_name || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Daily Charge</p>
                                                <p className="font-medium">₹{pt.daily_charge?.toLocaleString() || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Doctor</p>
                                                <p className="font-medium">{pt.doctor_name}</p>
                                            </div>
                                            {pt.insurance_provider && (
                                                <>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Policy Number</p>
                                                        <p className="font-medium">{pt.policy_number || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Coverage Amount</p>
                                                        <p className="font-medium">₹{pt.coverage_amount?.toLocaleString() || 'N/A'}</p>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <div className="mt-3 p-3 rounded-lg bg-gray-50">
                                            <p className="text-xs font-medium text-gray-600 mb-2">Payment Timeline</p>
                                            <div className="flex items-center gap-3 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                                                    Advance: ₹{pt.advance_payment?.toLocaleString()} on admission
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <TrendingDown className="h-3 w-3 text-red-500" />
                                                    Consumed: ₹{pt.estimated_bill?.toLocaleString()} over {pt.days_admitted} days
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
