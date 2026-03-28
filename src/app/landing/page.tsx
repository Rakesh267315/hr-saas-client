import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import Pricing from '@/components/landing/Pricing';
import Testimonials from '@/components/landing/Testimonials';
import Footer from '@/components/landing/Footer';

export const metadata = {
  title: 'HRFlow — Modern HR Management for Indian Teams',
  description: 'Automate attendance, payroll, and leave management. Built for growing Indian businesses.',
};

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden">
      <Navbar />
      <Hero />
      <Features />
      <Pricing />
      <Testimonials />
      <Footer />
    </main>
  );
}
