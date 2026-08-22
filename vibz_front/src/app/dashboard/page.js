'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import toast, { Toaster } from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { 
    FaCalendarAlt, FaEdit, FaList, FaStar, FaBolt, FaArrowUp, FaPlus, FaUserFriends, FaQrcode 
} from 'react-icons/fa';
import './Dashboard.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const DashboardSkeleton = () => (
    <div className="dashboard-container">
        <Header />
        <div className="dashboard-content">
            <div className="skeleton-box skeleton-pulse" style={{ height: '100px', borderRadius: '16px', marginBottom: '30px' }}></div>
            <div className="stats-grid">
                {[1, 2].map(i => <div key={i} className="skeleton-box skeleton-pulse" style={{ height: '120px', borderRadius: '16px' }}></div>)}
            </div>
        </div>
        <Footer />
    </div>
);

const DashboardContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [userData, setUserData] = useState(null);
    const [myEvents, setMyEvents] = useState([]);
    const [loading, setLoading] = useState(true);

const fetchAllData = useCallback(async () => {
        setLoading(true);

        try {
            const [userRes, eventsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/users/me`, { credentials: 'include' }),
                fetch(`${API_BASE_URL}/events/organizer/my-events`, { credentials: 'include' })
            ]);

            // Se as rotas estritamente protegidas retornarem 401
            if (eventsRes.status === 401) {
                localStorage.removeItem('userId');
                localStorage.removeItem('userName');
                toast.error('Sua sessão expirou. Faça login novamente.');
                router.push('/login');
                return;
            }

            if (userRes.ok) {
                const data = await userRes.json();
                
                // 🛡️ A CHECAGEM DEFINITIVA AQUI: Respondeu 200, mas está deslogado? Expulsa!
                if (!data.user) {
                    localStorage.removeItem('userId');
                    localStorage.removeItem('userName');
                    toast.error('Sua sessão expirou. Faça login novamente.');
                    router.push('/login');
                    return;
                }
                
                setUserData(data.user || data);
            }
            
            if (eventsRes.ok) {
                const data = await eventsRes.json();
                setMyEvents(data.myEvents || []);
            }
        } catch (e) { 
            console.error("Erro ao buscar dados:", e); 
            toast.error("Erro de conexão com o servidor.");
        } finally { 
            setLoading(false); 
        }
    }, [router]);

    useEffect(() => {
        fetchAllData();
        if (searchParams.get('success') === 'highlight') {
            toast.success("Destaque Ativado! 🌟");
            confetti({ particleCount: 150, spread: 70 });
            router.replace('/dashboard');
        }
    }, [fetchAllData, searchParams, router]);

    if (loading) return <DashboardSkeleton />;

    const firstName = userData?.name ? userData.name.split(' ')[0] : 'Curador';
    const activeEvents = myEvents.filter(ev => ev.status === 'approved').length;

    return (
        <div className="dashboard-container">
            <Toaster position="top-center" />
            <Header />

            <main className="dashboard-content">
                <div className="dashboard-main-header">
                    <div className="header-titles">
                        <h1>Painel da Agenda Cultural</h1>
                        <p className="sub-greeting">Olá, {firstName}</p>
                    </div>

                    <div className="header-status-actions">
                        <div className="online-badge-container">
                            <div className="dot-pulse-wrapper">
                                <div className="dot-main"></div>
                                <div className="dot-pulse-ring"></div>
                            </div>
                            SISTEMA ONLINE
                        </div>
                    </div>
                </div>

                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
                    <div className="stat-card">
                        <div className="stat-icon events-bg"><FaCalendarAlt /></div>
                        <div className="stat-info">
                            <span>Eventos Publicados</span>
                            <strong>{activeEvents}</strong>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon tickets-bg"><FaList /></div>
                        <div className="stat-info">
                            <span>Total de Eventos (Histórico)</span>
                            <strong>{myEvents.length}</strong>
                        </div>
                    </div>
                </div>

                <div className="section-header-flex">
                    <h2><FaList className="purple-icon" /> Gerenciar Agenda</h2>
                    <button className="btn-create-event-top" onClick={() => router.push('/admin/new')}>
                        <FaPlus /> Novo Evento
                    </button>
                </div>

                <div className="events-list-container">
                    {myEvents.length === 0 ? (
                        <div className="empty-state-card">Nenhum evento na agenda ainda.</div>
                    ) : (
                        myEvents.map((event) => {
                            const eventId = event.id || event._id;
                            return (
                                <div key={eventId} className="event-item-row">
                                    <div className="event-item-main">
                                        <img src={event.imageUrl} alt="" className="event-item-img" />
                                        <div className="event-item-details">
                                            <div className="event-item-title-row">
                                                <strong>{event.title}</strong>
                                                {event.highlightStatus === 'paid' && <FaStar className="star-highlight-icon" />}
                                            </div>
                                            <p className="event-item-meta">{new Date(event.eventDate || event.date).toLocaleDateString()} • {event.city || event.location}</p>

                                            <div className="badge-flex-row">
                                                <span className={`badge-pill status-${event.status}`}>
                                                    {event.status === 'approved' ? 'PUBLICADO' : 'OCULTO'}
                                                </span>

                                                {event.highlightStatus === 'approved_waiting_payment' ? (
                                                    <a href={event.highlightPaymentLink} target="_blank" rel="noopener noreferrer" className="badge-pill highlight-pay">
                                                        <FaBolt /> PAGAR DESTAQUE
                                                    </a>
                                                ) : event.highlightStatus === 'paid' || event.isFeatured ? (
                                                    <span className="badge-pill highlight-active">🌟 PATROCINADO</span>
                                                ) : event.status === 'approved' && (
                                                    <button className="badge-pill highlight-request" onClick={() => router.push(`/eventos/editar/${eventId}`)}>
                                                        <FaArrowUp /> DESTACAR
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* AÇÕES DA LINHA DO EVENTO */}
                                    <div className="event-item-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        
                                        {/* ROTA ATUALIZADA AQUI */}
                                        <button 
                                            className="btn-row-action" 
                                            onClick={() => router.push(`/admin/checkin/${eventId}`)}
                                            style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', fontSize: '0.85rem' }}
                                            title="Validar Ingressos na Portaria"
                                        >
                                            <FaQrcode /> Validador
                                        </button>

                                        <button 
                                            className="btn-row-action" 
                                            onClick={() => router.push(`/eventos/${eventId}/participantes`)}
                                            style={{ background: '#4c01b5', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', fontSize: '0.85rem' }}
                                            title="Controle de Participantes e Portaria"
                                        >
                                            <FaUserFriends /> Participantes
                                        </button>

                                        <button className="btn-row-action btn-edit-primary" onClick={() => router.push(`/eventos/editar/${eventId}`)}>
                                            <FaEdit /> Editar
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default function Dashboard() {
    return <Suspense fallback={<DashboardSkeleton />}><DashboardContent /></Suspense>;
}