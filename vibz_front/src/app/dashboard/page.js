'use client';

import React, { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import toast, { Toaster } from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { 
    FaCheckCircle, FaExclamationCircle, FaCalendarAlt, FaEdit, 
    FaList, FaQrcode, FaCog, FaTimes,
    FaMoneyBillWave, FaTicketAlt, FaStar, FaBolt, FaUsers, FaArrowUp, FaPlus
} from 'react-icons/fa';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Dashboard.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// --- COMPONENTE SKELETON ---
const DashboardSkeleton = () => (
    <div className="dashboard-container">
        <Header />
        <main className="dashboard-content">
            <div className="skeleton-box skeleton-pulse" style={{height: '100px', marginBottom: '30px', borderRadius: '16px'}}></div>
            <div className="stats-grid">
                {[1, 2, 3].map(i => <div key={i} className="skeleton-box skeleton-pulse" style={{height: '120px', borderRadius: '16px'}}></div>)}
            </div>
             <div className="skeleton-box skeleton-pulse" style={{height: '100px', margin: '30px 0', borderRadius: '16px'}}></div>
            <div className="events-list-wrapper">
                {[1, 2].map(i => <div key={i} className="skeleton-box skeleton-pulse" style={{height: '140px', width: '100%', marginBottom: '15px', borderRadius: '20px'}}></div>)}
            </div>
        </main>
        <Footer />
    </div>
);

// --- MODAL DE GERENCIAMENTO DE VENDAS ---
const ManageSalesModal = ({ event, onClose, onUpdate }) => {
    const [tickets, setTickets] = useState(event.tickets || []);
    const [loadingId, setLoadingId] = useState(null);

    const handleToggle = async (ticket) => {
        const ticketId = ticket.id || ticket._id;
        setLoadingId(ticketId);
        const newStatus = ticket.status === 'active' ? 'paused' : 'active';
        const token = localStorage.getItem('userToken')?.replace(/"/g, '');

        try {
            const res = await fetch(`${API_BASE_URL}/events/tickets/${ticketId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                setTickets(tickets.map(t => (t.id === ticketId || t._id === ticketId) ? { ...t, status: newStatus } : t));
                toast.success(newStatus === 'active' ? 'Vendas Ativadas!' : 'Vendas Pausadas');
                if (onUpdate) onUpdate(); 
            }
        } catch (error) { toast.error('Erro de conexão.'); } 
        finally { setLoadingId(null); }
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-box animate-pop-in">
                <div className="modal-header">
                    <h3>Gerenciar Ingressos</h3>
                    <button className="close-modal-btn" onClick={onClose}><FaTimes /></button>
                </div>
                <div className="modal-body">
                    {tickets.length > 0 ? tickets.map(t => (
                        <div key={t.id || t._id} className="ticket-manage-item">
                            <div className="ticket-info">
                                <strong>{t.name}</strong>
                                <span>{t.sold || 0} / {t.quantity} vendidos</span>
                            </div>
                            <label className="switch">
                                <input type="checkbox" checked={t.status === 'active'} onChange={() => handleToggle(t)} disabled={loadingId === (t.id || t._id)} />
                                <span className="slider"></span>
                            </label>
                        </div>
                    )) : <div className="empty-state-modal">Nenhum ingresso configurado.</div>}
                </div>
                <button className="btn-modal-close" onClick={onClose}>Concluir</button>
            </div>
        </div>
    );
};

const DashboardContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [stats, setStats] = useState(null);
    const [userData, setUserData] = useState(null);
    const [myEvents, setMyEvents] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [selectedEventForManage, setSelectedEventForManage] = useState(null);

    const fetchAllData = useCallback(async () => {
        setLoading(true);
        const token = localStorage.getItem('userToken')?.replace(/"/g, '');
        if (!token) return router.push('/login');

        try {
            const [userRes, statsRes, eventsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/users/me`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/dashboard/stats`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/dashboard/events`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (userRes.ok) {
                const data = await userRes.json();
                // FIX: Garante que pegamos o objeto correto, seja data ou data.user
                setUserData(data.user || data);
            }
            if (statsRes.ok) setStats(await statsRes.json());
            if (eventsRes.ok) {
                const data = await eventsRes.json();
                setMyEvents(data.myEvents || []);
            }
        } catch (error) { 
            console.error("Erro ao carregar dashboard:", error); 
        } finally { 
            setLoading(false); 
        }
    }, [router]);

    useEffect(() => {
        fetchAllData();
        if (searchParams.get('success') === 'highlight') {
            toast.success("Destaque Ativado! 🚀");
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
            router.replace('/dashboard');
        }
    }, [fetchAllData, searchParams, router]);

    const metrics = useMemo(() => {
        let revenue = 0, sold = 0;
        myEvents.forEach(ev => ev.tickets?.forEach(t => {
            sold += (t.sold || 0);
            revenue += (t.sold || 0) * (t.price || 0);
        }));
        return { revenue, sold };
    }, [myEvents]);

    if (loading && !stats) return <DashboardSkeleton />;

    const isStripeReady = userData?.stripeAccountId && userData?.stripeOnboardingComplete;

    return (
        <div className="dashboard-container">
            <Toaster position="top-center" />
            <Header />

            <main className="dashboard-content">
                {/* --- HEADER COM STATUS ONLINE --- */}
                <div className="dashboard-top-nav">
                    <div className="dash-title-group">
                        <h1>Painel do Organizador</h1>
                        <p className="greeting-text">
                            Olá, {userData?.name ? userData.name.split(' ')[0] : 'Organizador'} 👋
                        </p>
                    </div>
                    <div className="dash-header-actions">
                        <div className="live-badge">
                            <div className="dot-container">
                                <div className="dot"></div>
                                <div className="pulse"></div>
                            </div>
                            SISTEMA ONLINE
                        </div>
                        <button className="btn-checkin-top" onClick={() => router.push('/admin/checkin')}>
                            <FaQrcode /> Validar Ingressos
                        </button>
                    </div>
                </div>

                {/* --- KPI CARDS --- */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon revenue"><FaMoneyBillWave /></div>
                        <div className="stat-info"><span>Faturamento Bruto</span><strong>R$ {metrics.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon tickets"><FaTicketAlt /></div>
                        <div className="stat-info"><span>Ingressos Vendidos</span><strong>{metrics.sold}</strong></div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon events"><FaCalendarAlt /></div>
                        <div className="stat-info"><span>Meus Eventos</span><strong>{myEvents.length}</strong></div>
                    </div>
                </div>

                {/* --- CARD DE RECEBIMENTOS (STRIPE) --- */}
                <div className={`stripe-banner ${isStripeReady ? 'ready' : 'setup'}`}>
                    <div className="stripe-banner-content">
                        <div className="stripe-icon-circle">
                            {isStripeReady ? <FaCheckCircle /> : <FaExclamationCircle />}
                        </div>
                        <div className="stripe-banner-text">
                            <h3>{isStripeReady ? 'Recebimentos Ativos' : 'Configure seus Recebimentos'}</h3>
                            <p>{isStripeReady ? 'Sua conta está conectada e pronta para transferir seus lucros.' : 'Conecte sua conta Stripe para receber o valor das suas vendas de ingressos.'}</p>
                        </div>
                    </div>
                    <button className="btn-stripe-cta">
                        {isStripeReady ? 'Ver Extrato' : 'Conectar Banco'}
                    </button>
                </div>

                {/* --- TÍTULO DA SEÇÃO E BOTÃO CRIAR --- */}
                <div className="section-header-row">
                    <h2><FaList /> Gerenciar Eventos</h2>
                    <button className="btn-create-new" onClick={() => router.push('/admin/new')}>
                        <FaPlus /> Criar Novo Evento
                    </button>
                </div>

                {/* --- LISTA DE EVENTOS --- */}
                <div className="events-list-wrapper">
                    {myEvents.length === 0 ? (
                        <div className="empty-state-dash">Nenhum evento encontrado.</div>
                    ) : (
                        myEvents.map((event) => (
                            <div key={event.id || event._id} className="event-card-row">
                                <div className="event-card-main">
                                    <img src={event.imageUrl} alt="" className="event-card-img" />
                                    <div className="event-card-info">
                                        <div className="event-card-title-row">
                                            <strong>{event.title}</strong>
                                            {event.highlightStatus === 'paid' && <FaStar className="star-highlight" />}
                                        </div>
                                        <p className="event-card-meta">
                                            <FaCalendarAlt size={12}/> {new Date(event.date).toLocaleDateString()} • {event.city}
                                        </p>
                                        
                                        <div className="badge-row">
                                            <span className={`badge-pill status-${event.status}`}>
                                                {event.status === 'approved' ? 'APROVADO' : event.status === 'pending' ? 'ANÁLISE' : 'REJEITADO'}
                                            </span>

                                            {event.highlightStatus === 'approved_waiting_payment' && (
                                                <a href={event.highlightPaymentLink} target="_blank" className="badge-pill highlight-pay">
                                                    <FaBolt /> PAGAR DESTAQUE
                                                </a>
                                            )}
                                            
                                            {event.highlightStatus === 'paid' && (
                                                <span className="badge-pill highlight-active">🌟 DESTAQUE ATIVO</span>
                                            )}

                                            {(!event.highlightStatus || event.highlightStatus === 'none') && event.status === 'approved' && (
                                                <button className="badge-pill highlight-request" onClick={() => router.push(`/eventos/editar/${event.id || event._id}`)}>
                                                    <FaArrowUp /> SOLICITAR DESTAQUE
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="event-card-actions">
                                    <button className="btn-action-outline" onClick={() => router.push(`/eventos/${event.id || event._id}/participantes`)}>
                                        <FaUsers /> Participantes
                                    </button>
                                    {!event.isInformational && (
                                        <button className="btn-action-outline" onClick={() => setSelectedEventForManage(event)}>
                                            <FaCog /> Ingressos
                                        </button>
                                    )}
                                    <button className="btn-action-primary" onClick={() => router.push(`/eventos/editar/${event.id || event._id}`)}>
                                        <FaEdit /> Editar
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>

            {selectedEventForManage && (
                <ManageSalesModal 
                    event={selectedEventForManage} 
                    onClose={() => setSelectedEventForManage(null)} 
                    onUpdate={fetchAllData} 
                />
            )}
            <Footer />
        </div>
    );
};

export default function Dashboard() {
    return <Suspense fallback={<DashboardSkeleton />}><DashboardContent /></Suspense>;
}