'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import toast, { Toaster } from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { 
    FaMoneyBillWave, FaTicketAlt, FaUserCheck, FaChartLine, 
    FaRegClock, FaCheckCircle, FaExclamationCircle,
    FaCalendarAlt, FaEdit, FaWifi, FaSync, FaList, FaQrcode
} from 'react-icons/fa';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Dashboard.css';

const getApiBaseUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
};

const DashboardContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const API_BASE_URL = getApiBaseUrl();
    
    const [stats, setStats] = useState(null);
    const [userData, setUserData] = useState(null);
    const [myEvents, setMyEvents] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [loadingStripe, setLoadingStripe] = useState(false);
    const [connectionError, setConnectionError] = useState(false);
    
    // Estado para controlar qual switch está carregando (id do ticket)
    const [loadingTicketId, setLoadingTicketId] = useState(null);

    useEffect(() => {
        const stripeStatus = searchParams.get('stripe');
        if (stripeStatus === 'success') {
            toast.success("CONTA BANCÁRIA CONECTADA! 🚀", {
                duration: 5000,
                style: { background: '#10b981', color: '#fff', fontWeight: 'bold' }
            });
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
            console.log("Buscando dados do dashboard...");
            const [userRes, statsRes, eventsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/users/me`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/dashboard/stats`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/dashboard/events`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (userRes.ok) {
                const userDataResponse = await userRes.json();
                setUserData(userDataResponse.user || userDataResponse);
            }

            if (statsRes.ok) {
                const data = await statsRes.json();
                setStats(data);
            }

            if (eventsRes.ok) {
                const data = await eventsRes.json();
                console.log("Eventos recebidos (API):", data); 
                
                const eventsList = Array.isArray(data.myEvents) ? data.myEvents : (Array.isArray(data) ? data : []);
                setMyEvents(eventsList);

                // Debug: Mostra no console se algum evento veio sem tickets
                eventsList.forEach(ev => {
                    if (!ev.tickets || ev.tickets.length === 0) {
                        console.warn(`⚠️ Evento "${ev.title}" (ID: ${ev.id}) veio sem ingressos. Verifique se o Backend foi reiniciado.`);
                    }
                });

            } else {
                console.error("Erro API Eventos:", await eventsRes.text());
                toast.error("Erro ao carregar eventos.");
            }

        } catch (error) {
            console.error("Erro Dashboard Fetch:", error);
            setConnectionError(true);
            toast.error("Erro de conexão.");
        } finally {
            setLoading(false);
        }
    }, [API_BASE_URL, router]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    // --- FUNÇÃO DE TOGGLE (DIRETA NO CARD) ---
    const handleTicketToggle = async (ticket) => {
        const ticketId = ticket.id || ticket._id;
        const currentStatus = ticket.status;
        const newStatus = currentStatus === 'active' ? 'paused' : 'active';
        
        setLoadingTicketId(ticketId);
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

            const data = await res.json();

            if (res.ok) {
                // Atualiza o estado local instantaneamente
                setMyEvents(prevEvents => prevEvents.map(ev => {
                    if (ev.tickets && ev.tickets.some(t => (t.id === ticketId || t._id === ticketId))) {
                        return {
                            ...ev,
                            tickets: ev.tickets.map(t => 
                                (t.id === ticketId || t._id === ticketId) ? { ...t, status: newStatus } : t
                            )
                        };
                    }
                    return ev;
                }));

                if (newStatus === 'active') {
                    toast.success('Vendas Ativadas! 🟢');
                } else {
                    toast.success('Vendas Pausadas 🔴');
                }
            } else {
                console.error("Erro API:", data);
                toast.error(data.message || 'Erro ao alterar status.');
            }
        } catch (error) {
            console.error("Erro Network:", error);
            toast.error('Erro de conexão.');
        } finally {
            setLoadingTicketId(null);
        }
    };

    const formatText = (text) => {
        if (!text) return '';
        return text.toString().replace(/(\d+)\s*[oO°]/g, '$1º').replace(/(\d+)\s*[aAª]/g, '$1ª');
    };

    const getStatusLabel = (status) => {
        if (!status) return '';
        const s = status.toLowerCase();
        if (s === 'approved') return 'Aprovado';
        if (s === 'pending') return 'Em Análise';
        if (s === 'rejected') return 'Rejeitado';
        return status;
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        try { return new Date(dateString).toLocaleDateString('pt-BR'); } catch (e) { return ''; }
    };

    // Placeholders
    const handleConnectStripe = async () => { setLoadingStripe(true); setTimeout(() => setLoadingStripe(false), 2000); };
    const handleAccessStripeDashboard = async () => { setLoadingStripe(true); setTimeout(() => setLoadingStripe(false), 2000); };

    if (loading) return <div className="loading-screen">Carregando Painel...</div>;

    if (connectionError) {
        return (
            <div className="dashboard-container">
                <Header />
                <div className="error-state-container">
                    <FaWifi className="error-icon-large" />
                    <h2>Sem conexão com o servidor</h2>
                    <button className="btn-retry" onClick={fetchAllData}><FaSync /> Tentar Novamente</button>
                </div>
                <Footer />
            </div>
        );
    }

    const chartData = stats?.chartData?.length > 0 ? stats.chartData : [];
    const isStripeReady = userData?.stripeAccountId && userData?.stripeOnboardingComplete;

    return (
        <div className="dashboard-container">
            <Toaster position="top-center" />
            <Header />

            <main className="dashboard-content">
                <div className="dashboard-header">
                    <div>
                        <h1>Painel do Organizador</h1>
                        <p>Bem-vindo, {userData?.name}</p>
                    </div>
                    <div className="header-actions-dash">
                        <button className="btn-checkin" onClick={() => router.push('/admin/checkin')}>
                            <FaQrcode /> Validar Ingressos
                        </button>
                        <div className="live-indicator"><span className="dot"></span> Online</div>
                    </div>
                </div>

                <div className="wallet-section-dashboard">
                    {isStripeReady ? (
                        <div className="wallet-card success">
                            <div className="wallet-icon"><FaCheckCircle /></div>
                            <div className="wallet-info">
                                <h3>Conta Pronta</h3>
                                <p>Tudo pronto para receber pagamentos.</p>
                            </div>
                            <button className="wallet-btn outline" onClick={handleAccessStripeDashboard} disabled={loadingStripe}>
                                {loadingStripe ? 'Carregando...' : 'Ver Saldo e Extrato'}
                            </button>
                        </div>
                    ) : (
                        <div className="wallet-card warning">
                            <div className="wallet-icon"><FaExclamationCircle /></div>
                            <div className="wallet-info">
                                <h3>Ativar Recebimentos</h3>
                                <p>Conecte sua conta bancária para receber.</p>
                            </div>
                            <button className="wallet-btn primary" onClick={handleConnectStripe}>Conectar</button>
                        </div>
                    )}
                </div>

                {stats && (
                    <div className="dashboard-sections">
                        <div className="events-management-section">
                            <div className="section-header-dash">
                                <h2><FaCalendarAlt /> Meus Eventos</h2>
                                <button className="btn-new-event" onClick={() => router.push('/admin/new')}>Criar Novo</button>
                            </div>
                            
                            <div className="events-list-dash">
                                {myEvents.length === 0 ? (
                                    <div className="empty-state-sales"><p>Nenhum evento criado.</p></div>
                                ) : (
                                    myEvents.map((event) => (
                                        <div key={event.id || event._id} className="event-row-dash">
                                            {/* Topo do Card: Imagem e Info */}
                                            <div className="event-main-info">
                                                <img src={event.imageUrl} alt={event.title} className="event-thumb" />
                                                <div className="event-details-text">
                                                    <strong>{formatText(event.title)}</strong>
                                                    <span>{formatDate(event.date)} • {event.city}</span>
                                                    <span className={`status-badge ${event.status}`}>
                                                        {getStatusLabel(event.status)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* ÁREA DE INGRESSOS (DIRETO NO CARD) */}
                                            {!event.isInformational && (
                                                <div className="tickets-direct-list">
                                                    <div className="tickets-title">Gerenciar Vendas</div>
                                                    
                                                    {event.tickets && event.tickets.length > 0 ? (
                                                        event.tickets.map(ticket => {
                                                            const tId = ticket.id || ticket._id;
                                                            const isActive = ticket.status === 'active';
                                                            const isTicketLoading = loadingTicketId === tId;

                                                            return (
                                                                <div key={tId} className="ticket-direct-item">
                                                                    <div className="ticket-name-info">
                                                                        <strong>{ticket.name}</strong>
                                                                        <span className="ticket-sales-info">
                                                                            {ticket.sold || 0} / {ticket.quantity} vendidos • {ticket.batch || ticket.batchName}
                                                                        </span>
                                                                    </div>
                                                                    
                                                                    <div className="switch-wrapper">
                                                                        <span className={`switch-label ${isActive ? 'label-active' : 'label-paused'}`}>
                                                                            {isTicketLoading ? '...' : (isActive ? 'VENDENDO' : 'PAUSADO')}
                                                                        </span>
                                                                        <label className="switch">
                                                                            <input 
                                                                                type="checkbox" 
                                                                                checked={isActive}
                                                                                onChange={() => handleTicketToggle(ticket)}
                                                                                disabled={isTicketLoading}
                                                                            />
                                                                            <span className="slider"></span>
                                                                        </label>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    ) : (
                                                        <div style={{fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic', padding:'10px', background: '#f1f5f9', borderRadius: '8px', textAlign: 'center'}}>
                                                            Nenhum ingresso encontrado. 
                                                            <br/><small>(Se você tem ingressos criados, reinicie o backend para atualizar a API)</small>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Ações do Card (Sem o botão Gerenciar) */}
                                            <div className="event-card-actions">
                                                <button 
                                                    className="btn-participants-dash" 
                                                    onClick={() => router.push(`/eventos/${event.id}/participantes`)}
                                                >
                                                    <FaList /> Participantes
                                                </button>
                                                <button className="btn-edit-dash" onClick={() => router.push(`/eventos/editar/${event.id}`)}>
                                                    <FaEdit /> Editar
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* GRÁFICOS */}
                        <div className="chart-section">
                            <h2><FaChartLine /> Vendas (7 dias)</h2>
                            <div className="chart-wrapper">
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#888'}} />
                                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#888'}} />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="vendas" stroke="#4C01B5" strokeWidth={3} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
};

export default function Dashboard() {
    return (
        <Suspense fallback={<div className="loading-screen">Carregando painel...</div>}>
            <DashboardContent />
        </Suspense>
    );
}