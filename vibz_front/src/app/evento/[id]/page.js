import EventoClient from './EventoClient'; 

// URL específica para o Servidor (Node.js precisa do link absoluto, não entende "/api")
const getServerApiUrl = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    // Se a variável for o proxy do front-end, o servidor aponta direto pro backend
    if (apiUrl === '/api') {
        return 'https://vibz.onrender.com/api'; 
    }
    return apiUrl;
};

// ==========================================
// MÁGICA DO SEO E OPEN GRAPH (WhatsApp/Insta)
// ==========================================
export async function generateMetadata({ params }) {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    try {
        const res = await fetch(`${getServerApiUrl()}/events/${id}`, {
            cache: 'no-store' // Garante que o servidor pegue sempre o nome mais atualizado
        });
        
        if (!res.ok) {
            return { title: 'Evento não encontrado' };
        }

        const evento = await res.json();
        
        const dataEvento = new Date(evento.date).toLocaleDateString('pt-BR');
        const descricaoCurta = evento.description ? evento.description.substring(0, 150) + '...' : 'Garanta seu ingresso na Vibz!';

        return {
            // Envia APENAS o título. O layout.js global cuida de adicionar o " | Vibz"
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
        console.error("Erro ao gerar metadata:", error);
        return {
            title: 'Ingressos Oficiais',
        };
    }
}

// ==========================================
// RENDERIZAÇÃO DA PÁGINA
// ==========================================
export default function EventoPage() {
    return <EventoClient />;
}