import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Calendar, Dumbbell, Trophy, Users, Settings,
  LogOut, Menu, ChevronRight, Bell, LayoutDashboard,
  BookOpen, Megaphone, Shield, Star, Briefcase, DollarSign, BarChart3,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { getInitials } from '../../lib/utils';
import { cn } from '../../lib/utils';

const userNav = [
  { to: '/dashboard', icon: Home, label: 'Dashboard' },
  { to: '/book', icon: Calendar, label: 'Book a Slot' },
  { to: '/my-bookings', icon: BookOpen, label: 'My Bookings' },
  { to: '/subscriptions', icon: Star, label: 'Subscriptions' },
  { to: '/coaching', icon: Dumbbell, label: 'Coaching' },
  { to: '/tournaments', icon: Trophy, label: 'Tournaments' },
  { to: '/community', icon: Megaphone, label: 'Community' },
];

const adminNav = [
  { to: '/admin', icon: LayoutDashboard, label: 'Overview' },
  { to: '/admin/bookings', icon: Calendar, label: 'Bookings' },
  { to: '/admin/slots', icon: Settings, label: 'Slots' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/employees', icon: Briefcase, label: 'Employees' },
  { to: '/admin/financials', icon: DollarSign, label: 'Financials' },
  { to: '/admin/reports', icon: BarChart3, label: 'Reports' },
  { to: '/admin/subscriptions', icon: Star, label: 'Subscriptions' },
  { to: '/admin/coaching', icon: Dumbbell, label: 'Coaching' },
  { to: '/admin/tournaments', icon: Trophy, label: 'Tournaments' },
  { to: '/admin/announcements', icon: Megaphone, label: 'Announcements' },
];

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'admin';
  const nav = isAdmin ? adminNav : userNav;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (to: string) => {
    if (to === '/admin' || to === '/dashboard') return location.pathname === to;
    return location.pathname.startsWith(to);
  };

  return (
    <div className="min-h-screen bg-dark-950 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-64 bg-dark-900 border-r border-dark-700/50 z-50 flex flex-col transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="p-6 border-b border-dark-700/50">
          <Link to={isAdmin ? '/admin' : '/dashboard'} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center text-lg font-bold shadow-glow">
              🏆
            </div>
            <div>
              <p className="font-display font-bold text-white text-sm leading-tight">ShreeHari</p>
              <p className="text-primary-400 text-xs font-medium">Sports Arena</p>
            </div>
          </Link>
        </div>

        {/* Admin badge */}
        {isAdmin && (
          <div className="mx-4 mt-4">
            <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary-400" />
              <span className="text-primary-400 text-xs font-semibold">Admin Panel</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto mt-2">
          {nav.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={isActive(to) ? 'sidebar-link-active' : 'sidebar-link'}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{label}</span>
              {isActive(to) && <ChevronRight className="w-4 h-4 ml-auto opacity-60" />}
            </Link>
          ))}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-dark-700/50">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-dark-800/50 mb-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {getInitials(user?.name || 'U')}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-semibold truncate">{user?.name}</p>
              <p className="text-dark-400 text-xs truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-dark-950/90 backdrop-blur-md border-b border-dark-700/50 px-4 lg:px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-all"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <button className="relative p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-all">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full" />
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-sm font-bold">
              {getInitials(user?.name || 'U')}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
};
