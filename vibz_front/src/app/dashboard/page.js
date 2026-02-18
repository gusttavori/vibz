'use client';

import React, { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import toast, { Toaster } from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { 
    FaCheckCircle, FaExclamationCircle, FaCalendarAlt, FaEdit, 
    FaWifi, FaSync, FaList, FaQrcode, FaCog, FaTimes, FaChartLine,
    FaMoneyBillWave, FaTicketAlt, FaStar, FaBolt
} from 'react-icons/fa';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Dashboard.css';

const getApiBaseUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
};

const DashboardSkeleton = () => (
    <div className="dashboard-container">
        <Header />
        <main className="dashboard-content">
            <div className="dashboard-header"><div className="dash-header-text" style={{width: '250px'}}><div className="skeleton-text skeleton-pulse" style={{height: '32px'}}></div></div></div>
            <div className="stats-grid"><div className="skeleton-box skeleton-pulse" style={{height: '100px'}}></div><div className="skeleton-box skeleton-pulse" style={{height: '100px'}}></div><div className="skeleton-box skeleton-pulse" style={{height: '100px'}}></div></div>
        </main>
        <Footer />
    </div>
);

const ManageSalesModal = ({ event, onClose, onUpdate }) => {
    const [tickets, setTickets] = useState(event.tickets || []);
    const [loadingId, setLoadingId] = useState(null);
    const API_BASE_URL = getApiBaseUrl();

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
            <div className="modal-box">
                <div className="modal-header"><h3>Gerenciar Vendas</h3><button className="close-modal-btn" onClick={onClose}><FaTimes /></button></div>
                <div className="modal-body">
                    <div className="ticket-manage-list">
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
                </div>
            </div>
        </div>
    );
};

const DashboardContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const API_BASE_URL = getApiBaseUrl();
    
    const [stats, setStats] = useState(null);
    const [userData, setUserData] = useState(null);
    const [myEvents, setMyEvents] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [connectionError, setConnectionError] = useState(false);
    const [selectedEventForManage, setSelectedEventForManage] = useState(null);

    useEffect(() => {
        if (searchParams.get('stripe') === 'success') toast.success("CONTA CONECTADA!");
        if (searchParams.get('success') === 'highlight') {
            toast.success("Destaque ativado!");
            confetti({ particleCount: 150, spread: 70 });
            router.replace('/dashboard');
        }
    }, [searchParams, router]);

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
        } catch (error) { setConnectionError(true); } 
        finally { setLoading(false); }
    }, [API_BASE_URL, router]);

    useEffect(() => { fetchAllData(); }, [fetchAllData]);

    const metrics = useMemo(() => {
        let revenue = 0, sold = 0;
        myEvents.forEach(ev => ev.tickets?.forEach(t => {
            sold += (t.sold || 0);
            revenue += (t.sold || 0) * (t.price || 0);
        }));
        return { revenue, sold };
    }, [myEvents]);

    if (loading && !stats) return <DashboardSkeleton />;
    if (connectionError) return <div className="dashboard-container"><Header /><div className="error-state-container"><h2>Sem conexão</h2><button onClick={fetchAllData}>Tentar</button></div></div>;

    const isStripeReady = userData?.stripeAccountId && userData?.stripeOnboardingComplete;

    return (
        <div className="dashboard-container">
            <Toaster position="top-center" />
            <Header />

            <main className="dashboard-content">
                <div className="dashboard-header">
                    <div className="dash-header-text"><h1>Olá, {userData?.name?.split(' ')[0]}</h1><p>Gerencie seus eventos e vendas.</p></div>
                    <button className="btn-action checkin" onClick={() => router.push('/admin/checkin')}><FaQrcode /> Validar Ingressos</button>
                </div>

                <div className="stats-grid">
                    <div className="stat-card"><div className="stat-icon revenue"><FaMoneyBillWave /></div><div className="stat-info"><span>Faturamento</span><strong>R$ {metrics.revenue.toFixed(2)}</strong></div></div>
                    <div className="stat-card"><div className="stat-icon tickets"><FaTicketAlt /></div><div className="stat-info"><span>Ingressos</span><strong>{metrics.sold} vendidos</strong></div></div>
                    <div className="stat-card"><div className="stat-icon events"><FaCalendarAlt /></div><div className="stat-info"><span>Eventos</span><strong>{myEvents.length} ativos</strong></div></div>
                </div>

                <div className="wallet-section">
                    <div className={`wallet-card ${isStripeReady ? 'success' : 'warning'}`}>
                        <div className="wallet-icon">{isStripeReady ? <FaCheckCircle /> : <FaExclamationCircle />}</div>
                        <div className="wallet-info"><h3>{isStripeReady ? 'Pagamentos Ativos' : 'Conectar Banco'}</h3><p>{isStripeReady ? 'Sua conta Stripe está pronta.' : 'Você precisa conectar o banco para receber.'}</p></div>
                        <button className="btn-wallet">{isStripeReady ? 'Ver Extrato' : 'Conectar Agora'}</button>
                    </div>
                </div>

                <div className="section-header"><h2>Meus Eventos</h2><button className="btn-new" onClick={() => router.push('/admin/new')}>+ Criar Evento</button></div>

                <div className="events-list">
                    {myEvents.map((event) => (
                        <div key={event.id || event._id} className="event-card-dash">
                            <div className="event-info">
                                <img src={event.imageUrl} alt="" className="event-thumb" />
                                <div className="event-meta">
                                    <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                                        <strong>{event.title}</strong>
                                        {event.highlightStatus === 'paid' && <FaStar color="#F59E0B" />}
                                    </div>
                                    <small>{new Date(event.date).toLocaleDateString()} • {event.city}</small>
                                    
                                    <div className="status-row" style={{marginTop:'8px', display:'flex', gap:'8px'}}>
                                        <span className={`badge ${event.status}`}>{event.status}</span>
                                        
                                        {/* --- LÓGICA DE DESTAQUE --- */}
                                        {event.highlightStatus === 'pending' && <span className="badge highlight-pending">⏳ Análise Destaque</span>}
                                        
                                        {event.highlightStatus === 'approved_waiting_payment' && event.highlightPaymentLink && (
                                            <a href={event.highlightPaymentLink} target="_blank" className="badge highlight-pay" style={{background: '#2563EB', color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px'}}>
                                                <FaBolt size={10} /> Pagar Destaque
                                            </a>
                                        )}

                                        {event.highlightStatus === 'paid' && <span className="badge highlight-active" style={{background: '#ECFDF5', color: '#059669'}}>🌟 Destaque Ativo</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="event-actions">
                                {!event.isInformational && <button className="btn-icon" onClick={() => setSelectedEventForManage(event)}><FaCog /></button>}
                                <button className="btn-icon" onClick={() => router.push(`/eventos/editar/${event.id || event._id}`)}><FaEdit /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {selectedEventForManage && (
                <ManageSalesModal event={selectedEventForManage} onClose={() => setSelectedEventForManage(null)} onUpdate={fetchAllData} />
            )}
            <Footer />
        </div>
    );
};

export default function Dashboard() {
    return <Suspense fallback={<DashboardSkeleton />}><DashboardContent /></Suspense>;
};