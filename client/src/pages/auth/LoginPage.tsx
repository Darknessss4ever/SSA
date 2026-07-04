import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

const schema = z.object({
  loginIdentifier: z.string().min(1, 'Email or Phone Number is required'),
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

  // Load Google Identity Services SDK
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
      if ((window as any).google) {
        (window as any).google.accounts.id.initialize({
          client_id: '984365319808-16v6h9epd2f2vj0f9b6e8g3j2o8m7n9b.apps.googleusercontent.com', // placeholder client ID
          callback: handleGoogleResponse,
        });
        (window as any).google.accounts.id.renderButton(
          document.getElementById('google-signin-btn'),
          { theme: 'outline', size: 'large', width: 320 }
        );
      }
    };

    return () => {
      try {
        document.head.removeChild(script);
      } catch (_) {}
    };
  }, []);

  const handleGoogleResponse = async (response: any) => {
    try {
      const apiResponse = await authAPI.googleLogin({ credential: response.credential });
      const { user, token, subscription } = apiResponse.data.data;
      setAuth(user, token, subscription);
      toast.success(`Welcome, ${user.name.split(' ')[0]}! 🏆`);
      navigate(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err: any) {
      toast.error(err?.message || 'Google authentication failed');
    }
  };

  const handleMockGoogleLogin = async () => {
    try {
      const mockProfile = {
        email: 'google-user@test.com',
        name: 'Google Test Athlete',
        sub: 'google_oauth_mock_id_99999',
        picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'
      };
      const apiResponse = await authAPI.googleLogin({ mockProfile });
      const { user, token, subscription } = apiResponse.data.data;
      setAuth(user, token, subscription);
      toast.success(`Simulated login as ${user.name.split(' ')[0]}! 🏆`);
      navigate(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err: any) {
      toast.error(err?.message || 'Simulated Google login failed');
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      const response = await authAPI.login({
        loginIdentifier: data.loginIdentifier,
        password: data.password
      });
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
              <label className="label">Email or Phone Number</label>
              <input
                {...register('loginIdentifier')}
                type="text"
                placeholder="you@example.com or +91 98..."
                className="input"
                autoComplete="username"
              />
              {errors.loginIdentifier && <p className="text-red-400 text-xs mt-1">{errors.loginIdentifier.message}</p>}
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

          {/* Social login divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-dark-800" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-dark-950 px-2 text-dark-550 font-semibold">Or continue with</span></div>
          </div>

          {/* Google buttons */}
          <div className="flex flex-col gap-3 items-center">
            <div id="google-signin-btn" className="w-full flex justify-center"></div>
            {import.meta.env.DEV && (
              <button
                type="button"
                onClick={handleMockGoogleLogin}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl bg-dark-900 hover:bg-dark-850 border border-dark-800 text-white font-medium text-sm transition-all"
              >
                <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-xs font-bold text-dark-950 shadow-sm font-sans">G</span>
                Simulate Google Login (Dev Mode)
              </button>
            )}
          </div>

          <div className="mt-6 text-center">
            <p className="text-dark-400 text-sm">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                Create one free
              </Link>
            </p>
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
