export const metadata = { title: 'Política de Cookies' };

export default function CookiesPage() {
  return (
    <article>
      <h1>Política de Cookies</h1>
      <p className="text-sm text-muted-foreground">Última actualización: 2026</p>

      <p>
        LexIA Contrataciones utiliza cookies y tecnologías similares para
        operar correctamente y para mejorar tu experiencia. Esta política
        explica qué cookies usamos y para qué.
      </p>

      <h2>1. ¿Qué son las cookies?</h2>
      <p>
        Son pequeños archivos de texto que se guardan en tu navegador cuando
        visitas un sitio. Permiten reconocerte al volver y recordar tus
        preferencias.
      </p>

      <h2>2. Cookies que usamos</h2>

      <h3>Estrictamente necesarias</h3>
      <p>
        Son indispensables para que la Plataforma funcione. Mantienen tu
        sesión iniciada, protegen contra CSRF y recuerdan tu rol activo y la
        preferencia de tema claro/oscuro. No requieren tu consentimiento por
        ser técnicamente necesarias.
      </p>
      <ul>
        <li>
          <code>sb-access-token</code>, <code>sb-refresh-token</code> — sesión
          de Supabase Auth.
        </li>
        <li>
          <code>lexia-ui</code> — estado de UI (sidebar colapsada, tema).
        </li>
      </ul>

      <h3>Analíticas</h3>
      <p>
        Solo si las activas. Nos ayudan a entender qué módulos usan más los
        usuarios y dónde hay fricciones, sin identificarte personalmente.
      </p>

      <h2>3. Cookies de terceros</h2>
      <p>
        Algunas funciones de la Plataforma dependen de servicios externos
        (Supabase, Vercel, Culqi). Estos servicios pueden establecer sus
        propias cookies; consulta sus políticas para más detalle.
      </p>

      <h2>4. Cómo controlarlas</h2>
      <p>
        Puedes gestionar y eliminar cookies desde la configuración de tu
        navegador. Recuerda que deshabilitar las estrictamente necesarias
        puede impedir el funcionamiento de la Plataforma.
      </p>

      <h2>5. Cambios</h2>
      <p>
        Si actualizamos esta política te lo comunicaremos al iniciar sesión.
      </p>

      <h2>6. Contacto</h2>
      <p>
        <a href="mailto:hola@promptive.pe">hola@promptive.pe</a>
      </p>
    </article>
  );
}
