import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
    User,
    Calendar as CalendarIcon,
    Clock,
    Shield,
    Save,
    Plus,
    X,
    Briefcase,
    GraduationCap,
    Award,
    FileText,
    Moon,
    Sun,
    Coffee,
    Stethoscope,
    Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { DayPicker } from 'react-day-picker';
import { format, parseISO, isSameDay } from 'date-fns';
import 'react-day-picker/dist/style.css';

const API_URL = 'http://localhost:5002/api';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function DoctorProfile() {
    console.log('DoctorProfile component mounting...');
    const { user } = useAuth();
    console.log('User from auth:', user);
    const [loading, setLoading] = useState(false);
    const [profileData, setProfileData] = useState<any>(null);
    const [schedule, setSchedule] = useState<any>({});
    const [unavailability, setUnavailability] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '', confirm_password: '' });
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        console.log('useEffect triggered, user:', user);
        if (user?.staff_id) {
            console.log('Fetching profile for staff_id:', user.staff_id);
            fetchProfile();
            fetchUnavailability();
        } else {
            console.log('No staff_id available');
        }
    }, [user?.staff_id]);

    const fetchProfile = async () => {
        if (!user?.staff_id) return;
        try {
            console.log('Fetching profile...');
            const token = localStorage.getItem('hms_staff_token');
            const res = await fetch(`${API_URL}/doctors/${user.staff_id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log('Profile response status:', res.status);
            if (res.ok) {
                const data = await res.json();
                console.log('Profile data received:', data);
                setProfileData(data);
                // ... rest of the function

                // CRITICAL FIXED: Safely parse schedule if it's a string and migrate old formats
                let parsedSchedule: any = {};
                try {
                    const rawSchedule = typeof data.availability_schedule === 'string'
                        ? JSON.parse(data.availability_schedule)
                        : (data.availability_schedule || {});

                    // Migrate data format if needed
                    Object.keys(rawSchedule).forEach(day => {
                        parsedSchedule[day] = (rawSchedule[day] || []).map((slot: any) => {
                            if (typeof slot === 'string') {
                                // Convert "09:00-12:00" to structured object
                                const [start, end] = slot.split('-');
                                return { start: start || '09:00', end: end || '12:00', type: 'duty' };
                            }
                            return slot;
                        });
                    });
                } catch (e) {
                    console.error('Error parsing/migrating schedule:', e);
                }
                setSchedule(parsedSchedule);
            }
        } catch (error) {
            console.error('Failed to fetch profile:', error);
        }
    };

    const fetchUnavailability = async () => {
        if (!user?.staff_id) return;
        try {
            const token = localStorage.getItem('hms_staff_token');
            const res = await fetch(`${API_URL}/doctors/${user.staff_id}/unavailability`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUnavailability(data);
            }
        } catch (error) {
            console.error('Failed to fetch unavailability:', error);
        }
    };

    const addUnavailability = async () => {
        if (!selectedDate || !user?.staff_id) return;
        setLoading(true);
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        try {
            const token = localStorage.getItem('hms_staff_token');
            const res = await fetch(`${API_URL}/doctors/${user.staff_id}/unavailability`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ date: dateStr, reason: 'Vacation/Leave' })
            });
            if (res.ok) {
                toast.success(`Marked ${dateStr} as unavailable`);
                fetchUnavailability();
            }
        } catch (error) {
            toast.error('Error adding unavailability');
        } finally {
            setLoading(false);
        }
    };

    const removeUnavailability = async (dateStr: string) => {
        if (!user?.staff_id) return;
        try {
            const token = localStorage.getItem('hms_staff_token');
            const res = await fetch(`${API_URL}/doctors/${user.staff_id}/unavailability?date=${dateStr}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                toast.success('Unavailability removed');
                fetchUnavailability();
            }
        } catch (error) {
            toast.error('Error removing unavailability');
        }
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('hms_staff_token');
            const res = await fetch(`${API_URL}/doctor/profile`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(profileData)
            });
            if (res.ok) {
                toast.success('Profile updated successfully');
            } else {
                toast.error('Failed to update profile');
            }
        } catch (error) {
            toast.error('Error updating profile');
        } finally {
            setLoading(true);
            setTimeout(() => setLoading(false), 500);
        }
    };

    const handleScheduleUpdate = async () => {
        setLoading(true);
        console.log('Updating schedule with data:', schedule);
        try {
            const token = localStorage.getItem('hms_staff_token');
            const res = await fetch(`${API_URL}/doctor/schedule`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ schedule })
            });

            if (res.ok) {
                toast.success('Schedule updated successfully');
            } else {
                const errorData = await res.json().catch(() => ({}));
                console.error('Failed to update schedule:', errorData);
                toast.error(`Failed to update schedule: ${errorData.error || 'Unknown error'}`);
            }
        } catch (error: any) {
            console.error('Fetch error during schedule update:', error);
            toast.error(`Error updating schedule: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.new_password !== passwordData.confirm_password) {
            toast.error('Passwords do not match');
            return;
        }
        setLoading(true);
        try {
            const token = localStorage.getItem('hms_staff_token');
            const res = await fetch(`${API_URL}/doctor/change-password`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(passwordData)
            });
            if (res.ok) {
                toast.success('Password changed successfully');
                setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
            } else {
                const err = await res.json();
                toast.error(err.error || 'Failed to change password');
            }
        } catch (error) {
            toast.error('Error changing password');
        } finally {
            setLoading(false);
        }
    };

    const addTimeSlot = (day: string) => {
        const newSchedule = { ...schedule };
        if (!newSchedule[day]) newSchedule[day] = [];
        newSchedule[day].push({ start: '09:00', end: '12:00', type: 'duty' });
        setSchedule(newSchedule);
    };

    const removeTimeSlot = (day: string, index: number) => {
        const newSchedule = { ...schedule };
        newSchedule[day].splice(index, 1);
        setSchedule(newSchedule);
    };

    const updateTimeSlot = (day: string, index: number, field: string, value: string) => {
        const newSchedule = { ...schedule };
        newSchedule[day][index] = { ...newSchedule[day][index], [field]: value };
        setSchedule(newSchedule);
    };

    const copyMondayToWeekdays = () => {
        const mondaySchedule = schedule['monday'] || [];
        const newSchedule = { ...schedule };
        ['tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
            newSchedule[day] = JSON.parse(JSON.stringify(mondaySchedule));
        });
        setSchedule(newSchedule);
        toast.success('Monday schedule copied to all weekdays');
    };

    if (!user?.staff_id) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-slate-600 font-medium">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (!profileData) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-slate-600 font-medium">Loading profile data...</p>
                    <p className="text-slate-400 text-sm mt-2">Please wait while we fetch your information</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1200px] mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-black tracking-tight text-slate-900">
                    {profileData?.first_name?.toLowerCase?.().startsWith('dr') ? '' : 'Dr. '}
                    {profileData?.first_name || ''} {profileData?.last_name || ''}
                </h1>
                <p className="text-slate-500 font-medium">Manage your professional profile, schedule, and account settings.</p>
            </div>

            <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid grid-cols-3 w-full max-w-md bg-white border shadow-sm h-12 p-1 rounded-xl">
                    <TabsTrigger value="profile" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white">Profile</TabsTrigger>
                    <TabsTrigger value="schedule" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white">Schedule</TabsTrigger>
                    <TabsTrigger value="account" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white">Account</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="mt-8">
                    <form onSubmit={handleProfileUpdate}>
                        <div className="grid md:grid-cols-2 gap-8">
                            <Card className="border-none shadow-xl shadow-slate-200/50">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <User className="text-blue-600" size={20} />
                                        Basic Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>First Name</Label>
                                            <Input value={profileData.first_name} onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Last Name</Label>
                                            <Input value={profileData.last_name} onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Specialization</Label>
                                        <Input value={profileData.specialization} onChange={(e) => setProfileData({ ...profileData, specialization: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Years of Experience</Label>
                                        <Input type="number" value={profileData.years_of_experience} onChange={(e) => setProfileData({ ...profileData, years_of_experience: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Contact Phone</Label>
                                        <Input value={profileData.phone} onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })} />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-xl shadow-slate-200/50">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Briefcase className="text-blue-600" size={20} />
                                        Professional Background
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Qualifications</Label>
                                        <Textarea value={profileData.qualifications} onChange={(e) => setProfileData({ ...profileData, qualifications: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Education</Label>
                                        <Textarea value={profileData.education} onChange={(e) => setProfileData({ ...profileData, education: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Biography</Label>
                                        <Textarea value={profileData.bio} className="h-32" onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })} />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        <div className="flex justify-end mt-8">
                            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 h-11 px-8 gap-2 font-bold shadow-lg shadow-blue-200">
                                <Save size={18} />
                                {loading ? 'Saving...' : 'Save Profile Changes'}
                            </Button>
                        </div>
                    </form>
                </TabsContent>

                <TabsContent value="schedule" className="mt-8 space-y-8">
                    <Card className="border-none shadow-xl shadow-slate-200/50">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="text-blue-600" size={20} />
                                    Weekly Availability Schedule
                                </CardTitle>
                                <CardDescription>Define your duty hours, breaks, and ward visit periods.</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={copyMondayToWeekdays} className="gap-2 border-slate-200">
                                    <Plus size={16} /> Copy Monday to Weekdays
                                </Button>
                                <Button onClick={handleScheduleUpdate} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 gap-2 font-bold shadow-lg shadow-emerald-100">
                                    <Save size={18} /> Update Schedule
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {DAYS.map((day) => (
                                    <div key={day} className="flex flex-col lg:flex-row lg:items-center gap-4 p-4 rounded-xl border border-slate-100 bg-white hover:border-blue-200 transition-all group">
                                        <div className="w-32">
                                            <Label className="capitalize font-black text-slate-900 text-lg">{day}</Label>
                                        </div>
                                        <div className="flex-1 flex flex-wrap gap-3">
                                            {(schedule[day] || []).map((slot: any, idx: number) => (
                                                <div key={idx} className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${slot.type === 'duty' ? 'bg-emerald-50 border-emerald-100' :
                                                    slot.type === 'break' ? 'bg-amber-50 border-amber-100' :
                                                        'bg-blue-50 border-blue-100'
                                                    }`}>
                                                    <div className="flex items-center gap-1">
                                                        <Input
                                                            type="time"
                                                            value={slot.start}
                                                            onChange={(e) => updateTimeSlot(day, idx, 'start', e.target.value)}
                                                            className="h-8 w-24 bg-white border-none shadow-sm text-xs font-bold"
                                                        />
                                                        <span className="text-slate-400 text-[10px] font-bold">TO</span>
                                                        <Input
                                                            type="time"
                                                            value={slot.end}
                                                            onChange={(e) => updateTimeSlot(day, idx, 'end', e.target.value)}
                                                            className="h-8 w-24 bg-white border-none shadow-sm text-xs font-bold"
                                                        />
                                                    </div>
                                                    <div className="h-4 w-px bg-slate-200 mx-1" />
                                                    <select
                                                        value={slot.type}
                                                        onChange={(e) => updateTimeSlot(day, idx, 'type', e.target.value)}
                                                        className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer text-slate-700"
                                                    >
                                                        <option value="duty">Duty</option>
                                                        <option value="break">Break</option>
                                                        <option value="ward">Ward Visit</option>
                                                    </select>
                                                    <button onClick={() => removeTimeSlot(day, idx)} className="ml-1 p-1 hover:bg-white rounded-full text-slate-400 hover:text-rose-500 transition-colors">
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                            <Button variant="ghost" size="sm" className="h-10 px-4 border-2 border-dashed border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 text-slate-500 hover:text-blue-600 font-bold gap-2" onClick={() => addTimeSlot(day)}>
                                                <Plus size={16} /> Add Activity
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
                        <CardHeader className="bg-amber-50/50 border-b border-amber-100">
                            <CardTitle className="flex items-center gap-2 text-amber-900">
                                <CalendarIcon className="text-amber-600" size={20} />
                                Vacation & Leave Management
                            </CardTitle>
                            <CardDescription className="text-amber-700/70">Mark the dates you will be away from the hospital.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-center">
                                        <DayPicker
                                            mode="single"
                                            selected={selectedDate}
                                            onSelect={setSelectedDate}
                                            modifiers={{
                                                unavailable: unavailability
                                                    .filter(u => u?.unavailable_date)
                                                    .map(u => {
                                                        try {
                                                            return parseISO(u.unavailable_date);
                                                        } catch (e) {
                                                            console.warn('Invalid date:', u.unavailable_date);
                                                            return null;
                                                        }
                                                    })
                                                    .filter((date): date is Date => date !== null)
                                                    .filter(d => d && !isNaN(d.getTime()))
                                            }}
                                            modifiersStyles={{
                                                unavailable: { backgroundColor: '#fee2e2', color: '#dc2626', fontWeight: 'bold' }
                                            }}
                                            className="border-none"
                                        />
                                    </div>
                                    <Button
                                        onClick={addUnavailability}
                                        disabled={loading || !selectedDate}
                                        className="w-full bg-amber-600 hover:bg-amber-700 gap-2 font-bold h-11 shadow-lg shadow-amber-100"
                                    >
                                        <Plus size={18} /> Mark Selected Date as Unavailable
                                    </Button>
                                </div>

                                <div className="space-y-4">
                                    <Label className="text-lg font-bold text-slate-800">Your Unavailable Dates</Label>
                                    <ScrollArea className="h-[300px] border rounded-2xl p-4 bg-slate-50/30">
                                        <AnimatePresence>
                                            {unavailability.length > 0 ? (
                                                <div className="space-y-2">
                                                    {unavailability.map((u) => (
                                                        <motion.div
                                                            key={u.unavailable_date}
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            exit={{ opacity: 0, scale: 0.9 }}
                                                            className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <Badge className="bg-rose-50 text-rose-600 border-none font-bold">
                                                                    {format(parseISO(u.unavailable_date), 'PPP')}
                                                                </Badge>
                                                                <span className="text-xs text-slate-400 font-medium">{u.reason}</span>
                                                            </div>
                                                            <button
                                                                onClick={() => removeUnavailability(u.unavailable_date)}
                                                                className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-48 text-center gap-2">
                                                    <CalendarIcon className="h-8 w-8 text-slate-200" />
                                                    <p className="text-sm text-slate-400 font-medium">No vacation dates marked</p>
                                                </div>
                                            )}
                                        </AnimatePresence>
                                    </ScrollArea>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="account" className="mt-8">
                    <Card className="border-none shadow-xl shadow-slate-200/50 max-w-xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="text-blue-600" size={20} />
                                Account Security
                            </CardTitle>
                            <CardDescription>Update your login credentials and change your password.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <form onSubmit={handlePasswordChange} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Current Password</Label>
                                    <Input type="password" value={passwordData.current_password} onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>New Password</Label>
                                    <Input type="password" value={passwordData.new_password} onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Confirm New Password</Label>
                                    <Input type="password" value={passwordData.confirm_password} onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })} />
                                </div>
                                <div className="flex justify-start">
                                    <Button type="submit" disabled={loading} className="h-11 px-8 bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-100">
                                        Update Password
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
