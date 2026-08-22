export default async function sitemap() {
  const baseUrl = 'https://vibzeventos.com.br';
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  // 1. Rotas estáticas principais (Apenas páginas PÚBLICAS)
  // Nota: Não inclua /login, /admin ou /dashboard aqui, pois elas foram bloqueadas no robots.txt
  const staticRoutes = [
    '',
    // '/sobre', // Descomente e adicione outras páginas institucionais públicas se houver
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: route === '' ? 1.0 : 0.8,
  }));

  // 2. Busca os eventos direto da API para mapear as páginas de detalhes dinamicamente
  try {
    const response = await fetch(`${API_BASE_URL}/events`, {
      next: { revalidate: 3600 } // Atualiza o cache do sitemap a cada 1 hora
    });

    if (response.ok) {
      const events = await response.json();
      
      const dynamicRoutes = events.map((event) => ({
        url: `${baseUrl}/evento/${event.id || event._id}`,
        // Tenta pegar a última atualização, depois a criação, depois a data do evento, e por fim a data atual
        lastModified: new Date(event.updatedAt || event.createdAt || event.date || new Date()),
        changeFrequency: 'weekly',
        priority: 0.8, // Prioridade alta, pois são as páginas de conversão/venda
      }));

      return [...staticRoutes, ...dynamicRoutes];
    }
  } catch (error) {
    console.error('Erro ao gerar rotas dinâmicas para o sitemap:', error);
  }

  // Caso a API falhe, retorna ao menos as páginas estáticas para o Google não ficar no escuro
  return staticRoutes;
}