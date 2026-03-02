import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  Brain, 
  Bone, 
  Baby, 
  Eye, 
  Stethoscope,
  Microscope,
  Pill,
  Clock,
  Phone,
  MapPin,
  CheckCircle,
  Users
} from 'lucide-react';

interface Service {
  id: number;
  name: string;
  description: string;
  icon: string;
  features: string[];
  timings: string;
  emergency: boolean;
}

const Services = () => {
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    // Static services data - in a real app, this would come from API
    setServices([
      {
        id: 1,
        name: 'Cardiology',
        description: 'Comprehensive heart care including diagnostics, treatment, and surgery',
        icon: 'heart',
        features: ['ECG & Echocardiogram', 'Angioplasty', 'Bypass Surgery', 'Pacemaker Implantation'],
        timings: '24/7 Emergency',
        emergency: true
      },
      {
        id: 2,
        name: 'Neurology',
        description: 'Advanced care for brain, spine, and nervous system disorders',
        icon: 'brain',
        features: ['MRI & CT Scan', 'Stroke Treatment', 'Epilepsy Management', 'Neurosurgery'],
        timings: '24/7 Emergency',
        emergency: true
      },
      {
        id: 3,
        name: 'Orthopedics',
        description: 'Complete bone and joint care with advanced surgical procedures',
        icon: 'bone',
        features: ['Joint Replacement', 'Fracture Treatment', 'Arthroscopy', 'Sports Medicine'],
        timings: '8 AM - 8 PM',
        emergency: false
      },
      {
        id: 4,
        name: 'Pediatrics',
        description: 'Specialized healthcare for infants, children, and adolescents',
        icon: 'baby',
        features: ['Vaccination', 'Growth Monitoring', 'Pediatric Surgery', 'Neonatal Care'],
        timings: '9 AM - 9 PM',
        emergency: true
      },
      {
        id: 5,
        name: 'Ophthalmology',
        description: 'Complete eye care from routine checkups to complex surgeries',
        icon: 'eye',
        features: ['LASIK Surgery', 'Cataract Treatment', 'Glaucoma Management', 'Retina Services'],
        timings: '9 AM - 6 PM',
        emergency: false
      },
      {
        id: 6,
        name: 'General Medicine',
        description: 'Primary healthcare services for all common medical conditions',
        icon: 'stethoscope',
        features: ['General Consultation', 'Health Checkups', 'Chronic Disease Management', 'Preventive Care'],
        timings: '8 AM - 10 PM',
        emergency: false
      },
      {
        id: 7,
        name: 'Pathology',
        description: 'Advanced laboratory services for accurate diagnosis',
        icon: 'microscope',
        features: ['Blood Tests', 'Biopsy', 'Microbiology', 'Molecular Diagnostics'],
        timings: '7 AM - 10 PM',
        emergency: false
      },
      {
        id: 8,
        name: 'Pharmacy',
        description: '24/7 pharmacy service with all essential medicines',
        icon: 'pill',
        features: ['Prescription Drugs', 'OTC Medicines', 'Medical Equipment', 'Home Delivery'],
        timings: '24/7',
        emergency: true
      }
    ]);
  }, []);

  const getIcon = (iconName: string) => {
    const iconMap: { [key: string]: React.ComponentType<any> } = {
      heart: Heart,
      brain: Brain,
      bone: Bone,
      baby: Baby,
      eye: Eye,
      stethoscope: Stethoscope,
      microscope: Microscope,
      pill: Pill,
    };
    const Icon = iconMap[iconName] || Heart;
    return <Icon className="h-8 w-8" />;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Our Services</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          We offer comprehensive healthcare services with state-of-the-art facilities 
          and experienced medical professionals dedicated to your well-being.
        </p>
      </div>

      {/* Emergency Services Banner */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-red-100 rounded-full p-3 mr-4">
              <Phone className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-900">24/7 Emergency Services</h3>
              <p className="text-red-700">For medical emergencies, call us immediately</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-red-900">108</p>
            <p className="text-sm text-red-700">Emergency Helpline</p>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service) => (
          <Card key={service.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-blue-100 rounded-lg p-2 mr-3 text-blue-600">
                    {getIcon(service.icon)}
                  </div>
                  <div>
                    <CardTitle className="text-xl">{service.name}</CardTitle>
                    <div className="flex items-center mt-1">
                      <Clock className="h-4 w-4 text-gray-500 mr-1" />
                      <span className="text-sm text-gray-600">{service.timings}</span>
                      {service.emergency && (
                        <Badge className="ml-2 bg-red-100 text-red-800">Emergency</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <CardDescription className="text-base">
                {service.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Key Features:</h4>
                  <ul className="space-y-1">
                    {service.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm text-gray-600">
                        <CheckCircle className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button className="w-full" variant="outline">
                  Learn More
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Additional Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="mr-2 h-5 w-5" />
              Hospital Locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Main Campus</h4>
                <p className="text-sm text-gray-600">123 Medical Complex, Healthcare Avenue</p>
                <p className="text-sm text-gray-600">Bangalore, Karnataka - 560001</p>
              </div>
              <div>
                <h4 className="font-medium">Branch Office</h4>
                <p className="text-sm text-gray-600">456 Wellness Street, Medical District</p>
                <p className="text-sm text-gray-600">Bangalore, Karnataka - 560034</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Why Choose Us
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">Expert Doctors</h4>
                  <p className="text-sm text-gray-600">Highly qualified and experienced medical professionals</p>
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">Advanced Technology</h4>
                  <p className="text-sm text-gray-600">State-of-the-art medical equipment and facilities</p>
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">Patient-Centric Care</h4>
                  <p className="text-sm text-gray-600">Personalized treatment plans with compassion</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Services;
