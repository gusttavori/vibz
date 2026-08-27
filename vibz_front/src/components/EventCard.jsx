'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { FaHeart, FaRegHeart, FaMapMarkerAlt } from 'react-icons/fa';
import toast from 'react-hot-toast';
import './EventCard.css';

export default function EventCard({ event, isUserLoggedIn, onToggleFavorite, isFavorited }) {
    const router = useRouter();

    const handleCardClick = () => {
        const eventId = event.id || event._id;
        if (eventId) {
            router.push(`/evento/${eventId}`);
        }
    };

    // Permite abrir o card apertando "Enter" ou "Espaço" no teclado
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardClick();
        }
    };

    const handleFavoriteClick = (e) => {
        e.stopPropagation(); 
        const eventId = event.id || event._id;

        if (isUserLoggedIn) {
            if (eventId) {
                onToggleFavorite(eventId, !isFavorited);
            } else {
                console.error("ID inválido", event);
            }
        } else {
            toast.error("Entre em sua conta para favoritar.");
            router.push('/login');
        }
    };

    const getDisplayDate = () => {
        if (event.date || event.eventDate) return new Date(event.date || event.eventDate);
        if (event.sessions?.length > 0) {
            const sorted = [...event.sessions].sort((a,b) => new Date(a.date) - new Date(b.date));
            return new Date(sorted[0].date);
        }
        return null;
    };

    // 🧮 Lógica para calcular o menor preço dos ingressos e formatar de centavos para Real
    const getFormattedPrice = () => {
        if (!event.tickets || event.tickets.length === 0) return null;
        
        const prices = event.tickets.map(t => Number(t.price)).filter(p => !isNaN(p));
        if (prices.length === 0) return null;

        const minPrice = Math.min(...prices);
        if (minPrice === 0) return 'Gratuito';

        return (minPrice / 100).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    };

    const displayDate = getDisplayDate();
    const day = displayDate && !isNaN(displayDate) ? displayDate.getDate().toString().padStart(2, '0') : null;
    const month = displayDate && !isNaN(displayDate) ? displayDate.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '') : null;
    const displayPrice = getFormattedPrice();
    
    const gradientOverlay = 'linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.4) 40%, transparent 100%)';

    return (
        <div 
            className="event-card" 
            onClick={handleCardClick}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex="0"
            aria-label={`Ver detalhes do evento: ${event.title}`}
        >
            
            {/* Camada 1: Fundo com Imagem e Gradiente */}
            <div className="event-card-image" style={{ backgroundColor: '#e2e8f0' }} aria-hidden="true">
                {event.imageUrl && (
                    <Image 
                        src={event.imageUrl} 
                        alt="" 
                        fill 
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" 
                        style={{ objectFit: 'cover' }} 
                    />
                )}
                <div style={{ position: 'absolute', inset: 0, background: gradientOverlay, zIndex: 2 }}></div>
            </div>

            {/* Camada 2: Elementos Flutuantes (Data, Preço e Favorito) */}
            {day && (
                <div className="event-card-date-badge" aria-label={`Data: ${day} de ${month}`}>
                    <span className="day" aria-hidden="true">{day}</span>
                    <span className="month" aria-hidden="true">{month}</span>
                </div>
            )}

            <button 
                className={`event-card-favorite ${isFavorited ? 'active' : ''}`} 
                onClick={handleFavoriteClick}
                type="button" 
                title={isFavorited ? "Remover" : "Favoritar"}
                aria-label={isFavorited ? `Remover ${event.title} dos favoritos` : `Adicionar ${event.title} aos favoritos`}
                aria-pressed={isFavorited}
            >
                {isFavorited ? (
                    <FaHeart className="heart-icon" aria-hidden="true" />
                ) : (
                    <FaRegHeart className="heart-icon" aria-hidden="true" />
                )}
            </button>

            {/* Camada 3: Conteúdo / Textos */}
            <div className="event-card-content">
                <div className="event-card-header">
                    <h4 className="event-card-title">{event.title}</h4>
                </div>
                <div className="event-card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    {(event.location || event.city) && (
                        <div className="event-card-location" aria-label={`Local: ${event.city || event.location}`}>
                            <FaMapMarkerAlt className="location-icon" aria-hidden="true" />
                            <span>{event.city || event.location}</span>
                        </div>
                    )}
                    {displayPrice && (
                        <span className="event-card-price" style={{ color: '#a78bfa', fontSize: '0.85rem', fontWeight: 'bold' }}>
                            {displayPrice === 'Gratuito' ? 'Gratuito' : `A partir de ${displayPrice}`}
                        </span>
                    )}
                </div>
            </div>

        </div>
    );
}