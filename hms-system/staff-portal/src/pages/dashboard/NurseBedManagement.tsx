import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    BedDouble, Search, Loader2, User, Building2, CheckCircle2,
    XCircle, Wrench, ArrowRightLeft, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import socket from '@/lib/socket';

const API = import.meta.env.VITE_API_URL || '/api';

export default function NurseBedManagement() {
    const [loading, setLoading] = useState(true);
    const [beds, setBeds] = useState<any[]>([]);
    const [admissions, setAdmissions] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = useCallback(async () => {
        try {
            const token = localStorage.getItem('hms_staff_token');
            const [dashRes, bedsRes] = await Promise.all([
                fetch(`${API}/nurse/dashboard`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API}/beds`, { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            const dashData = await dashRes.json();
            const bedsData = await bedsRes.json();
            setStats(dashData.stats);
            setAdmissions(dashData.admissions || []);
            setBeds(Array.isArray(bedsData) ? bedsData : []);
        } catch { toast.error('Failed to load bed data'); } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        const handleRefresh = (data?: any) => {
            console.log("Realtime event received, refreshing beds...", data);
            fetchData();
        };

        socket.on('bed_status_updated', handleRefresh);
        socket.on('admission_status_updated', handleRefresh);
        socket.on('admission:discharged', handleRefresh);
        socket.on('bed_inventory_updated', handleRefresh);

        return () => {
            socket.off('bed_status_updated', handleRefresh);
            socket.off('admission_status_updated', handleRefresh);
            socket.off('admission:discharged', handleRefresh);
            socket.off('bed_inventory_updated', handleRefresh);
        };
    }, [fetchData]);

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'Available': return { color: 'bg-green-100 text-green-800 border-green-200', icon: <CheckCircle2 className="h-4 w-4 text-green-600" />, border: 'border-l-green-500' };
            case 'Occupied': return { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <User className="h-4 w-4 text-blue-600" />, border: 'border-l-blue-500' };
            case 'Maintenance': return { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: <Wrench className="h-4 w-4 text-gray-600" />, border: 'border-l-gray-400' };
            case 'Reserved': return { color: 'bg-amber-100 text-amber-800 border-amber-200', icon: <XCircle className="h-4 w-4 text-amber-600" />, border: 'border-l-amber-400' };
            default: return { color: 'bg-gray-100 text-gray-600', icon: <BedDouble className="h-4 w-4" />, border: 'border-l-gray-300' };
        }
    };

    const filteredBeds = useMemo(() => {
        return beds.filter(b =>
            b.bed_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.ward_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.patient_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [beds, searchTerm]);

    // Group beds by Dept -> Ward -> Floor
    const deptMap = useMemo(() => {
        const map: Record<string, Record<string, Record<string, any[]>>> = {};
        filteredBeds.forEach(b => {
            const dept = b.department || 'General';
            const ward = b.ward_name || 'Main Ward';
            const floor = (b.floor_number !== null && b.floor_number !== undefined) ? `Floor ${b.floor_number}` : 'Ground Floor';

            if (!map[dept]) map[dept] = {};
            if (!map[dept][ward]) map[dept][ward] = {};
            if (!map[dept][ward][floor]) map[dept][ward][floor] = [];

            map[dept][ward][floor].push(b);
        });
        return map;
    }, [filteredBeds]);

    const deptNames = Object.keys(deptMap).sort();
    const [activeTab, setActiveTab] = useState<string>('');

    useEffect(() => {
        if (!activeTab && deptNames.length > 0) {
            setActiveTab(deptNames[0]);
        } else if (activeTab && !deptNames.includes(activeTab) && deptNames.length > 0) {
            setActiveTab(deptNames[0]);
        }
    }, [deptNames, activeTab]);

    const activeDeptAdmissions = useMemo(() => {
        return admissions.filter(adm => adm.department_name === activeTab || adm.department === activeTab);
    }, [admissions, activeTab]);

    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2"><BedDouble className="h-7 w-7 text-indigo-600" /> Bed & Transfer Management</h1>
                    <p className="text-gray-500 text-sm">Monitor bed occupancy and manage transfers</p>
                </div>
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input placeholder="Search beds, wards..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Total Beds', value: stats?.total_beds || beds.length, color: 'from-indigo-500 to-indigo-600', icon: <BedDouble className="h-5 w-5" /> },
                    { label: 'Occupied', value: stats?.occupied_beds || beds.filter(b => b.status === 'Occupied').length, color: 'from-blue-500 to-blue-600', icon: <User className="h-5 w-5" /> },
                    { label: 'Available', value: stats?.available_beds || beds.filter(b => b.status === 'Available').length, color: 'from-green-500 to-green-600', icon: <CheckCircle2 className="h-5 w-5" /> },
                    { label: 'Admitted Patients', value: admissions.length, color: 'from-purple-500 to-purple-600', icon: <Building2 className="h-5 w-5" /> },
                ].map((s, i) => (
                    <Card key={i} className="overflow-hidden">
                        <CardContent className="p-0">
                            <div className={`bg-gradient-to-r ${s.color} p-3 flex items-center gap-3`}>
                                <div className="text-white/90">{s.icon}</div>
                                <div><p className="text-2xl font-bold text-white">{s.value}</p><p className="text-xs text-white/80">{s.label}</p></div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {beds.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <BedDouble className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Beds Configured</h3>
                        <p className="text-gray-500 text-sm">Beds can be set up centrally by the Administrator.</p>
                    </CardContent>
                </Card>
            ) : deptNames.length > 0 ? (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="flex flex-wrap h-auto w-full bg-indigo-50/80 p-1 mb-6 rounded-xl border border-indigo-100 justify-start">
                        {deptNames.map(dept => {
                            let totalBedsInDept = 0;
                            Object.values(deptMap[dept]).forEach(ward => {
                                Object.values(ward).forEach(floor => {
                                    totalBedsInDept += floor.length;
                                });
                            });

                            return (
                                <TabsTrigger
                                    key={dept}
                                    value={dept}
                                    className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm px-4 py-2"
                                >
                                    <span className="flex items-center gap-2 font-bold text-sm">
                                        <Building2 className="h-4 w-4" />
                                        {dept}
                                        <Badge variant="secondary" className="ml-1 bg-indigo-50 text-indigo-600 border-indigo-100 font-black">
                                            {totalBedsInDept}
                                        </Badge>
                                    </span>
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>

                    <AnimatePresence mode="wait">
                        {deptNames.map(dept => (
                            <TabsContent key={dept} value={dept} className="mt-0 outline-none">
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-8"
                                >
                                    {Object.entries(deptMap[dept]).map(([ward, floorsObj]) => (
                                        <div key={ward} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                                            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                                                <h3 className="font-extrabold text-lg text-slate-800 flex items-center gap-2">
                                                    <Badge className="bg-indigo-600 text-white shadow-sm border-0">{ward}</Badge>
                                                </h3>
                                            </div>

                                            <div className="p-6 space-y-8">
                                                {Object.entries(floorsObj).map(([floor, floorBeds]) => (
                                                    <div key={floor}>
                                                        <h4 className="font-bold text-sm text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center">
                                                            <div className="w-2 h-2 rounded-full bg-slate-300 mr-2"></div>
                                                            {floor}
                                                        </h4>

                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                            {floorBeds.map(bed => {
                                                                const sc = getStatusConfig(bed.status);
                                                                return (
                                                                    <motion.div
                                                                        key={bed.bed_id}
                                                                        whileHover={{ y: -4, scale: 1.01 }}
                                                                        className="h-full"
                                                                    >
                                                                        <Card className={`h-full overflow-hidden border-t border-r-0 border-b-0 border-l-[6px] ${sc.border} shadow-sm transition-all bg-white`}>
                                                                            <CardContent className="p-4 flex flex-col h-full relative">
                                                                                <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
                                                                                    <BedDouble size={80} className={sc.color.split(' ')[1]} />
                                                                                </div>

                                                                                <div className="flex items-center justify-between mb-3 z-10 w-full">
                                                                                    <span className="font-extrabold text-lg tracking-tight text-slate-800">{bed.bed_id}</span>
                                                                                    <Badge className={`text-xs px-2 py-1 font-bold shadow-sm ${sc.color} border border-white/50`}>
                                                                                        <span className="flex items-center gap-1.5">{sc.icon} {bed.status}</span>
                                                                                    </Badge>
                                                                                </div>

                                                                                <div className="mb-auto z-10 space-y-1 mt-1">
                                                                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-50 inline-flex px-2 py-1 rounded-md">
                                                                                        <span>Room {bed.room_number}</span>
                                                                                    </div>
                                                                                    <p className="text-xs font-medium tracking-wide text-slate-400 pl-1">{bed.bed_type?.replace(/_/g, ' ')}</p>
                                                                                </div>

                                                                                {bed.status === 'Occupied' && bed.patient_name ? (
                                                                                    <div className="mt-4 bg-gradient-to-r from-blue-50 to-indigo-50/50 rounded-lg p-3 border border-blue-100 z-10">
                                                                                        <div className="flex items-center gap-2 mb-1">
                                                                                            <div className="bg-blue-200 text-blue-800 text-[10px] font-black w-6 h-6 rounded flex items-center justify-center shrink-0 shadow-sm">
                                                                                                {bed.patient_name.charAt(0)}
                                                                                            </div>
                                                                                            <p className="font-bold text-sm text-blue-900 truncate">{bed.patient_name}</p>
                                                                                        </div>
                                                                                        <div className="flex justify-between items-center mt-2 pl-8">
                                                                                            <span className="text-xs font-bold text-blue-600/80">{bed.patient_id}</span>
                                                                                            {bed.admission_date && (
                                                                                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                                                                                    <Clock size={10} /> {new Date(bed.admission_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="mt-4 py-3 rounded-lg border-2 border-dashed border-slate-100 flex items-center justify-center text-slate-400 bg-slate-50/50 z-10">
                                                                                        <span className="text-xs font-bold uppercase tracking-widest">{bed.status}</span>
                                                                                    </div>
                                                                                )}
                                                                            </CardContent>
                                                                        </Card>
                                                                    </motion.div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </motion.div>
                            </TabsContent>
                        ))}
                    </AnimatePresence>
                </Tabs>
            ) : (
                <div className="py-12 text-center text-slate-400 font-medium border-2 border-dashed border-slate-200 rounded-xl">
                    <Search className="h-8 w-8 mx-auto mb-2 text-slate-300 opacity-50" />
                    No beds match your search query.
                </div>
            )}

            {/* Admitted Patients Summary for Active Department */}
            {activeDeptAdmissions.length > 0 && (
                <div className="mt-12 pt-8 border-t border-slate-200">
                    <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                        <ArrowRightLeft className="h-5 w-5 text-indigo-500" />
                        Currently Admitted in {activeTab} <span className="text-slate-400 font-semibold text-sm">({activeDeptAdmissions.length})</span>
                    </h3>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {activeDeptAdmissions.map(adm => (
                            <Card key={adm.admission_id} className="border-l-4 border-l-indigo-400 shadow-sm hover:shadow-md transition-shadow">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold">{adm.patient_name}</p>
                                        <p className="text-xs text-gray-500">Bed: {adm.bed_id} • Room: {adm.room_number} • Dr. {adm.doctor_name}</p>
                                        <p className="text-xs text-gray-400">Admitted: {new Date(adm.admission_date).toLocaleDateString()}</p>
                                    </div>
                                    <Badge className="bg-blue-100 text-blue-800">{adm.status}</Badge>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
