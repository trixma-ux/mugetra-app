import { Link, useLocation } from "wouter";
import { useLogout, useGetCurrentUser } from "@workspace/api-client-react";
import { 
  LayoutDashboard, 
  Users, 
  Wallet, 
  HeartHandshake, 
  Bell, 
  Settings, 
  LogOut,
  Menu,
  HandCoins,
  UserMinus,
  Building2,
  Gavel,
  Vote,
  Briefcase,
  ShieldCheck,
  Calculator,
  Trophy,
  FolderOpen,
  MessageSquare,
  PiggyBank,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

const navSections: { title: string; items: { href: string; label: string; icon: any }[] }[] = [
  {
    title: "",
    items: [
      { href: "/", label: "Tableau de bord", icon: LayoutDashboard },
      { href: "/membres", label: "Membres", icon: Users },
      { href: "/effectifs", label: "Effectifs", icon: UsersRound },
    ],
  },
  {
    title: "Cotisations & assistance",
    items: [
      { href: "/cotisations", label: "Cotisations", icon: Wallet },
      { href: "/assistances", label: "Assistances", icon: HeartHandshake },
      { href: "/prets", label: "Prêts", icon: HandCoins },
      { href: "/retraite-complementaire", label: "Retraite complémentaire", icon: PiggyBank },
      { href: "/departs", label: "Départs", icon: UserMinus },
      { href: "/projets", label: "Projets", icon: Building2 },
    ],
  },
  {
    title: "Gouvernance",
    items: [
      { href: "/assemblees", label: "Assemblées Générales", icon: Gavel },
      { href: "/elections", label: "Élections", icon: Vote },
      { href: "/bureau", label: "Bureau Exécutif", icon: Briefcase },
      { href: "/commissariat", label: "Commissariat aux comptes", icon: ShieldCheck },
      { href: "/comptabilite", label: "Comptabilité", icon: Calculator },
    ],
  },
  {
    title: "Vie de la mutuelle",
    items: [
      { href: "/sports", label: "Sports et Loisirs", icon: Trophy },
      { href: "/documents", label: "Documents", icon: FolderOpen },
      { href: "/communications", label: "Communication", icon: MessageSquare },
      { href: "/annonces", label: "Annonces", icon: Bell },
    ],
  },
  {
    title: "",
    items: [
      { href: "/parametres", label: "Paramètres", icon: Settings },
    ],
  },
];
const navItems = navSections.flatMap((s) => s.items);

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: user } = useGetCurrentUser();
  const logout = useLogout();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        localStorage.removeItem("mugetra_token");
        window.location.href = "/login";
      }
    });
  };

  const NavLinks = () => (
    <>
      <div className="flex items-center justify-center px-4 py-5">
        <img src="/logo-mugetra.png" alt="MUGETRA" className="h-10 object-contain" style={{ filter: "brightness(0) invert(1)" }} />
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navSections.map((section, si) => (
          <div key={si} className={si > 0 ? "pt-3" : ""}>
            {section.title && (
              <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                {section.title}
              </div>
            )}
            {section.items.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <div className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer text-sm ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium" : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}>
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-4 px-3">
          <div className="h-8 w-8 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold">
            {user?.prenom?.[0]}{user?.nom?.[0]}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white truncate max-w-[140px]">{user?.prenom} {user?.nom}</span>
            <span className="text-xs text-sidebar-foreground/60 capitalize">{user?.role?.replace("_", " ")}</span>
          </div>
        </div>
        <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Déconnexion
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-muted/40">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-border">
        <NavLinks />
      </aside>

      {/* Mobile Header & Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between p-4 bg-sidebar text-sidebar-foreground">
          <div className="flex items-center gap-2">
            <img src="/logo-mugetra.png" alt="MUGETRA" className="h-7 object-contain" style={{ filter: "brightness(0) invert(1)" }} />
          </div>
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-sidebar border-sidebar-border">
              <div className="flex flex-col h-full">
                <NavLinks />
              </div>
            </SheetContent>
          </Sheet>
        </header>
        
        <main className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
