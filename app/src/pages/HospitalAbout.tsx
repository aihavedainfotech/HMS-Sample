import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Heart,
  Award,
  Users,
  Building,
  Target,
  Lightbulb,
  Clock,
  MapPin,
  Phone,
  Mail,
  CheckCircle2
} from 'lucide-react';

const HospitalAbout = () => {


  const leadership = [
    {
      name: 'Dr. Rajiv Kumar',
      role: 'Medical Director',
      specialization: 'Cardiology',
      experience: '30+ years',
      description: 'Leading cardiologist with expertise in interventional procedures and cardiac care.'
    },
    {
      name: 'Dr. Sunita Reddy',
      role: 'Director of Operations',
      specialization: 'Hospital Administration',
      experience: '25+ years',
      description: 'Expert in healthcare management with focus on quality and patient safety.'
    },
    {
      name: 'Dr. Michael Chen',
      role: 'Head of Neurology',
      specialization: 'Neurology',
      experience: '20+ years',
      description: 'Renowned neurologist specializing in stroke and neurodegenerative disorders.'
    },
    {
      name: 'Dr. Emily Watson',
      role: 'Director of Nursing',
      specialization: 'Nursing Administration',
      experience: '22+ years',
      description: 'Dedicated to nursing excellence and patient-centered care.'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">About CityCare Hospital</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Providing exceptional healthcare services for over 25 years with compassion,
            innovation, and commitment to patient well-being.
          </p>
        </div>

        {/* Mission & Vision */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <Card className="h-full">
            <CardContent className="p-8">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Target className="h-8 w-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Our Mission</h2>
              </div>
              <p className="text-gray-600 leading-relaxed">
                To provide world-class healthcare services that are accessible, affordable, and delivered
                with compassion. We strive to improve the health and well-being of our community through
                excellence in medical care, innovation in treatment, and dedication to patient satisfaction.
              </p>
            </CardContent>
          </Card>

          <Card className="h-full">
            <CardContent className="p-8">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Lightbulb className="h-8 w-8 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Our Vision</h2>
              </div>
              <p className="text-gray-600 leading-relaxed">
                To be the leading healthcare institution known for clinical excellence, innovative research,
                and compassionate care. We envision a future where every person has access to quality
                healthcare services that promote health, healing, and hope.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Core Values */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">Our Core Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Heart,
                title: 'Compassion',
                description: 'We treat every patient with empathy, dignity, and respect.'
              },
              {
                icon: Award,
                title: 'Excellence',
                description: 'We maintain the highest standards in medical care and service.'
              },
              {
                icon: Users,
                title: 'Integrity',
                description: 'We operate with transparency, honesty, and ethical practices.'
              },
              {
                icon: Building,
                title: 'Innovation',
                description: 'We embrace new technologies and treatments to improve outcomes.'
              }
            ].map((value, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 ${index === 0 ? 'bg-red-100' :
                    index === 1 ? 'bg-blue-100' :
                      index === 2 ? 'bg-green-100' : 'bg-purple-100'
                    }`}>
                    <value.icon className={`h-8 w-8 ${index === 0 ? 'text-red-600' :
                      index === 1 ? 'text-blue-600' :
                        index === 2 ? 'text-green-600' : 'text-purple-600'
                      }`} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{value.title}</h3>
                  <p className="text-gray-600 text-sm">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Leadership Team */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">Leadership Team</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {leadership.map((leader, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4 mb-4">
                    <img
                      src={`https://placehold.co/100x100/e2e8f0/1e293b?text=${leader.name.split(' ')[1]}`}
                      alt={leader.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{leader.name}</h3>
                      <Badge variant="secondary" className="mb-2">{leader.role}</Badge>
                      <p className="text-blue-600 font-medium mb-2">{leader.specialization}</p>
                      <p className="text-gray-600 text-sm mb-2">{leader.experience} experience</p>
                      <p className="text-gray-600 text-sm">{leader.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-blue-900 text-white rounded-2xl p-8 mb-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">500+</div>
              <div className="text-blue-100">Expert Doctors</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">50+</div>
              <div className="text-blue-100">Specialties</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">1M+</div>
              <div className="text-blue-100">Happy Patients</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">25+</div>
              <div className="text-blue-100">Years of Service</div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Get in Touch</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="font-medium">Emergency</div>
                    <div className="text-gray-600">108</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="font-medium">Hospital</div>
                    <div className="text-gray-600">+91 22 1234 5678</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="font-medium">Email</div>
                    <div className="text-gray-600">info@citycarehospital.com</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="font-medium">Address</div>
                    <div className="text-gray-600">123 Healthcare Avenue, Mumbai, Maharashtra 400001</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="font-medium">Working Hours</div>
                    <div className="text-gray-600">24/7 Emergency, 8AM-8PM OPD</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Quality Certifications</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-medium">NABH Accredited</div>
                    <div className="text-gray-600">National Accreditation Board for Hospitals</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-medium">ISO 9001:2015</div>
                    <div className="text-gray-600">Quality Management System</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-medium">NABL Certified</div>
                    <div className="text-gray-600">National Accreditation Board for Labs</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HospitalAbout;
