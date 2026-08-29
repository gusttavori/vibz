'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
    FaBullhorn, FaLayerGroup, FaGraduationCap, FaMusic, 
    FaTheaterMasks, FaTrophy, FaUtensils, FaChalkboardTeacher, 
    FaStar, FaLink, FaArrowRight, FaDove, FaGlassCheers,
    FaClock, FaChevronDown, FaChevronUp, FaMapMarkerAlt
} from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast';

import Header from '@/components/Header';
import Carousel from '@/components/Carousel';
import EventCard from '@/components/EventCard';
import Footer from '@/components/Footer';

import './Home.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function Home() {
    const router = useRouter();

    const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);

    const [featuredEvents, setFeaturedEvents] = useState([]);
    const [loadingFeatured, setLoadingFeatured] = useState(true);

    const [categoryEvents, setCategoryEvents] = useState({
        academico: [], festas: [], teatro: [], esportes: [], gastronomia: [], cursos: [], religioso: [], bares: []
    });

    const [loadingCategories, setLoadingCategories] = useState({
        academico: true, festas: true, teatro: true, esportes: true, gastronomia: true, cursos: true, religioso: true, bares: true
    });

    const [activeFilters, setActiveFilters] = useState({
        academico: 'Todos', festas: 'Todos', teatro: 'Todos', esportes: 'Todos', gastronomia: 'Todos', cursos: 'Todos', religioso: 'Todos', bares: 'Todos'
    });

    const [favoritedEventIds, setFavoritedEventIds] = useState([]);

    const [selectedAgendaDate, setSelectedAgendaDate] = useState('');
    const [expandedAgendaId, setExpandedAgendaId] = useState(null);

    const academicoRef = useRef(null);
    const festasRef = useRef(null);
    const teatroRef = useRef(null);
    const esportesRef = useRef(null);
    const gastronomiaRef = useRef(null);
    const cursosRef = useRef(null);
    const religiosoRef = useRef(null); 
    const baresRef = useRef(null); 

    useEffect(() => {
        const d = new Date();
        const localISO = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        setSelectedAgendaDate(localISO);
    }, []);

    const getEventDates = (event) => {
        const dates = [];
        
        const parseSafely = (dateStr) => {
            if (!dateStr) return null;
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return null;
            return new Date(d.getTime() + d.getTimezoneOffset() * 60000);
        };

        if (event.date) dates.push(parseSafely(event.date));
        
        if (event.sessions && event.sessions.length > 0) {
            event.sessions.forEach(session => {
                if (session.date) dates.push(parseSafely(session.date));
                if (session.endDate) dates.push(parseSafely(session.endDate));
            });
        }

        if (event.tickets && event.tickets.length > 0) {
            event.tickets.forEach(ticket => {
                if (ticket.activityDate) {
                    dates.push(parseSafely(ticket.activityDate));
                }
            });
        }

        return dates.filter(d => d !== null);
    };

    const getLastEventDate = (event) => {
        const dates = getEventDates(event);
        if (dates.length === 0) return new Date();
        return new Date(Math.max(...dates.map(d => d.getTime())));
    };

    const getFilteredEvents = (events, filter) => {
        if (!events || events.length === 0) return [];
        if (filter === 'Todos') return events;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(today);
        endOfWeek.setDate(today.getDate() + 7);
        endOfWeek.setHours(23, 59, 59, 999);

        return events.filter(event => {
            const allDates = getEventDates(event);

            if (filter === 'Hoje') {
                return allDates.some(d => {
                    const startOfDay = new Date(d);
                    startOfDay.setHours(0, 0, 0, 0);
                    return startOfDay.getTime() === today.getTime();
                });
            }
            if (filter === 'Esta semana') {
                return allDates.some(d => {
                    const startOfDay = new Date(d);
                    startOfDay.setHours(0, 0, 0, 0);
                    return startOfDay >= today && startOfDay <= endOfWeek;
                });
            }
            if (filter === 'Grátis') {
                const hasFreeTicket = event.tickets && event.tickets.some(t => parseFloat(t.price) === 0);
                return event.price === 0 || event.isFree === true || hasFreeTicket;
            }
            return true;
        });
    };

    const fetchCategory = async (categoryName, key) => {
        try {
            const url = `${API_BASE_URL}/events/category/${encodeURIComponent(categoryName)}`;
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                const validEvents = data.filter(event => {
                    const lastDate = getLastEventDate(event);
                    lastDate.setHours(0, 0, 0, 0);
                    return lastDate >= today;
                });
                
                setCategoryEvents(prev => ({ ...prev, [key]: validEvents }));
            } else {
                setCategoryEvents(prev => ({ ...prev, [key]: [] }));
            }
        } catch (error) {
            console.error(`Erro ao buscar ${categoryName}:`, error);
            setCategoryEvents(prev => ({ ...prev, [key]: [] }));
        } finally {
            setLoadingCategories(prev => ({ ...prev, [key]: false }));
        }
    };

    useEffect(() => {
        fetchCategory('Acadêmico / Congresso', 'academico');
        fetchCategory('Festas e Shows', 'festas');
        fetchCategory('Teatro e Cultura', 'teatro');
        fetchCategory('Esportes', 'esportes');
        fetchCategory('Gastronomia', 'gastronomia');
        fetchCategory('Cursos e Workshops', 'cursos');
        fetchCategory('Religioso', 'religioso');
        fetchCategory('Bares e Entretenimento', 'bares'); 
    }, []);

    useEffect(() => {
        const checkLoginStatus = async () => {
            if (typeof window !== 'undefined') {
                const storedUserId = localStorage.getItem('userId');
                if (storedUserId) {
                    setIsUserLoggedIn(true);
                    setCurrentUserId(storedUserId);
                }

                try {
                    const res = await fetch(`${API_BASE_URL}/auth/me`, {
                        method: 'GET',
                        credentials: 'include' 
                    });
                    
                    if (res.ok) {
                        const data = await res.json();
                        setIsUserLoggedIn(true);
                        setCurrentUserId(data.user.id || data.user._id);
                    } else {
                        setIsUserLoggedIn(false);
                        setCurrentUserId(null);
                    }
                } catch (error) {
                    setIsUserLoggedIn(false);
                    setCurrentUserId(null);
                }
            }
        };
        
        checkLoginStatus();
        window.addEventListener('storage', checkLoginStatus);
        window.addEventListener('authChange', checkLoginStatus);
        return () => {
            window.removeEventListener('storage', checkLoginStatus);
            window.removeEventListener('authChange', checkLoginStatus);
        };
    }, []);

    useEffect(() => {
        const fetchFavoritedEvents = async () => {
            if (!currentUserId) { setFavoritedEventIds([]); return; }
            try {
                const response = await fetch(`${API_BASE_URL}/users/${currentUserId}/favorites`, {
                    credentials: 'include' 
                });
                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data)) {
                        setFavoritedEventIds(data.map(event => event.id || event._id));
                    }
                }
            } catch (error) { console.error("Erro favoritos:", error); }
        };

        fetchFavoritedEvents();
    }, [currentUserId]);

    useEffect(() => {
        const fetchFeatured = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/events/featured`);
                if (response.ok) {
                    const data = await response.json();
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    const validFeatured = data.filter(event => {
                        const lastDate = getLastEventDate(event);
                        lastDate.setHours(0, 0, 0, 0);
                        return lastDate >= today;
                    });
                    
                    setFeaturedEvents(validFeatured);
                }
            } catch (error) { console.error("Erro destaques:", error); }
            finally { setLoadingFeatured(false); }
        };
        fetchFeatured();
    }, []);

    const handleToggleFavorite = async (eventId, isFavoriting) => {
        if (!currentUserId) {
            toast.error("Faça login para favoritar.");
            router.push('/login');
            return;
        }

        setFavoritedEventIds(prev => {
            if (isFavoriting) return [...prev, eventId];
            return prev.filter(id => id !== eventId);
        });

        try {
            let response = await fetch(`${API_BASE_URL}/users/toggle-favorite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', 
                body: JSON.stringify({ eventId })
            });

            if (response.status === 404) {
                response = await fetch(`${API_BASE_URL}/events/${eventId}/favorite`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include', 
                    body: JSON.stringify({ userId: currentUserId, isFavoriting })
                });
            }

            if (!response.ok) {
                setFavoritedEventIds(prev => {
                    if (isFavoriting) return prev.filter(id => id !== eventId);
                    return [...prev, eventId];
                });
                toast.error("Erro ao atualizar favoritos.");
            } else {
                const data = await response.json();
                toast.success(data.message || (isFavoriting ? "Adicionado aos favoritos!" : "Removido dos favoritos."));
            }
        } catch (error) {
            setFavoritedEventIds(prev => {
                if (isFavoriting) return prev.filter(id => id !== eventId);
                return [...prev, eventId];
            });
            toast.error("Erro de conexão.");
        }
    };

    const handleFilterChange = (categoryKey, filterType) => {
        setActiveFilters(prev => ({ ...prev, [categoryKey]: filterType }));
    };

    const categoriesConfig = [
        { name: 'Festas e Shows', icon: <FaMusic size={24} />, ref: festasRef, key: 'festas' },
        { name: 'Teatro e Cultura', icon: <FaTheaterMasks size={24} />, ref: teatroRef, key: 'teatro' },
        { name: 'Acadêmico', icon: <FaGraduationCap size={24} />, ref: academicoRef, key: 'academico' },
        { name: 'Religioso', icon: <FaDove size={24} />, ref: religiosoRef, key: 'religioso' }, 
        { name: 'Esportes', icon: <FaTrophy size={24} />, ref: esportesRef, key: 'esportes' },
        { name: 'Gastronomia', icon: <FaUtensils size={24} />, ref: gastronomiaRef, key: 'gastronomia' },
        { name: 'Cursos', icon: <FaChalkboardTeacher size={24} />, ref: cursosRef, key: 'cursos' },
        { name: 'Bares e Entretenimento', icon: <FaGlassCheers size={24} />, ref: baresRef, key: 'bares' }
    ];

    const categoriesToShowInNavigation = categoriesConfig.filter(cat =>
        categoryEvents[cat.key] && categoryEvents[cat.key].length > 0
    );

    const renderAgendaSection = (title, categoryKey, ref) => {
        const events = categoryEvents[categoryKey] || [];
        const loading = loadingCategories[categoryKey];

        const generateAgendaDates = () => {
            const dates = [];
            const today = new Date();
            today.setHours(0,0,0,0);
            for (let i = 0; i <= 6; i++) { 
                const d = new Date(today);
                d.setDate(today.getDate() + i);
                dates.push(d);
            }
            return dates;
        };
        const agendaDates = generateAgendaDates();

        const getFormattedSelectedDate = (isoStr) => {
            if (!isoStr) return '';
            const [y, m, d] = isoStr.split('-');
            const dateObj = new Date(y, m - 1, d);
            const today = new Date();
            today.setHours(0,0,0,0);
            let prefix = "";
            if (dateObj.getTime() === today.getTime()) prefix = "Hoje, ";
            else {
                const tomorrow = new Date(today);
                tomorrow.setDate(today.getDate() + 1);
                if (dateObj.getTime() === tomorrow.getTime()) prefix = "Amanhã, ";
            }
            const options = { day: 'numeric', month: 'long', year: 'numeric' };
            let formattedStr = dateObj.toLocaleDateString('pt-BR', options);
            return `${prefix}${formattedStr}`;
        };

        const getAgendaItems = () => {
            const items = [];
            events.forEach(event => {
                const eventTitle = event.title; 
                const locationName = event.location || 'Local não informado'; 
                const image = event.imageUrl;
                
                if (event.sessions) {
                    event.sessions.forEach((session, sIdx) => {
                        if (!session.date) return;
                        
                        const d = new Date(session.date);
                        if (isNaN(d.getTime())) return;
                        
                        const sessionLocalISO = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

                        if (sessionLocalISO === selectedAgendaDate) {
                            
                            const lineupText = (session.lineup && session.lineup.length > 0)
                                ? session.lineup.map(art => art.name).join(' • ')
                                : 'Programação Normal';

                            const displayTime = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                            items.push({
                                id: `${event._id || event.id}-${sIdx}`,
                                eventId: event._id || event.id,
                                time: displayTime,
                                title: eventTitle, 
                                location: locationName, 
                                lineupText: lineupText,
                                image: image,
                                description: event.description
                            });
                        }
                    });
                }
            });
            return items.sort((a, b) => a.time.localeCompare(b.time));
        };

        const agendaItems = getAgendaItems();

        return (
            <section className="events-section" ref={ref} style={{ paddingTop: '20px' }}>
                <div style={{ maxWidth: '850px', width: '100%' }}>
                    <h3 className="section-title" style={{ marginBottom: '15px' }}>{title}</h3>
                    
                    {loading ? (
                        <p className="loading-text">Buscando a programação...</p>
                    ) : (
                        <div className="agenda-box">
                            
                            <div className="agenda-header">
                                <div className="agenda-header-title">
                                    <FaClock /> AGENDA DA NOITE
                                </div>
                                <div className="agenda-header-date">
                                    {getFormattedSelectedDate(selectedAgendaDate)}
                                </div>
                            </div>

                            <div className="agenda-days-row">
                                {agendaDates.map(d => {
                                    const localISO = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                                    const isSelected = localISO === selectedAgendaDate;
                                    const weekDay = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase();
                                    const dayNum = d.getDate();
                                    
                                    return (
                                        <button 
                                            key={localISO}
                                            onClick={() => { setSelectedAgendaDate(localISO); setExpandedAgendaId(null); }}
                                            className={`agenda-day-btn ${isSelected ? 'active' : ''}`}
                                            type="button"
                                        >
                                            <span className="agenda-day-weekday">{weekDay}</span>
                                            <span className="agenda-day-number">{dayNum}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="agenda-body">
                                {agendaItems.length === 0 ? (
                                    <div className="agenda-empty">
                                        <FaMusic size={28} style={{ marginBottom: '12px', opacity: 0.3 }} />
                                        <p style={{ margin: 0, fontSize: '0.9rem' }}>Nenhuma programação registrada para este dia ainda.</p>
                                    </div>
                                ) : (
                                    agendaItems.map(item => {
                                        const isExpanded = expandedAgendaId === item.id;
                                        return (
                                            <div key={item.id} className="agenda-item-row">
                                                <div 
                                                    className="agenda-item-header"
                                                    onClick={() => setExpandedAgendaId(isExpanded ? null : item.id)}
                                                >
                                                    <div className="agenda-item-time">
                                                        {item.time}
                                                    </div>
                                                    <div className="agenda-item-thumb">
                                                        {item.image && <img src={item.image} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                                    </div>
                                                    <div className="agenda-item-info">
                                                        <h4 className="agenda-item-title">{item.title}</h4>
                                                        <span className="agenda-item-location">
                                                            <FaMapMarkerAlt size={11}/> {item.location}
                                                        </span>
                                                    </div>
                                                    <div className="agenda-item-toggle">
                                                        {isExpanded ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
                                                    </div>
                                                </div>
                                                
                                                {isExpanded && (
                                                    <div className="agenda-expanded-area">
                                                        {item.lineupText !== 'Programação Normal' && (
                                                            <div className="agenda-lineup-box">
                                                                <span className="agenda-lineup-title">Line-up da Noite</span>
                                                                <span className="agenda-lineup-text">{item.lineupText}</span>
                                                            </div>
                                                        )}
                                                        <p className="agenda-description">{item.description}</p>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); router.push(`/evento/${item.eventId}`); }} 
                                                            className="btn-detalhes-local"
                                                        >
                                                            Ver Detalhes do Local <FaArrowRight size={12}/>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        
                        </div>
                    )}
                </div>
            </section>
        );
    };

    const renderSection = (title, categoryKey, ref) => {
        const events = categoryEvents[categoryKey];
        const loading = loadingCategories[categoryKey];
        const activeFilter = activeFilters[categoryKey];

        if (!loading && (!events || events.length === 0)) return null;

        const filteredEvents = getFilteredEvents(events, activeFilter);

        return (
            <section className="events-section" ref={ref}>
                <h3 className="section-title">{title}</h3>

                <div className="filter-buttons" role="group" aria-label={`Filtros para ${title}`}>
                    {['Todos', 'Hoje', 'Esta semana', 'Grátis'].map(filter => (
                        <button 
                            key={filter} 
                            className={`filter-button ${activeFilter === filter ? 'active' : ''}`} 
                            onClick={() => handleFilterChange(categoryKey, filter)}
                            aria-pressed={activeFilter === filter}
                        >
                            {filter}
                        </button>
                    ))}
                </div>
                
                <div className="event-list">
                    {loading ? <p className="loading-text" role="status">Buscando os melhores eventos...</p> : filteredEvents.length > 0 ? (
                        filteredEvents.map(event => (
                            <EventCard
                                key={event._id || event.id}
                                event={event}
                                isUserLoggedIn={isUserLoggedIn}
                                currentUserId={currentUserId}
                                onToggleFavorite={handleToggleFavorite}
                                isFavorited={favoritedEventIds.includes(event._id || event.id)}
                            />
                        ))
                    ) : (
                        <div className="no-events-container" role="status">
                            <p>Nenhum evento encontrado para <strong>"{activeFilter}"</strong> nesta categoria.</p>
                            <button onClick={() => handleFilterChange(categoryKey, 'Todos')} className="clear-filter-btn">Ver todos os eventos</button>
                        </div>
                    )}
                </div>
            </section>
        );
    };

    return (
        <div className="home-container">
            <Toaster position="top-center" reverseOrder={false} />
            <Header />

            {featuredEvents.length > 0 && (
                <div className="featured-carousel-container">
                    <Carousel events={featuredEvents} />
                </div>
            )}

            <div className="categories-section">
                <div className="categories-carousel-wrapper">
                    <div className="categories-list" role="navigation" aria-label="Navegação por categorias de eventos">
                        {categoriesToShowInNavigation.map((cat, index) => (
                            <div 
                                key={index} 
                                className="category-item" 
                                onClick={() => cat.ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                                role="button"
                                tabIndex="0"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        cat.ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }
                                }}
                                aria-label={`Rolar para a seção de ${cat.name}`}
                            >
                                <div className="category-icon" aria-hidden="true">
                                    {cat.icon}
                                </div>
                                <span className="category-name">{cat.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <main id="conteudo-principal" className="main-content-wrapper" tabIndex="-1">
                {renderSection("Festas e Shows", 'festas', festasRef)}
                {renderSection("Teatro e Cultura", 'teatro', teatroRef)}
                {renderSection("Acadêmico / Congresso", 'academico', academicoRef)}
                {renderSection("Religioso", 'religioso', religiosoRef)}
                {renderSection("Esportes e Lazer", 'esportes', esportesRef)}
                {renderSection("Gastronomia", 'gastronomia', gastronomiaRef)}
                {renderSection("Cursos e Workshops", 'cursos', cursosRef)}
                
                {/* Agora a seção de bares será sempre renderizada por último */}
                {renderAgendaSection("Bares e Entretenimento", 'bares', baresRef)} 
            </main>

            <div className="mkt-premium-section">
                <div className="mkt-premium-content">
                    <div className="mkt-premium-text">
                        <span className="mkt-premium-badge">Para Produtores</span>
                        <h2 className="mkt-premium-title">A vitrine perfeita para o seu evento.</h2>
                        <p className="mkt-premium-subtitle">
                            Conecte-se com milhares de pessoas que buscam experiências na região. A Vibz é a ponte direta para o seu público.
                        </p>

                        <div className="mkt-premium-list">
                            <div className="mkt-list-item">
                                <div className="mkt-list-icon" aria-hidden="true"><FaBullhorn /></div>
                                <div className="mkt-list-content">
                                    <strong>Visibilidade Estratégica</strong>
                                    <span>Apareça para quem realmente quer sair de casa.</span>
                                </div>
                            </div>
                            <div className="mkt-list-item">
                                <div className="mkt-list-icon" aria-hidden="true"><FaStar /></div>
                                <div className="mkt-list-content">
                                    <strong>Curadoria e Destaque</strong>
                                    <span>Ganhe o selo Vibz e esgote seus ingressos mais rápido.</span>
                                </div>
                            </div>
                            <div className="mkt-list-item">
                                <div className="mkt-list-icon" aria-hidden="true"><FaLink /></div>
                                <div className="mkt-list-content">
                                    <strong>Tráfego Direto</strong>
                                    <span>Levamos o cliente pronto para comprar no seu site oficial.</span>
                                </div>
                            </div>
                        </div>

                        <div className="mkt-premium-cta">
                            <button 
                                className="btn-premium-glow" 
                                onClick={() => window.open("https://www.instagram.com/vibzeventos/", "_blank")}
                                aria-label="Abrir Instagram da Vibz Eventos em nova aba"
                            >
                                Divulgar Meu Evento <FaArrowRight aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                    <div className="mkt-premium-visual" aria-hidden="true">
                        <div className="glow-effect"></div>
                        <Image 
                            src="/img/mockup.png" 
                            alt="" 
                            width={360} 
                            height={720} 
                            className="mkt-mockup-img" 
                            style={{ width: '100%', height: 'auto', maxWidth: '360px', width: 'auto' }}
                        />
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}