'use client';
import { GraduationCap, Compass, Target, Building2 } from 'lucide-react';
import { RecursosPage } from '../../../components/RecursosPage';

export default function EducacionPage() {
  return (
    <RecursosPage
      tipo="educacion"
      title="Educación"
      subtitle="Descubre universidades e instituciones que impulsarán tu futuro."
      heroLead="Tu futuro, sin límites"
      heroLeadGold="tu esfuerzo, sin límites"
      heroText="Explora universidades, becas y programas educativos diseñados para ti. ¡Elige tu camino y alcanza tus sueños!"
      features={[
        { icon: Compass, title: 'Explora', text: 'universidades y programas' },
        { icon: GraduationCap, title: 'Estudia', text: 'con becas y apoyos' },
        { icon: Target, title: 'Alcanza', text: 'tus metas académicas' },
      ]}
      sectionTitle="Universidades e instituciones"
      cardIcon={Building2}
    />
  );
}
