// Types for ShreeHari Sports Arena

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  phone?: string;
  avatar?: string;
  subscriptionId?: string | Subscription;
  isActive: boolean;
  createdAt: string;
}

export interface Sport {
  _id: string;
  name: string;
  description: string;
  image?: string;
  icon: string;
  color: string;
  pricePerSlot: number;
  maxCapacity: number;
  duration: number;
  features: string[];
  isActive: boolean;
}

export interface Slot {
  _id: string;
  sportId: string | Sport;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  isBlocked: boolean;
  blockReason?: string;
  price: number;
  isAvailable?: boolean;
}

export interface Booking {
  _id: string;
  userId: string | User;
  sportId: string | Sport;
  slotId: string | Slot;
  status: 'confirmed' | 'cancelled' | 'completed' | 'pending' | 'pending_payment' | 'no_show';
  isRecurring: boolean;
  recurringPattern?: 'daily' | 'weekly' | 'monthly' | null;
  recurringEndDate?: string;
  paymentStatus: 'free' | 'paid' | 'pending' | 'subscription';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  _id: string;
  userId: string;
  planId?: string | SubscriptionPlan;
  type: 'individual' | 'combo';
  sportsIncluded: string[] | Sport[];
  validFrom: string;
  validTo: string;
  status: 'active' | 'expired' | 'cancelled';
  price: number;
}

export interface DurationTier {
  label: string;
  days: number;
  price: number;
  userSelectsTime: boolean;
}

export interface SubscriptionPlan {
  _id: string;
  name: string;
  description: string;
  type: 'individual' | 'combo';
  sportsIncluded: string[] | Sport[];
  durations: DurationTier[];
  allowedPerDay: number;
  features: string[];
  isActive: boolean;
  isPopular: boolean;
  color: string;
  createdAt: string;
}

export interface Coaching {
  _id: string;
  title: string;
  description: string;
  sportId: string | Sport;
  trainerName: string;
  trainerImage?: string;
  trainerId?: string | Employee;
  schedule: string;
  duration: string;
  price: number;
  maxParticipants: number;
  participants: string[] | User[];
  pendingParticipants?: string[] | User[];
  isActive: boolean;
  startDate?: string;
  endDate?: string;
}

export interface Tournament {
  _id: string;
  title: string;
  description: string;
  sportId: string | Sport;
  date: string;
  registrationDeadline?: string;
  maxParticipants: number;
  participants: string[] | User[];
  entryFee: number;
  prize: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  image?: string;
}

export interface Announcement {
  _id: string;
  title: string;
  content: string;
  type: 'event' | 'maintenance' | 'offer' | 'general';
  isPinned: boolean;
  expiresAt?: string;
  createdBy?: User;
  createdAt: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalBookings: number;
  activeBookings: number;
  cancelledBookings: number;
  totalSports: number;
  totalSlots: number;
  blockedSlots: number;
  todayBookings: number;
  bookingsBySport: { _id: string; sportName: string; count: number; color: string }[];
  recentBookings: Booking[];
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  total?: number;
  page?: number;
  pages?: number;
}

export interface AuthData {
  user: User;
  token: string;
  subscription?: Subscription | null;
}

export interface Shift {
  startTime: string;
  endTime: string;
  name?: string;
}

export interface Employee {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  salary: number;
  joiningDate: string;
  status: 'Active' | 'Inactive';
  notes?: string;
  shifts?: Shift[];
  createdAt: string;
}
