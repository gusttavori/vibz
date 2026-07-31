'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; 
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import EventCard from '@/components/EventCard'; 
import toast, { Toaster } from 'react-hot-toast';
import { 
    FaEdit, FaTicketAlt, FaHeart, FaSearch, 
    FaCalendarDay, FaMapMarkerAlt, FaQrcode, 
    FaTimes, FaDownload 
} from 'react-icons/fa';
import './UserProfile.css'; 

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// --- SKELETON UNIFICADO ---
const ProfileSkeleton = () => (
    <div className="user-profile-container" aria-busy="true" aria-label="Carregando perfil do usuário">
        <Header />
        <div className="profile-header-wrapper">
            <div className="skeleton-cover skeleton-pulse"></div>
            <div className="profile-details-container">
                <div className="skeleton-avatar skeleton-pulse"></div>
                <div className="profile-texts" style={{width: '100%', maxWidth: '300px'}}>
                    <div className="skeleton-text skeleton-pulse" style={{height: '32px', width: '70%'}}></div>
                    <div className="skeleton-text skeleton-pulse" style={{height: '20px', width: '50%'}}></div>
                </div>
            </div>
        </div>
        <div className="profile-body">
            <div className="skeleton-box skeleton-pulse" style={{width: '300px', height: '50px', margin: '0 auto 40px', borderRadius: '50px'}}></div>
            <div className="tickets-grid">
                {[1, 2, 3].map(i => (
                    <div key={i} className="skeleton-box skeleton-pulse" style={{height: '140px', borderRadius: '20px'}}></div>
                ))}
            </div>
        </div>
        <Footer />
    </div>
);

export default function UserProfile() {
    const router = useRouter();
    
    // Estados Globais
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);
    const [profileImage, setProfileImage] = useState('');
    
    // Estados de Ingressos e Favoritos
    const [favoritedEvents, setFavoritedEvents] = useState([]);
    const [tickets, setTickets] = useState([]); 
    
    // Controle de Abas e Modais (Abre direto em 'favoritos')
    const [mainTab, setMainTab] = useState('favoritos'); 
    const [ticketTab, setTicketTab] = useState('valid'); // 'valid' | 'history'
    const [selectedTicket, setSelectedTicket] = useState(null);

    useEffect(() => {
        const fetchAllData = async () => {
            let token = typeof window !== 'undefined' ? localStorage.getItem('userToken') : null;
            
            if (!token) {
                return router.push('/login');
            }
            
            token = token.replace(/"/g, '');

            try {
                // 1. Busca Usuário e Favoritos (Obrigatório)
                const profileRes = await fetch(`${API_BASE_URL}/users/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (!profileRes.ok) {
                    if (profileRes.status === 401 || profileRes.status === 403) {
                        localStorage.clear();
                        toast.error("Sua sessão expirou. Faça login novamente.");
                        return router.push('/login');
                    }
                    throw new Error("Erro ao carregar perfil do usuário.");
                }
                
                const profileData = await profileRes.json();
                const userObj = profileData.user || profileData;
                setUserData(userObj);
                setProfileImage(userObj.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(userObj.name || 'User')}&background=random&color=fff`);
                setFavoritedEvents(profileData.favoritedEvents || userObj.favoritedEvents || []);

                // 2. Busca Ingressos (Opcional - Protegido contra Erro 500 para não travar a tela)
                try {
                    const ticketsRes = await fetch(`${API_BASE_URL}/tickets/my-tickets`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    if (ticketsRes.ok) {
                        const ticketsData = await ticketsRes.json();
                        setTickets(ticketsData);
                    } else {
                        console.warn("Aviso: Rota de ingressos retornou erro do servidor.");
                    }
                } catch (ticketErr) {
                    console.warn("Aviso: Falha ao buscar ingressos.", ticketErr);
                }

            } catch (err) {
                console.error("Erro geral no perfil:", err);
                toast.error("Erro ao carregar dados do perfil.");
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, [router]);

    // --- ACESSIBILIDADE: Fechar modal com a tecla ESC ---
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && selectedTicket) {
                closeTicket();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [selectedTicket]);

    // --- FUNÇÕES DE FAVORITOS ---
    const handleToggleFavorite = async (eventId, isFavoriting) => {
        const token = localStorage.getItem('userToken')?.replace(/"/g, '');
        if (!token) return router.push('/login');

        if (!isFavoriting) {
            setFavoritedEvents(prev => prev.filter(e => (e.id || e._id) !== eventId));
            toast.success("Removido dos favoritos.");
        }

        try {
            let res = await fetch(`${API_BASE_URL}/users/toggle-favorite`, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
                body: JSON.stringify({ eventId }) 
            });

            if (!res.ok && res.status === 404) {
                 const userId = localStorage.getItem('userId');
                 res = await fetch(`${API_BASE_URL}/events/${eventId}/favorite`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
                    body: JSON.stringify({ userId, isFavoriting })
                });
            }

            if (!res.ok) throw new Error("Falha na API");
            if (isFavoriting) toast.success("Evento favoritado!");
        } catch(e) { 
            toast.error("Erro ao sincronizar."); 
            if (!isFavoriting) setTimeout(() => window.location.reload(), 1000);
        }
    };

    // --- FUNÇÕES DE INGRESSOS ---
    const handleDownloadPDF = async (ticketId, eventTitle) => {
        const token = localStorage.getItem('userToken')?.replace(/"/g, '');
        const toastId = toast.loading("Gerando PDF...");
        
        try {
            const res = await fetch(`${API_BASE_URL}/tickets/${ticketId}/download`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Ingresso_${eventTitle}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                toast.success("Download concluído!", { id: toastId });
            } else {
                toast.error("Erro ao baixar.", { id: toastId });
            }
        } catch (e) {
            toast.error("Erro de conexão.", { id: toastId });
        }
    };

    const formatText = (text) => {
        if (!text) return '';
        return text.toString().replace(/(\d+)\s*[oO°]/g, '$1º').replace(/(\d+)\s*[aAª]/g, '$1ª');
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Data não definida';
        try {
            const cleanDate = dateString.toString().includes('T') ? dateString.split('T')[0] : dateString;
            const [year, month, day] = cleanDate.split('-');
            const date = new Date(year, month - 1, day);
            return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
        } catch (e) { return 'Erro na data'; }
    };

    // Listas Filtradas
    const validTickets = tickets.filter(t => t.status === 'valid');
    const historyTickets = tickets.filter(t => t.status !== 'valid'); 
    const currentTicketsList = ticketTab === 'valid' ? validTickets : historyTickets;

    const openTicket = (ticket) => setSelectedTicket(ticket);
    const closeTicket = () => setSelectedTicket(null);

    // Permite abrir o card do ingresso via teclado
    const handleTicketKeyDown = (e, ticket) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openTicket(ticket);
        }
    };

    if (loading) return <ProfileSkeleton />;

    return (
        <div className="user-profile-container">
            <Toaster position="top-center" />
            <Header/>
            
            {/* CABEÇALHO DO PERFIL */}
            {userData && (
                <div className="profile-header-wrapper" role="banner">
                    <div className="profile-cover" aria-hidden="true">
                        {userData.coverPicture ? (
                            <img src={userData.coverPicture} alt="" />
                        ) : (
                            <div className="default-cover-gradient"></div>
                        )}
                    </div>
                    <div className="profile-details-container">
                        <div className="profile-avatar">
                            <img 
                                src={profileImage} 
                                alt={`Foto de perfil de ${userData.name}`} 
                                onError={(e) => e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=random&color=fff`} 
                            />
                        </div>
                        <div className="profile-texts">
                            <h1>{userData.name}</h1>
                            <p>{userData.email}</p> 
                        </div>
                        <div className="profile-buttons">
                            <button 
                                className="btn-outline-minimal" 
                                onClick={() => router.push('/perfil/editar')}
                                aria-label="Editar seu perfil"
                            >
                                <FaEdit aria-hidden="true" /> Editar Perfil
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ÁREA DE CONTEÚDO UNIFICADA COM ID DE ACESSIBILIDADE */}
            <main id="conteudo-principal" className="profile-body" tabIndex="-1">
                
                {/* SUPER TABS (Ingressos vs Favoritos) */}
                <div className="super-tabs-container">
                    <div className="super-tabs" role="tablist" aria-label="Navegação do Perfil">
                        <button 
                            className={`super-tab-btn ${mainTab === 'ingressos' ? 'active' : ''}`} 
                            onClick={() => setMainTab('ingressos')}
                            role="tab"
                            aria-selected={mainTab === 'ingressos'}
                            aria-controls="panel-ingressos"
                            id="tab-ingressos"
                        >
                            <FaTicketAlt aria-hidden="true" /> Meus Ingressos
                        </button>
                        <button 
                            className={`super-tab-btn ${mainTab === 'favoritos' ? 'active' : ''}`} 
                            onClick={() => setMainTab('favoritos')}
                            role="tab"
                            aria-selected={mainTab === 'favoritos'}
                            aria-controls="panel-favoritos"
                            id="tab-favoritos"
                        >
                            <FaHeart aria-hidden="true" /> Eventos Salvos
                        </button>
                    </div>
                </div>

                {/* ABA 1: INGRESSOS (Estilo Apple Wallet) */}
                {mainTab === 'ingressos' && (
                    <div 
                        className="tab-content animate-fade-in" 
                        role="tabpanel" 
                        id="panel-ingressos" 
                        aria-labelledby="tab-ingressos"
                    >
                        
                        <div className="sub-tabs-wrapper" role="tablist" aria-label="Filtro de Ingressos">
                            <button 
                                className={`sub-tab-btn ${ticketTab === 'valid' ? 'active' : ''}`} 
                                onClick={() => setTicketTab('valid')}
                                role="tab"
                                aria-selected={ticketTab === 'valid'}
                            >
                                Próximos Eventos
                            </button>
                            <button 
                                className={`sub-tab-btn ${ticketTab === 'history' ? 'active' : ''}`} 
                                onClick={() => setTicketTab('history')}
                                role="tab"
                                aria-selected={ticketTab === 'history'}
                            >
                                Histórico
                            </button>
                        </div>

                        <div className="tickets-grid">
                            {currentTicketsList.length === 0 ? (
                                <div className="empty-wallet" role="status">
                                    <FaTicketAlt className="empty-icon" aria-hidden="true" />
                                    <h3>Sua carteira está vazia</h3>
                                    <p>Você não tem ingressos nesta categoria no momento.</p>
                                    <Link href="/" className="btn-explore-purple">Explorar Eventos</Link>
                                </div>
                            ) : (
                                currentTicketsList.map((ticket) => {
                                    const dateToShow = ticket.ticketType?.activityDate || ticket.event?.date;
                                    const ticketTypeName = typeof ticket.ticketType === 'object' && ticket.ticketType !== null 
                                        ? ticket.ticketType.name 
                                        : ticket.ticketType;

                                    return (
                                        <div 
                                            key={ticket.id || ticket._id} 
                                            className="wallet-ticket-card" 
                                            onClick={() => openTicket(ticket)}
                                            onKeyDown={(e) => handleTicketKeyDown(e, ticket)}
                                            role="button"
                                            tabIndex="0"
                                            aria-label={`Abrir ingresso de ${formatText(ticket.event?.title)}`}
                                        >
                                            <div className="wallet-ticket-image" aria-hidden="true">
                                                <img src={ticket.event?.imageUrl || '/img/default-event.jpg'} alt="" />
                                            </div>
                                            
                                            <div className="wallet-ticket-info">
                                                <span className="wallet-ticket-badge">{formatText(ticketTypeName || "Ingresso")}</span>
                                                <h3>{formatText(ticket.event?.title || "Evento Desconhecido")}</h3>
                                                
                                                <div className="wallet-ticket-meta">
                                                    <span><FaCalendarDay aria-hidden="true" /> {formatDate(dateToShow)}</span>
                                                    <span className="dot-separator" aria-hidden="true">•</span>
                                                    <span><FaMapMarkerAlt aria-hidden="true" /> {ticket.event?.city || "Local não informado"}</span>
                                                </div>
                                            </div>
                                            
                                            <div className="wallet-ticket-action" aria-hidden="true">
                                                <div className="qr-hint-btn"><FaQrcode /></div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* ABA 2: FAVORITOS */}
                {mainTab === 'favoritos' && (
                    <div 
                        className="tab-content animate-fade-in" 
                        role="tabpanel" 
                        id="panel-favoritos" 
                        aria-labelledby="tab-favoritos"
                    >
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
                            <div className="empty-wallet" role="status">
                                <FaHeart className="empty-icon" aria-hidden="true" />
                                <h3>Nenhum evento favoritado</h3>
                                <p>Clique no coração nos eventos da página inicial para salvá-los aqui.</p>
                                <Link href="/" className="btn-explore-purple">
                                    <FaSearch aria-hidden="true" /> Explorar Eventos
                                </Link>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* MODAL DO QR CODE */}
            {selectedTicket && (
                <div 
                    className="modal-overlay" 
                    onClick={closeTicket}
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Ingresso para ${formatText(selectedTicket.event?.title)}`}
                >
                    <div className="ticket-modal" onClick={e => e.stopPropagation()}>
                        <button 
                            className="close-modal" 
                            onClick={closeTicket}
                            aria-label="Fechar ingresso"
                            autoFocus
                        >
                            <FaTimes aria-hidden="true" />
                        </button>
                        
                        <div className="modal-event-image" style={{backgroundImage: `url(${selectedTicket.event?.imageUrl || '/img/default-event.jpg'})`}} aria-hidden="true">
                            <div className="modal-overlay-gradient"></div>
                            <h2>{formatText(selectedTicket.event?.title)}</h2>
                        </div>
                        
                        <div className="modal-body">
                            <div className="qr-container">
                                {selectedTicket.qrCodeImage ? (
                                    <img 
                                        src={selectedTicket.qrCodeImage} 
                                        alt="QR Code do seu ingresso. Apresente na entrada." 
                                        className="qr-image"
                                    />
                                ) : (
                                    <div className="qr-loading" role="status">Gerando QR...</div>
                                )}
                                <p className="qr-code-text">Apresente este código na entrada</p>
                            </div>
                            
                            <div className="ticket-info-block">
                                <div className="info-row">
                                    <span>Titular</span>
                                    <strong>{selectedTicket.user?.name || userData?.name || "Você"}</strong>
                                </div>
                                <div className="info-row">
                                    <span>Categoria</span>
                                    <strong>{formatText(selectedTicket.ticketType?.name)}</strong>
                                </div>
                                <div className="info-row">
                                    <span>Data</span>
                                    <strong>{formatDate(selectedTicket.ticketType?.activityDate || selectedTicket.event?.date)}</strong>
                                </div>
                                
                                <div className="status-row">
                                    <span 
                                        className={`status-pill ${selectedTicket.status}`}
                                        role="status"
                                        aria-label={`Status do ingresso: ${selectedTicket.status === 'valid' ? 'Válido' : 'Já utilizado'}`}
                                    >
                                        {selectedTicket.status === 'valid' ? 'VÁLIDO PARA USO' : 'JÁ UTILIZADO'}
                                    </span>
                                </div>
                                
                                <button 
                                    className="btn-download-pdf" 
                                    onClick={() => handleDownloadPDF(selectedTicket.id, selectedTicket.event?.title)}
                                    aria-label="Fazer download do ingresso original em PDF"
                                >
                                    <FaDownload aria-hidden="true" /> Baixar PDF Original
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <Footer />
        </div>
    );
}