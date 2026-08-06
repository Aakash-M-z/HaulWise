import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Clock, 
  MapPin, 
  Fuel, 
  FileText, 
  Truck,
  Zap,
  SlidersHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GpsTrackerModel from '@/components/landing/GpsTrackerModel';

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [currentLoc, setCurrentLoc] = useState('');
  const [pickupLoc, setPickupLoc] = useState('');
  const [dropoffLoc, setDropoffLoc] = useState('');

  const handleQuickPlan = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (currentLoc) params.set('current', currentLoc);
    if (pickupLoc) params.set('pickup', pickupLoc);
    if (dropoffLoc) params.set('dropoff', dropoffLoc);
    setLocation(`/planner?${params.toString()}`);
  };

  const sampleRoutes = [
    { from: 'Chicago, IL', pickup: 'St. Louis, MO', to: 'Dallas, TX' },
    { from: 'Atlanta, GA', pickup: 'Nashville, TN', to: 'Miami, FL' },
    { from: 'Los Angeles, CA', pickup: 'Phoenix, AZ', to: 'Denver, CO' },
  ];

  const fillSampleRoute = (route: typeof sampleRoutes[0]) => {
    setCurrentLoc(route.from);
    setPickupLoc(route.pickup);
    setDropoffLoc(route.to);
  };

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden bg-transparent text-slate-100 font-sans">
      
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center pt-12 pb-20 px-4 sm:px-6 text-center">
        
        {/* Ambient Ice Cyan Glow Background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-sky-500/10 rounded-full blur-[140px] pointer-events-none" />

        {/* Hero Top Content */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="z-10 max-w-4xl mx-auto flex flex-col items-center"
        >
          {/* Professional Status Badge */}
          <div className="mb-6 inline-flex items-center gap-2.5 px-4 py-2 rounded-sm border border-sky-400/30 bg-sky-950/60 text-sky-300 text-xs font-mono uppercase tracking-wider shadow-sm shadow-sky-500/10">
            <Truck className="w-4 h-4 text-sky-300" />
            Smart Freight Routing & Live Telematics Engine
          </div>

          {/* Main Enterprise Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1] text-white uppercase font-sans">
            Haul<span className="text-sky-300">Wise</span> Commercial <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-200 via-sky-300 to-sky-400">
              Freight Router & GPS
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-300 mb-8 max-w-2xl font-normal leading-relaxed">
            Plan FMCSA-compliant commercial routes, track live GPS telematics, calculate mandatory rest breaks, and generate automated ELD projections.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row gap-3.5 w-full sm:w-auto justify-center mb-12">
            <Link href="/planner">
              <Button size="lg" className="w-full sm:w-auto text-base h-13 px-8 bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold rounded-sm shadow-md shadow-sky-500/20 border border-sky-300/40 transition-all hover:scale-[1.02]">
                <Zap className="mr-2 h-5 w-5 fill-slate-950" />
                Launch Trip Planner
              </Button>
            </Link>
            <Link href="/trips">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base h-13 px-8 rounded-sm border-white/10 bg-black/40 hover:bg-white/[0.08] text-sky-200 transition-all">
                Browse Saved Trips
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Quick Trip Planner Form */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="z-10 w-full max-w-4xl bg-[#090d16] border border-sky-500/20 rounded-md p-4 sm:p-6 mb-12 text-left shadow-2xl"
        >
          <div className="flex items-center justify-between mb-4 border-b border-sky-950 pb-3">
            <h3 className="text-sm font-bold text-sky-300 uppercase tracking-wider font-mono flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-sky-400" />
              Express Route Planner
            </h3>
            <span className="text-xs text-sky-400/80 font-mono hidden sm:inline">FMCSA HOS Compliant</span>
          </div>

          <form onSubmit={handleQuickPlan} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="relative">
              <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Current Location"
                value={currentLoc}
                onChange={(e) => setCurrentLoc(e.target.value)}
                className="pl-9 bg-black/80 border-slate-800 focus:border-sky-400 text-sm h-11 rounded-sm text-white"
              />
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-sky-400" />
              <Input
                placeholder="Pickup Location"
                value={pickupLoc}
                onChange={(e) => setPickupLoc(e.target.value)}
                className="pl-9 bg-black/80 border-slate-800 focus:border-sky-400 text-sm h-11 rounded-sm text-white"
              />
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-sky-300" />
              <Input
                placeholder="Dropoff Location"
                value={dropoffLoc}
                onChange={(e) => setDropoffLoc(e.target.value)}
                className="pl-9 bg-black/80 border-slate-800 focus:border-sky-400 text-sm h-11 rounded-sm text-white"
              />
            </div>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.06]">
            <div className="flex items-center gap-2 text-xs text-slate-400 overflow-x-auto py-1">
              <span className="font-semibold text-sky-400 font-mono uppercase">Presets:</span>
              {sampleRoutes.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => fillSampleRoute(sample)}
                  className="px-2.5 py-1 rounded-sm bg-black/60 hover:bg-sky-950 text-slate-300 text-xs transition-colors border border-sky-500/20"
                >
                  {sample.from.split(',')[0]} ➔ {sample.to.split(',')[0]}
                </button>
              ))}
            </div>

            <Button onClick={handleQuickPlan} className="ml-auto bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-extrabold h-9 px-4 rounded-sm border border-sky-300/30">
              Generate Route <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
            </Button>
          </div>
        </motion.div>

        {/* Live GPS Tracking Model Showcase Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="z-10 w-full max-w-5xl"
        >
          <GpsTrackerModel />
        </motion.div>
      </section>

      {/* Feature Grid */}
      <section className="py-20 px-4 sm:px-6 border-t border-sky-950/60 bg-transparent">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white uppercase tracking-wider mb-3">
              Commercial Freight Engine
            </h2>
            <p className="text-sky-300/80 text-sm max-w-xl mx-auto font-mono">
              Precision Logistics • FMCSA Compliant • Automated Telematics
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Clock,
                title: 'FMCSA HOS Compliance',
                description: 'Enforces 70-hour / 8-day property carrying rules, 11-hour daily driving limits, and mandatory 30-minute breaks.',
              },
              {
                icon: Fuel,
                title: 'Optimized Fuel Stops',
                description: 'Interpolates exact fuel stop coordinates along the OSRM driving polyline every 1,000 miles to minimize deadhead delays.',
              },
              {
                icon: FileText,
                title: 'Daily ELD Grid Projections',
                description: 'Generates day-by-day FMCSA driver log sheet breakdowns with complete status transitions and total hour counts.',
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="bg-[#080d16] border border-sky-500/20 rounded-md p-6 text-left hover:border-sky-400/40 transition-all shadow-lg"
              >
                <div className="w-10 h-10 rounded-sm bg-sky-950 border border-sky-400/30 flex items-center justify-center text-sky-300 mb-5">
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white uppercase tracking-wide mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 relative overflow-hidden">
        <div className="container mx-auto max-w-4xl bg-[#080d16] border border-sky-400/30 rounded-md p-10 text-center relative z-10 shadow-2xl">
          <Truck className="w-12 h-12 text-sky-300 mx-auto mb-4" />
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white uppercase tracking-wider mb-3">
            Start Planning With HaulWise
          </h2>
          <p className="text-slate-300 text-sm mb-8 max-w-lg mx-auto">
            Experience smooth, FMCSA-compliant commercial trip planning and live GPS telemetry.
          </p>
          <Link href="/planner">
            <Button size="lg" className="h-13 px-8 text-base bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold rounded-sm border border-sky-300/30 shadow-lg shadow-sky-500/20">
              Launch Trip Planner <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="py-8 px-4 border-t border-sky-950 text-center text-xs text-slate-500 font-mono">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 max-w-6xl">
          <span className="font-bold text-sky-400 uppercase tracking-wider">HaulWise Freight System</span>
          <p>© {new Date().getFullYear()} HaulWise. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
