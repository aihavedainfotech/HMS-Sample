import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    FileHeart, Loader2, User, CheckCircle2, Target, AlertTriangle,
    Plus, Trash2, ChevronDown, ChevronUp, Shield, Droplets
} from 'lucide-react';
import { toast } from 'sonner';

const API = import.meta.env.VITE_API_URL || '/api';

interface CarePlan {
    id: string;
    patientId: string;
    patientName: string;
    goals: { text: string; completed: boolean }[];
    woundCare: string;
    ivSite: string;
    fallRisk: 'low' | 'medium' | 'high';
    pressureUlcerRisk: 'low' | 'medium' | 'high';
    notes: string;
    createdAt: string;
    updatedAt: string;
}

export default function NurseCarePlan() {
    const [loading, setLoading] = useState(true);
    const [patients, setPatients] = useState<any[]>([]);
    const [carePlans, setCarePlans] = useState<CarePlan[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ patientId: '', woundCare: '', ivSite: '', fallRisk: 'low' as const, pressureUlcerRisk: 'low' as const, notes: '', goals: [''] });

    const fetchData = useCallback(async () => {
        try {
            const token = localStorage.getItem('hms_staff_token');
            const res = await fetch(`${API}/nurse/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            setPatients(data.patients || []);
            const saved = localStorage.getItem('nurse_care_plans');
            if (saved) setCarePlans(JSON.parse(saved));
        } catch { toast.error('Failed to load data'); } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const savePlan = () => {
        if (!form.patientId) { toast.error('Select a patient'); return; }
        const patient = patients.find(p => p.patient_id === form.patientId);
        const plan: CarePlan = {
            id: `CP-${Date.now()}`,
            patientId: form.patientId,
            patientName: patient ? `${patient.first_name} ${patient.last_name}` : form.patientId,
            goals: form.goals.filter(g => g.trim()).map(g => ({ text: g, completed: false })),
            woundCare: form.woundCare, ivSite: form.ivSite,
            fallRisk: form.fallRisk, pressureUlcerRisk: form.pressureUlcerRisk,
            notes: form.notes,
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        };
        const updated = [plan, ...carePlans];
        setCarePlans(updated);
        localStorage.setItem('nurse_care_plans', JSON.stringify(updated));
        setForm({ patientId: '', woundCare: '', ivSite: '', fallRisk: 'low', pressureUlcerRisk: 'low', notes: '', goals: [''] });
        setShowForm(false);
        toast.success('Care plan saved!');
    };

    const toggleGoal = (planIdx: number, goalIdx: number) => {
        const updated = [...carePlans];
        updated[planIdx].goals[goalIdx].completed = !updated[planIdx].goals[goalIdx].completed;
        updated[planIdx].updatedAt = new Date().toISOString();
        setCarePlans(updated);
        localStorage.setItem('nurse_care_plans', JSON.stringify(updated));
    };

    const deletePlan = (idx: number) => {
        const updated = carePlans.filter((_, i) => i !== idx);
        setCarePlans(updated);
        localStorage.setItem('nurse_care_plans', JSON.stringify(updated));
        toast.success('Care plan removed');
    };

    const getRiskColor = (risk: string) => {
        switch (risk) { case 'high': return 'bg-red-100 text-red-800'; case 'medium': return 'bg-amber-100 text-amber-800'; default: return 'bg-green-100 text-green-800'; }
    };

    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-rose-600" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2"><FileHeart className="h-7 w-7 text-rose-600" /> Nursing Care Plans</h1>
                    <p className="text-gray-500 text-sm">Goals tracking, wound care, and risk assessments</p>
                </div>
                <Button onClick={() => setShowForm(!showForm)} className="bg-rose-600 hover:bg-rose-700">
                    <Plus className="h-4 w-4 mr-2" /> {showForm ? 'Close' : 'New Care Plan'}
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Card className="bg-gradient-to-r from-rose-50 to-rose-100 border-rose-200">
                    <CardContent className="p-4 flex items-center gap-3">
                        <FileHeart className="h-6 w-6 text-rose-600" />
                        <div><p className="text-2xl font-bold text-rose-900">{carePlans.length}</p><p className="text-xs text-rose-600">Active Plans</p></div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200">
                    <CardContent className="p-4 flex items-center gap-3">
                        <AlertTriangle className="h-6 w-6 text-amber-600" />
                        <div><p className="text-2xl font-bold text-amber-900">{carePlans.filter(c => c.fallRisk === 'high').length}</p><p className="text-xs text-amber-600">High Fall Risk</p></div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
                    <CardContent className="p-4 flex items-center gap-3">
                        <Shield className="h-6 w-6 text-red-600" />
                        <div><p className="text-2xl font-bold text-red-900">{carePlans.filter(c => c.pressureUlcerRisk === 'high').length}</p><p className="text-xs text-red-600">High Pressure Ulcer Risk</p></div>
                    </CardContent>
                </Card>
            </div>

            {/* New Care Plan Form */}
            {showForm && (
                <Card className="border-rose-200 bg-rose-50/30">
                    <CardContent className="p-5 space-y-3">
                        <h3 className="font-semibold text-rose-800">New Care Plan</h3>
                        <div>
                            <label className="text-xs font-medium">Patient</label>
                            <select className="w-full border rounded-lg p-2 text-sm" value={form.patientId} onChange={e => setForm({ ...form, patientId: e.target.value })}>
                                <option value="">Select patient...</option>
                                {patients.map(p => <option key={p.patient_id} value={p.patient_id}>{p.first_name} {p.last_name} ({p.patient_id})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium">Goals</label>
                            {form.goals.map((g, i) => (
                                <div key={i} className="flex gap-2 mb-1">
                                    <Input placeholder={`Goal ${i + 1}`} value={g} onChange={e => { const goals = [...form.goals]; goals[i] = e.target.value; setForm({ ...form, goals }); }} />
                                    {i === form.goals.length - 1 && <Button variant="outline" size="sm" onClick={() => setForm({ ...form, goals: [...form.goals, ''] })}><Plus className="h-3 w-3" /></Button>}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div><label className="text-xs font-medium">Wound Care Notes</label><Input placeholder="Wound care details..." value={form.woundCare} onChange={e => setForm({ ...form, woundCare: e.target.value })} /></div>
                            <div><label className="text-xs font-medium">IV Site Monitoring</label><Input placeholder="IV site details..." value={form.ivSite} onChange={e => setForm({ ...form, ivSite: e.target.value })} /></div>
                            <div>
                                <label className="text-xs font-medium">Fall Risk</label>
                                <select className="w-full border rounded-lg p-2 text-sm" value={form.fallRisk} onChange={e => setForm({ ...form, fallRisk: e.target.value as any })}>
                                    <option value="low">🟢 Low</option><option value="medium">🟡 Medium</option><option value="high">🔴 High</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium">Pressure Ulcer Risk</label>
                                <select className="w-full border rounded-lg p-2 text-sm" value={form.pressureUlcerRisk} onChange={e => setForm({ ...form, pressureUlcerRisk: e.target.value as any })}>
                                    <option value="low">🟢 Low</option><option value="medium">🟡 Medium</option><option value="high">🔴 High</option>
                                </select>
                            </div>
                        </div>
                        <div><label className="text-xs font-medium">Additional Notes</label><Input placeholder="Notes..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                        <Button onClick={savePlan} className="bg-rose-600 hover:bg-rose-700"><CheckCircle2 className="h-4 w-4 mr-2" /> Save Care Plan</Button>
                    </CardContent>
                </Card>
            )}

            {/* Existing Care Plans */}
            {carePlans.length === 0 ? (
                <Card><CardContent className="py-10 text-center"><FileHeart className="mx-auto h-12 w-12 text-gray-300 mb-3" /><p className="text-gray-500">No care plans yet</p></CardContent></Card>
            ) : (
                <div className="space-y-3">
                    {carePlans.map((plan, idx) => {
                        const expanded = expandedId === plan.id;
                        const completedGoals = plan.goals.filter(g => g.completed).length;
                        return (
                            <Card key={plan.id} className={`border-l-4 ${plan.fallRisk === 'high' || plan.pressureUlcerRisk === 'high' ? 'border-l-red-500' : 'border-l-rose-400'}`}>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(expanded ? null : plan.id)}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center"><User className="h-4 w-4 text-rose-600" /></div>
                                            <div>
                                                <span className="font-semibold">{plan.patientName}</span>
                                                <p className="text-xs text-gray-500">{completedGoals}/{plan.goals.length} goals • {new Date(plan.updatedAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge className={getRiskColor(plan.fallRisk)}>Fall: {plan.fallRisk}</Badge>
                                            <Badge className={getRiskColor(plan.pressureUlcerRisk)}>PU: {plan.pressureUlcerRisk}</Badge>
                                            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </div>
                                    </div>
                                    {expanded && (
                                        <div className="mt-4 space-y-3 text-sm">
                                            <div>
                                                <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-1"><Target className="h-4 w-4" /> Goals</h4>
                                                {plan.goals.map((goal, gi) => (
                                                    <label key={gi} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer">
                                                        <input type="checkbox" checked={goal.completed} onChange={() => toggleGoal(idx, gi)} className="rounded" />
                                                        <span className={goal.completed ? 'line-through text-gray-400' : ''}>{goal.text}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            {plan.woundCare && <div className="bg-orange-50 p-3 rounded"><strong>Wound Care:</strong> {plan.woundCare}</div>}
                                            {plan.ivSite && <div className="bg-blue-50 p-3 rounded"><strong>IV Site:</strong> {plan.ivSite}</div>}
                                            {plan.notes && <div className="bg-gray-50 p-3 rounded"><strong>Notes:</strong> {plan.notes}</div>}
                                            <Button variant="outline" size="sm" className="text-red-600 border-red-200" onClick={() => deletePlan(idx)}><Trash2 className="h-3 w-3 mr-1" /> Remove Plan</Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
