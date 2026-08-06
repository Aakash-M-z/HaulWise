import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Home } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex-1 w-full flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-destructive/10 rounded-full blur-[100px] pointer-events-none" />
      
      <Card className="w-full max-w-md mx-4 bg-card/50 backdrop-blur border-white/10 shadow-2xl relative z-10">
        <CardContent className="pt-8 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mb-6">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          
          <h1 className="text-3xl font-bold font-sans tracking-tight mb-2">
            404 Not Found
          </h1>
          
          <p className="mb-8 text-sm text-muted-foreground font-mono">
            The route you are looking for has been detoured.
          </p>
          
          <Link href="/">
            <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
              <Home className="w-4 h-4 mr-2" /> Return to Base
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
