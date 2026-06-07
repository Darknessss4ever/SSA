import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Megaphone } from 'lucide-react';
import { announcementsAPI } from '../../services/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate } from '../../lib/utils';
import { cn } from '../../lib/utils';
import type { Announcement } from '../../types';

const TYPE_CONFIG: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  event: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: '🎉' },
  maintenance: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: '🔧' },
  offer: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: '💰' },
  general: { color: 'text-primary-400', bg: 'bg-primary-500/10', border: 'border-primary-500/20', icon: '📢' },
};

export const CommunityPage: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => announcementsAPI.getAll(),
    refetchInterval: 60000,
  });

  const announcements: Announcement[] = data?.data?.data || [];
  const pinned = announcements.filter(a => a.isPinned);
  const regular = announcements.filter(a => !a.isPinned);

  if (isLoading) return <LoadingSpinner className="min-h-[60vh]" text="Loading community..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title flex items-center gap-2">
          <Megaphone className="w-7 h-7 text-primary-400" />
          Community
        </h1>
        <p className="section-subtitle">Stay updated with announcements, events, and offers.</p>
      </div>

      {announcements.length === 0 ? (
        <EmptyState
          icon="📢"
          title="No announcements yet"
          description="Check back soon for updates from ShreeHari Sports Arena."
        />
      ) : (
        <>
          {/* Pinned */}
          {pinned.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-dark-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                📌 Pinned
              </h2>
              <div className="space-y-3">
                {pinned.map(ann => {
                  const config = TYPE_CONFIG[ann.type] || TYPE_CONFIG.general;
                  return (
                    <div key={ann._id} className={cn('card p-5 border', config.border)}>
                      <div className="flex items-start gap-4">
                        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0', config.bg)}>
                          {config.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <h3 className="text-white font-bold">{ann.title}</h3>
                            <span className={cn('badge text-xs', config.color, config.bg, 'border', config.border)}>
                              {ann.type}
                            </span>
                          </div>
                          <p className="text-dark-300 mt-1 leading-relaxed">{ann.content}</p>
                          <p className="text-dark-500 text-xs mt-2">{formatDate(ann.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Regular */}
          {regular.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-dark-400 uppercase tracking-wider mb-3">
                Recent Updates
              </h2>
              <div className="space-y-3">
                {regular.map(ann => {
                  const config = TYPE_CONFIG[ann.type] || TYPE_CONFIG.general;
                  return (
                    <div key={ann._id} className="card p-5 hover:border-dark-600 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0', config.bg)}>
                          {config.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <h3 className="text-white font-semibold">{ann.title}</h3>
                            <span className={cn('badge text-xs', config.color, config.bg, 'border', config.border)}>
                              {ann.type}
                            </span>
                          </div>
                          <p className="text-dark-300 text-sm mt-1">{ann.content}</p>
                          <p className="text-dark-500 text-xs mt-2">{formatDate(ann.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
