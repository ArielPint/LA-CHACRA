import { useMemo } from 'react'
import { Wallet, Receipt, TrendingUp, AlertTriangle } from 'lucide-react'
import type { SeguimientoPresupuesto } from '@/types/financiero'
import { formatCLP, formatPct } from '@/utils/formatters'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface KpiCardsResumenProps {
  seguimiento: SeguimientoPresupuesto[]
  loading: boolean
}

interface Kpi {
  label: string
  value: string
  icon: typeof Wallet
  tone?: 'destructive' | 'amber'
}

export default function KpiCardsResumen({ seguimiento, loading }: KpiCardsResumenProps) {
  const kpis = useMemo<Kpi[]>(() => {
    const totalPresupuesto = seguimiento.reduce((acc, r) => acc + r.presupuesto_original, 0)
    const totalFacturado = seguimiento.reduce((acc, r) => acc + r.facturado, 0)
    const pctGlobal = totalPresupuesto > 0 ? totalFacturado / totalPresupuesto : 0
    const sobrepasados = seguimiento.filter((r) => r.pct_avance >= 1).length

    return [
      { label: 'Presupuesto Total', value: formatCLP(totalPresupuesto), icon: Wallet },
      { label: 'Total Facturado', value: formatCLP(totalFacturado), icon: Receipt },
      { label: '% Avance Global', value: formatPct(pctGlobal), icon: TrendingUp, tone: pctGlobal >= 1 ? 'destructive' : pctGlobal >= 0.7 ? 'amber' : undefined },
      { label: 'Partidas Sobrepasadas', value: String(sobrepasados), icon: AlertTriangle, tone: sobrepasados > 0 ? 'destructive' : undefined },
    ]
  }, [seguimiento])

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <kpi.icon className="size-4" />
            <span className="text-xs font-medium">{kpi.label}</span>
          </div>
          {loading ? (
            <Skeleton className="mt-2 h-7 w-24" />
          ) : (
            <p
              className={cn(
                'mt-1 text-2xl font-semibold tabular-nums',
                kpi.tone === 'destructive' && 'text-destructive',
                kpi.tone === 'amber' && 'text-amber-600',
              )}
            >
              {kpi.value}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
