import Link from 'next/link';

export const metadata = {
  title: 'Política de Privacidad — Llamadas con el Abogado Virtual',
};

export default function PrivacidadVozPage() {
  return (
    <article>
      <h1>Política de Privacidad — Llamadas con el Abogado Virtual</h1>
      <p className="text-sm text-muted-foreground">
        Documento complementario a la{' '}
        <Link href="/legal/privacidad" className="underline">
          Política de Privacidad general
        </Link>
        . Última actualización: 26 de junio de 2026 · Versión v1-2026-06-26
      </p>

      <h2>1. Qué es esta funcionalidad</h2>
      <p>
        Llamadas con el Abogado Virtual es una funcionalidad de LexIA
        Contrataciones que permite al usuario sostener una conversación de voz
        en tiempo real con una inteligencia artificial especializada en
        contratación pública peruana bajo la Ley N° 32069. Esta conversación
        NO sustituye la asesoría legal de un abogado colegiado.
      </p>

      <h2>2. Marco normativo aplicable</h2>
      <p>
        El tratamiento de tu voz y tu transcripción se realiza conforme a la
        Ley N° 29733, Ley de Protección de Datos Personales del Perú, su
        Reglamento aprobado por DS N° 003-2013-JUS y sus modificatorias del
        Reglamento 2024 (consentimiento demostrable).
      </p>

      <h2>3. Consentimiento expreso obligatorio</h2>
      <p>
        Antes de tu primera llamada se te muestra una pantalla con cuatro
        casillas obligatorias que debes aceptar para usar la funcionalidad.
        Las cuatro casillas, en su versión vigente, declaran:
      </p>
      <ol>
        <li>
          <strong>Acepto que esta es una conversación con inteligencia
          artificial, no con un abogado licenciado.</strong> La información
          es orientativa y no constituye asesoría legal profesional.
        </li>
        <li>
          <strong>Acepto que la llamada sea grabada y la transcripción
          almacenada en mi cuenta</strong> para que pueda consultarla después.
          Puedo eliminar mis grabaciones en cualquier momento.
        </li>
        <li>
          <strong>Entiendo que mis datos se procesan en servidores de
          Google Cloud</strong> (Estados Unidos / Brasil) bajo los términos
          de privacidad de LexIA y Google.
        </li>
        <li>
          <strong>Acepto no compartir información confidencial de terceros</strong>,
          datos personales sensibles ni secretos profesionales en esta llamada.
        </li>
      </ol>
      <p>
        Tu aceptación se registra con tu identificador de usuario, dirección
        IP, agente de usuario del navegador y marca de tiempo exacta para
        trazabilidad legal (Art. 13.5 del Reglamento de la Ley 29733).
      </p>

      <h2>4. Qué datos se recolectan</h2>
      <ul>
        <li>
          <strong>Tu voz</strong>: capturada por el micrófono de tu dispositivo
          durante la llamada activa, transmitida en chunks de audio PCM 16 bits
          a 16 kHz.
        </li>
        <li>
          <strong>Audio grabado de tu voz</strong>: comprimido en formato webm
          opus a 32 kbps. Solo se graba tu voz, no la del agente virtual.
        </li>
        <li>
          <strong>Transcripción de la conversación</strong>: tanto de tus turnos
          como de las respuestas del agente, generada por Gemini Live API.
        </li>
        <li>
          <strong>Métricas técnicas</strong>: duración de la llamada, número de
          consultas a la base normativa, documentos citados, tokens consumidos
          y costo estimado.
        </li>
        <li>
          <strong>Calificación opcional</strong>: estrella de 1 a 5 y comentario
          libre que tú decides dar al terminar.
        </li>
      </ul>

      <h2>5. Quién procesa tu información</h2>
      <ul>
        <li>
          <strong>LexIA (Promptive)</strong>: opera la aplicación, almacena la
          transcripción y el audio en infraestructura Supabase con tu cuenta
          asociada.
        </li>
        <li>
          <strong>Google Cloud (Gemini Live API)</strong>: procesa el audio en
          tiempo real para generar la respuesta hablada y la transcripción.
          Los datos viajan a servidores de Google ubicados en Estados Unidos
          y Brasil. Google está obligado por sus Términos del Servicio de
          Google Cloud Generative AI a no usar tu contenido para entrenar
          modelos sin permiso explícito.
        </li>
        <li>
          <strong>Supabase</strong>: provee la base de datos PostgreSQL y el
          almacenamiento de objetos donde residen tu transcripción y tu audio.
          Servidores ubicados en Estados Unidos.
        </li>
      </ul>

      <h2>6. Dónde se almacenan tus datos</h2>
      <ul>
        <li>
          La grabación de audio se guarda en el bucket cifrado
          <code>voice-recordings</code> en la ruta exacta
          <code>{`{tu-user-id}/{call-id}.webm`}</code>.
          Solo tú puedes acceder a este path mediante políticas de Row Level
          Security.
        </li>
        <li>
          La transcripción turno-a-turno se guarda en la tabla
          <code>voice_call_transcripts</code> de la base de datos, también con
          RLS por usuario propietario.
        </li>
        <li>
          Las métricas técnicas y el resumen ejecutivo viven en la tabla
          <code>voice_calls</code>.
        </li>
      </ul>

      <h2>7. Cuánto tiempo conservamos tus datos</h2>
      <p>
        Por defecto, las grabaciones de audio se conservan{' '}
        <strong>90 días calendario</strong> contados desde la fecha de la
        llamada. Después de ese plazo, el audio se elimina de forma automática
        de Supabase Storage y el campo
        <code>audio_storage_path</code> se vacía.
      </p>
      <p>
        Las transcripciones y métricas se conservan mientras tu cuenta esté
        activa para que puedas consultar tu historial. Puedes eliminarlas en
        cualquier momento con el botón de eliminación del detalle de cada
        llamada (Art. 18 Ley 29733).
      </p>
      <p>
        Si cancelas tu cuenta de LexIA, todas tus llamadas (audio + transcripción
        + métricas) se eliminan automáticamente como parte del proceso de cierre
        de cuenta.
      </p>

      <h2>8. Tus derechos</h2>
      <p>
        Conforme a la Ley N° 29733 y su Reglamento, tienes derecho a:
      </p>
      <ul>
        <li>
          <strong>Acceso</strong>: ver todas tus llamadas con su transcripción
          y métricas desde la pestaña{' '}
          <Link href="/llamadas" className="underline">
            /llamadas
          </Link>
          .
        </li>
        <li>
          <strong>Rectificación</strong>: la transcripción puede contener
          errores de reconocimiento de voz. Escríbenos a{' '}
          <a href="mailto:soporte@lexia.pe" className="underline">
            soporte@lexia.pe
          </a>{' '}
          para corregir cualquier dato que consideres incorrecto.
        </li>
        <li>
          <strong>Cancelación (eliminación)</strong>: cada llamada tiene un
          botón Eliminar esta llamada que borra inmediatamente el audio del
          Storage y todos los registros asociados.
        </li>
        <li>
          <strong>Oposición</strong>: puedes dejar de usar la funcionalidad de
          voz en cualquier momento. Tu consentimiento queda registrado pero
          no se aplica a llamadas futuras hasta que vuelvas a iniciarlas.
        </li>
        <li>
          <strong>Portabilidad</strong>: puedes descargar el audio crudo
          (formato webm) desde el detalle de cada llamada.
        </li>
      </ul>

      <h2>9. Seguridad técnica</h2>
      <ul>
        <li>Toda la comunicación viaja por canales cifrados (HTTPS y WSS con TLS 1.3).</li>
        <li>El acceso a la base de datos está protegido por Row Level Security PostgreSQL.</li>
        <li>El bucket de audio es privado: solo el dueño autenticado puede generar URLs de descarga (signed URLs con duración limitada).</li>
        <li>La clave de servicio Gemini está restringida y se gestiona en variables de entorno protegidas.</li>
      </ul>

      <h2>10. Validez probatoria de la grabación</h2>
      <p>
        En Perú, la Corte Suprema ha reconocido (Apelación N° 7-2023, caso
        Los Mamanivideos) que las grabaciones efectuadas por uno de los
        interlocutores son prueba lícita si no vulneran derechos fundamentales
        de terceros. En consecuencia, puedes utilizar la grabación de tu
        llamada como sustento probatorio en procedimientos administrativos o
        judiciales que requieran acreditar el contenido de la conversación.
        Sin embargo, dado que el audio puede ser materia de impugnación por
        autenticidad, te recomendamos contar con un peritaje informático si
        necesitas presentar la grabación como prueba.
      </p>

      <h2>11. Limitaciones explícitas</h2>
      <ul>
        <li>El Abogado Virtual no constituye asesoría legal profesional.</li>
        <li>No existe secreto profesional entre el usuario y la inteligencia artificial.</li>
        <li>La información hablada por el agente es orientativa, basada en la Ley 32069 y su Reglamento, las directivas de la DGA, OECE y Perú Compras, las opiniones de la DTN y los pronunciamientos y resoluciones del Tribunal de Contrataciones del Estado vigentes a la fecha de cada llamada.</li>
        <li>Para decisiones críticas (resolución de contrato, impugnaciones, casos sancionadores) consulta a un abogado colegiado.</li>
      </ul>

      <h2>12. Contacto del responsable</h2>
      <p>
        Para ejercer cualquiera de tus derechos o consultar sobre el tratamiento
        de tu información en esta funcionalidad, escríbenos a{' '}
        <a href="mailto:soporte@lexia.pe" className="underline">
          soporte@lexia.pe
        </a>
        . Responderemos dentro del plazo legal de quince días hábiles.
      </p>

      <h2>13. Cambios a esta política</h2>
      <p>
        Si modificamos el texto del consentimiento o las prácticas de
        tratamiento de la información, te pediremos un nuevo consentimiento
        antes de tu siguiente llamada. La versión actual de este documento se
        identifica como <strong>v1-2026-06-26</strong>.
      </p>
    </article>
  );
}
