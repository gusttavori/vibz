export default async function sitemap() {
  const baseUrl = 'https://vibzeventos.com.br';
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  // 1. Suas rotas estáticas principais
  const staticRoutes = [
    '',
    '/login',
    // Adicione outras páginas fixas que você tiver aqui (ex: '/produtor', '/sobre')
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'daily',
    priority: route === '' ? 1.0 : 0.8,
  }));

  // 2. Busca os eventos direto da API para mapear as páginas de detalhes dinamicamente
  try {
    const response = await fetch(`${API_BASE_URL}/events`, {
      next: { revalidate: 3600 } // Atualiza o sitemap a cada hora
    });

    if (response.ok) {
      const events = await response.json();
      
      const dynamicRoutes = events.map((event) => ({
        url: `${baseUrl}/evento/${event._id || event.id}`,
        lastModified: new Date(event.updatedAt || event.date || new Date()).toISOString(),
        changeFrequency: 'weekly',
        priority: 0.7,
      }));

      return [...staticRoutes, ...dynamicRoutes];
    }
  } catch (error) {
    console.error('Erro ao gerar rotas dinâmicas para o sitemap:', error);
  }

  // Caso a API falhe, retorna ao menos as páginas estáticas para o Google não ficar no escuro
  return staticRoutes;
}