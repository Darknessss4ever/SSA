import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { 
  Settings, Plus, Lock, Unlock, Trash2, ChevronDown, 
  Edit, Download, X, AlertTriangle, CheckSquare 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { slotsAPI, sportsAPI } from '../../services/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate, formatTime, generateDateRange, downloadCSV } from '../../lib/utils';
import { cn } from '../../lib/utils';
import type { Slot, Sport } from '../../types';

export const AdminSlotsPage: React.FC = () => {
  const [selectedSport, setSelectedSport] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showGenerate, setShowGenerate] = useState(false);
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
  
  // Modals state
  const [editingSlot, setEditingSlot] = useState<Slot | null>(null);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: sportsData } = useQuery({ queryKey: ['sports'], queryFn: () => sportsAPI.getAll() });
  const sports: Sport[] = sportsData?.data?.data || [];

  const { data: slotsData, isLoading } = useQuery({
    queryKey: ['admin-slots', selectedSport, selectedDate],
    queryFn: () => slotsAPI.getAll({ sportId: selectedSport || undefined, date: selectedDate }),
    enabled: true,
  });

  const slots: Slot[] = slotsData?.data?.data || [];

  // Generator form
  const { register, handleSubmit, watch, reset } = useForm({
    defaultValues: { 
      sportId: '', 
      dateMode: 'single', 
      date: new Date().toISOString().split('T')[0], 
      startDate: new Date().toISOString().split('T')[0], 
      endDate: new Date().toISOString().split('T')[0], 
      startTime: '06:00', 
      endTime: '22:00', 
      duration: '60', 
      capacity: '1', 
      price: '0' 
    },
  });

  const watchDateMode = watch('dateMode');

  // Single edit state fields
  const [editDate, setEditDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editCapacity, setEditCapacity] = useState(1);
  const [editPrice, setEditPrice] = useState(0);
  const [editIsBlocked, setEditIsBlocked] = useState(false);
  const [editBlockReason, setEditBlockReason] = useState('');

  // Bulk edit state fields
  const [bulkCapacity, setBulkCapacity] = useState('');
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkBlockStatus, setBulkBlockStatus] = useState('no-change'); // 'no-change', 'block', 'unblock'
  const [bulkBlockReason, setBulkBlockReason] = useState('Maintenance');

  const generateMutation = useMutation({
    mutationFn: (data: any) => slotsAPI.generate(data),
    onSuccess: (res) => {
      toast.success(`Generated ${res.data.count} slots!`);
      setShowGenerate(false);
      reset();
      setSelectedSlotIds([]);
      queryClient.invalidateQueries({ queryKey: ['admin-slots'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Generation failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => slotsAPI.update(id, data),
    onSuccess: () => {
      toast.success('Slot updated successfully');
      setEditingSlot(null);
      queryClient.invalidateQueries({ queryKey: ['admin-slots'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Update failed'),
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
    onSuccess: (_, id) => {
      toast.success('Slot deleted');
      setSelectedSlotIds(prev => prev.filter(x => x !== id));
      queryClient.invalidateQueries({ queryKey: ['admin-slots'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Delete failed'),
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: (data: any) => slotsAPI.bulkUpdate(data),
    onSuccess: () => {
      toast.success('Selected slots updated successfully');
      setIsBulkEditOpen(false);
      setSelectedSlotIds([]);
      queryClient.invalidateQueries({ queryKey: ['admin-slots'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Bulk update failed'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (data: any) => slotsAPI.bulkDelete(data),
    onSuccess: (res: any) => {
      toast.success(res?.data?.message || 'Selected slots deleted');
      setSelectedSlotIds([]);
      queryClient.invalidateQueries({ queryKey: ['admin-slots'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Bulk delete failed'),
  });

  const onGenerate = (data: any) => {
    const payload: any = {
      sportId: data.sportId,
      startTime: data.startTime,
      endTime: data.endTime,
      duration: data.duration,
      capacity: data.capacity,
      price: data.price
    };

    if (data.dateMode === 'range') {
      payload.startDate = data.startDate;
      payload.endDate = data.endDate;
    } else {
      payload.date = data.date;
    }

    generateMutation.mutate(payload);
  };

  const handleOpenEdit = (slot: Slot) => {
    setEditingSlot(slot);
    setEditDate(slot.date);
    setEditStartTime(slot.startTime);
    setEditEndTime(slot.endTime);
    setEditCapacity(slot.capacity);
    setEditPrice(slot.price);
    setEditIsBlocked(slot.isBlocked);
    setEditBlockReason(slot.blockReason || '');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;
    updateMutation.mutate({
      id: editingSlot._id,
      data: {
        date: editDate,
        startTime: editStartTime,
        endTime: editEndTime,
        capacity: editCapacity,
        price: editPrice,
        isBlocked: editIsBlocked,
        blockReason: editBlockReason
      }
    });
  };

  const handleBulkEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSlotIds.length === 0) return;

    const updates: any = {};
    if (bulkCapacity !== '') updates.capacity = parseInt(bulkCapacity);
    if (bulkPrice !== '') updates.price = parseInt(bulkPrice);
    if (bulkBlockStatus === 'block') {
      updates.isBlocked = true;
      updates.blockReason = bulkBlockReason;
    } else if (bulkBlockStatus === 'unblock') {
      updates.isBlocked = false;
    }

    bulkUpdateMutation.mutate({ ids: selectedSlotIds, updates });
  };

  const handleBulkDelete = () => {
    if (selectedSlotIds.length === 0) return;
    if (window.confirm(`Are you sure you want to delete the ${selectedSlotIds.length} selected slots? Slots with active confirmed bookings will be skipped.`)) {
      bulkDeleteMutation.mutate({ ids: selectedSlotIds });
    }
  };

  const handleSelectSlot = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedSlotIds(prev => [...prev, id]);
    } else {
      setSelectedSlotIds(prev => prev.filter(x => x !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSlotIds(slots.map(s => s._id));
    } else {
      setSelectedSlotIds([]);
    }
  };

  const handleExportCSV = () => {
    if (slots.length === 0) {
      toast.error('No slots to export');
      return;
    }
    const headers = [
      { key: 'sportId.name', label: 'Sport' },
      { key: 'date', label: 'Date' },
      { key: 'startTime', label: 'Start Time' },
      { key: 'endTime', label: 'End Time' },
      { key: 'capacity', label: 'Capacity' },
      { key: 'bookedCount', label: 'Booked' },
      { key: 'price', label: 'Price' },
      { key: 'isBlocked', label: 'Blocked' },
      { key: 'blockReason', label: 'Block Reason' }
    ];
    downloadCSV(slots, headers, `slots_${selectedDate}.csv`);
    toast.success('Slots roster exported successfully! 📥');
  };

  const dates = generateDateRange(14);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="section-title flex items-center gap-2">
            <Settings className="w-7 h-7 text-primary-400" />
            Slot Management
          </h1>
          <p className="section-subtitle">Create, block, edit, and manage time slots.</p>
        </div>
        <div className="flex gap-2">
          {slots.length > 0 && (
            <button onClick={handleExportCSV} className="btn btn-secondary flex items-center gap-2">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          )}
          <button onClick={() => setShowGenerate(!showGenerate)} className="btn btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Generate Slots
            <ChevronDown className={cn('w-4 h-4 transition-transform', showGenerate && 'rotate-180')} />
          </button>
        </div>
      </div>

      {/* Generate Form */}
      {showGenerate && (
        <div className="card p-6 animate-slide-up space-y-4">
          <h2 className="text-base font-display font-bold text-white mb-2">Bulk Slot Generator</h2>
          <form onSubmit={handleSubmit(onGenerate)} className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="label">Sport *</label>
              <select {...register('sportId')} required className="input">
                <option value="">Select sport</option>
                {sports.map(s => <option key={s._id} value={s._id}>{s.icon} {s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date Mode</label>
              <select {...register('dateMode')} className="input">
                <option value="single">Single Date</option>
                <option value="range">Date Range</option>
              </select>
            </div>
            
            {watchDateMode === 'single' ? (
              <div>
                <label className="label">Date *</label>
                <input {...register('date')} type="date" required className="input" />
              </div>
            ) : (
              <>
                <div>
                  <label className="label">Start Date *</label>
                  <input {...register('startDate')} type="date" required className="input" />
                </div>
                <div>
                  <label className="label">End Date *</label>
                  <input {...register('endDate')} type="date" required className="input" />
                </div>
              </>
            )}

            <div>
              <label className="label">Start Time *</label>
              <input {...register('startTime')} type="time" required className="input" />
            </div>
            <div>
              <label className="label">End Time *</label>
              <input {...register('endTime')} type="time" required className="input" />
            </div>
            <div>
              <label className="label">Duration</label>
              <select {...register('duration')} className="input">
                <option value="30">30 min</option>
                <option value="60">1 hour</option>
                <option value="90">90 min</option>
                <option value="120">2 hours</option>
              </select>
            </div>
            <div>
              <label className="label">Capacity per slot *</label>
              <input {...register('capacity')} type="number" min="1" required className="input" />
            </div>
            <div>
              <label className="label">Price (₹) *</label>
              <input {...register('price')} type="number" min="0" required className="input" />
            </div>
            
            <div className="md:col-span-3 flex justify-end gap-2 pt-2">
              <button 
                type="button" 
                onClick={() => { setShowGenerate(false); reset(); }}
                className="px-4 py-2.5 rounded-xl text-dark-300 hover:text-white transition-all text-sm font-semibold"
              >
                Cancel
              </button>
              <button type="submit" disabled={generateMutation.isPending} className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm">
                {generateMutation.isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                Generate Slots
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters & Bulk Action Banner */}
      <div className="space-y-4">
        {selectedSlotIds.length > 0 && (
          <div className="bg-primary-500/10 border border-primary-500/25 p-4 rounded-xl flex items-center justify-between shadow-glow animate-slide-up">
            <div className="flex items-center gap-2 text-white text-sm font-semibold">
              <CheckSquare className="w-4.5 h-4.5 text-primary-400" />
              <span>{selectedSlotIds.length} slots selected</span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setBulkCapacity('');
                  setBulkPrice('');
                  setBulkBlockStatus('no-change');
                  setIsBulkEditOpen(true);
                }} 
                className="px-3.5 py-2 rounded-lg bg-dark-900 border border-dark-700/50 hover:bg-dark-850 hover:border-dark-600 text-white text-xs font-semibold flex items-center gap-1 transition-all"
              >
                <Edit className="w-3.5 h-3.5" /> Bulk Edit
              </button>
              <button 
                onClick={handleBulkDelete}
                className="px-3.5 py-2 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-1 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" /> Bulk Delete
              </button>
              <button 
                onClick={() => setSelectedSlotIds([])}
                className="px-3.5 py-2 rounded-lg text-dark-400 hover:text-white text-xs font-semibold"
              >
                Deselect
              </button>
            </div>
          </div>
        )}

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
      </div>

      {/* Slots Grid */}
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
                  <th className="table-head w-12 text-center">
                    <input 
                      type="checkbox" 
                      className="rounded bg-dark-950 border-dark-700/50 text-primary-500 focus:ring-0 focus:ring-offset-0"
                      checked={slots.length > 0 && selectedSlotIds.length === slots.length}
                      onChange={e => handleSelectAll(e.target.checked)}
                    />
                  </th>
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
                  const isChecked = selectedSlotIds.includes(slot._id);
                  return (
                    <tr key={slot._id} className={cn(
                      "border-b border-dark-800/50 hover:bg-dark-800/20 transition-colors",
                      isChecked && "bg-primary-500/5 hover:bg-primary-500/5"
                    )}>
                      <td className="table-cell text-center">
                        <input 
                          type="checkbox"
                          className="rounded bg-dark-950 border-dark-700/50 text-primary-500 focus:ring-0 focus:ring-offset-0"
                          checked={isChecked}
                          onChange={e => handleSelectSlot(slot._id, e.target.checked)}
                        />
                      </td>
                      <td className="table-cell">
                        <span className="flex items-center gap-1.5">
                          <span>{sport?.icon}</span>
                          <span className="text-dark-200 text-sm font-semibold">{sport?.name}</span>
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
                            onClick={() => handleOpenEdit(slot)}
                            className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-all"
                            title="Edit Details"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => blockMutation.mutate({ id: slot._id, isBlocked: !slot.isBlocked, blockReason: slot.isBlocked ? '' : 'Maintenance' })}
                            className={cn('p-1.5 rounded-lg transition-all', slot.isBlocked ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-amber-400 hover:bg-amber-500/10')}
                            title={slot.isBlocked ? 'Unblock' : 'Block'}
                          >
                            {slot.isBlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => { if (confirm('Delete this slot?')) deleteMutation.mutate(slot._id); }}
                            className="p-1.5 rounded-lg text-dark-400 hover:bg-red-500/10 transition-all"
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

      {/* Modal - Individual Edit Slot */}
      {editingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-dark-900 border border-dark-700/50 w-full max-w-md rounded-2xl overflow-hidden shadow-glow">
            <div className="px-6 py-4 border-b border-dark-700/50 flex items-center justify-between">
              <h3 className="text-lg font-display font-bold text-white">Edit Time Slot</h3>
              <button onClick={() => setEditingSlot(null)} className="text-dark-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-dark-400 font-semibold mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                  className="w-full bg-dark-950 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-dark-400 font-semibold mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={editStartTime}
                    onChange={e => setEditStartTime(e.target.value)}
                    className="w-full bg-dark-950 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-dark-400 font-semibold mb-1">End Time *</label>
                  <input
                    type="time"
                    required
                    value={editEndTime}
                    onChange={e => setEditEndTime(e.target.value)}
                    className="w-full bg-dark-950 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-dark-400 font-semibold mb-1">Slot Capacity *</label>
                  <input
                    type="number"
                    required
                    min={editingSlot.bookedCount}
                    value={editCapacity}
                    onChange={e => setEditCapacity(parseInt(e.target.value) || 0)}
                    className="w-full bg-dark-950 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 text-sm"
                  />
                  <p className="text-[10px] text-dark-500 mt-1">Booked count is {editingSlot.bookedCount}</p>
                </div>
                <div>
                  <label className="block text-xs text-dark-400 font-semibold mb-1">Price (INR) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editPrice}
                    onChange={e => setEditPrice(parseInt(e.target.value) || 0)}
                    className="w-full bg-dark-950 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 text-sm"
                  />
                </div>
              </div>

              <div className="pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="editIsBlocked"
                    checked={editIsBlocked}
                    onChange={e => setEditIsBlocked(e.target.checked)}
                    className="rounded bg-dark-950 border-dark-700/50 text-primary-500 focus:ring-0 focus:ring-offset-0"
                  />
                  <label htmlFor="editIsBlocked" className="text-sm font-semibold text-white">Block Time Slot</label>
                </div>
              </div>

              {editIsBlocked && (
                <div className="animate-slide-up">
                  <label className="block text-xs text-dark-400 font-semibold mb-1">Block Reason</label>
                  <input
                    type="text"
                    value={editBlockReason}
                    onChange={e => setEditBlockReason(e.target.value)}
                    placeholder="e.g. Pool Maintenance"
                    className="w-full bg-dark-950 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 text-sm"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-dark-700/50 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSlot(null)}
                  className="px-4 py-2.5 rounded-xl text-dark-300 hover:text-white transition-all text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="btn btn-primary px-5 py-2.5 rounded-xl text-sm"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Bulk Edit Slots */}
      {isBulkEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-dark-900 border border-dark-700/50 w-full max-w-md rounded-2xl overflow-hidden shadow-glow">
            <div className="px-6 py-4 border-b border-dark-700/50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-display font-bold text-white">Bulk Edit Slots</h3>
                <p className="text-xs text-dark-400">Modifying {selectedSlotIds.length} selected slots</p>
              </div>
              <button onClick={() => setIsBulkEditOpen(false)} className="text-dark-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleBulkEditSubmit} className="p-6 space-y-4">
              <div className="bg-primary-500/5 border border-primary-500/10 p-3 rounded-xl flex items-start gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-dark-350">
                  Only fill fields you want to update in bulk. Blank fields will remain unchanged.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-dark-400 font-semibold mb-1">Set Capacity</label>
                  <input
                    type="number"
                    min={1}
                    value={bulkCapacity}
                    onChange={e => setBulkCapacity(e.target.value)}
                    placeholder="Keep existing"
                    className="w-full bg-dark-950 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-dark-400 font-semibold mb-1">Set Price (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={bulkPrice}
                    onChange={e => setBulkPrice(e.target.value)}
                    placeholder="Keep existing"
                    className="w-full bg-dark-950 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-dark-400 font-semibold mb-1">Block / Unblock Status</label>
                <select
                  value={bulkBlockStatus}
                  onChange={e => setBulkBlockStatus(e.target.value)}
                  className="w-full bg-dark-950 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 text-sm"
                >
                  <option value="no-change">No Change</option>
                  <option value="block">Block All Selected</option>
                  <option value="unblock">Unblock All Selected</option>
                </select>
              </div>

              {bulkBlockStatus === 'block' && (
                <div className="animate-slide-up">
                  <label className="block text-xs text-dark-400 font-semibold mb-1">Block Reason</label>
                  <input
                    type="text"
                    value={bulkBlockReason}
                    onChange={e => setBulkBlockReason(e.target.value)}
                    placeholder="e.g. Maintenance Work"
                    className="w-full bg-dark-950 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 text-sm"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-dark-700/50 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkEditOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-dark-300 hover:text-white transition-all text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkUpdateMutation.isPending}
                  className="btn btn-primary px-5 py-2.5 rounded-xl text-sm"
                >
                  {bulkUpdateMutation.isPending ? 'Updating...' : 'Apply Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
