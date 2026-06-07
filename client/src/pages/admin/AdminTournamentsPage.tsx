import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Trophy, Plus, X, Users, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { tournamentsAPI, sportsAPI } from '../../services/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate, formatCurrency } from '../../lib/utils';
import { cn } from '../../lib/utils';
import type { Tournament, Sport } from '../../types';

const STATUS_COLORS: Record<string, string> = {
  upcoming: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  ongoing: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  completed: 'text-dark-400 bg-dark-700 border-dark-600',
  cancelled: 'text-red-400 bg-red-500/10 border-red-500/20',
};

export const AdminTournamentsPage: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['tournaments'], queryFn: () => tournamentsAPI.getAll() });
  const { data: sportsData } = useQuery({ queryKey: ['sports'], queryFn: () => sportsAPI.getAll() });

  const tournaments: Tournament[] = data?.data?.data || [];
  const sports: Sport[] = sportsData?.data?.data || [];

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      title: '', description: '', sportId: '',
      date: new Date().toISOString().split('T')[0],
      registrationDeadline: '',
      maxParticipants: '16', entryFee: '0', prize: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => tournamentsAPI.create(data),
    onSuccess: () => {
      toast.success('Tournament created!');
      setShowForm(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Creation failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => tournamentsAPI.update(id, data),
    onSuccess: () => {
      toast.success('Tournament updated');
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Update failed'),
  });

  const onSubmit = (data: any) => createMutation.mutate({
    ...data,
    maxParticipants: parseInt(data.maxParticipants),
    entryFee: parseInt(data.entryFee),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="section-title flex items-center gap-2">
            <Trophy className="w-7 h-7 text-primary-400" />
            Tournaments
          </h1>
          <p className="section-subtitle">Manage competitive events and leaderboards.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Tournament
        </button>
      </div>

      {showForm && (
        <div className="card p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-display font-bold text-white">Create Tournament</h2>
            <button onClick={() => setShowForm(false)} className="p-1.5 text-dark-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">Tournament Title</label>
              <input {...register('title')} required placeholder="e.g. Summer Cricket League" className="input" />
            </div>
            <div>
              <label className="label">Sport</label>
              <select {...register('sportId')} required className="input">
                <option value="">Select sport</option>
                {sports.map(s => <option key={s._id} value={s._id}>{s.icon} {s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Tournament Date</label>
              <input {...register('date')} type="date" className="input" />
            </div>
            <div>
              <label className="label">Registration Deadline</label>
              <input {...register('registrationDeadline')} type="date" className="input" />
            </div>
            <div>
              <label className="label">Max Participants</label>
              <input {...register('maxParticipants')} type="number" min="2" className="input" />
            </div>
            <div>
              <label className="label">Entry Fee (₹)</label>
              <input {...register('entryFee')} type="number" min="0" className="input" />
            </div>
            <div>
              <label className="label">Prize</label>
              <input {...register('prize')} placeholder="e.g. ₹50,000 cash prize" className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Description</label>
              <textarea {...register('description')} rows={3} placeholder="Tournament details..." className="input resize-none" />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={createMutation.isPending} className="btn-primary">
                {createMutation.isPending ? 'Creating...' : 'Create Tournament'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner className="py-20" text="Loading tournaments..." />
      ) : tournaments.length === 0 ? (
        <EmptyState icon="🏆" title="No tournaments" description="Create your first tournament above." />
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {tournaments.map(tournament => {
            const sport = tournament.sportId as any;
            const registered = tournament.participants.length;
            const pct = (registered / tournament.maxParticipants) * 100;
            return (
              <div key={tournament._id} className="card p-5 flex flex-col">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ backgroundColor: `${sport?.color}20`, border: `1px solid ${sport?.color}30` }}>
                      {sport?.icon || '🏅'}
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-sm">{tournament.title}</h3>
                      <p className="text-dark-400 text-xs">{sport?.name}</p>
                    </div>
                  </div>
                  <select
                    value={tournament.status}
                    onChange={e => updateMutation.mutate({ id: tournament._id, data: { status: e.target.value } })}
                    className={cn('badge border text-xs bg-transparent cursor-pointer', STATUS_COLORS[tournament.status])}
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <p className="text-dark-300 text-xs leading-relaxed mb-3 flex-1">{tournament.description}</p>

                <div className="space-y-1.5 text-xs border-t border-dark-700/50 pt-3 mb-3">
                  <div className="flex justify-between">
                    <span className="text-dark-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> Date</span>
                    <span className="text-dark-200">{formatDate(tournament.date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-400">Entry Fee</span>
                    <span className="text-white font-medium">{tournament.entryFee > 0 ? formatCurrency(tournament.entryFee) : 'Free'}</span>
                  </div>
                  {tournament.prize && (
                    <div className="flex justify-between">
                      <span className="text-dark-400">Prize</span>
                      <span className="text-amber-400">{tournament.prize}</span>
                    </div>
                  )}
                </div>

                {/* Registration bar */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-dark-400 flex items-center gap-1"><Users className="w-3 h-3" /> Participants</span>
                    <span className="text-dark-200">{registered}/{tournament.maxParticipants}</span>
                  </div>
                  <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
