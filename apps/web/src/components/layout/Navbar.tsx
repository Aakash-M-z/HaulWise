import { Link, useLocation } from 'wouter';
import { Truck, History, Map, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function Navbar() {
  const [location] = useLocation();

  const links = [
    { href: '/planner', label: 'Trip Planner', icon: Map },
    { href: '/trips', label: 'History', icon: History },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-sky-950/50 bg-[#080b10]/90 backdrop-blur-xl transition-all">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        
        {/* Logo with Square Box & Truck Icon */}
        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-sky-950/60 border border-sky-400/40 text-sky-300 shadow-md shadow-sky-500/10">
            <Truck className="h-5 w-5 text-sky-300" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold tracking-wider text-white font-sans uppercase">
              Haul<span className="text-sky-300">Wise</span>
            </span>
          </div>
        </Link>

        {/* Square Navigation Links */}
        <nav className="hidden md:flex items-center gap-2">
          {links.map((link) => {
            const isActive = location.startsWith(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-md border transition-all duration-200',
                  isActive
                    ? 'bg-sky-950/80 border-sky-400/40 text-sky-200 shadow-sm shadow-sky-500/10'
                    : 'bg-black/40 border-white/[0.06] text-slate-400 hover:text-sky-300 hover:border-sky-500/20'
                )}
              >
                <Icon className="h-4 w-4 text-sky-400" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Square CTA Button */}
        <div className="flex items-center gap-3">
          <Link href="/planner">
            <Button size="sm" className="hidden sm:flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold border border-sky-300/40 rounded-md px-4 py-2 shadow-md shadow-sky-500/20 transition-all hover:scale-[1.02]">
              <Zap className="h-4 w-4 fill-slate-950" />
              <span>Plan New Trip</span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
