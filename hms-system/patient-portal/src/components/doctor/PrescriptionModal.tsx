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

import { Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface PrescriptionModalProps {
    patientId: string;
    appointmentId?: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function PrescriptionModal({
    patientId,
    appointmentId,
    open,
    onOpenChange,
    onSuccess,
}: PrescriptionModalProps) {
    const [loading, setLoading] = useState(false);
    const { register, control, handleSubmit, reset } = useForm({
        defaultValues: {
            diagnosis: '',
            chief_complaint: '',
            medicines: [{ medicine_name: '', strength: '', frequency: 'BD', duration: '5 days', instructions: '' }]
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "medicines"
    });

    const onSubmit = async (data: any) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('hms_staff_token');
            const res = await fetch(`${API_URL}/prescriptions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    patient_id: patientId,
                    appointment_id: appointmentId,
                    ...data
                }),
            });

            if (res.ok) {
                toast.success('Prescription created successfully');
                reset();
                onSuccess();
                onOpenChange(false);
            } else {
                const errorData = await res.json();
                toast.error(errorData.error || errorData.message || 'Failed to create prescription');
            }
        } catch (error) {
            toast.error('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>New Prescription</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Diagnosis</Label>
                            <Input {...register('diagnosis')} placeholder="e.g. Acute Bronchitis" required />
                        </div>
                        <div className="space-y-2">
                            <Label>Chief Complaint</Label>
                            <Input {...register('chief_complaint')} placeholder="e.g. Cough for 3 days" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold">Medicines</Label>
                            <Button type="button" variant="outline" size="sm" onClick={() => append({ medicine_name: '', strength: '', frequency: 'BD', duration: '5 days', instructions: '' })}>
                                <Plus className="h-4 w-4 mr-1" /> Add Medicine
                            </Button>
                        </div>

                        {fields.map((field, index) => (
                            <div key={field.id} className="grid grid-cols-12 gap-2 items-end bg-slate-50 p-3 rounded-lg border">
                                <div className="col-span-4 space-y-1">
                                    <Label className="text-xs">Medicine Name</Label>
                                    <Input {...register(`medicines.${index}.medicine_name` as const)} placeholder="Name" required list="med-names" />
                                    <datalist id="med-names">
                                        <option value="Paracetamol" />
                                        <option value="Amoxicillin" />
                                        <option value="Ibuprofen" />
                                        <option value="Cetirizine" />
                                        <option value="Omeprazole" />
                                        <option value="Metformin" />
                                        <option value="Amlodipine" />
                                        <option value="Azithromycin" />
                                    </datalist>
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <Label className="text-xs">Strength</Label>
                                    <Input {...register(`medicines.${index}.strength` as const)} placeholder="500mg" />
                                </div>
                                {/* Due to Select limitations in rhf with shadcn, using native select for speed/simplicity or controller */}
                                <div className="col-span-2 space-y-1">
                                    <Label className="text-xs">Freq</Label>
                                    <select {...register(`medicines.${index}.frequency` as const)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                                        <option value="OD">OD</option>
                                        <option value="BD">BD</option>
                                        <option value="TDS">TDS</option>
                                        <option value="QID">QID</option>
                                        <option value="SOS">SOS</option>
                                    </select>
                                </div>
                                <div className="col-span-3 space-y-1">
                                    <Label className="text-xs">Duration</Label>
                                    <Input {...register(`medicines.${index}.duration` as const)} placeholder="5 days" />
                                </div>
                                <div className="col-span-1">
                                    <Button type="button" variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => remove(index)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="col-span-12 space-y-1 mt-2">
                                    <Label className="text-xs">Instructions</Label>
                                    <Input {...register(`medicines.${index}.instructions` as const)} placeholder="e.g. After food" />
                                </div>
                            </div>
                        ))}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                            <Save className="h-4 w-4 mr-2" />
                            {loading ? 'Saving...' : 'Save Prescription'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
