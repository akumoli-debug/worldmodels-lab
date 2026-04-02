import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Environments from "@/pages/environments";
import EnvironmentDetail from "@/pages/environment-detail";
import Models from "@/pages/models";
import ModelDetail from "@/pages/model-detail";
import Compare from "@/pages/compare";
import AppLayout from "@/components/app-layout";

function AppRouter() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/environments" component={Environments} />
        <Route path="/environments/:slug" component={EnvironmentDetail} />
        <Route path="/models" component={Models} />
        <Route path="/models/:slug" component={ModelDetail} />
        <Route path="/compare" component={Compare} />
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
