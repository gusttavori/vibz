'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import './Header.css';
import { 
    FaSignOutAlt, FaCalendarPlus, FaUserCog, FaSearch, 
    FaMapMarkerAlt, FaTimes, FaLayerGroup, FaTicketAlt, FaUser 
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
        <header className="vibz-header-full" role="banner">
        <a href="#conteudo-principal" className="skip-to-content">Pular para o conteúdo principal</a>
            <nav className="vibz-header-container" role="navigation" aria-label="Navegação principal">
                
                {/* LOGO (Na esquerda) */}
                <Link href="/" className="vibz-logo-area" aria-label="Voltar para a página inicial da Vibz">
                    <img src="/img/vibe_site.png" alt="Logotipo da Vibz" />
                </Link>

                {/* CONTAINER DIREITO (Agrupa Ações + Busca) */}
                <div className="vibz-right-area">
                    
                    {/* AÇÕES */}
                    <div className={`vibz-actions ${isSearchOpen ? 'hide-on-mobile' : ''}`}>
                        {isLoggedIn ? (
                            <div className="vibz-user-capsule" ref={dropdownRef}>
                                <button
                                    className={`vibz-avatar-btn ${showDropdown ? 'active' : ''}`}
                                    onClick={() => setShowDropdown(!showDropdown)}
                                    aria-haspopup="true"
                                    aria-expanded={showDropdown}
                                    aria-label="Abrir menu do usuário"
                                >
                                    <FaUserCog size={16} aria-hidden="true" />
                                </button>

                                <div 
                                    className={`vibz-dropdown ${showDropdown ? 'show' : ''}`}
                                    role="menu"
                                    aria-label="Menu do usuário"
                                >
                                    <div className="dropdown-user-info" role="presentation">
                                        <span className="greeting">Olá,</span>
                                        <strong>{user?.name?.split(' ')[0]}</strong>
                                    </div>
                                    <div className="dropdown-divider" role="separator"></div>
                                    
                                    <button 
                                        className="dropdown-item" 
                                        role="menuitem"
                                        onClick={() => { setShowDropdown(false); router.push('/perfil'); }}
                                    >
                                        <FaTicketAlt aria-hidden="true" /> Meus Ingressos & Salvos
                                    </button>

                                    <button 
                                        className="dropdown-item" 
                                        role="menuitem"
                                        onClick={() => { setShowDropdown(false); router.push('/dashboard'); }}
                                    >
                                        <FaCalendarPlus aria-hidden="true" /> Meu Painel (Produtor)
                                    </button>

                                    <div className="dropdown-divider" role="separator"></div>

                                    <button 
                                        className="dropdown-item logout" 
                                        role="menuitem"
                                        onClick={handleLogout}
                                    >
                                        <FaSignOutAlt aria-hidden="true" /> Sair
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <Link href="/login" className="vibz-btn-login" aria-label="Entrar ou criar uma conta">
                                Entrar / Criar Conta
                            </Link>
                        )}
                    </div>

                    {/* ÁREA DE BUSCA (No extremo direito) */}
                    <div 
                        className={`vibz-search-container ${isSearchOpen ? 'open' : ''}`} 
                        ref={searchWrapperRef}
                        role="search"
                    >
                        {!isSearchOpen ? (
                            <button 
                                className="vibz-search-toggle-btn" 
                                onClick={() => setIsSearchOpen(true)}
                                aria-label="Abrir barra de pesquisa"
                                aria-expanded="false"
                            >
                                <FaSearch size={16} aria-hidden="true" />
                            </button>
                        ) : (
                            <div className="vibz-search-expanded">
                                <button 
                                    className="location-btn" 
                                    onClick={() => setShowCityMenu(!showCityMenu)}
                                    aria-haspopup="listbox"
                                    aria-expanded={showCityMenu}
                                    aria-label={`Cidade selecionada: ${selectedCity || 'Todas as cidades'}. Clique para alterar.`}
                                >
                                    <FaMapMarkerAlt size={14} aria-hidden="true" />
                                    <span className="city-text">{selectedCity || 'Todas as cidades'}</span>
                                    {selectedCity && (
                                        <div 
                                            className="clear-city" 
                                            onClick={(e) => { e.stopPropagation(); setSelectedCity(''); setShowCityMenu(false); }}
                                            role="button"
                                            aria-label="Limpar cidade selecionada"
                                            tabIndex="0"
                                        >
                                            <FaTimes size={10} aria-hidden="true" />
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
                                    aria-label="Campo de pesquisa de eventos"
                                    aria-autocomplete="list"
                                    aria-controls="search-suggestions-menu"
                                    autoFocus
                                />

                                <button 
                                    className="close-search-btn" 
                                    onClick={() => { setIsSearchOpen(false); setSearchTerm(''); }}
                                    aria-label="Fechar barra de pesquisa"
                                >
                                    <FaTimes size={14} aria-hidden="true" />
                                </button>

                                {/* DROPDOWN DE CIDADES */}
                                {showCityMenu && (
                                    <div className="header-dropdown-menu city-dropdown" role="listbox" aria-label="Lista de cidades">
                                        <div 
                                            className="dropdown-item" 
                                            role="option" 
                                            aria-selected={!selectedCity}
                                            onClick={() => { setSelectedCity(''); setShowCityMenu(false); }}
                                            tabIndex="0"
                                        >
                                            <strong>Todas as cidades</strong>
                                        </div>
                                        {cities.length > 0 ? cities.map((city, idx) => (
                                            <div 
                                                key={idx} 
                                                className="dropdown-item" 
                                                role="option"
                                                aria-selected={selectedCity === city}
                                                onClick={() => { setSelectedCity(city); setShowCityMenu(false); }}
                                                tabIndex="0"
                                            >
                                                {city}
                                            </div>
                                        )) : <div className="dropdown-item" role="status">Carregando locais...</div>}
                                    </div>
                                )}

                                {/* DROPDOWN DE SUGESTÕES DA BUSCA */}
                                {showSuggestions && (suggestions.length > 0 || matchedCategory) && (
                                    <div 
                                        id="search-suggestions-menu"
                                        className="header-dropdown-menu suggestions-dropdown" 
                                        role="listbox"
                                        aria-label="Sugestões de pesquisa"
                                    >
                                        {matchedCategory && (
                                            <div 
                                                className="suggestion-item category-highlight" 
                                                role="option"
                                                tabIndex="0"
                                                onClick={() => handleCategorySuggestionClick(matchedCategory)}
                                            >
                                                <div className="suggestion-icon"><FaLayerGroup color="#4C01B5" aria-hidden="true" /></div>
                                                <div className="suggestion-info">
                                                    <span className="suggestion-title">Ver tudo em <strong>{matchedCategory}</strong></span>
                                                    <span className="suggestion-date">Explorar categoria completa</span>
                                                </div>
                                            </div>
                                        )}

                                        {suggestions.map((event) => (
                                            <div 
                                                key={event._id || event.id} 
                                                className="suggestion-item" 
                                                role="option"
                                                tabIndex="0"
                                                onClick={() => handleSuggestionClick(event._id || event.id)}
                                            >
                                                <Image 
                                                    src={event.imageUrl || 'https://placehold.co/40x40/png'} 
                                                    alt={`Capa do evento ${event.title}`} 
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