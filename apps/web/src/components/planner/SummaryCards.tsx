import { motion } from 'framer-motion';
import { Route, Clock, Zap, Fuel, Coffee, Calendar, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { TripPlan } from '@haulwise/api-client-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

// Animated counter component
function Counter({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    const duration = 800;
    const increment = end / (duration / 16);

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
  plan: TripPlan & {
    currentCycleUsed?: number;
    initialRemainingCycleHours?: number;
    totalDutyHours?: number;
    isCycleInsufficient?: boolean;
    cycleWarningMessage?: string;
  };
}

export default function SummaryCards({ plan }: SummaryCardsProps) {
  const currentCycleUsed = plan.currentCycleUsed ?? 0;
  const initialRemainingCycle = plan.initialRemainingCycleHours ?? Math.max(0, 70 - currentCycleUsed);
  const remainingCycleAfterTrip = plan.remainingCycleHours ?? 0;
  const isInsufficient = plan.isCycleInsufficient ?? (remainingCycleAfterTrip <= 0 && plan.totalDrivingHours > initialRemainingCycle);
  const warningMsg = plan.cycleWarningMessage || `FMCSA HOS Warning: Driver has ${initialRemainingCycle.toFixed(1)}h remaining in 70-hr cycle, but trip requires on-duty time exceeding available hours. 34-hour cycle restart required.`;

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
      label: 'Total Trip Time',
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
      label: 'Start Cycle Rem.',
      value: initialRemainingCycle,
      unit: 'hrs',
      decimals: 1,
      icon: Calendar,
      color: 'text-sky-400',
      bg: 'bg-sky-400/10',
    },
    {
      label: 'End Cycle Rem.',
      value: remainingCycleAfterTrip,
      unit: 'hrs',
      decimals: 1,
      icon: Calendar,
      color: isInsufficient ? 'text-rose-400' : 'text-emerald-400',
      bg: isInsufficient ? 'bg-rose-500/10' : 'bg-emerald-400/10',
    },
  ];

  return (
    <div className="space-y-4 w-full">
      {/* Insufficient Cycle Warning Banner */}
      {isInsufficient && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 flex items-start gap-3 shadow-xl backdrop-blur-md"
        >
          <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-extrabold text-sm uppercase tracking-wide text-rose-100 flex items-center gap-2 font-sans">
              FMCSA 70-Hour / 8-Day Cycle Insufficient
            </h4>
            <p className="text-xs font-mono text-rose-300 leading-relaxed">
              {warningMsg}
            </p>
          </div>
        </motion.div>
      )}

      {/* Cycle Compliant Badge */}
      {!isInsufficient && (
        <div className="px-4 py-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>70-Hour / 8-Day Cycle Status: <strong>COMPLIANT</strong></span>
          </div>
          <div>
            Used: <strong>{currentCycleUsed}h</strong> | Available: <strong>{initialRemainingCycle.toFixed(1)}h</strong> $\rightarrow$ End: <strong>{remainingCycleAfterTrip.toFixed(1)}h</strong>
          </div>
        </div>
      )}

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 w-full">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className="flex flex-col p-4 rounded-xl bg-card border border-white/5 shadow-lg relative overflow-hidden group hover:border-primary/30 transition-colors"
          >
            <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-10 transition-opacity">
              <card.icon className={cn("w-16 h-16", card.color)} />
            </div>
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-3", card.bg)}>
              <card.icon className={cn("w-4 h-4", card.color)} />
            </div>
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1 font-mono font-medium">
              {card.label}
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight glow-text flex items-baseline gap-1 z-10">
              <Counter value={card.value} decimals={card.decimals} />
              {card.unit && <span className="text-xs text-muted-foreground font-mono">{card.unit}</span>}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
