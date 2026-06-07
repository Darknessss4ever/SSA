import React, { useState } from 'react';
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
  email: z.string().email('Enter a valid email'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
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

  const onSubmit = async (data: FormData) => {
    try {
      const response = await authAPI.register({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone,
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
              <label className="label">Email Address</label>
              <input {...register('email')} type="email" placeholder="you@example.com" className="input" />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Phone Number <span className="text-dark-500">(optional)</span></label>
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

          <div className="mt-4 text-center">
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
