import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PlannerForm from '@/components/planner/PlannerForm';
import TripMap from '@/components/planner/TripMap';
import SummaryCards from '@/components/planner/SummaryCards';
import TripTimeline from '@/components/planner/TripTimeline';
import DailyLogViewer from '@/components/planner/DailyLogViewer';
import { usePlanTrip } from '@haulwise/api-client-react';
import type { TripInput, TripPlan, ApiError } from '@haulwise/api-client-react';
import { AlertTriangle, Map, Navigation, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Reads URL query params ?current=...&pickup=...&dropoff=...&cycle=...
 * so the Landing Page preset corridors can pre-fill the form.
 */
function useUrlSearchParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    current_location: params.get('current') ?? '',
    pickup_location: params.get('pickup') ?? '',
    dropoff_location: params.get('dropoff') ?? '',
    current_cycle_used: Number(params.get('cycle') ?? 0),
  };
}

export default function PlannerPage() {
  const initialValues = useUrlSearchParams();
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);

  const planTrip = usePlanTrip();
  const queryClient = useQueryClient();

  const resultsRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (data: TripInput) => {
    console.log('[Frontend] Submitting Trip Request Payload:', JSON.stringify(data, null, 2));

    planTrip.mutate({ data }, {
      onSuccess: (result: any) => {
        console.log('[Frontend] Trip Request Succeeded:', result);
        const plan: TripPlan = result.trip_plan || result;
        setTripPlan(plan);
        setShowSidebar(false); // Hide sidebar after successful trip generation

        // Auto-refresh trip history query cache
        queryClient.invalidateQueries();

        if (window.innerWidth < 1024 && resultsRef.current) {
          resultsRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      },
      onError: (err: any) => {
        console.error('[Frontend] Trip Request Failed (Error Details):', err);
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-[calc(100vh-4rem)] bg-[#0a0e17]">
      {/* Sidebar Form - Hidden after trip generation */}
      {showSidebar && (
        <div className="w-full lg:w-[380px] shrink-0 z-20 shadow-2xl lg:h-[calc(100vh-4rem)] lg:overflow-y-auto">
          <PlannerForm
            onSubmit={handleSubmit}
            isLoading={planTrip.isPending}
            initialValues={initialValues}
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)] overflow-y-auto bg-[#0a0e17] relative p-4 md:p-6 pb-32" ref={resultsRef}>

        {/* Floating Button to Show Sidebar */}
        {!showSidebar && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="fixed top-20 left-4 z-30"
          >
            <Button
              onClick={() => setShowSidebar(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-2xl"
              size="lg"
            >
              <SlidersHorizontal className="w-5 h-5 mr-2" />
              Show Trip Parameters
            </Button>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {planTrip.isPending ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-50 min-h-[400px]"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
                <Navigation className="w-12 h-12 text-blue-400 animate-[spin_3s_linear_infinite]" />
              </div>
              <h3 className="text-xl font-bold mt-6 text-white">Calculating Route...</h3>
              <p className="text-slate-400 text-sm mt-2">Computing HOS constraints & fuel stops</p>
            </motion.div>
          ) : planTrip.error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-8 max-w-lg mx-auto mt-12"
            >
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-8 text-center backdrop-blur-xl">
                <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto mb-6">
                  <AlertTriangle className="w-8 h-8 text-rose-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Routing Failed</h3>
                <p className="text-slate-400 text-sm mb-6">
                  {((planTrip.error as any)?.data as any)?.message || ((planTrip.error as any)?.response?.data as ApiError)?.error || (planTrip.error as any)?.message || 'An unexpected error occurred while calculating the route.'}
                </p>
                <Button variant="outline" onClick={() => planTrip.reset()} className="border-rose-500/30 hover:bg-rose-500/10 text-white">
                  Dismiss
                </Button>
              </div>
            </motion.div>
          ) : tripPlan ? (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6 max-w-7xl mx-auto pb-24"
            >
              <div className="h-[400px] md:h-[500px] w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                <TripMap stops={tripPlan.stops} routeGeometry={tripPlan.routeGeometry} />
              </div>

              <SummaryCards plan={tripPlan} />

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-1">
                  <TripTimeline stops={tripPlan.stops} />
                </div>
                <div className="xl:col-span-2 space-y-6">
                  <DailyLogViewer logs={tripPlan.dailyLogs} stops={tripPlan.stops} />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="min-h-[500px] h-full flex flex-col items-center justify-center p-8 text-center"
            >
              <div className="w-24 h-24 mb-6 relative">
                <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-2xl animate-pulse" />
                <div className="relative w-full h-full rounded-2xl border border-white/10 bg-white/[0.03] flex items-center justify-center backdrop-blur-sm">
                  <Map className="w-10 h-10 text-blue-400 opacity-60" />
                </div>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold mb-3 text-white">Ready for Trip Parameters</h2>
              <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
                Enter your current location, pickup, and dropoff in the parameters panel and click <span className="text-blue-400 font-medium">Generate Plan</span>.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
