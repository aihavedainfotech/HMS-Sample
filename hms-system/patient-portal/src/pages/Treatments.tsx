import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Microscope,
  Scan,
  Activity,
  Syringe,
  Pill,
  Zap,
  CheckCircle2,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const advancedEquipment = [
  {
    name: '3 Tesla MRI',
    description: 'High-resolution magnetic resonance imaging for detailed body scans',
    features: [
      'Non-invasive imaging',
      'No radiation exposure',
      'Detailed soft tissue visualization',
      'Faster scan times',
    ],
    icon: Scan,
    image: '/images/mri-machine.jpg',
  },
  {
    name: '128-Slice CT Scanner',
    description: 'Advanced computed tomography for precise diagnosis',
    features: [
      'High-speed scanning',
      'Low radiation dose',
      'Cardiac imaging capability',
      '3D reconstruction',
    ],
    icon: Activity,
    image: '/images/ct-scanner.jpg',
  },
  {
    name: 'Digital X-Ray',
    description: 'Modern digital radiography with instant results',
    features: [
      'Instant image availability',
      'Lower radiation',
      'Image enhancement',
      'Easy storage and sharing',
    ],
    icon: Zap,
    image: '/images/xray-machine.jpg',
  },
  {
    name: '4D Ultrasound',
    description: 'Advanced ultrasound imaging with real-time 3D visualization',
    features: [
      'Real-time 3D imaging',
      'Fetal monitoring',
      'Cardiac assessment',
      'Guided procedures',
    ],
    icon: Microscope,
    image: '/images/ultrasound.jpg',
  },
];

const specializedTreatments = [
  {
    category: 'Cardiac Care',
    treatments: [
      { name: 'Angiography', description: 'Diagnostic imaging of blood vessels' },
      { name: 'Angioplasty', description: 'Minimally invasive procedure to open blocked arteries' },
      { name: 'Pacemaker Implantation', description: 'Device to regulate heart rhythm' },
      { name: 'Bypass Surgery', description: 'Coronary artery bypass grafting' },
    ],
  },
  {
    category: 'Neuro Sciences',
    treatments: [
      { name: 'Brain Tumor Surgery', description: 'Surgical removal of brain tumors' },
      { name: 'Spine Surgery', description: 'Minimally invasive spine procedures' },
      { name: 'Stroke Thrombolysis', description: 'Emergency stroke treatment' },
      { name: 'Deep Brain Stimulation', description: 'Treatment for movement disorders' },
    ],
  },
  {
    category: 'Orthopedics',
    treatments: [
      { name: 'Joint Replacement', description: 'Knee, hip, and shoulder replacement' },
      { name: 'Arthroscopy', description: 'Minimally invasive joint surgery' },
      { name: 'Spine Fusion', description: 'Spinal stabilization surgery' },
      { name: 'Sports Medicine', description: 'Treatment for sports injuries' },
    ],
  },
  {
    category: 'Oncology',
    treatments: [
      { name: 'Chemotherapy', description: 'Cancer treatment with drugs' },
      { name: 'Immunotherapy', description: 'Treatment to boost immune system' },
      { name: 'Targeted Therapy', description: 'Precision cancer treatment' },
      { name: 'Palliative Care', description: 'Supportive cancer care' },
    ],
  },
];

const roboticSurgery = {
  title: 'Robotic Surgery',
  description: 'Minimally invasive surgery with enhanced precision and faster recovery',
  benefits: [
    'Smaller incisions and less scarring',
    'Reduced blood loss',
    'Faster recovery time',
    'Greater surgical precision',
    'Shorter hospital stay',
    'Less post-operative pain',
  ],
  procedures: [
    'Prostate Surgery',
    'Hysterectomy',
    'Cardiac Surgery',
    'Orthopedic Surgery',
    'General Surgery',
  ],
};

export default function Treatments() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      {/* Hero Section */}
      <section className="relative py-16 bg-gradient-to-br from-primary/5 to-secondary/20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <Badge className="mb-4">Advanced Care</Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Advanced Treatments &{' '}
              <span className="text-primary">Technology</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              We invest in the latest medical technology and advanced treatment 
              methods to provide the best possible care for our patients.
            </p>
          </div>
        </div>
      </section>

      {/* Equipment Tabs */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <Tabs defaultValue="equipment" className="w-full">
            <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-3 mb-12">
              <TabsTrigger value="equipment">Equipment</TabsTrigger>
              <TabsTrigger value="treatments">Treatments</TabsTrigger>
              <TabsTrigger value="robotic">Robotic Surgery</TabsTrigger>
            </TabsList>

            {/* Equipment Tab */}
            <TabsContent value="equipment" className="space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                {advancedEquipment.map((item, index) => (
                  <Card key={index} className="overflow-hidden">
                    <div className="aspect-video bg-gray-100 flex items-center justify-center">
                      <item.icon className="h-20 w-20 text-gray-300" />
                    </div>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-semibold mb-2">{item.name}</h3>
                      <p className="text-muted-foreground mb-4">
                        {item.description}
                      </p>
                      <ul className="space-y-2">
                        {item.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Treatments Tab */}
            <TabsContent value="treatments" className="space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                {specializedTreatments.map((category, index) => (
                  <Card key={index}>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-semibold mb-4 text-primary">
                        {category.category}
                      </h3>
                      <div className="space-y-4">
                        {category.treatments.map((treatment, idx) => (
                          <div key={idx} className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium">{treatment.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {treatment.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Robotic Surgery Tab */}
            <TabsContent value="robotic" className="space-y-8">
              <Card>
                <CardContent className="p-8">
                  <div className="grid lg:grid-cols-2 gap-8 items-center">
                    <div>
                      <h3 className="text-2xl font-bold mb-4">{roboticSurgery.title}</h3>
                      <p className="text-muted-foreground mb-6">
                        {roboticSurgery.description}
                      </p>

                      <div className="mb-6">
                        <h4 className="font-semibold mb-3">Benefits</h4>
                        <ul className="space-y-2">
                          {roboticSurgery.benefits.map((benefit, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-3">Procedures</h4>
                        <div className="flex flex-wrap gap-2">
                          {roboticSurgery.procedures.map((proc, idx) => (
                            <Badge key={idx} variant="secondary">
                              {proc}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="aspect-video bg-gray-100 rounded-xl flex items-center justify-center">
                      <Activity className="h-32 w-32 text-gray-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Research & Innovation */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Badge className="mb-4">Research</Badge>
            <h2 className="text-3xl font-bold mb-4">Clinical Research & Innovation</h2>
            <p className="text-muted-foreground">
              We are committed to advancing medical knowledge through research and innovation.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Microscope className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Clinical Trials</h3>
                <p className="text-muted-foreground text-sm">
                  Participating in cutting-edge clinical trials to develop new treatments.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Syringe className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Medical Innovation</h3>
                <p className="text-muted-foreground text-sm">
                  Adopting the latest medical technologies and treatment protocols.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Pill className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Drug Development</h3>
                <p className="text-muted-foreground text-sm">
                  Collaborating with pharmaceutical companies for new drug research.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">
                    Consult Our Specialists
                  </h3>
                  <p className="opacity-80">
                    Get expert advice on the best treatment options for your condition.
                  </p>
                </div>
                <Button size="lg" variant="secondary" asChild>
                  <Link to="/register">
                    <Calendar className="h-5 w-5 mr-2" />
                    Book Consultation
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
