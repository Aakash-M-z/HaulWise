import { useState } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { DailyLog } from '@haulwise/api-client-react';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DailyLogViewerProps {
  logs?: DailyLog[];
}

const statuses = [
  { id: 'off_duty', aliases: ['off_duty', 'OFF_DUTY'], label: 'Off Duty (1)', color: 'bg-muted-foreground' },
  { id: 'sleeper_berth', aliases: ['sleeper_berth', 'SLEEPER_BERTH'], label: 'Sleeper (2)', color: 'bg-purple-500' },
  { id: 'driving', aliases: ['driving', 'DRIVING'], label: 'Driving (3)', color: 'bg-primary' },
  { id: 'on_duty', aliases: ['on_duty', 'ON_DUTY', 'ON_DUTY_NOT_DRIVING'], label: 'On Duty (4)', color: 'bg-orange-500' },
];

const safeFormatLogDate = (dateStr?: string, dayNum?: number) => {
  if (!dateStr) return `Day ${dayNum || 1}`;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? dateStr : format(d, 'MMM d');
};

export default function DailyLogViewer({ logs = [] }: DailyLogViewerProps) {
  const [activeTab, setActiveTab] = useState(logs[0]?.date || 'Day 1');

  if (!logs || logs.length === 0) return null;

  return (
    <div className="w-full bg-card rounded-xl border border-white/5 p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Projected ELD Logs
          </h3>
          <p className="text-xs text-muted-foreground font-mono mt-1">FMCSA Compliant Grid</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto bg-black/20 border border-white/5 h-auto p-1 mb-6 no-scrollbar">
          {logs.map((log: any, i) => {
            const dateVal = log.date || `Day ${log.dayNumber || log.day_number || i + 1}`;
            const dayNum = log.dayNumber || log.day_number || i + 1;
            return (
              <TabsTrigger 
                key={dateVal} 
                value={dateVal}
                className="font-mono text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
              >
                Day {dayNum}: {safeFormatLogDate(log.date, dayNum)}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {logs.map((log: any, i) => {
          const dateVal = log.date || `Day ${log.dayNumber || log.day_number || i + 1}`;
          return (
            <TabsContent key={dateVal} value={dateVal} className="mt-0">
              <LogGrid log={log} />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

function LogGrid({ log }: { log: any }) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const segments = log.segments || [];

  const totalOffDuty = log.totalOffDuty ?? log.total_off_duty ?? 14.0;
  const totalSleeper = log.totalSleeperBerth ?? log.total_sleeper_berth ?? 0.0;
  const totalDriving = log.totalDriving ?? log.total_driving ?? log.total_drive_hours ?? 8.0;
  const totalOnDuty = log.totalOnDuty ?? log.total_on_duty ?? 2.0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="relative border border-white/10 rounded-lg bg-black/40 overflow-x-auto">
        <div className="min-w-[800px] p-4">
          {/* Header Row (Hours) */}
          <div className="flex ml-24 mb-2">
            {hours.map(h => (
              <div key={h} className="flex-1 text-center font-mono text-[10px] text-muted-foreground border-l border-white/5 h-4">
                {h}
              </div>
            ))}
            <div className="w-16 text-center font-mono text-[10px] text-muted-foreground font-bold">Total</div>
          </div>

          {/* Grid Rows */}
          <div className="relative border-t border-l border-r border-white/10 bg-black/20">
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
                  <div className="w-24 flex items-center px-2 text-[10px] font-mono font-medium border-r border-white/10 text-muted-foreground bg-black/40 z-10">
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
                            "absolute top-1/2 -translate-y-1/2 h-3 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-all group-hover:h-4 group-hover:brightness-125",
                            status.color
                          )}
                          style={{
                            left: `${(startH / 24) * 100}%`,
                            width: `${((endH - startH) / 24) * 100}%`
                          }}
                        />
                      );
                    })}
                  </div>

                  <div className="w-16 flex items-center justify-center font-mono text-xs font-bold border-l border-white/10 bg-black/40 z-10 text-primary">
                    {totalStr}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {log.remarks && log.remarks.length > 0 && (
        <div className="bg-white/5 rounded-lg p-4 border border-white/5">
          <h4 className="text-sm font-semibold mb-2">Remarks</h4>
          <ul className="space-y-1 list-disc list-inside pl-4">
            {log.remarks.map((remark: string, i: number) => (
              <li key={i} className="text-sm text-muted-foreground font-mono">{remark}</li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}
