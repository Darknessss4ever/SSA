import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { Star, Plus, X, Trash2, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { subscriptionPlansAPI, sportsAPI } from '../../services/api';
import { LoadingSpinner, Skeleton } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatCurrency } from '../../lib/utils';
import { cn } from '../../lib/utils';
import type { SubscriptionPlan, Sport } from '../../types';
import { AdminSubsAssignModal } from './AdminSubsAssignModal';

const COLORS = ['#d946ef','#6366f1','#06b6d4','#10b981','#f59e0b','#ef4444'];
const PRESET_DURATIONS = [
  { label: '1 Month', days: 30 },
  { label: '3 Months', days: 90 },
  { label: '6 Months', days: 180 },
  { label: '1 Year', days: 365 },
];

export const AdminSubscriptionsPage: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SubscriptionPlan | null>(null);
  const [activeTab, setActiveTab] = useState<'plans'|'subscribers'>('plans');
  const [showAssign, setShowAssign] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const qc = useQueryClient();

  const { data: plansData, isLoading } = useQuery({ queryKey: ['sub-plans'], queryFn: () => subscriptionPlansAPI.getAll() });
  const { data: sportsData } = useQuery({ queryKey: ['sports'], queryFn: () => sportsAPI.getAll() });
  const { data: subsData, isLoading: subsLoading } = useQuery({
    queryKey: ['all-subs', statusFilter],
    queryFn: () => subscriptionPlansAPI.getAllSubscriptions(statusFilter !== 'all' ? { status: statusFilter } : {}),
    enabled: activeTab === 'subscribers',
  });

  const plans: SubscriptionPlan[] = plansData?.data?.data || [];
  const sports: Sport[] = sportsData?.data?.data || [];
  const subs = subsData?.data?.data || [];

  const { register, handleSubmit, control, watch, reset, setValue } = useForm({
    defaultValues: {
      name: '', description: '', type: 'individual', color: '#d946ef',
      isPopular: false, allowedPerDay: 1, features: '',
      sportsIncluded: [] as string[],
      durations: PRESET_DURATIONS.map(d => ({ label: d.label, days: d.days, price: '', userSelectsTime: false })),
    },
  });
  const { fields } = useFieldArray({ control, name: 'durations' as never });
  const planType = watch('type');
  const selectedColor = watch('color');

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing ? subscriptionPlansAPI.update(editing._id, data) : subscriptionPlansAPI.create(data),
    onSuccess: () => {
      toast.success(editing ? 'Plan updated!' : 'Plan created!');
      setShowForm(false); setEditing(null); reset();
      qc.invalidateQueries({ queryKey: ['sub-plans'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => subscriptionPlansAPI.delete(id),
    onSuccess: () => { toast.success('Plan deactivated'); qc.invalidateQueries({ queryKey: ['sub-plans'] }); },
    onError: (e: any) => toast.error(e?.message || 'Failed'),
  });

  const cancelSubMutation = useMutation({
    mutationFn: (id: string) => subscriptionPlansAPI.cancelUserSubscription(id),
    onSuccess: () => { toast.success('Subscription cancelled'); qc.invalidateQueries({ queryKey: ['all-subs'] }); },
    onError: (e: any) => toast.error(e?.message || 'Failed'),
  });

  const onSubmit = (data: any) => {
    const payload = {
      ...data,
      allowedPerDay: parseInt(data.allowedPerDay),
      features: data.features ? data.features.split('\n').filter(Boolean) : [],
      sportsIncluded: data.type === 'combo' ? sports.map(s => s._id) : data.sportsIncluded,
      durations: data.durations
        .filter((d: any) => d.price !== '' && d.price !== undefined)
        .map((d: any) => ({ ...d, price: parseFloat(d.price), days: parseInt(d.days), userSelectsTime: !!d.userSelectsTime })),
    };
    saveMutation.mutate(payload);
  };

  const openEdit = (plan: SubscriptionPlan) => {
    setEditing(plan);
    const sports = plan.sportsIncluded as any[];
    reset({
      name: plan.name, description: plan.description, type: plan.type,
      color: plan.color, isPopular: plan.isPopular, allowedPerDay: plan.allowedPerDay,
      features: plan.features.join('\n'),
      sportsIncluded: sports.map((s: any) => s._id || s),
      durations: PRESET_DURATIONS.map(preset => {
        const existing = plan.durations.find((d: any) => d.days === preset.days);
        return { label: preset.label, days: preset.days, price: existing ? String(existing.price) : '', userSelectsTime: existing?.userSelectsTime ?? false };
      }),
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="section-title flex items-center gap-2"><Star className="w-7 h-7 text-primary-400" />Subscriptions</h1>
          <p className="section-subtitle">Create monthly plans and assign them to users.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAssign(true)} className="btn-secondary text-sm">👤 Assign Plan</button>
          <button onClick={() => { setShowForm(!showForm); setEditing(null); reset(); }} className="btn-primary text-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> New Plan
          </button>
        </div>
      </div>

      {/* Plan form */}
      {showForm && (
        <div className="card p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-display font-bold text-white">{editing ? 'Edit Plan' : 'Create Subscription Plan'}</h2>
            <button onClick={() => { setShowForm(false); setEditing(null); reset(); }} className="p-1.5 text-dark-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="label">Plan Name</label><input {...register('name')} required placeholder="e.g. Swimming Monthly Pass" className="input" /></div>
              <div><label className="label">Type</label>
                <select {...register('type')} className="input">
                  <option value="individual">Individual Sport</option>
                  <option value="combo">Combo (All Sports)</option>
                </select>
              </div>
              <div className="md:col-span-2"><label className="label">Description</label><input {...register('description')} placeholder="Short plan description" className="input" /></div>
            </div>

            {planType === 'individual' && (
              <div>
                <label className="label">Sports Included</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {sports.map(s => (
                    <label key={s._id} className="flex items-center gap-2 p-2.5 rounded-lg bg-dark-800 border border-dark-700 cursor-pointer hover:border-dark-600 transition-colors">
                      <input {...register('sportsIncluded')} type="checkbox" value={s._id} className="accent-primary-500" />
                      <span className="text-sm text-dark-200">{s.icon} {s.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Duration tiers */}
            <div>
              <label className="label mb-2">Duration Tiers & Pricing</label>
              <p className="text-dark-500 text-xs mb-3">Leave price blank to exclude a duration. Toggle <span className="text-primary-400 font-medium">"User selects time"</span> for 6m/1yr so members pick their own daily slot.</p>
              <div className="rounded-xl overflow-hidden border border-dark-700/50">
                <table className="w-full">
                  <thead>
                    <tr className="bg-dark-800 border-b border-dark-700/50">
                      <th className="table-head">Duration</th>
                      <th className="table-head">Price (₹)</th>
                      <th className="table-head text-center">Who sets the time?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, i) => {
                      const userSelects = watch(`durations.${i}.userSelectsTime` as any);
                      return (
                        <tr key={field.id} className="border-b border-dark-800/50">
                          <td className="table-cell">
                            <span className="text-dark-200 text-sm font-medium">{PRESET_DURATIONS[i].label}</span>
                            <input type="hidden" {...register(`durations.${i}.label` as any)} />
                            <input type="hidden" {...register(`durations.${i}.days` as any)} />
                          </td>
                          <td className="table-cell">
                            <input {...register(`durations.${i}.price` as any)} type="number" min="0" placeholder="—" className="input py-1.5 text-sm w-28" />
                          </td>
                          <td className="table-cell text-center">
                            <button type="button"
                              onClick={() => setValue(`durations.${i}.userSelectsTime` as any, !userSelects)}
                              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                                userSelects ? 'bg-primary-500/20 text-primary-300 border-primary-500/40' : 'bg-dark-800 text-dark-400 border-dark-700')}>
                              {userSelects ? '👤 User selects' : '🛡️ Admin allots'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Features <span className="text-dark-500 text-xs">(one per line)</span></label>
                <textarea {...register('features')} rows={3} placeholder={"Once per day per sport\nLocker room access\nPriority booking"} className="input resize-none text-sm" />
              </div>
              <div className="space-y-3">
                <div>
                  <label className="label">Allowed per day per sport</label>
                  <input {...register('allowedPerDay')} type="number" min="1" max="3" className="input" />
                </div>
                <div>
                  <label className="label">Accent Color</label>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setValue('color', c)}
                        className={cn('w-8 h-8 rounded-full border-2 transition-all', selectedColor === c ? 'border-white scale-110' : 'border-transparent')}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input {...register('isPopular')} type="checkbox" id="pop" className="w-4 h-4 accent-primary-500" />
                  <label htmlFor="pop" className="text-dark-200 text-sm cursor-pointer">⭐ Mark as Popular</label>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowForm(false); setEditing(null); reset(); }} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saveMutation.isPending} className="btn-primary">
                {saveMutation.isPending ? 'Saving...' : editing ? 'Update Plan' : 'Create Plan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-900 border border-dark-700/50 rounded-xl p-1 w-fit">
        {(['plans','subscribers'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === t ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30' : 'text-dark-400 hover:text-white')}>
            {t === 'plans' ? `Plans (${plans.length})` : 'Subscribers'}
          </button>
        ))}
      </div>

      {/* Plans grid */}
      {activeTab === 'plans' && (
        isLoading
          ? <div className="grid md:grid-cols-3 gap-4">{[1,2,3].map(i => <Skeleton key={i} className="h-72" />)}</div>
          : plans.length === 0
            ? <EmptyState icon="💳" title="No plans yet" description="Create your first subscription plan above." />
            : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {plans.map(plan => {
                  const planSports = plan.sportsIncluded as any[];
                  return (
                    <div key={plan._id} className={cn('card p-5 flex flex-col relative', !plan.isActive && 'opacity-50')}>
                      {plan.isPopular && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                          <span className="bg-gradient-to-r from-primary-500 to-accent-500 text-white text-xs font-bold px-3 py-0.5 rounded-full shadow-glow">⭐ POPULAR</span>
                        </div>
                      )}
                      <div className="h-1 rounded-full mb-4 mt-1" style={{ background: `linear-gradient(90deg,${plan.color},${plan.color}55)` }} />
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="text-white font-bold">{plan.name}</h3>
                          <p className="text-dark-400 text-xs capitalize">{plan.type} · {plan.allowedPerDay}x/day/sport</p>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(plan)} className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700 transition-all"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => { if (confirm('Deactivate?')) deleteMutation.mutate(plan._id); }} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      <p className="text-dark-300 text-xs mb-3">{plan.description}</p>

                      {/* Sports */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {plan.type === 'combo'
                          ? <span className="badge bg-primary-500/10 text-primary-400 border border-primary-500/20 text-xs">🏅 All Sports</span>
                          : planSports.map((s: any) => <span key={s._id} className="badge bg-dark-700 text-dark-200 text-xs">{s.icon} {s.name}</span>)}
                      </div>

                      {/* Duration tiers */}
                      <div className="space-y-1.5 mb-3 flex-1">
                        {plan.durations.map((d: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-dark-800/50">
                            <span className="text-dark-300 text-xs">{d.label}</span>
                            <div className="flex items-center gap-2">
                              <span className={cn('text-xs px-1.5 py-0.5 rounded', d.userSelectsTime ? 'bg-primary-500/10 text-primary-400' : 'bg-amber-500/10 text-amber-400')}>
                                {d.userSelectsTime ? '👤 User' : '🛡️ Admin'}
                              </span>
                              <span className="text-white text-xs font-bold">{formatCurrency(d.price)}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-3 border-t border-dark-700/50 flex items-center justify-between">
                        <span className="text-dark-400 text-xs">From {plan.durations.length > 0 ? formatCurrency(Math.min(...plan.durations.map((d: any) => d.price))) : '—'}</span>
                        <span className={cn('badge border text-xs', plan.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-dark-700 text-dark-500 border-dark-600')}>
                          {plan.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
      )}

      {/* Subscribers tab */}
      {activeTab === 'subscribers' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {['all','active','expired','cancelled'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  statusFilter === s ? 'bg-primary-500/20 border border-primary-500/40 text-primary-300' : 'text-dark-400 hover:text-white hover:bg-dark-800')}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          {subsLoading ? <LoadingSpinner className="py-16" text="Loading..." />
          : subs.length === 0 ? <EmptyState icon="👥" title="No subscribers" description="Assign a plan to get started." />
          : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-dark-700/50">
                    <th className="table-head">User</th>
                    <th className="table-head">Plan / Duration</th>
                    <th className="table-head">Time Control</th>
                    <th className="table-head">Valid Till</th>
                    <th className="table-head">Status</th>
                    <th className="table-head">Actions</th>
                  </tr></thead>
                  <tbody>
                    {subs.map((sub: any) => {
                      const isActive = sub.status === 'active' && new Date(sub.validTo) >= new Date();
                      const daysLeft = Math.max(0, Math.ceil((new Date(sub.validTo).getTime() - Date.now()) / 86400000));
                      return (
                        <tr key={sub._id} className="border-b border-dark-800/50 hover:bg-dark-800/20 transition-colors">
                          <td className="table-cell"><div><p className="text-white text-sm font-medium">{sub.userId?.name}</p><p className="text-dark-500 text-xs">{sub.userId?.email}</p></div></td>
                          <td className="table-cell">
                            <p className="text-dark-200 text-sm">{sub.planId?.name || sub.type}</p>
                            <p className="text-dark-500 text-xs">{sub.durationLabel}</p>
                          </td>
                          <td className="table-cell">
                            <span className={cn('badge border text-xs', sub.userSelectsTime ? 'bg-primary-500/10 text-primary-400 border-primary-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20')}>
                              {sub.userSelectsTime ? '👤 User selects' : '🛡️ Admin allotted'}
                            </span>
                          </td>
                          <td className="table-cell">
                            <p className="text-dark-200 text-sm">{new Date(sub.validTo).toLocaleDateString('en-IN')}</p>
                            {isActive && <p className="text-emerald-400 text-xs">{daysLeft}d left</p>}
                          </td>
                          <td className="table-cell">
                            <span className={cn('badge border text-xs',
                              isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              sub.status === 'cancelled' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                              'bg-dark-700 text-dark-400 border-dark-600')}>
                              {!isActive && sub.status === 'active' ? 'expired' : sub.status}
                            </span>
                          </td>
                          <td className="table-cell">
                            {sub.status === 'active' && (
                              <button onClick={() => { if (confirm('Cancel?')) cancelSubMutation.mutate(sub._id); }}
                                className="text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-all text-xs">Cancel</button>
                            )}
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
      )}

      {showAssign && <AdminSubsAssignModal plans={plans} sports={sports} onClose={() => setShowAssign(false)} onSuccess={() => { setShowAssign(false); qc.invalidateQueries({ queryKey: ['all-subs'] }); }} />}
    </div>
  );
};
