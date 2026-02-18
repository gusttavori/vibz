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
    FaMoneyBillWave, FaTicketAlt, FaStar, FaBolt, FaUsers, FaArrowUp
} from 'react-icons/fa';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Dashboard.css';

const getApiBaseUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
};

// --- COMPONENTE SKELETON ---
const DashboardSkeleton = () => (
    <div className="dashboard-container">
        <Header />
        <main className="dashboard-content">
            <div className="dashboard-header">
                <div className="dash-header-text" style={{width: '100%', maxWidth: '250px'}}>
                    <div className="skeleton-text skeleton-pulse" style={{height: '32px', marginBottom: '10px'}}></div>
                    <div className="skeleton-text skeleton-pulse" style={{height: '20px', width: '60%'}}></div>
                </div>
            </div>
            <div className="stats-grid" style={{marginBottom: '30px'}}>
                <div className="skeleton-box skeleton-pulse" style={{height: '120px', borderRadius: '16px'}}></div>
                <div className="skeleton-box skeleton-pulse" style={{height: '120px', borderRadius: '16px'}}></div>
                <div className="skeleton-box skeleton-pulse" style={{height: '120px', borderRadius: '16px'}}></div>
            </div>
            <div className="events-list">
                {[1, 2].map(i => (
                    <div key={i} className="skeleton-box skeleton-pulse" style={{height: '100px', width: '100%', marginBottom: '15px', borderRadius: '16px'}}></div>
                ))}
            </div>
        </main>
        <Footer />
    </div>
);

// --- MODAL DE GERENCIAMENTO DE VENDAS ---
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
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
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
                <div className="modal-header">
                    <h3>Configurar Ingressos</h3>
                    <button className="close-modal-btn" onClick={onClose}><FaTimes /></button>
                </div>
                <div className="modal-body">
                    <div className="ticket-manage-list">
                        {tickets.map(t => (
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
            toast.success("DESTAQUE ATIVADO! 🚀");
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
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
        let totalRevenue = 0;
        let totalTicketsSold = 0;
        myEvents.forEach(event => {
            event.tickets?.forEach(ticket => {
                const sold = parseInt(ticket.sold) || 0;
                let price = Number(ticket.price) || 0;
                totalTicketsSold += sold;
                totalRevenue += (sold * price);
            });
        });
        return { totalRevenue, totalTicketsSold };
    }, [myEvents]);

    if (loading && !stats) return <DashboardSkeleton />;

    const isStripeReady = userData?.stripeAccountId && userData?.stripeOnboardingComplete;

    return (
        <div className="dashboard-container">
            <Toaster position="top-center" />
            <Header />

            <main className="dashboard-content">
                <div className="dashboard-header">
                    <div className="dash-header-text">
                        <h1>Painel do Organizador</h1>
                        <p>Olá, {userData?.name?.split(' ')[0]}</p>
                    </div>
                    <div className="dash-header-actions">
                        <button className="btn-action checkin" onClick={() => router.push('/admin/checkin')}>
                            <FaQrcode /> Validar Ingressos
                        </button>
                        <div className="live-badge"><span className="dot"></span> Online</div>
                    </div>
                </div>

                {/* KPI CARDS */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon revenue"><FaMoneyBillWave /></div>
                        <div className="stat-info">
                            <span className="stat-label">Faturamento Bruto</span>
                            <strong className="stat-value">R$ {metrics.totalRevenue.toFixed(2)}</strong>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon tickets"><FaTicketAlt /></div>
                        <div className="stat-info">
                            <span className="stat-label">Ingressos Vendidos</span>
                            <strong className="stat-value">{metrics.totalTicketsSold}</strong>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon events"><FaCalendarAlt /></div>
                        <div className="stat-info">
                            <span className="stat-label">Meus Eventos</span>
                            <strong className="stat-value">{myEvents.length}</strong>
                        </div>
                    </div>
                </div>

                {/* STRIPE CONNECTION */}
                <div className="wallet-section">
                    <div className={`wallet-card ${isStripeReady ? 'success' : 'warning'}`}>
                        <div className="wallet-icon">
                            {isStripeReady ? <FaCheckCircle /> : <FaExclamationCircle />}
                        </div>
                        <div className="wallet-info">
                            <h3>{isStripeReady ? 'Recebimentos Ativos' : 'Conectar Conta Bancária'}</h3>
                            <p>{isStripeReady ? 'Sua conta Stripe está pronta para receber vendas.' : 'Conecte sua conta para começar a vender ingressos.'}</p>
                        </div>
                        <button className={`btn-wallet ${isStripeReady ? 'outline' : 'primary'}`}>
                            {isStripeReady ? 'Ver Extrato' : 'Conectar'}
                        </button>
                    </div>
                </div>

                <div className="section-header">
                    <h2>Gerenciar Eventos</h2>
                    <button className="btn-new" onClick={() => router.push('/admin/new')}>+ Criar Novo</button>
                </div>

                {/* LISTA DE EVENTOS */}
                <div className="events-list">
                    {myEvents.length === 0 ? (
                        <div className="empty-state">Você ainda não possui eventos criados.</div>
                    ) : (
                        myEvents.map((event) => (
                            <div key={event.id || event._id} className="event-card-dash">
                                <div className="event-info">
                                    <img src={event.imageUrl} alt="" className="event-thumb" />
                                    <div className="event-meta">
                                        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                            <strong>{event.title}</strong>
                                            {event.highlightStatus === 'paid' && <FaStar color="#F59E0B" title="Destaque Ativo" />}
                                        </div>
                                        <span>{new Date(event.date).toLocaleDateString()} • {event.city}</span>
                                        
                                        <div className="status-row" style={{display:'flex', gap:'8px', marginTop:'5px', alignItems:'center'}}>
                                            <span className={`badge ${event.status}`}>{event.status}</span>
                                            
                                            {/* Status de Destaque / Pagamento */}
                                            {event.highlightStatus === 'pending' && <span className="badge highlight-pending">⏳ Análise Destaque</span>}
                                            {event.highlightStatus === 'approved_waiting_payment' && event.highlightPaymentLink && (
                                                <a href={event.highlightPaymentLink} target="_blank" className="badge highlight-pay">
                                                    <FaBolt size={10} /> Pagar Destaque
                                                </a>
                                            )}
                                            {event.highlightStatus === 'paid' && <span className="badge highlight-active">🌟 Destaque Ativo</span>}
                                            
                                            {/* Opção para destacar evento já postado */}
                                            {(!event.highlightStatus || event.highlightStatus === 'none' || event.highlightStatus === 'rejected') && event.status === 'approved' && (
                                                <button className="badge highlight-request" onClick={() => router.push(`/eventos/editar/${event.id || event._id}`)}>
                                                    <FaArrowUp size={10} /> Solicitar Destaque
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="event-actions">
                                    <button className="btn-icon" onClick={() => router.push(`/eventos/${event.id || event._id}/participantes`)} title="Lista de Participantes">
                                        <FaUsers /> Participantes
                                    </button>
                                    {!event.isInformational && (
                                        <button className="btn-icon" onClick={() => setSelectedEventForManage(event)} title="Gerenciar Ingressos">
                                            <FaCog /> Ingressos
                                        </button>
                                    )}
                                    <button className="btn-icon" onClick={() => router.push(`/eventos/editar/${event.id || event._id}`)} title="Editar Evento">
                                        <FaEdit /> Editar
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* GRÁFICO DE VENDAS */}
                {stats?.chartData?.length > 0 && (
                    <div className="chart-section">
                        <h2><FaChartLine /> Desempenho de Vendas (7 dias)</h2>
                        <div className="chart-wrapper">
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={stats.chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                                    <Tooltip contentStyle={{borderRadius: '8px', border:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}} />
                                    <Line type="monotone" dataKey="vendas" stroke="#4C01B5" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {selectedEventForManage && (
                    <ManageSalesModal 
                        event={selectedEventForManage} 
                        onClose={() => setSelectedEventForManage(null)} 
                        onUpdate={fetchAllData}
                    />
                )}
            </main>
            <Footer />
        </div>
    );
};

export default function Dashboard() {
    return (
        <Suspense fallback={<DashboardSkeleton />}>
            <DashboardContent />
        </Suspense>
    );
};