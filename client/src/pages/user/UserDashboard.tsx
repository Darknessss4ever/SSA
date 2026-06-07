import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Star, ArrowRight, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { bookingsAPI, announcementsAPI, sportsAPI } from '../../services/api';
import { Skeleton } from '../../components/ui/LoadingSpinner';
import { formatDate, formatTime, getStatusColor } from '../../lib/utils';
import type { Booking, Announcement, Sport } from '../../types';

const getAnnouncementIcon = (type: string) => {
  const icons: Record<string, string> = { event: '🎉', maintenance: '🔧', offer: '💰', general: '📢' };
  return icons[type] || '📢';
};

const getAnnouncementBorder = (type: string) => {
  const borders: Record<string, string> = {
    event: 'border-l-4 border-amber-500',
    maintenance: 'border-l-4 border-red-500',
    offer: 'border-l-4 border-emerald-500',
    general: 'border-l-4 border-primary-500',
  };
  return borders[type] || 'border-l-4 border-dark-600';
};

export const UserDashboard: React.FC = () => {
  const { user, subscription } = useAuthStore();

  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ['my-bookings', 'confirmed'],
    queryFn: () => bookingsAPI.getMyBookings({ status: 'confirmed', limit: 5 }),
    refetchInterval: 30000,
  });

  const { data: announcementsData } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => announcementsAPI.getAll(),
    refetchInterval: 30000,
  });

  const { data: sportsData } = useQuery({
    queryKey: ['sports'],
    queryFn: () => sportsAPI.getAll(),
  });

  const bookings: Booking[] = bookingsData?.data?.data || [];
  const announcements: Announcement[] = announcementsData?.data?.data || [];
  const sports: Sport[] = sportsData?.data?.data || [];
  const activeAnnouncements = announcements.slice(0, 3);

  const isSubActive = subscription?.status === 'active' && new Date(subscription.validTo) >= new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-black text-white">
            Welcome back, <span className="gradient-text">{user?.name?.split(' ')[0]}</span> 👋
          </h1>
          <p className="text-dark-400 mt-1">Ready to train? Book your slot below.</p>
        </div>
        <Link to="/book" className="btn-primary flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Book a Slot
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Bookings', value: bookingsData?.data?.total || 0, icon: '📅', color: 'text-primary-400' },
          { label: 'Active Bookings', value: bookings.length, icon: '✅', color: 'text-emerald-400' },
          { label: 'Subscription', value: isSubActive ? 'Active' : 'None', icon: '⭐', color: isSubActive ? 'text-amber-400' : 'text-dark-400' },
          { label: 'Sports Available', value: sports.length, icon: '🏅', color: 'text-cyan-400' },
        ].map(stat => (
          <div key={stat.label} className="stat-card">
            <span className="text-2xl">{stat.icon}</span>
            <p className={`text-2xl font-display font-black ${stat.color}`}>{stat.value}</p>
            <p className="text-dark-400 text-sm">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Upcoming bookings */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-400" />
              Upcoming Bookings
            </h2>
            <Link to="/my-bookings" className="text-primary-400 text-sm hover:text-primary-300 flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {bookingsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-3">📅</p>
              <p className="text-dark-300 font-medium">No upcoming bookings</p>
              <Link to="/book" className="btn-primary mt-4 inline-flex items-center gap-2 text-sm">
                Book Now <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => {
                const sport = booking.sportId as any;
                const slot = booking.slotId as any;
                return (
                  <div key={booking._id} className="flex items-center gap-4 p-4 rounded-xl bg-dark-800/50 border border-dark-700/50 hover:border-dark-600/50 transition-colors">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-dark-700 flex-shrink-0">
                      {sport?.icon || '🏅'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm">{sport?.name || 'Sport'}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-dark-400 text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {slot?.date ? formatDate(slot.date) : 'N/A'}
                        </span>
                        <span className="text-dark-500 text-xs">
                          {slot?.startTime ? `${formatTime(slot.startTime)} – ${formatTime(slot.endTime)}` : ''}
                        </span>
                      </div>
                    </div>
                    <span className={getStatusColor(booking.status)}>{booking.status}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Subscription status */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-dark-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" />
              Subscription
            </h3>
            {isSubActive ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Active</span>
                </div>
                <p className="text-dark-300 text-sm">
                  <span className="font-medium text-white capitalize">{subscription?.type}</span> plan
                </p>
                <p className="text-dark-400 text-xs mt-1">
                  Valid till {formatDate(subscription!.validTo)}
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-dark-500" />
                  <span className="text-dark-400">No active plan</span>
                </div>
                <p className="text-dark-500 text-xs">Contact admin to activate a subscription.</p>
              </div>
            )}
          </div>

          {/* Quick book sports */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-dark-300 uppercase tracking-wider mb-4">Quick Book</h3>
            <div className="grid grid-cols-2 gap-2">
              {sports.slice(0, 4).map(sport => (
                <Link
                  key={sport._id}
                  to={`/book?sport=${sport._id}`}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-dark-800/50 border border-dark-700/50 hover:border-primary-500/30 hover:bg-dark-800 transition-all group"
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform">{sport.icon}</span>
                  <span className="text-dark-300 text-xs font-medium text-center leading-tight">{sport.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Announcements */}
      {activeAnnouncements.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-display font-bold text-white flex items-center gap-2 mb-5">
            📢 Announcements
          </h2>
          <div className="space-y-3">
            {activeAnnouncements.map(ann => (
              <div
                key={ann._id}
                className={`p-4 rounded-xl bg-dark-800/50 ${getAnnouncementBorder(ann.type)}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0">{getAnnouncementIcon(ann.type)}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-semibold text-sm">{ann.title}</p>
                      {ann.isPinned && <span className="text-xs text-primary-400">📌 Pinned</span>}
                    </div>
                    <p className="text-dark-400 text-xs mt-0.5 leading-relaxed">{ann.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
