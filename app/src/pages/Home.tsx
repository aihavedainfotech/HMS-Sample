import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import {
  Heart,
  Brain,
  Bone,
  Baby,
  User,
  Ambulance,
  Users,
  Clock,
  Award,
  ThumbsUp,
  Calendar,
  Phone,
  ArrowRight,
  Star,
  Quote,
  MapPin,
  CheckCircle2,
} from 'lucide-react';

const stats = [
  { value: '25+', label: 'Years of Excellence', icon: Clock },
  { value: '50+', label: 'Expert Doctors', icon: Users },
  { value: '100K+', label: 'Patients Treated', icon: Heart },
  { value: '99%', label: 'Patient Satisfaction', icon: ThumbsUp },
];

const services = [
  {
    name: 'Cardiology',
    description: 'Comprehensive heart care with advanced diagnostics and interventions',
    icon: Heart,
    color: 'bg-red-100 text-red-600',
  },
  {
    name: 'Neurology',
    description: 'Expert brain, spine and nervous system care',
    icon: Brain,
    color: 'bg-purple-100 text-purple-600',
  },
  {
    name: 'Orthopedics',
    description: 'Bone, joint and muscle care including joint replacement',
    icon: Bone,
    color: 'bg-blue-100 text-blue-600',
  },
  {
    name: 'Pediatrics',
    description: 'Complete healthcare for children from newborn to adolescence',
    icon: Baby,
    color: 'bg-green-100 text-green-600',
  },
  {
    name: 'Gynecology',
    description: 'Women healthcare including maternity services',
    icon: User,
    color: 'bg-pink-100 text-pink-600',
  },
  {
    name: 'Emergency',
    description: '24/7 emergency care with rapid response team',
    icon: Ambulance,
    color: 'bg-orange-100 text-orange-600',
  },
];

const testimonials = [
  {
    name: 'Ramesh Kumar',
    role: 'Patient',
    image: 'https://placehold.co/100x100/e2e8f0/1e293b?text=Ramesh',
    content: 'The care I received at CityCare Hospital was exceptional. The doctors were knowledgeable and the staff was very supportive throughout my treatment.',
    rating: 5,
  },
  {
    name: 'Priya Sharma',
    role: 'Patient',
    image: 'https://placehold.co/100x100/e2e8f0/1e293b?text=Priya',
    content: 'I had a wonderful experience during my delivery. The maternity team was amazing and made me feel comfortable throughout the process.',
    rating: 5,
  },
  {
    name: 'Amit Patel',
    role: 'Patient',
    image: 'https://placehold.co/100x100/e2e8f0/1e293b?text=Amit',
    content: 'The cardiac team saved my life. Their quick response and expert care during my heart attack was remarkable. Forever grateful!',
    rating: 5,
  },
];

const doctors = [
  {
    name: 'Dr. Rajiv Menon',
    specialization: 'Cardiologist',
    experience: '15 years',
    image: 'https://placehold.co/300x400/e2e8f0/1e293b?text=Dr.+Menon',
  },
  {
    name: 'Dr. Sunita Patel',
    specialization: 'Cardiologist',
    experience: '10 years',
    image: 'https://placehold.co/300x400/e2e8f0/1e293b?text=Dr.+Patel',
  },
  {
    name: 'Dr. Amit Verma',
    specialization: 'Neurologist',
    experience: '12 years',
    image: 'https://placehold.co/300x400/e2e8f0/1e293b?text=Dr.+Verma',
  },
  {
    name: 'Dr. Neha Gupta',
    specialization: 'Neurosurgeon',
    experience: '14 years',
    image: 'https://placehold.co/300x400/e2e8f0/1e293b?text=Dr.+Gupta',
  },
];

export default function Home() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center pt-32 pb-16 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/20" />
        <div className="absolute inset-0 bg-primary/5 opacity-5" />

        {/* Decorative Elements */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <div className={`space-y-6 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <Badge className="px-4 py-1.5 text-sm bg-primary/10 text-primary border-primary/20">
                <Award className="h-4 w-4 mr-2" />
                NABH Accredited Hospital
              </Badge>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                Your Health is Our{' '}
                <span className="text-primary">Top Priority</span>
              </h1>

              <p className="text-lg text-muted-foreground max-w-xl">
                Experience world-class healthcare with cutting-edge technology and
                compassionate medical professionals dedicated to your well-being.
              </p>

              <div className="flex flex-wrap gap-4">
                <Button size="lg" asChild>
                  <Link to="/register">
                    <Calendar className="h-5 w-5 mr-2" />
                    Book Appointment
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/doctors">
                    <Users className="h-5 w-5 mr-2" />
                    Find a Doctor
                  </Link>
                </Button>
              </div>

              {/* Quick Info */}
              <div className="flex flex-wrap gap-6 pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-sm">24/7 Emergency</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-sm">Expert Doctors</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-sm">Advanced Technology</span>
                </div>
              </div>
            </div>

            {/* Hero Image */}
            <div className={`relative transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="https://placehold.co/800x600/2563eb/ffffff?text=Expert+Medical+Team"
                  alt="Healthcare Team"
                  className="w-full h-auto object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </div>

              {/* Floating Card */}
              <div className="absolute -bottom-6 -left-6 bg-white dark:bg-gray-900 rounded-xl shadow-xl p-4 flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <ThumbsUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">99%</p>
                  <p className="text-sm text-muted-foreground">Patient Satisfaction</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <stat.icon className="h-8 w-8 mx-auto mb-3 opacity-80" />
                <p className="text-3xl md:text-4xl font-bold">{stat.value}</p>
                <p className="text-sm opacity-80">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Badge className="mb-4">Our Services</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Comprehensive Healthcare Services
            </h2>
            <p className="text-muted-foreground">
              We offer a wide range of medical services to meet all your healthcare needs
              under one roof.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, index) => (
              <Card key={index} className="group hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className={`w-14 h-14 rounded-xl ${service.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <service.icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{service.name}</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    {service.description}
                  </p>
                  <Link
                    to="/services"
                    className="inline-flex items-center text-primary text-sm font-medium hover:underline"
                  >
                    Learn More
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-10">
            <Button variant="outline" size="lg" asChild>
              <Link to="/services">
                View All Services
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Doctors Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-12">
            <div>
              <Badge className="mb-4">Our Doctors</Badge>
              <h2 className="text-3xl md:text-4xl font-bold">
                Meet Our Expert Doctors
              </h2>
            </div>
            <Button variant="outline" asChild>
              <Link to="/doctors">
                View All Doctors
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {doctors.map((doctor, index) => (
              <Card key={index} className="overflow-hidden group">
                <div className="aspect-[3/4] overflow-hidden">
                  <img
                    src={doctor.image}
                    alt={doctor.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg">{doctor.name}</h3>
                  <p className="text-primary text-sm">{doctor.specialization}</p>
                  <p className="text-muted-foreground text-sm">{doctor.experience} experience</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4">Why Choose Us</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Providing Quality Healthcare for Over 25 Years
              </h2>
              <p className="text-muted-foreground mb-8">
                CityCare Hospital has been at the forefront of medical excellence,
                combining advanced technology with compassionate care to deliver
                the best possible outcomes for our patients.
              </p>

              <div className="space-y-4">
                {[
                  'State-of-the-art medical equipment and facilities',
                  'Team of highly qualified and experienced doctors',
                  '24/7 emergency and trauma care services',
                  'Personalized patient care and attention',
                  'Affordable healthcare with insurance support',
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <Button size="lg" asChild>
                  <Link to="/about">
                    Learn More About Us
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                <img
                  src="https://placehold.co/600x400/e2e8f0/1e293b?text=CityCare+Hospital"
                  alt="Hospital Building"
                  className="rounded-2xl shadow-lg w-full h-64 object-cover"
                />
                <img
                  src="https://placehold.co/600x400/e2e8f0/1e293b?text=Operation+Theater"
                  alt="Operation Theater"
                  className="rounded-2xl shadow-lg w-full h-64 object-cover mt-8"
                />
                <img
                  src="https://placehold.co/600x400/e2e8f0/1e293b?text=Patient+Room"
                  alt="Patient Room"
                  className="rounded-2xl shadow-lg w-full h-64 object-cover -mt-8"
                />
                <img
                  src="https://placehold.co/600x400/e2e8f0/1e293b?text=Medical+Equipment"
                  alt="Medical Equipment"
                  className="rounded-2xl shadow-lg w-full h-64 object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Badge className="mb-4">Testimonials</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              What Our Patients Say
            </h2>
            <p className="text-muted-foreground">
              Real stories from real patients who have experienced our care.
            </p>
          </div>

          <Carousel
            opts={{
              align: 'start',
              loop: true,
            }}
            className="w-full max-w-5xl mx-auto"
          >
            <CarouselContent>
              {testimonials.map((testimonial, index) => (
                <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                  <Card className="h-full">
                    <CardContent className="p-6 flex flex-col h-full">
                      <Quote className="h-8 w-8 text-primary/30 mb-4" />
                      <p className="text-gray-700 dark:text-gray-300 flex-1 mb-6">
                        "{testimonial.content}"
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                          <Users className="h-6 w-6 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-semibold">{testimonial.name}</p>
                          <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 mt-4">
                        {Array.from({ length: testimonial.rating }).map((_, i) => (
                          <Star key={i} className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="bg-primary rounded-3xl p-8 md:p-12 text-primary-foreground relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>

            <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Need Emergency Medical Assistance?
                </h2>
                <p className="text-primary-foreground/80 mb-6">
                  Our emergency department is open 24/7 with a dedicated team ready
                  to provide immediate care when you need it most.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button size="lg" variant="secondary" asChild>
                    <a href="tel:108">
                      <Phone className="h-5 w-5 mr-2" />
                      Call Emergency: 108
                    </a>
                  </Button>
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10" asChild>
                    <Link to="/contact">
                      <MapPin className="h-5 w-5 mr-2" />
                      Get Directions
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="flex justify-center md:justify-end">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                  <Ambulance className="h-24 w-24 mx-auto mb-4" />
                  <p className="text-center text-lg font-semibold">24/7 Emergency Service</p>
                  <p className="text-center text-sm opacity-80">Always ready to help</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Banner */}
      <section className="py-12 bg-gray-900 text-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <Phone className="h-8 w-8 mx-auto mb-3 text-primary" />
              <p className="text-sm text-gray-400">Call Us</p>
              <p className="text-lg font-semibold">+91 22 1234 5678</p>
            </div>
            <div>
              <MapPin className="h-8 w-8 mx-auto mb-3 text-primary" />
              <p className="text-sm text-gray-400">Visit Us</p>
              <p className="text-lg font-semibold">123 Healthcare Avenue, Mumbai</p>
            </div>
            <div>
              <Clock className="h-8 w-8 mx-auto mb-3 text-primary" />
              <p className="text-sm text-gray-400">Working Hours</p>
              <p className="text-lg font-semibold">24/7 Emergency Services</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
