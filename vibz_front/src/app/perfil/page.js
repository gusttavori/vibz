'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; 
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import EventCard from '@/components/EventCard'; 
import toast, { Toaster } from 'react-hot-toast';
import { FaEdit, FaTicketAlt, FaChartLine, FaSearch, FaChevronRight, FaMapMarkerAlt } from 'react-icons/fa';
import './UserProfile.css'; 

const getApiBaseUrl = () => {
    if (typeof window === 'undefined') return 'http://localhost:5000/api';
    return `${window.location.protocol}//${window.location.hostname}:5000/api`;
};

const UserProfile = () => {
    const router = useRouter();
    const [userData, setUserData] = useState(null);
    const [favoritedEvents, setFavoritedEvents] = useState([]);
    const [tickets, setTickets] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [profileImage, setProfileImage] = useState('https://ui-avatars.com/api/?name=User&background=random');

    const API_BASE_URL = getApiBaseUrl();

    useEffect(() => {
        const fetchAllData = async () => {
            const token = localStorage.getItem('userToken');
            if (!token) return router.push('/login');

            try {
                const profileRes = await fetch(`${API_BASE_URL}/users/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (!profileRes.ok) throw new Error("Falha ao carregar perfil");
                
                const profileData = await profileRes.json();
                const user = profileData.user || profileData;
                setUserData(user);
                
                if (user.profilePicture) {
                    setProfileImage(user.profilePicture);
                } else {
                    setProfileImage(`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff`);
                }

                setFavoritedEvents(profileData.favoritedEvents || []);

                // Busca apenas os 3 ingressos mais recentes para o resumo
                const ticketsRes = await fetch(`${API_BASE_URL}/tickets/my-tickets`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (ticketsRes.ok) {
                    const ticketsData = await ticketsRes.json();
                    setTickets(ticketsData.slice(0, 3)); // Pega só os 3 primeiros
                }
            } catch (err) {
                toast.error("Erro ao carregar dados.");
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [router, API_BASE_URL]);

    const handleToggleFavorite = async (eventId, isFavoriting) => {
        const token = localStorage.getItem('userToken');
        const userId = localStorage.getItem('userId');
        try {
            await fetch(`${API_BASE_URL}/events/${eventId}/favorite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
                body: JSON.stringify({ userId, isFavoriting })
            });
            
            if (!isFavoriting) {
                setFavoritedEvents(prev => prev.filter(e => e._id !== eventId));
                toast.success("Removido dos favoritos.");
            }
        } catch(e) { 
            toast.error("Erro ao atualizar."); 
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    };

    if (loading) return <div className="loading-screen">Carregando...</div>;

    return (
        <div className="user-profile-container">
            <Toaster position="top-center" />
            <Header/>
            
            {userData && (
                <>
                    <div className="profile-header-wrapper">
                        <div className="profile-cover">
                            {userData.coverPicture ? (
                                <img src={userData.coverPicture} alt="Capa" />
                            ) : (
                                <div className="default-cover-gradient"></div>
                            )}
                        </div>
                        
                        <div className="profile-details-container">
                            <div className="profile-avatar">
                                <img 
                                    src={profileImage} 
                                    alt="Perfil" 
                                    onError={() => setProfileImage(`https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=random&color=fff`)}
                                />
                            </div>
                            
                            <div className="profile-texts">
                                <h1>{userData.name}</h1>
                                <p>{userData.email}</p> 
                            </div>

                            <div className="profile-buttons">
                                <Link href="/dashboard" className="btn-outline">
                                    <FaChartLine /> Painel do Organizador
                                </Link>
                                <button className="btn-outline" onClick={() => router.push('/perfil/editar')}>
                                    <FaEdit /> Editar
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="profile-body">
                        
                        {/* SEÇÃO DE INGRESSOS COMPACTA */}
                        <div className="mini-tickets-section">
                            <div className="section-header-row">
                                <div className="section-title">
                                    <FaTicketAlt className="icon-purple" />
                                    <h2>Ingressos Recentes</h2>
                                </div>
                                <Link href="/meus-ingressos" className="link-view-all">
                                    Ver Carteira Completa <FaChevronRight />
                                </Link>
                            </div>

                            {tickets.length === 0 ? (
                                <div className="empty-box-small">
                                    <p>Nenhum ingresso ativo.</p>
                                    <Link href="/" className="link-explore">Explorar Eventos</Link>
                                </div>
                            ) : (
                                <div className="mini-tickets-list">
                                    {tickets.map((ticket) => (
                                        <div key={ticket.id} className="mini-ticket-card" onClick={() => router.push('/meus-ingressos')}>
                                            <div className="mini-date">
                                                <span className="day">{new Date(ticket.event?.date || Date.now()).getDate()}</span>
                                                <span className="month">{new Date(ticket.event?.date || Date.now()).toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()}</span>
                                            </div>
                                            <div className="mini-info">
                                                <h4>{ticket.event?.title}</h4>
                                                <div className="mini-meta">
                                                    <span>{ticket.ticketType?.name}</span> • <span>{ticket.event?.city}</span>
                                                </div>
                                            </div>
                                            <div className="mini-arrow">
                                                <FaChevronRight />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="divider"></div>

                        <div className="section-title">
                            <h2>Meus Favoritos</h2>
                        </div>

                        {favoritedEvents.length > 0 ? (
                            <div className="favorites-grid">
                                {favoritedEvents.map(event => (
                                    <EventCard 
                                        key={event._id} 
                                        event={event} 
                                        isUserLoggedIn={true}
                                        onToggleFavorite={handleToggleFavorite}
                                        isFavorited={true} 
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="empty-simple">
                                <p>Nenhum evento favoritado.</p>
                                <Link href="/" className="btn-explore-purple">
                                    <FaSearch /> Explorar Eventos
                                </Link>
                            </div>
                        )}

                    </div>
                </>
            )}
            
            <Footer />
        </div>
    );
};

export default UserProfile;