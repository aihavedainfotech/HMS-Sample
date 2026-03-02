import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { toast } from 'sonner';

interface AuthUser {
  staff_id: string;
  name: string;
  role: 'Doctor' | 'Receptionist' | 'Pharmacist' | 'Lab_Technician' | 'Nurse' | 'Admin' | 'Admission' | 'Billing';
  department?: string;
  sub_department?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (staffId: string, password: string, department?: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || '/api';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      const response = await fetch(`${API_URL}/auth/staff/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: staffId, password, department }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Login failed');
        return false;
      }

      const userData: AuthUser = {
        staff_id: data.staff_id,
        name: data.name,
        role: data.role,
        department: data.department,
        sub_department: data.sub_department,
      };

      localStorage.setItem('hms_staff_token', data.access_token);
      localStorage.setItem('hms_staff_user', JSON.stringify(userData));
      setUser(userData);
      toast.success('Login successful!');
      return true;
    } catch (error) {
      toast.error('Network error. Please try again.');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('hms_staff_token');
    localStorage.removeItem('hms_staff_user');
    setUser(null);
    toast.info('You have been logged out');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
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
