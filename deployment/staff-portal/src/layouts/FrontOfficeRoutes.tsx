import { Routes, Route, Navigate } from 'react-router-dom';
import FrontOfficeLayout from './FrontOfficeLayout';
import FrontOfficeDashboard from '../pages/dashboard/FrontOfficeDashboard';
import FrontOfficePatientRegistration from '../pages/dashboard/FrontOfficePatientRegistration';
import FrontOfficeFeeCollection from '../pages/dashboard/FrontOfficeFeeCollection';
import BookAppointment from '../pages/dashboard/BookAppointment';

export default function FrontOfficeRoutes() {
  return (
    <FrontOfficeLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/front-office/dashboard" replace />} />
        <Route path="/dashboard" element={<FrontOfficeDashboard />} />
        <Route path="/patient-registration" element={<FrontOfficePatientRegistration />} />
        <Route path="/appointment-booking" element={<BookAppointment />} />
        <Route path="/fee-collection" element={<FrontOfficeFeeCollection />} />
        <Route path="*" element={<Navigate to="/front-office/dashboard" replace />} />
      </Routes>
    </FrontOfficeLayout>
  );
}
