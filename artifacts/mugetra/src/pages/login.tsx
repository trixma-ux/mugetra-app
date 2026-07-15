import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { Shield, User, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const adminSchema = z.object({
  identifiant: z.string().email({ message: "Email invalide" }),
  motDePasse: z.string().min(1, { message: "Mot de passe requis" }),
});
const mutualisteSchema = z.object({
  identifiant: z.string().min(1, { message: "Matricule requis" }),
  motDePasse: z.string().min(1, { message: "Mot de passe requis" }),
});

async function loginCall(identifiant: string, motDePasse: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifiant, motDePasse }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? "Identifiants incorrects"); }
  return res.json();
}

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [tab, setTab] = useState<"admin" | "mutualiste">("admin");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const adminForm = useForm<z.infer<typeof adminSchema>>({ resolver: zodResolver(adminSchema), defaultValues: { identifiant: "", motDePasse: "" } });
  const mutualisteForm = useForm<z.infer<typeof mutualisteSchema>>({ resolver: zodResolver(mutualisteSchema), defaultValues: { identifiant: "", motDePasse: "" } });

  const handleSubmit = async (values: { identifiant: string; motDePasse: string }) => {
    setLoading(true);
    try {
      const data = await loginCall(values.identifiant, values.motDePasse);
      localStorage.setItem("mugetra_token", data.token);
      setAuthTokenGetter(() => data.token);
      toast({ title: "Connexion réussie", description: `Bienvenue, ${data.user.prenom} ${data.user.nom}` });
      const isMutualiste = data.user.role === "mutualiste" || (!["admin","tresorier","sg","affaires_sociales"].includes(data.user.role) && data.user.membreId);
      setLocation(isMutualiste ? "/mutualiste" : "/");
    } catch (err: any) {
      toast({ title: "Erreur de connexion", description: err.message ?? "Vérifiez vos identifiants.", variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #0f3d25 0%, #1a5c3a 55%, #1e6b42 100%)" }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, #c9a227 0%, transparent 50%), radial-gradient(circle at 80% 20%, #fff 0%, transparent 40%)" }} />
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-12">
            <img src="/logo-mugetra.png" alt="MUGETRA" className="h-16 w-16 object-contain drop-shadow-lg" />
            <div>
              <h1 className="text-white font-bold text-xl leading-tight">MUGETRA-NPG.CI</h1>
              <p className="text-green-200 text-xs mt-0.5">Espace de gestion</p>
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <h2 className="text-white text-3xl font-bold leading-tight">Gérez votre mutuelle<br />en toute sérénité</h2>
              <p className="text-green-200 text-sm mt-3 leading-relaxed">Mutuelle Générale des Travailleurs de la<br />Nouvelle Parfumerie Gandour CI</p>
            </div>
            <div className="space-y-3 pt-4">
              {[
                { icon: "💳", text: "Suivi des cotisations en temps réel" },
                { icon: "🏥", text: "Gestion des demandes d'assistance" },
                { icon: "📄", text: "Relevés et documents PDF officiels" },
                { icon: "👤", text: "Portail personnel pour chaque mutualiste" },
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-lg">{f.icon}</span>
                  <span className="text-green-100 text-sm">{f.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="relative z-10">
          <div className="h-px w-full mb-4" style={{ background: "linear-gradient(to right, transparent, rgba(255,255,255,0.3), transparent)" }} />
          <p className="text-green-300 text-xs text-center">© 2025 MUGETRA-NPG.CI — Tous droits réservés</p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-24 bg-background">
        <div className="w-full max-w-md mx-auto">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <img src="/logo-mugetra.png" alt="MUGETRA" className="h-12 object-contain" />
            <div><p className="font-bold text-base">MUGETRA-NPG.CI</p><p className="text-muted-foreground text-xs">Espace de gestion</p></div>
          </div>
          <div className="mb-8">
            <h2 className="text-2xl font-bold">Connexion</h2>
            <p className="text-muted-foreground text-sm mt-1">Accédez à votre espace personnel</p>
          </div>
          <div className="flex gap-1 p-1 rounded-xl mb-7 bg-muted">
            {(["admin", "mutualiste"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {t === "admin" ? <><Shield className="h-4 w-4" /> Administration</> : <><User className="h-4 w-4" /> Mutualiste</>}
              </button>
            ))}
          </div>

          {tab === "admin" && (
            <Form {...adminForm}>
              <form onSubmit={adminForm.handleSubmit(handleSubmit)} className="space-y-5">
                <FormField control={adminForm.control} name="identifiant" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse email</FormLabel>
                    <FormControl><Input placeholder="admin@mugetra.ci" className="h-11 bg-muted/50" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={adminForm.control} name="motDePasse" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type={showPwd ? "text" : "password"} placeholder="••••••••" className="h-11 bg-muted/50 pr-10" {...field} />
                        <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full h-11 font-semibold gap-2" disabled={loading}
                  style={{ background: "linear-gradient(to right, #1a5c3a, #1e6b42)" }}>
                  {loading ? "Connexion..." : <><span>Se connecter</span><ArrowRight className="h-4 w-4" /></>}
                </Button>
              </form>
            </Form>
          )}

          {tab === "mutualiste" && (
            <Form {...mutualisteForm}>
              <form onSubmit={mutualisteForm.handleSubmit(handleSubmit)} className="space-y-5">
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                    Connectez-vous avec votre <strong>numéro de matricule</strong> et le mot de passe transmis par votre administrateur.
                  </p>
                </div>
                <FormField control={mutualisteForm.control} name="identifiant" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numéro de matricule</FormLabel>
                    <FormControl><Input placeholder="MG-0001" className="h-11 bg-muted/50 font-mono uppercase" {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={mutualisteForm.control} name="motDePasse" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type={showPwd ? "text" : "password"} placeholder="••••••••" className="h-11 bg-muted/50 pr-10" {...field} />
                        <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full h-11 font-semibold gap-2" disabled={loading}
                  style={{ background: "linear-gradient(to right, #1a5c3a, #1e6b42)" }}>
                  {loading ? "Connexion..." : <><span>Accéder à mon espace</span><ArrowRight className="h-4 w-4" /></>}
                </Button>
              </form>
            </Form>
          )}
        </div>
      </div>
    </div>
  );
}
