# Abre cada .docx con Microsoft Word y lo guarda en PDF.
# Es la forma más fiel de ver el documento: el mismo programa que usa César.
param([string[]]$Archivos)

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  foreach ($a in $Archivos) {
    $ruta = (Resolve-Path $a).Path
    $pdf = [System.IO.Path]::ChangeExtension($ruta, '.pdf')
    $doc = $word.Documents.Open($ruta, $false, $true)
    # 17 = wdFormatPDF
    $doc.SaveAs([ref]$pdf, [ref]17)
    $paginas = $doc.ComputeStatistics(2)
    $doc.Close([ref]0)
    Write-Output ("{0} -> {1} paginas" -f (Split-Path $ruta -Leaf), $paginas)
  }
} finally {
  $word.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
