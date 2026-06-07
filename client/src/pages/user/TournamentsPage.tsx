import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trophy, Users, Calendar, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { tournamentsAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate, formatCurrency } from '../../lib/utils';
import { cn } from '../../lib/utils';
import type { Tournament } from '../../types';

const STATUS_COLORS: Record<string, string> = {
  upcoming: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  ongoing: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  completed: 'bg-dark-500/20 text-dark-400 border-dark-600',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export const TournamentsPage: React.FC = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['tournaments'],
    queryFn: () => tournamentsAPI.getAll(),
  });

  const registerMutation = useMutation({
    mutationFn: (id: string) => tournamentsAPI.register(id),
    onSuccess: () => {
      toast.success('Successfully registered for tournament! 🏆');
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Registration failed');
    },
  });

  const tournaments: Tournament[] = data?.data?.data || [];

  if (isLoading) return <LoadingSpinner className="min-h-[60vh]" text="Loading tournaments..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title flex items-center gap-2">
          <Trophy className="w-7 h-7 text-primary-400" />
          Tournaments
        </h1>
        <p className="section-subtitle">Compete, win, and become a champion at ShreeHari Arena.</p>
      </div>

      {tournaments.length === 0 ? (
        <EmptyState
          icon="🏆"
          title="No tournaments yet"
          description="Stay tuned! Exciting tournaments are being planned."
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {tournaments.map(tournament => {
            const sport = tournament.sportId as any;
            const isRegistered = (tournament.participants as string[]).includes(user?._id || '');
            const isFull = tournament.participants.length >= tournament.maxParticipants;
            const isUpcoming = tournament.status === 'upcoming';

            return (
              <div key={tournament._id} className="card-hover p-6 flex flex-col">
                {/* Status */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ backgroundColor: `${sport?.color}20`, border: `1px solid ${sport?.color}30` }}
                    >
                      {sport?.icon || '🏅'}
                    </div>
                    <div>
                      <h3 className="text-white font-bold">{tournament.title}</h3>
                      <p className="text-dark-400 text-xs">{sport?.name || 'Sport'}</p>
                    </div>
                  </div>
                  <span className={cn('badge border', STATUS_COLORS[tournament.status])}>
                    {tournament.status}
                  </span>
                </div>

                <p className="text-dark-300 text-sm leading-relaxed mb-4 flex-1">{tournament.description}</p>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3 mb-4 border-t border-dark-700/50 pt-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-primary-400" />
                    <span className="text-dark-300">{formatDate(tournament.date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <span className="text-dark-300">{tournament.participants.length}/{tournament.maxParticipants}</span>
                  </div>
                  {tournament.entryFee > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="w-4 h-4 text-amber-400" />
                      <span className="text-dark-300">Entry: {formatCurrency(tournament.entryFee)}</span>
                    </div>
                  )}
                  {tournament.prize && (
                    <div className="flex items-center gap-2 text-sm">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <span className="text-dark-300">{tournament.prize}</span>
                    </div>
                  )}
                </div>

                {/* Participants bar */}
                <div className="mb-4">
                  <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all"
                      style={{ width: `${(tournament.participants.length / tournament.maxParticipants) * 100}%` }}
                    />
                  </div>
                  <p className="text-dark-500 text-xs mt-1">
                    {tournament.maxParticipants - tournament.participants.length} spots remaining
                  </p>
                </div>

                <button
                  onClick={() => registerMutation.mutate(tournament._id)}
                  disabled={isRegistered || isFull || !isUpcoming || registerMutation.isPending}
                  className={isRegistered
                    ? 'btn-success text-sm py-2.5 w-full opacity-80'
                    : !isUpcoming || isFull
                      ? 'btn-secondary text-sm py-2.5 w-full opacity-50 cursor-not-allowed'
                      : 'btn-primary text-sm py-2.5 w-full'
                  }
                >
                  {isRegistered ? '✓ Registered' : isFull ? 'Tournament Full' : !isUpcoming ? 'Registration Closed' : 'Register Now'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
