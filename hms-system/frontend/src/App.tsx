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
    <Home />
  </div>
);

const StaffPortal = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
    <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-xl">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Staff Login</h1>
        <p className="text-gray-600 mt-2">Hospital Management System</p>
        <p className="text-sm text-gray-500 mt-1">Authorized personnel only</p>
      </div>
      <StaffLogin />
      <div className="mt-6 text-center">
        <Link to="/" className="text-sm text-blue-600 hover:text-blue-800">
          ← Back to Hospital Website
        </Link>
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
