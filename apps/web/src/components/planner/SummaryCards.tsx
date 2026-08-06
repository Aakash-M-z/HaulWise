import { motion } from 'framer-motion';
import { Route, Clock, Zap, Fuel, Coffee, Calendar, Flag } from 'lucide-react';
import type { TripPlan } from '@haulwise/api-client-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

// Animated counter component
function Counter({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    const duration = 1000;
    const increment = end / (duration / 16); // 60fps

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(start);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value]);

  return <>{displayValue.toFixed(decimals)}</>;
}

interface SummaryCardsProps {
  plan: TripPlan;
}

export default function SummaryCards({ plan }: SummaryCardsProps) {
  const cards = [
    {
      label: 'Distance',
      value: plan.totalDistanceMiles,
      unit: 'mi',
      icon: Route,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Driving Time',
      value: plan.totalDrivingHours,
      unit: 'hrs',
      decimals: 1,
      icon: Zap,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
    },
    {
      label: 'Total Time',
      value: plan.totalTripHours,
      unit: 'hrs',
      decimals: 1,
      icon: Clock,
      color: 'text-indigo-400',
      bg: 'bg-indigo-400/10',
    },
    {
      label: 'Fuel Stops',
      value: plan.fuelStopCount,
      unit: '',
      icon: Fuel,
      color: 'text-orange-400',
      bg: 'bg-orange-400/10',
    },
    {
      label: 'Rest Breaks',
      value: plan.restStopCount,
      unit: '',
      icon: Coffee,
      color: 'text-purple-400',
      bg: 'bg-purple-400/10',
    },
    {
      label: 'Cycle Rem.',
      value: plan.remainingCycleHours,
      unit: 'hrs',
      decimals: 1,
      icon: Calendar,
      color: plan.remainingCycleHours < 10 ? 'text-destructive' : 'text-green-400',
      bg: plan.remainingCycleHours < 10 ? 'bg-destructive/10' : 'bg-green-400/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 w-full">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1, duration: 0.5 }}
          className="flex flex-col p-4 rounded-xl bg-card border border-white/5 shadow-lg relative overflow-hidden group hover:border-primary/30 transition-colors"
        >
          <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-10 transition-opacity">
            <card.icon className={cn("w-16 h-16", card.color)} />
          </div>
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-3", card.bg)}>
            <card.icon className={cn("w-4 h-4", card.color)} />
          </div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            {card.label}
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight glow-text flex items-baseline gap-1 z-10">
            <Counter value={card.value} decimals={card.decimals} />
            {card.unit && <span className="text-sm text-muted-foreground">{card.unit}</span>}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
