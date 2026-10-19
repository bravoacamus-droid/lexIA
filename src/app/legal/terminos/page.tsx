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
        Al usar A-LexIA Contrataciones (en adelante, &quot;la Plataforma&quot;), aceptas estos
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
        Las respuestas y documentos generados por A-LexIA tienen carácter
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
      <p>
        Los documentos que cargas para que A-LexIA los evalúe (bases, ofertas,
        documentos de subsanación y los documentos de un expediente de
        ejecución contractual) se eliminan de nuestro almacenamiento cuando
        termina su procesamiento. Conservamos el resultado y el texto que se
        extrajo de ellos mientras no elimines la evaluación o el expediente.
        El detalle está en la{' '}
        <a href="/legal/privacidad">Política de Privacidad</a>.
      </p>

      <h2>5. Prueba gratuita, planes y créditos</h2>
      <p>
        Cada usuario puede usar una sola vez la Prueba A-LexIA, sin tarjeta de
        crédito: incluye 20 preguntas por texto o 30 días, lo que ocurra
        primero. Al terminar no se cobra nada; para seguir usando la Plataforma
        puedes contratar un plan.
      </p>
      <p>
        Cada plan habilita un conjunto de herramientas y una bolsa mensual de
        créditos, que se descuentan según la herramienta usada y se renuevan
        cada mes mientras el plan esté vigente; los créditos del mes no
        utilizados no se acumulan. Puedes comprar recargas de créditos
        adicionales: cada recarga vence a los 30 días calendario de su
        activación, y los créditos de recarga que no uses en ese plazo se
        pierden. Los créditos del mes se usan primero y, después, los de la
        recarga que vence antes. En los planes de equipo, la bolsa de créditos es
        compartida por sus usuarios. Los planes y las recargas se contratan a
        través de nuestro canal comercial y se facturan en soles peruanos; el
        plan anual cubre 12 meses, se paga por adelantado y sus créditos se
        entregan y renuevan cada mes durante esos 12 meses. Conservarás el
        acceso hasta el fin del periodo pagado.
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
