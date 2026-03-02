import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Stethoscope,
  Search,
  Filter,
  Star,
  Clock,
  Calendar,
  ArrowRight,
  GraduationCap,
  Award,
  Loader2,
} from 'lucide-react';
import type { Doctor } from '@/types';

const API_URL = 'http://localhost:5002/api';

const departments = [
  { value: '', label: 'All Departments' },
  { value: 'CARD', label: 'Cardiology' },
  { value: 'NEUR', label: 'Neurology' },
  { value: 'ORTH', label: 'Orthopedics' },
  { value: 'PEDS', label: 'Pediatrics' },
  { value: 'GYN', label: 'Gynecology' },
  { value: 'GENM', label: 'General Medicine' },
];

const sortOptions = [
  { value: 'rating', label: 'Highest Rated' },
  { value: 'experience', label: 'Most Experienced' },
  { value: 'fee_low', label: 'Fee: Low to High' },
  { value: 'fee_high', label: 'Fee: High to Low' },
];

export default function Doctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [sortBy, setSortBy] = useState('rating');

  useEffect(() => {
    fetchDoctors();
  }, [selectedDepartment, sortBy]);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedDepartment) params.append('department', selectedDepartment);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`${API_URL}/doctors?${params}`);
      const data = await response.json();

      if (Array.isArray(data)) {
        // Sort doctors based on selected option
        let sorted = [...data];
        switch (sortBy) {
          case 'experience':
            sorted.sort((a, b) => b.years_of_experience - a.years_of_experience);
            break;
          case 'fee_low':
            sorted.sort((a, b) => a.consultation_fee - b.consultation_fee);
            break;
          case 'fee_high':
            sorted.sort((a, b) => b.consultation_fee - a.consultation_fee);
            break;
          default:
            sorted.sort((a, b) => b.rating - a.rating);
        }
        setDoctors(sorted);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDoctors();
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      {/* Hero Section */}
      <section className="relative py-16 bg-gradient-to-br from-primary/5 to-secondary/20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <Badge className="mb-4">Our Doctors</Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Meet Our Expert{' '}
              <span className="text-primary">Medical Team</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Our team of highly qualified and experienced doctors is dedicated to 
              providing you with the best possible care.
            </p>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="py-8 border-b">
        <div className="container mx-auto px-4">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name or specialization..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-full md:w-56">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.value} value={dept.value}>
                    {dept.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" className="md:w-auto">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </form>
        </div>
      </section>

      {/* Doctors Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : doctors.length === 0 ? (
            <div className="text-center py-20">
              <Stethoscope className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No doctors found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search criteria
              </p>
            </div>
          ) : (
            <>
              <p className="text-muted-foreground mb-6">
                Showing {doctors.length} doctors
              </p>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {doctors.map((doctor) => (
                  <Card key={doctor.staff_id} className="overflow-hidden group">
                    {/* Doctor Image */}
                    <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">
                      {doctor.profile_image_path ? (
                        <img
                          src={doctor.profile_image_path}
                          alt={`Dr. ${doctor.first_name} ${doctor.last_name}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Stethoscope className="h-20 w-20 text-gray-300" />
                        </div>
                      )}
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-white/90 text-foreground">
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 mr-1" />
                          {doctor.rating}
                        </Badge>
                      </div>
                    </div>

                    <CardContent className="p-5">
                      <h3 className="font-semibold text-lg">
                        Dr. {doctor.first_name} {doctor.last_name}
                      </h3>
                      <p className="text-primary text-sm font-medium">
                        {doctor.specialization}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {doctor.dept_name}
                      </p>

                      <div className="mt-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <GraduationCap className="h-4 w-4 text-muted-foreground" />
                          <span>{doctor.years_of_experience} years exp.</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Award className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate">{doctor.qualifications?.split(',')[0]}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>₹{doctor.consultation_fee} consultation</span>
                        </div>
                      </div>

                      <div className="mt-5 flex gap-2">
                        <Button className="flex-1" asChild>
                          <Link to={`/doctors/${doctor.staff_id}`}>
                            View Profile
                          </Link>
                        </Button>
                        <Button variant="outline" asChild>
                          <Link to="/register">
                            <Calendar className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">
                    Need to Consult a Doctor?
                  </h3>
                  <p className="opacity-80">
                    Book an appointment with our expert doctors today
                  </p>
                </div>
                <Button size="lg" variant="secondary" asChild>
                  <Link to="/register">
                    <Calendar className="h-5 w-5 mr-2" />
                    Book Appointment
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
