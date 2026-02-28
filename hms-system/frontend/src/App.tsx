import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
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
// import PatientLogin from '@/pages/auth/PatientLogin';
// import PatientRegister from '@/pages/auth/PatientRegister';

// Patient Dashboard
// import PatientDashboard from '@/layouts/PatientDashboard';
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

const StaffPortal = () => <StaffLogin />;

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
