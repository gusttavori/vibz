'use client';

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FaMapMarkerAlt, FaInstagram, FaCalendarDay, FaExternalLinkAlt, FaInfoCircle } from 'react-icons/fa';
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

    if (loading) return <div className="loader">Carregando experiência...</div>;
    if (!evento) return <div className="error-screen">Evento não encontrado.</div>;

    const displayDate = new Date(evento.date || evento.createdAt);
    const orgInfo = typeof evento.organizerInfo === 'string' ? JSON.parse(evento.organizerInfo || '{}') : (evento.organizerInfo || {});

    return (
        <div className="vibz-details-page">
            <Toaster />
            <Header />
            
            <section className="vibz-hero">
                <div className="vibz-hero-bg" style={{ backgroundImage: `url(${evento.imageUrl})` }}></div>
                <div className="vibz-hero-overlay"></div>
                
                <div className="vibz-hero-container">
                    <div className="vibz-cover-wrapper">
                        <img src={evento.imageUrl} alt={evento.title} className="vibz-cover-img" />
                    </div>
                    <div className="vibz-hero-info">
                        <span className="vibz-pill">{evento.category}</span>
                        <h1 className="vibz-title">{evento.title}</h1>
                        <div className="vibz-meta">
                            <span><FaCalendarDay /> {displayDate.toLocaleDateString('pt-BR')}</span>
                            <span><FaMapMarkerAlt /> {evento.location} - {evento.city}</span>
                        </div>
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
                            <h3>Agenda Vibz</h3>
                            <p>Curadoria oficial. Clique abaixo para acessar os ingressos no canal do produtor.</p>
                            {evento.externalUrl ? (
                                <a href={evento.externalUrl} target="_blank" rel="noopener noreferrer" className="vibz-btn-primary">
                                    <FaExternalLinkAlt /> Acessar Ingressos
                                </a>
                            ) : (
                                <p className="vibz-msg">Mais informações nas redes oficiais do produtor.</p>
                            )}
                        </div>
                    </aside>
                </div>
            </main>
            <Footer />
        </div>
    );
}