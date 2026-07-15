import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/services/supabaseClient'
import type { Proveedor } from '@/types/financiero'

export function useProveedores() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('financiero_proveedores').select('*').order('nombre')
    setProveedores(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  const crearProveedor = useCallback(
    async (rut: string, nombre: string) => {
      const { data, error } = await supabase
        .from('financiero_proveedores')
        .upsert({ rut, nombre }, { onConflict: 'rut' })
        .select()
        .single()
      if (error) throw new Error(error.message)
      await refetch()
      return data as Proveedor
    },
    [refetch],
  )

  return { proveedores, loading, refetch, crearProveedor }
}
