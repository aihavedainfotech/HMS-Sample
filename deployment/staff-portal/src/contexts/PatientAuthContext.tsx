import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface Patient {
  patient_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  mobile_number: string;
  date_of_birth: string;
  gender: string;
}

interface PatientAuthContextType {
  patient: Patient | null;
  token: string | null;
  login: (token: string, patient: Patient) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const PatientAuthContext = createContext<PatientAuthContextType | undefined>(undefined);

export const usePatientAuth = () => {
  const context = useContext(PatientAuthContext);
  if (context === undefined) {
    throw new Error('usePatientAuth must be used within a PatientAuthProvider');
  }
  return context;
};

interface PatientAuthProviderProps {
  children: ReactNode;
}

export const PatientAuthProvider: React.FC<PatientAuthProviderProps> = ({ children }) => {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('patientToken');
    const storedPatient = localStorage.getItem('patientData');
    
    if (storedToken && storedPatient) {
      try {
        setToken(storedToken);
        setPatient(JSON.parse(storedPatient));
      } catch (error) {
        console.error('Error parsing stored patient data:', error);
        localStorage.removeItem('patientToken');
        localStorage.removeItem('patientData');
      }
    }
  }, []);

  const login = (newToken: string, patientData: Patient) => {
    setToken(newToken);
    setPatient(patientData);
    localStorage.setItem('patientToken', newToken);
    localStorage.setItem('patientData', JSON.stringify(patientData));
  };

  const logout = () => {
    setToken(null);
    setPatient(null);
    localStorage.removeItem('patientToken');
    localStorage.removeItem('patientData');
  };

  const value: PatientAuthContextType = {
    patient,
    token,
    login,
    logout,
    isAuthenticated: !!token && !!patient,
  };

  return (
    <PatientAuthContext.Provider value={value}>
      {children}
    </PatientAuthContext.Provider>
  );
};
