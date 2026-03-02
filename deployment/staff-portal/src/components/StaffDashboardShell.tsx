import { useState, useEffect, useRef } from 'react';
import { Link, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    LogOut,
    Menu,
    X,
    Bell,
    ChevronRight,
    Home,
    Building2,
    Loader2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
    name: string;
    href: string;
    icon: LucideIcon;
    badge?: string;
}

interface RouteConfig {
    path?: string;
    index?: boolean;
    element: React.ReactNode;
}

interface StaffDashboardShellProps {
    roleName: string;
    roleLabel: string;
    basePath: string;
    navItems: NavItem[];
    routes: RouteConfig[];
    accentColor?: string;
}

const mockNotifications = [
    { id: 1, text: 'New patient registered', time: '2 min ago', unread: true },
    { id: 2, text: 'Appointment confirmed', time: '15 min ago', unread: true },
    { id: 3, text: 'Lab report ready for review', time: '1 hr ago', unread: false },
    { id: 4, text: 'System maintenance scheduled', time: '3 hrs ago', unread: false },
];

function getBreadcrumb(pathname: string, basePath: string, navItems: NavItem[]) {
    const segments = pathname.replace(basePath, '').split('/').filter(Boolean);
    const crumbs = [{ label: 'Dashboard', path: basePath }];
    if (segments.length > 0) {
        const matchedNav = navItems.find(item => {
            const itemSegment = item.href.replace(basePath + '/', '');
            return itemSegment === segments[0];
        });
        crumbs.push({
            label: matchedNav?.name || segments[0].charAt(0).toUpperCase() + segments[0].slice(1),
            path: pathname,
        });
    }
    return crumbs;
}

export default function StaffDashboardShell({
    roleName,
    roleLabel,
    basePath,
    navItems,
    routes,
}: StaffDashboardShellProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout, isLoading, isLoggingOut } = useAuth();
    const notifRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);

    const unreadCount = mockNotifications.filter(n => n.unread).length;
    const breadcrumbs = getBreadcrumb(location.pathname, basePath, navItems);

    // Take first 5 items for bottom nav
    const bottomNavItems = navItems.slice(0, 5);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setNotificationOpen(false);
            }
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
                setProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center animate-pulse-glow">
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                    </div>
                    <p className="text-sm text-gray-500 font-medium">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        if (isLoggingOut) return null;
        return <Navigate to="/login" replace />;
    }

    const isActive = (path: string) => {
        if (path === basePath) return location.pathname === basePath;
        return location.pathname === path || location.pathname.startsWith(path + '/');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* ===== SIDEBAR ===== */}
            <div
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex h-full flex-col">
                    {/* Logo */}
                    <div className="flex h-16 items-center justify-between px-5 border-b border-gray-100">
                        <Link to={basePath} className="flex items-center gap-3 group">
                            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                                <Building2 className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-gray-900 leading-tight">CityCare</h1>
                                <p className="text-[10px] text-blue-600 font-semibold tracking-wider uppercase">{roleLabel}</p>
                            </div>
                        </Link>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="lg:hidden hover:bg-gray-100 rounded-lg"
                            onClick={() => setSidebarOpen(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* User Card */}
                    <div className="px-4 py-4 border-b border-gray-100">
                        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                                <span className="text-sm font-bold text-white">
                                    {user?.name?.[0] || 'S'}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                                <p className="text-xs text-blue-600 font-medium truncate">{roleName}</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                        <p className="px-3 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Navigation</p>
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    to={item.href}
                                    className={`sidebar-link flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium ${active
                                        ? 'active text-blue-700'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${active ? 'bg-blue-100' : 'bg-gray-100'
                                            }`}>
                                            <Icon className={`h-4 w-4 ${active ? 'text-blue-600' : 'text-gray-500'}`} />
                                        </div>
                                        <span>{item.name}</span>
                                    </div>
                                    {item.badge && (
                                        <Badge className="h-5 px-1.5 text-[10px] font-bold bg-red-500 text-white hover:bg-red-500 rounded-full">
                                            {item.badge}
                                        </Badge>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Bottom Actions */}
                    <div className="px-3 py-4 border-t border-gray-100 space-y-1">
                        <Button
                            variant="ghost"
                            className="w-full justify-start text-red-500 hover:bg-red-50 hover:text-red-700 rounded-xl h-10"
                            onClick={() => { logout(); }}
                        >
                            <LogOut className="h-4 w-4 mr-3" />
                            Logout
                        </Button>
                    </div>
                </div>
            </div>

            {/* ===== MAIN CONTENT ===== */}
            <div className="lg:ml-64 flex flex-col min-h-screen pb-16 lg:pb-0">
                {/* Top Header */}
                <header className="sticky top-0 z-30 glass border-b border-gray-200/60 flex-shrink-0">
                    <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="lg:hidden hover:bg-gray-100 rounded-lg"
                                onClick={() => setSidebarOpen(true)}
                            >
                                <Menu className="h-5 w-5" />
                            </Button>


                        </div>


                        <div className="flex items-center gap-2">
                            {/* Notification Bell */}
                            <div ref={notifRef} className="relative">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="relative hover:bg-gray-100 rounded-lg"
                                    onClick={() => { setNotificationOpen(!notificationOpen); setProfileOpen(false); }}
                                >
                                    <Bell className="h-4 w-4" />
                                    {unreadCount > 0 && (
                                        <span className="notification-dot absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                            {unreadCount}
                                        </span>
                                    )}
                                </Button>

                                {notificationOpen && (
                                    <div className="dropdown-enter absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-50">
                                        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                                            <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
                                            <Badge variant="secondary" className="text-[10px]">{unreadCount} new</Badge>
                                        </div>
                                        <div className="max-h-72 overflow-y-auto">
                                            {mockNotifications.map(n => (
                                                <div
                                                    key={n.id}
                                                    className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0 ${n.unread ? 'bg-blue-50/50' : ''
                                                        }`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        {n.unread && (
                                                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                                                        )}
                                                        <div className={!n.unread ? 'ml-5' : ''}>
                                                            <p className="text-sm text-gray-800 leading-snug">{n.text}</p>
                                                            <p className="text-xs text-gray-400 mt-1">{n.time}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="px-4 py-2 border-t border-gray-100">
                                            <Button variant="ghost" size="sm" className="w-full text-blue-600 hover:text-blue-700 text-xs">
                                                View All Notifications
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Profile Avatar */}
                            <div ref={profileRef} className="relative">
                                <button
                                    onClick={() => { setProfileOpen(!profileOpen); setNotificationOpen(false); }}
                                    className="flex items-center gap-2 p-1.5 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                                        <span className="text-xs font-bold text-white">
                                            {user?.name?.[0] || 'S'}
                                        </span>
                                    </div>
                                    <div className="hidden md:block text-left">
                                        <p className="text-sm font-medium text-gray-900 leading-tight">{user?.name}</p>
                                        <p className="text-[10px] text-gray-500">{roleName}</p>
                                    </div>
                                </button>

                                {profileOpen && (
                                    <div className="dropdown-enter absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-50">
                                        <div className="px-4 py-3 border-b border-gray-100">
                                            <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                                            <p className="text-xs text-gray-500">ID: {user?.staff_id}</p>
                                        </div>
                                        <div className="py-1">
                                            <button
                                                onClick={() => { logout(); setProfileOpen(false); }}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                            >
                                                <LogOut className="h-4 w-4" />
                                                Logout
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Breadcrumbs */}
                    <div className="px-4 sm:px-6 lg:px-8 py-2 border-t border-gray-100/60 bg-gray-50/50">
                        <nav className="flex items-center gap-1.5 text-xs">
                            <Link to={basePath} className="text-gray-400 hover:text-blue-600 transition-colors flex items-center gap-1">
                                <Home className="h-3 w-3" />
                            </Link>
                            {breadcrumbs.map((crumb, i) => (
                                <span key={crumb.path} className="flex items-center gap-1.5">
                                    <ChevronRight className="h-3 w-3 text-gray-300" />
                                    {i === breadcrumbs.length - 1 ? (
                                        <span className="font-medium text-gray-700">{crumb.label}</span>
                                    ) : (
                                        <Link to={crumb.path} className="text-gray-400 hover:text-blue-600 transition-colors">
                                            {crumb.label}
                                        </Link>
                                    )}
                                </span>
                            ))}
                        </nav>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-gray-50 overflow-auto">
                    <div key={location.pathname} className="page-enter">
                        <Routes>
                            {routes.map((route, idx) => (
                                <Route
                                    key={idx}
                                    index={route.index}
                                    path={route.path}
                                    element={route.element}
                                />
                            ))}
                            <Route path="*" element={
                                <div className="text-center py-12">
                                    <h2 className="text-2xl font-semibold text-gray-600 mb-2">Page Not Found</h2>
                                    <p className="text-gray-500">The page you're looking for doesn't exist.</p>
                                    <Button className="mt-4" onClick={() => navigate(basePath)}>Go to Dashboard</Button>
                                </div>
                            } />
                        </Routes>
                    </div>
                </main>
            </div>

            {/* ===== MOBILE BOTTOM NAV ===== */}
            <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-lg border-t border-gray-200 shadow-lg">
                <nav className="flex items-center justify-around h-16 px-1">
                    {bottomNavItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);
                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                className={`bottom-nav-item flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-xl min-w-0 ${active ? 'active text-blue-600' : 'text-gray-400'
                                    }`}
                            >
                                <div className="relative">
                                    <Icon className={`h-5 w-5 transition-colors ${active ? 'text-blue-600' : ''}`} />
                                    {item.badge && (
                                        <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                                            {item.badge}
                                        </span>
                                    )}
                                </div>
                                <span className={`text-[10px] font-medium truncate max-w-[60px] ${active ? 'text-blue-600' : ''}`}>
                                    {item.name}
                                </span>
                                <div className={`bottom-nav-indicator w-1 h-1 rounded-full bg-blue-600 ${active ? 'opacity-100' : ''}`} />
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
}
