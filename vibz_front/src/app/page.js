'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
    FaBullhorn, FaLayerGroup, FaGraduationCap, FaMusic, 
    FaTheaterMasks, FaTrophy, FaUtensils, FaChalkboardTeacher, 
    FaStar, FaLink, FaArrowRight
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
        academico: [], festas: [], teatro: [], esportes: [], gastronomia: [], cursos: []
    });

    const [loadingCategories, setLoadingCategories] = useState({
        academico: true, festas: true, teatro: true, esportes: true, gastronomia: true, cursos: true
    });

    const [activeFilters, setActiveFilters] = useState({
        academico: 'Todos', festas: 'Todos', teatro: 'Todos', esportes: 'Todos', gastronomia: 'Todos', cursos: 'Todos'
    });

    const [favoritedEventIds, setFavoritedEventIds] = useState([]);

    const academicoRef = useRef(null);
    const festasRef = useRef(null);
    const teatroRef = useRef(null);
    const esportesRef = useRef(null);
    const gastronomiaRef = useRef(null);
    const cursosRef = useRef(null);

    const getFilteredEvents = (events, filter) => {
        if (!events || events.length === 0) return [];
        if (filter === 'Todos') return events;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(today);
        endOfWeek.setDate(today.getDate() + 7);
        endOfWeek.setHours(23, 59, 59, 999);

        return events.filter(event => {
            const eventDate = new Date(event.date);
            const eventStartOfDay = new Date(eventDate);
            eventStartOfDay.setHours(0, 0, 0, 0);

            if (filter === 'Hoje') {
                return eventStartOfDay.getTime() === today.getTime();
            }
            if (filter === 'Esta semana') {
                return eventStartOfDay >= today && eventDate <= endOfWeek;
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
                    const eventDate = new Date(event.date);
                    return eventDate >= today;
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
    }, []);

    useEffect(() => {
        const checkLoginStatus = () => {
            if (typeof window !== 'undefined') {
                const userId = localStorage.getItem('userId');
                const userToken = localStorage.getItem('userToken');

                if (userId && userToken) {
                    setIsUserLoggedIn(true);
                    setCurrentUserId(userId);
                } else {
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
            const token = typeof window !== 'undefined' ? localStorage.getItem('userToken') : null;
            if (!currentUserId || !token) { setFavoritedEventIds([]); return; }
            try {
                const response = await fetch(`${API_BASE_URL}/users/${currentUserId}/favorites`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data)) {
                        setFavoritedEventIds(data.map(event => event.id || event._id));
                    }
                }
            } catch (error) { console.error("Erro favoritos:", error); }
        };

        if (currentUserId) {
            fetchFavoritedEvents();
        }
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
                        const eventDate = new Date(event.date);
                        return eventDate >= today;
                    });
                    setFeaturedEvents(validFeatured);
                }
            } catch (error) { console.error("Erro destaques:", error); }
            finally { setLoadingFeatured(false); }
        };
        fetchFeatured();
    }, []);

    const handleToggleFavorite = async (eventId, isFavoriting) => {
        const token = localStorage.getItem('userToken');
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
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ eventId })
            });

            if (response.status === 404) {
                response = await fetch(`${API_BASE_URL}/events/${eventId}/favorite`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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
        { name: 'Gastronomia', icon: <FaUtensils size={24} />, ref: gastronomiaRef, key: 'gastronomia' },
        { name: 'Cursos', icon: <FaChalkboardTeacher size={24} />, ref: cursosRef, key: 'cursos' },
        { name: 'Esportes', icon: <FaTrophy size={24} />, ref: esportesRef, key: 'esportes' }
    ];

    const categoriesToShowInNavigation = categoriesConfig.filter(cat =>
        categoryEvents[cat.key] && categoryEvents[cat.key].length > 0
    );

    const renderSection = (title, categoryKey, ref) => {
        const events = categoryEvents[categoryKey];
        const loading = loadingCategories[categoryKey];
        const activeFilter = activeFilters[categoryKey];

        if (!loading && (!events || events.length === 0)) return null;

        const filteredEvents = getFilteredEvents(events, activeFilter);

        return (
            <section className="events-section" ref={ref}>
                <h3 className="section-title">{title}</h3>
                <div className="filter-buttons">
                    {['Todos', 'Hoje', 'Esta semana', 'Grátis'].map(filter => (
                        <button key={filter} className={`filter-button ${activeFilter === filter ? 'active' : ''}`} onClick={() => handleFilterChange(categoryKey, filter)}>{filter}</button>
                    ))}
                </div>
                <div className="event-list">
                    {loading ? <p className="loading-text">Buscando os melhores eventos...</p> : filteredEvents.length > 0 ? (
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
                        <div className="no-events-container">
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

            {/* O Bloco gigante de busca foi removido daqui! */}

            {featuredEvents.length > 0 && (
                <div className="featured-carousel-container">
                    <Carousel events={featuredEvents} />
                </div>
            )}

            <div className="categories-section">
                <div className="categories-carousel-wrapper">
                    <div className="categories-list">
                        {categoriesToShowInNavigation.map((cat, index) => (
                            <div key={index} className="category-item" onClick={() => cat.ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                                <div className="category-icon">
                                    {cat.icon}
                                </div>
                                <span className="category-name">{cat.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="main-content-wrapper">
                {renderSection("Festas e Shows", 'festas', festasRef)}
                {renderSection("Teatro e Cultura", 'teatro', teatroRef)}
                {renderSection("Acadêmico / Congresso", 'academico', academicoRef)}
                {renderSection("Esportes e Lazer", 'esportes', esportesRef)}
                {renderSection("Gastronomia", 'gastronomia', gastronomiaRef)}
                {renderSection("Cursos e Workshops", 'cursos', cursosRef)}
            </div>

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
                                <div className="mkt-list-icon"><FaBullhorn /></div>
                                <div className="mkt-list-content">
                                    <strong>Visibilidade Estratégica</strong>
                                    <span>Apareça para quem realmente quer sair de casa.</span>
                                </div>
                            </div>
                            <div className="mkt-list-item">
                                <div className="mkt-list-icon"><FaStar /></div>
                                <div className="mkt-list-content">
                                    <strong>Curadoria e Destaque</strong>
                                    <span>Ganhe o selo Vibz e esgote seus ingressos mais rápido.</span>
                                </div>
                            </div>
                            <div className="mkt-list-item">
                                <div className="mkt-list-icon"><FaLink /></div>
                                <div className="mkt-list-content">
                                    <strong>Tráfego Direto</strong>
                                    <span>Levamos o cliente pronto para comprar no seu site oficial.</span>
                                </div>
                            </div>
                        </div>

                        <div className="mkt-premium-cta">
                            <button className="btn-premium-glow" onClick={() => window.open("https://www.instagram.com/vibzeventos/", "_blank")}>
                                Divulgar Meu Evento <FaArrowRight />
                            </button>
                        </div>
                    </div>
                    <div className="mkt-premium-visual">
                        <div className="glow-effect"></div>
                        <Image 
                            src="/img/mockup.png" 
                            alt="App Vibz" 
                            width={360} 
                            height={720} 
                            className="mkt-mockup-img" 
                            style={{ width: '100%', height: 'auto', maxWidth: '360px' }} 
                        />
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}