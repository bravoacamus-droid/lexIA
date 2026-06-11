export const metadata = { title: 'Política de Privacidad' };

export default function PrivacidadPage() {
  return (
    <article>
      <h1>Política de Privacidad</h1>
      <p className="text-sm text-muted-foreground">Última actualización: 2026</p>

      <h2>1. Quiénes somos</h2>
      <p>
        LexIA Contrataciones es operado por Promptive (en adelante, &quot;nosotros&quot;).
        Esta política describe qué datos personales tratamos y cómo lo hacemos,
        conforme a la Ley N° 29733, Ley de Protección de Datos Personales del
        Perú, y su Reglamento.
      </p>

      <h2>2. Datos que recolectamos</h2>
      <p>Recolectamos los siguientes datos:</p>
      <ul>
        <li>
          <strong>Datos de cuenta</strong>: nombre, correo electrónico,
          avatar — provistos por tu proveedor OAuth (Google o Facebook).
        </li>
        <li>
          <strong>Datos de organización</strong> (opcionales): razón social,
          RUC, cargo, que ingresas durante el onboarding o desde tu cuenta.
        </li>
        <li>
          <strong>Datos de uso</strong>: registros de tus conversaciones de
          chat, documentos generados, evaluaciones, anotaciones y favoritos,
          asociados a tu usuario para que puedas recuperarlos.
        </li>
        <li>
          <strong>Datos de facturación</strong> (solo si contratas un plan pago):
          son tratados por Culqi conforme a su propia política de privacidad.
          No almacenamos números completos de tarjeta.
        </li>
        <li>
          <strong>Datos técnicos</strong>: dirección IP, dispositivo, navegador
          y métricas mínimas necesarias para operar el servicio y prevenir abuso.
        </li>
      </ul>

      <h2>3. Para qué usamos tus datos</h2>
      <ul>
        <li>Brindar el servicio que contrataste.</li>
        <li>Personalizar tu experiencia según tu perfil (Entidad, Proveedor, Consultor).</li>
        <li>Procesar pagos y emitir comprobantes.</li>
        <li>Cumplir obligaciones legales y atender solicitudes de la autoridad competente cuando corresponda.</li>
        <li>Mejorar el servicio mediante métricas agregadas (sin identificarte personalmente).</li>
      </ul>

      <h2>4. NO usamos tus datos para…</h2>
      <ul>
        <li>Entrenar nuestros modelos con tus documentos privados.</li>
        <li>Compartirlos con terceros con fines comerciales.</li>
        <li>Vender tu información a anunciantes.</li>
      </ul>

      <h2>5. Encargados del tratamiento</h2>
      <p>Procesamos tus datos en colaboración con los siguientes encargados:</p>
      <ul>
        <li>
          <strong>Supabase</strong> (infraestructura de base de datos y storage).
        </li>
        <li>
          <strong>Vercel</strong> (hosting de la aplicación web).
        </li>
        <li>
          <strong>Google Gemini API</strong> (inferencia de IA — recibe el
          texto de tus consultas para generar respuestas, no las almacena
          conforme a sus términos).
        </li>
        <li>
          <strong>Culqi</strong> (procesamiento de pagos).
        </li>
        <li>
          <strong>Sentry</strong> (monitoreo de errores; recibe únicamente datos
          técnicos del error, no contenido).
        </li>
      </ul>

      <h2>6. Conservación</h2>
      <p>
        Conservamos tus datos mientras tu cuenta esté activa y por un periodo
        adicional razonable después del cierre, salvo obligación legal de
        conservarlos por más tiempo (por ejemplo, facturación). Puedes
        solicitar la eliminación en cualquier momento.
      </p>

      <h2>7. Tus derechos</h2>
      <p>
        Tienes derecho a acceder, rectificar, cancelar y oponerte al
        tratamiento de tus datos (derechos ARCO). Para ejercerlos, escríbenos
        a <a href="mailto:hola@promptive.pe">hola@promptive.pe</a> desde el
        correo asociado a tu cuenta. Responderemos en un plazo máximo de 20
        días hábiles.
      </p>

      <h2>8. Seguridad</h2>
      <p>
        Aplicamos cifrado en tránsito (TLS) y en reposo, autenticación con
        proveedores OAuth, separación de privilegios mediante Row Level
        Security en la base de datos, y monitoreo continuo. Aún así, ningún
        sistema es 100% seguro; ante cualquier incidente que afecte tus datos,
        te notificaremos sin demora.
      </p>

      <h2>9. Cambios a esta política</h2>
      <p>
        Si actualizamos esta política te lo comunicaremos por correo
        electrónico y desde la propia Plataforma con al menos 15 días de
        anticipación cuando los cambios sean sustanciales.
      </p>

      <h2>10. Contacto</h2>
      <p>
        Para cualquier consulta sobre el tratamiento de tus datos:{' '}
        <a href="mailto:hola@promptive.pe">hola@promptive.pe</a>.
      </p>
    </article>
  );
}
