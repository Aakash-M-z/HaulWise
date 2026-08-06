import { motion } from 'framer-motion';
import { MapPin, Flag, Fuel, Coffee, Moon, Navigation, CheckCircle2, Clock } from 'lucide-react';
import type { Stop } from '@haulwise/api-client-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface TripTimelineProps {
  stops: Stop[];
}

export default function TripTimeline({ stops }: TripTimelineProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'current': return Navigation;
      case 'pickup': return MapPin;
      case 'dropoff': return Flag;
      case 'fuel': return Fuel;
      case 'rest': return Moon;
      case 'break': return Coffee;
      default: return CheckCircle2;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'current': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'pickup': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'dropoff': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'fuel': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'rest': return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
      case 'break': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      default: return 'text-primary bg-primary/10 border-primary/20';
    }
  };

  return (
    <div className="w-full bg-card rounded-xl border border-white/5 p-6 shadow-lg relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[50px] pointer-events-none" />
      
      <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
        <RouteIcon className="w-5 h-5 text-primary" />
        Route Execution Plan
      </h3>

      <div className="relative pl-6 border-l border-white/10 space-y-8">
        {stops.map((stop, i) => {
          const Icon = getIcon(stop.type);
          const colorClass = getColor(stop.type);
          
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="relative"
            >
              {/* Timeline dot */}
              <div className={cn(
                "absolute -left-[35px] top-0 w-6 h-6 rounded-full border-2 flex items-center justify-center bg-background",
                colorClass.split(' ')[0], // text color for border
                colorClass.split(' ')[2]  // border color
              )}>
                <Icon className={cn("w-3 h-3", colorClass.split(' ')[0])} />
              </div>

              <div className="bg-white/5 border border-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded", colorClass)}>
                      {stop.type}
                    </span>
                    <span className="font-semibold">{stop.location}</span>
                  </div>
                  {stop.arrivalTime && (
                    <div className="text-sm font-mono text-muted-foreground flex items-center gap-1">
                      <ClockIcon className="w-3 h-3" />
                      {format(new Date(stop.arrivalTime), 'MMM d, HH:mm')}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground font-mono mt-3">
                  {stop.distanceFromStart != null && (
                    <span>Mile {Math.round(stop.distanceFromStart)}</span>
                  )}
                  {stop.duration > 0 && (
                    <span className="flex items-center gap-1 text-primary">
                      <ClockIcon className="w-3 h-3" /> {stop.duration} hr duration
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function RouteIcon(props: any) {
  return <MapPin {...props} />;
}
function ClockIcon(props: any) {
  return <Clock {...props} />;
}
