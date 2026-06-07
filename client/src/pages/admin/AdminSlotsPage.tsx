import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Settings, Plus, Lock, Unlock, Trash2, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { slotsAPI, sportsAPI } from '../../services/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate, formatTime, generateDateRange } from '../../lib/utils';
import { cn } from '../../lib/utils';
import type { Slot, Sport } from '../../types';

export const AdminSlotsPage: React.FC = () => {
  const [selectedSport, setSelectedSport] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showGenerate, setShowGenerate] = useState(false);
  const queryClient = useQueryClient();

  const { data: sportsData } = useQuery({ queryKey: ['sports'], queryFn: () => sportsAPI.getAll() });
  const sports: Sport[] = sportsData?.data?.data || [];

  const { data: slotsData, isLoading } = useQuery({
    queryKey: ['admin-slots', selectedSport, selectedDate],
    queryFn: () => slotsAPI.getAll({ sportId: selectedSport || undefined, date: selectedDate }),
    enabled: true,
  });

  const slots: Slot[] = slotsData?.data?.data || [];

  const { register, handleSubmit, reset } = useForm({
    defaultValues: { sportId: '', date: new Date().toISOString().split('T')[0], startHour: '6', endHour: '22', duration: '60', capacity: '1', price: '0' },
  });

  const generateMutation = useMutation({
    mutationFn: (data: any) => slotsAPI.generate(data),
    onSuccess: (res) => {
      toast.success(`Generated ${res.data.count} slots!`);
      setShowGenerate(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ['admin-slots'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Generation failed'),
  });

  const blockMutation = useMutation({
    mutationFn: ({ id, isBlocked, blockReason }: any) => slotsAPI.block(id, { isBlocked, blockReason }),
    onSuccess: () => {
      toast.success('Slot updated');
      queryClient.invalidateQueries({ queryKey: ['admin-slots'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Update failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => slotsAPI.delete(id),
    onSuccess: () => {
      toast.success('Slot deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-slots'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Delete failed'),
  });

  const onGenerate = (data: any) => generateMutation.mutate(data);

  const dates = generateDateRange(14);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="section-title flex items-center gap-2">
            <Settings className="w-7 h-7 text-primary-400" />
            Slot Management
          </h1>
          <p className="section-subtitle">Create, block, and manage time slots.</p>
        </div>
        <button onClick={() => setShowGenerate(!showGenerate)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Generate Slots
          <ChevronDown className={cn('w-4 h-4 transition-transform', showGenerate && 'rotate-180')} />
        </button>
      </div>

      {/* Generate form */}
      {showGenerate && (
        <div className="card p-6 animate-slide-up">
          <h2 className="text-base font-display font-bold text-white mb-4">Bulk Slot Generator</h2>
          <form onSubmit={handleSubmit(onGenerate)} className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="label">Sport</label>
              <select {...register('sportId')} required className="input">
                <option value="">Select sport</option>
                {sports.map(s => <option key={s._id} value={s._id}>{s.icon} {s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date</label>
              <input {...register('date')} type="date" className="input" />
            </div>
            <div>
              <label className="label">Start Hour (0-23)</label>
              <input {...register('startHour')} type="number" min="0" max="23" className="input" />
            </div>
            <div>
              <label className="label">End Hour (0-23)</label>
              <input {...register('endHour')} type="number" min="1" max="24" className="input" />
            </div>
            <div>
              <label className="label">Duration (minutes)</label>
              <select {...register('duration')} className="input">
                <option value="30">30 min</option>
                <option value="60">1 hour</option>
                <option value="90">90 min</option>
                <option value="120">2 hours</option>
              </select>
            </div>
            <div>
              <label className="label">Capacity per slot</label>
              <input {...register('capacity')} type="number" min="1" className="input" />
            </div>
            <div>
              <label className="label">Price (₹)</label>
              <input {...register('price')} type="number" min="0" className="input" />
            </div>
            <div className="md:col-span-2 flex items-end">
              <button type="submit" disabled={generateMutation.isPending} className="btn-primary flex items-center gap-2">
                {generateMutation.isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                Generate Slots
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-4 items-center">
        <div>
          <label className="label text-xs">Filter Sport</label>
          <select
            value={selectedSport}
            onChange={e => setSelectedSport(e.target.value)}
            className="input w-auto text-sm py-2"
          >
            <option value="">All Sports</option>
            {sports.map(s => <option key={s._id} value={s._id}>{s.icon} {s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label text-xs">Filter Date</label>
          <select
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="input w-auto text-sm py-2"
          >
            {dates.map(d => <option key={d} value={d}>{formatDate(d + 'T00:00:00', 'EEE, MMM d')}</option>)}
          </select>
        </div>
        <div className="ml-auto text-dark-400 text-sm">
          {slotsData?.data?.total || 0} slots found
        </div>
      </div>

      {/* Slots grid */}
      {isLoading ? (
        <LoadingSpinner className="py-20" text="Loading slots..." />
      ) : slots.length === 0 ? (
        <EmptyState icon="⏰" title="No slots found" description="Generate slots using the button above." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700/50">
                  <th className="table-head">Sport</th>
                  <th className="table-head">Date</th>
                  <th className="table-head">Time</th>
                  <th className="table-head">Capacity</th>
                  <th className="table-head">Price</th>
                  <th className="table-head">Status</th>
                  <th className="table-head">Actions</th>
                </tr>
              </thead>
              <tbody>
                {slots.map(slot => {
                  const sport = slot.sportId as any;
                  return (
                    <tr key={slot._id} className="border-b border-dark-800/50 hover:bg-dark-800/20 transition-colors">
                      <td className="table-cell">
                        <span className="flex items-center gap-1.5">
                          <span>{sport?.icon}</span>
                          <span className="text-dark-200 text-sm">{sport?.name}</span>
                        </span>
                      </td>
                      <td className="table-cell text-dark-200 text-sm">{formatDate(slot.date + 'T00:00:00')}</td>
                      <td className="table-cell text-dark-200 text-sm">
                        {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                      </td>
                      <td className="table-cell text-dark-200 text-sm">{slot.bookedCount}/{slot.capacity}</td>
                      <td className="table-cell text-dark-200 text-sm">₹{slot.price}</td>
                      <td className="table-cell">
                        {slot.isBlocked ? (
                          <span className="badge bg-red-500/10 text-red-400 border border-red-500/20">Blocked</span>
                        ) : slot.bookedCount >= slot.capacity ? (
                          <span className="badge bg-amber-500/10 text-amber-400 border border-amber-500/20">Full</span>
                        ) : (
                          <span className="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Available</span>
                        )}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => blockMutation.mutate({ id: slot._id, isBlocked: !slot.isBlocked, blockReason: slot.isBlocked ? '' : 'Maintenance' })}
                            className={cn('p-1.5 rounded-lg transition-all', slot.isBlocked ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-amber-400 hover:bg-amber-500/10')}
                            title={slot.isBlocked ? 'Unblock' : 'Block'}
                          >
                            {slot.isBlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => { if (confirm('Delete this slot?')) deleteMutation.mutate(slot._id); }}
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-all"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
