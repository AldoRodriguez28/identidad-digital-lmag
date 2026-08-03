import Link from 'next/link';

export const metadata = { title: 'Términos y Condiciones — Identidad Digital Juvenil' };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-guinda">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-gray-700">{children}</div>
    </section>
  );
}

export default function TerminosPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/registro" className="text-sm font-semibold text-guinda hover:underline">&larr; Volver al registro</Link>
      <h1 className="mt-4 text-3xl font-extrabold uppercase tracking-tight text-guinda">Términos y Condiciones</h1>
      <p className="mt-2 text-sm text-gray-500">Programa de Identidad Digital Juvenil — última actualización 2026.</p>

      <Section title="1. Objeto">
        <p>
          Estos Términos y Condiciones regulan el uso de la plataforma de Identidad Digital Juvenil, mediante la cual
          jóvenes del municipio se registran para obtener una credencial digital, acumular puntos por participar en
          eventos y programas, y acceder a becas, descuentos y demás beneficios ofrecidos por el ayuntamiento.
        </p>
      </Section>

      <Section title="2. Elegibilidad y veracidad de los datos">
        <p>
          Al registrarte declaras que la información proporcionada (datos personales, domicilio, CURP e
          identificación oficial) es verídica y te pertenece. El uso de datos de identidad de terceros sin
          autorización queda prohibido y puede derivar en la cancelación de la cuenta.
        </p>
      </Section>

      <Section title="3. Uso de la credencial y sistema de puntos">
        <p>
          Los puntos otorgados por asistencia a eventos, talleres y programas no tienen valor monetario y solo pueden
          canjearse por los beneficios definidos dentro de la plataforma. El ayuntamiento puede ajustar los niveles,
          beneficios o mecánicas de puntos en cualquier momento, notificando los cambios relevantes.
        </p>
      </Section>

      <Section title="4. Aviso de Privacidad">
        <div id="privacidad" className="scroll-mt-6">
          <p>
            Los datos personales que recabamos —incluyendo nombre, fecha de nacimiento, CURP, domicilio, contacto,
            redes sociales e identificación oficial (INE frente y reverso)— son tratados conforme a la Ley General de
            Protección de Datos Personales en Posesión de Sujetos Obligados.
          </p>
          <p>
            Estos datos se usan exclusivamente para: verificar tu identidad, generar tu credencial digital, gestionar
            tu participación en eventos y programas municipales, y contactarte sobre becas, descuentos y
            oportunidades relevantes para ti. No se venden ni comparten con terceros ajenos al municipio.
          </p>
          <p>
            Las imágenes de tu identificación oficial se almacenan de forma restringida y solo son accesibles por
            personal administrativo autorizado.
          </p>
          <p>
            Puedes ejercer tus derechos de acceso, rectificación, cancelación u oposición (derechos ARCO) sobre tus
            datos personales escribiendo a la unidad de transparencia del ayuntamiento.
          </p>
        </div>
      </Section>

      <Section title="5. Seguridad de la cuenta">
        <p>
          Eres responsable de mantener la confidencialidad de tu contraseña. Notifica de inmediato cualquier uso no
          autorizado de tu cuenta.
        </p>
      </Section>

      <Section title="6. Modificaciones">
        <p>
          Podemos actualizar estos Términos y Condiciones y el Aviso de Privacidad. Los cambios relevantes se
          notificarán a través de la plataforma o al correo registrado.
        </p>
      </Section>
    </div>
  );
}
