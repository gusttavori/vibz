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
    FaCalendarAlt, FaEdit, FaWifi, FaSync, FaList, FaQrcode, FaCog, FaTimes
} from 'react-icons/fa';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Dashboard.css';

const getApiBaseUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
};

// --- COMPONENTE DO MODAL (POP-UP) ---
const ManageSalesModal = ({ event, onClose, onUpdate }) => {
    // Inicializa o estado com os tickets passados pelo evento
    const [tickets, setTickets] = useState(event.tickets || []);
    const [loadingId, setLoadingId] = useState(null);
    const API_BASE_URL = getApiBaseUrl();

    const handleToggle = async (ticket) => {
        const ticketId = ticket.id || ticket._id;
        setLoadingId(ticketId);
        
        // Lógica: Se está 'active', muda para 'paused'. Se não, muda para 'active'.
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

            const data = await res.json();

            if (res.ok) {
                // Atualiza o estado local do modal imediatamente
                const updatedTickets = tickets.map(t => 
                    (t.id === ticketId || t._id === ticketId) ? { ...t, status: newStatus } : t
                );
                setTickets(updatedTickets);
                
                if (newStatus === 'active') {
                    toast.success('Vendas Ativadas! 🟢', { style: { borderRadius: '10px', background: '#333', color: '#fff' } });
                } else {
                    toast.success('Vendas Pausadas 🔴', { style: { borderRadius: '10px', background: '#333', color: '#fff' } });
                }
                
                // Atualiza o painel principal
                if (onUpdate) onUpdate(); 
            } else {
                console.error("Erro API:", data);
                toast.error(data.message || 'Erro ao atualizar status.');
            }
        } catch (error) {
            console.error("Erro Conexão:", error);
            toast.error('Erro de conexão.');
        } finally {
            setLoadingId(null);
        }
    };

    return (
        <div className="modal-overlay" onClick={(e) => { if(e.target === e.currentTarget) onClose(); }}>
            <div className="modal-content">
                <div className="modal-header">
                    <h3>Gerenciar Vendas: {event.title}</h3>
                    <button className="close-modal-btn" onClick={onClose}><FaTimes /></button>
                </div>
                <div className="modal-body">
                    <p style={{marginBottom:'20px', color:'#64748b', fontSize:'0.9rem'}}>
                        Controle a disponibilidade dos ingressos em tempo real.
                    </p>
                    
                    <div className="ticket-manage-list">
                        {tickets.length > 0 ? (
                            tickets.map(t => {
                                const tId = t.id || t._id;
                                const isActive = t.status === 'active';
                                const isLoading = loadingId === tId;

                                return (
                                    <div key={tId} className="ticket-manage-item" style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'15px', background:'#f8fafc', borderRadius:'12px', marginBottom:'12px', border:'1px solid #e2e8f0'}}>
                                        <div style={{flex: 1}}>
                                            <strong style={{display:'block', color:'#1e293b', fontSize:'1rem'}}>{t.name}</strong>
                                            <span style={{fontSize:'0.8rem', color:'#64748b'}}>
                                                {t.sold || 0} / {t.quantity} vendidos • {t.batch || t.batchName}
                                            </span>
                                        </div>
                                        
                                        {/* INTERRUPTOR (SWITCH) */}
                                        <div className="switch-container">
                                            <span className={`status-label ${isActive ? 'status-active' : 'status-paused'}`}>
                                                {isLoading ? '...' : (isActive ? 'VENDENDO' : 'PAUSADO')}
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
                            <div style={{textAlign:'center', padding:'20px', color:'#94a3b8', fontStyle: 'italic'}}>
                                Nenhum ingresso encontrado para este evento.<br/>
                                <small>(Verifique se o backend "dashboardController" foi atualizado)</small>
                            </div>
                        )}
                    </div>
                </div>
                <div className="modal-footer" style={{marginTop: '20px'}}>
                    <button className="cancel-btn" onClick={onClose} style={{width:'100%', padding:'12px', borderRadius:'8px', border:'none', background:'#e2e8f0', color:'#475569', fontWeight:'bold', cursor:'pointer'}}>Concluir</button>
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
    const [loadingStripe, setLoadingStripe] = useState(false);
    const [connectionError, setConnectionError] = useState(false);
    
    // Estado para controlar qual evento está aberto no modal
    const [selectedEventForManage, setSelectedEventForManage] = useState(null);

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
                const eventsList = Array.isArray(data.myEvents) ? data.myEvents : (Array.isArray(data) ? data : []);
                setMyEvents(eventsList);
                
                // Se o modal estiver aberto, atualiza os dados dele também
                if (selectedEventForManage) {
                    const updatedEvent = eventsList.find(e => e.id === selectedEventForManage.id);
                    if (updatedEvent) setSelectedEventForManage(updatedEvent);
                }
            } else {
                toast.error("Erro ao carregar eventos.");
            }

        } catch (error) {
            console.error("Erro Dashboard:", error);
            setConnectionError(true);
            toast.error("Erro de conexão.");
        } finally {
            setLoading(false);
        }
    }, [API_BASE_URL, router, selectedEventForManage]);

    useEffect(() => {
        fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Executa apenas na montagem

    const openManageModal = (event) => {
        setSelectedEventForManage(event);
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

    const handleConnectStripe = async () => { setLoadingStripe(true); setTimeout(() => setLoadingStripe(false), 2000); };
    const handleAccessStripeDashboard = async () => { setLoadingStripe(true); setTimeout(() => setLoadingStripe(false), 2000); };

    if (loading && !stats) return <div className="loading-screen">Carregando Painel...</div>;

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

                                            <div className="event-card-actions">
                                                {/* BOTÃO GERENCIAR (Voltou!) */}
                                                {!event.isInformational && (
                                                    <button 
                                                        className="btn-edit-dash" 
                                                        onClick={() => openManageModal(event)}
                                                        title="Gerenciar Vendas"
                                                        style={{border: '1px solid #cbd5e1', marginRight: '5px'}}
                                                    >
                                                        <FaCog style={{color: '#475569'}} /> Gerenciar
                                                    </button>
                                                )}

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

                {/* MODAL DE GESTÃO DE VENDAS (Voltou!) */}
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
        <Suspense fallback={<div className="loading-screen">Carregando painel...</div>}>
            <DashboardContent />
        </Suspense>
    );
}