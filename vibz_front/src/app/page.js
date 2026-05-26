'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    FaBullhorn, FaSearch, FaTimes, FaLayerGroup,
    FaGraduationCap, FaMusic, FaTheaterMasks, FaTrophy, 
    FaUtensils, FaChalkboardTeacher, FaStar, FaLink, FaArrowRight, FaMapMarkerAlt
} from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast';

import Header from '@/components/Header';
import Carousel from '@/components/Carousel';
import EventCard from '@/components/EventCard';
import Footer from '@/components/Footer';

import './Home.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const SYSTEM_CATEGORIES = [
    'Acadêmico / Congresso', 'Festas e Shows', 'Teatro e Cultura',
    'Esportes', 'Gastronomia', 'Cursos e Workshops'
];

export default function Home() {
    const router = useRouter();

    const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);

    const [showCityMenu, setShowCityMenu] = useState(false);
    const [cities, setCities] = useState([]);
    const [selectedCity, setSelectedCity] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [matchedCategory, setMatchedCategory] = useState(null);
    const [showSuggestions, setShowSuggestions] = useState(false);

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

    const searchWrapperRef = useRef(null);

    const academicoRef = useRef(null);
    const festasRef = useRef(null);
    const teatroRef = useRef(null);
    const esportesRef = useRef(null);
    const gastronomiaRef = useRef(null);
    const cursosRef = useRef(null);

    // --- AUTOCOMPLETE ---
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchTerm.length >= 1) {
                try {
                    const catFound = SYSTEM_CATEGORIES.find(cat =>
                        cat.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                    setMatchedCategory(catFound || null);

                    const params = new URLSearchParams();
                    params.append('query', searchTerm);
                    if (selectedCity) params.append('city', selectedCity);

                    const response = await fetch(`${API_BASE_URL}/events/search?${params.toString()}`);
                    if (response.ok) {
                        const data = await response.json();
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const validSuggestions = data.filter(event => {
                            const eventDate = new Date(event.date);
                            return eventDate >= today;
                        });

                        setSuggestions(validSuggestions.slice(0, 5));
                        setShowSuggestions(true);
                    }
                } catch (error) {
                    console.error("Erro no autocomplete:", error);
                }
            } else {
                setSuggestions([]);
                setMatchedCategory(null);
                setShowSuggestions(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, selectedCity]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSuggestionClick = (eventId) => {
        router.push(`/evento/${eventId}`);
        setShowSuggestions(false);
    };

    const handleCategorySuggestionClick = (catName) => {
        setShowSuggestions(false);
        setSearchTerm('');

        let targetRef = null;
        if (catName === 'Acadêmico / Congresso') targetRef = academicoRef;
        else if (catName === 'Festas e Shows') targetRef = festasRef;
        else if (catName === 'Teatro e Cultura') targetRef = teatroRef;
        else if (catName === 'Esportes') targetRef = esportesRef;
        else if (catName === 'Gastronomia') targetRef = gastronomiaRef;
        else if (catName === 'Cursos e Workshops') targetRef = cursosRef;

        if (targetRef && targetRef.current) {
            setTimeout(() => {
                const yOffset = -80; 
                const y = targetRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
                window.scrollTo({ top: y, behavior: 'smooth' });
            }, 100);
        }
    };

    const handleClearCity = (e) => {
        e.stopPropagation();
        setSelectedCity('');
        setShowCityMenu(false);
    };

    const handleClearSearch = () => {
        setSearchTerm('');
        setSuggestions([]);
        setMatchedCategory(null);
        setShowSuggestions(false);
    };

    const getFilteredEvents = (events, filter) => {
        if (!events || events.length === 0) return [];

        let filteredByCity = events;
        if (selectedCity) {
            filteredByCity = events.filter(event => {
                const eventCity = event.address?.city || event.city || event.location || "";
                return eventCity.toLowerCase().includes(selectedCity.toLowerCase());
            });
        }

        if (filter === 'Todos') return filteredByCity;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(today);
        endOfWeek.setDate(today.getDate() + 7);
        endOfWeek.setHours(23, 59, 59, 999);

        return filteredByCity.filter(event => {
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
        const fetchCities = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/events/cities`);
                if (response.ok) setCities(await response.json());
            } catch (error) { console.error("Erro cidades:", error); }
        };
        fetchCities();
    }, []);

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

            <div className="search-bar-container">
                <div className="search-outer-border-wrapper" ref={searchWrapperRef}>
                    <button className="location-button-styled" onClick={() => setShowCityMenu(!showCityMenu)}>
                        <FaMapMarkerAlt size={16} />
                        {selectedCity ? <span className="selected-city-text">{selectedCity}</span> : <span className="selected-city-text">Todas as cidades</span>}
                        {selectedCity && (
                            <div className="clear-icon-wrapper" onClick={handleClearCity} title="Limpar localização">
                                <FaTimes size={12} />
                            </div>
                        )}
                    </button>

                    <div className="input-wrapper-relative">
                        <input
                            type="text"
                            placeholder="Busque por eventos, artistas ou categorias"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                            className="search-input-field"
                        />
                        {searchTerm ? (
                            <button className="clear-search-btn" onClick={handleClearSearch} title="Limpar pesquisa">
                                <FaTimes size={14} color="#94a3b8" />
                            </button>
                        ) : (
                            <button className="search-button-styled">
                                <FaSearch size={14} />
                            </button>
                        )}
                    </div>

                    {showCityMenu && (
                        <div className="city-dropdown-menu">
                            <div className="city-dropdown-item" onClick={() => { setSelectedCity(''); setShowCityMenu(false); }}>
                                <strong>Todas as cidades</strong>
                            </div>
                            {cities.length > 0 ? cities.map((city, idx) => (
                                <div key={idx} className="city-dropdown-item" onClick={() => { setSelectedCity(city); setShowCityMenu(false); }}>{city}</div>
                            )) : <div className="city-dropdown-item">Carregando locais...</div>}
                        </div>
                    )}

                    {showSuggestions && (suggestions.length > 0 || matchedCategory) && (
                        <div className="suggestions-dropdown">
                            {matchedCategory && (
                                <div className="suggestion-item category-highlight" onClick={() => handleCategorySuggestionClick(matchedCategory)}>
                                    <div className="suggestion-icon"><FaLayerGroup color="#4C01B5" /></div>
                                    <div className="suggestion-info">
                                        <span className="suggestion-title">Ver tudo em <strong>{matchedCategory}</strong></span>
                                        <span className="suggestion-date">Explorar categoria completa</span>
                                    </div>
                                </div>
                            )}

                            {suggestions.map((event) => (
                                <div key={event._id || event.id} className="suggestion-item" onClick={() => handleSuggestionClick(event._id || event.id)}>
                                    <img src={event.imageUrl || 'https://placehold.co/40x40'} alt="" className="suggestion-image" />
                                    <div className="suggestion-info">
                                        <span className="suggestion-title">{event.title}</span>
                                        <span className="suggestion-date">{new Date(event.date).toLocaleDateString('pt-BR')} • {event.city}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

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

            {/* SEÇÃO MARKETING REFORMULADA (Foco em Produtores - Design Premium) */}
            <div className="mkt-premium-section">
                <div className="mkt-premium-content">
                    <div className="mkt-premium-text">
                        <span className="mkt-premium-badge">Para Produtores</span>
                        <h2 className="mkt-premium-title">A vitrine perfeita para o seu evento.</h2>
                        <p className="mkt-premium-subtitle">
                            Conecte-se com milhares de pessoas que buscam experiências em Vitória da Conquista e região. A Vibz é a ponte direta para o seu público.
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
                        <img src="/img/mockup.png" alt="App Vibz" className="mkt-mockup-img" />
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}