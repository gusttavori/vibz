'use client';

import React from 'react';
import { useRouter } from 'next/navigation'; 
import './EventCard.css'; 

export default function EventCard({ event, isUserLoggedIn, onToggleFavorite, isFavorited }) {
    const router = useRouter(); 

    const handleCardClick = () => {
        router.push(`/evento/${event._id}`);
    };

    const handleFavoriteClick = (e) => {
        e.stopPropagation();
        if (isUserLoggedIn) {
            onToggleFavorite(event._id, !isFavorited);
        } else {
            if(confirm("Faça login para favoritar.")) router.push('/login');
        }
    };

    // --- LÓGICA DE DATA ROBUSTA ---
    const getDisplayDate = () => {
        // 1. Tenta pegar a data raiz (calculada pelo backend)
        if (event.date) return new Date(event.date);
        
        // 2. Se não tiver, tenta pegar a primeira sessão da lista
        if (event.sessions && event.sessions.length > 0) {
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
                     backgroundColor: '#eee' 
                 }}>
            </div>

            <div className="event-card-content">
                {/* Badge de Data */}
                {displayDate && (
                    <div className="event-card-date-badge">
                        {displayDate}
                    </div>
                )}

                <div className="event-card-footer">
                    <h4 className="event-card-title">{event.title}</h4>
                    {event.location && <div className="event-card-location">{event.location}</div>}
                </div>
            </div>

            <div className="event-card-favorite" onClick={handleFavoriteClick}>
                <img src={isFavorited ? "/img/heartFav.png" : "/img/heart.png"} className="heart-icon" alt="Favorito" />
            </div>
        </div>
    );
}