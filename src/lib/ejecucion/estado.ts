/**
 * La forma del expediente que viaja al navegador. Solo tipos: lo usan
 * el servidor y los componentes.
 */
import type { Actuacion, Perfil } from './catalogo';
import type {
  AnalisisDeActuacion,
  AuditoriaDelDocumento,
  BorradorDeDocumento,
  Contradiccion,
  DocumentoDelExpediente,
  Ficha,
  Respuesta,
} from './tipos';

export interface ActuacionDelExpediente {
  id: string;
  expediente_id: string;
  perfil: Perfil;
  actuacion: Actuacion | null;
  pedido: string;
  estado: 'pendiente' | 'analizando' | 'listo' | 'redactando' | 'error';
  error: string | null;
  analisis: AnalisisDeActuacion | null;
  respuestas: Respuesta[];
  borrador: BorradorDeDocumento | null;
  auditoria: AuditoriaDelDocumento | null;
  continua_de: string | null;
  created_at: string;
  updated_at: string;
}

export type DocumentoParaVer = Omit<DocumentoDelExpediente, 'texto'> & { texto: null; caracteres: number };

export interface EstadoDelExpediente {
  expediente: { id: string; user_id: string; titulo: string; ficha: Ficha; created_at: string; updated_at: string };
  ficha: Ficha;
  contradicciones: Contradiccion[];
  documentos: DocumentoParaVer[];
  actuaciones: ActuacionDelExpediente[];
}
