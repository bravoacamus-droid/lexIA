-- ════════════════════════════════════════════════════════
-- Sube el file_size_limit de los buckets de 25 MB → 100 MB.
-- Motivo: ofertas SEACE reales pueden incluir anexos extensos
-- (cartas fianza, pólizas, hojas de vida con copias DNI,
-- contratos previos escaneados) y 25 MB es insuficiente.
-- ════════════════════════════════════════════════════════
update storage.buckets
   set file_size_limit = 104857600  -- 100 MB
 where id in ('uploads', 'normativa');
