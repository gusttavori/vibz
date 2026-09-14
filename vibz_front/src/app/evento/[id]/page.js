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
            // Se não achar o evento, envia apenas o título (o layout.js vai colocar o " | Vibz")
            return { title: 'Evento não encontrado' };
        }

        const evento = await res.json();
        
        const dataEvento = new Date(evento.date).toLocaleDateString('pt-BR');
        const descricaoCurta = evento.description ? evento.description.substring(0, 150) + '...' : 'Garanta seu ingresso na Vibz!';

        return {
            // 👇 CORREÇÃO: Envia apenas o nome do evento. O layout.js global cuida do sufixo.
            title: evento.title, 
            description: descricaoCurta,
            openGraph: {
                title: `${evento.title} - ${dataEvento} | Vibz`,
                description: descricaoCurta,
                url: `https://vibzeventos.com.br/evento/${id}`, 
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
                title: `${evento.title} | Vibz`,
                description: descricaoCurta,
                images: [evento.imageUrl],
            },
        };
    } catch (error) {
        // 👇 Fallback: Envia apenas "Detalhes do Evento"
        return {
            title: 'Detalhes do Evento',
        };
    }
}

// ==========================================
// RENDERIZAÇÃO DA PÁGINA
// ==========================================
export default function EventoPage() {
    return <EventoClient />;
}