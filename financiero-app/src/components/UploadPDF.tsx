import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface UploadPDFProps {
  tienePdfExistente: boolean
  onFileChange: (file: File | null) => void
}

// Reutilizado por FormularioOC y FormularioFactura — el PDF es opcional
// (checkbox "sin PDF"), la subida real la hace el formulario padre una vez
// que conoce el id del registro (ver src/services/pdfStorage.ts).
export default function UploadPDF({ tienePdfExistente, onFileChange }: UploadPDFProps) {
  const [sinPdf, setSinPdf] = useState(false)

  return (
    <div className="flex flex-col gap-1.5">
      <Label>PDF</Label>
      <div className="flex items-center gap-2">
        <Checkbox
          id="sin_pdf"
          checked={sinPdf}
          onCheckedChange={(checked) => {
            const value = checked === true
            setSinPdf(value)
            if (value) onFileChange(null)
          }}
        />
        <Label htmlFor="sin_pdf" className="font-normal text-muted-foreground">
          Sin PDF por ahora
        </Label>
      </div>
      {!sinPdf && (
        <Input
          type="file"
          accept="application/pdf"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
        />
      )}
      {tienePdfExistente && !sinPdf && (
        <p className="text-xs text-muted-foreground">
          Si no elegís un archivo nuevo, se conserva el PDF ya cargado.
        </p>
      )}
    </div>
  )
}
