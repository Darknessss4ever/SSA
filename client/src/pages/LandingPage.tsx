import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, CheckCircle, Star, Zap, Shield, Clock,
  Trophy, Users, Calendar, ChevronRight, Play
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

const SPORTS = [
  { icon: '🏊', name: 'Swimming', desc: 'Olympic-size heated pool', color: 'from-cyan-500/20 to-cyan-600/5', border: 'border-cyan-500/20' },
  { icon: '💪', name: 'Gym', desc: 'State-of-the-art equipment', color: 'from-amber-500/20 to-amber-600/5', border: 'border-amber-500/20' },
  { icon: '🏸', name: 'Badminton', desc: 'Professional synthetic courts', color: 'from-emerald-500/20 to-emerald-600/5', border: 'border-emerald-500/20' },
  { icon: '🏏', name: 'Box Cricket', desc: 'With bowling machine', color: 'from-violet-500/20 to-violet-600/5', border: 'border-violet-500/20' },
  { icon: '⚽', name: 'Box Football', desc: 'FIFA-quality artificial turf', color: 'from-red-500/20 to-red-600/5', border: 'border-red-500/20' },
];

const FEATURES = [
  { icon: <Calendar className="w-6 h-6" />, title: 'Easy Booking', desc: 'Book slots instantly with real-time availability' },
  { icon: <Zap className="w-6 h-6" />, title: 'Smart Subscriptions', desc: 'Unlimited access with individual or combo plans' },
  { icon: <Trophy className="w-6 h-6" />, title: 'Tournaments', desc: 'Join exciting competitive events and tournaments' },
  { icon: <Shield className="w-6 h-6" />, title: 'Pro Coaching', desc: 'Learn from certified professional coaches' },
  { icon: <Clock className="w-6 h-6" />, title: 'Flexible Timings', desc: 'Open 6 AM to 10 PM, 365 days a year' },
  { icon: <Users className="w-6 h-6" />, title: 'Community', desc: 'Be part of a thriving sports community' },
];

const TESTIMONIALS = [
  { name: 'Priya Mehta', sport: 'Swimming', rating: 5, text: 'The pool is absolutely world-class. I\'ve been a subscriber for 6 months and love every session!' },
  { name: 'Rajan Kapoor', sport: 'Box Cricket', rating: 5, text: 'The bowling machine is a game-changer for practice. Best facility in the city!' },
  { name: 'Ananya Sharma', sport: 'Badminton', rating: 5, text: 'Excellent courts, great lighting, and very easy online booking. Highly recommend!' },
];

const STATS = [
  { value: '1000+', label: 'Happy Members' },
  { value: '5', label: 'World-class Sports' },
  { value: '16hrs', label: 'Daily Operations' },
  { value: '365', label: 'Days a Year' },
];

export const LandingPage: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  const handleCTA = () => {
    if (isAuthenticated) {
      navigate(user?.role === 'admin' ? '/admin' : '/book');
    } else {
      navigate('/signup');
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between backdrop-blur-md bg-dark-950/80 border-b border-dark-800/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center text-lg shadow-glow">
            🏆
          </div>
          <div>
            <p className="font-display font-bold text-white text-sm leading-tight">ShreeHari</p>
            <p className="text-primary-400 text-xs">Sports Arena</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <a href="#sports" className="text-dark-300 hover:text-white transition-colors text-sm">Sports</a>
          <a href="#features" className="text-dark-300 hover:text-white transition-colors text-sm">Features</a>
          <a href="#testimonials" className="text-dark-300 hover:text-white transition-colors text-sm">Reviews</a>
        </div>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <button onClick={handleCTA} className="btn-primary text-sm py-2 px-5">
              Go to Dashboard
            </button>
          ) : (
            <>
              <Link to="/login" className="btn-ghost text-sm">Login</Link>
              <Link to="/signup" className="btn-primary text-sm py-2 px-5">Get Started</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* BG effects */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600/20 rounded-full filter blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/15 rounded-full filter blur-3xl animate-pulse-slow delay-1000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-900/10 rounded-full filter blur-3xl" />
        </div>

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '50px 50px' }}
        />

        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-primary-500/10 border border-primary-500/20 rounded-full px-4 py-2 mb-8 animate-slide-up">
            <Star className="w-4 h-4 text-primary-400 fill-primary-400" />
            <span className="text-primary-300 text-sm font-medium">Now Open — Book Your First Slot Free</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-display font-black text-white mb-6 leading-tight animate-slide-up">
            Your Sports.
            <br />
            <span className="gradient-text">Your Arena.</span>
          </h1>

          <p className="text-xl text-dark-300 mb-10 max-w-2xl mx-auto leading-relaxed animate-slide-up">
            ShreeHari Sports Arena — where champions train. Book slots, join tournaments,
            and elevate your game with world-class facilities.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up">
            <button
              onClick={handleCTA}
              className="btn-primary text-base py-4 px-8 flex items-center gap-2 justify-center"
            >
              Book a Slot Now
              <ArrowRight className="w-5 h-5" />
            </button>
            <a
              href="#sports"
              className="btn-secondary text-base py-4 px-8 flex items-center gap-2 justify-center"
            >
              <Play className="w-4 h-4" />
              Explore Sports
            </a>
          </div>

          {/* Sports previews floating */}
          <div className="flex justify-center gap-3 mt-14 flex-wrap animate-fade-in">
            {SPORTS.map(sport => (
              <div
                key={sport.name}
                className={`glass border ${sport.border} rounded-2xl px-4 py-2.5 flex items-center gap-2`}
              >
                <span className="text-xl">{sport.icon}</span>
                <span className="text-sm text-dark-200 font-medium">{sport.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-dark-600 rounded-full flex items-start justify-center pt-2">
            <div className="w-1.5 h-2.5 bg-primary-400 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map(stat => (
            <div key={stat.label} className="text-center">
              <p className="text-4xl font-display font-black gradient-text">{stat.value}</p>
              <p className="text-dark-400 mt-1 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sports */}
      <section id="sports" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-display font-black text-white mb-4">
              World-Class <span className="gradient-text">Sports Facilities</span>
            </h2>
            <p className="text-dark-400 text-lg max-w-2xl mx-auto">
              From an Olympic-grade pool to a high-tech cricket arena — we have everything for every athlete.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SPORTS.map((sport) => (
              <div
                key={sport.name}
                className={`group relative overflow-hidden rounded-2xl border ${sport.border} bg-gradient-to-br ${sport.color} p-6 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover`}
              >
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
                  {sport.icon}
                </div>
                <h3 className="text-xl font-display font-bold text-white mb-1">{sport.name}</h3>
                <p className="text-dark-300 text-sm">{sport.desc}</p>
                <div className="mt-4 flex items-center gap-1 text-primary-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Book Now <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 bg-dark-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-display font-black text-white mb-4">
              Everything You <span className="gradient-text">Need to Thrive</span>
            </h2>
            <p className="text-dark-400 text-lg max-w-2xl mx-auto">
              A complete sports ecosystem designed for champions at every level.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(feature => (
              <div key={feature.title} className="card-hover p-6 group">
                <div className="w-12 h-12 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400 mb-4 group-hover:bg-primary-500/20 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-display font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-dark-400 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-display font-black text-white mb-4">
              Loved by <span className="gradient-text">Athletes</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="card p-6">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-dark-200 leading-relaxed mb-6 text-sm">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-sm">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{t.name}</p>
                    <p className="text-dark-400 text-xs">{t.sport} Member</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative rounded-3xl bg-gradient-to-br from-primary-600/20 via-primary-900/20 to-accent-600/10 border border-primary-500/20 p-12 overflow-hidden">
            <div className="absolute inset-0 opacity-30"
              style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(217,70,239,0.3) 0%, transparent 70%)' }}
            />
            <div className="relative z-10">
              <p className="text-5xl mb-6 animate-float">🏆</p>
              <h2 className="text-4xl font-display font-black text-white mb-4">
                Ready to Start Your Journey?
              </h2>
              <p className="text-dark-300 mb-8 text-lg">
                Join 1000+ athletes training at ShreeHari Sports Arena.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button onClick={handleCTA} className="btn-primary text-base py-4 px-8 flex items-center gap-2 justify-center">
                  Get Started Free <ArrowRight className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center justify-center gap-6 mt-8">
                {['No credit card', 'Cancel anytime', '1st slot free'].map(item => (
                  <div key={item} className="flex items-center gap-1.5 text-dark-300 text-sm">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-dark-800/50 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center text-sm shadow-glow">
              🏆
            </div>
            <p className="text-dark-300 font-medium text-sm">ShreeHari Sports Arena</p>
          </div>
          <p className="text-dark-500 text-sm">© 2026 ShreeHari Sports Arena. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};
