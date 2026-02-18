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
                toast.success(newStatus === 'active' ? 'Vendas Ativadas!' : 'Vendas Pausadas', { icon: newStatus === 'active' ? '🟢' : '🔴' });
                if (onUpdate) onUpdate(); 
            }
        } catch (error) { toast.error('Erro de conexão.'); } 
        finally { setLoadingId(null); }
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-box animate-pop-in">
                <div className="modal-header">
                    <h3>Gerenciar Ingressos: {event.title}</h3>
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
                    )) : <div className="empty-state-modal">Nenhum ingresso configurado para este evento.</div>}
                </div>
                <div className="modal-footer">
                 <button className="btn-modal-close" onClick={onClose}>Concluir</button>
                </div>
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

            if (userRes.ok) setUserData(await userRes.json());
            if (statsRes.ok) setStats(await statsRes.json());
            if (eventsRes.ok) {
                const data = await eventsRes.json();
                setMyEvents(data.myEvents || []);
            }
        } catch (error) { console.error("Erro ao carregar dashboard:", error); } 
        finally { setLoading(false); }
    }, [router]);

    useEffect(() => {
        fetchAllData();
        if (searchParams.get('success') === 'highlight') {
            toast.success("Destaque Ativado com Sucesso! 🚀", { duration: 5000 });
            confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
            router.replace('/dashboard');
        }
        if (searchParams.get('stripe') === 'success') {
             toast.success("Conta Bancária Conectada! 🎉", { duration: 5000 });
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
            <Toaster position="top-center" toastOptions={{ style: { fontFamily: 'Urbanist, sans-serif', fontWeight: 600 } }} />
            <Header />

            <main className="dashboard-content">
                {/* TOPO: STATUS E HEADER */}
                <div className="dashboard-top-bar">
                    <div className="dashboard-header">
                        <div className="dash-header-text">
                            <h1>Painel do Organizador</h1>
                             {/* CORREÇÃO: Adicionado fallback para o nome */}
                            <p className="greeting-text">Olá, {userData?.name ? userData.name.split(' ')[0] : 'Organizador'} 👋</p>
                        </div>
                    </div>
                    
                    <div className="top-actions-container">
                        <div className="live-status-badge">
                            <div className="pulse-container"><div className="dot"></div><div className="pulse"></div></div>
                            SISTEMA ONLINE
                        </div>
                        <button className="btn-checkin-header" onClick={() => router.push('/admin/checkin')}>
                            <FaQrcode /> Validar Ingressos
                        </button>
                    </div>
                </div>

                {/* KPI GRID */}
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

                {/* STRIPE CARD - REFORMULADO */}
                <div className={`stripe-setup-card ${isStripeReady ? 'ready-state' : 'warning-state'}`}>
                    <div className="stripe-content-wrapper">
                        <div className="stripe-icon-box">
                            {isStripeReady ? <FaCheckCircle /> : <FaExclamationCircle />}
                        </div>
                        <div className="stripe-text">
                            <h3>{isStripeReady ? 'Conta Bancária Conectada' : 'Configure seus Recebimentos'}</h3>
                            <p>{isStripeReady ? 'Sua conta está pronta para receber transferências automáticas das vendas.' : 'É necessário conectar sua conta Stripe para receber o saldo das vendas dos ingressos.'}</p>
                        </div>
                    </div>
                    <button className="btn-stripe-action">
                        {isStripeReady ? 'Ver Extrato Financeiro' : 'Conectar Conta Agora'}
                    </button>
                </div>

                {/* TÍTULO DA SEÇÃO E BOTÃO CRIAR NOVO */}
                <div className="section-title-row">
                    <h2><FaList className="title-icon"/> Gerenciar Eventos</h2>
                    <button className="btn-primary-new" onClick={() => router.push('/admin/new')}>
                        <FaPlus /> Criar Novo Evento
                    </button>
                </div>

                {/* LISTA DE EVENTOS */}
                <div className="events-list-wrapper">
                    {myEvents.length === 0 ? (
                        <div className="empty-dashboard-state">
                            <FaCalendarAlt size={40} color="#cbd5e1" />
                            <h3>Nenhum evento criado ainda.</h3>
                            <p>Comece a vender criando seu primeiro evento agora!</p>
                            <button className="btn-primary-new mt-4" onClick={() => router.push('/admin/new')}>Criar Evento</button>
                        </div>
                    ) : (
                        myEvents.map((event) => (
                            <div key={event.id || event._id} className="event-row-card">
                                <div className="event-main-content">
                                    <img src={event.imageUrl} alt="" className="event-row-img" />
                                    <div className="event-row-details">
                                        <div className="event-row-title-area">
                                            <strong>{event.title}</strong>
                                            {event.highlightStatus === 'paid' && <FaStar className="star-icon-active" title="Destaque Ativo" />}
                                        </div>
                                        <p className="event-date-loc"><FaCalendarAlt size={12}/> {new Date(event.date).toLocaleDateString()} • {event.city}</p>
                                        
                                        <div className="badge-container">
                                            <span className={`badge-pill status-${event.status}`}>
                                                {event.status === 'approved' ? 'APROVADO' : event.status === 'pending' ? 'EM ANÁLISE' : 'REJEITADO'}
                                            </span>

                                            {event.highlightStatus === 'approved_waiting_payment' && event.highlightPaymentLink && (
                                                <a href={event.highlightPaymentLink} target="_blank" className="badge-pill highlight-pay">
                                                    <FaBolt /> PAGAR DESTAQUE
                                                </a>
                                            )}
                                            
                                            {event.highlightStatus === 'paid' && (
                                                <span className="badge-pill highlight-active">🌟 DESTAQUE ATIVO</span>
                                            )}

                                            {/* Botão para solicitar destaque se aprovado e sem destaque */}
                                            {(!event.highlightStatus || event.highlightStatus === 'none') && event.status === 'approved' && (
                                                <button className="badge-pill highlight-request" onClick={() => router.push(`/eventos/editar/${event.id || event._id}`)}>
                                                    <FaArrowUp /> SOLICITAR DESTAQUE
                                                </button>
                                            )}
                                             {event.highlightStatus === 'pending' && <span className="badge-pill highlight-pending">⏳ ANÁLISE DESTAQUE</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="event-row-actions">
                                    <button className="btn-row-action secondary" onClick={() => router.push(`/eventos/${event.id || event._id}/participantes`)} title="Ver Participantes">
                                        <FaUsers size={16} /> <span className="btn-label">Participantes</span>
                                    </button>
                                    {!event.isInformational && (
                                        <button className="btn-row-action secondary" onClick={() => setSelectedEventForManage(event)} title="Gerenciar Ingressos">
                                            <FaCog size={16} /> <span className="btn-label">Ingressos</span>
                                        </button>
                                    )}
                                    <button className="btn-row-action primary-outline" onClick={() => router.push(`/eventos/editar/${event.id || event._id}`)} title="Editar Evento">
                                        <FaEdit size={16} /> <span className="btn-label">Editar</span>
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