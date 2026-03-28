'use client';
import { useState } from 'react';
import Link from 'next/link';

const PLANS = [
  {
    name: 'Starter',
    monthlyPrice: 0,
    yearlyPrice: 0,
    desc: 'Perfect for small teams just getting started.',
    cta: 'Get started free',
    href: '/login',
    highlight: false,
    features: [
      'Up to 10 employees',
      'Attendance tracking',
      'Basic leave management',
      'Monthly payroll',
      'Email support',
    ],
    missing: ['Custom salary rules', 'Advanced reports', 'API access'],
  },
  {
    name: 'Pro',
    monthlyPrice: 999,
    yearlyPrice: 799,
    desc: 'For growing teams that need full HR automation.',
    cta: 'Start free trial',
    href: '/login',
    highlight: true,
    badge: 'Most popular',
    features: [
      'Up to 100 employees',
      'Everything in Starter',
      'Custom salary rules',
      'Attendance correction',
      'Advanced reports & exports',
      'Role-based access control',
      'Priority support',
    ],
    missing: ['API access'],
  },
  {
    name: 'Enterprise',
    monthlyPrice: 2999,
    yearlyPrice: 2399,
    desc: 'For large organisations with complex requirements.',
    cta: 'Contact sales',
    href: '#footer',
    highlight: false,
    features: [
      'Unlimited employees',
      'Everything in Pro',
      'REST API access',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee (99.9%)',
      '24/7 phone support',
    ],
    missing: [],
  },
];

const Check = () => (
  <svg className="w-4 h-4 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
const Cross = () => (
  <svg className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default function Pricing() {
  const [yearly, setYearly] = useState(false);

  const handleClick = (href: string) => {
    if (href.startsWith('#')) {
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="pricing" className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 md:mb-14">
          <span className="inline-block text-blue-600 text-sm font-semibold uppercase tracking-widest mb-3">Pricing</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-gray-500">No hidden fees. Cancel anytime.</p>

          {/* Toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={`text-sm font-medium ${!yearly ? 'text-gray-900' : 'text-gray-400'}`}>Monthly</span>
            <button onClick={() => setYearly(!yearly)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${yearly ? 'bg-blue-600' : 'bg-gray-200'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${yearly ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
            <span className={`text-sm font-medium ${yearly ? 'text-gray-900' : 'text-gray-400'}`}>
              Yearly <span className="text-green-600 font-semibold">Save 20%</span>
            </span>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 items-stretch">
          {PLANS.map(({ name, monthlyPrice, yearlyPrice, desc, cta, href, highlight, badge, features, missing }) => {
            const price = yearly ? yearlyPrice : monthlyPrice;
            return (
              <div key={name}
                className={`relative flex flex-col rounded-2xl p-6 sm:p-8 transition-all duration-300 ${
                  highlight
                    ? 'bg-blue-600 text-white shadow-2xl shadow-blue-600/30 scale-105 md:scale-105'
                    : 'bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow-lg'
                }`}>

                {badge && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">
                    {badge}
                  </span>
                )}

                <div className="mb-6">
                  <h3 className={`text-lg font-bold mb-1 ${highlight ? 'text-white' : 'text-gray-900'}`}>{name}</h3>
                  <p className={`text-sm ${highlight ? 'text-blue-200' : 'text-gray-500'}`}>{desc}</p>
                </div>

                <div className="mb-6">
                  {price === 0 ? (
                    <span className={`text-4xl font-extrabold ${highlight ? 'text-white' : 'text-gray-900'}`}>Free</span>
                  ) : (
                    <div className="flex items-end gap-1">
                      <span className={`text-4xl font-extrabold ${highlight ? 'text-white' : 'text-gray-900'}`}>
                        ₹{price.toLocaleString('en-IN')}
                      </span>
                      <span className={`text-sm mb-1 ${highlight ? 'text-blue-200' : 'text-gray-400'}`}>/mo</span>
                    </div>
                  )}
                  {yearly && price > 0 && (
                    <p className={`text-xs mt-1 ${highlight ? 'text-blue-200' : 'text-gray-400'}`}>
                      Billed ₹{(price * 12).toLocaleString('en-IN')}/year
                    </p>
                  )}
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      {highlight
                        ? <svg className="w-4 h-4 text-blue-200 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                        : <Check />
                      }
                      <span className={`text-sm ${highlight ? 'text-blue-100' : 'text-gray-700'}`}>{f}</span>
                    </li>
                  ))}
                  {missing.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Cross />
                      <span className="text-sm text-gray-400 line-through">{f}</span>
                    </li>
                  ))}
                </ul>

                {href.startsWith('/') ? (
                  <Link href={href}
                    className={`w-full text-center py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                      highlight
                        ? 'bg-white text-blue-600 hover:bg-blue-50 shadow-md'
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/20'
                    }`}>
                    {cta}
                  </Link>
                ) : (
                  <button onClick={() => handleClick(href)}
                    className="w-full text-center py-3.5 rounded-xl font-semibold text-sm bg-gray-900 text-white hover:bg-gray-800 transition-all duration-200 shadow-md">
                    {cta}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-center text-sm text-gray-400 mt-8">
          All plans include 14-day free trial. No credit card required.
        </p>
      </div>
    </section>
  );
}
