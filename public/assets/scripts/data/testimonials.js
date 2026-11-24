const testimonial = {
  quote:
    'Desenvolvemos para o V.A.R.D uma plataforma interna de anotações em armadilhas yellowtrap.',
  muted: 'anotações em armadilhas yellowtrap.',
  author: 'Willy Kevin',
  role: 'CEO do V.A.R.D',
  context:
    'Vigilância Agrícola e Resposta Digital: tecnologia e pesquisa para o agro, com análise de solos e monitoramento de pragas. Empresa premiada em IA no Vale do Silício.',
  label: 'PROJETO EM DESTAQUE',
};

// Repetições intencionais: mantém apenas o projeto autorizado pelo cliente.
export const testimonials = Array.from({ length: 3 }, () => ({ ...testimonial }));
