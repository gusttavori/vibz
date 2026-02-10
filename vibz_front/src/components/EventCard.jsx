'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { FaHeart, FaRegHeart, FaMapMarkerAlt } from 'react-icons/fa';
import './EventCard.css';

export default function EventCard({ event, isUserLoggedIn, onToggleFavorite, isFavorited }) {
    const router = useRouter();

    const handleCardClick = () => {
        const eventId = event.id || event._id;
        if (eventId) {
            router.push(`/evento/${eventId}`);
        }
    };

    const handleFavoriteClick = (e) => {
        e.stopPropagation(); 
        const eventId = event.id || event._id;

        if (isUserLoggedIn) {
            if (eventId) {
                // Envia o ID e o NOVO estado desejado (inverso do atual)
                onToggleFavorite(eventId, !isFavorited);
            } else {
                console.error("ID inválido", event);
            }
        } else {
            if (confirm("Faça login para favoritar.")) router.push('/login');
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

    const displayDate = getDisplayDate();
    const day = displayDate && !isNaN(displayDate) ? displayDate.getDate().toString().padStart(2, '0') : null;
    const month = displayDate && !isNaN(displayDate) ? displayDate.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '') : null;
    const gradientOverlay = 'linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.4) 40%, transparent 100%)';

    return (
        <div className="event-card" onClick={handleCardClick}>
            <div className="event-card-image" 
                 style={{ 
                     backgroundImage: event.imageUrl ? `${gradientOverlay}, url(${event.imageUrl})` : 'none', 
                     backgroundColor: '#e2e8f0' 
                 }}>
                 {day && (
                    <div className="event-card-date-badge">
                        <span className="day">{day}</span>
                        <span className="month">{month}</span>
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
                type="button" 
                title={isFavorited ? "Remover" : "Favoritar"}
            >
                {isFavorited ? <FaHeart color="#ff4757" /> : <FaRegHeart color="#fff" />}
            </button>
        </div>
    );
}