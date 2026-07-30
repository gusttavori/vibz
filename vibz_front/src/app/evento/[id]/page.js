'use client';

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { 
    FaMapMarkerAlt, FaInstagram, FaCalendarDay, FaExternalLinkAlt, 
    FaInfoCircle, FaUber, FaHamburger, FaGlassMartiniAlt, FaHotel 
} from 'react-icons/fa';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import toast, { Toaster } from 'react-hot-toast';
import './EventoDetalhes.css';

const getApiBaseUrl = () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function EventoDetalhes() {
    const params = useParams();
    const id = params?.id;
    const [evento, setEvento] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        fetch(`${getApiBaseUrl()}/events/${id}`)
            .then(res => res.json())
            .then(data => { setEvento(data); setLoading(false); })
            .catch(() => { toast.error("Erro ao carregar"); setLoading(false); });
    }, [id]);

    if (loading) {
        return (
            <div className="vibz-loading-container">
                <div className="vibz-spinner"></div>
                <h2 className="vibz-loading-title">Preparando a Vibe...</h2>
                <p className="vibz-loading-subtitle">Buscando os detalhes deste evento para você.</p>
            </div>
        );
    }
    
    if (!evento) return <div className="error-screen">Evento não encontrado.</div>;

    const displayDate = new Date(evento.date || evento.createdAt);
    const orgInfo = typeof evento.organizerInfo === 'string' ? JSON.parse(evento.organizerInfo || '{}') : (evento.organizerInfo || {});

    // --- MÁGICA DOS DEEP LINKS ---
    const addressQuery = encodeURIComponent(`${evento.location}, ${evento.city}`);
    
    const uberLink = `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${addressQuery}`;
    const hoteisLink = `https://www.google.com/maps/search/hoteis+perto+de+${addressQuery}`;
    const baresLink = `https://www.google.com/maps/search/bares+perto+de+${addressQuery}`;
    const restaurantesLink = `https://www.google.com/maps/search/restaurantes+perto+de+${addressQuery}`;

    return (
        <div className="vibz-details-page">
            <Toaster />
            <Header />
            
{/* HERO: MINIMALISTA E SOFISTICADO */}
            <section className="vibz-hero">
                <div className="vibz-hero-container">
                    
                    <div className="vibz-hero-info">
                        <span className="vibz-category-pill">{evento.category}</span>
                        <h1 className="vibz-title">{evento.title}</h1>
                        
                        <div className="vibz-meta-minimal">
                            <span className="meta-item">
                                <FaCalendarDay className="meta-icon" /> 
                                {displayDate.toLocaleDateString('pt-BR')}
                            </span>
                            <span className="meta-item">
                                <FaMapMarkerAlt className="meta-icon" /> 
                                {evento.location} - {evento.city}
                            </span>
                        </div>
                    </div>

                    <div className="vibz-image-minimal">
                        <img src={evento.imageUrl} alt={evento.title} />
                    </div>

                </div>
            </section>

            <main className="vibz-content">
                <div className="vibz-grid">
                    <section className="vibz-main">
                        <div className="vibz-card">
                            <h3>Sobre o Evento</h3>
                            <p className="vibz-desc">{evento.description}</p>
                        </div>
                        
                        <div className="vibz-card">
                            <h3>Organizado por</h3>
                            <div className="vibz-org">
                                <div className="vibz-avatar">{orgInfo.name?.charAt(0) || 'V'}</div>
                                <div className="vibz-org-info">
                                    <h4>{orgInfo.name || "Produtor Cultural"}</h4>
                                    {orgInfo.instagram && (
                                        <a href={`https://instagram.com/${orgInfo.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="vibz-insta">
                                            <FaInstagram /> {orgInfo.instagram}
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                    <aside className="vibz-sidebar">
                        <div className="vibz-guide">
                            <FaInfoCircle className="guide-icon" />
                            <h3>Ingressos Oficiais</h3>
                            
                            {evento.externalUrl ? (
                                <>
                                    <p>Curadoria oficial. Clique abaixo para acessar os ingressos no canal do produtor.</p>
                                    <a href={evento.externalUrl} target="_blank" rel="noopener noreferrer" className="vibz-btn-primary">
                                        <FaExternalLinkAlt /> Acessar Ingressos
                                    </a>
                                </>
                            ) : (
                                <p className="vibz-msg">
                                    Curadoria oficial. Acesse as redes sociais da produção ou do evento para mais detalhes e informações sobre ingressos.
                                </p>
                            )}
                        </div>

                        {/* --- NOVA SEÇÃO: TRANSPORTE E UTILIDADES --- */}
                        <div className="vibz-guide mt-4"> 
                            <h3>Planeje seu Rolê</h3>
                            <p>Facilite sua chegada e descubra o que tem por perto.</p>
                            
                            <div className="vibz-utility-buttons">
                                <a href={uberLink} target="_blank" rel="noopener noreferrer" className="vibz-btn-uber">
                                    <FaUber /> Ir de Uber
                                </a>
                                
                                <div className="vibz-places-list">
                                    <a href={hoteisLink} target="_blank" rel="noopener noreferrer" className="vibz-btn-outline">
                                        <FaHotel /> Hotéis próximos
                                    </a>
                                    <a href={baresLink} target="_blank" rel="noopener noreferrer" className="vibz-btn-outline">
                                        <FaGlassMartiniAlt /> Bares próximos
                                    </a>
                                    <a href={restaurantesLink} target="_blank" rel="noopener noreferrer" className="vibz-btn-outline">
                                        <FaHamburger /> Restaurantes próximos
                                    </a>
                                </div>
                            </div>
                        </div>

                    </aside>
                </div>
            </main>
            <Footer />
        </div>
    );
}