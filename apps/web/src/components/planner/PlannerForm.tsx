import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Zap, SlidersHorizontal } from 'lucide-react';
import type { TripInput } from '@haulwise/api-client-react';

const formSchema = z.object({
  current_location: z.string().min(2, 'Current location is required'),
  pickup_location: z.string().min(2, 'Pickup location is required'),
  dropoff_location: z.string().min(2, 'Dropoff location is required'),
  current_cycle_used: z.coerce
    .number({ invalid_type_error: 'Current cycle hours must be a number between 0 and 70' })
    .min(0, 'Current cycle hours must be at least 0')
    .max(70, 'Current cycle hours cannot exceed 70'),
});

type FormValues = z.infer<typeof formSchema>;

interface PlannerFormProps {
  onSubmit: (data: TripInput) => void;
  isLoading: boolean;
}

export default function PlannerForm({ onSubmit, isLoading }: PlannerFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      current_location: '',
      pickup_location: '',
      dropoff_location: '',
      current_cycle_used: 0,
    },
  });

  return (
    <div className="flex flex-col h-full bg-slate-950/80 backdrop-blur-xl border-r border-white/[0.08] p-6 shadow-2xl z-10 relative overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-xl font-extrabold font-sans tracking-tight mb-1 text-white flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-blue-400" />
          Trip Parameters
        </h2>
        <p className="text-xs text-slate-400">Enter location coordinates and HOS cycle status</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 flex-1 flex flex-col pb-8">
          <div className="space-y-4 flex-1">
            {/* 1. Current Location */}
            <FormField
              control={form.control}
              name="current_location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase tracking-wider text-slate-300">Current Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Chicago, IL" className="bg-slate-900/90 border-slate-800 focus-visible:ring-blue-500 h-11 text-sm rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 2. Pickup Location */}
            <FormField
              control={form.control}
              name="pickup_location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase tracking-wider text-slate-300">Pickup Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Indianapolis, IN" className="bg-slate-900/90 border-slate-800 focus-visible:ring-blue-500 h-11 text-sm rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 3. Dropoff Location */}
            <FormField
              control={form.control}
              name="dropoff_location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase tracking-wider text-slate-300">Dropoff Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Dallas, TX" className="bg-slate-900/90 border-slate-800 focus-visible:ring-blue-500 h-11 text-sm rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 4. Current Cycle Used (Hours) */}
            <FormField
              control={form.control}
              name="current_cycle_used"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase tracking-wider text-slate-300">Current Cycle Used (Hours)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min={0}
                      max={70}
                      step="0.1" 
                      placeholder="Enter current cycle hours (0–70)" 
                      className="bg-slate-900/90 border-slate-800 focus-visible:ring-blue-500 h-11 text-sm rounded-xl" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-slate-400">
                    Enter the driver's current hours used in the 70-hour / 8-day cycle.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Button 
            type="submit" 
            disabled={isLoading} 
            className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold text-base rounded-xl shadow-lg shadow-blue-600/30 transition-all mt-auto"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-5 w-5" />
                Generate Plan
              </>
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
