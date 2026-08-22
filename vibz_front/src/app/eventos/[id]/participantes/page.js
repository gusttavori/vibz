'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { 
    FaArrowLeft, FaSearch, FaUserFriends, FaTicketAlt, 
    FaCheck, FaCheckCircle, FaSpinner, FaClipboardCheck, FaEye, FaTimes, FaFileExcel, FaTrashAlt, FaBan 
} from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast';
import './Participantes.css';

const getApiBaseUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
};

export default function Participantes() {
    const params = useParams();
    const router = useRouter();
    const API_BASE_URL = getApiBaseUrl();
    
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({ participants: [], formSchema: [], eventTitle: '', eventImageUrl: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [processingCheckin, setProcessingCheckin] = useState(null);
    const [selectedParticipant, setSelectedParticipant] = useState(null);
    
    // NOVOS ESTADOS PARA O MODAL DE EXPORTAÇÃO
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportFilter, setExportFilter] = useState('all'); // 'all', 'used', 'valid'

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/events/${params.id}/participants`, {
                    credentials: 'include' // <-- Requisição Segura
                });

                if (response.ok) {
                    const result = await response.json();
                    setData(result);
                } else {
                    if (response.status === 401) {
                        toast.error("Sua sessão expirou.");
                        router.push('/login');
                    } else {
                        toast.error("Erro ao carregar lista.");
                    }
                }
            } catch (error) {
                console.error(error);
                toast.error("Erro de conexão.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [params.id, router, API_BASE_URL]);

    const formatText = (text) => {
        if (!text) return '';
        return text.toString().replace(/(\d+)\s*[oO°]/g, '$1º').replace(/(\d+)\s*[aAª]/g, '$1ª');
    };

    const handleManualCheckIn = async (qrCode, ticketId) => {
        setProcessingCheckin(ticketId);

        try {
            const response = await fetch(`${API_BASE_URL}/tickets/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // <-- Requisição Segura
                body: JSON.stringify({ ticketId: ticketId }) 
            });

            if (response.status === 401) return router.push('/login');

            const result = await response.json();

            if (response.ok && result.valid) {
                toast.success("Check-in realizado!");
                setData(prev => ({
                    ...prev,
                    participants: prev.participants.map(p => 
                        p.id === ticketId ? { ...p, status: 'used' } : p
                    )
                }));
                if (selectedParticipant && selectedParticipant.id === ticketId) {
                    setSelectedParticipant(prev => ({ ...prev, status: 'used' }));
                }
            } else {
                toast.error(result.message || "Erro ao validar.");
            }
        } catch (error) {
            toast.error("Erro de conexão.");
        } finally {
            setProcessingCheckin(null);
        }
    };

    const handleCancelTicket = async (ticketId) => {
        if (!window.confirm("Tem certeza que deseja cancelar esta inscrição? A vaga será estornada imediatamente para o público.")) return;

        const toastId = toast.loading("Cancelando inscrição...");

        try {
            const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/cancel`, {
                method: 'POST',
                credentials: 'include' // <-- Requisição Segura
            });

            if (response.status === 401) return router.push('/login');

            const result = await response.json();

            if (response.ok) {
                toast.success("Inscrição cancelada e vaga devolvida!", { id: toastId });
                setData(prev => ({
                    ...prev,
                    participants: prev.participants.map(p => 
                        p.id === ticketId ? { ...p, status: 'cancelled' } : p
                    )
                }));
            } else {
                toast.error(result.message || "Erro ao cancelar.", { id: toastId });
            }
        } catch (error) {
            toast.error("Erro de conexão.", { id: toastId });
        }
    };

    const filteredParticipants = data.participants.filter(p => 
        (p.buyerName && p.buyerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.buyerEmail && p.buyerEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.code && p.code.includes(searchTerm))
    );

    const validParticipants = data.participants.filter(p => p.status !== 'cancelled');
    const checkinsCount = data.participants.filter(p => p.status === 'used').length;
    const uniqueBuyersCount = new Set(validParticipants.filter(p => p.buyerEmail).map(p => p.buyerEmail)).size;

    // 🌟 CALCULAR RESUMO DE INGRESSOS 🌟
    const ticketCounts = validParticipants.reduce((acc, p) => {
        const typeName = formatText(p.ticketType) || 'Ingresso';
        acc[typeName] = (acc[typeName] || 0) + 1;
        return acc;
    }, {});

    // 🌟 LÓGICA DE EXPORTAÇÃO COM FILTRO 🌟
    const executeExport = async () => {
        setShowExportModal(false);
        if (filteredParticipants.length === 0) return toast.error("Nada para exportar.");

        const toastId = toast.loading("Gerando relatório filtrado...");

        try {
            const res = await fetch(`${API_BASE_URL}/tickets/${params.id}/export-excel?filter=${exportFilter}`, {
                credentials: 'include' 
            });

            if (res.status === 401) return router.push('/login');
            if (!res.ok) throw new Error("Erro ao baixar dados do evento.");

            const jsonRes = await res.json();
            
            if (!jsonRes.tickets || jsonRes.tickets.length === 0) {
                toast.error("Nenhum ingresso emitido para este evento ainda.", { id: toastId });
                return;
            }

            let ticketsToExport = jsonRes.tickets;

            // 🛡️ FILTRO CRUZADO NO FRONTEND
            if (exportFilter !== 'all') {
                const allowedCodes = new Set(
                    data.participants
                        .filter(p => exportFilter === 'used' ? p.status === 'used' : p.status === 'valid')
                        .map(p => p.code)
                );

                ticketsToExport = ticketsToExport.filter(row => {
                    const rowValues = Object.values(row);
                    return rowValues.some(val => allowedCodes.has(String(val)));
                });
            }

            if (ticketsToExport.length === 0) {
                toast.error("Nenhum ingresso encontrado para o filtro selecionado.", { id: toastId });
                return;
            }

            const headers = Object.keys(ticketsToExport[0]);
            let csvContent = "\uFEFF" + headers.join(";") + "\n"; 

            ticketsToExport.forEach(row => {
                const values = headers.map(header => {
                    let val = row[header] !== null && row[header] !== undefined ? row[header] : '';
                    return `"${String(val).replace(/"/g, '""')}"`;
                });
                csvContent += values.join(";") + "\n";
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            const filterLabel = exportFilter === 'used' ? 'VALIDADOS' : exportFilter === 'valid' ? 'PENDENTES' : 'TODOS';
            a.download = `Relatorio_${filterLabel}_${jsonRes.eventTitle.replace(/\s+/g, '_')}.csv`;
            
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);

            toast.success(`Relatório (${filterLabel}) baixado!`, { id: toastId });
        } catch (error) {
            console.error("Erro exportação:", error);
            toast.error("Erro ao gerar relatório.", { id: toastId });
        }
    };

    if (loading) {
        return (
            <div className="participants-page">
                <Header />
                <main className="main-content-participants">
                    <div className="page-header">
                        <div className="skeleton skeleton-btn" style={{width: '120px', marginBottom: '25px'}}></div>
                        <div className="header-title-row">
                            <div className="title-wrapper">
                                <div className="skeleton header-event-thumb"></div>
                                <div className="title-block">
                                    <div className="skeleton skeleton-text" style={{width: '250px', height: '32px', marginBottom: '10px'}}></div>
                                    <div className="skeleton skeleton-text" style={{width: '180px', height: '18px'}}></div>
                                </div>
                            </div>
                            <div className="skeleton" style={{width: '150px', height: '36px', borderRadius: '50px'}}></div>
                        </div>
                    </div>
                    <div className="toolbar">
                        <div className="skeleton" style={{flex: 1, height: '48px', borderRadius: '10px'}}></div>
                        <div className="skeleton" style={{width: '180px', height: '48px', borderRadius: '10px'}}></div>
                    </div>
                    <div className="table-container">
                        <div className="skeleton-table-header"></div>
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="skeleton-table-row">
                                <div className="skeleton" style={{width: '30px', height: '30px', borderRadius: '50%'}}></div>
                                <div className="skeleton skeleton-text" style={{width: '40%'}}></div>
                                <div className="skeleton skeleton-text" style={{width: '30%'}}></div>
                                <div className="skeleton" style={{width: '36px', height: '36px', borderRadius: '8px'}}></div>
                            </div>
                        ))}
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="participants-page">
            <Toaster position="top-right" />
            <Header />
            
            <main className="main-content-participants">
                <div className="page-header">
                    <button className="back-btn" onClick={() => router.back()}><FaArrowLeft /> Voltar ao Painel</button>
                    <div className="header-title-row">
                        <div className="title-wrapper">
                            {data.eventImageUrl && <img src={data.eventImageUrl} alt="Evento" className="header-event-thumb" />}
                            <div className="title-block">
                                <h1>{data.eventTitle}</h1>
                                <p className="subtitle">Gestão de Participantes</p>
                            </div>
                        </div>
                        <div style={{display: 'flex', gap: '15px', flexWrap: 'wrap'}}>
                            <span className="badge-total" title="Inscrições Ativas">
                                <FaTicketAlt /> {validParticipants.length}
                            </span>
                            <span className="badge-total" style={{backgroundColor: '#8b5cf6', color: '#fff'}} title="Compradores Únicos">
                                <FaUserFriends /> {uniqueBuyersCount}
                            </span>
                            <span className="badge-total" style={{backgroundColor: '#10b981', color: '#fff'}} title="Check-ins Realizados">
                                <FaClipboardCheck /> {checkinsCount}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 🌟 BLOCO: RESUMO DE INGRESSOS 🌟 */}
                {Object.keys(ticketCounts).length > 0 && (
                    <div style={{ marginBottom: '30px' }}>
                        <h3 style={{ fontSize: '1rem', color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FaTicketAlt color="#4c01b5" /> Resumo de Ingressos / Vagas
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                            {Object.entries(ticketCounts).map(([typeName, count]) => (
                                <div key={typeName} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={typeName}>
                                        {typeName}
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                        <strong style={{ fontSize: '1.6rem', color: '#4c01b5', lineHeight: '1' }}>{count}</strong>
                                        <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '500' }}>{count === 1 ? 'resgatado' : 'resgatados'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="toolbar">
                    <div className="search-box">
                        <FaSearch className="search-icon"/>
                        <input type="text" placeholder="Buscar participante, email ou código..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
                    </div>
                    
                    {/* BOTÃO ALTERADO PARA ABRIR O POP-UP */}
                    <button 
                        className="export-btn" 
                        onClick={() => setShowExportModal(true)}
                        style={{ background: '#10b981', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        <FaFileExcel /> Baixar Relatório
                    </button>
                </div>

                <div className="table-container" style={{ overflowX: 'auto' }}>
                    <table className="participants-table">
                        <thead>
                            <tr>
                                <th style={{width: '50px'}}>Status</th>
                                <th>Participante</th>
                                <th>Ingresso / Lote</th>
                                
                                {/* COLUNAS DINÂMICAS DO FORMULÁRIO */}
                                {data.formSchema && data.formSchema.map((q, idx) => (
                                    <th key={idx}>{q.label}</th>
                                ))}

                                <th style={{textAlign: 'right', paddingRight: '30px'}}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredParticipants.length > 0 ? (
                                filteredParticipants.map((p) => (
                                    <tr key={p.id} className={`${p.status === 'used' ? 'row-used' : ''} ${p.status === 'cancelled' ? 'row-cancelled' : ''}`} style={{ opacity: p.status === 'cancelled' ? 0.6 : 1 }}>
                                        <td style={{textAlign: 'center'}}>
                                            <span 
                                                className={`status-dot ${p.status}`} 
                                                title={p.status === 'used' ? 'Utilizado' : p.status === 'cancelled' ? 'Cancelado' : 'Válido'}
                                                style={{ backgroundColor: p.status === 'cancelled' ? '#ef4444' : undefined }}
                                            ></span>
                                        </td>
                                        <td>
                                            <div className="user-cell">
                                                <span className="user-name" style={{ textDecoration: p.status === 'cancelled' ? 'line-through' : 'none' }}>{p.buyerName}</span>
                                                <span className="user-email" style={{ fontSize: '0.8rem', color: '#64748b' }}>{p.buyerEmail}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="ticket-badge-wrapper">
                                                <span className="ticket-type-name">{formatText(p.ticketType)}</span>
                                                <span className="ticket-batch-name">{formatText(p.batch)}</span>
                                            </div>
                                        </td>

                                        {/* RESPOSTAS DINÂMICAS DO FORMULÁRIO */}
                                        {data.formSchema && data.formSchema.map((q, idx) => (
                                            <td key={idx} style={{ fontSize: '0.85rem', color: '#475569' }}>
                                                {p[q.label] || '-'}
                                            </td>
                                        ))}

                                        <td style={{textAlign: 'right'}}>
                                            <div className="action-buttons-row">
                                                <button className="icon-btn-view" onClick={() => setSelectedParticipant(p)} title="Ver Detalhes"><FaEye /></button>
                                                
                                                {p.status === 'valid' && (
                                                    <>
                                                        <button 
                                                            className="icon-btn-checkin" 
                                                            onClick={() => handleManualCheckIn(p.code, p.id)}
                                                            disabled={processingCheckin === p.id}
                                                            title="Fazer Check-in"
                                                        >
                                                            {processingCheckin === p.id ? <FaSpinner className="spin" /> : <FaCheck />}
                                                        </button>
                                                        <button 
                                                            className="icon-btn-cancel" 
                                                            onClick={() => handleCancelTicket(p.id)}
                                                            style={{ background: '#fee2e2', color: '#ef4444', border: 'none', width: '36px', height: '36px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            title="Cancelar Inscrição e Devolver Vaga"
                                                        >
                                                            <FaTrashAlt />
                                                        </button>
                                                    </>
                                                )}

                                                {p.status === 'used' && (
                                                    <span className="checked-icon" title="Check-in realizado"><FaCheckCircle /></span>
                                                )}

                                                {p.status === 'cancelled' && (
                                                    <span className="cancelled-icon" style={{ color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px' }} title="Ingresso Cancelado"><FaBan /></span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={10} className="empty-state">
                                        <div className="empty-content">
                                            <FaTicketAlt size={40} />
                                            <p>Nenhum participante encontrado.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* 🌟 MODAL DE EXPORTAÇÃO EXCEL CORRIGIDO 🌟 */}
            {showExportModal && (
                <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                        <div className="modal-header">
                            <h2>Baixar Relatório (Excel)</h2>
                            <button className="close-modal-btn" onClick={() => setShowExportModal(false)}><FaTimes /></button>
                        </div>
                        <div className="modal-body">
                            <p style={{marginBottom: '20px', color: '#475569', fontSize: '0.95rem'}}>
                                O que você deseja exportar para a planilha?
                            </p>
                            <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                                <label style={{display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: exportFilter === 'all' ? '#f5f3ff' : '#f8fafc', border: `1px solid ${exportFilter === 'all' ? '#4c01b5' : '#e2e8f0'}`, padding: '15px', borderRadius: '10px', transition: '0.2s'}}>
                                    <input type="radio" name="exportFilter" value="all" checked={exportFilter === 'all'} onChange={(e) => setExportFilter(e.target.value)} style={{accentColor: '#4c01b5', transform: 'scale(1.2)'}} />
                                    <div style={{display: 'flex', flexDirection: 'column'}}>
                                        <strong style={{color: '#0f172a', fontSize: '0.95rem'}}>Todos os Ingressos</strong>
                                        <span style={{color: '#64748b', fontSize: '0.8rem'}}>Planilha completa com validados e pendentes.</span>
                                    </div>
                                </label>

                                <label style={{display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: exportFilter === 'used' ? '#f5f3ff' : '#f8fafc', border: `1px solid ${exportFilter === 'used' ? '#4c01b5' : '#e2e8f0'}`, padding: '15px', borderRadius: '10px', transition: '0.2s'}}>
                                    <input type="radio" name="exportFilter" value="used" checked={exportFilter === 'used'} onChange={(e) => setExportFilter(e.target.value)} style={{accentColor: '#4c01b5', transform: 'scale(1.2)'}} />
                                    <div style={{display: 'flex', flexDirection: 'column'}}>
                                        <strong style={{color: '#0f172a', fontSize: '0.95rem'}}>Somente Validados (Check-in Feito)</strong>
                                        <span style={{color: '#64748b', fontSize: '0.8rem'}}>Lista de quem efetivamente compareceu.</span>
                                    </div>
                                </label>

                                <label style={{display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: exportFilter === 'valid' ? '#f5f3ff' : '#f8fafc', border: `1px solid ${exportFilter === 'valid' ? '#4c01b5' : '#e2e8f0'}`, padding: '15px', borderRadius: '10px', transition: '0.2s'}}>
                                    <input type="radio" name="exportFilter" value="valid" checked={exportFilter === 'valid'} onChange={(e) => setExportFilter(e.target.value)} style={{accentColor: '#4c01b5', transform: 'scale(1.2)'}} />
                                    <div style={{display: 'flex', flexDirection: 'column'}}>
                                        <strong style={{color: '#0f172a', fontSize: '0.95rem'}}>Somente Pendentes (Ausentes)</strong>
                                        <span style={{color: '#64748b', fontSize: '0.8rem'}}>Lista de quem garantiu mas ainda não entrou.</span>
                                    </div>
                                </label>
                            </div>
                            
                            {/* BOTÕES MOVIDOS PARA DENTRO DO CORPO DO MODAL */}
                            <div className="modal-footer" style={{display: 'flex', gap: '12px', marginTop: '30px', paddingBottom: '10px'}}>
                                <button onClick={() => setShowExportModal(false)} style={{flex: 1, padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 'bold', cursor: 'pointer'}}>
                                    Cancelar
                                </button>
                                <button onClick={executeExport} style={{flex: 2, padding: '14px', borderRadius: '10px', border: 'none', background: '#10b981', color: '#fff', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'}}>
                                    <FaFileExcel /> Baixar Excel Agora
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE DETALHES EXISTENTE */}
            {selectedParticipant && (
                <div className="modal-overlay" onClick={() => setSelectedParticipant(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Detalhes do Participante</h2>
                            <button className="close-modal-btn" onClick={() => setSelectedParticipant(null)}><FaTimes /></button>
                        </div>
                        <div className="modal-body">
                            <div className="modal-status-banner" style={{
                                background: selectedParticipant.status === 'used' ? '#f1f5f9' : selectedParticipant.status === 'cancelled' ? '#fee2e2' : '#d1fae5', 
                                color: selectedParticipant.status === 'used' ? '#64748b' : selectedParticipant.status === 'cancelled' ? '#b91c1c' : '#065f46'
                            }}>
                                <strong>Status:</strong> {selectedParticipant.status === 'used' ? 'JÁ UTILIZADO (Entrou)' : selectedParticipant.status === 'cancelled' ? 'CANCELADO (Vaga Devolvida)' : 'VÁLIDO (Pendente)'}
                            </div>
                            <div className="info-grid">
                                <div className="info-item"><label>Nome Completo</label><p>{selectedParticipant.buyerName}</p></div>
                                <div className="info-item"><label>E-mail</label><p>{selectedParticipant.buyerEmail}</p></div>
                                <div className="info-item"><label>Código do Ingresso</label><p className="code-display">{selectedParticipant.code}</p></div>
                                <div className="info-item"><label>Data da Compra</label><p>{new Date(selectedParticipant.purchaseDate).toLocaleString('pt-BR')}</p></div>
                            </div>
                            
                            {/* EXIBIÇÃO DE RESPOSTAS NO MODAL */}
                            {data.formSchema && data.formSchema.length > 0 && (
                                <div className="custom-data-section">
                                    <h3>Respostas do Formulário</h3>
                                    <div className="custom-grid">
                                        {data.formSchema.map((q, i) => (
                                            <div key={i} className="custom-item">
                                                <label>{q.label}</label>
                                                <p>{selectedParticipant[q.label] || '-'}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedParticipant.status === 'valid' && (
                                <div className="modal-footer" style={{ display: 'flex', gap: '10px' }}>
                                    <button className="big-checkin-btn" onClick={() => handleManualCheckIn(selectedParticipant.code, selectedParticipant.id)} disabled={processingCheckin === selectedParticipant.id} style={{ flex: 2 }}>
                                        {processingCheckin === selectedParticipant.id ? 'Processando...' : 'CONFIRMAR ENTRADA'}
                                    </button>
                                    <button onClick={() => { handleCancelTicket(selectedParticipant.id); setSelectedParticipant(null); }} style={{ flex: 1, background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                                        CANCELAR VAGA
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            <Footer />
        </div>
    );
}