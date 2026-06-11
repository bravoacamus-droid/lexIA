export const metadata = { title: 'Términos y Condiciones' };

export default function TerminosPage() {
  return (
    <article>
      <h1>Términos y Condiciones</h1>
      <p className="text-sm text-muted-foreground">
        Última actualización: 2026
      </p>

      <h2>1. Aceptación</h2>
      <p>
        Al usar LexIA Contrataciones (en adelante, &quot;la Plataforma&quot;), aceptas estos
        Términos y Condiciones. Si no estás de acuerdo, por favor no uses la
        Plataforma.
      </p>

      <h2>2. Descripción del servicio</h2>
      <p>
        La Plataforma es una herramienta de software como servicio (SaaS) que
        asiste a usuarios del ecosistema de Contrataciones Públicas del Estado
        peruano. Ofrece, entre otras funciones, un chat experto con sustento
        normativo, generadores de documentos legales y un evaluador de ofertas.
      </p>

      <h2>3. Alcance del soporte normativo</h2>
      <p>
        Las respuestas y documentos generados por LexIA tienen carácter
        REFERENCIAL y se basan en la Ley N° 32069, su Reglamento, directivas,
        opiniones y resoluciones disponibles al momento de la consulta. Estas
        salidas no sustituyen la asesoría legal calificada ni la decisión del
        funcionario competente, comité de selección o tribunal.
      </p>

      <h2>4. Cuenta y acceso</h2>
      <p>
        Para usar la Plataforma debes crear una cuenta autenticándote con un
        proveedor compatible (Google o Facebook). Eres responsable de mantener
        la seguridad de tu cuenta y de la información que cargues en ella.
      </p>

      <h2>5. Prueba gratuita y suscripciones</h2>
      <p>
        Ofrecemos 30 días de prueba sin tarjeta de crédito. Al término del
        periodo de prueba, podrás continuar contratando un plan pago. Los planes
        se procesan vía Culqi y se facturan en soles peruanos. Puedes cancelar
        en cualquier momento; conservarás el acceso hasta el fin del periodo
        pagado.
      </p>

      <h2>6. Uso aceptable</h2>
      <p>Te comprometes a no usar la Plataforma para:</p>
      <ul>
        <li>
          Generar documentos con fines fraudulentos, dolosos o que contravengan
          la normativa peruana.
        </li>
        <li>
          Acceder o intentar acceder a información de otros usuarios sin
          autorización.
        </li>
        <li>
          Cargar contenido ilícito, ofensivo o que infrinja derechos de terceros.
        </li>
        <li>
          Realizar scraping, ingeniería inversa o copia masiva de la base de
          conocimiento.
        </li>
      </ul>

      <h2>7. Propiedad intelectual</h2>
      <p>
        La Plataforma, su código, diseño y base de conocimiento curada son
        propiedad de Promptive. Tú conservas la propiedad sobre los documentos
        que cargues y sobre los documentos finales que generes y descargues.
      </p>

      <h2>8. Limitación de responsabilidad</h2>
      <p>
        En la máxima medida permitida por la ley, Promptive no será responsable
        por daños indirectos, lucro cesante o consecuencias derivadas del uso de
        la Plataforma. Las decisiones que tomes basadas en outputs de la IA son
        de tu exclusiva responsabilidad.
      </p>

      <h2>9. Modificaciones</h2>
      <p>
        Podemos actualizar estos Términos. Te notificaremos los cambios
        sustanciales por correo electrónico o desde la propia Plataforma con al
        menos 15 días de anticipación.
      </p>

      <h2>10. Ley aplicable y jurisdicción</h2>
      <p>
        Estos Términos se rigen por la ley peruana. Cualquier controversia se
        someterá a la jurisdicción de los jueces de Lima Metropolitana.
      </p>

      <h2>11. Contacto</h2>
      <p>
        Para consultas sobre estos Términos, escríbenos a{' '}
        <a href="mailto:hola@promptive.pe">hola@promptive.pe</a>.
      </p>
    </article>
  );
}
