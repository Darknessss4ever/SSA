import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dumbbell, Users, Star, Clock, CheckCircle, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { coachingAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatCurrency } from '../../lib/utils';
import { cn } from '../../lib/utils';
import type { Coaching } from '../../types';

export const CoachingPage: React.FC = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all');

  const { data, isLoading } = useQuery({ queryKey: ['coaching'], queryFn: () => coachingAPI.getAll() });
  const programs: Coaching[] = data?.data?.data || [];

  const getParticipantIds = (list: any[]) => list?.map(p => typeof p === 'object' ? p._id : p) || [];

  const enrollMutation = useMutation({
    mutationFn: (id: string) => coachingAPI.enroll(id),
    onSuccess: () => { toast.success('Application submitted! Pending approval. ⏳'); queryClient.invalidateQueries({ queryKey: ['coaching'] }); },
    onError: (err: any) => toast.error(err?.message || 'Application failed'),
  });

  const unenrollMutation = useMutation({
    mutationFn: (id: string) => coachingAPI.unenroll(id),
    onSuccess: () => { toast.success('Request updated successfully.'); queryClient.invalidateQueries({ queryKey: ['coaching'] }); },
    onError: (err: any) => toast.error(err?.message || 'Operation failed'),
  });

  const myPrograms = programs.filter(p => {
    const participantIds = getParticipantIds(p.participants as any[]);
    const pendingParticipantIds = getParticipantIds(p.pendingParticipants as any[]);
    return participantIds.includes(user?._id || '') || pendingParticipantIds.includes(user?._id || '');
  });
  const allPrograms = programs;

  if (isLoading) return <LoadingSpinner className="min-h-[60vh]" text="Loading coaching programs..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title flex items-center gap-2"><Dumbbell className="w-7 h-7 text-primary-400" />Coaching Programs</h1>
        <p className="section-subtitle">Train with certified professionals to elevate your game.</p>
      </div>

      {/* My Enrollments summary */}
      {myPrograms.length > 0 && (
        <div className="card p-5 border-emerald-500/20 bg-emerald-500/5">
          <p className="text-emerald-400 text-sm font-semibold mb-3 flex items-center gap-2"><CheckCircle className="w-4 h-4" />Your Active & Pending Enrollments ({myPrograms.length})</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {myPrograms.map(p => {
              const sport = p.sportId as any;
              const isPending = getParticipantIds(p.pendingParticipants as any[]).includes(user?._id || '');
              return (
                <div key={p._id} className={cn("flex items-start gap-3 p-3 rounded-xl bg-dark-800/50 border", isPending ? "border-amber-500/20" : "border-dark-700/50")}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ backgroundColor: `${sport?.color}20`, border: `1px solid ${sport?.color}30` }}>
                    {sport?.icon || '🏅'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white text-sm font-semibold truncate">{p.title}</p>
                      {isPending && (
                        <span className="px-1.5 py-0.5 text-[9px] rounded bg-amber-500/20 text-amber-300 font-medium">Pending Approval</span>
                      )}
                    </div>
                    <p className="text-dark-400 text-xs truncate">
                      {sport?.name} · {p.trainerName}
                      {p.trainerId && typeof p.trainerId === 'object' && (p.trainerId as any).phone && ` (${(p.trainerId as any).phone})`}
                    </p>
                    {p.schedule && (
                      <p className="text-primary-400 text-xs mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />{p.schedule}
                      </p>
                    )}
                    {p.startDate && (
                      <p className="text-dark-500 text-xs flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {new Date(p.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {p.endDate && ` – ${new Date(p.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-900 border border-dark-700/50 rounded-xl p-1 w-fit">
        {(['all', 'mine'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === t ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30' : 'text-dark-400 hover:text-white')}>
            {t === 'all' ? `All Programs (${allPrograms.length})` : `My Enrollments (${myPrograms.length})`}
          </button>
        ))}
      </div>

      {/* Program list */}
      {(activeTab === 'all' ? allPrograms : myPrograms).length === 0 ? (
        <EmptyState icon="🎓" title={activeTab === 'mine' ? "You're not enrolled yet" : "No coaching programs yet"}
          description={activeTab === 'mine' ? 'Browse programs below and enroll.' : 'Admin will add programs soon.'} />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(activeTab === 'all' ? allPrograms : myPrograms).map(program => {
            const sport = program.sportId as any;
            const participantIds = getParticipantIds(program.participants as any[]);
            const pendingParticipantIds = getParticipantIds(program.pendingParticipants as any[]);
            const isEnrolled = participantIds.includes(user?._id || '');
            const isPending = pendingParticipantIds.includes(user?._id || '');
            const isFull = program.participants.length >= program.maxParticipants;

            return (
              <div key={program._id} className={cn(
                'card-hover p-6 flex flex-col',
                isEnrolled && 'border-emerald-500/20',
                isPending && 'border-amber-500/20 bg-amber-500/5'
              )}>
                {isEnrolled && (
                  <div className="flex items-center gap-1.5 mb-3 text-emerald-400 text-xs font-semibold animate-slide-up">
                    <CheckCircle className="w-3.5 h-3.5" /> Enrolled
                  </div>
                )}
                {isPending && (
                  <div className="flex items-center gap-1.5 mb-3 text-amber-400 text-xs font-semibold animate-slide-up">
                    <Clock className="w-3.5 h-3.5 animate-pulse" /> Pending Approval
                  </div>
                )}
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ backgroundColor: `${sport?.color}20`, border: `1px solid ${sport?.color}30` }}>
                    {sport?.icon || '🏅'}
                  </div>
                  <div>
                    <h3 className="text-white font-bold leading-tight">{program.title}</h3>
                    <p className="text-dark-400 text-xs">{sport?.name || 'Sport'}</p>
                  </div>
                </div>

                <p className="text-dark-300 text-sm leading-relaxed flex-1 mb-4">{program.description}</p>

                <div className="space-y-2 mb-4 border-t border-dark-700/50 pt-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="w-4 h-4 text-amber-400" />
                    <span className="text-dark-300">Trainer: <span className="text-white">{program.trainerName}</span></span>
                  </div>
                  {program.trainerId && typeof program.trainerId === 'object' && (
                    <div className="mt-2.5 p-3 rounded-xl bg-dark-900/60 border border-dark-700/50 space-y-1 text-[11px] animate-slide-up">
                      <div className="text-[10px] text-dark-500 font-bold uppercase tracking-wider">Coach Contact Details</div>
                      <div className="flex items-center gap-1 text-dark-300">
                        <span className="font-semibold text-white">{(program.trainerId as any).name}</span>
                        <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-primary-500/10 text-primary-400 font-medium">Coach</span>
                      </div>
                      {(program.trainerId as any).phone && (
                        <div className="flex items-center gap-1 text-dark-400 hover:text-white transition-colors">
                          <span className="text-dark-500">Phone:</span>
                          <a href={`tel:${(program.trainerId as any).phone}`} className="hover:underline font-medium">{(program.trainerId as any).phone}</a>
                        </div>
                      )}
                      {(program.trainerId as any).email && (
                        <div className="flex items-center gap-1 text-dark-400 hover:text-white transition-colors">
                          <span className="text-dark-500">Email:</span>
                          <a href={`mailto:${(program.trainerId as any).email}`} className="hover:underline font-medium">{(program.trainerId as any).email}</a>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-primary-400" />
                    <span className="text-dark-300">{program.participants.length}/{program.maxParticipants} enrolled</span>
                  </div>
                  {program.schedule && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-primary-400" />
                      <span className="text-primary-300 font-medium">{program.schedule}</span>
                    </div>
                  )}
                  {program.startDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-dark-400" />
                      <span className="text-dark-400">
                        {new Date(program.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {program.endDate && ` – ${new Date(program.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-auto">
                  <div>
                    {program.price > 0
                      ? <p className="text-white font-bold">{formatCurrency(program.price)}</p>
                      : <p className="text-emerald-400 font-bold">Free</p>}
                  </div>
                  <button onClick={() => {
                    if (isEnrolled) {
                      if (window.confirm('Are you sure you want to unenroll from this program?')) {
                        unenrollMutation.mutate(program._id);
                      }
                    } else if (isPending) {
                      if (window.confirm('Are you sure you want to cancel your application?')) {
                        unenrollMutation.mutate(program._id);
                      }
                    } else {
                      enrollMutation.mutate(program._id);
                    }
                  }}
                    disabled={(!isEnrolled && !isPending && isFull) || enrollMutation.isPending || unenrollMutation.isPending}
                    className={isEnrolled
                      ? 'btn-secondary text-sm py-2 px-4 text-red-400 border-red-500/30 hover:bg-red-500/10'
                      : isPending
                        ? 'btn-secondary text-sm py-2 px-4 text-amber-400 border-amber-500/30 hover:bg-amber-500/10'
                        : isFull
                          ? 'btn-secondary text-sm py-2 px-4 opacity-50 cursor-not-allowed'
                          : 'btn-primary text-sm py-2 px-4'}>
                    {isEnrolled ? '✕ Unenroll' : isPending ? '✕ Cancel Request' : isFull ? 'Full' : 'Apply Now'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
