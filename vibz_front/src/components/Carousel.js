'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
              style={{ backgroundImage: `url(${event.imageUrl})` }}
              onClick={() => handleSlideClick(event._id)}
            >
              <div className="hero-overlay"></div>

              <div className="hero-content-wrapper">
                <div className="hero-glass-card">
                  
                  {/* 1. Título e Localização no topo */}
                  <div className="hero-info-top">
                    <h2 className="hero-title">{event.title}</h2>
                    <div className="hero-meta">
                      <span><FaMapMarkerAlt size={12}/> {event.location || event.city}</span>
                      {event.category && <span>• {event.category}</span>}
                    </div>
                  </div>

                  {/* 2. Rodapé do Card: Data + Botão na mesma linha */}
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
          <button className="hero-nav prev" onClick={(e) => { e.stopPropagation(); prevSlide(); }}>
            <FaChevronLeft />
          </button>
          <button className="hero-nav next" onClick={(e) => { e.stopPropagation(); nextSlide(); }}>
            <FaChevronRight />
          </button>

          <div className="hero-indicators">
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