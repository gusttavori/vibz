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

// Componente Interno com a Lógica do Dashboard
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

    // Efeito para detectar retorno do Stripe (Sucesso)
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
            // 1. Dados do Usuário
            const userRes = await fetch(`${API_BASE_URL}/users/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (userRes.ok) {
                const userDataResponse = await userRes.json();
                setUserData(userDataResponse.user || userDataResponse);
            }

            // 2. Estatísticas
            const statsRes = await fetch(`${API_BASE_URL}/dashboard/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (statsRes.ok) {
                const data = await statsRes.json();
                setStats(data);
            }

            // 3. Meus Eventos
            const eventsRes = await fetch(`${API_BASE_URL}/dashboard/events`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (eventsRes.ok) {
                const data = await eventsRes.json();
                setMyEvents(Array.isArray(data) ? data : []);
            }

        } catch (error) {
            console.error("Erro Dashboard:", error);
            setConnectionError(true);
            toast.error("Erro de conexão.");
        } finally {
            setLoading(false);
        }
    }, [API_BASE_URL, router]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const formatText = (text) => {
        if (!text) return '';
        return text.toString()
            .replace(/(\d+)\s*[oO°]/g, '$1º')
            .replace(/(\d+)\s*[aAª]/g, '$1ª');
    };

    const getStatusLabel = (status) => {
        if (!status) return 'Indefinido';
        const s = status.toLowerCase();
        if (s === 'approved') return 'Aprovado';
        if (s === 'pending') return 'Em Análise';
        if (s === 'rejected') return 'Rejeitado';
        return status;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Data não definida';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Data Inválida';
            return date.toLocaleDateString('pt-BR');
        } catch (e) {
            return 'Erro na data';
        }
    };

    const handleConnectStripe = async () => {
        setLoadingStripe(true);
        const token = localStorage.getItem('userToken')?.replace(/"/g, '');
        try {
            const res = await fetch(`${API_BASE_URL}/stripe/onboarding`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && data.url) window.location.href = data.url;
            else toast.error(data.message || "Erro ao conectar Stripe");
        } catch (e) {
            toast.error("Erro de conexão");
        } finally {
            setLoadingStripe(false);
        }
    };

    const handleAccessStripeDashboard = async () => {
        setLoadingStripe(true);
        const token = localStorage.getItem('userToken')?.replace(/"/g, '');
        try {
            const res = await fetch(`${API_BASE_URL}/stripe/login-link`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && data.url) {
                window.open(data.url, '_blank');
            } else {
                toast.error("Erro ao acessar painel.");
            }
        } catch (e) {
            toast.error("Erro de conexão.");
        } finally {
            setLoadingStripe(false);
        }
    };

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

    const chartData = stats?.chartData?.length > 0 ? stats.chartData : [
        { name: 'Dom', vendas: 0 }, { name: 'Seg', vendas: 0 }, { name: 'Ter', vendas: 0 },
        { name: 'Qua', vendas: 0 }, { name: 'Qui', vendas: 0 }, { name: 'Sex', vendas: 0 }, { name: 'Sáb', vendas: 0 }
    ];

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
                    
                    {/* BOTÃO DE CHECK-IN (NOVO) */}
                    <div className="header-actions-dash">
                        <button className="btn-checkin" onClick={() => router.push('/admin/checkin')}>
                            <FaQrcode /> Validar Ingressos
                        </button>
                        <div className="live-indicator"><span className="dot"></span> Online</div>
                    </div>
                </div>

                <div className="wallet-section-dashboard">
                    {isStripeReady ? (
                        <div className="wallet-card success fade-in">
                            <div className="wallet-icon"><FaCheckCircle /></div>
                            <div className="wallet-info">
                                <h3>Conta Pronta</h3>
                                <p>Tudo pronto! Você receberá seus pagamentos automaticamente.</p>
                            </div>
                            <button className="wallet-btn outline" onClick={handleAccessStripeDashboard} disabled={loadingStripe}>
                                {loadingStripe ? 'Carregando...' : 'Ver Saldo e Extrato'}
                            </button>
                        </div>
                    ) : (
                        <div className="wallet-card warning fade-in">
                            <div className="wallet-icon"><FaExclamationCircle /></div>
                            <div className="wallet-info">
                                <h3>Ativar Recebimentos</h3>
                                <p>Para receber o dinheiro das vendas, conecte sua conta bancária.</p>
                            </div>
                            <button className="wallet-btn primary" onClick={handleConnectStripe} disabled={loadingStripe}>
                                {loadingStripe ? 'Conectando...' : 'Conectar Conta Bancária'}
                            </button>
                        </div>
                    )}
                </div>

                {stats && (
                    <>
                        <div className="stats-grid">
                            <div className="stat-card purple">
                                <div className="stat-icon"><FaMoneyBillWave /></div>
                                <div className="stat-info">
                                    <h3>Receita Total</h3>
                                    <p className="stat-value">{stats.revenue?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00'}</p>
                                </div>
                            </div>
                            <div className="stat-card blue">
                                <div className="stat-icon"><FaTicketAlt /></div>
                                <div className="stat-info">
                                    <h3>Ingressos</h3>
                                    <p className="stat-value">{stats.ticketsSold || 0}</p>
                                </div>
                            </div>
                            <div className="stat-card green">
                                <div className="stat-icon"><FaUserCheck /></div>
                                <div className="stat-info">
                                    <h3>Check-ins</h3>
                                    <p className="stat-value">{stats.checkins || 0}</p>
                                </div>
                            </div>
                        </div>

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
                                                <img src={event.imageUrl} alt={event.title} className="event-thumb" />
                                                <div className="event-info-dash">
                                                    <strong>{formatText(event.title)}</strong>
                                                    <span>{formatDate(event.date)} • {event.city}</span>
                                                    <span className={`status-badge ${event.status}`}>
                                                        {getStatusLabel(event.status)}
                                                    </span>
                                                </div>
                                                <div className="event-actions">
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
                                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#888'}} tickFormatter={(val) => `R$${val}`} />
                                            <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} contentStyle={{borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)'}} />
                                            <Line type="monotone" dataKey="vendas" stroke="#4C01B5" strokeWidth={3} dot={{r: 4}} activeDot={{r: 8}} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="recent-sales-section">
                                <div className="sales-header-row">
                                    <h2><FaRegClock /> Vendas Recentes</h2>
                                </div>
                                <div className="sales-list">
                                    {(!stats.recentSales || stats.recentSales.length === 0) ? (
                                        <div className="empty-state-sales"><p>Nenhuma venda recente.</p></div>
                                    ) : (
                                        stats.recentSales.map((sale) => (
                                            <div key={sale.id || sale._id} className="sale-item">
                                                <div className="sale-avatar">{sale.user?.name?.charAt(0).toUpperCase() || 'U'}</div>
                                                <div className="sale-details">
                                                    <strong>{sale.user?.name || 'Cliente'}</strong>
                                                    <span>{formatText(sale.ticketType?.name)} • {formatText(sale.event?.title)}</span>
                                                </div>
                                                <div className="sale-price">+{sale.price?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </main>
            <Footer />
        </div>
    );
};

// Componente Principal Wrapper com Suspense (CORREÇÃO DE BUILD)
export default function Dashboard() {
    return (
        <Suspense fallback={<div className="loading-screen">Carregando painel...</div>}>
            <DashboardContent />
        </Suspense>
    );
}