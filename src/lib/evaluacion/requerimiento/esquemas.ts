/**
 * Validación (zod) de lo que manda la pantalla de observaciones del
 * requerimiento. Las formas son las del contrato (`observaciones.ts`).
 */
import { z } from 'zod';

const texto = (max: number) => z.string().max(max);

export const UbicacionZ = z.object({
  pagina: texto(120),
  capitulo: texto(200),
  numeral: texto(120),
  literal: texto(120),
});

export const SolicitudZ = z.enum(['modificar', 'suprimir', 'ampliar', 'precisar', 'incorporar']);
export const SeveridadZ = z.enum(['critico', 'alto', 'medio', 'bajo']);

export const CamposZ = z.object({
  titulo: z.string().trim().min(3).max(200),
  severidad: SeveridadZ,
  categoria: texto(60).default('otro'),
  ubicacion_detalle: UbicacionZ,
  extracto_literal: texto(4000),
  descripcion: z.string().trim().min(10).max(4000),
  solicitud: SolicitudZ,
  recomendacion: z.string().trim().min(5).max(4000),
  marco_normativo: texto(1000).optional(),
});

export const CamposParcialesZ = CamposZ.partial();

const FuenteZ = z.object({
  tipo: texto(40),
  numero: texto(300),
  documentId: z.string().uuid(),
  criterio: texto(600),
});

export const ContrasteZ = z.object({
  veredicto: z.enum(['compatible', 'compatible_con_condiciones', 'incompatible', 'evidencia_insuficiente']),
  explicacion: texto(2000),
  fuentes: z.array(FuenteZ).max(12),
  propuesta: z.object({
    titulo: texto(200),
    descripcion: texto(4000),
    recomendacion: texto(4000),
    solicitud: SolicitudZ,
  }),
  en: texto(40),
});

export const CaratulaZ = z.object({
  entidad: texto(200).optional(),
  dirigidoA: texto(200).optional(),
  elaboradoPor: texto(200).optional(),
  referencia: texto(200).optional(),
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
