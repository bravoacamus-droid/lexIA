# Abre un .docx con Microsoft Word, cuenta sus revisiones (control de
# cambios) y comentarios, y lo exporta a PDF CON las marcas visibles.
# Si Word abre el archivo y cuenta lo que se le puso, el XML es válido.
param([string]$Archivo)

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  $ruta = (Resolve-Path $Archivo).Path
  $pdf = [System.IO.Path]::ChangeExtension($ruta, '.pdf')
  $doc = $word.Documents.Open($ruta, $false, $true)
  $revisiones = $doc.Revisions.Count
  $comentarios = $doc.Comments.Count
  $detalle = @()
  foreach ($r in $doc.Revisions) {
    # 1 = inserción, 2 = borrado
    $tipo = if ($r.Type -eq 1) { '+' } elseif ($r.Type -eq 2) { '-' } else { '?' + $r.Type }
    $detalle += ('{0}[{1}]' -f $tipo, $r.Range.Text)
  }
  # 17 = PDF · 7 = wdExportDocumentWithMarkup
  $doc.ExportAsFixedFormat($pdf, 17, $false, 0, 0, 1, 1, 7)
  $doc.Close([ref]0)
  Write-Output ("revisiones: {0} · comentarios: {1}" -f $revisiones, $comentarios)
  Write-Output ($detalle -join ' ')
} finally {
  $word.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
