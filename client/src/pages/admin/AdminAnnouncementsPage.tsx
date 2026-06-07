import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Megaphone, Plus, X, Trash2, Pin } from 'lucide-react';
import toast from 'react-hot-toast';
import { announcementsAPI } from '../../services/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate } from '../../lib/utils';
import { cn } from '../../lib/utils';
import type { Announcement } from '../../types';

const TYPE_COLORS: Record<string, string> = {
  event: 'text-amber-400 border-amber-500/20 bg-amber-500/10',
  maintenance: 'text-red-400 border-red-500/20 bg-red-500/10',
  offer: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10',
  general: 'text-primary-400 border-primary-500/20 bg-primary-500/10',
};

export const AdminAnnouncementsPage: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['announcements'], queryFn: () => announcementsAPI.getAll() });
  const announcements: Announcement[] = data?.data?.data || [];

  const { register, handleSubmit, reset } = useForm({
    defaultValues: { title: '', content: '', type: 'general', isPinned: false, expiresAt: '' },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => announcementsAPI.create(data),
    onSuccess: () => {
      toast.success('Announcement published!');
      setShowForm(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to publish'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => announcementsAPI.delete(id),
    onSuccess: () => {
      toast.success('Announcement deleted');
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Delete failed'),
  });

  const onSubmit = (data: any) => createMutation.mutate({ ...data, isPinned: data.isPinned === true || data.isPinned === 'true' });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="section-title flex items-center gap-2">
            <Megaphone className="w-7 h-7 text-primary-400" />
            Announcements
          </h1>
          <p className="section-subtitle">Post news, offers, and events to the community feed.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Announcement
        </button>
      </div>

      {showForm && (
        <div className="card p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-display font-bold text-white">Create Announcement</h2>
            <button onClick={() => setShowForm(false)} className="p-1.5 text-dark-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Title</label>
                <input {...register('title')} required placeholder="Announcement title" className="input" />
              </div>
              <div>
                <label className="label">Type</label>
                <select {...register('type')} className="input">
                  <option value="general">📢 General</option>
                  <option value="event">🎉 Event</option>
                  <option value="offer">💰 Offer</option>
                  <option value="maintenance">🔧 Maintenance</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Content</label>
              <textarea {...register('content')} required rows={4} placeholder="Write your announcement..." className="input resize-none" />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Expires On <span className="text-dark-500">(optional)</span></label>
                <input {...register('expiresAt')} type="date" className="input" />
              </div>
              <div className="flex items-center gap-3 pt-7">
                <input {...register('isPinned')} type="checkbox" id="pinned" className="w-4 h-4 accent-primary-500" />
                <label htmlFor="pinned" className="text-dark-200 text-sm cursor-pointer flex items-center gap-1.5">
                  <Pin className="w-4 h-4 text-primary-400" /> Pin this announcement
                </label>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={createMutation.isPending} className="btn-primary">
                {createMutation.isPending ? 'Publishing...' : 'Publish Announcement'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner className="py-20" text="Loading announcements..." />
      ) : announcements.length === 0 ? (
        <EmptyState icon="📢" title="No announcements" description="Create your first announcement above." />
      ) : (
        <div className="space-y-3">
          {announcements.map(ann => (
            <div key={ann._id} className={cn('card p-5 flex items-start gap-4', ann.isPinned && 'border-primary-500/20')}>
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0', TYPE_COLORS[ann.type]?.split(' ').slice(1).join(' ') || 'bg-dark-800')}>
                {ann.type === 'event' ? '🎉' : ann.type === 'maintenance' ? '🔧' : ann.type === 'offer' ? '💰' : '📢'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-bold text-sm">{ann.title}</h3>
                    {ann.isPinned && <Pin className="w-3.5 h-3.5 text-primary-400" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('badge border text-xs', TYPE_COLORS[ann.type] || 'text-dark-300 border-dark-600 bg-dark-800')}>
                      {ann.type}
                    </span>
                    <button
                      onClick={() => { if (confirm('Delete this announcement?')) deleteMutation.mutate(ann._id); }}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-dark-300 text-sm mt-1 leading-relaxed">{ann.content}</p>
                <p className="text-dark-500 text-xs mt-2">{formatDate(ann.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
