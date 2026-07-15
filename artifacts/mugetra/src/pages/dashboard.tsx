import { useGetDashboardStats, useGetCotisationsMensuelles, useGetTresorerieResume, useGetActiviteRecente } from "@workspace/api-client-react";
import { getGetDashboardStatsQueryKey, getGetCotisationsMensuellesQueryKey, getGetTresorerieResumeQueryKey, getGetActiviteRecenteQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserMinus, UserCheck, Activity, Wallet, TrendingUp, AlertCircle, Calendar } from "lucide-react";
import { formatFCFA, formatDateTime } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

function StatCard({ title, value, icon: Icon, description, isLoading }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats({ query: { queryKey: getGetDashboardStatsQueryKey() } });
  const { data: cotisationsChart, isLoading: chartLoading } = useGetCotisationsMensuelles({ query: { queryKey: getGetCotisationsMensuellesQueryKey() } });
  const { data: tresorerie, isLoading: tresoLoading } = useGetTresorerieResume({ query: { queryKey: getGetTresorerieResumeQueryKey() } });
  const { data: activite, isLoading: actLoading } = useGetActiviteRecente({ query: { queryKey: getGetActiviteRecenteQueryKey() } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground">Vue d'ensemble de la mutuelle.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Membres"
          value={stats?.totalMembres || 0}
          icon={Users}
          isLoading={statsLoading}
          description={`${stats?.membresActifs || 0} actifs`}
        />
        <StatCard
          title="Cotisations du mois"
          value={formatFCFA(stats?.cotisationsDuMois)}
          icon={Wallet}
          isLoading={statsLoading}
          description={`${stats?.tauxRecouvrement || 0}% de recouvrement`}
        />
        <StatCard
          title="Membres Défaillants"
          value={stats?.membresDefaillants || 0}
          icon={UserMinus}
          isLoading={statsLoading}
        />
        <StatCard
          title="Assistances en attente"
          value={stats?.assistancesEnAttente || 0}
          icon={AlertCircle}
          isLoading={statsLoading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Évolution des cotisations</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {chartLoading ? (
              <Skeleton className="w-full h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cotisationsChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} tickFormatter={(val) => `${val / 1000}k`} />
                  <Tooltip formatter={(value: number) => [formatFCFA(value), "Montant"]} cursor={{fill: 'var(--color-muted)'}} />
                  <Bar dataKey="montant" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Trésorerie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {tresoLoading ? (
              <div className="space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
            ) : (
              <>
                <div className="flex justify-between items-center p-4 border rounded-lg bg-primary/5">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Solde Actuel</p>
                    <p className="text-3xl font-bold text-primary">{formatFCFA(tresorerie?.solde)}</p>
                  </div>
                  <Wallet className="h-8 w-8 text-primary/40" />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b pb-3">
                    <span className="text-muted-foreground">Total Cotisations</span>
                    <span className="font-semibold text-green-600">+{formatFCFA(tresorerie?.totalCotisations)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-3">
                    <span className="text-muted-foreground">Total Assistances</span>
                    <span className="font-semibold text-destructive">-{formatFCFA(tresorerie?.totalAssistancesPayees)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <span className="text-xs text-muted-foreground">En Caisse</span>
                      <p className="font-medium">{formatFCFA(tresorerie?.caisse)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">En Banque</span>
                      <p className="font-medium">{formatFCFA(tresorerie?.banque)}</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activité Récente</CardTitle>
        </CardHeader>
        <CardContent>
          {actLoading ? (
            <div className="space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
          ) : !activite?.length ? (
             <div className="text-center py-8 text-muted-foreground">Aucune activité récente</div>
          ) : (
            <div className="space-y-4">
              {activite.map((act: any) => (
                <div key={act.id} className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0">
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{act.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{act.utilisateur}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDateTime(act.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
