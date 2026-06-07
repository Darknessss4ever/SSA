import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, CheckCircle, Clock, AlertTriangle, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { subscriptionPlansAPI } from '../../services/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { formatCurrency } from '../../lib/utils';
import { cn } from '../../lib/utils';
import type { SubscriptionPlan } from '../../types';

const HOURS = Array.from({ length: 18 }, (_, i) => `${String(i + 5).padStart(2,'0')}:00`);

export const SubscriptionsPage: React.FC = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: () => subscriptionPlansAPI.getMySubscription(),
    refetchInterval: 60000,
  });

  const subscription = data?.data?.data?.subscription || null;
  const plans: SubscriptionPlan[] = data?.data?.data?.plans || [];

  const isActive = subscription?.status === 'active' && new Date(subscription.validTo) >= new Date();
  const daysLeft = subscription ? Math.max(0, Math.ceil((new Date(subscription.validTo).getTime() - Date.now()) / 86400000)) : 0;
  const planSports = (subscription?.sportsIncluded || []) as any[];

  // Preferred times state (for user-selects-time subscriptions)
  const [preferredTimes, setPreferredTimes] = useState<Record<string, { startTime: string; endTime: string }>>({});

  useEffect(() => {
    if (subscription?.preferredSlotTimes?.length) {
      const map: Record<string, { startTime: string; endTime: string }> = {};
      subscription.preferredSlotTimes.forEach((t: any) => {
        const id = t.sportId?._id || t.sportId;
        map[id] = { startTime: t.startTime, endTime: t.endTime };
      });
      setPreferredTimes(map);
    }
  }, [subscription]);

  const saveTimesMutation = useMutation({
    mutationFn: (times: any[]) => subscriptionPlansAPI.setPreferredTimes(times),
    onSuccess: () => { toast.success('Preferred times saved! ✅'); qc.invalidateQueries({ queryKey: ['my-subscription'] }); },
    onError: (e: any) => toast.error(e?.message || 'Failed to save'),
  });

  const handleSaveTimes = () => {
    const times = planSports.map((s: any) => ({
      sportId: s._id || s,
      startTime: preferredTimes[s._id || s]?.startTime || '',
      endTime: preferredTimes[s._id || s]?.endTime || '',
    })).filter(t => t.startTime && t.endTime);

    if (times.length === 0) { toast.error('Please set at least one time'); return; }
    saveTimesMutation.mutate(times);
  };

  const setTime = (sportId: string, key: 'startTime' | 'endTime', val: string) => {
    setPreferredTimes(prev => ({ ...prev, [sportId]: { ...prev[sportId], [key]: val } }));
  };

  if (isLoading) return <LoadingSpinner className="min-h-[60vh]" text="Loading subscriptions..." />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="section-title flex items-center gap-2"><Star className="w-7 h-7 text-primary-400" />Subscriptions</h1>
        <p className="section-subtitle">Your current plan and available subscription options.</p>
      </div>

      {/* Current subscription card */}
      <div className={cn('card p-6 border', isActive ? 'border-emerald-500/30 bg-emerald-500/5' : subscription ? 'border-red-500/20' : 'border-dark-700/50')}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', isActive ? 'bg-emerald-500/20' : 'bg-dark-800')}>
              {isActive ? <CheckCircle className="w-6 h-6 text-emerald-400" /> : subscription ? <AlertTriangle className="w-6 h-6 text-red-400" /> : <Star className="w-6 h-6 text-dark-500" />}
            </div>
            <div>
              <h2 className="text-white font-display font-bold text-lg">
                {isActive ? 'Active Subscription' : subscription ? 'Subscription Expired' : 'No Active Subscription'}
              </h2>
              {isActive && subscription ? (
                <div className="mt-1 space-y-1 text-sm">
                  {(subscription.planId as any)?.name && <p className="text-dark-200 font-medium">{(subscription.planId as any).name}</p>}
                  <p className="text-dark-400">{subscription.durationLabel} plan · {subscription.allowedPerDay}× per day per sport</p>
                  <p className="text-dark-400">Valid until <span className="text-white font-medium">{new Date(subscription.validTo).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}</span></p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn('badge border text-xs', subscription.userSelectsTime ? 'bg-primary-500/10 text-primary-400 border-primary-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20')}>
                      {subscription.userSelectsTime ? '👤 You select daily time' : '🛡️ Admin allotted time'}
                    </span>
                  </div>
                </div>
              ) : subscription ? (
                <p className="text-dark-400 text-sm mt-1">Expired on {new Date(subscription.validTo).toLocaleDateString('en-IN')}. Contact admin to renew.</p>
              ) : (
                <p className="text-dark-400 text-sm mt-1">Contact the arena admin to activate a subscription plan for you.</p>
              )}
            </div>
          </div>
          {isActive && (
            <div className="text-center flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-center justify-center">
                <p className="text-3xl font-display font-black text-emerald-400">{daysLeft}</p>
                <p className="text-emerald-500 text-xs">days left</p>
              </div>
            </div>
          )}
        </div>

        {/* Sports included */}
        {isActive && planSports.length > 0 && (
          <div className="mt-4 pt-4 border-t border-dark-700/50">
            <p className="text-dark-400 text-xs mb-2 uppercase tracking-wider">Sports Included</p>
            <div className="flex flex-wrap gap-2">
              {planSports.map((s: any) => (
                <span key={s._id || s} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-dark-800 border border-dark-700 text-dark-200 text-sm">
                  {s.icon && <span>{s.icon}</span>}{s.name || s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Admin-allotted times */}
        {isActive && !subscription?.userSelectsTime && subscription?.adminAllottedTimes?.length > 0 && (
          <div className="mt-4 pt-4 border-t border-dark-700/50">
            <p className="text-dark-400 text-xs mb-3 uppercase tracking-wider flex items-center gap-2"><Clock className="w-3.5 h-3.5" />Your Daily Slot Times (Admin Assigned)</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {subscription.adminAllottedTimes.map((t: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <span className="text-lg">{(t.sportId as any)?.icon || '🏅'}</span>
                  <div>
                    <p className="text-white text-sm font-medium">{(t.sportId as any)?.name || 'Sport'}</p>
                    <p className="text-amber-400 text-xs font-mono">{t.startTime} – {t.endTime}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User-selects time: preferred time picker */}
        {isActive && subscription?.userSelectsTime && planSports.length > 0 && (
          <div className="mt-4 pt-4 border-t border-dark-700/50">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <p className="text-white text-sm font-semibold flex items-center gap-2"><Clock className="w-4 h-4 text-primary-400" />Set Your Daily Preferred Slot</p>
              <button onClick={handleSaveTimes} disabled={saveTimesMutation.isPending}
                className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5">
                <Save className="w-3.5 h-3.5" />
                {saveTimesMutation.isPending ? 'Saving...' : 'Save Times'}
              </button>
            </div>
            <p className="text-dark-500 text-xs mb-4">Choose when you'd like to arrive each day for each sport. This is your recurring daily booking time.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {planSports.map((s: any) => (
                <div key={s._id} className="p-4 rounded-xl bg-dark-800/50 border border-dark-700/50">
                  <p className="text-white text-sm font-medium mb-3 flex items-center gap-2"><span className="text-xl">{s.icon}</span>{s.name}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-dark-400 text-xs mb-1 block">Start</label>
                      <select value={preferredTimes[s._id]?.startTime || ''} onChange={e => setTime(s._id, 'startTime', e.target.value)} className="input py-1.5 text-sm">
                        <option value="">Pick time</option>
                        {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-dark-400 text-xs mb-1 block">End</label>
                      <select value={preferredTimes[s._id]?.endTime || ''} onChange={e => setTime(s._id, 'endTime', e.target.value)} className="input py-1.5 text-sm">
                        <option value="">Pick time</option>
                        {HOURS.filter(h => h > (preferredTimes[s._id]?.startTime || '00:00')).map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  </div>
                  {subscription?.preferredSlotTimes?.find((t: any) => (t.sportId?._id || t.sportId) === s._id) && (
                    <p className="text-emerald-400 text-xs mt-2">✓ Saved</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Browse available plans */}
      {plans.length > 0 && (
        <div>
          <h2 className="text-lg font-display font-bold text-white mb-5">Available Plans</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {plans.map(plan => {
              const ps = plan.sportsIncluded as any[];
              const isCurrentPlan = isActive && (subscription?.planId as any)?._id === plan._id;
              return (
                <div key={plan._id} className={cn('card p-5 flex flex-col relative transition-all',
                  isCurrentPlan ? 'border-emerald-500/40' : plan.isPopular ? 'border-primary-500/30' : 'hover:border-dark-600')}>
                  {isCurrentPlan && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><span className="bg-emerald-500 text-white text-xs font-bold px-3 py-0.5 rounded-full whitespace-nowrap">✓ YOUR PLAN</span></div>}
                  {plan.isPopular && !isCurrentPlan && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><span className="bg-gradient-to-r from-primary-500 to-accent-500 text-white text-xs font-bold px-3 py-0.5 rounded-full shadow-glow whitespace-nowrap">⭐ POPULAR</span></div>}

                  <div className="h-1 rounded-full mb-4 mt-1" style={{ background: `linear-gradient(90deg,${plan.color},${plan.color}55)` }} />
                  <h3 className="text-white font-display font-bold text-lg mb-1">{plan.name}</h3>
                  <p className="text-dark-400 text-xs mb-3 capitalize">{plan.type} · {plan.allowedPerDay}× per day per sport</p>
                  {plan.description && <p className="text-dark-300 text-sm mb-4">{plan.description}</p>}

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {plan.type === 'combo'
                      ? <span className="badge bg-primary-500/10 text-primary-400 border border-primary-500/20 text-xs">🏅 All Sports</span>
                      : ps.map((s: any) => <span key={s._id} className="badge bg-dark-700 text-dark-200 text-xs">{s.icon} {s.name}</span>)}
                  </div>

                  {/* Duration tiers */}
                  <div className="space-y-1.5 mb-4 flex-1">
                    {plan.durations.map((d: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-dark-800/50 border border-dark-700/30">
                        <div>
                          <span className="text-dark-200 text-sm">{d.label}</span>
                          <span className={cn('ml-2 text-xs', d.userSelectsTime ? 'text-primary-400' : 'text-amber-400')}>
                            {d.userSelectsTime ? '· you pick time' : '· admin sets time'}
                          </span>
                        </div>
                        <span className="text-white font-bold text-sm">{formatCurrency(d.price)}</span>
                      </div>
                    ))}
                  </div>

                  {plan.features.length > 0 && (
                    <ul className="space-y-1 mb-4">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-dark-300 text-xs"><CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" />{f}</li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-auto pt-4 border-t border-dark-700/50">
                    {isCurrentPlan
                      ? <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium"><CheckCircle className="w-4 h-4" />Currently Active</div>
                      : <div className="flex items-center gap-2 text-dark-400 text-xs py-2.5 px-3 rounded-xl bg-dark-800/50 border border-dark-700"><Clock className="w-3.5 h-3.5" />Contact admin to activate</div>}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-center text-dark-500 text-sm mt-6">To subscribe, contact the arena admin or visit the reception desk 📞</p>
        </div>
      )}

      {plans.length === 0 && !subscription && (
        <div className="text-center py-16"><p className="text-4xl mb-3">💳</p><p className="text-dark-300 font-medium">No plans available yet</p><p className="text-dark-500 text-sm mt-1">Check back soon.</p></div>
      )}
    </div>
  );
};
