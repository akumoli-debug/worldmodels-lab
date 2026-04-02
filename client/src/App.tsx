import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Creator from "@/pages/creator";
import RolloutViewer from "@/pages/rollout-viewer";
import ArchPicker from "@/pages/arch-picker";
import Resources from "@/pages/resources";
import AppLayout from "@/components/app-layout";

function AppRouter() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Creator} />
        <Route path="/rollouts" component={RolloutViewer} />
        <Route path="/picker" component={ArchPicker} />
        <Route path="/resources" component={Resources} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router hook={useHashLocation}>
          <AppRouter />
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
