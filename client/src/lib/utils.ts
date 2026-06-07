import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, isValid } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, fmt = 'MMM d, yyyy') {
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return 'Invalid date';
    return format(d, fmt);
  } catch {
    return String(date);
  }
}

export function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export function getStatusColor(status: string) {
  switch (status) {
    case 'confirmed': return 'badge-confirmed';
    case 'cancelled': return 'badge-cancelled';
    case 'completed': return 'badge-completed';
    case 'pending': return 'badge-pending';
    default: return 'badge-pending';
  }
}

export function getSportEmoji(name: string) {
  const map: Record<string, string> = {
    'Swimming': '🏊',
    'Gym': '💪',
    'Badminton': '🏸',
    'Box Cricket': '🏏',
    'Box Football': '⚽',
  };
  return map[name] || '🏅';
}

export function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function generateDateRange(days = 14) {
  const dates = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}
