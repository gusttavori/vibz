'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; 
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import EventCard from '@/components/EventCard'; 
import toast, { Toaster } from 'react-hot-toast';
import { FaEdit, FaTicketAlt, FaChartLine, FaSearch, FaChevronRight } from 'react-icons/fa';
import './UserProfile.css'; 

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// --- SKELETON REUTILIZÁVEL E LIMPO ---
const ProfileSkeleton = () => (
    <div className="user-profile-container">
        <Header />
        <div className="profile-header-wrapper">
            <div className="skeleton-cover skeleton-pulse"></div>
            <div className="profile-details-container">
                <div className="skeleton-avatar skeleton-pulse"></div>
                <div className="profile-texts" style={{width: '100%', maxWidth: '300px'}}>
                    <div className="skeleton-text skeleton-pulse" style={{height: '32px', width: '70%'}}></div>
                    <div className="skeleton-text skeleton-pulse" style={{height: '20px', width: '50%'}}></div>
                </div>
                <div className="profile-buttons">
                    <div className="skeleton-box skeleton-pulse" style={{width: '100px', height: '40px'}}></div>
                    <div className="skeleton-box skeleton-pulse" style={{width: '100px', height: '40px'}}></div>
                </div>
            </div>
        </div>
        <div className="profile-body">
            <div className="skeleton-text skeleton-pulse" style={{width: '200px', height: '28px', marginBottom: '20px'}}></div>
            <div className="skeleton-box skeleton-pulse" style={{width: '100%', height: '80px', borderRadius: '16px', marginBottom: '40px'}}></div>
            
            <div className="skeleton-text skeleton-pulse" style={{width: '150px', height: '28px', marginBottom: '20px'}}></div>
            <div className="favorites-grid">
                {[1, 2, 3].map(i => (
                    <div key={i} className="skeleton-box skeleton-pulse" style={{height: '320px', borderRadius: '16px'}}></div>
                ))}
            </div>
        </div>
        <Footer />
    </div>
);

const UserProfile = () => {
    const router = useRouter();
    const [userData, setUserData] = useState(null);
    const [favoritedEvents, setFavoritedEvents] = useState([]);
    const [tickets, setTickets] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [profileImage, setProfileImage] = useState('');

    useEffect(() => {
        const fetchAllData = async () => {
            const token = typeof window !== 'undefined' ? localStorage.getItem('userToken') : null;
            if (!token) return router.push('/login');

            try {
                // 1. Fetch User Data
                const profileRes = await fetch(`${API_BASE_URL}/users/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (!profileRes.ok) throw new Error("Erro ao carregar perfil");
                
                const profileData = await profileRes.json();
                const userObj = profileData.user || profileData;
                setUserData(userObj);
                
                // Set Image Fallback
                setProfileImage(userObj.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(userObj.name || 'User')}&background=random&color=fff`);

                // 2. Set Favorites
                setFavoritedEvents(profileData.favoritedEvents || userObj.favoritedEvents || []);

                // 3. Fetch Tickets
                const ticketsRes = await fetch(`${API_BASE_URL}/tickets/my-tickets`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (ticketsRes.ok) {
                    const ticketsData = await ticketsRes.json();
                    setTickets(ticketsData.slice(0, 3)); // Pega apenas os 3 mais recentes
                }
            } catch (err) {
                console.error(err);
                toast.error("Erro ao carregar dados.");
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, [router]);

    const handleToggleFavorite = async (eventId, isFavoriting) => {
        const token = localStorage.getItem('userToken');
        if (!token) return router.push('/login');

        // Optimistic UI
        if (!isFavoriting) {
            setFavoritedEvents(prev => prev.filter(e => (e.id || e._id) !== eventId));
            toast.success("Removido dos favoritos.");
        }

        try {
            // Tenta rota Toggle
            let res = await fetch(`${API_BASE_URL}/users/toggle-favorite`, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
                body: JSON.stringify({ eventId }) 
            });

            // Tenta rota legada se 404
            if (!res.ok && res.status === 404) {
                 const userId = localStorage.getItem('userId');
                 res = await fetch(`${API_BASE_URL}/events/${eventId}/favorite`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
                    body: JSON.stringify({ userId, isFavoriting })
                });
            }

            if (!res.ok) throw new Error("Falha na API");
            
            // Se for favoritar, recarrega a lista para garantir dados atualizados (opcional)
            if (isFavoriting) toast.success("Evento favoritado!");

        } catch(e) { 
            console.error(e);
            toast.error("Erro ao sincronizar."); 
            // Reverte em caso de erro
            if (!isFavoriting) setTimeout(() => window.location.reload(), 1000);
        }
    };

    // Helper para extrair dia e mês da data do evento
    const getDateInfo = (dateString) => {
        if (!dateString) return { day: '--', month: '---' };
        const date = new Date(dateString);
        return {
            day: date.getDate(),
            month: date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '')
        };
    };

    if (loading) return <ProfileSkeleton />;

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
                                    onError={(e) => e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=random&color=fff`} 
                                />
                            </div>
                            <div className="profile-texts">
                                <h1>{userData.name}</h1>
                                <p>{userData.email}</p> 
                            </div>
                            <div className="profile-buttons">
                                <Link href="/dashboard" className="btn-outline"><FaChartLine /> Painel</Link>
                                <button className="btn-outline" onClick={() => router.push('/perfil/editar')}><FaEdit /> Editar</button>
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
                                <Link href="/meus-ingressos" className="link-view-all">Ver Todos <FaChevronRight size={12}/></Link>
                            </div>
                            
                            {tickets.length === 0 ? (
                                <div className="empty-box-small">
                                    <p>Você ainda não tem ingressos ativos.</p>
                                    <Link href="/" className="link-explore">Explorar Eventos</Link>
                                </div>
                            ) : (
                                <div className="mini-tickets-list">
                                    {tickets.map((t) => {
                                        const { day, month } = getDateInfo(t.event?.date);
                                        return (
                                            <div key={t.id} className="mini-ticket-card" onClick={() => router.push('/meus-ingressos')}>
                                                <div className="mini-date">
                                                    <span className="day">{day}</span>
                                                    <span className="month">{month}</span>
                                                </div>
                                                <div className="mini-info">
                                                    <h4>{t.event?.title || 'Evento Indisponível'}</h4>
                                                    <div className="mini-meta">
                                                        <span>{t.ticketType || 'Ingresso'}</span>
                                                        {t.event?.city && <span>• {t.event.city}</span>}
                                                    </div>
                                                </div>
                                                <FaChevronRight className="mini-arrow"/>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="divider"></div>

                        {/* SEÇÃO DE FAVORITOS */}
                        <div className="section-title" style={{marginBottom: '20px'}}>
                            <h2>Meus Favoritos</h2>
                        </div>

                        {favoritedEvents.length > 0 ? (
                            <div className="favorites-grid">
                                {favoritedEvents.map(event => (
                                    <EventCard 
                                        key={event.id || event._id} 
                                        event={{...event, id: event.id || event._id}}
                                        isUserLoggedIn={true}
                                        onToggleFavorite={handleToggleFavorite}
                                        isFavorited={true} 
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="empty-simple">
                                <p>Nenhum evento favoritado ainda.</p>
                                <Link href="/" className="btn-explore-purple"><FaSearch /> Explorar Eventos</Link>
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