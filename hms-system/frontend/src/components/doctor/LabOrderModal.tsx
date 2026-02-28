import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { Plus, Trash2, FlaskConical } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface LabOrderModalProps {
    patientId: string;
    appointmentId?: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

const COMMON_TESTS = [
    { value: 'CBC', label: 'Complete Blood Count (CBC)' },
    { value: 'LIPID_PROFILE', label: 'Lipid Profile' },
    { value: 'LIVER_FUNCTION', label: 'Liver Function Test (LFT)' },
    { value: 'RENAL_FUNCTION', label: 'Renal Function Test (RFT)' },
    { value: 'URINE_ROUTINE', label: 'Urine Routine' },
    { value: 'TSH', label: 'Thyroid Stimulating Hormone (TSH)' },
    { value: 'GLUCOSE_FASTING', label: 'Blood Glucose (Fasting)' },
    { value: 'GLUCOSE_PP', label: 'Blood Glucose (Post Prandial)' },
    { value: 'ECG', label: 'Electrocardiogram (ECG)' },
    { value: 'XRAY_CHEST', label: 'X-Ray Chest PA View' },
];

export function LabOrderModal({
    patientId,
    appointmentId,
    open,
    onOpenChange,
    onSuccess,
}: LabOrderModalProps) {
    const [loading, setLoading] = useState(false);
    const { register, control, handleSubmit, reset } = useForm({
        defaultValues: {
            clinical_notes: '',
            tests: [{ name: '', priority: 'Routine' }]
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "tests"
    });

    const onSubmit = async (data: any) => {
        setLoading(true);
        try {
            if (!patientId) {
                toast.error('No patient selected. Please select a patient to place lab orders.');
                setLoading(false);
                return;
            }

            const token = localStorage.getItem('hms_staff_token');
            if (!token) {
                toast.error('You are not authenticated. Please login again.');
                setLoading(false);
                return;
            }

            // Normalize tests: filter empty and ensure expected keys
            const tests = (data.tests || [])
                .filter((t: any) => t && t.name && t.name.trim())
                .map((t: any) => ({
                    name: t.name.trim(),
                    category: t.category || '',
                    priority: t.priority || 'Routine'
                }));

            if (tests.length === 0) {
                toast.error('Please add at least one test to order.');
                setLoading(false);
                return;
            }

            const payload = {
                patient_id: patientId,
                appointment_id: appointmentId,
                clinical_notes: data.clinical_notes,
                tests
            };

            const res = await fetch(`${API_URL}/lab-orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                toast.success('Lab order placed successfully');
                reset();
                onSuccess();
                onOpenChange(false);
            } else {
                let errorMsg = 'Failed to place lab order';
                try {
                    const errorData = await res.json();
                    errorMsg = errorData.error || errorData.message || errorMsg;
                } catch (e) {
                    // ignore parse errors
                }
                toast.error(errorMsg);
            }
        } catch (error) {
            toast.error('An error occurred while placing lab order');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Order Lab Tests</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-2">
                        <Label>Clinical Notes</Label>
                        <Textarea {...register('clinical_notes')} placeholder="e.g. Suspected infection, fever for 3 days" />
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold">Tests</Label>
                            <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', priority: 'Routine' })}>
                                <Plus className="h-4 w-4 mr-1" /> Add Test
                            </Button>
                        </div>

                        {fields.map((field, index) => (
                            <div key={field.id} className="flex gap-4 items-end bg-slate-50 p-3 rounded-lg border">
                                <div className="flex-1 space-y-1">
                                    <Label className="text-xs">Test Name</Label>
                                    <Input {...register(`tests.${index}.name` as const)} placeholder="e.g. CBC" required list="common-tests" />
                                    <datalist id="common-tests">
                                        {COMMON_TESTS.map(t => <option key={t.value} value={t.label} />)}
                                    </datalist>
                                </div>
                                <div className="w-32 space-y-1">
                                    <Label className="text-xs">Priority</Label>
                                    <select {...register(`tests.${index}.priority` as const)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                                        <option value="Routine">Routine</option>
                                        <option value="Urgent">Urgent</option>
                                        <option value="Stat">Stat (Immediate)</option>
                                    </select>
                                </div>
                                <Button type="button" variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => remove(index)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700">
                            <FlaskConical className="h-4 w-4 mr-2" />
                            {loading ? 'Ordering...' : 'Place Order'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
