'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import './Header.css';
import { FaPlus, FaSignOutAlt, FaUser, FaTicketAlt, FaChevronDown, FaCalendarPlus, FaWallet } from 'react-icons/fa';

export default function Header() {
    const router = useRouter();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    // Verifica login ao carregar e escuta mudanças no localStorage
    useEffect(() => {
        const checkLogin = () => {
            const token = localStorage.getItem('userToken');
            const storedName = localStorage.getItem('userName');
            const storedPic = localStorage.getItem('userPic'); 

            if (token) {
                setIsLoggedIn(true);
                setUser({
                    name: storedName || 'Visitante',
                    profilePicture: storedPic 
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

    // Fecha o dropdown ao clicar fora
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
        router.push('/login');
    };

    const getAvatarSrc = () => {
        if (user?.profilePicture && user.profilePicture !== "undefined" && user.profilePicture !== "null") {
            return user.profilePicture;
        }
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=f3e8ff&color=4C01B5&size=128&bold=true`;
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
                    {/* Botão Criar Evento (CTA) */}
                    <Link href="/admin/new" className="btn-create-event">
                        <FaPlus className="icon-mobile" />
                        <FaCalendarPlus className="icon-desktop" />
                        <span className="btn-text">Criar evento</span>
                    </Link>

                    {/* Área do Usuário */}
                    {isLoggedIn ? (
                        <div className="user-menu-container" ref={dropdownRef}>
                            <button 
                                className={`user-profile-trigger ${showDropdown ? 'active' : ''}`} 
                                onClick={() => setShowDropdown(!showDropdown)}
                                aria-label="Menu do usuário"
                            >
                                <img src={getAvatarSrc()} alt="Avatar" className="user-avatar" />
                                <span className="user-name">{user?.name?.split(' ')[0]}</span>
                                <FaChevronDown className="chevron-icon" />
                            </button>

                            {/* Dropdown */}
                            <div className={`dropdown-menu ${showDropdown ? 'show' : ''}`}>
                                <div className="dropdown-header-mobile">
                                    <strong>{user?.name}</strong>
                                </div>
                                
                                <button className="dropdown-item" onClick={() => router.push('/dashboard')}>
                                    <FaTicketAlt /> Painel do Organizador
                                </button>

                                {/* --- BOTÃO MEUS INGRESSOS --- */}
                                <button className="dropdown-item" onClick={() => router.push('/meus-ingressos')}>
                                    <FaWallet /> Meus Ingressos
                                </button>

                                <button className="dropdown-item" onClick={() => router.push('/perfil')}>
                                    <FaUser /> Meu Perfil
                                </button>
                                
                                <div className="dropdown-divider"></div>
                                
                                <button className="dropdown-item logout" onClick={handleLogout}>
                                    <FaSignOutAlt /> Sair
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Botão Entrar (Visitante) */
                        <Link href="/login" className="btn-login">
                            Entrar
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}