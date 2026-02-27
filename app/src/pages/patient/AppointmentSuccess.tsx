import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Calendar, Clock, MapPin, User, LogOut, LayoutDashboard } from 'lucide-react';
import { usePatientAuth } from '@/contexts/PatientAuthContext';

const AppointmentSuccess = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = usePatientAuth();

    const { appointment, transactionId } = location.state || {};

    // If no state is passed, redirect to dashboard or home
    if (!appointment) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <p className="text-red-500 mb-4">No appointment details found.</p>
                    <Button onClick={() => navigate('/patient/dashboard')}>Go to Dashboard</Button>
                </div>
            </div>
        );
    }

    const handleGoToDashboard = () => {
        navigate('/patient/dashboard');
    };

    const handleLogoutAndHome = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="text-center space-y-4">
                    <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mb-4">
                        <CheckCircle className="h-10 w-10 text-green-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Appointment Request Received!</h1>
                    <p className="text-lg text-gray-600 max-w-lg mx-auto">
                        Your appointment request has been received. Please wait for our confirmation.
                    </p>
                    <p className="text-base text-gray-500 max-w-lg mx-auto">
                        Payment has been confirmed. We will review your request and notify you once your appointment is approved.
                    </p>
                </div>

                <Card className="shadow-lg border-t-4 border-t-green-600">
                    <CardHeader className="bg-gray-50/50 border-b pb-6">
                        <CardTitle className="flex justify-between items-center">
                            <span>Appointment Details</span>
                            <span className="text-sm px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full font-medium">Pending Approval</span>
                        </CardTitle>
                        <CardDescription>ID: {appointment.id || 'Generated on approval'}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <span className="text-sm text-gray-500 flex items-center gap-1">
                                    <User className="h-3 w-3" /> Doctor
                                </span>
                                <p className="font-medium text-lg">{appointment.doctor_name}</p>
                                <p className="text-sm text-gray-500">{appointment.department}</p>
                            </div>

                            <div className="space-y-1">
                                <span className="text-sm text-gray-500 flex items-center gap-1">
                                    <Calendar className="h-3 w-3" /> Date
                                </span>
                                <p className="font-medium text-lg">{appointment.date}</p>
                            </div>

                            <div className="space-y-1">
                                <span className="text-sm text-gray-500 flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> Time Range
                                </span>
                                <p className="font-medium text-lg">{appointment.time}</p>
                            </div>

                            <div className="space-y-1">
                                <span className="text-sm text-gray-500 flex items-center gap-1">
                                    <MapPin className="h-3 w-3" /> Location
                                </span>
                                <p className="font-medium text-lg">CityCare Hospital, Mumbai</p>
                            </div>
                        </div>

                        <div className="border-t pt-4 mt-6">
                            <h3 className="font-semibold mb-3">Payment Summary</h3>
                            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Consultation Fee</span>
                                    <span className="font-medium">₹{appointment.amount}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Payment Status</span>
                                    <span className="text-green-600 font-medium flex items-center gap-1">
                                        <CheckCircle className="h-3 w-3" /> Paid
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm text-gray-500 pt-2 border-t mt-2">
                                    <span>Transaction ID</span>
                                    <span className="font-mono">{transactionId}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Button
                        variant="outline"
                        size="lg"
                        className="flex items-center gap-2 h-14"
                        onClick={handleGoToDashboard}
                    >
                        <LayoutDashboard className="h-5 w-5" />
                        Patient Dashboard
                    </Button>
                    <Button
                        size="lg"
                        className="flex items-center gap-2 h-14 bg-blue-600 hover:bg-blue-700"
                        onClick={handleLogoutAndHome}
                    >
                        <LogOut className="h-5 w-5" />
                        Home
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AppointmentSuccess;
