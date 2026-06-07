import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, ChevronLeft, ChevronRight, Info, Star, CreditCard, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { sportsAPI, slotsAPI, bookingsAPI, subscriptionPlansAPI } from '../../services/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { formatTime, formatCurrency, generateDateRange, formatDate } from '../../lib/utils';
import { cn } from '../../lib/utils';
import type { Sport, Slot } from '../../types';

export const BookingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [notes, setNotes] = useState('');
  const [dateOffset, setDateOffset] = useState(0);
  const [lastBooking, setLastBooking] = useState<any>(null);

  const dates = generateDateRange(14);
  const visibleDates = dates.slice(dateOffset, dateOffset + 7);

  const { data: sportsData, isLoading: sportsLoading } = useQuery({
    queryKey: ['sports'],
    queryFn: () => sportsAPI.getAll(),
  });
  const sports: Sport[] = sportsData?.data?.data || [];

  // Subscription status — which sports are covered + which used today
  const { data: subStatusData } = useQuery({
    queryKey: ['my-sub-status'],
    queryFn: () => subscriptionPlansAPI.getMyStatus(),
    refetchInterval: 30000,
  });
  const subStatus = subStatusData?.data?.data || { active: false, coveredSportIds: [], usedTodaySportIds: [] };

  useEffect(() => {
    const sportId = searchParams.get('sport');
    if (sportId && sports.length > 0) {
      const sport = sports.find(s => s._id === sportId);
      if (sport) setSelectedSport(sport);
    } else if (sports.length > 0 && !selectedSport) {
      setSelectedSport(sports[0]);
    }
  }, [sports, searchParams]);

  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ['slots', selectedSport?._id, selectedDate],
    queryFn: () => slotsAPI.getByDate(selectedSport!._id, selectedDate),
    enabled: !!selectedSport && !!selectedDate,
    refetchInterval: 20000,
  });
  const slots: Slot[] = slotsData?.data?.data || [];

  // Derive subscription state for selected sport
  const sportCovered = selectedSport ? subStatus.coveredSportIds.includes(selectedSport._id) : false;
  const quotaUsedToday = selectedSport ? subStatus.usedTodaySportIds.includes(selectedSport._id) : false;
  const useSubscription = sportCovered && !quotaUsedToday;

  const bookMutation = useMutation({
    mutationFn: (data: any) => bookingsAPI.create(data),
    onSuccess: (res) => {
      const booking = res.data.data;
      setLastBooking(booking);
      setSelectedSlot(null);
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['slots'] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['my-sub-status'] });
      if (booking.status === 'pending_payment') {
        toast('Slot reserved! Please pay at the venue to confirm. 🏟️', { icon: '💳', duration: 6000 });
      } else {
        toast.success('Booking confirmed via subscription! 🎉');
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Booking failed. Please try again.');
    },
  });

  const handleBook = () => {
    if (!selectedSlot || !selectedSport) return;
    bookMutation.mutate({ slotId: selectedSlot._id, sportId: selectedSport._id, notes });
  };

  const isSlotPassed = (slot: Slot) => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (selectedDate !== todayStr) return false;

    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeStr = `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`;

    return slot.startTime < currentTimeStr;
  };

  const getSlotClass = (slot: Slot) => {
    if (isSlotPassed(slot)) return 'slot-blocked opacity-40 cursor-not-allowed';
    if (slot._id === selectedSlot?._id) return 'slot-selected';
    if (slot.isBlocked) return 'slot-blocked';
    if (!slot.isAvailable) return 'slot-booked';
    return 'slot-available';
  };

  const formatDayLabel = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date().toISOString().split('T')[0];
    if (dateStr === today) return { day: 'Today', date: d.getDate().toString() };
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return { day: days[d.getDay()], date: d.getDate().toString() };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title flex items-center gap-2">
          <Calendar className="w-7 h-7 text-primary-400" />
          Book a Slot
        </h1>
        <p className="section-subtitle">Select your sport, date, and preferred time slot.</p>
      </div>

      {/* Last booking confirmation banner */}
      {lastBooking && (
        <div className={cn('rounded-xl p-4 border flex items-start gap-3 animate-slide-up',
          lastBooking.status === 'pending_payment'
            ? 'bg-amber-500/10 border-amber-500/30'
            : 'bg-emerald-500/10 border-emerald-500/30')}>
          {lastBooking.status === 'pending_payment'
            ? <CreditCard className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            : <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />}
          <div>
            {lastBooking.status === 'pending_payment' ? (
              <>
                <p className="text-amber-300 font-semibold text-sm">Slot Reserved — Payment Pending</p>
                <p className="text-amber-400/80 text-xs mt-0.5">Your slot is held. Please pay ₹{lastBooking.slotId?.price || selectedSport?.pricePerSlot || '—'} at the venue. Admin will confirm once payment is received.</p>
              </>
            ) : (
              <>
                <p className="text-emerald-300 font-semibold text-sm">Booking Confirmed via Subscription ✓</p>
                <p className="text-emerald-400/80 text-xs mt-0.5">Enjoy your session! This counts as today's slot for {lastBooking.sportId?.name || selectedSport?.name}.</p>
              </>
            )}
          </div>
          <button onClick={() => setLastBooking(null)} className="ml-auto text-dark-400 hover:text-white text-xs">✕</button>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sport Selector */}
          <div className="card p-6">
            <h2 className="text-base font-display font-bold text-white mb-4">1. Choose a Sport</h2>
            {sportsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{[1,2,3,4,5].map(i => <div key={i} className="skeleton h-20" />)}</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {sports.map(sport => {
                  const covered = subStatus.coveredSportIds.includes(sport._id);
                  const usedToday = subStatus.usedTodaySportIds.includes(sport._id);
                  return (
                    <button
                      key={sport._id}
                      onClick={() => { setSelectedSport(sport); setSelectedSlot(null); }}
                      className={cn(
                        'p-4 rounded-xl border transition-all duration-200 text-left relative',
                        selectedSport?._id === sport._id
                          ? 'border-primary-500 bg-primary-500/10 shadow-glow'
                          : 'border-dark-700/50 bg-dark-800/50 hover:border-dark-600 hover:bg-dark-800'
                      )}>
                      {covered && (
                        <div className="absolute top-2 right-2">
                          <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium',
                            usedToday ? 'bg-dark-700 text-dark-400' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30')}>
                            {usedToday ? '✓ Used' : '⭐ Sub'}
                          </span>
                        </div>
                      )}
                      <span className="text-3xl block mb-2">{sport.icon}</span>
                      <p className={cn('font-semibold text-sm', selectedSport?._id === sport._id ? 'text-white' : 'text-dark-200')}>
                        {sport.name}
                      </p>
                      {/* Smart price display */}
                      {covered && !usedToday ? (
                        <p className="text-emerald-400 text-xs mt-0.5 font-medium">Covered by subscription</p>
                      ) : (
                        <p className="text-dark-400 text-xs mt-0.5">{formatCurrency(sport.pricePerSlot)}/slot</p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {/* Subscription status hint for selected sport */}
            {selectedSport && sportCovered && quotaUsedToday && (
              <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-dark-800/50 border border-dark-700/50">
                <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <p className="text-amber-300 text-xs">You've used your subscription slot for <strong>{selectedSport.name}</strong> today. You can still book a paid slot.</p>
              </div>
            )}
          </div>

          {/* Date Selector */}
          <div className="card p-6">
            <h2 className="text-base font-display font-bold text-white mb-4">2. Select a Date</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setDateOffset(Math.max(0, dateOffset - 7))} disabled={dateOffset === 0}
                className="p-2 rounded-lg bg-dark-800 border border-dark-700 text-dark-400 hover:text-white disabled:opacity-30 transition-all">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex-1 grid grid-cols-7 gap-1">
                {visibleDates.map(date => {
                  const { day, date: d } = formatDayLabel(date);
                  return (
                    <button key={date} onClick={() => { setSelectedDate(date); setSelectedSlot(null); }}
                      className={cn('flex flex-col items-center py-2 px-1 rounded-xl transition-all duration-200 text-xs',
                        selectedDate === date ? 'bg-primary-500 text-white shadow-glow' : 'text-dark-400 hover:bg-dark-800 hover:text-white')}>
                      <span className="font-medium">{day}</span>
                      <span className="font-bold text-base mt-0.5">{d}</span>
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setDateOffset(Math.min(7, dateOffset + 7))} disabled={dateOffset >= 7}
                className="p-2 rounded-lg bg-dark-800 border border-dark-700 text-dark-400 hover:text-white disabled:opacity-30 transition-all">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Slot Grid */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-display font-bold text-white">3. Pick a Time Slot</h2>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/60" />Available</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary-500/30 border border-primary-500/60" />Selected</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500/10 border border-red-500/20" />Full</span>
              </div>
            </div>
            {!selectedSport ? (
              <div className="text-center py-10 text-dark-400"><Info className="w-8 h-8 mx-auto mb-2 opacity-50" /><p>Select a sport to view available slots</p></div>
            ) : slotsLoading ? (
              <LoadingSpinner className="py-10" text="Loading slots..." />
            ) : slots.length === 0 ? (
              <div className="text-center py-10 text-dark-400"><p className="text-2xl mb-2">📅</p><p>No slots available for this date</p></div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {slots.map(slot => (
                  <button key={slot._id} onClick={() => { if (!isSlotPassed(slot) && slot.isAvailable && !slot.isBlocked) setSelectedSlot(slot._id === selectedSlot?._id ? null : slot); }}
                    disabled={isSlotPassed(slot)}
                    className={getSlotClass(slot)}>
                    <p className="font-semibold">{formatTime(slot.startTime)}</p>
                    <p className="text-xs opacity-70">{isSlotPassed(slot) ? 'Passed' : slot.isBlocked ? 'Blocked' : slot.isAvailable ? `${slot.capacity - slot.bookedCount} left` : 'Full'}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Booking Summary */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-24">
            <h2 className="text-base font-display font-bold text-white mb-5">Booking Summary</h2>
            {!selectedSport || !selectedSlot ? (
              <div className="text-center py-8"><p className="text-3xl mb-3">🏅</p><p className="text-dark-400 text-sm">Select a sport and slot to proceed</p></div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-dark-800/50 border border-dark-700/50 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{selectedSport.icon}</span>
                    <div>
                      <p className="text-white font-bold">{selectedSport.name}</p>
                      <p className="text-dark-400 text-xs">{formatDate(selectedDate)}</p>
                    </div>
                  </div>
                  <div className="border-t border-dark-700/50 pt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-dark-400">Time</span>
                      <span className="text-white font-medium">{formatTime(selectedSlot.startTime)} – {formatTime(selectedSlot.endTime)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-dark-400">Payment</span>
                      {useSubscription ? (
                        <span className="flex items-center gap-1 text-emerald-400 font-medium text-xs">
                          <Star className="w-3 h-3" /> Subscription
                        </span>
                      ) : (
                        <span className="text-white font-medium">{formatCurrency(selectedSlot.price || selectedSport.pricePerSlot)} <span className="text-dark-500 font-normal">at venue</span></span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Payment info for non-sub bookings */}
                {!useSubscription && (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <CreditCard className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-amber-300 text-xs font-semibold">Pay at Venue</p>
                      <p className="text-amber-400/70 text-xs mt-0.5">Your slot will be reserved. Pay at the reception. Admin confirms after payment.</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="label">Notes (optional)</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="Any special requirements..." rows={2} className="input resize-none text-sm" />
                </div>

                <button onClick={handleBook} disabled={bookMutation.isPending} className="btn-primary w-full flex items-center justify-center gap-2">
                  {bookMutation.isPending
                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : useSubscription ? '⭐ Book with Subscription' : '📍 Reserve Slot'}
                </button>
                <p className="text-center text-dark-500 text-xs">Cancellation allowed up to 1 hour before slot</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
