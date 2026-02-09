'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { FaArrowLeft, FaFileCsv, FaSearch, FaUserFriends, FaTicketAlt, FaCheck, FaCheckCircle, FaSpinner } from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast';
import './Participantes.css';

const getApiBaseUrl = () => {
    if (typeof window === 'undefined') return 'http://localhost:5000/api';
    return `${window.location.protocol}//${window.location.hostname}:5000/api`;
};

export default function Participantes() {
    const params = useParams();
    const router = useRouter();
    const API_BASE_URL = getApiBaseUrl();
    
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({ participants: [], formSchema: [], eventTitle: '', eventImageUrl: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [processingCheckin, setProcessingCheckin] = useState(null);

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
                    toast.error("Erro ao carregar lista de participantes.");
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

    // Função de formatação para Ingresso e Lote
    const formatText = (text) => {
        if (!text) return '';
        return text.toString()
            .replace(/(\d+)\s*[oO°]/g, '$1º')
            .replace(/(\d+)\s*[aAª]/g, '$1ª');
    };

    const handleManualCheckIn = async (qrCode, ticketId) => {
        if (!confirm("Confirmar check-in manual para este participante?")) return;

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
                toast.success("Check-in realizado com sucesso!");
                setData(prev => ({
                    ...prev,
                    participants: prev.participants.map(p => 
                        p.id === ticketId ? { ...p, status: 'used' } : p
                    )
                }));
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

    const handleExportCSV = () => {
        if (filteredParticipants.length === 0) return toast.error("Nada para exportar.");

        let headers = ["Status", "Código", "Comprador", "Email", "Ingresso", "Lote", "Data Compra"];
        const dynamicHeaders = data.formSchema ? data.formSchema.map(q => q.label) : [];
        headers = [...headers, ...dynamicHeaders];

        const rows = filteredParticipants.map(p => {
            const fixedData = [
                p.status === 'used' ? 'UTILIZADO' : 'VÁLIDO',
                p.code,
                p.buyerName,
                p.buyerEmail,
                formatText(p.ticketType), // Aplica formatação
                formatText(p.batch),      // Aplica formatação
                new Date(p.purchaseDate).toLocaleDateString('pt-BR')
            ];
            
            const dynamicData = dynamicHeaders.map(header => {
                const answer = p[header]; 
                return answer ? answer.toString().replace(/"/g, '""') : '-';
            });
            
            return [...fixedData, ...dynamicData].map(field => `"${field}"`).join(",");
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `lista_participantes_${data.eventTitle || 'evento'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return <div className="loading-container">Carregando lista...</div>;

    return (
        <div className="participants-page">
            <Toaster position="top-right" />
            <Header />
            
            <main className="main-content-participants">
                <div className="page-header">
                    <button className="back-btn" onClick={() => router.back()}><FaArrowLeft /> Voltar ao Painel</button>
                    <div className="header-title-row">
                        <div className="title-wrapper">
                            {data.eventImageUrl && (
                                <img src={data.eventImageUrl} alt="Evento" className="header-event-thumb" />
                            )}
                            <div className="title-block">
                                <h1>{data.eventTitle}</h1>
                                <p className="subtitle">Gestão de Participantes</p>
                            </div>
                        </div>
                        <span className="badge-total"><FaUserFriends /> {filteredParticipants.length} Participantes</span>
                    </div>
                </div>

                <div className="toolbar">
                    <div className="search-box">
                        <FaSearch className="search-icon"/>
                        <input 
                            type="text" 
                            placeholder="Buscar por nome, email ou código..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="export-btn" onClick={handleExportCSV}>
                        <FaFileCsv /> Exportar Lista (Excel)
                    </button>
                </div>

                <div className="table-container">
                    <table className="participants-table">
                        <thead>
                            <tr>
                                <th style={{width: '60px', textAlign: 'center'}}>St</th>
                                <th>Código</th>
                                <th>Participante</th>
                                <th>Ingresso</th>
                                {data.formSchema && data.formSchema.map((q, i) => (
                                    <th key={i}>{q.label}</th>
                                ))}
                                <th>Data Compra</th>
                                <th style={{textAlign: 'center'}}>Check-in</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredParticipants.length > 0 ? (
                                filteredParticipants.map((p) => (
                                    <tr key={p.id} className={p.status === 'used' ? 'row-used' : ''}>
                                        <td style={{textAlign: 'center'}}>
                                            <span className={`status-dot ${p.status}`} title={p.status === 'used' ? 'Utilizado' : 'Válido'}></span>
                                        </td>
                                        <td className="code-col">
                                            <span className="code-tag">{p.code.split('-')[1]}...</span>
                                        </td>
                                        <td>
                                            <div className="user-cell">
                                                <span className="user-name">{p.buyerName}</span>
                                                <span className="user-email">{p.buyerEmail}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="ticket-badge-wrapper">
                                                {/* Formatação no Nome do Ingresso */}
                                                <span className="ticket-type-name">{formatText(p.ticketType)}</span>
                                                {/* Formatação no Nome do Lote */}
                                                <span className="ticket-batch-name">{formatText(p.batch)}</span>
                                            </div>
                                        </td>
                                        {data.formSchema && data.formSchema.map((q, i) => (
                                            <td key={i}>
                                                {p[q.label] ? (
                                                    <span className="form-answer">{p[q.label]}</span>
                                                ) : (
                                                    <span className="empty-dash">-</span>
                                                )}
                                            </td>
                                        ))}
                                        <td className="date-col">
                                            {new Date(p.purchaseDate).toLocaleDateString('pt-BR')} <br/>
                                            <small>{new Date(p.purchaseDate).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</small>
                                        </td>
                                        <td className="action-col">
                                            {p.status === 'valid' ? (
                                                <button 
                                                    className="btn-checkin" 
                                                    onClick={() => handleManualCheckIn(p.code, p.id)}
                                                    disabled={processingCheckin === p.id}
                                                    title="Validar Entrada"
                                                >
                                                    {processingCheckin === p.id ? <FaSpinner className="spin" /> : <FaCheck />}
                                                </button>
                                            ) : (
                                                <span className="badge-checked">
                                                    <FaCheckCircle /> Validado
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6 + (data.formSchema ? data.formSchema.length : 0)} className="empty-state">
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
            <Footer />
        </div>
    );
}