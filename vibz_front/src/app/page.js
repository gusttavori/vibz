'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FaMagic, FaBullhorn, FaMoneyBillWave, FaArrowRight, FaSearch, FaTimes, FaLayerGroup } from 'react-icons/fa'; 
import toast, { Toaster } from 'react-hot-toast'; 

import Header from '@/components/Header';
import Carousel from '@/components/Carousel';
import EventCard from '@/components/EventCard';
import Footer from '@/components/Footer'; 

import './Home.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Lista de categorias para sugestão no autocomplete
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
    const [matchedCategory, setMatchedCategory] = useState(null); // Nova categoria sugerida
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

    // --- AUTOCOMPLETE COM LOGICA DE CATEGORIA ---
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchTerm.length >= 1) { 
                try {
                    // 1. Verifica se o termo bate com o nome de uma categoria
                    const catFound = SYSTEM_CATEGORIES.find(cat => 
                        cat.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                    setMatchedCategory(catFound || null);

                    // 2. Busca eventos no servidor
                    const params = new URLSearchParams();
                    params.append('query', searchTerm);
                    if (selectedCity) params.append('city', selectedCity);
                    
                    const response = await fetch(`${API_BASE_URL}/events/search?${params.toString()}`);
                    if (response.ok) {
                        const data = await response.json();
                        setSuggestions(data.slice(0, 5)); 
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
        router.push(`/categoria/${encodeURIComponent(catName)}`);
        setShowSuggestions(false);
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

    const handleMktCreateEvent = () => {
        if (isUserLoggedIn) {
            router.push('/admin/new');
        } else {
            toast.error("Você precisa estar logado para criar um evento.");
            setTimeout(() => {
                router.push('/login');
            }, 1500);
        }
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
                setCategoryEvents(prev => ({ ...prev, [key]: data }));
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

    // --- LOGIN & FAVORITOS ---
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
                // Chama endpoint que retorna os IDs ou a lista completa
                const response = await fetch(`${API_BASE_URL}/users/${currentUserId}/favorites`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data)) {
                        // Garante que pegamos o ID correto, seja _id ou id
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
                if (response.ok) setFeaturedEvents(await response.json());
            } catch (error) { console.error("Erro destaques:", error); }
            finally { setLoadingFeatured(false); }
        };
        fetchFeatured();
    }, []);

    // --- FUNÇÃO FAVORITAR CORRIGIDA ---
    const handleToggleFavorite = async (eventId, isFavoriting) => {
        const token = localStorage.getItem('userToken');
        if (!currentUserId) { 
            toast.error("Faça login para favoritar.");
            router.push('/login'); 
            return; 
        }

        // Atualização Otimista (Muda na tela antes de confirmar no servidor)
        setFavoritedEventIds(prev => {
            if (isFavoriting) {
                return [...prev, eventId];
            } else {
                return prev.filter(id => id !== eventId);
            }
        });

        try {
            // Tenta a rota de toggle (mais moderna)
            let response = await fetch(`${API_BASE_URL}/users/toggle-favorite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ eventId })
            });

            // Se a rota toggle não existir (404), tenta a rota antiga
            if (response.status === 404) {
                 response = await fetch(`${API_BASE_URL}/events/${eventId}/favorite`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ userId: currentUserId, isFavoriting })
                });
            }

            if (!response.ok) {
                // Se der erro, reverte a mudança visual
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
            console.error('Erro favorito:', error);
            // Reverte em caso de erro de rede
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
        { name: 'Acadêmico', icon: '/img/academic.png', ref: academicoRef, key: 'academico' },
        { name: 'Festas e Shows', icon: '/img/music.svg', ref: festasRef, key: 'festas' },
        { name: 'Teatro', icon: '/img/theater.svg', ref: teatroRef, key: 'teatro' },
        { name: 'Esportes', icon: '/img/sports.svg', ref: esportesRef, key: 'esportes' },
        { name: 'Gastronomia', icon: '/img/kids.svg', ref: gastronomiaRef, key: 'gastronomia' },
        { name: 'Cursos', icon: '/img/theater.svg', ref: cursosRef, key: 'cursos' }
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
                    {loading ? <p>Carregando...</p> : filteredEvents.length > 0 ? (
                        filteredEvents.map(event => (
                            <EventCard 
                                key={event._id || event.id} // Garante chave única
                                event={event} 
                                isUserLoggedIn={isUserLoggedIn} 
                                currentUserId={currentUserId} 
                                onToggleFavorite={handleToggleFavorite} 
                                isFavorited={favoritedEventIds.includes(event._id || event.id)} // Verifica ID corretamente
                            />
                        ))
                    ) : (
                        <div className="no-events-container" style={{ width: '100%', padding: '30px', textAlign: 'center', backgroundColor: '#f9f9f9', borderRadius: '12px' }}>
                            <p style={{ color: '#666', fontSize: '1rem', margin: 0 }}>
                                Nenhum evento encontrado para <strong>"{activeFilter}"</strong> nesta categoria.
                            </p>
                            <button onClick={() => handleFilterChange(categoryKey, 'Todos')} style={{ marginTop: '10px', background: 'none', border: 'none', color: '#4C01B5', cursor: 'pointer', textDecoration: 'underline', fontWeight: '600' }}>Ver todos os eventos</button>
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

            {/* Barra de Busca */}
            <div className="search-bar-container">
                <div className="search-outer-border-wrapper" ref={searchWrapperRef}>
                    <button className="location-button-styled" onClick={() => setShowCityMenu(!showCityMenu)}>
                        <svg className="location-icon-styled" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" />
                        </svg>
                        {selectedCity && <span className="selected-city-text">{selectedCity}</span>}
                        {selectedCity && (
                            <div className="clear-icon-wrapper" onClick={handleClearCity} title="Limpar localização">
                                <FaTimes size={12} />
                            </div>
                        )}
                    </button>
                    
                    <div className="input-wrapper-relative" style={{ flexGrow: 1, position: 'relative', height: '100%' }}>
                        <input 
                            type="text" 
                            placeholder="Busque por eventos ou categorias (ex: Teatro)" 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            onFocus={() => { if(suggestions.length > 0) setShowSuggestions(true); }}
                            className="search-input-field" 
                        />
                        {searchTerm && (
                            <button className="clear-search-btn" onClick={handleClearSearch} title="Limpar pesquisa">
                                <FaTimes size={14} color="#999" />
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
                            )) : <div className="city-dropdown-item">Carregando...</div>}
                        </div>
                    )}

                    {showSuggestions && (suggestions.length > 0 || matchedCategory) && (
                        <div className="suggestions-dropdown">
                            {/* Sugestão de Categoria */}
                            {matchedCategory && (
                                <div className="suggestion-item category-highlight" onClick={() => handleCategorySuggestionClick(matchedCategory)}>
                                    <div className="suggestion-icon"><FaLayerGroup color="#4C01B5" /></div>
                                    <div className="suggestion-info">
                                        <span className="suggestion-title">Ver todos em <strong>{matchedCategory}</strong></span>
                                        <span className="suggestion-date">Explorar categoria completa</span>
                                    </div>
                                    <FaArrowRight size={12} color="#4C01B5" />
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
                                    <img src={cat.icon} alt={cat.name} />
                                </div>
                                <span className="category-name">{cat.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {renderSection("Acadêmico / Congresso", 'academico', academicoRef)}
            {renderSection("Festas e Shows", 'festas', festasRef)}
            {renderSection("Teatro e Cultura", 'teatro', teatroRef)}
            {renderSection("Esportes e Lazer", 'esportes', esportesRef)}
            {renderSection("Gastronomia", 'gastronomia', gastronomiaRef)}
            {renderSection("Cursos e Workshops", 'cursos', cursosRef)}

            <div className="mkt-container-modern">
                <div className="mkt-content-modern">
                    <div className="mkt-text-modern">
                        <h2>Publique e venda seus eventos na Vibz</h2>
                        <p className="mkt-subtitle">
                            A plataforma completa para você gerenciar seus eventos, vender ingressos e acompanhar resultados em tempo real.
                        </p>
                        <div className="mkt-features-grid">
                            <div className="feature-card">
                                <div className="feature-icon-wrapper"><FaMagic className="feature-icon" /></div>
                                <div><h4>Crie em minutos</h4><p>Cadastro simples e intuitivo. Seu evento no ar instantaneamente.</p></div>
                            </div>
                            <div className="feature-card">
                                <div className="feature-icon-wrapper"><FaBullhorn className="feature-icon" /></div>
                                <div><h4>Divulgue fácil</h4><p>Ferramentas de marketing integradas para alcançar mais público.</p></div>
                            </div>
                            <div className="feature-card">
                                <div className="feature-icon-wrapper"><FaMoneyBillWave className="feature-icon" /></div>
                                <div><h4>Venda segura</h4><p>Receba pagamentos com segurança e saque direto na sua conta.</p></div>
                            </div>
                        </div>
                        <div className="mkt-cta-group">
                            <button className="btn-primary-mkt" onClick={handleMktCreateEvent}>
                                Criar meu evento <FaArrowRight />
                            </button>
                            <button className="btn-secondary-mkt" onClick={() => window.open("https://www.instagram.com/vibzeventos/", "_blank")}>Saiba mais</button>
                        </div>
                    </div>
                    <div className="mkt-image-modern">
                        <img src="/img/mockup.png" alt="Dashboard Vibz no celular" />
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}