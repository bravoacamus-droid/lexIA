/**
 * Registro de plantillas de requerimiento.
 *
 * César entregó 18 plantillas en dos familias: 3 para contrataciones
 * menores a 8 UIT y 15 para procedimientos de selección (de las cuales
 * llegaron 12; faltan tres de consultoría de obras). Aquí se van
 * incorporando conforme se codifican.
 *
 * El resto de la aplicación no debe importar las plantillas una por una:
 * pide por id o lista lo disponible, para que sumar una plantilla nueva
 * no obligue a tocar la interfaz ni las rutas.
 */
import type { PlantillaRequerimiento } from '../plantilla-tipos';
import { PLANTILLA_BIENES_GENERAL } from './bienes-general';
import { PLANTILLA_BIENES_ESTANDARIZADOS } from './bienes-estandarizados';
import { PLANTILLA_BIENES_COMPARACION_PRECIOS } from './bienes-comparacion-precios';

const REGISTRO: PlantillaRequerimiento[] = [
  PLANTILLA_BIENES_GENERAL,
  PLANTILLA_BIENES_ESTANDARIZADOS,
  PLANTILLA_BIENES_COMPARACION_PRECIOS,
];

/** Todas las plantillas disponibles hoy. */
export function listarPlantillas(): PlantillaRequerimiento[] {
  return REGISTRO;
}

export function obtenerPlantilla(id: string): PlantillaRequerimiento | null {
  return REGISTRO.find((p) => p.id === id) ?? null;
}

/** Etiquetas para la interfaz, sin cargar la plantilla entera. */
export function catalogoPlantillas(): Array<{
  id: string;
  familia: PlantillaRequerimiento['familia'];
  objeto: PlantillaRequerimiento['objeto'];
  titulo: string;
}> {
  return REGISTRO.map((p) => ({
    id: p.id,
    familia: p.familia,
    objeto: p.objeto,
    titulo: p.subtitulo,
  }));
}

export {
  PLANTILLA_BIENES_GENERAL,
  PLANTILLA_BIENES_ESTANDARIZADOS,
  PLANTILLA_BIENES_COMPARACION_PRECIOS,
};
