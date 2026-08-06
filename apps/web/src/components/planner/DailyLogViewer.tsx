import { useState } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { DailyLog, LogSegment } from '@haulwise/api-client-react';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DailyLogViewerProps {
  logs: DailyLog[];
}

const statuses = [
  { id: 'off_duty', label: 'Off Duty (1)', color: 'bg-muted-foreground' },
  { id: 'sleeper_berth', label: 'Sleeper (2)', color: 'bg-purple-500' },
  { id: 'driving', label: 'Driving (3)', color: 'bg-primary' },
  { id: 'on_duty', label: 'On Duty (4)', color: 'bg-orange-500' },
];

export default function DailyLogViewer({ logs }: DailyLogViewerProps) {
  const [activeTab, setActiveTab] = useState(logs[0]?.date || '');

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
          {logs.map((log) => (
            <TabsTrigger 
              key={log.date} 
              value={log.date}
              className="font-mono text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
            >
              Day {log.dayNumber}: {format(new Date(log.date), 'MMM d')}
            </TabsTrigger>
          ))}
        </TabsList>

        {logs.map((log) => (
          <TabsContent key={log.date} value={log.date} className="mt-0">
            <LogGrid log={log} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function LogGrid({ log }: { log: DailyLog }) {
  const hours = Array.from({ length: 24 }, (_, i) => i);

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

            {statuses.map((status, rowIndex) => {
              const segments = log.segments.filter(s => s.status === status.id);
              
              let totalStr = '0.0';
              if (status.id === 'off_duty') totalStr = log.totalOffDuty.toFixed(1);
              if (status.id === 'sleeper_berth') totalStr = log.totalSleeperBerth.toFixed(1);
              if (status.id === 'driving') totalStr = log.totalDriving.toFixed(1);
              if (status.id === 'on_duty') totalStr = log.totalOnDuty.toFixed(1);

              return (
                <div key={status.id} className="flex h-12 border-b border-white/10 relative group hover:bg-white/5 transition-colors">
                  <div className="w-24 flex items-center px-2 text-[10px] font-mono font-medium border-r border-white/10 text-muted-foreground bg-black/40 z-10">
                    {status.label}
                  </div>
                  
                  <div className="flex-1 relative z-10 mx-px">
                    {segments.map((seg, i) => (
                      <div
                        key={i}
                        className={cn(
                          "absolute top-1/2 -translate-y-1/2 h-3 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-all group-hover:h-4 group-hover:brightness-125",
                          status.color
                        )}
                        style={{
                          left: `${(seg.startHour / 24) * 100}%`,
                          width: `${((seg.endHour - seg.startHour) / 24) * 100}%`
                        }}
                      />
                    ))}
                  </div>

                  <div className="w-16 flex items-center justify-center font-mono text-xs font-bold border-l border-white/10 bg-black/40 z-10 text-primary">
                    {totalStr}
                  </div>
                </div>
              );
            })}
            
            {/* Draw connecting vertical lines between segments if they are continuous - omitted for simplicity, bars are clear enough */}
          </div>
        </div>
      </div>

      {log.remarks && log.remarks.length > 0 && (
        <div className="bg-white/5 rounded-lg p-4 border border-white/5">
          <h4 className="text-sm font-semibold mb-2">Remarks</h4>
          <ul className="space-y-1 list-disc list-inside pl-4">
            {log.remarks.map((remark, i) => (
              <li key={i} className="text-sm text-muted-foreground font-mono">{remark}</li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}
