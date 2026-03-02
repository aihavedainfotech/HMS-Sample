import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DoctorCalendarProps {
    value: string; // YYYY-MM-DD
    onChange: (date: string) => void;
    offDays: string[];        // ['sunday', 'saturday'] — weekly off-days
    unavailableDates: string[]; // ['2026-03-10', ...] — specific leave dates
    minDate?: string; // YYYY-MM-DD, defaults to today
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

function toYMD(year: number, month: number, day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function DoctorCalendar({
    value,
    onChange,
    offDays,
    unavailableDates,
    minDate,
}: DoctorCalendarProps) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [viewYear, setViewYear] = useState(() => {
        if (value) return parseInt(value.split('-')[0]);
        return today.getFullYear();
    });
    const [viewMonth, setViewMonth] = useState(() => {
        if (value) return parseInt(value.split('-')[1]) - 1;
        return today.getMonth();
    });

    const minDateObj = useMemo(() => {
        if (minDate) return new Date(minDate + 'T00:00:00');
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, [minDate]);

    // Build calendar grid
    const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    function getDayStatus(day: number): 'past' | 'offday' | 'blocked' | 'selected' | 'available' {
        const dateStr = toYMD(viewYear, viewMonth, day);
        const dateObj = new Date(dateStr + 'T00:00:00');
        // Past
        if (dateObj < minDateObj) return 'past';
        // Selected
        if (dateStr === value) return 'selected';
        // Weekly off-day
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        if (offDays.includes(dayName)) return 'offday';
        // Specific blocked date
        if (unavailableDates.includes(dateStr)) return 'blocked';
        return 'available';
    }

    function prevMonth() {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    }
    function nextMonth() {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    }

    const cellStyle: Record<string, string> = {
        past: 'text-gray-300 cursor-not-allowed',
        offday: 'bg-gray-100 text-gray-400 cursor-not-allowed',
        blocked: 'bg-red-50 text-red-400 cursor-not-allowed line-through',
        selected: 'bg-blue-600 text-white font-bold rounded-full shadow',
        available: 'text-gray-800 hover:bg-blue-50 hover:text-blue-700 cursor-pointer rounded-full transition-colors',
    };

    const legend = [
        { color: 'bg-white border border-gray-200', label: 'Available' },
        { color: 'bg-gray-100', label: 'Day Off' },
        { color: 'bg-red-50', label: 'On Leave' },
        { color: 'bg-blue-600', label: 'Selected' },
    ];

    return (
        <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden select-none">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-b border-blue-100">
                <button
                    type="button"
                    onClick={prevMonth}
                    className="p-1 rounded-full hover:bg-blue-100 text-blue-700 transition-colors"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-semibold text-blue-900 text-sm">
                    {MONTH_NAMES[viewMonth]} {viewYear}
                </span>
                <button
                    type="button"
                    onClick={nextMonth}
                    className="p-1 rounded-full hover:bg-blue-100 text-blue-700 transition-colors"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 text-center text-[11px] font-bold text-gray-400 uppercase tracking-wide px-2 pt-2 pb-1">
                {DAY_LABELS.map(d => (
                    <div key={d} className={d === 'Sun' ? 'text-red-400' : ''}>{d}</div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-y-1 px-2 pb-3">
                {/* Empty cells for offset */}
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}

                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                    const status = getDayStatus(day);
                    const dateStr = toYMD(viewYear, viewMonth, day);
                    const isSelectable = status === 'available' || status === 'selected';
                    return (
                        <div
                            key={day}
                            onClick={() => isSelectable && onChange(dateStr)}
                            title={
                                status === 'offday' ? "Doctor's day off" :
                                    status === 'blocked' ? "Doctor on leave" :
                                        status === 'past' ? "Date in the past" : ''
                            }
                            className={`flex items-center justify-center h-8 w-8 mx-auto text-sm font-medium ${cellStyle[status]}`}
                        >
                            {day}
                            {status === 'blocked' && (
                                <span className="absolute text-[8px] text-red-400 font-bold leading-none" style={{ marginTop: 20 }}>✕</span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 px-3 py-2 border-t border-gray-100 bg-gray-50">
                {legend.map(l => (
                    <div key={l.label} className="flex items-center gap-1.5 text-[11px] text-gray-500">
                        <div className={`w-3 h-3 rounded-full ${l.color}`} />
                        {l.label}
                    </div>
                ))}
            </div>
        </div>
    );
}
