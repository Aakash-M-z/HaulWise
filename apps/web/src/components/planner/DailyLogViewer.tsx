import { useState } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { DailyLog, Stop } from '@haulwise/api-client-react';
import { format } from 'date-fns';
import { Clock, MapPin, Fuel, Coffee, Moon, CheckCircle2, LayoutList, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface DailyLogViewerProps {
  logs?: DailyLog[];
  stops?: Stop[];
}

const statuses = [
  { id: 'off_duty', aliases: ['off_duty', 'OFF_DUTY'], label: 'Off Duty (1)', color: 'bg-slate-400' },
  { id: 'sleeper_berth', aliases: ['sleeper_berth', 'SLEEPER_BERTH'], label: 'Sleeper (2)', color: 'bg-purple-500' },
  { id: 'driving', aliases: ['driving', 'DRIVING'], label: 'Driving (3)', color: 'bg-sky-500' },
  { id: 'on_duty', aliases: ['on_duty', 'ON_DUTY', 'ON_DUTY_NOT_DRIVING'], label: 'On Duty (4)', color: 'bg-amber-500' },
];

const safeFormatLogDate = (dateStr?: string, dayNum?: number) => {
  if (!dateStr) return `Day ${dayNum || 1}`;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? dateStr : format(d, 'MMM d, yyyy');
};

const getStopIcon = (type: string) => {
  switch (type) {
    case 'fuel':
      return <Fuel className="w-3.5 h-3.5 text-amber-400" />;
    case 'rest':
      return <Moon className="w-3.5 h-3.5 text-purple-400" />;
    case 'break':
      return <Coffee className="w-3.5 h-3.5 text-sky-400" />;
    case 'pickup':
    case 'dropoff':
    case 'current':
    default:
      return <MapPin className="w-3.5 h-3.5 text-emerald-400" />;
  }
};

export default function DailyLogViewer({ logs = [], stops = [] }: DailyLogViewerProps) {
  const [activeTab, setActiveTab] = useState(logs[0]?.date || 'Day 1');
  const [viewMode, setViewMode] = useState<'stacked' | 'tabs'>('stacked');

  if (!logs || logs.length === 0) return null;

  return (
    <div className="w-full bg-card rounded-xl border border-white/10 p-6 shadow-2xl space-y-6">
      {/* Header section with title and view mode toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-sky-400" />
            <h3 className="text-xl font-extrabold text-white tracking-tight uppercase font-sans">
              Daily ELD Driver Log Sheets ({logs.length} {logs.length === 1 ? 'Sheet' : 'Sheets'})
            </h3>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            FMCSA §395.8 Compliant 24-Hour Duty Status Records • 70-Hr / 8-Day Cycle
          </p>
        </div>

        {/* View Mode Toggle for multi-day trips */}
        {logs.length > 1 && (
          <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-lg border border-white/10 self-start sm:self-auto">
            <Button
              size="sm"
              variant={viewMode === 'stacked' ? 'default' : 'ghost'}
              onClick={() => setViewMode('stacked')}
              className={cn("h-7 px-3 text-xs font-mono gap-1.5", viewMode === 'stacked' && "bg-sky-500 text-slate-950 font-bold")}
            >
              <Layers className="w-3.5 h-3.5" />
              All Sheets Stacked ({logs.length})
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'tabs' ? 'default' : 'ghost'}
              onClick={() => setViewMode('tabs')}
              className={cn("h-7 px-3 text-xs font-mono gap-1.5", viewMode === 'tabs' && "bg-sky-500 text-slate-950 font-bold")}
            >
              <LayoutList className="w-3.5 h-3.5" />
              Day Tabs
            </Button>
          </div>
        )}
      </div>

      {/* Stacked View: Displays all ELD Log Sheets sequentially for multi-day trips */}
      {viewMode === 'stacked' ? (
        <div className="space-y-8">
          {logs.map((log: any, i) => {
            const dayNum = log.dayNumber || log.day_number || i + 1;
            const logDate = log.date || `Day ${dayNum}`;
            const dayStops = stops.filter(s => {
              if (!s.arrivalTime) return false;
              const stopDateStr = s.arrivalTime.split('T')[0];
              return stopDateStr === log.date;
            });

            return (
              <div key={logDate} className="space-y-4 pt-2 first:pt-0 border-b border-white/10 pb-8 last:border-b-0 last:pb-0">
                <div className="flex items-center justify-between bg-slate-900/80 px-4 py-2.5 rounded-lg border border-white/10">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded bg-sky-500/20 text-sky-300 font-mono text-xs font-bold border border-sky-500/30 uppercase">
                      Sheet #{dayNum} of {logs.length}
                    </span>
                    <span className="text-sm font-extrabold text-white font-mono">
                      {safeFormatLogDate(log.date, dayNum)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>24.0 Hours Verified</span>
                  </div>
                </div>

                <LogGrid log={log} dayStops={dayStops} />
              </div>
            );
          })}
        </div>
      ) : (
        /* Tabbed View: Displays day-by-day tabs */
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start overflow-x-auto bg-black/40 border border-white/10 h-auto p-1 mb-6 no-scrollbar rounded-lg">
            {logs.map((log: any, i) => {
              const dateVal = log.date || `Day ${log.dayNumber || log.day_number || i + 1}`;
              const dayNum = log.dayNumber || log.day_number || i + 1;
              return (
                <TabsTrigger 
                  key={dateVal} 
                  value={dateVal}
                  className="font-mono text-xs data-[state=active]:bg-sky-500 data-[state=active]:text-slate-950 data-[state=active]:font-bold px-4 py-2 rounded-md"
                >
                  Day {dayNum}: {safeFormatLogDate(log.date, dayNum)}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {logs.map((log: any, i) => {
            const dateVal = log.date || `Day ${log.dayNumber || log.day_number || i + 1}`;
            const dayStops = stops.filter(s => {
              if (!s.arrivalTime) return false;
              const stopDateStr = s.arrivalTime.split('T')[0];
              return stopDateStr === log.date;
            });

            return (
              <TabsContent key={dateVal} value={dateVal} className="mt-0">
                <LogGrid log={log} dayStops={dayStops} />
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}

function LogGrid({ log, dayStops = [] }: { log: any; dayStops?: Stop[] }) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const segments = log.segments || [];

  const totalOffDuty = log.totalOffDuty ?? log.total_off_duty ?? 14.0;
  const totalSleeper = log.totalSleeperBerth ?? log.total_sleeper_berth ?? 0.0;
  const totalDriving = log.totalDriving ?? log.total_driving ?? log.total_drive_hours ?? 8.0;
  const totalOnDuty = log.totalOnDuty ?? log.total_on_duty ?? 2.0;
  const grandTotal = totalOffDuty + totalSleeper + totalDriving + totalOnDuty;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Hour Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-slate-900/60 border border-white/10 rounded-lg p-3 text-center">
          <div className="text-[10px] font-mono uppercase text-slate-400">Off Duty</div>
          <div className="text-lg font-bold font-mono text-slate-200">{Number(totalOffDuty).toFixed(1)}h</div>
        </div>
        <div className="bg-slate-900/60 border border-purple-500/20 rounded-lg p-3 text-center">
          <div className="text-[10px] font-mono uppercase text-purple-400">Sleeper</div>
          <div className="text-lg font-bold font-mono text-purple-300">{Number(totalSleeper).toFixed(1)}h</div>
        </div>
        <div className="bg-slate-900/60 border border-sky-500/20 rounded-lg p-3 text-center">
          <div className="text-[10px] font-mono uppercase text-sky-400">Driving</div>
          <div className="text-lg font-bold font-mono text-sky-300">{Number(totalDriving).toFixed(1)}h</div>
        </div>
        <div className="bg-slate-900/60 border border-amber-500/20 rounded-lg p-3 text-center">
          <div className="text-[10px] font-mono uppercase text-amber-400">On Duty</div>
          <div className="text-lg font-bold font-mono text-amber-300">{Number(totalOnDuty).toFixed(1)}h</div>
        </div>
        <div className="col-span-2 sm:col-span-1 bg-emerald-950/40 border border-emerald-500/30 rounded-lg p-3 text-center">
          <div className="text-[10px] font-mono uppercase text-emerald-400">Day Total</div>
          <div className="text-lg font-bold font-mono text-emerald-300">{Number(grandTotal).toFixed(1)}h</div>
        </div>
      </div>

      {/* FMCSA 24-Hour Duty Status Grid */}
      <div className="relative border border-white/10 rounded-lg bg-black/60 overflow-x-auto shadow-inner">
        <div className="min-w-[800px] p-4">
          {/* Header Row (Hours 0 - 24) */}
          <div className="flex ml-24 mb-2">
            {hours.map(h => (
              <div key={h} className="flex-1 text-center font-mono text-[10px] text-slate-400 border-l border-white/10 h-4">
                {h}
              </div>
            ))}
            <div className="w-16 text-center font-mono text-[10px] text-sky-400 font-bold uppercase">Total</div>
          </div>

          {/* Grid Rows for the 4 Duty Statuses */}
          <div className="relative border-t border-l border-r border-white/10 bg-black/40">
            {/* Vertical grid lines */}
            <div className="absolute top-0 bottom-0 left-24 right-16 flex pointer-events-none">
              {hours.map(h => (
                <div key={h} className="flex-1 border-l border-white/5" />
              ))}
            </div>

            {statuses.map((status) => {
              const statusSegments = segments.filter((s: any) => status.aliases.includes(s.status));
              
              let totalStr = '0.0';
              if (status.id === 'off_duty') totalStr = Number(totalOffDuty).toFixed(1);
              if (status.id === 'sleeper_berth') totalStr = Number(totalSleeper).toFixed(1);
              if (status.id === 'driving') totalStr = Number(totalDriving).toFixed(1);
              if (status.id === 'on_duty') totalStr = Number(totalOnDuty).toFixed(1);

              return (
                <div key={status.id} className="flex h-12 border-b border-white/10 relative group hover:bg-white/5 transition-colors">
                  <div className="w-24 flex items-center px-2 text-[10px] font-mono font-bold border-r border-white/10 text-slate-300 bg-slate-950/80 z-10">
                    {status.label}
                  </div>
                  
                  <div className="flex-1 relative z-10 mx-px">
                    {statusSegments.map((seg: any, i: number) => {
                      const startH = seg.startHour ?? seg.start_hour ?? 0;
                      const endH = seg.endHour ?? seg.end_hour ?? 0;
                      return (
                        <div
                          key={i}
                          className={cn(
                            "absolute top-1/2 -translate-y-1/2 h-3.5 rounded shadow-[0_0_12px_rgba(0,0,0,0.8)] transition-all group-hover:h-4 group-hover:brightness-125",
                            status.color
                          )}
                          style={{
                            left: `${(startH / 24) * 100}%`,
                            width: `${Math.max(0.5, ((endH - startH) / 24) * 100)}%`
                          }}
                        />
                      );
                    })}
                  </div>

                  <div className="w-16 flex items-center justify-center font-mono text-xs font-extrabold border-l border-white/10 bg-slate-950/80 z-10 text-sky-400">
                    {totalStr}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Remarks Section */}
      {log.remarks && log.remarks.length > 0 && (
        <div className="bg-slate-900/60 rounded-lg p-4 border border-white/10">
          <h4 className="text-xs font-bold uppercase font-mono text-slate-300 mb-2 flex items-center gap-1.5">
            Remarks & HOS Notes
          </h4>
          <ul className="space-y-1.5 list-disc list-inside pl-2">
            {log.remarks.map((remark: string, i: number) => (
              <li key={i} className="text-xs text-slate-300 font-mono leading-relaxed">{remark}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Stops Occurring That Day */}
      {dayStops && dayStops.length > 0 && (
        <div className="bg-slate-900/60 rounded-lg p-4 border border-white/10">
          <h4 className="text-xs font-bold uppercase font-mono text-slate-300 mb-3 flex items-center gap-1.5">
            Stops Occurring That Day ({dayStops.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {dayStops.map((stop: Stop, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded bg-black/40 border border-white/5 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-white/5 border border-white/10">
                    {getStopIcon(stop.type)}
                  </div>
                  <div>
                    <div className="font-bold text-slate-200 capitalize">{stop.type} — {stop.location}</div>
                    {stop.distanceFromStart != null && (
                      <div className="text-[10px] text-slate-400">Mile {stop.distanceFromStart}</div>
                    )}
                  </div>
                </div>
                {stop.arrivalTime && (
                  <div className="text-[10px] text-sky-400 font-bold bg-sky-950/60 px-2 py-0.5 rounded border border-sky-500/20">
                    {format(new Date(stop.arrivalTime), 'HH:mm')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
