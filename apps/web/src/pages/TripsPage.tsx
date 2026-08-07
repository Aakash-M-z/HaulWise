import { useListTrips } from '@haulwise/api-client-react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { MapPin, Route, Calendar, Loader2, ArrowRight, RefreshCw, Edit3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const safeFormatDate = (dateStr?: string) => {
  if (!dateStr) return format(new Date(), 'MMM d, yyyy');
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? format(new Date(), 'MMM d, yyyy') : format(d, 'MMM d, yyyy');
};

export default function TripsPage() {
  const { data: trips, isLoading, isFetching, error, refetch } = useListTrips();

  return (
    <div className="container mx-auto max-w-6xl py-12 px-4">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-4xl font-bold font-sans tracking-tighter mb-2">Trip History</h1>
          <p className="text-muted-foreground font-mono">Archive of all generated route plans</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => refetch()} 
          disabled={isFetching}
          className="border-sky-500/30 hover:bg-sky-500/10 text-sky-400 font-mono text-xs gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Refreshing...' : 'Auto-Refresh'}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground font-mono">Retrieving archives...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-xl text-center flex flex-col items-center gap-4">
          <p className="text-destructive font-mono">Failed to load trips.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="border-destructive/30 text-white">
            Try Again
          </Button>
        </div>
      ) : !trips || trips.length === 0 ? (
        <div className="text-center py-20 bg-card/30 rounded-xl border border-white/5 backdrop-blur">
          <Route className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold mb-2">No trips found</h3>
          <p className="text-muted-foreground mb-6 font-mono">You haven't generated any route plans yet.</p>
          <Link href="/planner" className="inline-flex items-center justify-center h-10 px-6 font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors">
            Create First Plan
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip: any, i: number) => {
            const createdAtStr = trip.createdAt || trip.created_at;
            const currentLoc = trip.currentLocation || trip.current_location || 'Unknown Origin';
            const pickupLoc = trip.pickupLocation || trip.pickup_location || 'Unknown Pickup';
            const dropoffLoc = trip.dropoffLocation || trip.dropoff_location || 'Unknown Destination';
            const cycleUsed = trip.currentCycleUsed ?? trip.current_cycle_used ?? 0;
            const planData = trip.plan || trip.trip_plan || {};
            const dist = planData.totalDistanceMiles ?? planData.total_distance_miles ?? 0;
            const dur = planData.totalTripHours ?? planData.total_trip_duration_hours ?? 0;

            const rePlanUrl = `/planner?current=${encodeURIComponent(currentLoc)}&pickup=${encodeURIComponent(pickupLoc)}&dropoff=${encodeURIComponent(dropoffLoc)}&cycle=${cycleUsed}`;

            return (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
              >
                <Card className="h-full bg-card/40 hover:bg-card/80 border-white/5 hover:border-primary/30 transition-all group shadow-lg hover:shadow-[0_0_30px_rgba(0,229,255,0.15)] relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-[30px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  
                  <CardContent className="p-6 flex flex-col h-full relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-black/40 px-2 py-1 rounded border border-white/5">
                        <Calendar className="w-3 h-3 text-primary" />
                        {safeFormatDate(createdAtStr)}
                      </div>
                      <Link href={`/trips/${trip.id}`} className="text-xs font-mono text-sky-400 hover:text-sky-300 flex items-center gap-1 font-bold">
                        View Details <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>

                    <div className="flex-1 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Origin</p>
                          <p className="font-semibold text-sm line-clamp-1">{currentLoc}</p>
                        </div>
                      </div>

                      <div className="ml-3 w-px h-6 bg-gradient-to-b from-blue-500/50 via-white/10 to-green-500/50" />

                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Pickup</p>
                          <p className="font-semibold text-sm line-clamp-1">{pickupLoc}</p>
                        </div>
                      </div>

                      <div className="ml-3 w-px h-6 bg-gradient-to-b from-green-500/50 via-white/10 to-red-500/50" />

                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                          <MapPin className="w-3 h-3 text-red-500" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Destination</p>
                          <p className="font-semibold text-sm line-clamp-1">{dropoffLoc}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Distance & Duration</p>
                        <p className="font-mono font-bold text-sm text-sky-300">
                          {typeof dist === 'number' ? dist.toFixed(0) : dist} mi ({typeof dur === 'number' ? dur.toFixed(1) : dur}h)
                        </p>
                      </div>

                      <Link href={rePlanUrl}>
                        <Button size="sm" variant="outline" className="border-sky-500/30 hover:bg-sky-500/10 text-sky-300 font-mono text-xs gap-1.5 h-8">
                          <Edit3 className="w-3.5 h-3.5" />
                          Update Trip
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
