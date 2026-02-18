'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { 
    FaChartPie, FaList, FaCheck, FaTimes, FaCog, 
    FaMoneyBillWave, FaUsers, FaStar, FaEye, FaSignOutAlt,
    FaTicketAlt, FaTrash, FaPlus, FaInbox, FaHandshake
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
    const [config, setConfig] = useState({ platformFee: 0.08, premiumPrice: 100, standardPrice: 2.00 }); // Default atualizado
    
    const [selectedEvent, setSelectedEvent] = useState(null);

    // Estado para novo cupom
    const [newCoupon, setNewCoupon] = useState({
        code: '',
        discountType: 'percentage_fee', 
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

            // Carrega dados baseados na aba
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

            // Se for sucesso e tiver link de pagamento no retorno
            const data = await res.json();

            if (res.ok) {
                toast.success('Atualizado com sucesso!');
                
                // Se aprovou destaque, avisa sobre o link (opcional, pois o usuário recebe no painel dele)
                if (type === 'highlight' && action === 'approved' && data.paymentLink) {
                    // toast.success("Link de pagamento gerado!", { duration: 4000 });
                }

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
                setNewCoupon({ code: '', discountType: 'percentage_fee', value: '', partner: '', maxUses: '', expiresAt: '' });
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

    if (loading) return <div className="admin-loading"><div className="spinner"></div></div>;
    if (!isAdmin) return null;

    return (
        <div className="admin-layout">
            <Toaster position="top-right" toastOptions={{style: {fontSize: '14px'}}} />
            
            {/* SIDEBAR */}
            <aside className="admin-sidebar">
                <div className="admin-logo">
                    <img src="/img/vibe_site.png" alt="Vibz Admin" className="logo-img" />
                </div>
                
                <nav className="admin-nav">
                    <p className="nav-label">MENU</p>
                    <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>
                        <FaChartPie /> <span>Visão Geral</span>
                    </button>
                    <button className={activeTab === 'events' ? 'active' : ''} onClick={() => setActiveTab('events')}>
                        <FaList /> <span>Moderação</span>
                        {pendingEvents.length > 0 && <span className="badge">{pendingEvents.length}</span>}
                    </button>
                    <button className={activeTab === 'highlights' ? 'active' : ''} onClick={() => setActiveTab('highlights')}>
                        <FaStar /> <span>Destaques</span>
                        {pendingHighlights.length > 0 && <span className="badge">{pendingHighlights.length}</span>}
                    </button>
                    
                    <p className="nav-label">FINANCEIRO</p>
                    <button className={activeTab === 'coupons' ? 'active' : ''} onClick={() => setActiveTab('coupons')}>
                        <FaTicketAlt /> <span>Cupons & Parceiros</span>
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

            {/* CONTEÚDO PRINCIPAL */}
            <main className="admin-main">
                <header className="admin-header">
                    <div>
                        <h3>
                            {activeTab === 'overview' && 'Dashboard Financeiro'}
                            {activeTab === 'events' && 'Moderação de Eventos'}
                            {activeTab === 'highlights' && 'Solicitações de Destaque'}
                            {activeTab === 'coupons' && 'Gestão de Cupons'}
                            {activeTab === 'settings' && 'Configurações da Plataforma'}
                        </h3>
                        <p className="admin-subtitle">Bem-vindo ao painel de controle Vibz.</p>
                    </div>
                    <div className="admin-profile">
                        <div className="admin-avatar">A</div>
                        <div className="admin-info">
                            <span className="admin-name">Administrador</span>
                            <span className="admin-role">Super Admin</span>
                        </div>
                    </div>
                </header>

                <div className="admin-content-area">
                    {/* --- ABA: OVERVIEW --- */}
                    {activeTab === 'overview' && stats && (
                        <>
                            <div className="overview-grid">
                                <div className="kpi-card purple">
                                    <div className="kpi-icon"><FaMoneyBillWave /></div>
                                    <div className="kpi-data">
                                        <h4>Receita Líquida</h4>
                                        <p>{stats.revenue?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                    </div>
                                </div>
                                <div className="kpi-card blue">
                                    <div className="kpi-icon"><FaUsers /></div>
                                    <div className="kpi-data">
                                        <h4>Usuários Totais</h4>
                                        <p>{stats.users}</p>
                                    </div>
                                </div>
                                <div className="kpi-card orange">
                                    <div className="kpi-icon"><FaList /></div>
                                    <div className="kpi-data">
                                        <h4>Eventos Pendentes</h4>
                                        <p>{stats.pendingEvents}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="chart-container-card">
                                <div className="card-header-clean">
                                    <h4>Desempenho de Receita (7 Dias)</h4>
                                </div>
                                <div style={{ height: 350, width: '100%', padding: '20px' }}>
                                    <ResponsiveContainer>
                                        <LineChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="date" stroke="#94a3b8" axisLine={false} tickLine={false} dy={10} fontSize={12} />
                                            <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} dx={-10} fontSize={12} />
                                            <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '13px'}} />
                                            <Line type="monotone" dataKey="amount" stroke="#4C01B5" strokeWidth={3} dot={{r:4, fill: '#4C01B5'}} activeDot={{r:6}} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </>
                    )}

                    {/* --- ABA: EVENTS & HIGHLIGHTS --- */}
                    {(activeTab === 'events' || activeTab === 'highlights') && (
                        <div className="table-card">
                            {(activeTab === 'events' ? pendingEvents : pendingHighlights).length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-icon-bg"><FaCheck /></div>
                                    <h3>Tudo limpo por aqui!</h3>
                                    <p>Nenhuma solicitação pendente no momento.</p>
                                </div>
                            ) : (
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Evento</th>
                                            <th>Detalhes</th>
                                            <th>Status</th>
                                            <th style={{textAlign: 'right'}}>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(activeTab === 'events' ? pendingEvents : pendingHighlights).map(ev => (
                                            <tr key={ev.id}>
                                                <td>
                                                    <div className="event-info-cell">
                                                        <div className="event-thumb" style={{backgroundImage: `url(${ev.imageUrl})`}}></div>
                                                        <div>
                                                            <strong>{ev.title}</strong>
                                                            <small>{ev.city}</small>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    {activeTab === 'events' 
                                                        ? <span>{ev.organizer?.name}</span>
                                                        : <div style={{display:'flex', flexDirection:'column'}}>
                                                            <span className="highlight-price">
                                                                {ev.highlightTier === 'PREMIUM' ? 'R$ 100,00 (Fixo)' : `R$ ${ev.highlightDuration * 2},00 (${ev.highlightDuration} dias)`}
                                                            </span>
                                                            <small style={{color:'#64748b'}}>{ev.highlightTier}</small>
                                                          </div>
                                                    }
                                                </td>
                                                <td><span className="status-badge pending">Aguardando</span></td>
                                                <td className="actions-cell">
                                                    <button className="btn-icon view" title="Ver" onClick={() => setSelectedEvent(ev)}><FaEye/></button>
                                                    <button className="btn-icon approve" title="Aprovar" onClick={() => handleAction(ev.id, 'approved', activeTab === 'events' ? 'event' : 'highlight')}><FaCheck/></button>
                                                    <button className="btn-icon reject" title="Rejeitar" onClick={() => handleAction(ev.id, 'rejected', activeTab === 'events' ? 'event' : 'highlight')}><FaTimes/></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {/* --- ABA: CUPONS --- */}
                    {activeTab === 'coupons' && (
                        <div className="coupon-layout">
                            {/* Criar Cupom */}
                            <div className="form-card">
                                <h4><FaPlus size={12}/> Criar Novo Cupom</h4>
                                <form onSubmit={handleCreateCoupon} className="admin-form">
                                    <div className="form-group">
                                        <label>Código do Cupom</label>
                                        <input className="admin-input" type="text" value={newCoupon.code} onChange={e => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})} placeholder="Ex: VIBZ10" required />
                                    </div>
                                    <div className="form-group">
                                        <label>Parceiro / Influencer</label>
                                        <div className="input-icon-wrapper">
                                            <FaHandshake className="input-icon" />
                                            <input className="admin-input pl-icon" type="text" value={newCoupon.partner} onChange={e => setNewCoupon({...newCoupon, partner: e.target.value})} placeholder="Nome do parceiro" required />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Tipo de Desconto</label>
                                            <select className="admin-select" value={newCoupon.discountType} onChange={e => setNewCoupon({...newCoupon, discountType: e.target.value})}>
                                                <option value="percentage_fee">% na Taxa (Split)</option>
                                                <option value="fixed">R$ Fixo no Ingresso</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Valor</label>
                                            <input className="admin-input" type="number" value={newCoupon.value} onChange={e => setNewCoupon({...newCoupon, value: e.target.value})} placeholder="Ex: 5" required />
                                        </div>
                                    </div>
                                    <p className="help-text">
                                        {newCoupon.discountType === 'percentage_fee' 
                                            ? `O cliente ganha ${newCoupon.value || 0}% de desconto na taxa. O restante é dividido 50/50 com o parceiro.`
                                            : `O cliente ganha R$ ${newCoupon.value || 0} de desconto no valor final do ingresso.`}
                                    </p>
                                    <button type="submit" className="btn-primary full">Criar Cupom</button>
                                </form>
                            </div>

                            {/* Lista de Cupons */}
                            <div className="table-card fluid-height">
                                <div className="card-header">
                                    <h3>Cupons Ativos</h3>
                                </div>
                                <div className="table-wrapper">
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th>Código</th>
                                                <th>Parceiro</th>
                                                <th>Benefício</th>
                                                <th>Usos</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {coupons.map(c => (
                                                <tr key={c.id || c._id}>
                                                    <td><span className="code-badge">{c.code}</span></td>
                                                    <td>{c.partner}</td>
                                                    <td>
                                                        {c.discountType === 'percentage_fee' 
                                                            ? <span className="benefit-tag fee">-{c.value}% Taxa (Split)</span>
                                                            : <span className="benefit-tag fixed">-R$ {c.value}</span>
                                                        }
                                                    </td>
                                                    <td>{c.usedCount || 0}</td>
                                                    <td style={{textAlign: 'right'}}>
                                                        <button className="btn-icon reject" onClick={() => handleDeleteCoupon(c.id || c._id)}><FaTrash/></button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {coupons.length === 0 && <tr><td colSpan="5" className="text-center p-4">Nenhum cupom encontrado.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- ABA: SETTINGS (CORRIGIDA) --- */}
                    {activeTab === 'settings' && (
                        <div className="center-container">
                            <div className="form-card large">
                                <h4>Configurações Globais</h4>
                                <p className="form-desc">Defina as taxas e valores base da plataforma.</p>
                                <div className="admin-form">
                                    <div className="form-group">
                                        <label>Taxa da Plataforma (Decimal)</label>
                                        <input className="admin-input" type="number" step="0.01" value={config.platformFee} onChange={e => setConfig({...config, platformFee: e.target.value})} />
                                        <small>Ex: 0.08 equivale a 8% por venda.</small>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Preço Destaque Premium (Fixo)</label>
                                            <input className="admin-input" type="number" value={config.premiumPrice} onChange={e => setConfig({...config, premiumPrice: e.target.value})} />
                                            <small>Valor único até a data do evento.</small>
                                        </div>
                                        <div className="form-group">
                                            <label>Valor Diária Standard (R$)</label>
                                            <input className="admin-input" type="number" value={config.standardPrice} onChange={e => setConfig({...config, standardPrice: e.target.value})} />
                                            <small>Valor cobrado por dia de destaque.</small>
                                        </div>
                                    </div>
                                    <button className="btn-primary" onClick={handleSaveSettings}>Salvar Alterações</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* MODAL DETALHES */}
                {selectedEvent && (
                    <div className="admin-modal-overlay" onClick={() => setSelectedEvent(null)}>
                        <div className="admin-modal" onClick={e => e.stopPropagation()}>
                            <button className="close-modal-btn" onClick={() => setSelectedEvent(null)}><FaTimes/></button>
                            <div className="modal-content-wrapper">
                                <div className="modal-img-col" style={{backgroundImage: `url(${selectedEvent.imageUrl})`}}></div>
                                <div className="modal-info-col">
                                    <div className="modal-header">
                                        <h2>{selectedEvent.title}</h2>
                                        <span className="modal-category">{selectedEvent.category}</span>
                                    </div>
                                    <p className="modal-meta">{selectedEvent.city} • {new Date(selectedEvent.eventDate).toLocaleDateString()}</p>
                                    
                                    <div className="modal-desc-box">
                                        <label>Descrição</label>
                                        <p>{selectedEvent.description}</p>
                                    </div>

                                    <div className="modal-organizer">
                                        <label>Organizador</label>
                                        <p>{selectedEvent.organizer?.name} ({selectedEvent.organizer?.email})</p>
                                    </div>

                                    {/* SE FOR DESTAQUE, MOSTRA INFO EXTRA */}
                                    {selectedEvent.isFeaturedRequested && (
                                        <div className="modal-organizer" style={{backgroundColor: '#FFFBEB', border: '1px solid #FEF3C7'}}>
                                            <label style={{color: '#B45309'}}>Solicitação de Destaque</label>
                                            <p>
                                                Tipo: <strong>{selectedEvent.highlightTier}</strong><br/>
                                                {selectedEvent.highlightTier === 'STANDARD' && (
                                                    <span>Duração: {selectedEvent.highlightDuration} dias</span>
                                                )}
                                            </p>
                                        </div>
                                    )}

                                    <div className="modal-actions-row">
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
                    </div>
                )}
            </main>
        </div>
    );
}