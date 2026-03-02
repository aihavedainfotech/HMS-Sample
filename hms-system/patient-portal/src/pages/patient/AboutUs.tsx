import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  Award, 
  Users, 
  Building,
  Target,
  Lightbulb,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Clock
} from 'lucide-react';

const AboutUs = () => {
  const stats = [
    { icon: Users, label: 'Patients Treated', value: '50,000+', color: 'text-blue-600' },
    { icon: Heart, label: 'Doctors', value: '200+', color: 'text-green-600' },
    { icon: Building, label: 'Departments', value: '25+', color: 'text-purple-600' },
    { icon: Award, label: 'Years of Excellence', value: '15+', color: 'text-orange-600' },
  ];

  const values = [
    {
      icon: Heart,
      title: 'Patient-Centric Care',
      description: 'We prioritize patient well-being above everything else, providing compassionate and personalized healthcare services.'
    },
    {
      icon: Lightbulb,
      title: 'Innovation',
      description: 'Continuously adopting the latest medical technologies and treatment methodologies to ensure the best outcomes.'
    },
    {
      icon: Users,
      title: 'Expert Team',
      description: 'Our highly qualified medical professionals bring years of experience and expertise to every consultation.'
    },
    {
      icon: Target,
      title: 'Excellence',
      description: 'Committed to maintaining the highest standards of medical care and patient safety in all our services.'
    }
  ];

  const leadership = [
    {
      name: 'Dr. Rajiv Kumar',
      position: 'Medical Director',
      specialization: 'Cardiology',
      experience: '20+ years',
      description: 'Leading cardiologist with extensive experience in interventional procedures and hospital administration.'
    },
    {
      name: 'Dr. Sarah Williams',
      position: 'Head of Operations',
      specialization: 'Healthcare Management',
      experience: '15+ years',
      description: 'Expert in healthcare operations management, ensuring smooth and efficient hospital functioning.'
    },
    {
      name: 'Dr. Michael Chen',
      position: 'Head of Research',
      specialization: 'Medical Research',
      experience: '18+ years',
      description: 'Pioneering medical researcher with numerous publications and breakthrough discoveries in medicine.'
    },
    {
      name: 'Dr. Emily Rodriguez',
      position: 'Head of Patient Care',
      specialization: 'Nursing',
      experience: '12+ years',
      description: 'Dedicated to enhancing patient experience and quality of care through innovative nursing practices.'
    }
  ];

  const milestones = [
    { year: '2008', event: 'Hospital establishment with 50 beds and 4 departments' },
    { year: '2012', event: 'Expanded to 200 beds and added 10 new specialties' },
    { year: '2016', event: 'Introduced advanced cardiac care unit and neurology center' },
    { year: '2020', event: 'Launched telemedicine services and digital health platform' },
    { year: '2023', event: 'Achieved NABH accreditation and expanded to 500 beds' },
  ];

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">About MediCare+ Hospital</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          A leading multispecialty hospital committed to providing exceptional healthcare services 
          with compassion, innovation, and excellence for over 15 years.
        </p>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="text-center">
              <CardContent className="pt-6">
                <Icon className={`h-8 w-8 mx-auto mb-3 ${stat.color}`} />
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Mission & Vision */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="mr-2 h-5 w-5 text-blue-600" />
              Our Mission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 leading-relaxed">
              To provide accessible, affordable, and high-quality healthcare services to all sections of society 
              through continuous innovation, medical excellence, and compassionate care. We strive to be the 
              preferred healthcare destination by putting patients first and maintaining the highest standards 
              of medical ethics and professionalism.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lightbulb className="mr-2 h-5 w-5 text-purple-600" />
              Our Vision
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 leading-relaxed">
              To be a globally recognized healthcare institution known for medical excellence, 
              innovative treatments, and patient-centric care. We aim to transform healthcare delivery 
              through cutting-edge technology, research, and a team of dedicated healthcare professionals 
              committed to improving lives.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Core Values */}
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">Our Core Values</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((value, index) => {
            const Icon = value.icon;
            return (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="mx-auto bg-blue-100 rounded-full p-3 mb-3 w-fit">
                    <Icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg">{value.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">{value.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Leadership Team */}
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">Leadership Team</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {leadership.map((leader, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <div className="mx-auto bg-gray-200 rounded-full w-20 h-20 mb-4 flex items-center justify-center">
                  <Users className="h-10 w-10 text-gray-500" />
                </div>
                <CardTitle className="text-lg">{leader.name}</CardTitle>
                <p className="text-blue-600 font-medium">{leader.position}</p>
                <Badge variant="secondary">{leader.specialization}</Badge>
                <p className="text-sm text-gray-500">{leader.experience}</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 text-center">{leader.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Milestones */}
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">Our Journey</h2>
        <div className="max-w-4xl mx-auto">
          <div className="space-y-6">
            {milestones.map((milestone, index) => (
              <div key={index} className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold">
                    {milestone.year.slice(-2)}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <Calendar className="h-4 w-4 text-gray-500 mr-2" />
                      <span className="font-semibold text-gray-900">{milestone.year}</span>
                    </div>
                    <p className="text-gray-600">{milestone.event}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Get in Touch</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="mx-auto bg-blue-100 rounded-full p-3 w-fit mb-3">
                <MapPin className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">Visit Us</h3>
              <p className="text-sm text-gray-600">
                123 Medical Complex<br />
                Healthcare Avenue<br />
                Bangalore, Karnataka - 560001
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto bg-green-100 rounded-full p-3 w-fit mb-3">
                <Phone className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">Call Us</h3>
              <p className="text-sm text-gray-600">
                Main: +91 80 1234 5678<br />
                Emergency: 108<br />
                Appointment: +91 80 1234 5679
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto bg-purple-100 rounded-full p-3 w-fit mb-3">
                <Mail className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">Email Us</h3>
              <p className="text-sm text-gray-600">
                Info@medicare.com<br />
                Emergency@medicare.com<br />
                Appointments@medicare.com
              </p>
            </div>
          </div>
          <div className="mt-6 text-center">
            <div className="flex items-center justify-center text-sm text-gray-600">
              <Clock className="h-4 w-4 mr-2" />
              <span>24/7 Emergency Services Available</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AboutUs;
