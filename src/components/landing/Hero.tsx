'use client';
import Link from 'next/link';

const STATS = [
  { value: '10k+', label: 'Companies trust us' },
  { value: '500k+', label: 'Employees managed' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '4.9★', label: 'Average rating' },
];

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-20"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.3) 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      {/* Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="text-center max-w-4xl mx-auto">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
            <span className="text-blue-300 text-sm font-medium">New: Attendance Correction System is live</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-tight tracking-tight mb-6">
            HR management{' '}
            <span className="relative">
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                made simple
              </span>
              <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 300 8" fill="none">
                <path d="M2 6 Q75 2 150 5 Q225 8 298 4" stroke="url(#u)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                <defs><linearGradient id="u" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#60a5fa"/><stop offset="100%" stopColor="#22d3ee"/></linearGradient></defs>
              </svg>
            </span>
          </h1>

          {/* Subtext */}
          <p className="text-lg sm:text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto mb-10">
            Automate attendance tracking, payroll calculation, and leave management in one unified platform. Built for growing teams.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/login"
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-4 rounded-2xl transition-all duration-200 shadow-xl shadow-blue-600/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 text-base">
              Start for free →
            </Link>
            <button onClick={() => document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-medium px-8 py-4 rounded-2xl transition-all duration-200 text-base">
              <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
              Watch demo
            </button>
          </div>

          {/* Dashboard mockup */}
          <div className="relative mx-auto max-w-5xl">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent z-10 pointer-events-none rounded-2xl" style={{top: '60%'}} />
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/40">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/10">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <div className="flex-1 bg-white/5 rounded-md px-3 py-1 text-xs text-slate-400 text-center">app.hrflow.io/admin</div>
              </div>
              {/* Fake dashboard */}
              <div className="p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { label: 'Present Today', value: '42', color: 'from-green-500 to-emerald-600' },
                  { label: 'On Leave', value: '3', color: 'from-blue-500 to-blue-600' },
                  { label: 'Late Arrivals', value: '5', color: 'from-amber-500 to-orange-600' },
                  { label: 'Net Payroll', value: '₹4.2L', color: 'from-purple-500 to-indigo-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className={`bg-gradient-to-br ${color} rounded-xl p-4 text-white`}>
                    <p className="text-2xl sm:text-3xl font-bold">{value}</p>
                    <p className="text-xs text-white/70 mt-1">{label}</p>
                  </div>
                ))}
              </div>
              {/* Fake table rows */}
              <div className="px-4 sm:px-6 pb-4 space-y-2">
                {['Shivani Jha', 'Deepak Yadav', 'Priya Singh', 'Rahul Kumar'].map((name, i) => (
                  <div key={name} className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5">
                    <div className="w-7 h-7 rounded-full bg-blue-500/30 flex items-center justify-center text-xs font-bold text-blue-300">
                      {name[0]}
                    </div>
                    <span className="text-slate-300 text-sm flex-1">{name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${i === 2 ? 'bg-amber-500/20 text-amber-300' : 'bg-green-500/20 text-green-300'}`}>
                      {i === 2 ? 'Late' : 'Present'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mt-16 max-w-3xl mx-auto">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-2xl sm:text-3xl font-extrabold text-white">{value}</p>
              <p className="text-slate-400 text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
