# Abre un PDF con Microsoft Word y lo guarda como .docx.
# Word reconstruye párrafos, tablas y estilos del PDF: sirve para probar
# con documentos que se parecen a los de verdad, con sus runs partidos
# y sus tablas, en vez de con un Word hecho a mano.
param([string]$Pdf, [string]$Docx)

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  $ruta = (Resolve-Path $Pdf).Path
  $salida = [System.IO.Path]::GetFullPath($Docx)
  # ConfirmConversions = $false: sin el diálogo de «Word convertirá el PDF».
  $doc = $word.Documents.Open($ruta, $false, $true)
  # 16 = wdFormatDocumentDefault (.docx)
  $doc.SaveAs2([ref]$salida, [ref]16)
  $paginas = $doc.ComputeStatistics(2)
  $doc.Close([ref]0)
  Write-Output ("{0} -> {1} ({2} paginas)" -f (Split-Path $ruta -Leaf), (Split-Path $salida -Leaf), $paginas)
} finally {
  $word.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
