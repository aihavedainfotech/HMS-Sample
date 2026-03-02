import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface AuthUser {
  staff_id: string;
  name: string;
  role: 'Doctor' | 'Receptionist' | 'Pharmacist' | 'Lab_Technician' | 'Nurse' | 'Admin' | 'Admission' | 'Billing';
  department?: string;
  sub_department?: string;
  email?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (staffId: string, password: string, department?: string) => Promise<boolean>;
  logout: () => void;
  isLoggingOut: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getApiUrl = (path: string) => {
  if (API_URL.startsWith('http')) {
    return `${API_URL}${path}`;
  }
  return `${API_URL}${path}`;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('hms_staff_token');
    const storedUser = localStorage.getItem('hms_staff_user');

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('hms_staff_token');
        localStorage.removeItem('hms_staff_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (staffId: string, password: string, department?: string): Promise<boolean> => {
    try {
      const url = getApiUrl('/auth/staff/login');
      console.log('[AUTH] Attempting login to:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: staffId, password, department }),
      });

      console.log('[AUTH] Response status:', response.status);
      const data = await response.json();
      console.log('[AUTH] Response data:', data);

      if (!response.ok) {
        toast.error(data.error || 'Login failed');
        console.log('[AUTH] Login failed:', data.error);
        return false;
      }

      const userData: AuthUser = {
        staff_id: data.staff_id,
        name: data.name,
        role: data.role,
        department: data.department,
        sub_department: data.sub_department,
        email: data.email,
      };

      localStorage.setItem('hms_staff_token', data.access_token);
      localStorage.setItem('hms_staff_user', JSON.stringify(userData));
      setUser(userData);
      setIsLoggingOut(false);
      console.log('[AUTH] Login successful for:', staffId);
      toast.success('Login successful!');
      return true;
    } catch (error) {
      console.error('[AUTH] Login error:', error);
      toast.error('Network error. Please try again.');
      return false;
    }
  };

  const logout = () => {
    setIsLoggingOut(true);
    localStorage.removeItem('hms_staff_token');
    localStorage.removeItem('hms_staff_user');
    setUser(null);
    toast.info('You have been logged out');
    navigate('/');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        isLoggingOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
