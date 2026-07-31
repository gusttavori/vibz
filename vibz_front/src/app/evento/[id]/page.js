import EventoClient from './EventoClient'; 

const getApiBaseUrl = () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// ==========================================
// MÁGICA DO SEO E OPEN GRAPH (WhatsApp/Insta)
// ==========================================
export async function generateMetadata({ params }) {
    // CORREÇÃO AQUI: No Next.js 15+, params é uma Promise e precisa do 'await'
    const resolvedParams = await params;
    const id = resolvedParams.id;

    try {
        const res = await fetch(`${getApiBaseUrl()}/events/${id}`);
        
        if (!res.ok) {
            return { title: 'Evento não encontrado | Vibz' };
        }

        const evento = await res.json();
        
        const dataEvento = new Date(evento.date).toLocaleDateString('pt-BR');
        const descricaoCurta = evento.description ? evento.description.substring(0, 150) + '...' : 'Garanta seu ingresso na Vibz!';

        return {
            title: `${evento.title} | Vibz`,
            description: descricaoCurta,
            openGraph: {
                title: `${evento.title} - ${dataEvento}`,
                description: descricaoCurta,
                url: `https://seusite.com.br/evento/${id}`, // Troque pelo seu domínio depois
                siteName: 'Vibz',
                images: [
                    {
                        url: evento.imageUrl, 
                        width: 1200,
                        height: 630,
                        alt: evento.title,
                    },
                ],
                locale: 'pt_BR',
                type: 'website',
            },
            twitter: {
                card: 'summary_large_image',
                title: evento.title,
                description: descricaoCurta,
                images: [evento.imageUrl],
            },
        };
    } catch (error) {
        return {
            title: 'Detalhes do Evento | Vibz',
        };
    }
}

// ==========================================
// RENDERIZAÇÃO DA PÁGINA
// ==========================================
export default function EventoPage() {
    return <EventoClient />;
}