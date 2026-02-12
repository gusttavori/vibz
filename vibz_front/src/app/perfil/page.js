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

const getApiBaseUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
};

// --- SKELETON LOADER (NOVO) ---
const ProfileSkeleton = () => (
    <div className="user-profile-container">
        <Header />
        <div className="profile-header-wrapper">
            <div className="profile-cover skeleton-box"></div>
            <div className="profile-details-container">
                <div className="profile-avatar skeleton-box" style={{border: '5px solid white'}}></div>
                <div className="profile-texts" style={{paddingTop: '20px'}}>
                    <div className="skeleton-line" style={{width: '200px', height: '30px', marginBottom: '10px'}}></div>
                    <div className="skeleton-line" style={{width: '150px', height: '20px'}}></div>
                </div>
            </div>
        </div>
        <div className="profile-body">
            <div className="skeleton-line" style={{width: '100%', height: '100px', marginBottom: '30px', borderRadius: '12px'}}></div>
            <div className="skeleton-line" style={{width: '150px', height: '30px', marginBottom: '20px'}}></div>
            <div className="favorites-grid">
                <div className="skeleton-box" style={{height: '280px', borderRadius: '16px'}}></div>
                <div className="skeleton-box" style={{height: '280px', borderRadius: '16px'}}></div>
                <div className="skeleton-box" style={{height: '280px', borderRadius: '16px'}}></div>
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
    const [profileImage, setProfileImage] = useState('https://ui-avatars.com/api/?name=User&background=random');

    const API_BASE_URL = getApiBaseUrl();

    useEffect(() => {
        const fetchAllData = async () => {
            const token = localStorage.getItem('userToken');
            if (!token) return router.push('/login');

            try {
                // 1. Perfil e Favoritos
                const profileRes = await fetch(`${API_BASE_URL}/users/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (!profileRes.ok) throw new Error("Erro ao carregar perfil");
                
                const profileData = await profileRes.json();
                const userObj = profileData.user || profileData;
                setUserData(userObj);
                
                if (userObj.profilePicture) {
                    setProfileImage(userObj.profilePicture);
                } else {
                    setProfileImage(`https://ui-avatars.com/api/?name=${encodeURIComponent(userObj.name)}&background=random&color=fff`);
                }

                // Carrega favoritos
                setFavoritedEvents(profileData.favoritedEvents || userObj.favoritedEvents || []);

                // 2. Ingressos
                const ticketsRes = await fetch(`${API_BASE_URL}/tickets/my-tickets`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (ticketsRes.ok) {
                    const ticketsData = await ticketsRes.json();
                    setTickets(ticketsData.slice(0, 3)); 
                }
            } catch (err) {
                console.error(err);
                toast.error("Erro ao carregar dados.");
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, [router, API_BASE_URL]);

    const handleToggleFavorite = async (eventId, isFavoriting) => {
        const token = localStorage.getItem('userToken');
        if (!token) return router.push('/login');

        // OPTIMISTIC UI: Remove imediatamente da tela se for desfavoritar
        // Se for favoritar (o que não deve acontecer nessa tela, pois só mostra os já favoritados), adicionaria
        if (!isFavoriting) {
            setFavoritedEvents(prev => prev.filter(e => (e.id || e._id) !== eventId));
            toast.success("Removido dos favoritos.");
        }

        try {
            // Tenta rota padrão
            let res = await fetch(`${API_BASE_URL}/users/toggle-favorite`, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
                body: JSON.stringify({ eventId }) 
            });

            // Fallback para rota antiga se a nova não existir
            if (!res.ok && res.status === 404) {
                 const userId = localStorage.getItem('userId');
                 res = await fetch(`${API_BASE_URL}/events/${eventId}/favorite`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
                    body: JSON.stringify({ userId, isFavoriting })
                });
            }

            if (!res.ok) {
                // Se der erro no servidor, reverte a mudança visual (adiciona de volta)
                if (!isFavoriting) {
                    toast.error("Erro ao sincronizar. Recarregando...");
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    toast.error("Erro ao adicionar.");
                }
            } else {
                if (isFavoriting) toast.success("Evento favoritado!");
            }

        } catch(e) { 
            console.error(e);
            toast.error("Erro de conexão."); 
            if (!isFavoriting) setTimeout(() => window.location.reload(), 1000);
        }
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
                                <img src={profileImage} alt="Perfil" onError={() => setProfileImage(`https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=random&color=fff`)} />
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
                        <div className="mini-tickets-section">
                            <div className="section-header-row">
                                <div className="section-title"><FaTicketAlt className="icon-purple" /><h2>Ingressos Recentes</h2></div>
                                <Link href="/meus-ingressos" className="link-view-all">Ver Todos <FaChevronRight /></Link>
                            </div>
                            {tickets.length === 0 ? (
                                <div className="empty-box-small"><p>Nenhum ingresso ativo.</p><Link href="/" className="link-explore">Explorar</Link></div>
                            ) : (
                                <div className="mini-tickets-list">
                                    {tickets.map((t) => (
                                        <div key={t.id} className="mini-ticket-card" onClick={() => router.push('/meus-ingressos')}>
                                            <div className="mini-info"><h4>{t.event?.title}</h4></div>
                                            <FaChevronRight className="mini-arrow"/>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="divider"></div>

                        <div className="section-title"><h2>Meus Favoritos</h2></div>

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
                                <p>Nenhum evento favoritado.</p>
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