import {
  BarChart3,
  Briefcase,
  HardHat,
  Landmark,
  Scale,
  Settings2,
  ShieldAlert,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import type { Perfil } from '@/lib/ejecucion/catalogo';

/** El ícono de cada perfil emisor, el mismo en el arranque y en el expediente. */
export const ICONO_PERFIL: Record<Perfil, LucideIcon> = {
  area_usuaria: UserRound,
  dec: Settings2,
  asesoria_juridica: Scale,
  aga: BarChart3,
  titular: Landmark,
  supervisor: HardHat,
  defensa: ShieldAlert,
  contratista: Briefcase,
};
