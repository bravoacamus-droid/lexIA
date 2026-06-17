import { createClient } from '@/lib/supabase/server';
import { SelectionGeneratorForm } from '@/components/app/generator/selection/selection-generator-form';
import { RoleGateBlocked, isRoleAllowed } from '@/components/app/role-gate';
import type { ProfileRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Armado de oferta' };

export default async function ArmadoOfertaPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('profile_role')
    .eq('id', user.id)
    .maybeSingle();
  const userRole = (profile?.profile_role as ProfileRole | null) || null;

  if (!isRoleAllowed(userRole, ['provider', 'consultant'])) {
    return (
      <RoleGateBlocked
        allow={['provider', 'consultant']}
        userRole={userRole}
        moduleName="El generador de Armado de Oferta"
        reason="Esta herramienta es para que el postor arme su oferta completa antes de presentarla. Si tú evalúas como entidad, usa el módulo Evaluador."
      />
    );
  }

  return (
    <SelectionGeneratorForm
      slug="armado_oferta"
      pageTitle="Armado de oferta — Postor"
      pageDescription="Sube las Bases Integradas del procedimiento y proporciona tus datos. LexIA genera todos los formatos y anexos oficiales de la oferta, listos para foliar y presentar al SEACE."
      pageInfoBullets={[
        'Sube las Bases Integradas del SEACE (PDF). LexIA identifica los requisitos de calificación y factores de evaluación aplicables.',
        'Completa los datos de tu empresa, personal clave, experiencia y oferta económica.',
        'LexIA arma: Carta de presentación, Formato 1 (DJ datos del postor), Formato 2 (DJ Art. 51 Ley 32069), Formato 3 (consorcio), Anexos (oferta económica, cumplimiento TDR/EETT, experiencia, personal clave, equipamiento) y un checklist final.',
        'Si detecta huecos en tu oferta (ej. personal sin años suficientes), muestra una ALERTA AL POSTOR al inicio con qué subsanar.',
      ]}
      showPdfUpload
      pdfUploadLabel="Bases Integradas del procedimiento (PDF del SEACE)"
      pdfUploadHint="Procesamos todo el documento para identificar requisitos. El PDF se procesa en memoria y no se guarda."
      showObjectType
      fields={[
        // ─── PROCEDIMIENTO ───
        {
          name: 'procedimiento',
          label: 'Denominación y número del procedimiento',
          placeholder:
            'Ej. Concurso Público Abreviado N° 008-2026-MUNICAYACUCHO-CS-1 — Servicio de premezclado de concreto',
          required: true,
        },
        {
          name: 'entidad',
          label: 'Entidad convocante',
          placeholder: 'Ej. Municipalidad Provincial de Huamanga',
          required: true,
        },
        {
          name: 'cuantia',
          label: 'Cuantía referencial (S/)',
          hint: 'Solo el monto numérico, ej. 365000. Tu oferta no podrá superar el tope que establecen las Bases.',
          placeholder: '365000',
          required: true,
        },

        // ─── POSTOR ───
        {
          name: 'postor_razon_social',
          label: 'Razón social / Nombre del postor',
          placeholder: 'Ej. Constructora del Sur S.A.C.',
          required: true,
        },
        {
          name: 'postor_ruc',
          label: 'RUC del postor',
          placeholder: '20123456789',
          required: true,
        },
        {
          name: 'postor_partida',
          label: 'Partida electrónica del poder del representante',
          placeholder: 'Ej. 11194382 — Oficina Registral de Ayacucho',
        },
        {
          name: 'postor_domicilio',
          label: 'Domicilio legal y procesal',
          placeholder: 'Ej. Av. Mariscal Cáceres 123, Ayacucho — Huamanga — Ayacucho',
          required: true,
        },
        {
          name: 'postor_representante',
          label: 'Representante legal',
          placeholder: 'Nombre completo, cargo y DNI. Ej. Juan Pérez Quispe, Gerente General, DNI 12345678',
          required: true,
        },
        {
          name: 'postor_correo',
          label: 'Correo electrónico para notificaciones',
          placeholder: 'contacto@empresa.com',
          required: true,
        },
        {
          name: 'postor_telefono',
          label: 'Teléfono',
          placeholder: '987654321',
        },
        {
          name: 'postor_rnp',
          label: 'Inscripción en el RNP',
          hint: 'N° de inscripción, categoría y fecha de vigencia.',
          placeholder: 'Ej. RNP 12345 — Ejecutor de Obras, CMC S/ 1,800,000, vigente al 31-12-2027',
        },
        {
          name: 'consorcio',
          label: 'Información de consorcio (si aplica)',
          hint: 'Si participas en consorcio, lista integrantes, RUC y % de participación. Si NO, deja vacío.',
          type: 'textarea',
          rows: 3,
          placeholder:
            'Integrante 1: Constructora ABC S.A.C. — RUC 20111111111 — 60%\nIntegrante 2: Servicios XYZ E.I.R.L. — RUC 20222222222 — 40%',
        },

        // ─── PERSONAL CLAVE ───
        {
          name: 'personal_clave',
          label: 'Personal clave propuesto',
          hint: 'Por cada posición exigida en las Bases: nombre, profesión, CIP/CAP, años de experiencia, formación.',
          type: 'textarea',
          rows: 6,
          placeholder:
            'Residente de Obra: Ing. Civil Carlos López Quispe, DNI 12345678, CIP 56789 vigente al 31-12-2026, 12 años de experiencia en obras viales, egresado de la UNI 2010.\nEspecialista en Suelos: Ing. Civil María Ramos Cruz, DNI 87654321, CIP 11223, 8 años de experiencia, egresada de la PUCP 2015.',
          required: true,
        },

        // ─── EQUIPAMIENTO ───
        {
          name: 'equipamiento',
          label: 'Equipamiento estratégico (si las Bases lo exigen)',
          hint: 'Descripción, cantidad, antigüedad y mecanismo (propio/alquiler/compromiso).',
          type: 'textarea',
          rows: 4,
          placeholder:
            'Camión volquete 15 m³ x 2 unidades, 3 años de antigüedad, propios.\nRodillo vibratorio Caterpillar CS54B x 1 unidad, 2 años, alquiler con compromiso notarial.\nEstación total Topcon ES-105 x 1, propia con certificado de calibración 2026.',
        },

        // ─── EXPERIENCIA ───
        {
          name: 'experiencia_postor',
          label: 'Experiencia del postor en la especialidad',
          hint: 'Lista contratos similares ejecutados (10 últimos años) con entidad, objeto, fecha de conformidad, monto S/.',
          type: 'textarea',
          rows: 6,
          placeholder:
            '1. Gob. Reg. Junín — "Mantenimiento Vial MO-549" — Conformidad 15/06/2025 — S/ 380,000\n2. Mun. Prov. Andahuaylas — "Servicio premezclado concreto" — Conformidad 12/11/2024 — S/ 295,000\n3. ZR XIV-SUNARP — "Servicio de obras de electricidad" — Conformidad 20/03/2024 — S/ 145,000',
          required: true,
        },

        // ─── OFERTA ECONÓMICA ───
        {
          name: 'oferta_monto',
          label: 'Monto de la oferta (S/, incluyendo IGV)',
          placeholder: '349500',
          required: true,
        },
        {
          name: 'oferta_plazo',
          label: 'Plazo de ejecución ofertado (días calendario)',
          placeholder: '60',
          required: true,
        },
        {
          name: 'oferta_observaciones',
          label: 'Observaciones de la oferta (opcional)',
          hint: 'Por ejemplo: garantía comercial extendida, mejoras técnicas, tiempo de entrega reducido. LexIA las usará como factores diferenciadores.',
          type: 'textarea',
          rows: 3,
          placeholder:
            'Garantía comercial extendida de 24 meses (Bases exigen 12). Disponibilidad de stock para entrega en 5 días calendario.',
        },
      ]}
    />
  );
}
