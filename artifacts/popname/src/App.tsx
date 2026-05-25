import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import { useEffect } from "react";

// Pages
import { Home } from "@/pages/home";
import { NameDetail } from "@/pages/name-detail";
import { Explore } from "@/pages/explore";
import { Trends } from "@/pages/trends";
import { Claim } from "@/pages/claim";
import { SearchResults } from "@/pages/search";
import { Growth } from "@/pages/growth";
import { Countries } from "@/pages/countries";
import { Forge } from "@/pages/forge";

const queryClient = new QueryClient();

function ThemeSetup() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);
  return null;
}

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  return null;
}

function Router() {
  return (
    <Layout>
      <ScrollToTop />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/name/:name" component={NameDetail} />
        <Route path="/index" component={Explore} />
        <Route path="/trends" component={Trends} />
        <Route path="/claim" component={Claim} />
        <Route path="/search" component={SearchResults} />
        <Route path="/growth" component={Growth} />
        <Route path="/countries" component={Countries} />
        <Route path="/forge" component={Forge} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeSetup />
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
