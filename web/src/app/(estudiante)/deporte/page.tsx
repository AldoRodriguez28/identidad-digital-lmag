'use client';
import { Activity, Trophy, GraduationCap, Shield } from 'lucide-react';
import { RecursosPage } from '../../../components/RecursosPage';

export default function DeportePage() {
  return (
    <RecursosPage
      tipo="deporte"
      title="Deporte"
      subtitle="Entrena, compite y alcanza tus sueños. Descubre Try-Outs universitarios y becas deportivas."
      heroLead="Tu talento te puede"
      heroLeadGold="llevar más lejos"
      heroText="Participa en los Try-Outs de universidades y accede a becas deportivas."
      features={[
        { icon: Activity, title: 'Entrena', text: 'con disciplina' },
        { icon: Trophy, title: 'Compite', text: 'con pasión' },
        { icon: GraduationCap, title: 'Estudia', text: 'con una beca' },
      ]}
      sectionTitle="Try-Outs universitarios"
      cardIcon={Shield}
    />
  );
}
