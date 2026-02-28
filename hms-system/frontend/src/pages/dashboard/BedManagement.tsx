import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  User,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Wrench,
} from 'lucide-react';
import type { Bed as BedType } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const bedTypes = [
  'All',
  'General_Male',
  'General_Female',
  'Private_AC',
  'Private_Non_AC',
  'ICU',
  'CCU',
  'NICU',
  'PICU',
];

export default function BedManagement() {
  const [beds, setBeds] = useState<BedType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');

  useEffect(() => {
    fetchBeds();
  }, []);

  const fetchBeds = async () => {
    try {
      const token = localStorage.getItem('hms_token');
      const response = await fetch(`${API_URL}/beds`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setBeds(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching beds:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any; color: string }> = {
      Vacant: { variant: 'default', icon: CheckCircle2, color: 'bg-green-100 text-green-600' },
      Occupied: { variant: 'secondary', icon: User, color: 'bg-red-100 text-red-600' },
      Reserved: { variant: 'outline', icon: AlertCircle, color: 'bg-yellow-100 text-yellow-600' },
      Under_Maintenance: { variant: 'destructive', icon: Wrench, color: 'bg-gray-100 text-gray-600' },
    };
    const config = variants[status] || variants.Vacant;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <config.icon className="h-3 w-3" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const filteredBeds = beds.filter(
    (b) =>
      (selectedType === 'All' || b.bed_type === selectedType) &&
      (b.bed_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       b.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const bedCounts = {
    total: beds.length,
    vacant: beds.filter((b) => b.status === 'Vacant').length,
    occupied: beds.filter((b) => b.status === 'Occupied').length,
    reserved: beds.filter((b) => b.status === 'Reserved').length,
    maintenance: beds.filter((b) => b.status === 'Under_Maintenance').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Bed Management</h1>
          <p className="text-muted-foreground">View and manage hospital beds</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Bed Type" />
            </SelectTrigger>
            <SelectContent>
              {bedTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search beds..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{bedCounts.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-green-600">Vacant</p>
            <p className="text-2xl font-bold text-green-600">{bedCounts.vacant}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-red-600">Occupied</p>
            <p className="text-2xl font-bold text-red-600">{bedCounts.occupied}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-yellow-600">Reserved</p>
            <p className="text-2xl font-bold text-yellow-600">{bedCounts.reserved}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-gray-600">Maintenance</p>
            <p className="text-2xl font-bold text-gray-600">{bedCounts.maintenance}</p>
          </CardContent>
        </Card>
      </div>

      {/* Beds Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredBeds.map((bed) => (
          <Card key={bed.bed_id} className={bed.status === 'Occupied' ? 'border-red-200' : bed.status === 'Vacant' ? 'border-green-200' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{bed.bed_id}</p>
                  <p className="text-sm text-muted-foreground">{bed.bed_type.replace('_', ' ')}</p>
                </div>
                {getStatusBadge(bed.status)}
              </div>
              
              <div className="mt-3 space-y-1">
                <p className="text-sm">
                  <span className="text-muted-foreground">Ward:</span> {bed.ward_name}
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Room:</span> {bed.room_number}
                </p>
                {bed.patient_name && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Patient:</span> {bed.patient_name}
                  </p>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                {bed.has_oxygen && <Badge variant="outline" className="text-xs">O2</Badge>}
                {bed.has_monitor && <Badge variant="outline" className="text-xs">Monitor</Badge>}
                {bed.has_ventilator && <Badge variant="outline" className="text-xs">Ventilator</Badge>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
