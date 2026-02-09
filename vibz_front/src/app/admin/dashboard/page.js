'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { 
    FaChartPie, FaList, FaCheck, FaTimes, FaCog, 
    FaMoneyBillWave, FaUsers, FaStar, FaEye, FaSignOutAlt 
} from 'react-icons/fa';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import './AdminDashboard.css';

const getApiBaseUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
};

export default function AdminDashboard() {
    const router = useRouter();
    const API_BASE_URL = getApiBaseUrl();
    
    const [activeTab, setActiveTab] = useState('overview'); 
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    
    const [stats, setStats] = useState(null);
    const [pendingEvents, setPendingEvents] = useState([]);
    const [pendingHighlights, setPendingHighlights] = useState([]);
    const [config, setConfig] = useState({ platformFee: 0.08, premiumPrice: 100, standardPrice: 50 });
    
    const [selectedEvent, setSelectedEvent] = useState(null);

    useEffect(() => {
        checkAdminAndFetch();
    }, [activeTab]);

    const checkAdminAndFetch = async () => {
        const token = localStorage.getItem('userToken');
        if (!token) return router.push('/login');

        try {
            const userRes = await fetch(`${API_BASE_URL}/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } });
            const userData = await userRes.json();
            const user = userData.user || userData;

            if (!user.isAdmin) {
                toast.error("ACESSO NEGADO.");
                router.push('/dashboard');
                return;
            }
            setIsAdmin(true);

            const headers = { 'Authorization': `Bearer ${token}` };

            if (activeTab === 'overview') {
                const res = await fetch(`${API_BASE_URL}/admin/stats`, { headers });
                if (res.ok) setStats(await res.json());
            } 
            else if (activeTab === 'events') {
                const res = await fetch(`${API_BASE_URL}/admin/events?status=pending`, { headers });
                if (res.ok) setPendingEvents(await res.json());
            }
            else if (activeTab === 'highlights') {
                const res = await fetch(`${API_BASE_URL}/admin/events?highlightStatus=pending`, { headers });
                if (res.ok) setPendingHighlights(await res.json());
            }
            else if (activeTab === 'settings') {
                const res = await fetch(`${API_BASE_URL}/admin/settings`, { headers });
                if (res.ok) setConfig(await res.json());
            }
        } catch (error) { console.error(error); } 
        finally { setLoading(false); }
    };

    const handleAction = async (id, action, type = 'event') => {
        const token = localStorage.getItem('userToken');
        const endpoint = type === 'highlight' ? `/admin/highlights/${id}` : `/admin/events/${id}`;
        const body = type === 'highlight' ? { highlightStatus: action } : { status: action };

        try {
            const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                toast.success('Atualizado com sucesso!');
                checkAdminAndFetch();
                setSelectedEvent(null);
            } else { toast.error("Erro ao atualizar."); }
        } catch (e) { toast.error("Erro de conexão."); }
    };

    const handleSaveSettings = async () => {
        const token = localStorage.getItem('userToken');
        try {
            await fetch(`${API_BASE_URL}/admin/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(config)
            });
            toast.success("Configurações Salvas!");
        } catch (e) { toast.error("Erro ao salvar."); }
    };

    const chartData = stats?.chartData?.map(item => ({
        date: new Date(item.createdAt).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'}),
        amount: item.platformFeeFinal
    })) || [];

    if (loading) return <div className="admin-loading">Carregando...</div>;
    if (!isAdmin) return null;

    return (
        <div className="admin-layout">
            <Toaster position="top-right" />
            
            <aside className="admin-sidebar">
                <div className="admin-logo">
                    <img src="/img/vibe_site.png" alt="Vibz Admin" className="logo-img" />
                </div>
                
                <nav className="admin-nav">
                    <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>
                        <FaChartPie /> Dashboard
                    </button>
                    <button className={activeTab === 'events' ? 'active' : ''} onClick={() => setActiveTab('events')}>
                        <FaList /> Moderação Eventos
                        {pendingEvents.length > 0 && <span className="badge">{pendingEvents.length}</span>}
                    </button>
                    <button className={activeTab === 'highlights' ? 'active' : ''} onClick={() => setActiveTab('highlights')}>
                        <FaStar /> Pedidos Destaque
                        {pendingHighlights.length > 0 && <span className="badge">{pendingHighlights.length}</span>}
                    </button>
                    <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>
                        <FaCog /> Configurações
                    </button>
                </nav>

                <div className="admin-footer">
                    <button onClick={() => router.push('/')}>
                        <FaSignOutAlt /> Sair do Admin
                    </button>
                </div>
            </aside>

            <main className="admin-main">
                <header className="admin-header">
                    <h3>{activeTab === 'overview' ? 'Visão Geral' : activeTab === 'events' ? 'Moderação' : activeTab === 'highlights' ? 'Destaques' : 'Configurações'}</h3>
                    <div className="admin-badge">SUPER ADMIN</div>
                </header>

                <div className="admin-content-area">
                    {/* OVERVIEW */}
                    {activeTab === 'overview' && stats && (
                        <>
                            <div className="overview-grid">
                                <div className="kpi-card purple">
                                    <div className="icon"><FaMoneyBillWave /></div>
                                    <div><h4>Receita Líquida (Vibz)</h4><p>{stats.revenue?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
                                </div>
                                <div className="kpi-card blue">
                                    <div className="icon"><FaUsers /></div>
                                    <div><h4>Usuários Totais</h4><p>{stats.users}</p></div>
                                </div>
                                <div className="kpi-card orange">
                                    <div className="icon"><FaList /></div>
                                    <div><h4>Pendentes</h4><p>{stats.pendingEvents}</p></div>
                                </div>
                            </div>
                            <div className="chart-section-admin">
                                <h4>Crescimento de Receita (7 dias)</h4>
                                {/* Altura reduzida aqui para 280px */}
                                <div style={{ height: 280, width: '100%' }}>
                                    <ResponsiveContainer>
                                        <LineChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="date" stroke="#94a3b8" axisLine={false} tickLine={false} dy={10} fontSize={12} />
                                            <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} dx={-10} fontSize={12} />
                                            <Tooltip 
                                                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px'}}
                                                cursor={{stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4'}}
                                            />
                                            <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={3} dot={{r:4, fill: '#6366f1'}} activeDot={{r:6}} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </>
                    )}

                    {/* EVENTS */}
                    {activeTab === 'events' && (
                        <div className="table-wrapper">
                            <h3>Novos Eventos Aguardando Aprovação</h3>
                            {pendingEvents.length === 0 ? (
                                <div className="empty-admin">
                                    <FaCheck size={32} color="#cbd5e1" style={{marginBottom: 10}}/>
                                    <p>Nenhum evento pendente.</p>
                                </div>
                            ) : (
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Evento</th>
                                            <th>Organizador</th>
                                            <th>Data</th>
                                            <th>Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingEvents.map(ev => (
                                            <tr key={ev.id}>
                                                <td><strong>{ev.title}</strong><small>{ev.city}</small></td>
                                                <td>{ev.organizer?.name}<br/><small>{ev.organizer?.email}</small></td>
                                                <td>{new Date(ev.eventDate).toLocaleDateString()}</td>
                                                <td className="actions-cell">
                                                    <button className="btn-view" title="Ver Detalhes" onClick={() => setSelectedEvent(ev)}><FaEye/></button>
                                                    <button className="btn-approve" title="Aprovar" onClick={() => handleAction(ev.id, 'approved')}><FaCheck/></button>
                                                    <button className="btn-reject" title="Rejeitar" onClick={() => handleAction(ev.id, 'rejected')}><FaTimes/></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {/* HIGHLIGHTS */}
                    {activeTab === 'highlights' && (
                        <div className="table-wrapper">
                            <h3>Solicitações de Destaque</h3>
                            {pendingHighlights.length === 0 ? (
                                <div className="empty-admin">
                                    <FaStar size={32} color="#cbd5e1" style={{marginBottom: 10}}/>
                                    <p>Nenhum pedido de destaque.</p>
                                </div>
                            ) : (
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Evento</th>
                                            <th>Valor Estimado</th>
                                            <th>Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingHighlights.map(ev => (
                                            <tr key={ev.id}>
                                                <td><strong>{ev.title}</strong></td>
                                                <td>R$ {ev.highlightFee || '0,00'}</td>
                                                <td className="actions-cell">
                                                    <button className="btn-view" onClick={() => setSelectedEvent(ev)}><FaEye/></button>
                                                    <button className="btn-approve" style={{width: 'auto', padding: '0 12px'}} onClick={() => handleAction(ev.id, 'approved', 'highlight')}>Aprovar</button>
                                                    <button className="btn-reject" onClick={() => handleAction(ev.id, 'rejected', 'highlight')}><FaTimes/></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {/* SETTINGS */}
                    {activeTab === 'settings' && (
                        <div className="settings-card">
                            <h4>Taxas Globais</h4>
                            <div className="form-group">
                                <label>Taxa da Plataforma (Decimal)</label>
                                <input type="number" step="0.01" value={config.platformFee} onChange={e => setConfig({...config, platformFee: e.target.value})} />
                                <small>0.08 = 8%</small>
                            </div>
                            <div className="form-group">
                                <label>Preço Destaque Premium (R$)</label>
                                <input type="number" value={config.premiumPrice} onChange={e => setConfig({...config, premiumPrice: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>Preço Destaque Padrão (R$)</label>
                                <input type="number" value={config.standardPrice} onChange={e => setConfig({...config, standardPrice: e.target.value})} />
                            </div>
                            <button className="btn-save" onClick={handleSaveSettings}>Salvar Alterações</button>
                        </div>
                    )}
                </div>

                {/* MODAL */}
                {selectedEvent && (
                    <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <button className="close-modal" onClick={() => setSelectedEvent(null)}><FaTimes/></button>
                            <img src={selectedEvent.imageUrl} alt="Capa" className="modal-cover"/>
                            <div className="modal-body">
                                <h2>{selectedEvent.title}</h2>
                                <p className="modal-meta">{selectedEvent.city} • {new Date(selectedEvent.eventDate).toLocaleDateString()}</p>
                                <div className="modal-desc">
                                    <h4>Descrição:</h4>
                                    <p>{selectedEvent.description}</p>
                                </div>
                                <div className="modal-actions">
                                    {activeTab === 'events' ? (
                                        <>
                                            <button className="btn-approve large" onClick={() => handleAction(selectedEvent.id, 'approved')}>Aprovar</button>
                                            <button className="btn-reject large" onClick={() => handleAction(selectedEvent.id, 'rejected')}>Rejeitar</button>
                                        </>
                                    ) : (
                                        <>
                                            <button className="btn-approve large" onClick={() => handleAction(selectedEvent.id, 'approved', 'highlight')}>Aprovar</button>
                                            <button className="btn-reject large" onClick={() => handleAction(selectedEvent.id, 'rejected', 'highlight')}>Recusar</button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}