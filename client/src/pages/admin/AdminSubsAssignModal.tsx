import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { X, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { subscriptionPlansAPI, adminAPI } from '../../services/api';
import { formatCurrency } from '../../lib/utils';
import { cn } from '../../lib/utils';
import type { SubscriptionPlan, Sport } from '../../types';

interface Props {
  plans: SubscriptionPlan[];
  sports: Sport[];
  onClose: () => void;
  onSuccess: () => void;
}

const HOURS = Array.from({ length: 18 }, (_, i) => {
  const h = i + 5; // 5:00 to 22:00
  return `${String(h).padStart(2,'0')}:00`;
});

export const AdminSubsAssignModal: React.FC<Props> = ({ plans, sports: _sports, onClose, onSuccess }) => {
  const { data: usersData } = useQuery({ queryKey: ['admin-users-all'], queryFn: () => adminAPI.getUsers({ limit: 200 }) });
  const users = usersData?.data?.data || [];

  const { register, handleSubmit, watch } = useForm({
    defaultValues: { userId: '', planId: '', durationIndex: '0', customValidFrom: '' },
  });

  // Per-sport time state for admin-allotted tiers
  const [adminTimes, setAdminTimes] = useState<Record<string, { startTime: string; endTime: string }>>({});

  const selectedPlanId = watch('planId');
  const selectedDurationIdx = parseInt(watch('durationIndex') || '0');
  const selectedPlan = plans.find(p => p._id === selectedPlanId);
  const selectedTier = selectedPlan?.durations[selectedDurationIdx];
  const planSports = (selectedPlan?.sportsIncluded || []) as any[];

  const setTime = (sportId: string, key: 'startTime' | 'endTime', val: string) => {
    setAdminTimes(prev => ({ ...prev, [sportId]: { ...prev[sportId], [key]: val } }));
  };

  const assignMutation = useMutation({
    mutationFn: (data: any) => subscriptionPlansAPI.assignToUser(data),
    onSuccess: (res) => { toast.success(res.data.message || 'Assigned!'); onSuccess(); },
    onError: (e: any) => toast.error(e?.message || 'Failed'),
  });

  const onSubmit = (data: any) => {
    const payload: any = {
      userId: data.userId,
      planId: data.planId,
      durationIndex: parseInt(data.durationIndex),
      customValidFrom: data.customValidFrom || undefined,
    };

    if (selectedTier && !selectedTier.userSelectsTime) {
      // Validate admin has set times for all sports
      const allSet = planSports.every((s: any) => {
        const t = adminTimes[s._id || s];
        return t?.startTime && t?.endTime;
      });
      if (!allSet) { toast.error('Please set the daily time slot for each sport'); return; }
      payload.adminAllottedTimes = planSports.map((s: any) => ({
        sportId: s._id || s,
        startTime: adminTimes[s._id || s]?.startTime,
        endTime: adminTimes[s._id || s]?.endTime,
      }));
    }

    assignMutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card max-w-lg w-full p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-display font-bold text-white">Assign Subscription Plan</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Select User</label>
            <select {...register('userId')} required className="input">
              <option value="">Choose a user...</option>
              {users.map((u: any) => <option key={u._id} value={u._id}>{u.name} — {u.email}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Select Plan</label>
            <select {...register('planId')} required className="input">
              <option value="">Choose a plan...</option>
              {plans.filter(p => p.isActive && p.durations.length > 0).map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>

          {selectedPlan && (
            <div>
              <label className="label">Select Duration</label>
              <div className="grid grid-cols-2 gap-2">
                {selectedPlan.durations.map((d: any, i: number) => (
                  <label key={i} className={cn('flex flex-col p-3 rounded-xl border cursor-pointer transition-all',
                    selectedDurationIdx === i ? 'border-primary-500 bg-primary-500/10' : 'border-dark-700 bg-dark-800/50 hover:border-dark-600')}>
                    <input {...register('durationIndex')} type="radio" value={String(i)} className="sr-only" />
                    <span className="text-white text-sm font-semibold">{d.label}</span>
                    <span className="text-dark-300 text-xs">{formatCurrency(d.price)}</span>
                    <span className={cn('text-xs mt-1 font-medium', d.userSelectsTime ? 'text-primary-400' : 'text-amber-400')}>
                      {d.userSelectsTime ? '👤 User picks time' : '🛡️ You set the time'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Admin allots time — show time picker per sport */}
          {selectedTier && !selectedTier.userSelectsTime && planSports.length > 0 && (
            <div>
              <label className="label flex items-center gap-2"><Clock className="w-4 h-4 text-amber-400" />Set Daily Slot Time for Each Sport</label>
              <p className="text-dark-500 text-xs mb-3">This is the fixed daily time slot assigned to the user.</p>
              <div className="space-y-3">
                {planSports.map((s: any) => (
                  <div key={s._id} className="p-3 rounded-xl bg-dark-800/50 border border-dark-700/50">
                    <p className="text-white text-sm font-medium mb-2">{s.icon} {s.name}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-dark-400 text-xs mb-1 block">Start Time</label>
                        <select
                          value={adminTimes[s._id]?.startTime || ''}
                          onChange={e => setTime(s._id, 'startTime', e.target.value)}
                          className="input py-1.5 text-sm"
                        >
                          <option value="">Select...</option>
                          {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-dark-400 text-xs mb-1 block">End Time</label>
                        <select
                          value={adminTimes[s._id]?.endTime || ''}
                          onChange={e => setTime(s._id, 'endTime', e.target.value)}
                          className="input py-1.5 text-sm"
                        >
                          <option value="">Select...</option>
                          {HOURS.filter(h => h > (adminTimes[s._id]?.startTime || '00:00')).map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedTier?.userSelectsTime && (
            <div className="p-3 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-300 text-sm flex items-center gap-2">
              👤 User will set their own preferred daily slot time after activation.
            </div>
          )}

          <div>
            <label className="label">Start Date <span className="text-dark-500">(optional, defaults to today)</span></label>
            <input {...register('customValidFrom')} type="date" className="input" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={assignMutation.isPending} className="btn-primary flex-1">
              {assignMutation.isPending ? 'Assigning...' : 'Assign Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
