import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import {
  Stethoscope,
  Star,
  GraduationCap,
  Award,
  Clock,
  Calendar as CalendarIcon,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  User,
} from 'lucide-react';
import type { Doctor, TimeSlot } from '@/types';

const API_URL = 'http://localhost:5002/api';

export default function DoctorDetail() {
  const { id } = useParams<{ id: string }>();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    if (id) {
      fetchDoctorDetails();
    }
  }, [id]);

  useEffect(() => {
    if (selectedDate && id) {
      fetchTimeSlots();
    }
  }, [selectedDate, id]);

  const fetchDoctorDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/doctors/${id}`);
      const data = await response.json();
      if (data.staff_id) {
        setDoctor(data);
      }
    } catch (error) {
      console.error('Error fetching doctor:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeSlots = async () => {
    if (!selectedDate) return;
    
    try {
      setLoadingSlots(true);
      const dateStr = selectedDate.toISOString().split('T')[0];
      const response = await fetch(`${API_URL}/doctors/${id}/availability?date=${dateStr}`);
      const data = await response.json();
      setTimeSlots(data.available_slots || []);
    } catch (error) {
      console.error('Error fetching time slots:', error);
    } finally {
      setLoadingSlots(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="container mx-auto px-4 text-center">
          <Stethoscope className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Doctor Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The doctor you're looking for doesn't exist.
          </p>
          <Button asChild>
            <Link to="/doctors">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Doctors
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        {/* Back Button */}
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/doctors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Doctors
          </Link>
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Doctor Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Doctor Image */}
                  <div className="w-full md:w-48 h-48 bg-gray-100 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                    {doctor.profile_image_path ? (
                      <img
                        src={doctor.profile_image_path}
                        alt={`Dr. ${doctor.first_name} ${doctor.last_name}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-20 w-20 text-gray-300" />
                    )}
                  </div>

                  {/* Doctor Details */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h1 className="text-2xl font-bold">
                          Dr. {doctor.first_name} {doctor.last_name}
                        </h1>
                        <p className="text-primary font-medium text-lg">
                          {doctor.specialization}
                        </p>
                        <p className="text-muted-foreground">
                          {doctor.dept_name}
                        </p>
                      </div>
                      <Badge className="bg-green-100 text-green-700">
                        <Star className="h-3 w-3 fill-current mr-1" />
                        {doctor.rating} ({doctor.total_reviews} reviews)
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Experience</p>
                          <p className="font-medium">{doctor.years_of_experience} years</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Reg. No.</p>
                          <p className="font-medium">{doctor.registration_number}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Fee</p>
                          <p className="font-medium">₹{doctor.consultation_fee}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="about" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="education">Education</TabsTrigger>
                <TabsTrigger value="schedule">Schedule</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              </TabsList>

              <TabsContent value="about" className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">About Doctor</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {doctor.bio || 'No biography available.'}
                    </p>

                    <Separator className="my-6" />

                    <h3 className="text-lg font-semibold mb-4">Specializations</h3>
                    <div className="flex flex-wrap gap-2">
                      {[doctor.specialization, doctor.dept_name].map((spec, idx) => (
                        <Badge key={idx} variant="secondary">
                          {spec}
                        </Badge>
                      ))}
                    </div>

                    <Separator className="my-6" />

                    <h3 className="text-lg font-semibold mb-4">Consultation Details</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span>In-person Consultation</span>
                      </div>
                      {doctor.is_available_for_teleconsultation && (
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                          <span>Teleconsultation Available</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span>Follow-up: ₹{doctor.follow_up_fee}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span>Max {doctor.max_patients_per_day} patients/day</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="education" className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Education & Qualifications</h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium">Qualifications</h4>
                        <p className="text-muted-foreground">{doctor.qualifications}</p>
                      </div>
                      <Separator />
                      <div>
                        <h4 className="font-medium">Education</h4>
                        <p className="text-muted-foreground">{doctor.education}</p>
                      </div>
                      {doctor.certifications && (
                        <>
                          <Separator />
                          <div>
                            <h4 className="font-medium">Certifications</h4>
                            <p className="text-muted-foreground">{doctor.certifications}</p>
                          </div>
                        </>
                      )}
                      {doctor.awards && (
                        <>
                          <Separator />
                          <div>
                            <h4 className="font-medium">Awards & Recognition</h4>
                            <p className="text-muted-foreground">{doctor.awards}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="schedule" className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Weekly Schedule</h3>
                    {doctor.availability_schedule && Object.entries(doctor.availability_schedule).length > 0 ? (
                      <div className="grid md:grid-cols-2 gap-4">
                        {Object.entries(doctor.availability_schedule).map(([day, slots]) => (
                          <div key={day} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                            <CalendarIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium capitalize">{day}</p>
                              <p className="text-sm text-muted-foreground">
                                {Array.isArray(slots) && slots.length > 0 
                                  ? slots.join(', ') 
                                  : 'Not available'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Schedule not available.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reviews" className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center py-8">
                      <Star className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold">Patient Reviews</h3>
                      <p className="text-3xl font-bold mt-2">{doctor.rating}/5</p>
                      <p className="text-muted-foreground">
                        Based on {doctor.total_reviews} reviews
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Booking */}
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Book Appointment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Date Selection */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Date</label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date() || date.getDay() === 0}
                    className="rounded-md border"
                  />
                </div>

                {/* Time Slots */}
                {selectedDate && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Available Slots</label>
                    {loadingSlots ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : timeSlots.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {timeSlots.map((slot, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            size="sm"
                            className="justify-start"
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            {slot.time.substring(0, 5)}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No slots available for this date
                      </p>
                    )}
                  </div>
                )}

                <Separator />

                {/* Fee Summary */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Consultation Fee</span>
                    <span>₹{doctor.consultation_fee}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>₹{doctor.consultation_fee}</span>
                  </div>
                </div>

                <Button className="w-full" size="lg" asChild>
                  <Link to="/register">
                    Book Appointment
                  </Link>
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  You need to login/register to book an appointment
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
