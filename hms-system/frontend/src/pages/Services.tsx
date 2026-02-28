import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Heart,
  Brain,
  Bone,
  Baby,
  User,
  Ambulance,
  Microscope,
  Activity,
  Pill,
  Car,
  CheckCircle2,
  Clock,
  Phone,
  ArrowRight,
} from 'lucide-react';

const departments = [
  {
    id: 'cardiology',
    name: 'Cardiology',
    icon: Heart,
    description: 'Comprehensive heart care including diagnostics, interventions, and cardiac surgery.',
    features: [
      'Non-invasive Cardiology (ECG, Echo, TMT)',
      'Interventional Cardiology (Angiography, Angioplasty)',
      'Cardiac Surgery (Bypass, Valve Replacement)',
      'Heart Failure Clinic',
      'Cardiac Rehabilitation',
    ],
    equipment: ['3T MRI', '128-Slice CT', 'Digital Cath Lab', 'ECG Machines'],
    doctors: '8',
    timings: 'Mon-Sat: 9:00 AM - 8:00 PM | Emergency: 24/7',
  },
  {
    id: 'neurology',
    name: 'Neurology',
    icon: Brain,
    description: 'Expert care for brain, spine, and nervous system disorders.',
    features: [
      'Stroke Management & Thrombolysis',
      'Epilepsy Diagnosis & Treatment',
      'Movement Disorder Clinic',
      'Neurosurgery',
      'Spine Surgery',
    ],
    equipment: ['EEG', 'EMG', 'NCV', 'Neuro Navigation System'],
    doctors: '6',
    timings: 'Mon-Sat: 9:00 AM - 6:00 PM | Emergency: 24/7',
  },
  {
    id: 'orthopedics',
    name: 'Orthopedics',
    icon: Bone,
    description: 'Complete bone, joint, and muscle care including joint replacement.',
    features: [
      'Joint Replacement (Knee, Hip, Shoulder)',
      'Arthroscopy & Sports Medicine',
      'Spine Surgery',
      'Trauma & Fracture Care',
      'Physiotherapy & Rehabilitation',
    ],
    equipment: ['C-Arm', 'Arthroscopy System', 'Navigation System', 'X-Ray'],
    doctors: '10',
    timings: 'Mon-Sat: 9:00 AM - 8:00 PM | Emergency: 24/7',
  },
  {
    id: 'pediatrics',
    name: 'Pediatrics',
    icon: Baby,
    description: 'Complete healthcare for children from newborn to adolescence.',
    features: [
      'General Pediatrics',
      'Neonatal ICU (NICU)',
      'Pediatric ICU (PICU)',
      'Vaccination Center',
      'Developmental Pediatrics',
    ],
    equipment: ['Incubators', 'Phototherapy Units', 'Ventilators', 'Monitors'],
    doctors: '8',
    timings: 'Mon-Sat: 9:00 AM - 8:00 PM | Emergency: 24/7',
  },
  {
    id: 'gynecology',
    name: 'Gynecology & Obstetrics',
    icon: User,
    description: 'Complete women healthcare including maternity services.',
    features: [
      'Normal & Cesarean Delivery',
      'High-Risk Pregnancy Care',
      'Fertility Clinic',
      'Gynecological Surgery',
      'Menopause Clinic',
    ],
    equipment: ['4D Ultrasound', 'Fetal Monitors', 'Labor Room', 'OT'],
    doctors: '8',
    timings: 'Mon-Sat: 9:00 AM - 8:00 PM | Emergency: 24/7',
  },
  {
    id: 'emergency',
    name: 'Emergency & Trauma',
    icon: Ambulance,
    description: '24/7 emergency care with rapid response team.',
    features: [
      '24/7 Emergency Services',
      'Trauma Center',
      'Poison Control',
      'Disaster Management',
      'Ambulance Services',
    ],
    equipment: ['Defibrillators', 'Ventilators', 'Monitors', 'X-Ray Portable'],
    doctors: '15',
    timings: '24/7 - All Days',
  },
];

const diagnosticServices = [
  {
    name: 'Laboratory Services',
    description: 'Comprehensive pathology and biochemistry testing',
    tests: ['Blood Tests', 'Urine Tests', 'Biopsy', 'Culture & Sensitivity'],
    icon: Microscope,
  },
  {
    name: 'Radiology & Imaging',
    description: 'Advanced diagnostic imaging services',
    tests: ['X-Ray', 'CT Scan', 'MRI', 'Ultrasound', 'Mammography'],
    icon: Activity,
  },
  {
    name: 'Cardiac Diagnostics',
    description: 'Complete heart health assessment',
    tests: ['ECG', 'Echo', 'TMT', 'Holter Monitoring'],
    icon: Heart,
  },
];

const supportServices = [
  {
    name: 'Pharmacy',
    description: '24/7 pharmacy with genuine medicines',
    icon: Pill,
    features: ['Prescription Medicines', 'OTC Products', 'Surgical Items', 'Home Delivery'],
  },
  {
    name: 'Ambulance',
    description: 'Emergency and patient transport services',
    icon: Car,
    features: ['Basic Life Support', 'Advanced Life Support', 'Neonatal Transport', 'Air Ambulance'],
  },
  {
    name: 'Blood Bank',
    description: 'Safe blood donation and transfusion services',
    icon: Activity,
    features: ['Blood Donation', 'Blood Components', 'Rare Blood Group', '24/7 Service'],
  },
];

export default function Services() {
  useState('departments'); // activeTab state

  return (
    <div className="min-h-screen pt-24 pb-16">
      {/* Hero Section */}
      <section className="relative py-16 bg-gradient-to-br from-primary/5 to-secondary/20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <Badge className="mb-4">Our Services</Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Comprehensive Healthcare{' '}
              <span className="text-primary">Under One Roof</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              We offer a wide range of medical services with state-of-the-art facilities 
              and experienced healthcare professionals.
            </p>
          </div>
        </div>
      </section>

      {/* Services Tabs */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <Tabs defaultValue="departments" className="w-full">
            <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-3 mb-12">
              <TabsTrigger value="departments">Departments</TabsTrigger>
              <TabsTrigger value="diagnostic">Diagnostic</TabsTrigger>
              <TabsTrigger value="support">Support Services</TabsTrigger>
            </TabsList>

            {/* Departments Tab */}
            <TabsContent value="departments" className="space-y-8">
              <div className="grid lg:grid-cols-2 gap-8">
                {departments.map((dept) => (
                  <Card key={dept.id} className="overflow-hidden">
                    <CardHeader className="bg-muted/50">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                          <dept.icon className="h-7 w-7 text-primary" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-xl">{dept.name}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {dept.description}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Key Services</h4>
                          <ul className="grid grid-cols-2 gap-2">
                            {dept.features.map((feature, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="flex flex-wrap gap-4 pt-4 border-t">
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{dept.timings}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Activity className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{dept.doctors} Doctors</span>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <Button asChild className="flex-1">
                            <Link to="/doctors">
                              Find Doctor
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Link>
                          </Button>
                          <Button variant="outline" asChild>
                            <Link to="/register">
                              Book Now
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Diagnostic Tab */}
            <TabsContent value="diagnostic" className="space-y-8">
              <div className="grid md:grid-cols-3 gap-6">
                {diagnosticServices.map((service, index) => (
                  <Card key={index}>
                    <CardContent className="p-6">
                      <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                        <service.icon className="h-7 w-7 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">{service.name}</h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        {service.description}
                      </p>
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Available Tests</h4>
                        <ul className="space-y-1">
                          {service.tests.map((test, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              {test}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-2 gap-8 items-center">
                    <div>
                      <h3 className="text-2xl font-bold mb-4">
                        Advanced Diagnostic Equipment
                      </h3>
                      <p className="text-muted-foreground mb-6">
                        Our diagnostic center is equipped with the latest technology 
                        to ensure accurate and timely diagnosis.
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          '3 Tesla MRI',
                          '128-Slice CT Scanner',
                          'Digital X-Ray',
                          '4D Ultrasound',
                          'Mammography',
                          'DEXA Scan',
                        ].map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                            <span className="text-sm">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <img
                      src="/images/diagnostic-center.jpg"
                      alt="Diagnostic Center"
                      className="rounded-xl w-full h-64 object-cover"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Support Services Tab */}
            <TabsContent value="support" className="space-y-8">
              <div className="grid md:grid-cols-3 gap-6">
                {supportServices.map((service, index) => (
                  <Card key={index}>
                    <CardContent className="p-6">
                      <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                        <service.icon className="h-7 w-7 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">{service.name}</h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        {service.description}
                      </p>
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Features</h4>
                        <ul className="space-y-1">
                          {service.features.map((feature, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Emergency CTA */}
              <Card className="bg-primary text-primary-foreground">
                <CardContent className="p-8">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
                        <Phone className="h-8 w-8" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold">24/7 Emergency Services</h3>
                        <p className="opacity-80">Always ready to help in case of emergencies</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <Button size="lg" variant="secondary" asChild>
                        <a href="tel:108">
                          <Phone className="h-5 w-5 mr-2" />
                          Call 108
                        </a>
                      </Button>
                      <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10" asChild>
                        <Link to="/contact">Contact Us</Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  );
}
