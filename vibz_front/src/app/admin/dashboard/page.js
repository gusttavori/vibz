'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { 
    FaChartPie, FaList, FaCheck, FaTimes, FaCog, 
    FaMoneyBillWave, FaUsers, FaStar, FaEye, FaSignOutAlt,
    FaTicketAlt, FaTrash, FaPlus, FaInbox
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
    const [coupons, setCoupons] = useState([]); 
    const [config, setConfig] = useState({ platformFee: 0.08, premiumPrice: 100, standardPrice: 50 });
    
    const [selectedEvent, setSelectedEvent] = useState(null);

    // Estado para novo cupom
    const [newCoupon, setNewCoupon] = useState({
        code: '',
        discountType: 'percentage', // ou 'fixed'
        value: '',
        partner: '',
        maxUses: '',
        expiresAt: ''
    });

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
            else if (activeTab === 'coupons') {
                const res = await fetch(`${API_BASE_URL}/admin/coupons`, { headers });
                if (res.ok) setCoupons(await res.json());
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

    const handleCreateCoupon = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('userToken');
        
        if (!newCoupon.code || !newCoupon.value || !newCoupon.partner) {
            return toast.error("Preencha os campos obrigatórios.");
        }

        try {
            const res = await fetch(`${API_BASE_URL}/admin/coupons`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(newCoupon)
            });

            if (res.ok) {
                toast.success("Cupom criado!");
                setNewCoupon({ code: '', discountType: 'percentage', value: '', partner: '', maxUses: '', expiresAt: '' });
                checkAdminAndFetch(); 
            } else {
                const err = await res.json();
                toast.error(err.message || "Erro ao criar cupom.");
            }
        } catch (error) {
            toast.error("Erro de conexão.");
        }
    };

    const handleDeleteCoupon = async (id) => {
        if (!confirm("Tem certeza que deseja excluir este cupom?")) return;
        
        const token = localStorage.getItem('userToken');
        try {
            const res = await fetch(`${API_BASE_URL}/admin/coupons/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                toast.success("Cupom excluído.");
                setCoupons(coupons.filter(c => (c.id || c._id) !== id));
            } else {
                toast.error("Erro ao excluir.");
            }
        } catch (error) {
            toast.error("Erro de conexão.");
        }
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

    if (loading) return <div className="admin-loading"><div className="spinner"></div> Carregando painel...</div>;
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
                        <FaChartPie /> <span>Dashboard</span>
                    </button>
                    <button className={activeTab === 'events' ? 'active' : ''} onClick={() => setActiveTab('events')}>
                        <FaList /> <span>Moderação</span>
                        {pendingEvents.length > 0 && <span className="badge">{pendingEvents.length}</span>}
                    </button>
                    <button className={activeTab === 'highlights' ? 'active' : ''} onClick={() => setActiveTab('highlights')}>
                        <FaStar /> <span>Destaques</span>
                        {pendingHighlights.length > 0 && <span className="badge">{pendingHighlights.length}</span>}
                    </button>
                    <button className={activeTab === 'coupons' ? 'active' : ''} onClick={() => setActiveTab('coupons')}>
                        <FaTicketAlt /> <span>Cupons</span>
                    </button>
                    <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>
                        <FaCog /> <span>Configurações</span>
                    </button>
                </nav>

                <div className="admin-footer">
                    <button onClick={() => router.push('/')}>
                        <FaSignOutAlt /> <span>Sair</span>
                    </button>
                </div>
            </aside>

            <main className="admin-main">
                <header className="admin-header">
                    <h3>{activeTab === 'overview' ? 'Visão Geral' : activeTab === 'coupons' ? 'Gerenciar Cupons' : activeTab === 'events' ? 'Moderação de Eventos' : activeTab === 'highlights' ? 'Solicitações de Destaque' : 'Configurações Globais'}</h3>
                    <div className="admin-badge-role">SUPER ADMIN</div>
                </header>

                <div className="admin-content-area">
                    {/* OVERVIEW */}
                    {activeTab === 'overview' && stats && (
                        <>
                            <div className="overview-grid">
                                <div className="kpi-card purple">
                                    <div className="icon"><FaMoneyBillWave /></div>
                                    <div><h4>Receita Líquida</h4><p>{stats.revenue?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
                                </div>
                                <div className="kpi-card blue">
                                    <div className="icon"><FaUsers /></div>
                                    <div><h4>Usuários</h4><p>{stats.users}</p></div>
                                </div>
                                <div className="kpi-card orange">
                                    <div className="icon"><FaList /></div>
                                    <div><h4>Pendentes</h4><p>{stats.pendingEvents}</p></div>
                                </div>
                            </div>
                            <div className="chart-card">
                                <h4>Crescimento de Receita (7 dias)</h4>
                                <div style={{ height: 300, width: '100%', marginTop: '20px' }}>
                                    <ResponsiveContainer>
                                        <LineChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="date" stroke="#94a3b8" axisLine={false} tickLine={false} dy={10} fontSize={12} />
                                            <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} dx={-10} fontSize={12} />
                                            <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px'}} cursor={{stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4'}} />
                                            <Line type="monotone" dataKey="amount" stroke="#4C01B5" strokeWidth={3} dot={{r:4, fill: '#4C01B5'}} activeDot={{r:6}} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </>
                    )}

                    {/* EVENTS & HIGHLIGHTS (Tabelas) */}
                    {(activeTab === 'events' || activeTab === 'highlights') && (
                        <div className="table-card">
                            <div className="card-header">
                                <h3>{activeTab === 'events' ? 'Novos Eventos' : 'Pedidos de Destaque'}</h3>
                            </div>
                            
                            {(activeTab === 'events' ? pendingEvents : pendingHighlights).length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-icon"><FaInbox /></div>
                                    <p>Nenhuma solicitação pendente.</p>
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th>Evento</th>
                                                <th>{activeTab === 'events' ? 'Organizador' : 'Valor'}</th>
                                                <th>{activeTab === 'events' ? 'Data' : 'Status'}</th>
                                                <th style={{textAlign: 'right'}}>Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(activeTab === 'events' ? pendingEvents : pendingHighlights).map(ev => (
                                                <tr key={ev.id}>
                                                    <td>
                                                        <div className="event-cell">
                                                            <strong>{ev.title}</strong>
                                                            <small>{ev.city}</small>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        {activeTab === 'events' 
                                                            ? <div>{ev.organizer?.name}<br/><small style={{color:'#94a3b8'}}>{ev.organizer?.email}</small></div>
                                                            : `R$ ${ev.highlightFee || '0,00'}`
                                                        }
                                                    </td>
                                                    <td>
                                                        {activeTab === 'events' 
                                                            ? new Date(ev.eventDate).toLocaleDateString()
                                                            : <span className="status-badge pending">Pendente</span>
                                                        }
                                                    </td>
                                                    <td className="actions-cell">
                                                        <div className="action-buttons">
                                                            <button className="btn-icon view" title="Ver" onClick={() => setSelectedEvent(ev)}><FaEye/></button>
                                                            <button className="btn-icon approve" title="Aprovar" onClick={() => handleAction(ev.id, 'approved', activeTab === 'events' ? 'event' : 'highlight')}><FaCheck/></button>
                                                            <button className="btn-icon reject" title="Rejeitar" onClick={() => handleAction(ev.id, 'rejected', activeTab === 'events' ? 'event' : 'highlight')}><FaTimes/></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* CUPONS */}
                    {activeTab === 'coupons' && (
                        <div className="content-grid-2">
                            {/* Card de Criação */}
                            <div className="form-card">
                                <h4>Novo Cupom</h4>
                                <form onSubmit={handleCreateCoupon} className="admin-form">
                                    <div className="form-group">
                                        <label>Código</label>
                                        <input className="admin-input" type="text" value={newCoupon.code} onChange={e => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})} placeholder="Ex: VIBZ10" required />
                                    </div>
                                    <div className="form-group">
                                        <label>Parceiro</label>
                                        <input className="admin-input" type="text" value={newCoupon.partner} onChange={e => setNewCoupon({...newCoupon, partner: e.target.value})} placeholder="Nome do parceiro" required />
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Tipo</label>
                                            <select className="admin-select" value={newCoupon.discountType} onChange={e => setNewCoupon({...newCoupon, discountType: e.target.value})}>
                                                <option value="percentage">% Porcentagem</option>
                                                <option value="fixed">R$ Fixo</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Valor</label>
                                            <input className="admin-input" type="number" value={newCoupon.value} onChange={e => setNewCoupon({...newCoupon, value: e.target.value})} placeholder="10" required />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Limite (Opcional)</label>
                                            <input className="admin-input" type="number" value={newCoupon.maxUses} onChange={e => setNewCoupon({...newCoupon, maxUses: e.target.value})} placeholder="∞" />
                                        </div>
                                        <div className="form-group">
                                            <label>Validade</label>
                                            <input className="admin-input" type="date" value={newCoupon.expiresAt} onChange={e => setNewCoupon({...newCoupon, expiresAt: e.target.value})} />
                                        </div>
                                    </div>
                                    <button type="submit" className="btn-primary full"><FaPlus /> Criar Cupom</button>
                                </form>
                            </div>

                            {/* Lista de Cupons */}
                            <div className="table-card">
                                <div className="card-header">
                                    <h3>Cupons Ativos</h3>
                                </div>
                                <div className="table-responsive">
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th>Código</th>
                                                <th>Desconto</th>
                                                <th>Usos</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {coupons.map(coupon => (
                                                <tr key={coupon.id || coupon._id}>
                                                    <td><strong>{coupon.code}</strong><br/><small>{coupon.partner}</small></td>
                                                    <td>{coupon.discountType === 'percentage' ? `${coupon.value}%` : `R$ ${coupon.value}`}</td>
                                                    <td>{coupon.usedCount || 0} / {coupon.maxUses || '∞'}</td>
                                                    <td style={{textAlign:'right'}}>
                                                        <button className="btn-icon reject" onClick={() => handleDeleteCoupon(coupon.id || coupon._id)}><FaTrash /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {coupons.length === 0 && <tr><td colSpan="4" style={{textAlign:'center', color:'#94a3b8', padding:'20px'}}>Nenhum cupom ativo.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SETTINGS */}
                    {activeTab === 'settings' && (
                        <div className="form-card settings-limit">
                            <h4>Taxas e Valores</h4>
                            <div className="admin-form">
                                <div className="form-group">
                                    <label>Taxa da Plataforma (Decimal)</label>
                                    <input className="admin-input" type="number" step="0.01" value={config.platformFee} onChange={e => setConfig({...config, platformFee: e.target.value})} />
                                    <small>Ex: 0.08 equivale a 8% por venda.</small>
                                </div>
                                <div className="form-group">
                                    <label>Preço Destaque Premium (R$)</label>
                                    <input className="admin-input" type="number" value={config.premiumPrice} onChange={e => setConfig({...config, premiumPrice: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label>Preço Destaque Padrão (R$)</label>
                                    <input className="admin-input" type="number" value={config.standardPrice} onChange={e => setConfig({...config, standardPrice: e.target.value})} />
                                </div>
                                <button className="btn-primary" onClick={handleSaveSettings}>Salvar Alterações</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* MODAL DE DETALHES */}
                {selectedEvent && (
                    <div className="admin-modal-overlay" onClick={() => setSelectedEvent(null)}>
                        <div className="admin-modal" onClick={e => e.stopPropagation()}>
                            <button className="close-modal-btn" onClick={() => setSelectedEvent(null)}><FaTimes/></button>
                            <div className="modal-header-img" style={{backgroundImage: `url(${selectedEvent.imageUrl})`}}></div>
                            <div className="modal-body-content">
                                <h2>{selectedEvent.title}</h2>
                                <p className="modal-meta">{selectedEvent.city} • {new Date(selectedEvent.eventDate).toLocaleDateString()}</p>
                                
                                <div className="info-block">
                                    <label>Descrição</label>
                                    <p>{selectedEvent.description}</p>
                                </div>
                                
                                <div className="info-row">
                                    <div><label>Categoria</label><span>{selectedEvent.category}</span></div>
                                    <div><label>Classificação</label><span>{selectedEvent.ageRating}</span></div>
                                </div>

                                <div className="modal-actions-footer">
                                    <button className="btn-action approve" onClick={() => handleAction(selectedEvent.id, 'approved', activeTab === 'events' ? 'event' : 'highlight')}>
                                        <FaCheck /> Aprovar
                                    </button>
                                    <button className="btn-action reject" onClick={() => handleAction(selectedEvent.id, 'rejected', activeTab === 'events' ? 'event' : 'highlight')}>
                                        <FaTimes /> Rejeitar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}