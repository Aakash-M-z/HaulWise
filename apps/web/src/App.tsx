import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import LandingPage from '@/pages/LandingPage';
import PlannerPage from '@/pages/PlannerPage';
import TripsPage from '@/pages/TripsPage';
import TripDetailPage from '@/pages/TripDetailPage';
import Navbar from '@/components/layout/Navbar';

// Configure TanStack Query with automatic refetching on mount & window focus
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchOnReconnect: true,
      staleTime: 5000,
    },
  },
});

function Router() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-transparent text-foreground">
      <Navbar />
      <main className="flex-1 flex flex-col bg-transparent">
        <Switch>
          <Route path="/" component={LandingPage} />
          <Route path="/planner" component={PlannerPage} />
          <Route path="/trips" component={TripsPage} />
          <Route path="/trips/:id" component={TripDetailPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
