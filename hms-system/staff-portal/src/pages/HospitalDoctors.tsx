import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Star,
  MapPin,
  User,
  Calendar,
  Stethoscope,
  Award,
  Phone,
  Mail
} from 'lucide-react';

interface Doctor {
  staff_id: string;
  first_name: string;
  last_name: string;
  specialization: string;
  consultation_fee: number;
  follow_up_fee: number;
  rating: number;
  bio: string;
  department: string;
}

const HospitalDoctors = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [specializationFilter, setSpecializationFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    filterDoctors();
  }, [doctors, searchTerm, specializationFilter, departmentFilter]);

  const fetchDoctors = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/public/doctors`);
      if (response.ok) {
        const data = await response.json();
        setDoctors(data.doctors || []);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterDoctors = () => {
    let filtered = doctors;

    if (searchTerm) {
      filtered = filtered.filter(doctor =>
        doctor.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (specializationFilter !== 'all') {
      filtered = filtered.filter(doctor => doctor.specialization === specializationFilter);
    }

    if (departmentFilter !== 'all') {
      filtered = filtered.filter(doctor => doctor.department === departmentFilter);
    }

    setFilteredDoctors(filtered);
  };

  const getSpecializations = () => {
    const specs = [...new Set(doctors.map(d => d.specialization))];
    return specs;
  };

  const getDepartments = () => {
    const depts = [...new Set(doctors.map(d => d.department))];
    return depts;
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < Math.floor(rating) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
          }`}
      />
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading doctors...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Our Expert Doctors</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Meet our team of highly qualified and experienced medical professionals dedicated to your health
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name or specialization..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div>
              <Select value={specializationFilter} onValueChange={setSpecializationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Specialization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Specializations</SelectItem>
                  {getSpecializations().map((spec) => (
                    <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {getDepartments().map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => window.location.href = '/book-appointment'}>
              Book Appointment
            </Button>
          </div>
        </div>

        {/* Doctors Grid */}
        {filteredDoctors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {filteredDoctors.map((doctor) => (
              <Card key={doctor.staff_id} className="group hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4 mb-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="h-8 w-8 text-gray-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {doctor.first_name.startsWith('Dr.') ? '' : 'Dr. '}{doctor.first_name} {doctor.last_name}
                      </h3>
                      <p className="text-blue-600 font-medium">{doctor.specialization}</p>
                      <Badge variant="secondary" className="mt-1">
                        {doctor.department}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-1">
                      {renderStars(doctor.rating)}
                      <span className="text-sm text-gray-600 ml-2">({doctor.rating})</span>
                    </div>

                    {doctor.bio && (
                      <p className="text-sm text-gray-600 line-clamp-3">{doctor.bio}</p>
                    )}

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center text-gray-600">
                        <MapPin className="h-4 w-4 mr-2" />
                        {doctor.department}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Award className="h-4 w-4 mr-2" />
                        {doctor.rating} Rating
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div>
                        <div className="text-lg font-bold text-blue-600">
                          ₹{doctor.consultation_fee}
                        </div>
                        <div className="text-xs text-gray-500">Consultation Fee</div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.location.href = `/book-appointment?doctor=${doctor.staff_id}`}
                        >
                          <Calendar className="h-4 w-4 mr-1" />
                          Book
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="p-2"
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="p-2"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Stethoscope className="h-10 w-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No doctors found</h3>
            <p className="text-gray-600 mb-6">
              Try adjusting your search or filters to find the right doctor for you.
            </p>
            <Button onClick={() => {
              setSearchTerm('');
              setSpecializationFilter('all');
              setDepartmentFilter('all');
            }}>
              Clear Filters
            </Button>
          </div>
        )}

        {/* Stats Section */}
        <div className="bg-blue-900 text-white rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-6">Why Choose Our Doctors?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="text-3xl font-bold mb-2">50+</div>
              <div className="text-blue-100">Expert Doctors</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">15+</div>
              <div className="text-blue-100">Specializations</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">25+</div>
              <div className="text-blue-100">Years Experience</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HospitalDoctors;
