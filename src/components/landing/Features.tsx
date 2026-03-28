const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Smart Attendance',
    desc: 'Auto check-in/out tracking with grace period, late marking, and real-time status dashboard.',
    color: 'bg-blue-50 text-blue-600',
    border: 'group-hover:border-blue-200',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    title: 'Automated Payroll',
    desc: 'Generate salary slips with HRA, PF, tax, late deductions, and overtime — all in one click.',
    color: 'bg-green-50 text-green-600',
    border: 'group-hover:border-green-200',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Leave Management',
    desc: 'Approval workflows, paid/unpaid leave policies, and leave balance tracking per employee.',
    color: 'bg-purple-50 text-purple-600',
    border: 'group-hover:border-purple-200',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Reports & Analytics',
    desc: 'Detailed attendance, payroll, and department reports with exportable data for audits.',
    color: 'bg-amber-50 text-amber-600',
    border: 'group-hover:border-amber-200',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Company Policies',
    desc: 'Configure office timings, grace periods, late penalties, and broadcast policy text to all employees.',
    color: 'bg-rose-50 text-rose-600',
    border: 'group-hover:border-rose-200',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: 'Role-Based Access',
    desc: 'Admin, HR, and Employee roles with granular permissions. Secure JWT auth with audit logs.',
    color: 'bg-indigo-50 text-indigo-600',
    border: 'group-hover:border-indigo-200',
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 md:py-28 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14 md:mb-20">
          <span className="inline-block text-blue-600 text-sm font-semibold uppercase tracking-widest mb-3">Features</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
            Everything your HR team needs
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            From hiring to payroll — manage your entire workforce in one place.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {FEATURES.map(({ icon, title, desc, color, border }) => (
            <div key={title}
              className={`group bg-white border border-gray-100 ${border} rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-default`}>
              <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center mb-5`}>
                {icon}
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="mt-20 md:mt-28">
          <div className="text-center mb-12">
            <span className="inline-block text-blue-600 text-sm font-semibold uppercase tracking-widest mb-3">How it works</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Up and running in minutes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-8 left-1/4 right-1/4 h-px bg-gradient-to-r from-blue-200 to-blue-200 via-blue-400" />
            {[
              { step: '01', title: 'Set up company', desc: 'Add departments, configure office timings, leave policies, and salary rules.' },
              { step: '02', title: 'Add employees', desc: 'Bulk import or add individually. Auto-generate login credentials for each.' },
              { step: '03', title: 'Run on autopilot', desc: 'Attendance logs itself, payroll calculates automatically, reports generate instantly.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="relative text-center">
                <div className="w-16 h-16 bg-blue-600 text-white text-xl font-extrabold rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-600/30">
                  {step}
                </div>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
