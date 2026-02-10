'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { FaHeart, FaRegHeart, FaMapMarkerAlt } from 'react-icons/fa';
import './EventCard.css';

export default function EventCard({ event, isUserLoggedIn, onToggleFavorite, isFavorited }) {
    const router = useRouter();

    const handleCardClick = () => {
        // Suporta tanto id (SQL) quanto _id (NoSQL/Legado)
        const eventId = event.id || event._id;
        router.push(`/evento/${eventId}`);
    };

    const handleFavoriteClick = (e) => {
        e.stopPropagation(); // Impede que o clique abra os detalhes do evento

        if (isUserLoggedIn) {
            // Chama a função passada pelo componente pai (Home ou UserProfile)
            const eventId = event.id || event._id;
            onToggleFavorite(eventId, !isFavorited);
        } else {
            // Redireciona para login se não estiver logado
            if (confirm("Você precisa fazer login para favoritar eventos. Deseja ir para o login agora?")) {
                router.push('/login');
            }
        }
    };

    // --- LÓGICA DE DATA ROBUSTA ---
    const getDisplayDate = () => {
        // 1. Tenta pegar a data raiz
        if (event.date || event.eventDate) {
            return new Date(event.date || event.eventDate);
        }
        
        // 2. Se não tiver, tenta pegar a primeira sessão da lista
        if (event.sessions && Array.isArray(event.sessions) && event.sessions.length > 0) {
            // Ordena sessões para pegar a mais próxima
            const sorted = [...event.sessions].sort((a,b) => new Date(a.date) - new Date(b.date));
            return new Date(sorted[0].date);
        }
        return null;
    };

    const formatDate = () => {
        const date = getDisplayDate();
        if (!date || isNaN(date.getTime())) return null;

        const day = date.getDate().toString().padStart(2, '0');
        // Meses abreviados em Português
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
                 
                 {/* Badge de Data Flutuante */}
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
                    {/* Localização */}
                    {(event.location || event.city) && (
                        <div className="event-card-location">
                            <FaMapMarkerAlt className="location-icon" />
                            <span>{event.city || event.location}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Botão de Favoritar */}
            <button 
                className={`event-card-favorite ${isFavorited ? 'active' : ''}`} 
                onClick={handleFavoriteClick}
                title={isFavorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            >
                {isFavorited ? <FaHeart /> : <FaRegHeart />}
            </button>
        </div>
    );
}