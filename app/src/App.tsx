import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { PatientAuthProvider } from '@/contexts/PatientAuthContext';

// Navigation
import HospitalNavbar from '@/components/HospitalNavbar';

// Hospital Website Pages
import Home from '@/pages/Home';
import HospitalServices from '@/pages/HospitalServices';
import HospitalDoctors from '@/pages/HospitalDoctors';
import HospitalAbout from '@/pages/HospitalAbout';
import HospitalContact from '@/pages/HospitalContact';

// Patient Registration & Booking
import Register from '@/pages/Register';
import BookAppointment from '@/pages/BookAppointment';

// Patient Auth Pages
import PatientLogin from '@/pages/auth/PatientLogin';
import PatientRegister from '@/pages/auth/PatientRegister';

// Patient Dashboard
import PatientDashboard from '@/layouts/PatientDashboard';
import PatientHome from '@/pages/patient/PatientHome';
import PatientAppointments from '@/pages/patient/PatientAppointments';
import MedicalRecords from '@/pages/patient/MedicalRecords';
import AppointmentSuccess from '@/pages/patient/AppointmentSuccess';

// Staff Auth - MOVED TO SEPARATE PORTAL
// import StaffLogin from '@/pages/auth/StaffLogin';

// Staff Dashboards - MOVED TO SEPARATE PORTAL
// import DoctorDashboard from '@/layouts/DoctorDashboard';
// import ReceptionistDashboard from '@/layouts/ReceptionistDashboard';
// import PharmacistDashboard from '@/layouts/PharmacistDashboard';
// import LabDashboard from '@/layouts/LabDashboard';
// import AdminDashboard from '@/layouts/AdminDashboard';
// import AdmissionDashboard from '@/layouts/AdmissionDashboard';
// import NurseDashboard from '@/layouts/NurseDashboard';

// Layout Component
const HospitalLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen">
    <HospitalNavbar />
    {children}
  </div>
);

function App() {
  return (
    <AuthProvider>
      <PatientAuthProvider>
        <Router>
          <Routes>
            {/* Hospital Website Routes */}
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
            <Route path="/register" element={
              <HospitalLayout>
                <Register />
              </HospitalLayout>
            } />
            <Route path="/book-appointment" element={
              <HospitalLayout>
                <BookAppointment />
              </HospitalLayout>
            } />

            {/* Patient Auth Routes */}
            <Route path="/patient/login" element={<PatientLogin />} />
            <Route path="/patient/register" element={<PatientRegister />} />


            {/* Staff Auth Routes - MOVED TO SEPARATE POARTAL */}
            {/* <Route path="/login" element={<StaffLogin />} /> */}
            {/* <Route path="/staff/login" element={<StaffLogin />} /> */}

            {/* Staff Dashboard Routes - MOVED TO SEPARATE PORTAL */}
            {/* <Route path="/doctor/*" element={<DoctorDashboard />} /> */}
            {/* <Route path="/receptionist/*" element={<ReceptionistDashboard />} /> */}
            {/* <Route path="/pharmacist/*" element={<PharmacistDashboard />} /> */}
            {/* <Route path="/lab/*" element={<LabDashboard />} /> */}
            {/* <Route path="/admin/*" element={<AdminDashboard />} /> */}
            {/* <Route path="/admission/*" element={<AdmissionDashboard />} /> */}
            {/* <Route path="/nurse/*" element={<NurseDashboard />} /> */}

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

            {/* Default redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
        <Toaster position="top-right" richColors />
      </PatientAuthProvider>
    </AuthProvider>
  );
}

export default App;
