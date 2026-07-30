'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import './Header.css';
import { 
    FaPlus, FaSignOutAlt, FaCalendarPlus, FaUserCog, FaSearch, 
    FaMapMarkerAlt, FaTimes, FaLayerGroup 
} from 'react-icons/fa';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const SYSTEM_CATEGORIES = [
    'Acadêmico / Congresso', 'Festas e Shows', 'Teatro e Cultura',
    'Esportes', 'Gastronomia', 'Cursos e Workshops'
];

export default function Header() {
    const router = useRouter();
    
    // Estados do Usuário
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    // Estados da Busca
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [matchedCategory, setMatchedCategory] = useState(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    
    // Estados de Cidade
    const [showCityMenu, setShowCityMenu] = useState(false);
    const [cities, setCities] = useState([]);
    const [selectedCity, setSelectedCity] = useState('');
    const searchWrapperRef = useRef(null);

    // --- AUTENTICAÇÃO ---
    useEffect(() => {
        const checkLogin = () => {
            const token = localStorage.getItem('userToken');
            const storedName = localStorage.getItem('userName');
            if (token) {
                setIsLoggedIn(true);
                setUser({ name: storedName || 'Curador' });
            } else {
                setIsLoggedIn(false);
                setUser(null);
            }
        };
        checkLogin();
        window.addEventListener('storage', checkLogin);
        return () => window.removeEventListener('storage', checkLogin);
    }, []);

    // --- BUSCA DE CIDADES ---
    useEffect(() => {
        const fetchCities = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/events/cities`);
                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data)) {
                        const uniqueCitiesMap = new Map();
                        data.forEach(city => {
                            if (typeof city === 'string' && city.trim() !== '') {
                                const cleanCity = city.trim(); 
                                const lowerCity = cleanCity.toLowerCase(); 
                                if (!uniqueCitiesMap.has(lowerCity)) {
                                    uniqueCitiesMap.set(lowerCity, cleanCity);
                                }
                            }
                        });
                        setCities(Array.from(uniqueCitiesMap.values()));
                    }
                }
            } catch (error) { console.error("Erro cidades:", error); }
        };
        fetchCities();
    }, []);

    // --- AUTOCOMPLETE DA BUSCA ---
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

    // --- CLIQUES FORA (FECHAR MENUS E BUSCA) ---
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
            if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target)) {
                setShowSuggestions(false);
                setShowCityMenu(false);
                if (searchTerm === '') {
                    setIsSearchOpen(false);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [searchTerm]);

    // --- HANDLERS ---
    const handleLogout = () => {
        localStorage.clear();
        setIsLoggedIn(false);
        setUser(null);
        setShowDropdown(false);
        router.push('/');
    };

    const handleSuggestionClick = (eventId) => {
        router.push(`/evento/${eventId}`);
        setShowSuggestions(false);
        setIsSearchOpen(false);
        setSearchTerm('');
    };

    const handleCategorySuggestionClick = (catName) => {
        setShowSuggestions(false);
        setSearchTerm('');
        setIsSearchOpen(false);
        router.push(`/?category=${encodeURIComponent(catName)}`);
    };

    return (
        <header className="vibz-header-full">
            <nav className="vibz-header-container">
                
                {/* LOGO (Na esquerda) */}
                <Link href="/" className="vibz-logo-area">
                    <img src="/img/vibe_site.png" alt="Vibz Logo" />
                </Link>

                {/* CONTAINER DIREITO (Agrupa Ações + Busca) */}
                <div className="vibz-right-area">
                    
                    {/* AÇÕES (Empurradas pra esquerda quando a busca expande) */}
                    <div className={`vibz-actions ${isSearchOpen ? 'hide-on-mobile' : ''}`}>
                        {isLoggedIn && (
                            <>
                                <Link href="/admin/new" className="vibz-btn-new-event">
                                    <FaPlus className="icon-plus" />
                                    <span>Novo Evento</span>
                                </Link>

                                <div className="vibz-user-capsule" ref={dropdownRef}>
                                    <button
                                        className={`vibz-avatar-btn ${showDropdown ? 'active' : ''}`}
                                        onClick={() => setShowDropdown(!showDropdown)}
                                        aria-label="Menu"
                                    >
                                        <FaUserCog size={16} />
                                    </button>

                                    <div className={`vibz-dropdown ${showDropdown ? 'show' : ''}`}>
                                        <div className="dropdown-user-info">
                                            <span className="greeting">Olá,</span>
                                            <strong>{user?.name?.split(' ')[0]}</strong>
                                        </div>
                                        <div className="dropdown-divider"></div>
                                        <button className="dropdown-item" onClick={() => router.push('/dashboard')}>
                                            <FaCalendarPlus /> Agenda
                                        </button>
                                        <button className="dropdown-item logout" onClick={handleLogout}>
                                            <FaSignOutAlt /> Sair
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* ÁREA DE BUSCA (No extremo direito) */}
                    <div className={`vibz-search-container ${isSearchOpen ? 'open' : ''}`} ref={searchWrapperRef}>
                        {!isSearchOpen ? (
                            <button className="vibz-search-toggle-btn" onClick={() => setIsSearchOpen(true)}>
                                <FaSearch size={16} />
                            </button>
                        ) : (
                            <div className="vibz-search-expanded">
                                <button className="location-btn" onClick={() => setShowCityMenu(!showCityMenu)}>
                                    <FaMapMarkerAlt size={14} />
                                    <span className="city-text">{selectedCity || 'Todas as cidades'}</span>
                                    {selectedCity && (
                                        <div className="clear-city" onClick={(e) => { e.stopPropagation(); setSelectedCity(''); setShowCityMenu(false); }}>
                                            <FaTimes size={10} />
                                        </div>
                                    )}
                                </button>

                                <input
                                    type="text"
                                    placeholder="Busque festas, shows..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                                    className="search-input"
                                    autoFocus
                                />

                                <button className="close-search-btn" onClick={() => { setIsSearchOpen(false); setSearchTerm(''); }}>
                                    <FaTimes size={14} />
                                </button>

                                {/* DROPDOWN DE CIDADES */}
                                {showCityMenu && (
                                    <div className="header-dropdown-menu city-dropdown">
                                        <div className="dropdown-item" onClick={() => { setSelectedCity(''); setShowCityMenu(false); }}>
                                            <strong>Todas as cidades</strong>
                                        </div>
                                        {cities.length > 0 ? cities.map((city, idx) => (
                                            <div key={idx} className="dropdown-item" onClick={() => { setSelectedCity(city); setShowCityMenu(false); }}>
                                                {city}
                                            </div>
                                        )) : <div className="dropdown-item">Carregando locais...</div>}
                                    </div>
                                )}

                                {/* DROPDOWN DE SUGESTÕES (AUTOCOMPLETE) */}
                                {showSuggestions && (suggestions.length > 0 || matchedCategory) && (
                                    <div className="header-dropdown-menu suggestions-dropdown">
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
                                                <Image 
                                                    src={event.imageUrl || 'https://placehold.co/40x40/png'} 
                                                    alt={event.title} 
                                                    width={36} height={36} 
                                                    className="suggestion-image" 
                                                />
                                                <div className="suggestion-info">
                                                    <span className="suggestion-title">{event.title}</span>
                                                    <span className="suggestion-date">{new Date(event.date).toLocaleDateString('pt-BR')} • {event.city}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                </div>
            </nav>
        </header>
    );
}