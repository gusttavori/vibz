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

// --- COMPONENTE SKELETON ---
const DashboardSkeleton = () => (
    <div className="dashboard-container">
        <Header />
        <main className="dashboard-content">
            {/* Header Skeleton */}
            <div className="dashboard-header">
                <div className="dash-header-text" style={{width: '100%', maxWidth: '250px'}}>
                    <div className="skeleton-text skeleton-pulse" style={{height: '32px', marginBottom: '10px'}}></div>
                    <div className="skeleton-text skeleton-pulse" style={{height: '20px', width: '60%'}}></div>
                </div>
                <div className="dash-header-actions">
                    <div className="skeleton-box skeleton-pulse" style={{width: '160px', height: '45px'}}></div>
                </div>
            </div>

            {/* Stats Grid Skeleton */}
            <div className="stats-grid" style={{marginBottom: '30px'}}>
                <div className="skeleton-box skeleton-pulse" style={{height: '120px', borderRadius: '16px'}}></div>
                <div className="skeleton-box skeleton-pulse" style={{height: '120px', borderRadius: '16px'}}></div>
                <div className="skeleton-box skeleton-pulse" style={{height: '120px', borderRadius: '16px'}}></div>
            </div>

            {/* Wallet Skeleton */}
            <div className="wallet-section">
                <div className="skeleton-box skeleton-pulse" style={{height: '140px', borderRadius: '16px', width: '100%'}}></div>
            </div>

            {/* Events List Skeleton */}
            <div className="events-list" style={{marginTop: '30px'}}>
                <div className="skeleton-text skeleton-pulse" style={{width: '200px', height: '28px', marginBottom: '20px'}}></div>
                {[1, 2].map(i => (
                    <div key={i} className="event-card-dash" style={{gap: '20px', marginBottom: '15px'}}>
                        <div className="skeleton-box skeleton-pulse" style={{width: '60px', height: '60px', borderRadius: '10px', flexShrink: 0}}></div>
                        <div style={{flex: 1, minWidth: 0}}>
                            <div className="skeleton-text skeleton-pulse" style={{width: '70%', height: '20px', marginBottom: '8px'}}></div>
                            <div className="skeleton-text skeleton-pulse" style={{width: '40%', height: '16px'}}></div>
                        </div>
                    </div>
                ))}
            </div>
        </main>
        <Footer />
    </div>
);

// --- MODAL DE GERENCIAMENTO ---
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
                const updatedTickets = tickets.map(t => 
                    (t.id === ticketId || t._id === ticketId) ? { ...t, status: newStatus } : t
                );
                setTickets(updatedTickets);
                
                if (newStatus === 'active') {
                    toast.success('Vendas Ativadas!', { icon: '🟢' });
                } else {
                    toast.success('Vendas Pausadas', { icon: '🔴' });
                }
                
                if (onUpdate) onUpdate(); 
            } else {
                toast.error('Erro ao atualizar status.');
            }
        } catch (error) {
            toast.error('Erro de conexão.');
        } finally {
            setLoadingId(null);
        }
    };

    return (
        <div className="modal-overlay" onClick={(e) => { if(e.target === e.currentTarget) onClose(); }}>
            <div className="modal-box">
                <div className="modal-header">
                    <h3>Gerenciar Vendas</h3>
                    <button className="close-modal-btn" onClick={onClose}><FaTimes /></button>
                </div>
                
                <div className="modal-body">
                    <p className="modal-subtitle">Controle a disponibilidade dos ingressos de <strong>{event.title}</strong> em tempo real.</p>
                    
                    <div className="ticket-manage-list">
                        {tickets.length > 0 ? (
                            tickets.map(t => {
                                const tId = t.id || t._id;
                                const isActive = t.status === 'active';
                                const isLoading = loadingId === tId;

                                return (
                                    <div key={tId} className="ticket-manage-item">
                                        <div className="ticket-info">
                                            <strong>{t.name}</strong>
                                            <span>
                                                {t.sold || 0} / {t.quantity} vendidos • {t.batch || t.batchName}
                                            </span>
                                        </div>
                                        <div className="switch-wrapper">
                                            <span className={`status-label ${isActive ? 'active' : 'paused'}`}>
                                                {isLoading ? '...' : (isActive ? 'ON' : 'OFF')}
                                            </span>
                                            <label className="switch">
                                                <input 
                                                    type="checkbox" 
                                                    checked={isActive} 
                                                    onChange={() => handleToggle(t)} 
                                                    disabled={isLoading}
                                                />
                                                <span className="slider"></span>
                                            </label>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="empty-modal-state">Nenhum ingresso encontrado.</div>
                        )}
                    </div>
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
    const API_BASE_URL = getApiBaseUrl();
    
    const [stats, setStats] = useState(null);
    const [userData, setUserData] = useState(null);
    const [myEvents, setMyEvents] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [connectionError, setConnectionError] = useState(false);
    const [selectedEventForManage, setSelectedEventForManage] = useState(null);

    useEffect(() => {
        const stripeStatus = searchParams.get('stripe');
        if (stripeStatus === 'success') {
            toast.success("CONTA BANCÁRIA CONECTADA! 🚀");
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
            router.replace('/dashboard'); 
        }
        
        // Novo: Feedback de pagamento de destaque
        const success = searchParams.get('success');
        if (success === 'highlight') {
            toast.success("Destaque ativado com sucesso! 🌟");
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
            router.replace('/dashboard');
        }
    }, [searchParams, router]);

    const fetchAllData = useCallback(async () => {
        setLoading(true);
        setConnectionError(false);
        const token = localStorage.getItem('userToken')?.replace(/"/g, '');

        if (!token) {
            router.push('/login');
            return;
        }

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
                const list = Array.isArray(data.myEvents) ? data.myEvents : (Array.isArray(data) ? data : []);
                setMyEvents(list);
            }

        } catch (error) {
            console.error(error);
            setConnectionError(true);
        } finally {
            setLoading(false);
        }
    }, [API_BASE_URL, router]);

    useEffect(() => { fetchAllData(); }, []);

    // --- CÁLCULO DE MÉTRICAS FINANCEIRAS ---
    const financialMetrics = useMemo(() => {
        let totalRevenue = 0;
        let totalTicketsSold = 0;
        let activeEventsCount = 0;

        if (Array.isArray(myEvents)) {
            myEvents.forEach(event => {
                if (event.status === 'approved' || event.status === 'active') {
                    activeEventsCount++;
                }

                if (event.tickets && Array.isArray(event.tickets)) {
                    event.tickets.forEach(ticket => {
                        const sold = parseInt(ticket.sold) || 0;
                        let price = ticket.price;
                        
                        if (typeof price === 'string') {
                            price = parseFloat(price.replace(',', '.'));
                        }
                        price = Number(price);
                        if (isNaN(price)) price = 0;
                        
                        totalTicketsSold += sold;
                        totalRevenue += (sold * price);
                    });
                }
            });
        }

        return {
            totalRevenue,
            totalTicketsSold,
            activeEventsCount
        };
    }, [myEvents]);

    const formatCurrency = (value) => {
        try {
            return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
        } catch (e) {
            return 'R$ 0,00';
        }
    };

    const formatText = (text) => text?.toString().replace(/(\d+)\s*[oO°]/g, '$1º').replace(/(\d+)\s*[aAª]/g, '$1ª') || '';
    const formatDate = (date) => date ? new Date(date).toLocaleDateString('pt-BR') : '';
    const getStatusLabel = (s) => ({ approved: 'Aprovado', pending: 'Em Análise', rejected: 'Rejeitado' }[s?.toLowerCase()] || s);

    if (loading && !stats) return <DashboardSkeleton />;

    if (connectionError) {
        return (
            <div className="dashboard-container">
                <Header />
                <div className="error-state-container">
                    <FaWifi size={50} color="#cbd5e1" />
                    <h2>Sem conexão</h2>
                    <button className="btn-retry" onClick={fetchAllData}><FaSync /> Tentar Novamente</button>
                </div>
                <Footer />
            </div>
        );
    }

    const isStripeReady = userData?.stripeAccountId && userData?.stripeOnboardingComplete;

    return (
        <div className="dashboard-container">
            <Toaster position="top-center" />
            <Header />

            <main className="dashboard-content">
                {/* HEADER */}
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

                {/* --- STATS GRID (ESTATÍSTICAS) --- */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon revenue"><FaMoneyBillWave /></div>
                        <div className="stat-info">
                            <span className="stat-label">Faturamento Bruto</span>
                            <strong className="stat-value">{formatCurrency(financialMetrics.totalRevenue)}</strong>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon tickets"><FaTicketAlt /></div>
                        <div className="stat-info">
                            <span className="stat-label">Ingressos Vendidos</span>
                            <strong className="stat-value">{financialMetrics.totalTicketsSold}</strong>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon events"><FaCalendarAlt /></div>
                        <div className="stat-info">
                            <span className="stat-label">Eventos Ativos</span>
                            <strong className="stat-value">{financialMetrics.activeEventsCount}</strong>
                        </div>
                    </div>
                </div>

                {/* STATUS FINANCEIRO */}
                <div className="wallet-section">
                    <div className={`wallet-card ${isStripeReady ? 'success' : 'warning'}`}>
                        <div className="wallet-icon">
                            {isStripeReady ? <FaCheckCircle /> : <FaExclamationCircle />}
                        </div>
                        <div className="wallet-info">
                            <h3>{isStripeReady ? 'Conta Conectada' : 'Ativar Recebimentos'}</h3>
                            <p>{isStripeReady ? 'Pronto para receber vendas.' : 'Conecte sua conta bancária.'}</p>
                        </div>
                        <button className={`btn-wallet ${isStripeReady ? 'outline' : 'primary'}`}>
                            {isStripeReady ? 'Ver Extrato' : 'Conectar'}
                        </button>
                    </div>
                </div>

                {/* LISTA DE EVENTOS */}
                <div className="section-header">
                    <h2><FaCalendarAlt /> Meus Eventos</h2>
                    <button className="btn-new" onClick={() => router.push('/admin/new')}>+ Criar Novo</button>
                </div>

                <div className="events-list">
                    {myEvents.length === 0 ? (
                        <div className="empty-state">Você ainda não criou nenhum evento.</div>
                    ) : (
                        myEvents.map((event) => (
                            <div key={event.id || event._id} className="event-card-dash">
                                <div className="event-info">
                                    <img src={event.imageUrl} alt="" className="event-thumb" />
                                    <div className="event-meta">
                                        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                            <strong>{formatText(event.title)}</strong>
                                            {/* Badge Destaque Ativo */}
                                            {event.highlightStatus === 'paid' && (
                                                <span title="Destaque Ativo" style={{color: '#F59E0B'}}><FaStar /></span>
                                            )}
                                        </div>
                                        <span>{formatDate(event.date)} • {event.city}</span>
                                        
                                        <div className="status-row" style={{display:'flex', gap:'8px', marginTop:'5px', alignItems:'center'}}>
                                            <span className={`badge ${event.status}`}>{getStatusLabel(event.status)}</span>
                                            
                                            {/* --- STATUS DE DESTAQUE --- */}
                                            {event.highlightStatus === 'pending' && (
                                                <span className="badge highlight-pending">⏳ Análise Destaque</span>
                                            )}
                                            
                                            {/* BOTÃO DE PAGAR DESTAQUE */}
                                            {event.highlightStatus === 'approved_waiting_payment' && event.highlightPaymentLink && (
                                                <a 
                                                    href={event.highlightPaymentLink} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="badge highlight-pay"
                                                    title="Clique para pagar e ativar o destaque"
                                                    style={{
                                                        backgroundColor: '#2563EB', 
                                                        color: 'white', 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        gap: '5px',
                                                        textDecoration: 'none',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <FaBolt size={10} /> Pagar Destaque
                                                </a>
                                            )}

                                            {event.highlightStatus === 'paid' && (
                                                <span className="badge highlight-active" style={{background: '#ECFDF5', color: '#059669'}}>
                                                    🌟 Destaque Ativo
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="event-actions">
                                    {!event.isInformational && (
                                        <button className="btn-icon" onClick={() => setSelectedEventForManage(event)} title="Gerenciar Vendas">
                                            <FaCog /> Gerenciar
                                        </button>
                                    )}
                                    <button className="btn-icon" onClick={() => router.push(`/eventos/${event.id}/participantes`)}>
                                        <FaList /> Lista
                                    </button>
                                    <button className="btn-icon" onClick={() => router.push(`/eventos/editar/${event.id}`)}>
                                        <FaEdit /> Editar
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* GRÁFICO */}
                {stats?.chartData?.length > 0 && (
                    <div className="chart-section">
                        <h2><FaChartLine /> Vendas (7 dias)</h2>
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

                {/* MODAL */}
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