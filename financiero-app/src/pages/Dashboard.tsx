import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import TablaPresupuestoResumen from '@/components/TablaPresupuestoResumen'
import TablaForecastMensual from '@/components/TablaForecastMensual'
import KpiCardsResumen from '@/components/KpiCardsResumen'
import { useSeguimiento } from '@/hooks/useSeguimiento'

export default function Dashboard() {
  const { seguimiento, loading, error } = useSeguimiento()

  return (
    <div className="space-y-4">
      <KpiCardsResumen seguimiento={seguimiento} loading={loading} />
      <Tabs defaultValue="total">
        <TabsList>
          <TabsTrigger value="total">Total</TabsTrigger>
          <TabsTrigger value="por-mes">Por Mes</TabsTrigger>
        </TabsList>
        <TabsContent value="total" className="mt-4">
          <TablaPresupuestoResumen seguimiento={seguimiento} loading={loading} error={error} />
        </TabsContent>
        <TabsContent value="por-mes" className="mt-4">
          <TablaForecastMensual />
        </TabsContent>
      </Tabs>
    </div>
  )
}
