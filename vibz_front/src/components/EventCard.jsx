'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { FaHeart, FaRegHeart, FaMapMarkerAlt } from 'react-icons/fa';
import './EventCard.css';

export default function EventCard({ event, isUserLoggedIn, onToggleFavorite, isFavorited }) {
    const router = useRouter();

    const handleCardClick = () => {
        // Garante suporte para ID do Prisma (id) ou MongoDB (_id)
        const eventId = event.id || event._id;
        if (eventId) {
            router.push(`/evento/${eventId}`);
        }
    };

    const handleFavoriteClick = (e) => {
        e.stopPropagation(); // Impede abrir o evento ao clicar no coração

        const eventId = event.id || event._id;

        if (isUserLoggedIn) {
            if (eventId) {
                onToggleFavorite(eventId, !isFavorited);
            } else {
                console.error("ID do evento inválido", event);
            }
        } else {
            if (confirm("Você precisa fazer login para favoritar eventos. Deseja ir para o login agora?")) {
                router.push('/login');
            }
        }
    };

    // --- LÓGICA DE DATA ---
    const getDisplayDate = () => {
        if (event.date || event.eventDate) return new Date(event.date || event.eventDate);
        if (event.sessions && Array.isArray(event.sessions) && event.sessions.length > 0) {
            const sorted = [...event.sessions].sort((a,b) => new Date(a.date) - new Date(b.date));
            return new Date(sorted[0].date);
        }
        return null;
    };

    const formatDate = () => {
        const date = getDisplayDate();
        if (!date || isNaN(date.getTime())) return null;

        const day = date.getDate().toString().padStart(2, '0');
        const monthNames = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN','JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
        const month = monthNames[date.getMonth()];

        return (
            <>
                <span className="day">{day}</span>
                <span className="month">{month}</span>
            </>
        );
    };

    const displayDate = formatDate();
    const gradientOverlay = 'linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.4) 40%, transparent 100%)';

    return (
        <div className="event-card" onClick={handleCardClick}>
            <div className="event-card-image" 
                 style={{ 
                     backgroundImage: event.imageUrl ? `${gradientOverlay}, url(${event.imageUrl})` : 'none', 
                     backgroundColor: '#e2e8f0' 
                 }}>
                 
                 {displayDate && (
                    <div className="event-card-date-badge">
                        {displayDate}
                    </div>
                 )}
            </div>

            <div className="event-card-content">
                <div className="event-card-header">
                    <h4 className="event-card-title">{event.title}</h4>
                </div>
                
                <div className="event-card-footer">
                    {(event.location || event.city) && (
                        <div className="event-card-location">
                            <FaMapMarkerAlt className="location-icon" />
                            <span>{event.city || event.location}</span>
                        </div>
                    )}
                </div>
            </div>

            <button 
                className={`event-card-favorite ${isFavorited ? 'active' : ''}`} 
                onClick={handleFavoriteClick}
                title={isFavorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            >
                {isFavorited ? <FaHeart className="heart-icon" /> : <FaRegHeart className="heart-icon" />}
            </button>
        </div>
    );
}