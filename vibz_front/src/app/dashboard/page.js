'use client';

import React, { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import toast, { Toaster } from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { 
    FaCalendarAlt, FaEdit, FaList, FaQrcode, FaCog, FaTimes,
    FaMoneyBillWave, FaTicketAlt, FaStar, FaBolt, FaUsers, FaArrowUp, FaPlus, FaExclamationCircle, FaCheckCircle
} from 'react-icons/fa';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Dashboard.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const DashboardSkeleton = () => (
    <div className="dashboard-container">
        <Header />
        <div className="dashboard-content">
            <div className="skeleton-box skeleton-pulse" style={{height: '100px', borderRadius: '16px', marginBottom: '30px'}}></div>
            <div className="stats-grid">
                {[1, 2, 3].map(i => <div key={i} className="skeleton-box skeleton-pulse" style={{height: '120px', borderRadius: '16px'}}></div>)}
            </div>
        </div>
        <Footer />
    </div>
);

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
            <div className="modal-box animate-pop">
                <div className="modal-header">
                    <h3>Ingressos: {event.title}</h3>
                    <button className="close-modal-btn" onClick={onClose}><FaTimes /></button>
                </div>
                <div className="modal-body">
                    {tickets.map(t => (
                        <div key={t.id || t._id} className="ticket-manage-item">
                            <div className="ticket-info"><strong>{t.name}</strong><span>{t.sold || 0} / {t.quantity} vendidos</span></div>
                            <label className="switch">
                                <input type="checkbox" checked={t.status === 'active'} onChange={() => handleToggle(t)} disabled={loadingId === (t.id || t._id)} />
                                <span className="slider"></span>
                            </label>
                        </div>
                    ))}
                </div>
                <button className="btn-modal-done" onClick={onClose}>Concluir</button>
            </div>
        </div>
    );
};

const DashboardContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [userData, setUserData] = useState(null);
    const [myEvents, setMyEvents] = useState([]); 
    const [stats, setStats] = useState(null);
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
                setUserData(data.user || data);
            }
            if (statsRes.ok) setStats(await statsRes.json());
            if (eventsRes.ok) {
                const data = await eventsRes.json();
                setMyEvents(data.myEvents || []);
            }
        } catch (e) { console.error(e); } 
        finally { setLoading(false); }
    }, [router]);

    useEffect(() => {
        fetchAllData();
        if (searchParams.get('success') === 'highlight') {
            toast.success("Destaque Ativado! 🌟");
            confetti({ particleCount: 150, spread: 70 });
            router.replace('/dashboard');
        }
    }, [fetchAllData, searchParams, router]);

    const metrics = useMemo(() => {
        let rev = 0, sold = 0;
        myEvents.forEach(ev => ev.tickets?.forEach(t => {
            sold += (t.sold || 0);
            rev += (t.sold || 0) * (t.price || 0);
        }));
        return { revenue: rev, sold };
    }, [myEvents]);

    if (loading && !stats) return <DashboardSkeleton />;

    const isStripeReady = userData?.stripeAccountId && userData?.stripeOnboardingComplete;
    const firstName = userData?.name ? userData.name.split(' ')[0] : 'Organizador';

    return (
        <div className="dashboard-container">
            <Toaster position="top-center" />
            <Header />

            <main className="dashboard-content">
                {/* --- HEADER PRINCIPAL --- */}
                <div className="dashboard-main-header">
                    <div className="header-titles">
                        <h1>Painel do Organizador</h1>
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
                        <button className="btn-top-checkin" onClick={() => router.push('/admin/checkin')}>
                            <FaQrcode /> Validar Ingressos
                        </button>
                    </div>
                </div>

                {/* --- KPI GRID --- */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon revenue-bg"><FaMoneyBillWave /></div>
                        <div className="stat-info"><span>Faturamento Bruto</span><strong>R$ {metrics.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon tickets-bg"><FaTicketAlt /></div>
                        <div className="stat-info"><span>Ingressos Vendidos</span><strong>{metrics.sold}</strong></div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon events-bg"><FaCalendarAlt /></div>
                        <div className="stat-info"><span>Eventos Totais</span><strong>{myEvents.length}</strong></div>
                    </div>
                </div>

                {/* --- STRIPE BANNER (PROFISSIONAL) --- */}
                <div className={`stripe-setup-banner ${isStripeReady ? 'is-ready' : 'is-pending'}`}>
                    <div className="stripe-banner-left">
                        <div className="stripe-icon-wrapper">
                            {isStripeReady ? <FaCheckCircle /> : <FaExclamationCircle />}
                        </div>
                        <div className="stripe-banner-text">
                            <h3>{isStripeReady ? 'Conta Bancária Conectada' : 'Configure seus Recebimentos'}</h3>
                            <p>{isStripeReady ? 'Sua conta está pronta para receber os repasses das vendas.' : 'Conecte sua conta Stripe para começar a receber o valor das suas vendas.'}</p>
                        </div>
                    </div>
                    <button className="btn-stripe-cta">
                        {isStripeReady ? 'Ver Extrato' : 'Conectar Banco'}
                    </button>
                </div>

                {/* --- SEÇÃO GERENCIAR EVENTOS --- */}
                <div className="section-header-flex">
                    <h2><FaList className="purple-icon" /> Gerenciar Eventos</h2>
                    <button className="btn-create-event-top" onClick={() => router.push('/admin/new')}>
                        <FaPlus /> Criar Novo Evento
                    </button>
                </div>

                <div className="events-list-container">
                    {myEvents.length === 0 ? (
                        <div className="empty-state-card">Nenhum evento criado.</div>
                    ) : (
                        myEvents.map((event) => (
                            <div key={event.id || event._id} className="event-item-row">
                                <div className="event-item-main">
                                    <img src={event.imageUrl} alt="" className="event-item-img" />
                                    <div className="event-item-details">
                                        <div className="event-item-title-row">
                                            <strong>{event.title}</strong>
                                            {event.highlightStatus === 'paid' && <FaStar className="star-highlight-icon" />}
                                        </div>
                                        <p className="event-item-meta">{new Date(event.date).toLocaleDateString()} • {event.city}</p>
                                        
                                        <div className="badge-flex-row">
                                            <span className={`badge-pill status-${event.status}`}>
                                                {event.status === 'approved' ? 'APROVADO' : 'EM ANÁLISE'}
                                            </span>

                                            {event.highlightStatus === 'approved_waiting_payment' ? (
                                                <a href={event.highlightPaymentLink} target="_blank" className="badge-pill highlight-pay">
                                                    <FaBolt /> PAGAR DESTAQUE
                                                </a>
                                            ) : event.highlightStatus === 'paid' ? (
                                                <span className="badge-pill highlight-active">🌟 DESTAQUE ATIVO</span>
                                            ) : event.status === 'approved' && (
                                                <button className="badge-pill highlight-request" onClick={() => router.push(`/eventos/editar/${event.id || event._id}`)}>
                                                    <FaArrowUp /> SOLICITAR DESTAQUE
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="event-item-actions">
                                    <button className="btn-row-action" onClick={() => router.push(`/eventos/${event.id || event._id}/participantes`)}>
                                        <FaUsers /> Participantes
                                    </button>
                                    {!event.isInformational && (
                                        <button className="btn-row-action" onClick={() => setSelectedEventForManage(event)}>
                                            <FaCog /> Ingressos
                                        </button>
                                    )}
                                    <button className="btn-row-action btn-edit-primary" onClick={() => router.push(`/eventos/editar/${event.id || event._id}`)}>
                                        <FaEdit /> Editar
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>
            <Footer />

            {selectedEventForManage && (
                <ManageSalesModal event={selectedEventForManage} onClose={() => setSelectedEventForManage(null)} onUpdate={fetchAllData} />
            )}
        </div>
    );
};

export default function Dashboard() {
    return <Suspense fallback={<DashboardSkeleton />}><DashboardContent /></Suspense>;
}