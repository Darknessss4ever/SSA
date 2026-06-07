import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Clock, X, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { bookingsAPI } from '../../services/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate, formatTime, getStatusColor } from '../../lib/utils';
import { cn } from '../../lib/utils';
import type { Booking } from '../../types';

const STATUS_FILTERS = ['all', 'confirmed', 'completed', 'cancelled'];

export const MyBookingsPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-bookings', statusFilter],
    queryFn: () => bookingsAPI.getMyBookings({
      ...(statusFilter !== 'all' && { status: statusFilter }),
      limit: 50,
    }),
    refetchInterval: 30000,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => bookingsAPI.cancel(id),
    onSuccess: () => {
      toast.success('Booking cancelled successfully');
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to cancel booking');
    },
  });

  const bookings: Booking[] = data?.data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="section-title flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-primary-400" />
            My Bookings
          </h1>
          <p className="section-subtitle">
            {data?.data?.total || 0} total booking{(data?.data?.total || 0) !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-dark-400" />
          {STATUS_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                statusFilter === f
                  ? 'bg-primary-500/20 border border-primary-500/40 text-primary-300'
                  : 'text-dark-400 hover:text-white hover:bg-dark-800'
              )}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-20" text="Loading bookings..." />
      ) : error ? (
        <EmptyState icon="⚠️" title="Failed to load bookings" description="Please try again." />
      ) : bookings.length === 0 ? (
        <EmptyState
          icon="📅"
          title="No bookings found"
          description={statusFilter !== 'all' ? `No ${statusFilter} bookings found.` : "You haven't made any bookings yet."}
        />
      ) : (
        <div className="space-y-3">
          {bookings.map(booking => {
            const sport = booking.sportId as any;
            const slot = booking.slotId as any;
            const canCancel = booking.status === 'confirmed';

            return (
              <div
                key={booking._id}
                className="card p-5 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                {/* Sport icon */}
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                  style={{ backgroundColor: `${sport?.color}20`, border: `1px solid ${sport?.color}30` }}
                >
                  {sport?.icon || '🏅'}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-white font-bold text-base">{sport?.name || 'Sport'}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-dark-400 text-sm flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {slot?.date ? formatDate(slot.date, 'EEE, MMM d yyyy') : 'N/A'}
                        </span>
                        {slot?.startTime && (
                          <span className="text-dark-300 text-sm">
                            {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                          </span>
                        )}
                      </div>
                      {booking.paymentStatus === 'subscription' && (
                        <span className="inline-block mt-1 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
                          ⭐ Subscription
                        </span>
                      )}
                    </div>
                    <span className={getStatusColor(booking.status)}>
                      {booking.status}
                    </span>
                  </div>

                  {booking.notes && (
                    <p className="text-dark-500 text-xs mt-2 italic">"{booking.notes}"</p>
                  )}

                  <p className="text-dark-600 text-xs mt-2">
                    Booked on {formatDate(booking.createdAt, 'MMM d, yyyy')}
                  </p>
                </div>

                {/* Cancel action */}
                {canCancel && (
                  <button
                    onClick={() => {
                      if (confirm('Cancel this booking?')) {
                        cancelMutation.mutate(booking._id);
                      }
                    }}
                    disabled={cancelMutation.isPending}
                    className="flex items-center gap-1.5 text-red-400 hover:text-red-300 text-sm font-medium px-3 py-2 rounded-lg hover:bg-red-500/10 border border-red-500/20 transition-all flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
