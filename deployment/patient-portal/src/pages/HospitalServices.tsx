import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Heart, 
  Brain, 
  Bone, 
  Baby, 
  User, 
  Ambulance,
  Eye,
  Stethoscope,
  Activity,
  Pill,
  Microscope,
  ArrowRight
} from 'lucide-react';

const HospitalServices = () => {
  const services = [
    {
      name: 'Cardiology',
      description: 'Comprehensive heart care with advanced diagnostics, interventions, and cardiac rehabilitation services.',
      icon: Heart,
      color: 'bg-red-100 text-red-600',
      features: [
        'Echocardiography',
        'Stress Testing',
        'Angiography',
        'Pacemaker Implantation',
        'Cardiac Rehabilitation'
      ],
      doctors: 15,
      patients: '5000+'
    },
    {
      name: 'Neurology',
      description: 'Expert care for brain, spine, and nervous system disorders with advanced treatment options.',
      icon: Brain,
      color: 'bg-purple-100 text-purple-600',
      features: [
        'EEG Testing',
        'MRI/CT Scans',
        'Stroke Treatment',
        'Epilepsy Management',
        'Neuro Rehabilitation'
      ],
      doctors: 12,
      patients: '3000+'
    },
    {
      name: 'Orthopedics',
      description: 'Complete bone and joint care including sports medicine and joint replacement surgeries.',
      icon: Bone,
      color: 'bg-blue-100 text-blue-600',
      features: [
        'Joint Replacement',
        'Fracture Treatment',
        'Sports Medicine',
        'Arthroscopy',
        'Physical Therapy'
      ],
      doctors: 10,
      patients: '4000+'
    },
    {
      name: 'Pediatrics',
      description: 'Specialized healthcare for infants, children, and adolescents with child-friendly approach.',
      icon: Baby,
      color: 'bg-green-100 text-green-600',
      features: [
        'Vaccination Programs',
        'Growth Monitoring',
        'Pediatric Surgery',
        'Neonatal Care',
        'Child Psychology'
      ],
      doctors: 8,
      patients: '6000+'
    },
    {
      name: 'Gynecology',
      description: 'Complete women healthcare including maternity, fertility, and gynecological services.',
      icon: User,
      color: 'bg-pink-100 text-pink-600',
      features: [
        'Maternity Care',
        'High-Risk Pregnancy',
        'Fertility Treatment',
        'Gynecological Surgery',
        'Breast Care'
      ],
      doctors: 14,
      patients: '4500+'
    },
    {
      name: 'Emergency Medicine',
      description: '24/7 emergency care with rapid response team and advanced trauma facilities.',
      icon: Ambulance,
      color: 'bg-orange-100 text-orange-600',
      features: [
        '24/7 Emergency Room',
        'Trauma Care',
        'Critical Care Unit',
        'Emergency Surgery',
        'Ambulance Services'
      ],
      doctors: 20,
      patients: '10000+'
    },
    {
      name: 'Ophthalmology',
      description: 'Complete eye care services from routine check-ups to advanced eye surgeries.',
      icon: Eye,
      color: 'bg-teal-100 text-teal-600',
      features: [
        'Comprehensive Eye Exam',
        'LASIK Surgery',
        'Cataract Surgery',
        'Glaucoma Treatment',
        'Retinal Services'
      ],
      doctors: 6,
      patients: '2500+'
    },
    {
      name: 'Dental Care',
      description: 'Complete dental services including cosmetic dentistry and oral surgery.',
      icon: User,
      color: 'bg-indigo-100 text-indigo-600',
      features: [
        'General Dentistry',
        'Orthodontics',
        'Oral Surgery',
        'Cosmetic Dentistry',
        'Dental Implants'
      ],
      doctors: 8,
      patients: '3000+'
    },
    {
      name: 'General Medicine',
      description: 'Primary care for all ages with preventive health and chronic disease management.',
      icon: Stethoscope,
      color: 'bg-emerald-100 text-emerald-600',
      features: [
        'Primary Care',
        'Preventive Health',
        'Chronic Disease Management',
        'Health Checkups',
        'Vaccination'
      ],
      doctors: 18,
      patients: '8000+'
    },
    {
      name: 'Pathology',
      description: 'Advanced laboratory services with accurate diagnostic testing and analysis.',
      icon: Microscope,
      color: 'bg-cyan-100 text-cyan-600',
      features: [
        'Blood Tests',
        'Biopsy Analysis',
        'Molecular Testing',
        'Histopathology',
        'Microbiology'
      ],
      doctors: 5,
      patients: '15000+'
    },
    {
      name: 'Physiotherapy',
      description: 'Rehabilitation services to restore movement and function after injury or illness.',
      icon: Activity,
      color: 'bg-lime-100 text-lime-600',
      features: [
        'Sports Rehabilitation',
        'Post-Surgical Rehab',
        'Neurological Rehab',
        'Cardiac Rehab',
        'Pain Management'
      ],
      doctors: 7,
      patients: '2000+'
    },
    {
      name: 'Pharmacy',
      description: 'Complete pharmacy services with genuine medicines and expert consultation.',
      icon: Pill,
      color: 'bg-amber-100 text-amber-600',
      features: [
        'Prescription Drugs',
        'OTC Medicines',
        'Medical Supplies',
        'Home Delivery',
        'Medication Counseling'
      ],
      doctors: 4,
      patients: '12000+'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Our Services</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We offer comprehensive healthcare services across all major medical specialties with state-of-the-art facilities
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {services.map((service, index) => (
            <Card key={index} className="group hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className={`h-3 ${service.color} transition-all duration-300 group-hover:h-4`} />
              <CardContent className="p-6">
                <div className="flex items-start space-x-4 mb-4">
                  <div className={`w-16 h-16 rounded-xl ${service.color} flex items-center justify-center flex-shrink-0`}>
                    <service.icon className="h-8 w-8" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{service.name}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{service.description}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Key Features</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {service.features.slice(0, 3).map((feature, idx) => (
                        <div key={idx} className="flex items-center text-sm text-gray-600">
                          <div className="w-2 h-2 bg-blue-600 rounded-full mr-2" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-4 text-sm">
                      <div>
                        <span className="text-gray-500">Doctors:</span>
                        <span className="font-semibold text-gray-900 ml-1">{service.doctors}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Patients:</span>
                        <span className="font-semibold text-gray-900 ml-1">{service.patients}</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      Learn More
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="bg-blue-900 text-white rounded-2xl p-8 md:p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Need Medical Assistance?</h2>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            Our team of expert doctors is ready to provide you with the best medical care. 
            Book an appointment or visit our emergency services.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-white text-blue-900 hover:bg-blue-50 px-8 py-4"
              onClick={() => window.location.href = '/book-appointment'}
            >
              Book Appointment
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white text-white hover:bg-white hover:text-blue-900 px-8 py-4"
              onClick={() => window.location.href = '/doctors'}
            >
              Find Doctors
            </Button>
          </div>
        </div>

        {/* Emergency Services */}
        <div className="mt-12">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-red-900 mb-2">24/7 Emergency Services</h3>
                <p className="text-red-700">
                  For medical emergencies, please call our emergency hotline immediately.
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-red-600">108</div>
                <div className="text-sm text-red-700">Emergency Hotline</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HospitalServices;
