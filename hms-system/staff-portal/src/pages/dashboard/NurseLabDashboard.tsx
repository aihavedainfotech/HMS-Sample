import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
    FlaskConical, Search, Loader2, Clock, CheckCircle2, AlertCircle,
    Beaker, TestTube, ArrowRight, User, Plus, Eye, Download, Printer, X, Activity
} from 'lucide-react';
import { toast } from 'sonner';
import socket from '@/lib/socket';

const API = import.meta.env.VITE_API_URL || '/api';

const AVAILABLE_TESTS = [
    'Complete Blood Count (CBC)', 'Renal Function Test (RFT)', 'Liver Function Test (LFT)',
    'Lipid Profile', 'Thyroid Profile', 'Blood Glucose', 'Urinalysis', 'HBA1C',
    'Vitamin D', 'Vitamin B12', 'MRI Scan', 'X-Ray', 'CT Scan', 'Ultrasound'
];

export default function NurseLabDashboard() {
    const [loading, setLoading] = useState(true);
    const [labOrders, setLabOrders] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'all' | 'Pending' | 'Completed'>('all');

    // Create Lab Order State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [orderLoading, setOrderLoading] = useState(false);
    const [targetPid, setTargetPid] = useState('');
    const [targetPatientName, setTargetPatientName] = useState('');
    const [selectedTests, setSelectedTests] = useState<string[]>([]);
    const [orderPriority, setOrderPriority] = useState('Routine');
    const [orderInstructions, setOrderInstructions] = useState('');

    // View Results State
    const [isResultOpen, setIsResultOpen] = useState(false);
    const [selectedResults, setSelectedResults] = useState<any>(null);
    const [resultsLoading, setResultsLoading] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const token = localStorage.getItem('hms_staff_token');
            const res = await fetch(`${API}/nurse/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            setLabOrders(data.lab_orders || []);
        } catch { toast.error('Failed to load lab data'); } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Real-time: refresh on lab/admission changes
    useEffect(() => {
        const onUpdate = () => fetchData();
        socket.on('new_lab_order', onUpdate);
        socket.on('lab_order_updated', onUpdate);
        socket.on('lab:status_updated', onUpdate);
        socket.on('admission_status_updated', onUpdate);
        socket.on('admission:discharged', onUpdate);
        return () => {
            socket.off('new_lab_order', onUpdate);
            socket.off('lab_order_updated', onUpdate);
            socket.off('lab:status_updated', onUpdate);
            socket.off('admission_status_updated', onUpdate);
            socket.off('admission:discharged', onUpdate);
        };
    }, [fetchData]);

    const lookupPatient = async (pid: string) => {
        if (pid.length < 3) return;
        try {
            const token = localStorage.getItem('hms_staff_token');
            const res = await fetch(`${API}/patients/search?q=${pid}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            const patient = data.find((p: any) => p.patient_id === pid.toUpperCase());
            if (patient) setTargetPatientName(`${patient.first_name} ${patient.last_name}`);
            else setTargetPatientName('Patient not found');
        } catch { setTargetPatientName('Error searching patient'); }
    };

    const handleCreateOrder = async () => {
        if (!targetPid || selectedTests.length === 0) {
            toast.error('Patient ID and tests are required');
            return;
        }
        setOrderLoading(true);
        try {
            const token = localStorage.getItem('hms_staff_token');
            const res = await fetch(`${API}/lab/orders`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patient_id: targetPid.toUpperCase(),
                    tests: selectedTests,
                    priority: orderPriority,
                    special_instructions: orderInstructions
                })
            });
            if (res.ok) {
                toast.success('Lab order created!');
                setIsCreateOpen(false);
                resetCreateForm();
                fetchData();
            } else {
                const err = await res.json();
                toast.error(err.error || 'Failed to create order');
            }
        } catch { toast.error('Error creating lab order'); }
        finally { setOrderLoading(false); }
    };

    const resetCreateForm = () => {
        setTargetPid('');
        setTargetPatientName('');
        setSelectedTests([]);
        setOrderPriority('Routine');
        setOrderInstructions('');
    };

    const viewResults = async (order: any) => {
        setIsResultOpen(true);
        setResultsLoading(true);
        try {
            const token = localStorage.getItem('hms_staff_token');
            const res = await fetch(`${API}/lab/analysis-reports/patient/${order.patient_id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const reports = await res.json();
            if (Array.isArray(reports)) {
                const report = reports.find((r: any) => r.report_id === `RPT-${order.lab_order_id}`);
                if (report) setSelectedResults(report);
                else setSelectedResults(null);
            } else {
                setSelectedResults(null);
            }
        } catch {
            toast.error('Failed to load results');
            setSelectedResults(null);
        } finally {
            setResultsLoading(false);
        }
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'Pending': return { color: 'bg-amber-100 text-amber-800', icon: <Clock className="h-3.5 w-3.5" />, border: 'border-l-amber-400' };
            case 'In_Progress': return { color: 'bg-purple-100 text-purple-800', icon: <Beaker className="h-3.5 w-3.5" />, border: 'border-l-purple-400' };
            case 'Completed':
            case 'Delivered':
            case 'Verified':
            case 'Results_Entered':
                return { color: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="h-3.5 w-3.5" />, border: 'border-l-green-400' };
            default: return { color: 'bg-gray-100 text-gray-700', icon: <AlertCircle className="h-3.5 w-3.5" />, border: 'border-l-gray-300' };
        }
    };

    const isCompleted = (status: string) => ['Completed', 'Delivered', 'Verified', 'Results_Entered'].includes(status);

    const latestByPatientMap = labOrders.reduce((acc: Record<string, any>, order) => {
        const pid = order.patient_id;
        if (!acc[pid] || new Date(order.order_date) > new Date(acc[pid].order_date)) {
            acc[pid] = order;
        }
        return acc;
    }, {});

    const latestOrders = Object.values(latestByPatientMap);
    const pendingCount = latestOrders.filter((l: any) => l.status === 'Pending').length;
    const completedCount = latestOrders.filter((l: any) => isCompleted(l.status)).length;

    const filtered = (() => {
        // 1. Basic search and status filter
        const basicFiltered = labOrders.filter(lo => {
            const matchSearch = lo.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                lo.test_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                lo.patient_id?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchFilter = filter === 'all' ||
                (filter === 'Completed' ? isCompleted(lo.status) : lo.status === filter);
            return matchSearch && matchFilter;
        });

        // 2. Determine if we should group by patient (only the latest)
        // We show all history only if the search term strictly matches a patient ID
        const isPidSearch = searchTerm.length >= 4 && /P\d{4}/i.test(searchTerm);

        if (isPidSearch) return basicFiltered.sort((a, b) =>
            new Date(b.order_date).getTime() - new Date(a.order_date).getTime()
        );

        // 3. Group by patient and pick latest
        const currentLatest: Record<string, any> = {};
        basicFiltered.forEach(order => {
            const pid = order.patient_id;
            if (!currentLatest[pid] || new Date(order.order_date) > new Date(currentLatest[pid].order_date)) {
                currentLatest[pid] = order;
            }
        });

        return Object.values(currentLatest).sort((a: any, b: any) =>
            new Date(b.order_date).getTime() - new Date(a.order_date).getTime()
        );
    })();

    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-amber-600" /></div>;

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto p-2 md:p-0">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2"><FlaskConical className="h-7 w-7 text-amber-600" /> Lab & Investigations</h1>
                    <p className="text-gray-500 text-sm">Monitor patient investigation records and results</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input placeholder="Search by patient or test..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 h-11" />
                    </div>
                    <Button className="h-11 shadow-md bg-amber-600 hover:bg-amber-700 w-full sm:w-auto" onClick={() => setIsCreateOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" /> Order Lab
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: 'Total Patients', value: latestOrders.length, color: 'from-gray-700 to-gray-800', icon: <User className="h-5 w-5" /> },
                    { label: 'Pending Collection', value: pendingCount, color: 'from-amber-600 to-amber-700', icon: <Clock className="h-5 w-5" /> },
                    { label: 'Completed Results', value: completedCount, color: 'from-green-600 to-green-700', icon: <CheckCircle2 className="h-5 w-5" /> },
                ].map((s, i) => (
                    <Card key={i} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-0">
                            <div className={`bg-gradient-to-br ${s.color} p-5 flex items-center gap-4`}>
                                <div className="p-3 bg-white/10 rounded-xl text-white backdrop-blur-sm">{s.icon}</div>
                                <div>
                                    <p className="text-3xl font-bold text-white tracking-tight">{s.value}</p>
                                    <p className="text-sm font-medium text-white/70">{s.label}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
                {(['all', 'Pending', 'Completed'] as const).map(f => (
                    <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)}>
                        {f === 'all' ? 'All' : f.replace(/_/g, ' ')}
                    </Button>
                ))}
            </div>

            {/* Lab Order Cards */}
            <div className="space-y-3">
                {filtered.length === 0 ? (
                    <Card><CardContent className="py-10 text-center"><FlaskConical className="mx-auto h-12 w-12 text-gray-300 mb-3" /><p className="text-gray-500">No lab orders found</p></CardContent></Card>
                ) : filtered.map(lo => {
                    const sc = getStatusConfig(lo.status);
                    return (
                        <Card key={lo.lab_order_id} className={`overflow-hidden border-l-4 ${sc.border} hover:shadow-md transition-all`}>
                            <CardContent className="p-4">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                                            <User className="h-5 w-5 text-amber-600" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold">{lo.test_name}</span>
                                                <Badge className={`text-xs ${sc.color}`}>{sc.icon} <span className="ml-1">{lo.status.replace(/_/g, ' ')}</span></Badge>
                                                {lo.priority === 'STAT' && <Badge className="bg-red-100 text-red-800 text-xs">🔴 STAT</Badge>}
                                                {lo.priority === 'Urgent' && <Badge className="bg-orange-100 text-orange-800 text-xs">🟡 Urgent</Badge>}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {lo.patient_name} • {lo.patient_id} • Dr. {lo.doctor_name} • {new Date(lo.order_date).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {lo.status === 'Pending' && (
                                            <Badge className="bg-amber-50 text-amber-700 py-1 px-3">
                                                <Clock className="h-3 w-3 mr-1" /> Pending Collection
                                            </Badge>
                                        )}
                                        {isCompleted(lo.status) && (
                                            <Button size="sm" variant="outline" className="border-green-200 text-green-700 hover:bg-green-50" onClick={() => viewResults(lo)}>
                                                <Eye className="h-4 w-4 mr-1" /> View Results
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Create Lab Order Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Order New Lab Test</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Patient ID</label>
                            <Input
                                placeholder="e.g., P0001"
                                value={targetPid}
                                onChange={e => {
                                    setTargetPid(e.target.value.toUpperCase());
                                    lookupPatient(e.target.value);
                                }}
                                className="uppercase h-11"
                            />
                            {targetPatientName && (
                                <div className={`text-xs p-2 rounded ${targetPatientName.includes('not found') ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                    {targetPatientName}
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Priority</label>
                            <Select value={orderPriority} onValueChange={setOrderPriority}>
                                <SelectTrigger className="h-11">
                                    <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Routine">Routine</SelectItem>
                                    <SelectItem value="Urgent">Urgent</SelectItem>
                                    <SelectItem value="STAT">STAT</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Select Tests</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 border rounded-lg">
                                {AVAILABLE_TESTS.map(test => (
                                    <div key={test} className="flex items-center space-x-2 p-1 hover:bg-slate-50 rounded transition-colors">
                                        <Checkbox
                                            id={`test-${test}`}
                                            checked={selectedTests.includes(test)}
                                            onCheckedChange={(checked) => {
                                                if (checked) setSelectedTests([...selectedTests, test]);
                                                else setSelectedTests(selectedTests.filter(t => t !== test));
                                            }}
                                        />
                                        <label htmlFor={`test-${test}`} className="text-sm cursor-pointer select-none truncate">
                                            {test}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Clinical Notes / Instructions</label>
                            <Textarea
                                placeholder="Any clinical notes or instructions for the lab technician..."
                                value={orderInstructions}
                                onChange={e => setOrderInstructions(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button
                            className="bg-amber-600 hover:bg-amber-700"
                            onClick={handleCreateOrder}
                            disabled={orderLoading || !targetPid || selectedTests.length === 0}
                        >
                            {orderLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Create Order
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Results Dialog */}
            <Dialog open={isResultOpen} onOpenChange={setIsResultOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600" /> Lab Results
                        </DialogTitle>
                    </DialogHeader>
                    {resultsLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Loader2 className="h-8 w-8 animate-spin mb-4" />
                            <p>Fetching results...</p>
                        </div>
                    ) : selectedResults ? (
                        <div className="space-y-6">
                            {/* Report Header */}
                            <div className="text-center border-b pb-4">
                                <h2 className="text-xl font-bold">CITYCARE HOSPITAL</h2>
                                <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Laboratory Investigation Report</p>
                            </div>

                            <div className="grid grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Patient Information</p>
                                    <p className="font-bold text-lg">{selectedResults?.patient_name || 'N/A'}</p>
                                    <p className="text-xs text-slate-500">{selectedResults?.patient_id || 'N/A'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Test Information</p>
                                    <p className="font-bold">{selectedResults?.test_name || 'Lab Test'}</p>
                                    <p className="text-xs text-slate-500">Ordered by Dr. {selectedResults?.doctor_name || 'N/A'}</p>
                                    <p className="text-xs text-slate-500">Completed: {selectedResults?.test_completed_at ? new Date(selectedResults.test_completed_at).toLocaleString() : 'N/A'}</p>
                                </div>
                            </div>

                            <div className="overflow-hidden border rounded-xl">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-100">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-bold">Parameter</th>
                                            <th className="px-4 py-3 text-left font-bold">Result</th>
                                            <th className="px-4 py-3 text-left font-bold">Unit</th>
                                            <th className="px-4 py-3 text-left font-bold">Reference Range</th>
                                            <th className="px-4 py-3 text-left font-bold">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {Array.isArray(selectedResults?.test_results) ? selectedResults.test_results.map((r: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 font-medium">{r.parameter}</td>
                                                <td className="px-4 py-3 font-bold">{r.value}</td>
                                                <td className="px-4 py-3 text-slate-500">{r.unit}</td>
                                                <td className="px-4 py-3 text-slate-500">{r.reference_range}</td>
                                                <td className="px-4 py-3 text-slate-500">
                                                    <Badge className={`text-[10px] ${r.status === 'normal' ? 'bg-green-100 text-green-700' :
                                                        r.status === 'critical' ? 'bg-red-100 text-red-700' :
                                                            'bg-amber-100 text-amber-700'
                                                        }`}>
                                                        {(r.status || 'unknown').toUpperCase()}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-10 text-center text-slate-400 italic">
                                                    No detailed results available for this report.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                                <h4 className="text-xs font-bold text-blue-800 mb-2 flex items-center gap-2 uppercase tracking-wider">
                                    <Activity className="h-3.5 w-3.5" /> Clinical Summary
                                </h4>
                                <p className="text-sm text-blue-900 font-medium">{selectedResults?.analysis_summary || 'No summary available.'}</p>
                            </div>

                            <div className="flex gap-3 no-print">
                                <Button className="flex-1 bg-slate-800" onClick={() => window.print()}>
                                    <Printer className="h-4 w-4 mr-2" /> Print Results
                                </Button>
                                <Button variant="outline" className="flex-1" onClick={() => setIsResultOpen(false)}>
                                    <X className="h-4 w-4 mr-2" /> Close
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-20 text-slate-400">
                            <AlertCircle className="mx-auto h-12 w-12 mb-3" />
                            <p>Report details could not be found.</p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div >
    );
}
