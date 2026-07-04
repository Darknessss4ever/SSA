import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, ArrowRight, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine(data => data.email || data.phone, {
  message: 'Either Email or Phone Number is required',
  path: ['email'],
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
}).refine(data => {
  if (data.email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email);
  }
  return true;
}, {
  message: 'Enter a valid email address',
  path: ['email'],
});

type FormData = z.infer<typeof schema>;

const PERKS = [
  'Book slots in seconds',
  'Join exclusive tournaments',
  'Access coaching programs',
  'Track your fitness journey',
];

export const SignupPage: React.FC = () => {
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
          document.getElementById('google-signup-btn'),
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
      const { user, token } = apiResponse.data.data;
      setAuth(user, token, null);
      toast.success(`Welcome to ShreeHari Arena, ${user.name.split(' ')[0]}! 🎉`);
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err?.message || 'Google registration failed');
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
      const { user, token } = apiResponse.data.data;
      setAuth(user, token, null);
      toast.success(`Simulated Google login as ${user.name.split(' ')[0]}! 🎉`);
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err?.message || 'Simulated Google signup failed');
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      const response = await authAPI.register({
        name: data.name,
        email: data.email || undefined,
        password: data.password,
        phone: data.phone || undefined,
      });
      const { user, token } = response.data.data;
      setAuth(user, token, null);
      toast.success(`Welcome to ShreeHari Arena, ${user.name.split(' ')[0]}! 🎉`);
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err?.message || 'Registration failed. Please try again.');
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
        <div className="relative z-10 max-w-md">
          <div className="text-6xl mb-6 animate-float">🏅</div>
          <h2 className="text-4xl font-display font-black text-white mb-4">Start Your Athletic Journey</h2>
          <p className="text-dark-300 text-lg leading-relaxed mb-8">
            Join ShreeHari Sports Arena and unlock access to India's best sports facilities.
          </p>
          <div className="space-y-3">
            {PERKS.map(perk => (
              <div key={perk} className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <p className="text-dark-200">{perk}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 lg:max-w-lg flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center text-xl shadow-glow">🏆</div>
            <p className="font-display font-bold text-white text-sm">ShreeHari Sports Arena</p>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-display font-black text-white mb-2">Create your account</h1>
            <p className="text-dark-400">Join thousands of athletes training at ShreeHari.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input {...register('name')} type="text" placeholder="Rahul Sharma" className="input" />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="label">Email Address <span className="text-dark-500">(Optional if Phone is filled)</span></label>
              <input {...register('email')} type="email" placeholder="you@example.com" className="input" />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Phone Number <span className="text-dark-500">(Optional if Email is filled)</span></label>
              <input {...register('phone')} type="tel" placeholder="+91 9876543210" className="input" />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 6 characters"
                  className="input pr-12"
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

            <div>
              <label className="label">Confirm Password</label>
              <input {...register('confirmPassword')} type="password" placeholder="Re-enter password" className="input" />
              {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full flex items-center justify-center gap-2 text-base py-3.5 mt-2"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Create Account <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {/* Social signup divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-dark-800" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-dark-950 px-2 text-dark-550 font-semibold">Or continue with</span></div>
          </div>

          {/* Google buttons */}
          <div className="flex flex-col gap-3 items-center">
            <div id="google-signup-btn" className="w-full flex justify-center"></div>
            {import.meta.env.DEV && (
              <button
                type="button"
                onClick={handleMockGoogleLogin}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl bg-dark-900 hover:bg-dark-850 border border-dark-800 text-white font-medium text-sm transition-all"
              >
                <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-xs font-bold text-dark-950 shadow-sm font-sans">G</span>
                Simulate Google Signup (Dev Mode)
              </button>
            )}
          </div>

          <div className="mt-6 text-center">
            <p className="text-dark-400 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                Sign in
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
