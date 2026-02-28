import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
// Navigation
import HospitalNavbar from '@/components/HospitalNavbar';

// Hospital Website Pages
import Home from '@/pages/Home';
import HospitalServices from '@/pages/HospitalServices';
import HospitalDoctors from '@/pages/HospitalDoctors';
import HospitalAbout from '@/pages/HospitalAbout';
import HospitalContact from '@/pages/HospitalContact';

// Patient Registration & Booking
// import Register from '@/pages/Register';
// import BookAppointment from '@/pages/BookAppointment';

// Patient Auth Pages
import PatientLogin from '@/pages/auth/PatientLogin';
import PatientRegister from '@/pages/auth/PatientRegister';

// Patient Dashboard
import PatientDashboard from '@/layouts/PatientDashboard';
// import PatientHome from '@/pages/patient/PatientHome';
// import PatientAppointments from '@/pages/patient/PatientAppointments';
// import MedicalRecords from '@/pages/patient/MedicalRecords';

// Staff Auth
import StaffLogin from '@/pages/auth/StaffLogin';

// Staff Dashboards
import DoctorDashboard from '@/layouts/DoctorDashboard';
import ReceptionistDashboard from '@/layouts/ReceptionistDashboard';
import PharmacistDashboard from '@/layouts/PharmacistDashboard';
import LabDashboard from '@/layouts/LabDashboard';
import AdminDashboard from '@/layouts/AdminDashboard';
import AdmissionDashboard from '@/layouts/AdmissionDashboard';
import NurseDashboard from '@/layouts/NurseDashboard';

// Portal Selection Components
const PatientPortal = () => (
  <div className="min-h-screen">
    <HospitalNavbar />
    <div className="container mx-auto py-8">
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-blue-600 mb-4">Welcome to CityCare Hospital</h1>
        <p className="text-xl text-gray-600 mb-8">Your health, our priority. Quality healthcare with compassion.</p>
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold text-blue-600 mb-4">Patient Services</h2>
            <p className="text-gray-600 mb-4">Book appointments, view records, manage your health</p>
            <Link to="/patient/login">
              <Button className="w-full">Patient Portal</Button>
            </Link>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold text-gray-600 mb-4">Hospital Information</h2>
            <p className="text-gray-600 mb-4">Learn about our services, doctors, and facilities</p>
            <Link to="/about">
              <Button variant="outline" className="w-full">About Hospital</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const StaffPortal = () => (
  <div className="min-h-screen">
    <HospitalNavbar />
    <div className="container mx-auto py-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-blue-600 mb-4">Staff Portal</h1>
        <p className="text-gray-600 mb-6">Secure access for authorized hospital staff</p>
        <StaffLogin />
      </div>
    </div>
  </div>
);

// Layout Component
const App = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Portal Routes */}
          <Route path="/patient" element={<PatientPortal />} />
          <Route path="/staff" element={<StaffPortal />} />
          
          {/* Default Route - Patient Portal */}
          <Route path="/" element={<PatientPortal />} />
          
          {/* Patient Auth Routes */}
          <Route path="/patient/login" element={<PatientLogin />} />
          <Route path="/patient/register" element={<PatientRegister />} />
          
          {/* Patient Dashboard Routes */}
          <Route path="/patient/dashboard/*" element={<PatientDashboard />} />
          
          {/* Staff Dashboard Routes */}
          <Route path="/doctor/*" element={<DoctorDashboard />} />
          <Route path="/receptionist/*" element={<ReceptionistDashboard />} />
          <Route path="/pharmacist/*" element={<PharmacistDashboard />} />
          <Route path="/lab/*" element={<LabDashboard />} />
          <Route path="/admin/*" element={<AdminDashboard />} />
          <Route path="/admission/*" element={<AdmissionDashboard />} />
          <Route path="/nurse/*" element={<NurseDashboard />} />
          
          {/* Legacy Routes for backward compatibility */}
          <Route path="/services" element={
            <div className="min-h-screen">
              <HospitalNavbar />
              <HospitalServices />
            </div>
          } />
          <Route path="/doctors" element={
            <div className="min-h-screen">
              <HospitalNavbar />
              <HospitalDoctors />
            </div>
          } />
          <Route path="/about" element={
            <div className="min-h-screen">
              <HospitalNavbar />
              <HospitalAbout />
            </div>
          } />
          <Route path="/contact" element={
            <div className="min-h-screen">
              <HospitalNavbar />
              <HospitalContact />
            </div>
          } />

          {/* Staff Auth Routes */}
          <Route path="/login" element={<StaffLogin />} />

          {/* Staff Dashboard Routes */}
          <Route path="/doctor/*" element={<DoctorDashboard />} />
          <Route path="/receptionist/*" element={<ReceptionistDashboard />} />
          <Route path="/pharmacist/*" element={<PharmacistDashboard />} />
          <Route path="/lab/*" element={<LabDashboard />} />
          <Route path="/admin/*" element={<AdminDashboard />} />
          <Route path="/admission/*" element={<AdmissionDashboard />} />
          <Route path="/nurse/*" element={<NurseDashboard />} />

          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </Router>
  );
}

export default App;
