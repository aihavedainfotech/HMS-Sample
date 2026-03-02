import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    ClipboardList, Users, CheckCircle2, Clock, AlertCircle,
    Loader2, ChevronDown, ChevronUp, Flag, FileText, User
} from 'lucide-react';
import { toast } from 'sonner';

const API = import.meta.env.VITE_API_URL || '/api';

interface HandoverNote {
    patientId: string;
    patientName: string;
    situation: string;
    background: string;
    assessment: string;
    recommendation: string;
    priority: 'high' | 'medium' | 'low';
    tasksCompleted: string[];
    tasksPending: string[];
    timestamp: string;
}

export default function ShiftHandover() {
    const [loading, setLoading] = useState(true);
    const [patients, setPatients] = useState<any[]>([]);
    const [prescriptions, setPrescriptions] = useState<any[]>([]);
    const [labOrders, setLabOrders] = useState<any[]>([]);
    const [todayAppts, setTodayAppts] = useState<any[]>([]);
    const [handoverNotes, setHandoverNotes] = useState<HandoverNote[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [newNote, setNewNote] = useState({ patientId: '', situation: '', background: '', assessment: '', recommendation: '', priority: 'medium' as const });
    const [showForm, setShowForm] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const token = localStorage.getItem('hms_staff_token');
            const res = await fetch(`${API}/nurse/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            setPatients(data.patients || []);
            setPrescriptions(data.prescriptions || []);
            setLabOrders(data.lab_orders || []);
            setTodayAppts(data.today_appointments || []);

            // Load local handover notes
            const saved = localStorage.getItem('nurse_handover_notes');
            if (saved) setHandoverNotes(JSON.parse(saved));
        } catch { toast.error('Failed to load data'); } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const saveNote = () => {
        if (!newNote.patientId || !newNote.situation) { toast.error('Select a patient and fill in Situation'); return; }
        const patient = patients.find(p => p.patient_id === newNote.patientId);
        const note: HandoverNote = {
            ...newNote,
            patientName: patient ? `${patient.first_name} ${patient.last_name}` : newNote.patientId,
            tasksCompleted: [],
            tasksPending: [],
            timestamp: new Date().toISOString(),
        };
        const updated = [note, ...handoverNotes];
        setHandoverNotes(updated);
        localStorage.setItem('nurse_handover_notes', JSON.stringify(updated));
        setNewNote({ patientId: '', situation: '', background: '', assessment: '', recommendation: '', priority: 'medium' });
        setShowForm(false);
        toast.success('Handover note saved!');
    };

    const pendingLabs = labOrders.filter(l => ['Pending', 'Sample_Collected'].includes(l.status)).length;
    const activeRx = prescriptions.filter(r => r.status === 'Active').length;

    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-teal-600" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardList className="h-7 w-7 text-teal-600" /> Shift Handover</h1>
                    <p className="text-gray-500 text-sm">SBAR notes, tasks, and priority flags</p>
                </div>
                <Button onClick={() => setShowForm(!showForm)} className="bg-teal-600 hover:bg-teal-700">
                    <FileText className="h-4 w-4 mr-2" /> {showForm ? 'Close Form' : 'New SBAR Note'}
                </Button>
            </div>

            {/* Shift Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Patients', value: patients.length, color: 'from-teal-500 to-teal-600', icon: <Users className="h-5 w-5" /> },
                    { label: 'Today Appts', value: todayAppts.length, color: 'from-blue-500 to-blue-600', icon: <Clock className="h-5 w-5" /> },
                    { label: 'Active Rx', value: activeRx, color: 'from-purple-500 to-purple-600', icon: <CheckCircle2 className="h-5 w-5" /> },
                    { label: 'Pending Labs', value: pendingLabs, color: 'from-amber-500 to-amber-600', icon: <AlertCircle className="h-5 w-5" /> },
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

            {/* SBAR Note Form */}
            {showForm && (
                <Card className="border-teal-200 bg-teal-50/30">
                    <CardContent className="p-5 space-y-3">
                        <h3 className="font-semibold text-teal-800">New SBAR Note</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium">Patient</label>
                                <select className="w-full border rounded-lg p-2 text-sm" value={newNote.patientId} onChange={e => setNewNote({ ...newNote, patientId: e.target.value })}>
                                    <option value="">Select patient...</option>
                                    {patients.map(p => <option key={p.patient_id} value={p.patient_id}>{p.first_name} {p.last_name} ({p.patient_id})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium">Priority</label>
                                <select className="w-full border rounded-lg p-2 text-sm" value={newNote.priority} onChange={e => setNewNote({ ...newNote, priority: e.target.value as any })}>
                                    <option value="high">🔴 High</option>
                                    <option value="medium">🟡 Medium</option>
                                    <option value="low">🟢 Low</option>
                                </select>
                            </div>
                        </div>
                        <div><label className="text-xs font-medium">S - Situation</label><Input placeholder="What is happening now?" value={newNote.situation} onChange={e => setNewNote({ ...newNote, situation: e.target.value })} /></div>
                        <div><label className="text-xs font-medium">B - Background</label><Input placeholder="Relevant history/context" value={newNote.background} onChange={e => setNewNote({ ...newNote, background: e.target.value })} /></div>
                        <div><label className="text-xs font-medium">A - Assessment</label><Input placeholder="Your clinical assessment" value={newNote.assessment} onChange={e => setNewNote({ ...newNote, assessment: e.target.value })} /></div>
                        <div><label className="text-xs font-medium">R - Recommendation</label><Input placeholder="What needs to be done" value={newNote.recommendation} onChange={e => setNewNote({ ...newNote, recommendation: e.target.value })} /></div>
                        <Button onClick={saveNote} className="bg-teal-600 hover:bg-teal-700"><CheckCircle2 className="h-4 w-4 mr-2" /> Save Note</Button>
                    </CardContent>
                </Card>
            )}

            {/* Existing Notes */}
            <div>
                <h3 className="font-semibold text-gray-800 mb-3">Handover Notes ({handoverNotes.length})</h3>
                {handoverNotes.length === 0 ? (
                    <Card><CardContent className="py-10 text-center"><ClipboardList className="mx-auto h-12 w-12 text-gray-300 mb-3" /><p className="text-gray-500">No handover notes yet. Click "New SBAR Note" to create one.</p></CardContent></Card>
                ) : (
                    <div className="space-y-3">
                        {handoverNotes.map((note, idx) => {
                            const expanded = expandedId === `${idx}`;
                            return (
                                <Card key={idx} className={`border-l-4 ${note.priority === 'high' ? 'border-l-red-500' : note.priority === 'medium' ? 'border-l-amber-400' : 'border-l-green-400'}`}>
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(expanded ? null : `${idx}`)}>
                                            <div className="flex items-center gap-3">
                                                <Flag className={`h-4 w-4 ${note.priority === 'high' ? 'text-red-500' : note.priority === 'medium' ? 'text-amber-500' : 'text-green-500'}`} />
                                                <div>
                                                    <span className="font-semibold">{note.patientName}</span>
                                                    <p className="text-xs text-gray-500">{new Date(note.timestamp).toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge className={note.priority === 'high' ? 'bg-red-100 text-red-800' : note.priority === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}>{note.priority}</Badge>
                                                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            </div>
                                        </div>
                                        {expanded && (
                                            <div className="mt-3 space-y-2 text-sm">
                                                {note.situation && <div className="bg-blue-50 p-2 rounded"><strong className="text-blue-800">S:</strong> {note.situation}</div>}
                                                {note.background && <div className="bg-gray-50 p-2 rounded"><strong className="text-gray-700">B:</strong> {note.background}</div>}
                                                {note.assessment && <div className="bg-amber-50 p-2 rounded"><strong className="text-amber-800">A:</strong> {note.assessment}</div>}
                                                {note.recommendation && <div className="bg-green-50 p-2 rounded"><strong className="text-green-800">R:</strong> {note.recommendation}</div>}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
