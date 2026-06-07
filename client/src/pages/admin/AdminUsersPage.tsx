import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Users, Search, UserCheck, UserX, Star, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI, sportsAPI } from '../../services/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate, getInitials } from '../../lib/utils';
import { cn } from '../../lib/utils';
import type { User, Sport } from '../../types';

export const AdminUsersPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showSubModal, setShowSubModal] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search],
    queryFn: () => adminAPI.getUsers({ search: search || undefined, limit: 50 }),
    refetchInterval: 30000,
  });

  const { data: sportsData } = useQuery({ queryKey: ['sports'], queryFn: () => sportsAPI.getAll() });

  const users: User[] = data?.data?.data || [];
  const sports: Sport[] = sportsData?.data?.data || [];

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => adminAPI.updateUser(id, updates),
    onSuccess: () => {
      toast.success('User updated');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Update failed'),
  });

  const subMutation = useMutation({
    mutationFn: (data: any) => adminAPI.assignSubscription(data),
    onSuccess: () => {
      toast.success('Subscription assigned!');
      setShowSubModal(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Assignment failed'),
  });

  const { register, handleSubmit, watch, reset } = useForm({
    defaultValues: {
      type: 'individual',
      sportsIncluded: [] as string[],
      validFrom: new Date().toISOString().split('T')[0],
      validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      price: '0',
    },
  });

  const subType = watch('type');

  const onAssignSub = (formData: any) => {
    if (!selectedUser) return;
    subMutation.mutate({
      userId: selectedUser._id,
      type: formData.type,
      sportsIncluded: formData.type === 'combo' ? sports.map(s => s._id) : formData.sportsIncluded,
      validFrom: formData.validFrom,
      validTo: formData.validTo,
      price: parseInt(formData.price),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title flex items-center gap-2">
          <Users className="w-7 h-7 text-primary-400" />
          User Management
        </h1>
        <p className="section-subtitle">{data?.data?.total || 0} registered users</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingSpinner className="py-20" text="Loading users..." />
      ) : users.length === 0 ? (
        <EmptyState icon="👥" title="No users found" />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700/50">
                  <th className="table-head">User</th>
                  <th className="table-head">Phone</th>
                  <th className="table-head">Subscription</th>
                  <th className="table-head">Status</th>
                  <th className="table-head">Joined</th>
                  <th className="table-head">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => {
                  const sub = user.subscriptionId as any;
                  const isSubActive = sub?.status === 'active' && new Date(sub?.validTo) >= new Date();
                  return (
                    <tr key={user._id} className="border-b border-dark-800/50 hover:bg-dark-800/20 transition-colors">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {getInitials(user.name)}
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">{user.name}</p>
                            <p className="text-dark-500 text-xs">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell text-dark-300 text-sm">{user.phone || '—'}</td>
                      <td className="table-cell">
                        {isSubActive ? (
                          <div>
                            <span className="badge bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <Star className="w-3 h-3" /> {sub.type}
                            </span>
                            <p className="text-dark-500 text-xs mt-0.5">Until {formatDate(sub.validTo)}</p>
                          </div>
                        ) : (
                          <span className="text-dark-500 text-xs">None</span>
                        )}
                      </td>
                      <td className="table-cell">
                        <span className={cn('badge', user.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20')}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="table-cell text-dark-400 text-sm">{formatDate(user.createdAt)}</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setSelectedUser(user); setShowSubModal(true); reset(); }}
                            className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-all"
                            title="Assign subscription"
                          >
                            <Star className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => updateMutation.mutate({ id: user._id, updates: { isActive: !user.isActive } })}
                            className={cn('p-1.5 rounded-lg transition-all', user.isActive ? 'text-red-400 hover:bg-red-500/10' : 'text-emerald-400 hover:bg-emerald-500/10')}
                            title={user.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
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

      {/* Subscription modal */}
      {showSubModal && selectedUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card max-w-md w-full p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-display font-bold text-white">Assign Subscription</h2>
              <button onClick={() => setShowSubModal(false)} className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-dark-800/50 rounded-xl p-3 mb-5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold">
                {getInitials(selectedUser.name)}
              </div>
              <div>
                <p className="text-white font-medium text-sm">{selectedUser.name}</p>
                <p className="text-dark-400 text-xs">{selectedUser.email}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onAssignSub)} className="space-y-4">
              <div>
                <label className="label">Subscription Type</label>
                <select {...register('type')} className="input">
                  <option value="individual">Individual Sport</option>
                  <option value="combo">Combo (All Sports)</option>
                </select>
              </div>

              {subType === 'individual' && (
                <div>
                  <label className="label">Select Sports</label>
                  <div className="grid grid-cols-2 gap-2">
                    {sports.map(s => (
                      <label key={s._id} className="flex items-center gap-2 p-2.5 rounded-lg bg-dark-800 border border-dark-700 cursor-pointer hover:border-dark-600 transition-colors">
                        <input {...register('sportsIncluded')} type="checkbox" value={s._id} className="accent-primary-500" />
                        <span className="text-sm text-dark-200">{s.icon} {s.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Valid From</label>
                  <input {...register('validFrom')} type="date" className="input" />
                </div>
                <div>
                  <label className="label">Valid Till</label>
                  <input {...register('validTo')} type="date" className="input" />
                </div>
              </div>

              <div>
                <label className="label">Price (₹)</label>
                <input {...register('price')} type="number" min="0" className="input" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowSubModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={subMutation.isPending} className="btn-primary flex-1">
                  {subMutation.isPending ? 'Assigning...' : 'Assign Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
