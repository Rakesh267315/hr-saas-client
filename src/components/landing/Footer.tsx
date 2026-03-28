import Link from 'next/link';

const LINKS = {
  Product: ['Features', 'Pricing', 'Changelog', 'Roadmap'],
  Company: ['About', 'Blog', 'Careers', 'Press'],
  Legal: ['Privacy Policy', 'Terms of Service', 'Security', 'GDPR'],
  Support: ['Documentation', 'Help Center', 'Status', 'Contact'],
};

export default function Footer() {
  return (
    <footer id="footer">
      {/* CTA Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-4">
            Ready to transform your HR operations?
          </h2>
          <p className="text-blue-200 text-base sm:text-lg mb-8 max-w-xl mx-auto">
            Join thousands of companies already using HRFlow. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login"
              className="w-full sm:w-auto bg-white text-blue-700 font-bold px-8 py-4 rounded-2xl hover:bg-blue-50 transition-all duration-200 shadow-xl text-base">
              Start for free today →
            </Link>
            <a href="mailto:hello@hrflow.io"
              className="w-full sm:w-auto bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium px-8 py-4 rounded-2xl transition-all duration-200 text-base">
              Talk to sales
            </a>
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="bg-gray-950 text-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-10 mb-10">

            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className="text-lg font-bold text-white">HR<span className="text-blue-400">Flow</span></span>
              </div>
              <p className="text-sm leading-relaxed mb-5">
                Modern HR management for growing Indian businesses.
              </p>
              <div className="flex gap-3">
                {['twitter', 'linkedin', 'github'].map((s) => (
                  <a key={s} href="#" className="w-8 h-8 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors">
                    <span className="sr-only">{s}</span>
                    <div className="w-3.5 h-3.5 bg-gray-400 rounded-sm" />
                  </a>
                ))}
              </div>
            </div>

            {/* Link columns */}
            {Object.entries(LINKS).map(([category, links]) => (
              <div key={category}>
                <h4 className="text-white text-sm font-semibold mb-4">{category}</h4>
                <ul className="space-y-2.5">
                  {links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-sm hover:text-white transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-gray-800">
            <p className="text-xs text-gray-600">
              © {new Date().getFullYear()} HRFlow. All rights reserved. Made with ♥ in India.
            </p>
            <div className="flex items-center gap-4 text-xs">
              <a href="#" className="hover:text-gray-300 transition-colors">Privacy</a>
              <a href="#" className="hover:text-gray-300 transition-colors">Terms</a>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-green-500">All systems operational</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
