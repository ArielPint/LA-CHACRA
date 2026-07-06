import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import TablaPresupuestoResumen from '@/components/TablaPresupuestoResumen'
import TablaForecastMensual from '@/components/TablaForecastMensual'

export default function Dashboard() {
  return (
    <Tabs defaultValue="total">
      <TabsList>
        <TabsTrigger value="total">Total</TabsTrigger>
        <TabsTrigger value="por-mes">Por Mes</TabsTrigger>
      </TabsList>
      <TabsContent value="total" className="mt-4">
        <TablaPresupuestoResumen />
      </TabsContent>
      <TabsContent value="por-mes" className="mt-4">
        <TablaForecastMensual />
      </TabsContent>
    </Tabs>
  )
}
