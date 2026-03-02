import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { AuthProvider } from './contexts/AuthContext';
import { PatientAuthProvider } from './contexts/PatientAuthContext';
// Navigation
import HospitalNavbar from './components/HospitalNavbar';

// Hospital Website Pages
import Home from './pages/Home';
import HospitalServices from './pages/HospitalServices';
import HospitalDoctors from './pages/HospitalDoctors';
import HospitalAbout from './pages/HospitalAbout';
import HospitalContact from './pages/HospitalContact';

// Patient Registration & Booking
import BookAppointment from './pages/BookAppointment';

// Patient Auth Pages
import PatientLogin from './pages/auth/PatientLogin';
import PatientRegister from './pages/auth/PatientRegister';

// Patient Dashboard
import PatientDashboard from './layouts/PatientDashboard';
import PatientHome from './pages/patient/PatientHome';
import PatientAppointments from './pages/patient/PatientAppointments';
import MedicalRecords from './pages/patient/MedicalRecordsSimple';
import AppointmentSuccess from './pages/patient/AppointmentSuccess';

// Staff Auth
import StaffLogin from './pages/auth/StaffLogin';

// Staff Dashboards
import DoctorDashboard from './layouts/DoctorDashboard';
import ReceptionistDashboard from './layouts/ReceptionistDashboard';
import PharmacistDashboard from './layouts/PharmacistDashboard';
import LabDashboard from './layouts/LabDashboard';
import AdminDashboard from './layouts/AdminDashboard';
import AdmissionDashboard from './layouts/AdmissionDashboard';
import NurseDashboard from './layouts/NurseDashboard';
import BillingDashboard from './layouts/BillingDashboard';

// Layout Component
const HospitalLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen">
    <HospitalNavbar />
    {children}
  </div>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <PatientAuthProvider>
        <Routes>
            {/* Hospital Website Routes - DEFAULT PATIENT PORTAL */}
            <Route path="/" element={
              <HospitalLayout>
                <Home />
              </HospitalLayout>
            } />
            <Route path="/services" element={
              <HospitalLayout>
                <HospitalServices />
              </HospitalLayout>
            } />
            <Route path="/doctors" element={
              <HospitalLayout>
                <HospitalDoctors />
              </HospitalLayout>
            } />
            <Route path="/about" element={
              <HospitalLayout>
                <HospitalAbout />
              </HospitalLayout>
            } />
            <Route path="/contact" element={
              <HospitalLayout>
                <HospitalContact />
              </HospitalLayout>
            } />

            {/* Patient Registration & Booking Routes */}
            <Route path="/register" element={<Navigate to="/patient/register" replace />} />
            <Route path="/book-appointment" element={
              <HospitalLayout>
                <BookAppointment />
              </HospitalLayout>
            } />

            {/* Patient Auth Routes */}
            <Route path="/patient/login" element={<PatientLogin />} />
            <Route path="/patient/register" element={<PatientRegister />} />

            {/* Patient Dashboard Routes */}
            <Route
              path="/patient/*"
              element={
                <PatientDashboard />
              }
            >
              <Route index element={<PatientHome />} />
              <Route path="dashboard" element={<PatientHome />} />
              <Route path="appointments" element={<PatientAppointments />} />
              <Route path="book-appointment" element={<BookAppointment />} />
              <Route path="appointment-success" element={<AppointmentSuccess />} />
              <Route path="medical-records" element={<MedicalRecords />} />
            </Route>

            {/* STAFF PORTAL ROUTES */}
            <Route path="/staff" element={<Navigate to="/staff/login" replace />} />
            <Route path="/staff/login" element={<StaffLogin />} />

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
          <Route path="/billing/*" element={<BillingDashboard />} />

            {/* Default redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-right" richColors />
        </PatientAuthProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
