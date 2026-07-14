import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import TablaPresupuestoResumen from '@/components/TablaPresupuestoResumen'
import TablaForecastMensual from '@/components/TablaForecastMensual'
import KpiCardsResumen from '@/components/KpiCardsResumen'
import GraficoPresupuestoPorPartida from '@/components/GraficoPresupuestoPorPartida'
import GraficoComposicionGlobal from '@/components/GraficoComposicionGlobal'
import GraficoFacturadoPorMes from '@/components/GraficoFacturadoPorMes'
import EstadoResultadoMensualView from '@/components/EstadoResultadoMensual'
import { useSeguimiento } from '@/hooks/useSeguimiento'
import { useEstadoResultado } from '@/hooks/useEstadoResultado'

export default function Dashboard() {
  const { seguimiento, loading, error } = useSeguimiento()
  const { estadoResultado, loading: loadingResultado, error: errorResultado } = useEstadoResultado()

  return (
    <div className="space-y-4">
      <p className="text-[.7rem] font-semibold tracking-wide text-muted-foreground uppercase">Indicadores</p>
      <KpiCardsResumen seguimiento={seguimiento} loading={loading} />
      <Tabs defaultValue="total">
        <TabsList variant="line" className="border-b">
          <TabsTrigger value="total">Total</TabsTrigger>
          <TabsTrigger value="por-mes">Por Mes</TabsTrigger>
          <TabsTrigger value="graficos">Gráficos</TabsTrigger>
        </TabsList>
        <TabsContent value="total" className="mt-4">
          <TablaPresupuestoResumen seguimiento={seguimiento} loading={loading} error={error} />
        </TabsContent>
        <TabsContent value="por-mes" className="mt-4">
          <TablaForecastMensual />
        </TabsContent>
        <TabsContent value="graficos" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-[.75rem] font-semibold tracking-wide text-muted-foreground uppercase">
                  Presupuesto vs. OC vs. Facturado por partida
                </CardTitle>
              </CardHeader>
              <CardContent>
                <GraficoPresupuestoPorPartida seguimiento={seguimiento} loading={loading} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-[.75rem] font-semibold tracking-wide text-muted-foreground uppercase">
                  Avance global
                </CardTitle>
              </CardHeader>
              <CardContent>
                <GraficoComposicionGlobal seguimiento={seguimiento} loading={loading} />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-[.75rem] font-semibold tracking-wide text-muted-foreground uppercase">
                Facturado por mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GraficoFacturadoPorMes />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="space-y-3">
        <p className="text-[.7rem] font-semibold tracking-wide text-muted-foreground uppercase">
          Estado de Resultado Mensual
        </p>
        <EstadoResultadoMensualView estadoResultado={estadoResultado} loading={loadingResultado} error={errorResultado} />
      </div>
    </div>
  )
}
