import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, ArrowRight, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof schema>;

export const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      const response = await authAPI.login(data);
      const { user, token, subscription } = response.data.data;
      setAuth(user, token, subscription);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}! 🏆`);
      navigate(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err: any) {
      toast.error(err?.message || 'Login failed. Check your credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-primary-950 to-dark-950 items-center justify-center p-12">
        <div className="absolute inset-0">
          <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-primary-600/20 rounded-full filter blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-accent-500/15 rounded-full filter blur-3xl animate-pulse-slow" />
        </div>
        <div className="relative z-10 max-w-md text-center">
          <div className="text-8xl mb-6 animate-float">🏆</div>
          <h2 className="text-4xl font-display font-black text-white mb-4">ShreeHari Sports Arena</h2>
          <p className="text-dark-300 text-lg leading-relaxed">
            Where champions train. Book your slot, join tournaments, and unlock your true athletic potential.
          </p>
          <div className="flex justify-center gap-4 mt-8 flex-wrap">
            {['🏊 Swimming', '💪 Gym', '🏸 Badminton', '🏏 Cricket', '⚽ Football'].map(s => (
              <span key={s} className="glass border border-white/10 rounded-full px-4 py-1.5 text-sm text-dark-200">{s}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 lg:max-w-lg flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center text-xl shadow-glow">🏆</div>
            <div>
              <p className="font-display font-bold text-white text-sm">ShreeHari Sports Arena</p>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-display font-black text-white mb-2">Welcome back</h1>
            <p className="text-dark-400">Sign in to book your slot and track your progress.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="label">Email Address</label>
              <input
                {...register('email')}
                type="email"
                placeholder="you@example.com"
                className="input"
                autoComplete="email"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="input pr-12"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full flex items-center justify-center gap-2 text-base py-3.5"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-dark-400 text-sm">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                Create one free
              </Link>
            </p>
          </div>

          {/* Demo credentials */}
          <div className="mt-8 p-4 rounded-xl bg-dark-800/50 border border-dark-700/50">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-primary-400" />
              <p className="text-xs font-semibold text-primary-400 uppercase tracking-wider">Demo Credentials</p>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-dark-300">
                <span>Admin:</span>
                <span className="font-mono text-dark-200">admin@shsa.com / Admin@123</span>
              </div>
              <div className="flex justify-between text-dark-300">
                <span>User:</span>
                <span className="font-mono text-dark-200">rahul@test.com / User@123</span>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link to="/" className="text-dark-500 hover:text-dark-300 text-sm transition-colors">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
