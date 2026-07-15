import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { setAuthTokenGetter, useGetCurrentUser } from "@workspace/api-client-react";
import { useEffect } from "react";
import { Layout } from "@/components/layout";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import MembresList from "@/pages/membres/index";
import NouveauMembre from "@/pages/membres/nouveau";
import ImportMembres from "@/pages/membres/import";
import MembreDetail from "@/pages/membres/[id]";
import CotisationsList from "@/pages/cotisations/index";
import ImportCotisations from "@/pages/cotisations/import";
import AssistancesList from "@/pages/assistances/index";
import AssistanceDetail from "@/pages/assistances/[id]";
import NouvelleAssistance from "@/pages/assistances/nouvelle";
import MutualistePortal from "@/pages/mutualiste/index";
import MutualisteNouvelleDemande from "@/pages/mutualiste/nouvelle-demande";
import AnnoncesList from "@/pages/annonces/index";
import Parametres from "@/pages/parametres/index";
import PretsPage from "@/pages/prets/index";
import DepartsPage from "@/pages/departs/index";
import ProjetsPage from "@/pages/projets/index";
import AssembleesPage from "@/pages/assemblees/index";
import ElectionsPage from "@/pages/elections/index";
import BureauPage from "@/pages/bureau/index";
import CommissariatPage from "@/pages/commissariat/index";
import ComptabilitePage from "@/pages/comptabilite/index";
import SportsPage from "@/pages/sports/index";
import DocumentsPage from "@/pages/documents/index";
import CommunicationsPage from "@/pages/communications/index";
import RetraiteComplementairePage from "@/pages/retraite-complementaire/index";
import EffectifsPage from "@/pages/effectifs/index";
import { getGetCurrentUserQueryKey } from "@workspace/api-client-react";

setAuthTokenGetter(() => localStorage.getItem("mugetra_token"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component, ...rest }: any) {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading, isError } = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey() }});

  useEffect(() => {
    if (!isLoading && isError) {
      setLocation("/login");
    }
  }, [isLoading, isError, setLocation]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-muted/40">Chargement...</div>;
  }

  if (isError || !user) {
    return null;
  }

  return (
    <Layout>
      <Component {...rest} />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/membres" component={() => <ProtectedRoute component={MembresList} />} />
      <Route path="/membres/nouveau" component={() => <ProtectedRoute component={NouveauMembre} />} />
      <Route path="/membres/import" component={() => <ProtectedRoute component={ImportMembres} />} />
      <Route path="/membres/:id" component={() => <ProtectedRoute component={MembreDetail} />} />
      <Route path="/cotisations" component={() => <ProtectedRoute component={CotisationsList} />} />
      <Route path="/cotisations/import" component={() => <ProtectedRoute component={ImportCotisations} />} />
      <Route path="/assistances" component={() => <ProtectedRoute component={AssistancesList} />} />
      <Route path="/assistances/nouvelle" component={() => <ProtectedRoute component={NouvelleAssistance} />} />
      <Route path="/assistances/:id" component={() => <ProtectedRoute component={AssistanceDetail} />} />
      <Route path="/annonces" component={() => <ProtectedRoute component={AnnoncesList} />} />
      <Route path="/parametres" component={() => <ProtectedRoute component={Parametres} />} />
      <Route path="/prets" component={() => <ProtectedRoute component={PretsPage} />} />
      <Route path="/departs" component={() => <ProtectedRoute component={DepartsPage} />} />
      <Route path="/projets" component={() => <ProtectedRoute component={ProjetsPage} />} />
      <Route path="/assemblees" component={() => <ProtectedRoute component={AssembleesPage} />} />
      <Route path="/elections" component={() => <ProtectedRoute component={ElectionsPage} />} />
      <Route path="/bureau" component={() => <ProtectedRoute component={BureauPage} />} />
      <Route path="/commissariat" component={() => <ProtectedRoute component={CommissariatPage} />} />
      <Route path="/comptabilite" component={() => <ProtectedRoute component={ComptabilitePage} />} />
      <Route path="/sports" component={() => <ProtectedRoute component={SportsPage} />} />
      <Route path="/documents" component={() => <ProtectedRoute component={DocumentsPage} />} />
      <Route path="/communications" component={() => <ProtectedRoute component={CommunicationsPage} />} />
      <Route path="/retraite-complementaire" component={() => <ProtectedRoute component={RetraiteComplementairePage} />} />
      <Route path="/effectifs" component={() => <ProtectedRoute component={EffectifsPage} />} />
      <Route path="/mutualiste" component={MutualistePortal} />
      <Route path="/mutualiste/nouvelle-demande" component={MutualisteNouvelleDemande} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
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
