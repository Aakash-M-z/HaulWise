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
    // Require at least current + dropoff to navigate
    if (!currentLoc.trim() && !dropoffLoc.trim()) return;
    const params = new URLSearchParams();
    if (currentLoc.trim()) params.set('current', currentLoc.trim());
    if (pickupLoc.trim()) params.set('pickup', pickupLoc.trim());
    if (dropoffLoc.trim()) params.set('dropoff', dropoffLoc.trim());
    setLocation(`/planner?${params.toString()}`);
  };

  const sampleRoutes = [
    { from: 'Chicago, IL', pickup: 'St. Louis, MO', to: 'Dallas, TX', label: 'Chicago → Dallas' },
    { from: 'Atlanta, GA', pickup: 'Jacksonville, FL', to: 'Miami, FL', label: 'Atlanta → Miami' },
    { from: 'Los Angeles, CA', pickup: 'Phoenix, AZ', to: 'Denver, CO', label: 'Los Angeles → Denver' },
  ];

  // Clicking a preset navigates directly to planner with all fields pre-filled
  const launchPreset = (route: typeof sampleRoutes[0]) => {
    const params = new URLSearchParams();
    params.set('current', route.from);
    params.set('pickup', route.pickup);
    params.set('dropoff', route.to);
    setLocation(`/planner?${params.toString()}`);
  };

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
            Smart Freight Route Planning & FMCSA Compliance Engine
          </div>

          {/* Main Enterprise Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1] text-white uppercase font-sans">
            Haul<span className="text-sky-300">Wise</span> Commercial <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-200 via-sky-300 to-sky-400">
              Freight Route Planner & ELD Logs
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-300 mb-8 max-w-2xl font-normal leading-relaxed">
            Plan FMCSA-compliant commercial routes, calculate fuel and rest stops, and generate automated ELD daily log sheets.
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
          className="w-full max-w-4xl mx-auto z-10"
        >
          <div className="p-6 md:p-8 rounded-md bg-[#080d16]/90 border border-sky-400/30 backdrop-blur-xl shadow-2xl relative text-left">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-sky-400" />
                <h2 className="text-lg font-extrabold tracking-tight text-white uppercase font-sans">
                  Quick Trip Parameter Setup
                </h2>
              </div>
              <div className="text-xs font-mono text-sky-300 bg-sky-950/60 border border-sky-400/30 px-3 py-1 rounded-sm">
                70-HR / 8-DAY CYCLE
              </div>
            </div>

            <form onSubmit={handleQuickPlan} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-300 font-bold uppercase tracking-wider block">Current Location</label>
                <Input 
                  placeholder="e.g. Chicago, IL" 
                  value={currentLoc}
                  onChange={(e) => setCurrentLoc(e.target.value)}
                  className="bg-black/60 border-slate-800 focus-visible:ring-sky-400 text-slate-100 font-mono h-11 text-sm rounded-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-300 font-bold uppercase tracking-wider block">Pickup Location</label>
                <Input 
                  placeholder="e.g. Indianapolis, IN" 
                  value={pickupLoc}
                  onChange={(e) => setPickupLoc(e.target.value)}
                  className="bg-black/60 border-slate-800 focus-visible:ring-sky-400 text-slate-100 font-mono h-11 text-sm rounded-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-300 font-bold uppercase tracking-wider block">Dropoff Location</label>
                <Input 
                  placeholder="e.g. Dallas, TX" 
                  value={dropoffLoc}
                  onChange={(e) => setDropoffLoc(e.target.value)}
                  className="bg-black/60 border-slate-800 focus-visible:ring-sky-400 text-slate-100 font-mono h-11 text-sm rounded-sm"
                />
              </div>

              <div className="md:col-span-3 flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <span className="text-slate-400 font-bold">Preset Corridors:</span>
                  {sampleRoutes.map((r, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => launchPreset(r)}
                      className="px-2.5 py-1 rounded-sm border border-white/10 bg-black/40 text-sky-300 hover:bg-sky-500/10 hover:border-sky-400/40 transition-all"
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                <Button type="submit" className="w-full sm:w-auto h-11 px-6 bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold rounded-sm border border-sky-300/40 shadow-md">
                  Generate Plan <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </form>
          </div>
        </motion.div>

        {/* Commercial Map Feature */}
        <div className="w-full max-w-6xl mx-auto mt-16 z-10">
          <GpsTrackerModel />
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-20 px-4 sm:px-6 bg-[#04070c]/90 border-t border-white/[0.08] relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight uppercase mb-4 font-sans">
              Built for Commercial Logistics
            </h2>
            <p className="text-slate-400 text-sm font-normal leading-relaxed">
              Fully compliant with FMCSA 70-hour / 8-day regulations, mandatory 30-minute breaks, and fuel stop algorithms.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-md bg-[#080d16] border border-sky-500/20">
              <Clock className="w-8 h-8 text-sky-400 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2 uppercase font-sans">FMCSA HOS Rules</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-mono">
                Calculates 11-hour driving limits, 14-hour duty windows, 10-hour mandatory rest breaks, and 70-hour cycle status.
              </p>
            </div>

            <div className="p-6 rounded-md bg-[#080d16] border border-sky-500/20">
              <Fuel className="w-8 h-8 text-sky-400 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2 uppercase font-sans">Automated Fuel Stops</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-mono">
                Places fuel stops automatically every 1,000 miles based on standard commercial truck tank capacities.
              </p>
            </div>

            <div className="p-6 rounded-md bg-[#080d16] border border-sky-500/20">
              <FileText className="w-8 h-8 text-sky-400 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2 uppercase font-sans">ELD Log Sheets</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-mono">
                Generates multi-day FMCSA daily log sheets with off-duty, sleeper berth, driving, and on-duty time grids.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-white/[0.08] bg-[#030508] text-center text-xs font-mono text-slate-500">
        <p>HaulWise Commercial Freight Planner © 2026. All rights reserved.</p>
      </footer>
    </div>
  );
}
