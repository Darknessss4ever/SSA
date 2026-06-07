import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { ProtectedRoute } from './components/ui/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';

import { UserDashboard } from './pages/user/UserDashboard';
import { BookingPage } from './pages/user/BookingPage';
import { MyBookingsPage } from './pages/user/MyBookingsPage';
import { CoachingPage } from './pages/user/CoachingPage';
import { TournamentsPage } from './pages/user/TournamentsPage';
import { CommunityPage } from './pages/user/CommunityPage';
import { SubscriptionsPage } from './pages/user/SubscriptionsPage';

import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminBookingsPage } from './pages/admin/AdminBookingsPage';
import { AdminSlotsPage } from './pages/admin/AdminSlotsPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminCoachingPage } from './pages/admin/AdminCoachingPage';
import { AdminTournamentsPage } from './pages/admin/AdminTournamentsPage';
import { AdminAnnouncementsPage } from './pages/admin/AdminAnnouncementsPage';
import { AdminSubscriptionsPage } from './pages/admin/AdminSubscriptionsPage';
import { AdminEmployeesPage } from './pages/admin/AdminEmployeesPage';
import { AdminFinancialsPage } from './pages/admin/AdminFinancialsPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10 * 1000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* User routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <AppLayout><UserDashboard /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/book" element={
            <ProtectedRoute>
              <AppLayout><BookingPage /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/my-bookings" element={
            <ProtectedRoute>
              <AppLayout><MyBookingsPage /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/coaching" element={
            <ProtectedRoute>
              <AppLayout><CoachingPage /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/tournaments" element={
            <ProtectedRoute>
              <AppLayout><TournamentsPage /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/community" element={
            <ProtectedRoute>
              <AppLayout><CommunityPage /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/subscriptions" element={
            <ProtectedRoute>
              <AppLayout><SubscriptionsPage /></AppLayout>
            </ProtectedRoute>
          } />

          {/* Admin routes */}
          <Route path="/admin" element={
            <ProtectedRoute adminOnly>
              <AppLayout><AdminDashboard /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/bookings" element={
            <ProtectedRoute adminOnly>
              <AppLayout><AdminBookingsPage /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/slots" element={
            <ProtectedRoute adminOnly>
              <AppLayout><AdminSlotsPage /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute adminOnly>
              <AppLayout><AdminUsersPage /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/coaching" element={
            <ProtectedRoute adminOnly>
              <AppLayout><AdminCoachingPage /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/tournaments" element={
            <ProtectedRoute adminOnly>
              <AppLayout><AdminTournamentsPage /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/announcements" element={
            <ProtectedRoute adminOnly>
              <AppLayout><AdminAnnouncementsPage /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/subscriptions" element={
            <ProtectedRoute adminOnly>
              <AppLayout><AdminSubscriptionsPage /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/employees" element={
            <ProtectedRoute adminOnly>
              <AppLayout><AdminEmployeesPage /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/financials" element={
            <ProtectedRoute adminOnly>
              <AppLayout><AdminFinancialsPage /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/reports" element={
            <ProtectedRoute adminOnly>
              <AppLayout><AdminReportsPage /></AppLayout>
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #334155',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#1e293b' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#1e293b' },
          },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;
