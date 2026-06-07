import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  Dumbbell, Plus, X, Edit2, Trash2, Users, ToggleLeft, ToggleRight,
  Calendar, Clock, UserMinus, ChevronDown, ChevronUp, AlertTriangle,
  CheckCircle2, XCircle, Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { coachingAPI, sportsAPI, employeesAPI } from '../../services/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatCurrency } from '../../lib/utils';
import { cn } from '../../lib/utils';
import type { Coaching, Sport } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────
type FormMode = 'create' | 'edit';

interface FormValues {
  title: string;
  description: string;
  sportId: string;
  trainerId: string;
  trainerName: string;
  schedule: string;
  duration: string;
  price: string;
  maxParticipants: string;
  startDate: string;
  endDate: string;
}

const DEFAULT_VALUES: FormValues = {
  title: '', description: '', sportId: '', trainerId: '', trainerName: '',
  schedule: '', duration: '', price: '0', maxParticipants: '10',
  startDate: '', endDate: '',
};

// ─── Participant row ──────────────────────────────────────────────────────────
const ParticipantRow: React.FC<{
  participant: any;
  onRemove: () => void;
  isRemoving: boolean;
}> = ({ participant, onRemove, isRemoving }) => (
  <div className="flex items-center justify-between py-2 border-b border-dark-700/40 last:border-0">
    <div>
      <p className="text-white text-xs font-medium">{participant.name}</p>
      <p className="text-dark-500 text-xs">{participant.email}</p>
      {participant.phone && <p className="text-dark-500 text-xs">{participant.phone}</p>}
    </div>
    <button
      onClick={() => {
        if (window.confirm(`Remove "${participant.name}" from this program?`)) onRemove();
      }}
      disabled={isRemoving}
      title="Remove participant"
      className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
    >
      <UserMinus className="w-3.5 h-3.5" />
    </button>
  </div>
);

// ─── Program card ─────────────────────────────────────────────────────────────
const ProgramCard: React.FC<{
  program: Coaching;
  onEdit: (p: Coaching) => void;
  onDelete: (p: Coaching) => void;
  onToggleActive: (p: Coaching) => void;
  onRemoveParticipant: (programId: string, userId: string) => void;
  onApproveParticipant: (program: Coaching, userId: string, userName: string) => void;
  onRejectParticipant: (programId: string, userId: string, userName: string) => void;
  isTogglingId: string | null;
  isDeletingId: string | null;
  isRemovingParticipant: boolean;
}> = ({ program, onEdit, onDelete, onToggleActive, onRemoveParticipant, onApproveParticipant, onRejectParticipant, isTogglingId, isDeletingId, isRemovingParticipant }) => {
  const [showParticipants, setShowParticipants] = useState(false);
  const [showPending, setShowPending] = useState(true);
  const sport = program.sportId as any;
  const participants = program.participants as any[];
  const pendingParticipants = (program.pendingParticipants || []) as any[];
  const isFull = participants.length >= program.maxParticipants;
  const isToggling = isTogglingId === program._id;
  const isDeleting = isDeletingId === program._id;

  return (
    <div className={cn(
      'card flex flex-col transition-all duration-200',
      !program.isActive && 'opacity-60 border-dark-700/30',
    )}>
      {/* Header */}
      <div className="p-5 pb-3 flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ backgroundColor: `${sport?.color}20`, border: `1px solid ${sport?.color}30` }}
        >
          {sport?.icon || '🏅'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-white font-bold text-sm leading-tight">{program.title}</h3>
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full border font-medium',
              program.isActive
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-dark-700 text-dark-400 border-dark-600',
            )}>
              {program.isActive ? 'Active' : 'Inactive'}
            </span>
            {isFull && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-medium">
                Full
              </span>
            )}
          </div>
          <p className="text-dark-400 text-xs mt-0.5">{sport?.name}</p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(program)}
            title="Edit program"
            className="p-1.5 rounded-lg text-dark-400 hover:text-primary-300 hover:bg-primary-500/10 transition-all"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onToggleActive(program)}
            disabled={isToggling}
            title={program.isActive ? 'Deactivate program' : 'Activate program'}
            className={cn(
              'p-1.5 rounded-lg transition-all disabled:opacity-40',
              program.isActive
                ? 'text-emerald-400 hover:bg-emerald-500/10'
                : 'text-dark-400 hover:text-emerald-400 hover:bg-emerald-500/10',
            )}
          >
            {program.isActive
              ? <ToggleRight className="w-4 h-4" />
              : <ToggleLeft className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onDelete(program)}
            disabled={isDeleting}
            title="Delete program"
            className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Description */}
      {program.description && (
        <p className="px-5 text-dark-300 text-xs leading-relaxed mb-3">{program.description}</p>
      )}

      {/* Details grid */}
      <div className="px-5 pb-3 space-y-1.5 text-xs border-t border-dark-700/50 pt-3 mt-auto">
        <div className="flex justify-between">
          <span className="text-dark-400">Trainer</span>
          <span className="text-dark-200">{program.trainerName}</span>
        </div>
        {program.schedule && (
          <div className="flex justify-between gap-3">
            <span className="text-dark-400 flex items-center gap-1"><Clock className="w-3 h-3" /> Schedule</span>
            <span className="text-dark-200 text-right">{program.schedule}</span>
          </div>
        )}
        {program.duration && (
          <div className="flex justify-between">
            <span className="text-dark-400">Duration</span>
            <span className="text-dark-200">{program.duration}</span>
          </div>
        )}
        {(program.startDate || program.endDate) && (
          <div className="flex justify-between gap-3">
            <span className="text-dark-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> Dates</span>
            <span className="text-dark-200 text-right text-xs">
              {program.startDate
                ? new Date(program.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'}
              {program.endDate
                ? ` → ${new Date(program.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                : ''}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-dark-400">Price</span>
          <span className="text-white font-medium">
            {program.price > 0 ? formatCurrency(program.price) : 'Free'}
          </span>
        </div>
      </div>

      {/* Pending Applications section */}
      {pendingParticipants.length > 0 && (
        <div className="border-t border-dark-700/50 bg-amber-500/5">
          <button
            onClick={() => setShowPending(!showPending)}
            className="w-full flex items-center justify-between px-5 py-3 text-xs hover:bg-dark-800/30 transition-all text-amber-400 font-semibold"
          >
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 animate-pulse text-amber-400" />
              Pending Applications ({pendingParticipants.length})
            </span>
            {showPending ? <ChevronUp className="w-3.5 h-3.5 text-amber-500" /> : <ChevronDown className="w-3.5 h-3.5 text-amber-500" />}
          </button>

          {showPending && (
            <div className="px-5 pb-4 space-y-2">
              {pendingParticipants.map((p: any) => (
                <div key={p._id} className="flex items-center justify-between py-2 border-b border-dark-700/40 last:border-0">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-white text-xs font-semibold truncate">{p.name}</p>
                    <p className="text-dark-400 text-[10px] truncate">{p.email}</p>
                    {p.phone && <p className="text-dark-500 text-[10px]">{p.phone}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => onApproveParticipant(program, p._id, p.name)}
                      title="Approve & record payment"
                      className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onRejectParticipant(program._id, p._id, p.name)}
                      title="Reject application"
                      className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Participants section */}
      <div className="border-t border-dark-700/50">
        <button
          onClick={() => setShowParticipants(!showParticipants)}
          className="w-full flex items-center justify-between px-5 py-3 text-xs hover:bg-dark-800/30 transition-all"
        >
          <span className="flex items-center gap-1.5 text-dark-300 font-medium">
            <Users className="w-3.5 h-3.5 text-primary-400" />
            Enrolled: {participants.length}/{program.maxParticipants}
            {isFull && <span className="text-red-400 ml-1">• Full</span>}
          </span>
          {showParticipants ? <ChevronUp className="w-3.5 h-3.5 text-dark-500" /> : <ChevronDown className="w-3.5 h-3.5 text-dark-500" />}
        </button>

        {showParticipants && (
          <div className="px-5 pb-4">
            {participants.length === 0 ? (
              <p className="text-dark-500 text-xs text-center py-3">No participants yet.</p>
            ) : (
              participants.map((p: any) => (
                <ParticipantRow
                  key={p._id}
                  participant={p}
                  onRemove={() => onRemoveParticipant(program._id, p._id)}
                  isRemoving={isRemovingParticipant}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
export const AdminCoachingPage: React.FC = () => {
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [showForm, setShowForm] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Coaching | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [approvalModal, setApprovalModal] = useState<{
    isOpen: boolean;
    program: Coaching | null;
    userId: string;
    userName: string;
    amount: string;
    paymentMethod: string;
  }>({
    isOpen: false,
    program: null,
    userId: '',
    userName: '',
    amount: '0',
    paymentMethod: 'cash',
  });

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['coaching-admin'],
    queryFn: () => coachingAPI.adminGetAll(),
  });
  const { data: sportsData } = useQuery({ queryKey: ['sports'], queryFn: () => sportsAPI.getAll() });
  const { data: employeesData } = useQuery({ queryKey: ['employees'], queryFn: () => employeesAPI.getAll() });

  const programs: Coaching[] = data?.data?.data || [];
  const sports: Sport[] = sportsData?.data?.data || [];
  const employees = employeesData?.data?.data || [];
  const coaches = employees.filter((emp: any) => emp.role === 'Coach' && emp.status === 'Active');

  const activePrograms = programs.filter(p => p.isActive);
  const inactivePrograms = programs.filter(p => !p.isActive);
  const displayedPrograms = showInactive ? programs : activePrograms;

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: DEFAULT_VALUES,
  });

  const watchedTrainerId = watch('trainerId');

  // ── Open create form ────────────────────────────────────────────────────────
  const openCreate = () => {
    setFormMode('create');
    setEditingProgram(null);
    reset(DEFAULT_VALUES);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Open edit form pre-populated ────────────────────────────────────────────
  const openEdit = (program: Coaching) => {
    setFormMode('edit');
    setEditingProgram(program);
    const sport = program.sportId as any;
    const tId = program.trainerId
      ? (typeof program.trainerId === 'object' ? (program.trainerId as any)._id : program.trainerId)
      : '';
    reset({
      title: program.title,
      description: program.description,
      sportId: sport?._id || (program.sportId as string),
      trainerId: tId,
      trainerName: program.trainerName,
      schedule: program.schedule || '',
      duration: program.duration || '',
      price: String(program.price),
      maxParticipants: String(program.maxParticipants),
      startDate: program.startDate ? program.startDate.split('T')[0] : '',
      endDate: program.endDate ? program.endDate.split('T')[0] : '',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingProgram(null);
    reset(DEFAULT_VALUES);
  };

  // ── Mutations ───────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: any) => coachingAPI.create(data),
    onSuccess: () => {
      toast.success('Coaching program created! 🎉');
      closeForm();
      queryClient.invalidateQueries({ queryKey: ['coaching-admin'] });
      queryClient.invalidateQueries({ queryKey: ['coaching'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Creation failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => coachingAPI.update(id, data),
    onSuccess: () => {
      toast.success('Program updated! ✅');
      closeForm();
      setTogglingId(null);
      queryClient.invalidateQueries({ queryKey: ['coaching-admin'] });
      queryClient.invalidateQueries({ queryKey: ['coaching'] });
    },
    onError: (err: any) => {
      setTogglingId(null);
      toast.error(err?.message || 'Update failed');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => coachingAPI.delete(id),
    onSuccess: (res: any) => {
      const isSoft = res?.data?.softDeleted;
      if (isSoft) {
        toast('Program deactivated (has enrolled participants).', { icon: '⚠️' });
      } else {
        toast.success('Program permanently deleted.');
      }
      setDeletingId(null);
      queryClient.invalidateQueries({ queryKey: ['coaching-admin'] });
      queryClient.invalidateQueries({ queryKey: ['coaching'] });
    },
    onError: (err: any) => {
      setDeletingId(null);
      toast.error(err?.message || 'Delete failed');
    },
  });

  const removeParticipantMutation = useMutation({
    mutationFn: ({ programId, userId }: { programId: string; userId: string }) =>
      coachingAPI.removeParticipant(programId, userId),
    onSuccess: () => {
      toast.success('Participant removed.');
      queryClient.invalidateQueries({ queryKey: ['coaching-admin'] });
      queryClient.invalidateQueries({ queryKey: ['coaching'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Removal failed'),
  });

  const approveMutation = useMutation({
    mutationFn: ({ programId, userId, amount, paymentMethod }: { programId: string; userId: string; amount: number; paymentMethod: string }) =>
      coachingAPI.approveParticipant(programId, userId, { amount, paymentMethod }),
    onSuccess: () => {
      toast.success('Application approved and payment recorded! 🎓');
      setApprovalModal(prev => ({ ...prev, isOpen: false }));
      queryClient.invalidateQueries({ queryKey: ['coaching-admin'] });
      queryClient.invalidateQueries({ queryKey: ['coaching'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] }); // refresh financial transactions list
    },
    onError: (err: any) => toast.error(err?.message || 'Approval failed'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ programId, userId }: { programId: string; userId: string }) =>
      coachingAPI.rejectParticipant(programId, userId),
    onSuccess: () => {
      toast.success('Application rejected.');
      queryClient.invalidateQueries({ queryKey: ['coaching-admin'] });
      queryClient.invalidateQueries({ queryKey: ['coaching'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Rejection failed'),
  });

  const handleApproveParticipantClick = (program: Coaching, userId: string, userName: string) => {
    setApprovalModal({
      isOpen: true,
      program,
      userId,
      userName,
      amount: String(program.price),
      paymentMethod: 'cash'
    });
  };

  const handleRejectParticipantClick = (programId: string, userId: string, userName: string) => {
    if (window.confirm(`Are you sure you want to reject ${userName}'s application?`)) {
      rejectMutation.mutate({ programId, userId });
    }
  };

  // ── Form submit ─────────────────────────────────────────────────────────────
  const onSubmit = (formData: FormValues) => {
    const payload = {
      ...formData,
      price: parseInt(formData.price) || 0,
      maxParticipants: parseInt(formData.maxParticipants) || 10,
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
      trainerId: formData.trainerId === 'custom' || !formData.trainerId ? null : formData.trainerId,
    };

    if (formMode === 'edit' && editingProgram) {
      updateMutation.mutate({ id: editingProgram._id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // ── Toggle active ───────────────────────────────────────────────────────────
  const handleToggleActive = (program: Coaching) => {
    const nextState = !program.isActive;
    const verb = nextState ? 'activate' : 'deactivate';
    if (!window.confirm(`${verb.charAt(0).toUpperCase() + verb.slice(1)} "${program.title}"?`)) return;
    setTogglingId(program._id);
    updateMutation.mutate({ id: program._id, data: { isActive: nextState } });
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = (program: Coaching) => {
    const participants = program.participants as any[];
    const msg = participants.length > 0
      ? `"${program.title}" has ${participants.length} enrolled participant(s). It will be deactivated instead of deleted. Continue?`
      : `Permanently delete "${program.title}"? This cannot be undone.`;
    if (!window.confirm(msg)) return;
    setDeletingId(program._id);
    deleteMutation.mutate(program._id);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="section-title flex items-center gap-2">
            <Dumbbell className="w-7 h-7 text-primary-400" />
            Coaching Programs
          </h1>
          <p className="section-subtitle">
            {activePrograms.length} active program{activePrograms.length !== 1 ? 's' : ''}
            {inactivePrograms.length > 0 && ` · ${inactivePrograms.length} inactive`}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {inactivePrograms.length > 0 && (
            <button
              onClick={() => setShowInactive(!showInactive)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all',
                showInactive
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  : 'border-dark-600 text-dark-400 hover:text-white hover:border-dark-500',
              )}
            >
              {showInactive ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {showInactive ? 'Showing all' : `Show inactive (${inactivePrograms.length})`}
            </button>
          )}
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Program
          </button>
        </div>
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <div className="card p-6 animate-slide-up border-primary-500/20">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-display font-bold text-white">
                {formMode === 'edit' ? '✏️ Edit Program' : '➕ Create Coaching Program'}
              </h2>
              {formMode === 'edit' && editingProgram && (
                <p className="text-dark-400 text-xs mt-0.5">Editing: {editingProgram.title}</p>
              )}
            </div>
            <button onClick={closeForm} className="p-1.5 text-dark-400 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="grid md:grid-cols-2 gap-4">
            {/* Title */}
            <div>
              <label className="label">Program Title *</label>
              <input
                {...register('title', { required: 'Title is required', minLength: { value: 3, message: 'Min 3 characters' } })}
                placeholder="e.g. Advanced Badminton Training"
                className={cn('input', errors.title && 'border-red-500/50')}
              />
              {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title.message}</p>}
            </div>

            {/* Sport */}
            <div>
              <label className="label">Sport *</label>
              <select
                {...register('sportId', { required: 'Sport is required' })}
                className={cn('input', errors.sportId && 'border-red-500/50')}
              >
                <option value="">Select a sport</option>
                {sports.map(s => (
                  <option key={s._id} value={s._id}>{s.icon} {s.name}</option>
                ))}
              </select>
              {errors.sportId && <p className="text-red-400 text-xs mt-1">{errors.sportId.message}</p>}
            </div>

            {/* Trainer Dropdown */}
            <div>
              <label className="label">Trainer Coach (Employee)</label>
              <select
                {...register('trainerId')}
                onChange={e => {
                  const val = e.target.value;
                  if (val && val !== 'custom') {
                    const selectedCoach = coaches.find((c: any) => c._id === val);
                    if (selectedCoach) {
                      setValue('trainerName', selectedCoach.name);
                    }
                  } else if (val === 'custom' || !val) {
                    setValue('trainerName', '');
                  }
                }}
                className="input"
              >
                <option value="">Select Coach from Roster</option>
                {coaches.map((c: any) => (
                  <option key={c._id} value={c._id}>{c.name} ({c.role})</option>
                ))}
                <option value="custom">Custom Coach (Not in Roster)...</option>
              </select>
            </div>

            {/* Custom Trainer Name */}
            {(!watchedTrainerId || watchedTrainerId === 'custom') && (
              <div>
                <label className="label">Custom Coach Name *</label>
                <input
                  {...register('trainerName', { required: 'Coach name is required' })}
                  placeholder="Coach full name"
                  className={cn('input', errors.trainerName && 'border-red-500/50')}
                />
                {errors.trainerName && <p className="text-red-400 text-xs mt-1">{errors.trainerName.message}</p>}
              </div>
            )}

            {/* Schedule */}
            <div>
              <label className="label">Schedule</label>
              <input
                {...register('schedule')}
                placeholder="e.g. Mon, Wed, Fri – 7:00 AM"
                className="input"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="label">Duration</label>
              <input
                {...register('duration')}
                placeholder="e.g. 4 weeks / 1 month"
                className="input"
              />
            </div>

            {/* Price */}
            <div>
              <label className="label">Price (₹)</label>
              <input
                {...register('price', {
                  min: { value: 0, message: 'Price cannot be negative' },
                })}
                type="number"
                min="0"
                className={cn('input', errors.price && 'border-red-500/50')}
              />
              {errors.price && <p className="text-red-400 text-xs mt-1">{errors.price.message}</p>}
            </div>

            {/* Max Participants */}
            <div>
              <label className="label">Max Participants</label>
              <input
                {...register('maxParticipants', {
                  min: { value: 1, message: 'Must be at least 1' },
                  max: { value: 500, message: 'Cannot exceed 500' },
                })}
                type="number"
                min="1"
                max="500"
                className={cn('input', errors.maxParticipants && 'border-red-500/50')}
              />
              {errors.maxParticipants && (
                <p className="text-red-400 text-xs mt-1">{errors.maxParticipants.message}</p>
              )}
              {formMode === 'edit' && editingProgram && (
                <p className="text-dark-500 text-xs mt-1">
                  Currently enrolled: {(editingProgram.participants as any[]).length}
                </p>
              )}
            </div>

            {/* Start Date */}
            <div>
              <label className="label">Start Date</label>
              <input
                {...register('startDate')}
                type="date"
                className="input"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="label">End Date</label>
              <input
                {...register('endDate')}
                type="date"
                className="input"
              />
            </div>

            {/* Description — full width */}
            <div className="md:col-span-2">
              <label className="label">Description</label>
              <textarea
                {...register('description')}
                rows={3}
                placeholder="Describe what participants will learn, requirements, equipment needed..."
                className="input resize-none"
              />
            </div>

            {/* Warning: enrolled users if editing */}
            {formMode === 'edit' && editingProgram && (editingProgram.participants as any[]).length > 0 && (
              <div className="md:col-span-2 flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-amber-300 text-xs">
                  This program has {(editingProgram.participants as any[]).length} enrolled participant(s).
                  Changes to schedule, price, or capacity will affect them. Lowering max participants
                  below current enrollment count will be rejected.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="md:col-span-2 flex gap-3">
              <button type="button" onClick={closeForm} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={isPending} className="btn-primary">
                {isPending
                  ? (formMode === 'edit' ? 'Saving...' : 'Creating...')
                  : (formMode === 'edit' ? '💾 Save Changes' : '✨ Create Program')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Programs list */}
      {isLoading ? (
        <LoadingSpinner className="py-20" text="Loading programs..." />
      ) : programs.length === 0 ? (
        <EmptyState icon="🎓" title="No coaching programs" description="Create your first program above." />
      ) : displayedPrograms.length === 0 ? (
        <EmptyState
          icon="💤"
          title="No active programs"
          description="All programs are inactive. Toggle 'Show inactive' to see them."
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedPrograms.map(program => (
            <ProgramCard
              key={program._id}
              program={program}
              onEdit={openEdit}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
              onRemoveParticipant={(programId, userId) =>
                removeParticipantMutation.mutate({ programId, userId })
              }
              onApproveParticipant={handleApproveParticipantClick}
              onRejectParticipant={handleRejectParticipantClick}
              isTogglingId={togglingId}
              isDeletingId={deletingId}
              isRemovingParticipant={removeParticipantMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Approval overlay modal */}
      {approvalModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="card max-w-md w-full p-6 space-y-4 border-emerald-500/20 bg-dark-950 animate-slide-up">
            <div className="flex items-center justify-between pb-2 border-b border-dark-800">
              <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-400" /> Approve Application
              </h3>
              <button
                onClick={() => setApprovalModal(prev => ({ ...prev, isOpen: false }))}
                className="p-1 rounded text-dark-400 hover:text-white hover:bg-dark-800 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <p className="text-dark-500 text-[10px] uppercase tracking-wider font-bold">Applicant</p>
              <p className="text-white text-sm font-semibold">{approvalModal.userName}</p>
            </div>

            <div className="space-y-1">
              <p className="text-dark-500 text-[10px] uppercase tracking-wider font-bold">Program</p>
              <p className="text-white text-sm font-semibold">{approvalModal.program?.title}</p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (approvalModal.program) {
                  approveMutation.mutate({
                    programId: approvalModal.program._id,
                    userId: approvalModal.userId,
                    amount: parseFloat(approvalModal.amount) || 0,
                    paymentMethod: approvalModal.paymentMethod,
                  });
                }
              }}
              className="space-y-4 pt-2"
            >
              <div>
                <label className="label">Approved Enrollment Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={approvalModal.amount}
                  onChange={(e) => setApprovalModal(prev => ({ ...prev, amount: e.target.value }))}
                  className="input"
                  placeholder="Pre-populated price"
                />
              </div>

              <div>
                <label className="label">Payment Method</label>
                <select
                  value={approvalModal.paymentMethod}
                  onChange={(e) => setApprovalModal(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="input"
                >
                  <option value="cash">💵 Cash</option>
                  <option value="card">💳 Card</option>
                  <option value="upi">📱 UPI</option>
                  <option value="bank_transfer">🏦 Bank Transfer</option>
                  <option value="other">⚙️ Other</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setApprovalModal(prev => ({ ...prev, isOpen: false }))}
                  className="btn-secondary w-full"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={approveMutation.isPending}
                  className="btn-primary w-full flex items-center justify-center gap-1.5"
                >
                  {approveMutation.isPending ? 'Approving...' : 'Confirm Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
