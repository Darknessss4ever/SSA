import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users, Calendar, ArrowRight,
  Activity, CheckCircle, LayoutDashboard
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import { Skeleton } from '../../components/ui/LoadingSpinner';
import { formatDate, formatTime, getStatusColor } from '../../lib/utils';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { DashboardStats, Booking } from '../../types';

const StatCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  sub?: string;
}> = ({ label, value, icon, color, sub }) => (
  <div className="stat-card group hover:border-dark-600/50 transition-colors">
    <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center mb-2`}>
      {icon}
    </div>
    <p className="text-3xl font-display font-black text-white">{value}</p>
    <p className="text-dark-400 text-sm">{label}</p>
    {sub && <p className="text-dark-500 text-xs">{sub}</p>}
  </div>
);

export const AdminDashboard: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminAPI.getDashboard(),
    refetchInterval: 30000,
  });

  const stats: DashboardStats = data?.data?.data;
  const recentBookings: Booking[] = stats?.recentBookings || [];
  const chartData = stats?.bookingsBySport || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-36" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="section-title flex items-center gap-2">
          <LayoutDashboard className="w-7 h-7 text-primary-400" />
          Admin Dashboard
        </h1>
        <p className="section-subtitle">Overview of ShreeHari Sports Arena operations.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Users"
          value={stats?.totalUsers || 0}
          icon={<Users className="w-6 h-6 text-primary-400" />}
          color="bg-primary-500/10"
          sub="Registered members"
        />
        <StatCard
          label="Today's Bookings"
          value={stats?.todayBookings || 0}
          icon={<Activity className="w-6 h-6 text-emerald-400" />}
          color="bg-emerald-500/10"
          sub="Booked today"
        />
        <StatCard
          label="Active Bookings"
          value={stats?.activeBookings || 0}
          icon={<CheckCircle className="w-6 h-6 text-cyan-400" />}
          color="bg-cyan-500/10"
          sub="Confirmed slots"
        />
        <StatCard
          label="Total Bookings"
          value={stats?.totalBookings || 0}
          icon={<Calendar className="w-6 h-6 text-amber-400" />}
          color="bg-amber-500/10"
          sub={`${stats?.cancelledBookings || 0} cancelled`}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent bookings */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-display font-bold text-white">Recent Bookings</h2>
            <Link to="/admin/bookings" className="text-primary-400 text-sm hover:text-primary-300 flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentBookings.length === 0 ? (
            <p className="text-dark-400 text-center py-8">No bookings yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-700/50">
                    <th className="table-head">User</th>
                    <th className="table-head">Sport</th>
                    <th className="table-head">Date / Time</th>
                    <th className="table-head">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.map(booking => {
                    const user = booking.userId as any;
                    const sport = booking.sportId as any;
                    const slot = booking.slotId as any;
                    return (
                      <tr key={booking._id} className="border-b border-dark-800/50 hover:bg-dark-800/30 transition-colors">
                        <td className="table-cell">
                          <div>
                            <p className="text-white text-sm font-medium">{user?.name}</p>
                            <p className="text-dark-500 text-xs">{user?.email}</p>
                          </div>
                        </td>
                        <td className="table-cell">
                          <span className="flex items-center gap-1.5">
                            <span>{sport?.icon}</span>
                            <span className="text-dark-200">{sport?.name}</span>
                          </span>
                        </td>
                        <td className="table-cell">
                          <p className="text-dark-200 text-sm">{slot?.date ? formatDate(slot.date) : 'N/A'}</p>
                          <p className="text-dark-500 text-xs">{slot?.startTime ? formatTime(slot.startTime) : ''}</p>
                        </td>
                        <td className="table-cell">
                          <span className={getStatusColor(booking.status)}>{booking.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Chart + Quick stats */}
        <div className="space-y-6">
          {/* Pie chart */}
          <div className="card p-6">
            <h2 className="text-base font-display font-bold text-white mb-4">Bookings by Sport</h2>
            {chartData.length === 0 ? (
              <p className="text-dark-400 text-sm text-center py-6">No data yet</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" outerRadius={70} dataKey="count">
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color || '#6366f1'} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      labelStyle={{ color: '#94a3b8' }}
                      itemStyle={{ color: '#e2e8f0' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {chartData.map(entry => (
                    <div key={entry._id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-dark-300">{entry.sportName}</span>
                      </div>
                      <span className="text-white font-medium">{entry.count}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Quick stats */}
          <div className="card p-6 space-y-4">
            <h2 className="text-base font-display font-bold text-white">Facility Stats</h2>
            {[
              { label: 'Total Sports', value: stats?.totalSports || 0, icon: '🏅' },
              { label: 'Total Slots', value: stats?.totalSlots || 0, icon: '🕐' },
              { label: 'Blocked Slots', value: stats?.blockedSlots || 0, icon: '🚫' },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{s.icon}</span>
                  <span className="text-dark-300 text-sm">{s.label}</span>
                </div>
                <span className="text-white font-bold">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
