'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { 
    FaArrowLeft, FaFileCsv, FaSearch, FaUserFriends, FaTicketAlt, 
    FaCheck, FaCheckCircle, FaSpinner, FaClipboardCheck, FaEye, FaTimes, FaFileExcel 
} from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast';
import * as XLSX from 'xlsx'; // <--- IMPORTANTE: Importe a biblioteca aqui
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

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('userToken')?.replace(/"/g, '');
            if (!token) return router.push('/login');

            try {
                const response = await fetch(`${API_BASE_URL}/events/${params.id}/participants`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const result = await response.json();
                    setData(result);
                } else {
                    toast.error("Erro ao carregar lista.");
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
        const token = localStorage.getItem('userToken')?.replace(/"/g, '');

        try {
            const response = await fetch(`${API_BASE_URL}/tickets/validate`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ qrCode }) 
            });

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

    const filteredParticipants = data.participants.filter(p => 
        (p.buyerName && p.buyerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.buyerEmail && p.buyerEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.code && p.code.includes(searchTerm))
    );

    const checkinsCount = data.participants.filter(p => p.status === 'used').length;

    // --- NOVA FUNÇÃO DE EXPORTAÇÃO (EXCEL REAL) ---
    const handleExportExcel = () => {
        if (filteredParticipants.length === 0) return toast.error("Nada para exportar.");

        // 1. Prepara os dados limpos para o Excel
        const dataToExport = filteredParticipants.map(p => {
            // Dados fixos
            const row = {
                "Status": p.status === 'used' ? 'UTILIZADO' : 'VÁLIDO',
                "Código": p.code,
                "Nome do Participante": p.buyerName,
                "E-mail": p.buyerEmail,
                "Tipo de Ingresso": formatText(p.ticketType),
                "Lote": formatText(p.batch),
                "Data da Compra": new Date(p.purchaseDate).toLocaleString('pt-BR')
            };

            // Adiciona colunas dinâmicas (Formulário Personalizado)
            if (data.formSchema) {
                data.formSchema.forEach(q => {
                    row[q.label] = p[q.label] || '-';
                });
            }

            return row;
        });

        // 2. Cria a Planilha (Worksheet)
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);

        // 3. Ajusta a largura das colunas automaticamente (Para ficar bonito)
        const columnWidths = [
            { wch: 15 }, // Status
            { wch: 30 }, // Código (Largo)
            { wch: 30 }, // Nome
            { wch: 30 }, // Email
            { wch: 20 }, // Ingresso
            { wch: 15 }, // Lote
            { wch: 20 }, // Data
        ];
        
        // Adiciona largura para colunas extras do formulário
        if (data.formSchema) {
            data.formSchema.forEach(() => columnWidths.push({ wch: 25 }));
        }
        worksheet['!cols'] = columnWidths;

        // 4. Cria o Arquivo (Workbook) e Baixa
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Participantes");
        
        // Gera o nome do arquivo limpo
        const cleanTitle = data.eventTitle ? data.eventTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'evento';
        XLSX.writeFile(workbook, `lista_${cleanTitle}.xlsx`);
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
                        <div style={{display: 'flex', gap: '15px'}}>
                            <span className="badge-total"><FaUserFriends /> {data.participants.length}</span>
                            <span className="badge-total" style={{backgroundColor: '#10b981', color: '#fff'}}>
                                <FaClipboardCheck /> {checkinsCount}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="toolbar">
                    <div className="search-box">
                        <FaSearch className="search-icon"/>
                        <input type="text" placeholder="Buscar participante..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
                    </div>
                    {/* Botão Atualizado para chamar handleExportExcel */}
                    <button className="export-btn" onClick={handleExportExcel}>
                        <FaFileExcel /> Baixar Excel
                    </button>
                </div>

                <div className="table-container">
                    <table className="participants-table">
                        <thead>
                            <tr>
                                <th style={{width: '50px'}}>Status</th>
                                <th>Participante</th>
                                <th>Ingresso</th>
                                <th style={{textAlign: 'right', paddingRight: '30px'}}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredParticipants.length > 0 ? (
                                filteredParticipants.map((p) => (
                                    <tr key={p.id} className={p.status === 'used' ? 'row-used' : ''}>
                                        <td style={{textAlign: 'center'}}>
                                            <span className={`status-dot ${p.status}`} title={p.status === 'used' ? 'Utilizado' : 'Válido'}></span>
                                        </td>
                                        <td>
                                            <div className="user-cell">
                                                <span className="user-name">{p.buyerName}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="ticket-badge-wrapper">
                                                <span className="ticket-type-name">{formatText(p.ticketType)}</span>
                                                <span className="ticket-batch-name">{formatText(p.batch)}</span>
                                            </div>
                                        </td>
                                        <td style={{textAlign: 'right'}}>
                                            <div className="action-buttons-row">
                                                <button className="icon-btn-view" onClick={() => setSelectedParticipant(p)} title="Ver Detalhes"><FaEye /></button>
                                                {p.status === 'valid' ? (
                                                    <button 
                                                        className="icon-btn-checkin" 
                                                        onClick={() => handleManualCheckIn(p.code, p.id)}
                                                        disabled={processingCheckin === p.id}
                                                        title="Fazer Check-in"
                                                    >
                                                        {processingCheckin === p.id ? <FaSpinner className="spin" /> : <FaCheck />}
                                                    </button>
                                                ) : (
                                                    <span className="checked-icon"><FaCheckCircle /></span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="empty-state">
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

            {/* MODAL */}
            {selectedParticipant && (
                <div className="modal-overlay" onClick={() => setSelectedParticipant(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Detalhes do Participante</h2>
                            <button className="close-modal-btn" onClick={() => setSelectedParticipant(null)}><FaTimes /></button>
                        </div>
                        <div className="modal-body">
                            <div className="modal-status-banner" style={{background: selectedParticipant.status === 'used' ? '#f1f5f9' : '#d1fae5', color: selectedParticipant.status === 'used' ? '#64748b' : '#065f46'}}>
                                <strong>Status:</strong> {selectedParticipant.status === 'used' ? 'JÁ UTILIZADO (Entrou)' : 'VÁLIDO (Pendente)'}
                            </div>
                            <div className="info-grid">
                                <div className="info-item"><label>Nome Completo</label><p>{selectedParticipant.buyerName}</p></div>
                                <div className="info-item"><label>E-mail</label><p>{selectedParticipant.buyerEmail}</p></div>
                                <div className="info-item"><label>Código do Ingresso</label><p className="code-display">{selectedParticipant.code}</p></div>
                                <div className="info-item"><label>Data da Compra</label><p>{new Date(selectedParticipant.purchaseDate).toLocaleString('pt-BR')}</p></div>
                            </div>
                            {data.formSchema && data.formSchema.length > 0 && (
                                <div className="custom-data-section">
                                    <h3>Respostas do Formulário</h3>
                                    <div className="custom-grid">
                                        {data.formSchema.map((q, i) => (
                                            <div key={i} className="custom-item"><label>{q.label}</label><p>{selectedParticipant[q.label] || '-'}</p></div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {selectedParticipant.status === 'valid' && (
                                <div className="modal-footer">
                                    <button className="big-checkin-btn" onClick={() => handleManualCheckIn(selectedParticipant.code, selectedParticipant.id)} disabled={processingCheckin === selectedParticipant.id}>
                                        {processingCheckin === selectedParticipant.id ? 'Processando...' : 'CONFIRMAR ENTRADA (CHECK-IN)'}
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