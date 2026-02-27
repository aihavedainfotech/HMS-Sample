import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Award,
  Users,
  Building2,
  Heart,
  Target,
  Eye,
  CheckCircle2,
  Stethoscope,
  Clock,
  Shield,
} from 'lucide-react';

const milestones = [
  { year: '1999', title: 'Hospital Founded', description: 'CityCare Hospital was established with a vision to provide quality healthcare.' },
  { year: '2005', title: 'Expansion', description: 'Added Cardiology and Neurology departments with state-of-the-art facilities.' },
  { year: '2010', title: 'NABH Accreditation', description: 'Received NABH accreditation for quality healthcare standards.' },
  { year: '2015', title: 'New Wing', description: 'Inaugurated new 200-bed wing with advanced ICU facilities.' },
  { year: '2020', title: 'Digital Transformation', description: 'Launched patient portal and telemedicine services.' },
  { year: '2024', title: 'Center of Excellence', description: 'Recognized as Center of Excellence for Cardiac Care.' },
];

const values = [
  {
    icon: Heart,
    title: 'Compassion',
    description: 'We treat every patient with empathy, kindness, and respect.',
  },
  {
    icon: Target,
    title: 'Excellence',
    description: 'We strive for the highest standards in medical care and service.',
  },
  {
    icon: Shield,
    title: 'Integrity',
    description: 'We uphold ethical standards and transparency in all our actions.',
  },
  {
    icon: Users,
    title: 'Teamwork',
    description: 'We collaborate to provide comprehensive and coordinated care.',
  },
];

const accreditations = [
  'NABH Accredited',
  'NABL Certified Laboratory',
  'ISO 9001:2015 Certified',
  'Green Hospital Certified',
];

export default function About() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      {/* Hero Section */}
      <section className="relative py-16 bg-gradient-to-br from-primary/5 to-secondary/20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <Badge className="mb-4">About Us</Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Leading Healthcare Provider for Over{' '}
              <span className="text-primary">25 Years</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              CityCare Hospital has been dedicated to providing exceptional healthcare 
              services with compassion, innovation, and excellence since 1999.
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12">
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Eye className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold">Our Vision</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  To be the most trusted healthcare provider, recognized for excellence 
                  in patient care, medical education, and research. We envision a 
                  healthier community where everyone has access to quality healthcare 
                  services.
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-secondary">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                    <Target className="h-6 w-6 text-secondary-foreground" />
                  </div>
                  <h2 className="text-2xl font-bold">Our Mission</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  To provide compassionate, high-quality, affordable healthcare services 
                  to all sections of society. We are committed to continuous improvement, 
                  patient safety, and delivering positive health outcomes through 
                  evidence-based medicine.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Badge className="mb-4">Our Values</Badge>
            <h2 className="text-3xl font-bold mb-4">Principles That Guide Us</h2>
            <p className="text-muted-foreground">
              Our core values define who we are and how we deliver care to our patients.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <Card key={index} className="text-center">
                <CardContent className="p-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <value.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                  <p className="text-muted-foreground text-sm">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Infrastructure */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4">Infrastructure</Badge>
              <h2 className="text-3xl font-bold mb-6">
                World-Class Facilities for Better Care
              </h2>
              <p className="text-muted-foreground mb-8">
                Our hospital is equipped with state-of-the-art infrastructure and 
                advanced medical technology to provide comprehensive healthcare services.
              </p>

              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <Building2 className="h-6 w-6 text-primary shrink-0" />
                  <div>
                    <p className="font-semibold">350+ Beds</p>
                    <p className="text-sm text-muted-foreground">Including ICU & Special Wards</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Stethoscope className="h-6 w-6 text-primary shrink-0" />
                  <div>
                    <p className="font-semibold">50+ Doctors</p>
                    <p className="text-sm text-muted-foreground">Expert Specialists</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-6 w-6 text-primary shrink-0" />
                  <div>
                    <p className="font-semibold">24/7 Emergency</p>
                    <p className="text-sm text-muted-foreground">Round-the-clock Care</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="h-6 w-6 text-primary shrink-0" />
                  <div>
                    <p className="font-semibold">12 OTs</p>
                    <p className="text-sm text-muted-foreground">Advanced Operation Theaters</p>
                  </div>
                </div>
              </div>

              <Separator className="my-8" />

              <div>
                <h3 className="font-semibold mb-4">Key Facilities</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    'Advanced ICU & CCU',
                    'Neonatal ICU (NICU)',
                    'Cardiac Cath Lab',
                    'MRI & CT Scan',
                    'Dialysis Center',
                    'Blood Bank',
                    'Pharmacy',
                    'Ambulance Services',
                  ].map((facility, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{facility}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <img
                src="/images/hospital-building.jpg"
                alt="Hospital Building"
                className="rounded-2xl shadow-lg w-full h-64 object-cover"
              />
              <img
                src="/images/reception.jpg"
                alt="Hospital Reception"
                className="rounded-2xl shadow-lg w-full h-64 object-cover mt-8"
              />
              <img
                src="/images/icu.jpg"
                alt="ICU Facility"
                className="rounded-2xl shadow-lg w-full h-64 object-cover -mt-8"
              />
              <img
                src="/images/operation-theater.jpg"
                alt="Operation Theater"
                className="rounded-2xl shadow-lg w-full h-64 object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Badge className="mb-4">Our Journey</Badge>
            <h2 className="text-3xl font-bold mb-4">Milestones Over the Years</h2>
            <p className="text-muted-foreground">
              A journey of growth, innovation, and commitment to healthcare excellence.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-primary/20" />

              {/* Timeline Items */}
              <div className="space-y-12">
                {milestones.map((milestone, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-8 ${
                      index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'
                    }`}
                  >
                    <div className={`flex-1 ${index % 2 === 0 ? 'text-right' : 'text-left'}`}>
                      <h3 className="text-xl font-bold text-primary">{milestone.year}</h3>
                      <h4 className="font-semibold mt-1">{milestone.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {milestone.description}
                      </p>
                    </div>
                    <div className="w-4 h-4 bg-primary rounded-full border-4 border-white dark:border-gray-900 z-10" />
                    <div className="flex-1" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Accreditations */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Badge className="mb-4">Accreditations</Badge>
            <h2 className="text-3xl font-bold mb-4">Recognized for Excellence</h2>
            <p className="text-muted-foreground">
              Our commitment to quality has been recognized by leading healthcare organizations.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {accreditations.map((accreditation, index) => (
              <Card key={index} className="text-center">
                <CardContent className="p-6">
                  <Award className="h-12 w-12 text-primary mx-auto mb-4" />
                  <p className="font-semibold">{accreditation}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
