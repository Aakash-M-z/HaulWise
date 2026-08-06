import { useListTrips } from '@haulwise/api-client-react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { MapPin, Route, Calendar, Loader2, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function TripsPage() {
  const { data: trips, isLoading, error } = useListTrips();

  return (
    <div className="container mx-auto max-w-6xl py-12 px-4">
      <div className="mb-10">
        <h1 className="text-4xl font-bold font-sans tracking-tighter mb-2">Trip History</h1>
        <p className="text-muted-foreground font-mono">Archive of all generated route plans</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground font-mono">Retrieving archives...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-xl text-center">
          <p className="text-destructive font-mono">Failed to load trips.</p>
        </div>
      ) : trips?.length === 0 ? (
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
          {trips?.map((trip, i) => (
            <Link key={trip.id} href={`/trips/${trip.id}`}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
              >
                <Card className="h-full bg-card/40 hover:bg-card/80 border-white/5 hover:border-primary/30 transition-all cursor-pointer group shadow-lg hover:shadow-[0_0_30px_rgba(0,229,255,0.15)] relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-[30px] opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <CardContent className="p-6 flex flex-col h-full relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-black/40 px-2 py-1 rounded border border-white/5">
                        <Calendar className="w-3 h-3 text-primary" />
                        {format(new Date(trip.createdAt), 'MMM d, yyyy')}
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-1" />
                    </div>

                    <div className="flex-1 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Origin</p>
                          <p className="font-semibold text-sm line-clamp-1">{trip.currentLocation}</p>
                        </div>
                      </div>

                      <div className="ml-3 w-px h-6 bg-gradient-to-b from-blue-500/50 via-white/10 to-green-500/50" />

                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Pickup</p>
                          <p className="font-semibold text-sm line-clamp-1">{trip.pickupLocation}</p>
                        </div>
                      </div>

                      <div className="ml-3 w-px h-6 bg-gradient-to-b from-green-500/50 via-white/10 to-red-500/50" />

                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                          <MapPin className="w-3 h-3 text-red-500" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Destination</p>
                          <p className="font-semibold text-sm line-clamp-1">{trip.dropoffLocation}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total Distance</p>
                        <p className="font-mono font-semibold text-primary">{trip.plan.totalDistanceMiles.toFixed(0)} mi</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Est. Duration</p>
                        <p className="font-mono font-semibold text-primary">{trip.plan.totalTripHours.toFixed(1)} hrs</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
