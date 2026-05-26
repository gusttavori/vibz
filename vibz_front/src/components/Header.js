'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import './Header.css';
import { FaPlus, FaSignOutAlt, FaCalendarPlus, FaChevronDown, FaUserCog } from 'react-icons/fa';

export default function Header() {
    const router = useRouter();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    // Simplificação da checagem. Como a interface é para o Curador, não forçaremos
    // logout imediato na navegação, o backend protegerá a rota de criação caso expire.
    useEffect(() => {
        const checkLogin = () => {
            const token = localStorage.getItem('userToken');
            const storedName = localStorage.getItem('userName');
            
            if (token) {
                setIsLoggedIn(true);
                setUser({
                    name: storedName || 'Curador'
                });
            } else {
                setIsLoggedIn(false);
                setUser(null);
            }
        };

        checkLogin();
        window.addEventListener('storage', checkLogin);
        return () => window.removeEventListener('storage', checkLogin);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        localStorage.clear();
        setIsLoggedIn(false);
        setUser(null);
        setShowDropdown(false);
        router.push('/');
    };

    return (
        <header className="global-header">
            <div className="header-container">
                {/* LOGO */}
                <Link href="/" className="logo-link">
                    <img src="/img/vibe_site.png" alt="Vibz Logo" className="header-logo" />
                </Link>

                {/* AÇÕES DIREITA */}
                <div className="header-actions">
                    {/* Apenas Curador logado vê o botão de Criar Evento */}
                    {isLoggedIn && (
                        <Link href="/admin/new" className="btn-create-event">
                            <FaPlus className="icon-mobile" />
                            <FaCalendarPlus className="icon-desktop" />
                            <span className="btn-text">Novo evento</span>
                        </Link>
                    )}

                    {/* Área do Curador */}
                    {isLoggedIn && (
                        <div className="user-menu-container" ref={dropdownRef}>
                            <button
                                className={`user-profile-trigger ${showDropdown ? 'active' : ''}`}
                                onClick={() => setShowDropdown(!showDropdown)}
                                aria-label="Menu do usuário"
                            >
                                {/* Removido o Avatar de API externa para ser mais clean */}
                                <div className="user-avatar-placeholder">
                                    <FaUserCog size={18} color="#4C01B5" />
                                </div>
                                <span className="user-name">{user?.name?.split(' ')[0]}</span>
                                <FaChevronDown className="chevron-icon" />
                            </button>

                            <div className={`dropdown-menu ${showDropdown ? 'show' : ''}`}>
                                <div className="dropdown-header-mobile">
                                    <strong>{user?.name}</strong>
                                </div>

                                <button className="dropdown-item" onClick={() => router.push('/dashboard')}>
                                    <FaCalendarPlus /> Painel da Agenda
                                </button>

                                <div className="dropdown-divider"></div>

                                <button className="dropdown-item logout" onClick={handleLogout}>
                                    <FaSignOutAlt /> Sair
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {/* Botão de Entrar (Visitante) removido. 
                        Apenas os organizadores que souberem a url '/login' entrarão. */}
                </div>
            </div>
        </header>
    );
}