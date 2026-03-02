import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Clock, User, Phone, AlertTriangle, FileText, Activity } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface AppointmentDetailModalProps {
    appointment: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onStartConsultation: (appointmentId: string) => void;
}

export function AppointmentDetailModal({
    appointment,
    open,
    onOpenChange,
    onStartConsultation,
}: AppointmentDetailModalProps) {
    if (!appointment) return null;

    const patient = appointment.patient || {}; // Fallback if patient data is structured differently

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-2 border-b bg-slate-50/50">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-4">
                            <Avatar className="h-16 w-16 border-2 border-white shadow-sm">
                                <AvatarFallback className="text-xl bg-primary/10 text-primary">
                                    {patient.first_name?.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="space-y-1">
                                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                    {patient.first_name} {patient.last_name}
                                    <Badge variant="outline" className="text-xs font-normal">
                                        {patient.patient_id}
                                    </Badge>
                                </DialogTitle>
                                <DialogDescription className="flex items-center gap-3 text-sm">
                                    <span className="flex items-center gap-1">
                                        <User className="h-3 w-3" /> {patient.age || 'N/A'} yrs / {patient.gender}
                                    </span>
                                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                    <span className="flex items-center gap-1">
                                        <Phone className="h-3 w-3" /> {patient.mobile_number}
                                    </span>
                                </DialogDescription>
                            </div>
                        </div>
                        <div className="text-right space-y-1">
                            <Badge className={
                                appointment.status === 'Emergency' ? 'bg-red-100 text-red-800 hover:bg-red-200' :
                                    appointment.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                            }>
                                {appointment.status}
                            </Badge>
                            <p className="text-xs text-muted-foreground font-mono mt-1">
                                Token: {appointment.token_number}
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1 overflow-y-auto">
                    <div className="p-6">
                        <Tabs defaultValue="overview" className="space-y-4">
                            <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                                <TabsTrigger value="overview">Overview</TabsTrigger>
                                <TabsTrigger value="history">Medical History</TabsTrigger>
                                <TabsTrigger value="details">Visit Details</TabsTrigger>
                            </TabsList>

                            <TabsContent value="overview" className="space-y-4">
                                {/* Medical Alerts */}
                                {(patient.blood_group || patient.known_allergies || patient.chronic_conditions) && (
                                    <div className="grid gap-4 md:grid-cols-3">
                                        <div className="p-3 rounded-lg bg-red-50 border border-red-100 flex items-start gap-3">
                                            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-semibold text-red-900">Allergies</p>
                                                <p className="text-sm text-red-700">{patient.known_allergies || 'None known'}</p>
                                            </div>
                                        </div>
                                        <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 flex items-start gap-3">
                                            <Activity className="h-5 w-5 text-amber-600 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-semibold text-amber-900">Chronic Conditions</p>
                                                <p className="text-sm text-amber-700">{patient.chronic_conditions || 'None'}</p>
                                            </div>
                                        </div>
                                        <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 flex items-start gap-3">
                                            <div className="h-5 w-5 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-xs font-bold">
                                                {patient.blood_group || '?'}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-blue-900">Blood Group</p>
                                                <p className="text-sm text-blue-700">{patient.blood_group || 'Unknown'}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-medium text-muted-foreground">Reason for Visit</h4>
                                        <p className="text-base font-medium">{appointment.reason_for_visit || 'Routine Checkup'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-medium text-muted-foreground">Appointment Type</h4>
                                        <p className="text-base font-medium">{appointment.appointment_type}</p>
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-lg border">
                                    <h4 className="text-sm font-semibold mb-3">Patient Details</h4>
                                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                                        <div className="text-muted-foreground">Email:</div>
                                        <div>{patient.email || 'N/A'}</div>

                                        <div className="text-muted-foreground">Address:</div>
                                        <div>{patient.current_city}, {patient.current_state}</div>

                                        <div className="text-muted-foreground">Emergency Contact:</div>
                                        <div>{patient.emergency_contact_name} ({patient.emergency_contact_number})</div>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="history">
                                <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground bg-slate-50 rounded-lg border border-dashed">
                                    <FileText className="h-10 w-10 mb-2 opacity-20" />
                                    <p>Past visit history will appear here.</p>
                                    <Button variant="link" size="sm">View Full EMR</Button>
                                </div>
                            </TabsContent>

                            <TabsContent value="details">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 border rounded-lg">
                                            <label className="text-xs text-muted-foreground uppercase font-semibold">Date & Time</label>
                                            <div className="mt-1 flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium">{appointment.appointment_date}</span>
                                            </div>
                                            <div className="mt-1 flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium">{appointment.appointment_time}</span>
                                            </div>
                                        </div>
                                        <div className="p-4 border rounded-lg">
                                            <label className="text-xs text-muted-foreground uppercase font-semibold">Payment Status</label>
                                            <div className="mt-1">
                                                <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">Paid</Badge>
                                                <span className="ml-2 text-sm text-muted-foreground">₹{appointment.consultation_fee}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Special Requirements</label>
                                        <p className="text-sm text-gray-600 bg-slate-50 p-3 rounded-md border">
                                            {appointment.special_requirements || 'None'}
                                        </p>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </ScrollArea>

                <DialogFooter className="p-6 pt-2 border-t bg-slate-50/50">
                    <div className="flex w-full justify-between items-center">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <div className="flex gap-2">
                            <Button variant="secondary" onClick={() => { }}>Reschedule</Button>
                            <Button
                                className="bg-blue-600 hover:bg-blue-700"
                                onClick={() => onStartConsultation(appointment.appointment_id)}
                            >
                                Start Consultation
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
