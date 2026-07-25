'use client';
import { Palette, Music2, Award, Sparkles } from 'lucide-react';
import { RecursosPage } from '../../../components/RecursosPage';

export default function CulturaPage() {
  return (
    <RecursosPage
      tipo="cultura"
      title="Cultura"
      subtitle="Impulsamos tu talento artístico y cultural. Accede a becas y programas para desarrollar tu pasión."
      heroLead="Tu talento inspira,"
      heroLeadGold="la cultura transforma"
      heroText="Participa en programas culturales y artísticos, obtén becas y demuestra tu creatividad al mundo."
      features={[
        { icon: Palette, title: 'Explora', text: 'tu creatividad' },
        { icon: Music2, title: 'Desarrolla', text: 'tu talento' },
        { icon: Award, title: 'Obtén becas', text: 'culturales' },
      ]}
      sectionTitle="Áreas culturales"
      cardIcon={Sparkles}
    />
  );
}
