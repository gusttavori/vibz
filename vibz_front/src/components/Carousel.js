'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { FaChevronLeft, FaChevronRight, FaTicketAlt, FaMapMarkerAlt } from 'react-icons/fa';
import './Carousel.css';

const Carousel = ({ events = [] }) => {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % events.length);
  }, [events.length]);

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? events.length - 1 : prev - 1));
  };

  useEffect(() => {
    if (events.length <= 1 || isPaused) return;
    const interval = setInterval(nextSlide, 5000); 
    return () => clearInterval(interval);
  }, [events.length, isPaused, nextSlide]);

  const handleSlideClick = (eventId) => {
    router.push(`/evento/${eventId}`);
  };

  const getDateParts = (dateString) => {
    const date = new Date(dateString);
    return {
      day: date.getDate().toString().padStart(2, '0'),
      month: date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()
    };
  };

  if (!events || events.length === 0) return null;

  return (
    <div 
      className="hero-carousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="carousel-track">
        {events.map((event, index) => {
          const isActive = index === currentSlide;
          const { day, month } = getDateParts(event.date);

          return (
            <div 
              key={event._id || index}
              className={`hero-slide ${isActive ? 'active' : ''}`}
              onClick={() => handleSlideClick(event._id)}
              /* REMOVIDO: O position relative que estava quebrando o layout */
            >
              {/* Imagem Otimizada (Next.js) */}
              {event.imageUrl && (
                <Image 
                  src={event.imageUrl}
                  alt={event.title || "Evento em destaque"}
                  fill
                  style={{ objectFit: 'cover' }}
                  priority={index === 0} 
                />
              )}

              {/* Overlay Escuro */}
              <div className="hero-overlay" style={{ zIndex: 1 }}></div>

              <div className="hero-content-wrapper" style={{ zIndex: 2 }}>
                <div className="hero-glass-card">
                  
                  <div className="hero-info-top">
                    <h2 className="hero-title">{event.title}</h2>
                    <div className="hero-meta">
                      <span><FaMapMarkerAlt size={12}/> {event.location || event.city}</span>
                      {event.category && <span>• {event.category}</span>}
                    </div>
                  </div>

                  <div className="hero-card-footer">
                    <div className="hero-date-badge">
                      <span className="hero-day">{day}</span>
                      <span className="hero-month">{month}</span>
                    </div>
                    
                    <button className="hero-cta-btn">
                      <FaTicketAlt /> Garantir Ingressos
                    </button>
                  </div>

                </div>
              </div>
            </div>
          );
        })}
      </div>

      {events.length > 1 && (
        <>
          <button className="hero-nav prev" onClick={(e) => { e.stopPropagation(); prevSlide(); }} style={{ zIndex: 3 }}>
            <FaChevronLeft />
          </button>
          <button className="hero-nav next" onClick={(e) => { e.stopPropagation(); nextSlide(); }} style={{ zIndex: 3 }}>
            <FaChevronRight />
          </button>

          <div className="hero-indicators" style={{ zIndex: 3 }}>
            {events.map((_, index) => (
              <span
                key={index}
                className={`hero-dot-indicator ${index === currentSlide ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); setCurrentSlide(index); }}
              ></span>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Carousel;