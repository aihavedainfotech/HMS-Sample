import { useState, useEffect } from 'react';
import {
    CreditCard,
    Search,
    Plus,
    History,
    TrendingUp,
    AlertCircle,
    Filter,
    Download,
    Loader2,
    Calendar,
    User,
    Wallet,
    ArrowRight,
    ChevronRight,
    ShieldCheck,
    Activity,
    Zap,
    QrCode,
    Building
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useAuth } from '@/contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';

const diagnosisPricing: Record<string, number> = {
    'Cancer': 50000,
    'Cardiac': 30000,
    'Emergency': 15000,
    'General': 10000,
    'Fracture': 12000,
    'Infection': 8000,
    'Other': 5000,
};

interface Stats {
    today_total: number;
    month_total: number;
    total_patients: number;
    active_balances_total: number;
}

interface ActivePatient {
    admission_id: string;
    patient_id: string;
    patient_name: string;
    balance: number;
    provisional_diagnosis: string;
    admission_date: string;
    admission_type: string;
}

interface PaymentRecord {
    payment_id: string;
    amount: number;
    payment_method: string;
    transaction_date: string;
    type: string;
    category: string;
    notes: string;
}

export default function AdvancePaymentDashboard() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<Stats | null>(null);
    const [activePatients, setActivePatients] = useState<ActivePatient[]>([]);
    const [searchId, setSearchId] = useState('');
    const [searchResult, setSearchResult] = useState<{ history: PaymentRecord[], current_balance: number } | null>(null);
    const [searching, setSearching] = useState(false);

    // Create Modal State
    const [createOpen, setCreateOpen] = useState(false);
    const [newPayment, setNewPayment] = useState({
        patient_id: '',
        diagnosis: '',
        amount: '',
        payment_method: 'Cash',
        notes: '',
    });
    const [paymentDetails, setPaymentDetails] = useState({
        cardNumber: '',
        cardName: '',
        expiry: '',
        cvv: '',
        upiId: '',
        bankName: '',
        referenceNumber: ''
    });
    const [submitting, setSubmitting] = useState(false);

    const fetchStats = async () => {
        try {
            const response = await fetch(`${API_URL}/billing/advance-payments/stats`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('hms_staff_token')}` }
            });
            const data = await response.json();
            setStats(data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchActivePatients = async () => {
        try {
            const response = await fetch(`${API_URL}/billing/advance-payments/active`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('hms_staff_token')}` }
            });
            const data = await response.json();
            setActivePatients(data);
        } catch (error) {
            console.error('Error fetching active patients:', error);
        }
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await Promise.all([fetchStats(), fetchActivePatients()]);
            setLoading(false);
        };
        init();

        // Auto refresh every 30 seconds
        const interval = setInterval(() => {
            fetchStats();
            fetchActivePatients();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const handleSearch = async () => {
        if (!searchId.trim()) return;
        setSearching(true);
        setSearchResult(null); // Clear previous results immediately
        try {
            const response = await fetch(`${API_URL}/billing/advance-payments/search/${searchId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('hms_staff_token')}` }
            });
            const data = await response.json();
            if (response.ok) {
                setSearchResult(data);
            } else {
                toast.error(data.error || 'Search failed');
            }
        } catch (error) {
            toast.error('Network error during search');
        } finally {
            setSearching(false);
        }
    };

    const handleDiagnosisChange = (value: string) => {
        setNewPayment(prev => ({
            ...prev,
            diagnosis: value,
            amount: diagnosisPricing[value]?.toString() || prev.amount
        }));
    };

    const handleSubmitPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPayment.patient_id || !newPayment.amount) {
            toast.error('Please fill in all required fields');
            return;
        }

        let finalNotes = newPayment.notes;

        if (newPayment.payment_method === 'Card') {
            if (!paymentDetails.cardNumber || !paymentDetails.cardName) {
                toast.error('Please enter Card details');
                return;
            }
            finalNotes = `Card ****${paymentDetails.cardNumber.slice(-4)}, Holder: ${paymentDetails.cardName}${finalNotes ? ' | ' + finalNotes : ''}`;
        } else if (newPayment.payment_method === 'UPI') {
            if (!paymentDetails.upiId) {
                toast.error('Please enter UPI Transaction ID');
                return;
            }
            finalNotes = `UPI Ref: ${paymentDetails.upiId}${finalNotes ? ' | ' + finalNotes : ''}`;
        } else if (newPayment.payment_method === 'Bank Transfer' || newPayment.payment_method === 'Cheque') {
            if (!paymentDetails.bankName || !paymentDetails.referenceNumber) {
                toast.error('Please enter Bank and Reference details');
                return;
            }
            finalNotes = `${newPayment.payment_method} - Bank: ${paymentDetails.bankName}, Ref: ${paymentDetails.referenceNumber}${finalNotes ? ' | ' + finalNotes : ''}`;
        }

        setSubmitting(true);
        try {
            const response = await fetch(`${API_URL}/billing/advance-payments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('hms_staff_token')}`
                },
                body: JSON.stringify({
                    ...newPayment,
                    amount: parseFloat(newPayment.amount),
                    notes: finalNotes // Use the combined finalnotes
                })
            });

            const data = await response.json();
            if (response.ok) {
                toast.success(data.message);
                setCreateOpen(false);
                setNewPayment({
                    patient_id: '',
                    diagnosis: '',
                    amount: '',
                    payment_method: 'Cash',
                    notes: '',
                });
                setPaymentDetails({
                    cardNumber: '',
                    cardName: '',
                    expiry: '',
                    cvv: '',
                    upiId: '',
                    bankName: '',
                    referenceNumber: ''
                });
                fetchStats();
                fetchActivePatients();
            } else {
                toast.error(data.error || 'Failed to record payment');
            }
        } catch (error) {
            toast.error('Network error while recording payment');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Advance Payments</h1>
                    <p className="text-gray-500 mt-1">Manage intake deposits and emergency admissions</p>
                </div>

                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 gap-2 px-6 h-12 rounded-xl transition-all hover:scale-105 active:scale-95">
                            <Plus className="h-5 w-5" />
                            Collect Advance
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[450px] rounded-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold">New Advance Collection</DialogTitle>
                            <DialogDescription>
                                Record an advance payment before or during admission.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmitPayment} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Patient ID</label>
                                <Input
                                    placeholder="e.g. P0001"
                                    className="rounded-xl border-gray-200 focus:ring-blue-500"
                                    value={newPayment.patient_id}
                                    onChange={(e) => setNewPayment(prev => ({ ...prev, patient_id: e.target.value.toUpperCase() }))}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Diagnosis Type</label>
                                <Select onValueChange={handleDiagnosisChange}>
                                    <SelectTrigger className="rounded-xl border-gray-200">
                                        <SelectValue placeholder="Select diagnosis" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {Object.keys(diagnosisPricing).map(d => (
                                            <SelectItem key={d} value={d}>{d}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {newPayment.diagnosis && (
                                    <p className="text-[10px] text-blue-600 font-medium ml-1">Suggested advance for {newPayment.diagnosis} is ₹{diagnosisPricing[newPayment.diagnosis].toLocaleString()}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Amount (₹)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        className="pl-7 rounded-xl border-gray-200 focus:ring-blue-500 font-semibold"
                                        value={newPayment.amount}
                                        onChange={(e) => setNewPayment(prev => ({ ...prev, amount: e.target.value }))}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Method</label>
                                    <Select
                                        defaultValue="Cash"
                                        onValueChange={(val) => setNewPayment(prev => ({ ...prev, payment_method: val }))}
                                    >
                                        <SelectTrigger className="rounded-xl border-gray-200">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="Cash">Cash</SelectItem>
                                            <SelectItem value="Card">Card</SelectItem>
                                            <SelectItem value="UPI">UPI</SelectItem>
                                            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                            <SelectItem value="Cheque">Cheque</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Conditional fields based on Method */}
                                {newPayment.payment_method === 'Card' && (
                                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 border border-gray-100 rounded-xl animate-in fade-in zoom-in-95 duration-200">
                                        <div className="col-span-2 space-y-2">
                                            <label className="text-xs font-semibold text-gray-700">Card Number</label>
                                            <div className="relative">
                                                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <Input
                                                    placeholder="0000 0000 0000 0000"
                                                    className="pl-9 rounded-lg border-gray-200"
                                                    value={paymentDetails.cardNumber}
                                                    onChange={(e) => setPaymentDetails(prev => ({ ...prev, cardNumber: e.target.value }))}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-span-2 space-y-2">
                                            <label className="text-xs font-semibold text-gray-700">Cardholder Name</label>
                                            <Input
                                                placeholder="Name on card"
                                                className="rounded-lg border-gray-200"
                                                value={paymentDetails.cardName}
                                                onChange={(e) => setPaymentDetails(prev => ({ ...prev, cardName: e.target.value }))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-gray-700">Expiry (MM/YY)</label>
                                            <Input
                                                placeholder="MM/YY"
                                                className="rounded-lg border-gray-200"
                                                value={paymentDetails.expiry}
                                                onChange={(e) => setPaymentDetails(prev => ({ ...prev, expiry: e.target.value }))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-gray-700">CVV</label>
                                            <Input
                                                type="password"
                                                placeholder="123"
                                                maxLength={4}
                                                className="rounded-lg border-gray-200"
                                                value={paymentDetails.cvv}
                                                onChange={(e) => setPaymentDetails(prev => ({ ...prev, cvv: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                )}

                                {newPayment.payment_method === 'UPI' && (
                                    <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl flex flex-col items-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100 relative group cursor-pointer hover:border-blue-300 transition-colors">
                                            <QrCode className="h-24 w-24 text-gray-800" strokeWidth={1.5} />
                                            <div className="absolute inset-0 bg-blue-50/80 items-center justify-center rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex">
                                                <span className="text-[10px] font-bold text-blue-700">Click to Enlarge</span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500 font-medium">Scan to Pay via UPI apps</p>
                                        <div className="w-full space-y-2">
                                            <label className="text-xs font-semibold text-gray-700">UPI Transaction ID / VPA</label>
                                            <Input
                                                placeholder="e.g. 1234567890@upi or TXN-1234..."
                                                className="rounded-lg border-gray-200"
                                                value={paymentDetails.upiId}
                                                onChange={(e) => setPaymentDetails(prev => ({ ...prev, upiId: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                )}

                                {(newPayment.payment_method === 'Bank Transfer' || newPayment.payment_method === 'Cheque') && (
                                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 border border-gray-100 rounded-xl animate-in fade-in zoom-in-95 duration-200">
                                        <div className="col-span-2 space-y-2">
                                            <label className="text-xs font-semibold text-gray-700">Bank Name</label>
                                            <div className="relative">
                                                <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <Input
                                                    placeholder="e.g. HDFC Bank"
                                                    className="pl-9 rounded-lg border-gray-200"
                                                    value={paymentDetails.bankName}
                                                    onChange={(e) => setPaymentDetails(prev => ({ ...prev, bankName: e.target.value }))}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-span-2 space-y-2">
                                            <label className="text-xs font-semibold text-gray-700">Ref / Cheque Number</label>
                                            <Input
                                                placeholder="Transaction or Cheque No."
                                                className="rounded-lg border-gray-200"
                                                value={paymentDetails.referenceNumber}
                                                onChange={(e) => setPaymentDetails(prev => ({ ...prev, referenceNumber: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Additional Notes</label>
                                    <Input
                                        placeholder="Optional"
                                        className="rounded-xl border-gray-200"
                                        value={newPayment.notes}
                                        onChange={(e) => setNewPayment(prev => ({ ...prev, notes: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <DialogFooter className="pt-4">
                                <Button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11"
                                >
                                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wallet className="h-4 w-4 mr-2" />}
                                    Confirm Payment
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    {
                        label: "Today's Collection",
                        value: `₹${stats?.today_total.toLocaleString()}`,
                        icon: Zap,
                        color: "blue",
                        sub: "Real-time updates"
                    },
                    {
                        label: "Month's Total",
                        value: `₹${stats?.month_total.toLocaleString()}`,
                        icon: TrendingUp,
                        color: "indigo",
                        sub: "Feb 2026 progress"
                    },
                    {
                        label: "Active Balances",
                        value: `₹${stats?.active_balances_total.toLocaleString()}`,
                        icon: Wallet,
                        color: "emerald",
                        sub: "Available for billing"
                    },
                    {
                        label: "Active Patients",
                        value: stats?.total_patients,
                        icon: User,
                        color: "amber",
                        sub: "Currently Admitted"
                    }
                ].map((s, i) => (
                    <Card key={i} className="border-0 shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div className={`p-2.5 bg-${s.color}-50 rounded-xl group-hover:scale-110 transition-transform`}>
                                    <s.icon className={`h-5 w-5 text-${s.color}-600`} />
                                </div>
                                <Badge variant="secondary" className="bg-gray-100 text-gray-500 font-medium text-[10px] uppercase">{s.sub}</Badge>
                            </div>
                            <div className="mt-4">
                                <p className="text-2xl font-bold text-gray-900 leading-none">{s.value}</p>
                                <p className="text-xs font-semibold text-gray-400 mt-2 uppercase tracking-wider">{s.label}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Active patients list */}
                <Card className="lg:col-span-2 border-0 shadow-sm rounded-2xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <div>
                            <CardTitle className="text-xl font-bold">Active Advance Balances</CardTitle>
                            <CardDescription>Patients currently admitted with available funds</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" className="rounded-xl border-gray-200 hover:bg-gray-50 h-9">
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                                        <th className="pb-3 pl-2">Patient</th>
                                        <th className="pb-3 text-center">Type</th>
                                        <th className="pb-3">Diagnosis</th>
                                        <th className="pb-3 text-right pr-2">Balance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {activePatients.length > 0 ? activePatients.map((p) => (
                                        <tr key={p.admission_id} className="group hover:bg-gray-50/80 transition-colors">
                                            <td className="py-4 pl-2">
                                                <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{p.patient_name}</p>
                                                <p className="text-xs text-gray-400">{p.patient_id}</p>
                                            </td>
                                            <td className="py-4 text-center">
                                                <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${p.admission_type === 'Emergency' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                                                    }`}>
                                                    {p.admission_type}
                                                </Badge>
                                            </td>
                                            <td className="py-4 text-sm text-gray-600 max-w-[150px] truncate">
                                                {p.provisional_diagnosis || 'Emergency Admit'}
                                            </td>
                                            <td className="py-4 text-right pr-2">
                                                <p className="font-bold text-gray-900">₹{p.balance.toLocaleString()}</p>
                                                <p className="text-[10px] text-gray-400">Available</p>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={4} className="py-12 text-center">
                                                <p className="text-gray-400 font-medium">No active advance balances found</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* History Search */}
                <div className="space-y-6">
                    <Card className="border-0 shadow-lg shadow-blue-50 ring-1 ring-blue-100 rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Search className="h-5 w-5 text-blue-600" />
                            Patient History
                        </h3>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Enter Patient ID"
                                className="rounded-xl border-gray-200"
                                value={searchId}
                                onChange={(e) => setSearchId(e.target.value.toUpperCase())}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            />
                            <Button
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl aspect-square p-0 w-11 h-11"
                                onClick={handleSearch}
                                disabled={searching}
                            >
                                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                            </Button>
                        </div>

                        {searchResult && (
                            <div className="mt-8 space-y-6 animate-in slide-in-from-top-4 duration-300">
                                <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl text-white shadow-xl shadow-blue-200">
                                    <div className="flex items-center justify-between mb-4">
                                        <Badge className="bg-white/20 hover:bg-white/30 text-white border-0">Live Balance</Badge>
                                        <Wallet className="h-5 w-5 opacity-80" />
                                    </div>
                                    <p className="text-3xl font-bold leading-none">₹{searchResult.current_balance.toLocaleString()}</p>
                                    <p className="text-xs text-blue-100 mt-2 font-medium opacity-80 uppercase tracking-wider">Remaining for Patient {searchId}</p>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <History className="h-3.5 w-3.5" />
                                        Transaction Logs
                                    </h4>
                                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                        {searchResult.history.length > 0 ? searchResult.history.map((h) => (
                                            <div key={h.payment_id} className="p-3 bg-white border border-gray-100 rounded-xl hover:border-blue-200 transition-colors shadow-sm">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900">₹{h.amount.toLocaleString()}</p>
                                                        <p className="text-[10px] text-gray-400">
                                                            {h.payment_method} • {new Date(h.transaction_date).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <Badge variant="outline" className="text-[9px] font-bold px-1.5 h-4 border-gray-100">
                                                        {h.category}
                                                    </Badge>
                                                </div>
                                                {h.notes && <p className="text-[9px] text-gray-400 mt-1 italic border-t border-gray-50 pt-1 line-clamp-1">{h.notes}</p>}
                                            </div>
                                        )) : (
                                            <div className="text-center py-6">
                                                <p className="text-xs text-gray-400 italic">No previous records found</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {!searchResult && !searching && (
                            <div className="mt-12 text-center py-12 px-6">
                                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100">
                                    <Activity className="h-8 w-8 text-blue-200" />
                                </div>
                                <p className="text-sm text-gray-400 font-medium italic">Search to view detailed payment history and active balance</p>
                            </div>
                        )}
                    </Card>

                    <Card className="border-0 shadow-sm bg-amber-50 rounded-2xl p-6 border-l-4 border-amber-400">
                        <div className="flex gap-3">
                            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                            <div>
                                <h4 className="text-sm font-bold text-amber-900">Critical Note</h4>
                                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                                    Advances are automatically adjusted during prescription fulfillment and final bill settlement. Always verify the remaining balance before discharging.
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
