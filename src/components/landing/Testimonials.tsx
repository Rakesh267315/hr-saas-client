const TESTIMONIALS = [
  {
    name: 'Priya Sharma',
    role: 'HR Manager',
    company: 'TechNova Pvt Ltd',
    avatar: 'PS',
    color: 'bg-purple-100 text-purple-700',
    rating: 5,
    text: 'HRFlow cut our payroll processing time from 3 days to 30 minutes. The automatic late deduction and salary calculation is incredibly accurate. Our entire HR team loves it.',
  },
  {
    name: 'Rahul Mehta',
    role: 'Founder & CEO',
    company: 'GrowthStack',
    avatar: 'RM',
    color: 'bg-blue-100 text-blue-700',
    rating: 5,
    text: 'We onboarded 50 employees in a single afternoon. The role-based access means each employee only sees what\'s relevant to them. Exactly what a scaling startup needs.',
  },
  {
    name: 'Sneha Pillai',
    role: 'Operations Head',
    company: 'Infranxt Solutions',
    avatar: 'SP',
    color: 'bg-green-100 text-green-700',
    rating: 5,
    text: 'The attendance correction system saved us so many headaches. Admins can fix mistakes with a full audit trail — management trusts the data completely now.',
  },
  {
    name: 'Arjun Nair',
    role: 'CFO',
    company: 'BlueSky Finance',
    avatar: 'AN',
    color: 'bg-amber-100 text-amber-700',
    rating: 5,
    text: 'Payslip generation used to be a nightmare. Now it\'s one click, complete with HRA, PF, tax deductions. The reports are audit-ready every time.',
  },
  {
    name: 'Divya Kapoor',
    role: 'HR Lead',
    company: 'CreativeHive',
    avatar: 'DK',
    color: 'bg-rose-100 text-rose-700',
    rating: 5,
    text: 'Leave approvals, attendance tracking, and policy broadcasts — all in one place. Employees actually check the app daily because it\'s so clean and simple.',
  },
  {
    name: 'Vikram Joshi',
    role: 'Co-founder',
    company: 'RapidScale',
    avatar: 'VJ',
    color: 'bg-indigo-100 text-indigo-700',
    rating: 5,
    text: 'We evaluated 5 HR tools. HRFlow was the only one that handled Indian payroll nuances — PF, gratuity, tax thresholds — out of the box. Incredible value.',
  },
];

const Stars = ({ count }: { count: number }) => (
  <div className="flex gap-0.5">
    {Array.from({ length: count }).map((_, i) => (
      <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ))}
  </div>
);

export default function Testimonials() {
  return (
    <section id="testimonials" className="py-20 md:py-28 bg-gray-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-block text-blue-600 text-sm font-semibold uppercase tracking-widest mb-3">Testimonials</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
            Trusted by HR teams across India
          </h2>
          <p className="mt-4 text-lg text-gray-500">See what our customers are saying about HRFlow.</p>
        </div>

        {/* Grid */}
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 md:gap-6 space-y-5 md:space-y-6">
          {TESTIMONIALS.map(({ name, role, company, avatar, color, rating, text }) => (
            <div key={name} className="break-inside-avoid bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
              <Stars count={rating} />
              <p className="mt-4 text-gray-700 text-sm leading-relaxed">"{text}"</p>
              <div className="flex items-center gap-3 mt-5 pt-5 border-t border-gray-100">
                <div className={`w-10 h-10 ${color} rounded-full flex items-center justify-center text-sm font-bold shrink-0`}>
                  {avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{name}</p>
                  <p className="text-xs text-gray-500">{role}, {company}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Social proof bar */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-8 md:gap-12 opacity-40 grayscale">
          {['TechNova', 'GrowthStack', 'Infranxt', 'BlueSky', 'CreativeHive', 'RapidScale'].map((name) => (
            <span key={name} className="text-lg font-bold text-gray-600 tracking-tight">{name}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
