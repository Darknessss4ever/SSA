import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Filter, XCircle, CreditCard, UserX, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { bookingsAPI, sportsAPI } from '../../services/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate, formatTime } from '../../lib/utils';
import { cn } from '../../lib/utils';
import type { Booking, Sport } from '../../types';

const STATUS_OPTS = ['all', 'pending_payment', 'confirmed', 'no_show', 'cancelled', 'completed'];

const statusLabel: Record<string, string> = {
  pending_payment: 'Pending Payment',
  confirmed: 'Confirmed',
  no_show: 'No Show',
  cancelled: 'Cancelled',
  completed: 'Completed',
  all: 'All',
};

export const AdminBookingsPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [sportFilter, setSportFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ['admin-bookings', statusFilter, sportFilter],
    queryFn: () => bookingsAPI.adminGetAll({
      ...(statusFilter !== 'all' && { status: statusFilter }),
      ...(sportFilter !== 'all' && { sportId: sportFilter }),
      limit: 50,
    }),
    refetchInterval: 20000,
  });

  const { data: sportsData } = useQuery({ queryKey: ['sports'], queryFn: () => sportsAPI.getAll() });

  const updateMutation = useMutation({
    mutationFn: ({ id, action, status }: { id: string; action?: string; status?: string }) =>
      bookingsAPI.adminUpdate(id, { action, status }),
    onSuccess: (_, vars) => {
      const msg = vars.action === 'confirm_payment' ? 'Payment confirmed ✅' :
                  vars.action === 'no_show' ? 'Marked as no-show' : 'Booking updated';
      toast.success(msg);
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Update failed'),
  });

  const bookings: Booking[] = bookingsData?.data?.data || [];
  const sports: Sport[] = sportsData?.data?.data || [];

  // Count pending payments for badge
  const pendingCount = bookings.filter(b => b.status === 'pending_payment').length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="section-title flex items-center gap-2"><Calendar className="w-7 h-7 text-primary-400" />Manage Bookings</h1>
          <p className="section-subtitle">{bookingsData?.data?.total || 0} total bookings</p>
        </div>
        {pendingCount > 0 && statusFilter !== 'pending_payment' && (
          <button onClick={() => setStatusFilter('pending_payment')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-sm font-medium hover:bg-amber-500/20 transition-all animate-pulse-slow">
            <CreditCard className="w-4 h-4" />
            {pendingCount} pending payment{pendingCount > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-dark-400" />
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTS.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                statusFilter === s
                  ? s === 'pending_payment' ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                    : s === 'no_show' ? 'bg-red-500/20 border border-red-500/40 text-red-300'
                    : 'bg-primary-500/20 border border-primary-500/40 text-primary-300'
                  : 'text-dark-400 hover:text-white hover:bg-dark-800')}>
              {statusLabel[s] || s}
            </button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto items-center">
          <span className="text-dark-400 text-sm">Sport:</span>
          <select value={sportFilter} onChange={e => setSportFilter(e.target.value)}
            className="bg-dark-800 border border-dark-600 rounded-lg px-2 py-1 text-dark-200 text-sm focus:outline-none focus:border-primary-500">
            <option value="all">All Sports</option>
            {sports.map(s => <option key={s._id} value={s._id}>{s.icon} {s.name}</option>)}
          </select>
        </div>
      </div>

      {/* No-show info banner */}
      <div className="flex items-center gap-2 p-3 rounded-xl bg-dark-800/50 border border-dark-700/50 text-dark-400 text-xs">
        <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
        <span><strong className="text-dark-200">No-show policy:</strong> Users get 15 minutes grace after slot start time. Mark manually below if they don't appear.</span>
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingSpinner className="py-20" text="Loading bookings..." />
      ) : bookings.length === 0 ? (
        <EmptyState icon="📅" title="No bookings found" description="Try changing the filters above." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700/50">
                  <th className="table-head">User</th>
                  <th className="table-head">Sport</th>
                  <th className="table-head">Date & Time</th>
                  <th className="table-head">Payment</th>
                  <th className="table-head">Status</th>
                  <th className="table-head">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(booking => {
                  const user = booking.userId as any;
                  const sport = booking.sportId as any;
                  const slot = booking.slotId as any;

                  // Check if slot has started (for no-show button)
                  const slotStart = slot?.date && slot?.startTime
                    ? new Date(`${slot.date}T${slot.startTime}:00`)
                    : null;
                  const graceEnd = slotStart ? new Date(slotStart.getTime() + 15 * 60000) : null;
                  const canMarkNoShow = booking.status === 'confirmed' && graceEnd && new Date() >= graceEnd;

                  return (
                    <tr key={booking._id} className={cn('border-b border-dark-800/50 hover:bg-dark-800/20 transition-colors',
                      booking.status === 'pending_payment' && 'bg-amber-500/5')}>
                      <td className="table-cell">
                        <p className="text-white text-sm font-medium">{user?.name}</p>
                        <p className="text-dark-500 text-xs">{user?.email}</p>
                        {user?.phone && <p className="text-dark-500 text-xs">{user?.phone}</p>}
                      </td>
                      <td className="table-cell">
                        <span className="flex items-center gap-1.5">
                          <span className="text-lg">{sport?.icon}</span>
                          <span className="text-dark-200 text-sm">{sport?.name}</span>
                        </span>
                      </td>
                      <td className="table-cell">
                        <p className="text-dark-200 text-sm">{slot?.date ? formatDate(slot.date) : '—'}</p>
                        <p className="text-dark-500 text-xs">{slot?.startTime ? `${formatTime(slot.startTime)} – ${formatTime(slot.endTime)}` : ''}</p>
                      </td>
                      <td className="table-cell">
                        <span className={cn('badge border text-xs',
                          booking.paymentStatus === 'subscription' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          booking.paymentStatus === 'paid' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          booking.paymentStatus === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          'bg-dark-700 text-dark-400 border-dark-600')}>
                          {booking.paymentStatus === 'subscription' ? '⭐ Sub' :
                           booking.paymentStatus === 'paid' ? '✓ Paid' :
                           booking.paymentStatus === 'pending' ? '💳 Pending' : booking.paymentStatus}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={cn('badge border text-xs',
                          booking.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          booking.status === 'pending_payment' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          booking.status === 'no_show' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          booking.status === 'cancelled' ? 'bg-dark-700 text-dark-500 border-dark-600' :
                          'bg-blue-500/10 text-blue-400 border-blue-500/20')}>
                          {statusLabel[booking.status] || booking.status}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1 flex-wrap">
                          {/* Confirm payment */}
                          {booking.status === 'pending_payment' && (
                            <button
                              onClick={() => updateMutation.mutate({ id: booking._id, action: 'confirm_payment' })}
                              title="Confirm payment received"
                              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-all text-xs font-medium border border-emerald-500/20">
                              <CreditCard className="w-3.5 h-3.5" /> Confirm Pay
                            </button>
                          )}
                          {/* Cancel */}
                          {(booking.status === 'pending_payment' || booking.status === 'confirmed') && (
                            <button
                              onClick={() => { if (confirm('Cancel this booking?')) updateMutation.mutate({ id: booking._id, status: 'cancelled' }); }}
                              title="Cancel booking"
                              className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-all">
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                          {/* Mark done */}
                          {booking.status === 'confirmed' && (
                            <button
                              onClick={() => updateMutation.mutate({ id: booking._id, status: 'completed' })}
                              title="Mark completed"
                              className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-all text-xs font-medium px-2">
                              Done
                            </button>
                          )}
                          {/* No-show (only after 15min grace) */}
                          {canMarkNoShow && (
                            <button
                              onClick={() => { if (confirm('Mark as no-show? This frees the slot.')) updateMutation.mutate({ id: booking._id, action: 'no_show' }); }}
                              title="Mark no-show (15min grace elapsed)"
                              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all text-xs font-medium border border-red-500/20">
                              <UserX className="w-3.5 h-3.5" /> No Show
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
