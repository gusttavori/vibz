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

    // --- NOVA FUNÇÃO DE CHECAGEM DE TOKEN EXPIRADO ---
    const checkTokenExpiration = (token) => {
        if (!token) return true; // Se não tem token, está "expirado" por padrão

        try {
            // Decodifica o payload do token JWT (a parte do meio, base64)
            const payloadBase64 = token.split('.')[1];
            // Em navegadores modernos (Next.js client-side), usamos atob para decodificar base64
            const decodedJson = atob(payloadBase64);
            const decoded = JSON.parse(decodedJson);

            // Pega a data de expiração (exp vem em segundos, o JS usa milissegundos)
            const expDate = decoded.exp * 1000;

            // Se a data atual for maior que a data de expiração, o token venceu
            if (Date.now() >= expDate) {
                return true; // Expirou
            }
            return false; // Válido
        } catch (error) {
            console.error("Erro ao decodificar token", error);
            return true; // Na dúvida, considera expirado para segurança
        }
    };

    // Verifica login ao carregar e escuta mudanças no localStorage
    useEffect(() => {
        const checkLogin = () => {
            const token = localStorage.getItem('userToken')?.replace(/"/g, '');
            const storedName = localStorage.getItem('userName');
            const storedPic = localStorage.getItem('userPic');

            if (token) {
                const isExpired = checkTokenExpiration(token);

                if (isExpired) {
                    console.log("Token expirado interceptado pelo Header. Deslogando...");
                    handleLogout(); // Se expirou, força o logout imediato
                } else {
                    setIsLoggedIn(true);
                    setUser({
                        name: storedName || 'Visitante',
                        profilePicture: storedPic
                    });
                }
            } else {
                setIsLoggedIn(false);
                setUser(null);
            }
        };

        checkLogin();

        // Fica checando o localStorage (se o usuário logar em outra aba)
        window.addEventListener('storage', checkLogin);

        // Robô silencioso que roda a cada 2 minutos para ver se o tempo do token acabou
        const intervalId = setInterval(checkLogin, 2 * 60 * 1000);

        return () => {
            window.removeEventListener('storage', checkLogin);
            clearInterval(intervalId);
        };
    }, [router]); // Router como dependência porque usamos no handleLogout

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