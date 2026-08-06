import { useParams, Link } from 'wouter';
import { useGetTrip } from '@haulwise/api-client-react';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Calendar } from 'lucide-react';
import TripMap from '@/components/planner/TripMap';
import SummaryCards from '@/components/planner/SummaryCards';
import TripTimeline from '@/components/planner/TripTimeline';
import DailyLogViewer from '@/components/planner/DailyLogViewer';
import { format } from 'date-fns';

export default function TripDetailPage() {
  const params = useParams();
  const tripId = params.id ? parseInt(params.id, 10) : 0;
  
  const { data: trip, isLoading, error } = useGetTrip(tripId);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-20">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-6" />
        <h2 className="text-xl font-mono text-primary glow-text mb-2">Decrypting Archive</h2>
        <p className="text-muted-foreground font-mono">Loading trip {tripId}...</p>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-20">
        <div className="p-8 bg-destructive/10 border border-destructive/20 rounded-xl text-center max-w-md w-full backdrop-blur">
          <h2 className="text-xl font-bold mb-2">Archive Not Found</h2>
          <p className="text-muted-foreground font-mono mb-6">Could not locate trip #{tripId}.</p>
          <Link href="/trips" className="text-primary hover:underline font-medium inline-flex items-center">
            <ArrowLeft className="w-4 h-4 mr-2" /> Return to History
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-black relative">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4"
        >
          <div>
            <Link href="/trips" className="inline-flex items-center text-sm font-mono text-muted-foreground hover:text-primary transition-colors mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to History
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">Route Execution Plan #{trip.id}</h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground font-mono">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-primary" />
                {format(new Date(trip.createdAt), 'MMMM d, yyyy - HH:mm')}
              </span>
              <span className="opacity-50">|</span>
              <span>{trip.currentCycleUsed} hrs cycle used</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          <div className="h-[40vh] md:h-[500px] w-full rounded-xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 relative">
            <div className="absolute top-4 left-4 z-[1000] bg-black/60 backdrop-blur-md border border-white/10 p-4 rounded-lg flex flex-col gap-2 max-w-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs font-mono">{trip.currentLocation}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs font-mono">{trip.pickupLocation}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs font-mono">{trip.dropoffLocation}</span>
              </div>
            </div>
            <TripMap stops={trip.plan.stops} routeGeometry={trip.plan.routeGeometry} />
          </div>
          
          <SummaryCards plan={trip.plan} />
          
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-1">
              <TripTimeline stops={trip.plan.stops} />
            </div>
            <div className="xl:col-span-2 space-y-6">
              <DailyLogViewer logs={trip.plan.dailyLogs} />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
