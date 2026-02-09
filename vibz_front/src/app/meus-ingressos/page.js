'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import toast, { Toaster } from 'react-hot-toast';
import { FaTicketAlt, FaCalendarDay, FaMapMarkerAlt, FaQrcode, FaHistory, FaTimes } from 'react-icons/fa';
import './MeusIngressos.css';

const getApiBaseUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
};

export default function MeusIngressos() {
    const router = useRouter();
    const API_BASE_URL = getApiBaseUrl();
    
    const [loading, setLoading] = useState(true);
    const [tickets, setTickets] = useState([]);
    const [activeTab, setActiveTab] = useState('valid'); 
    const [selectedTicket, setSelectedTicket] = useState(null); 

    useEffect(() => {
        const fetchTickets = async () => {
            const token = localStorage.getItem('userToken')?.replace(/"/g, '');
            if (!token) return router.push('/login');

            try {
                const response = await fetch(`${API_BASE_URL}/tickets/my-tickets`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    setTickets(data);
                } else {
                    toast.error("Erro ao carregar ingressos.");
                }
            } catch (error) {
                console.error(error);
                toast.error("Erro de conexão.");
            } finally {
                setLoading(false);
            }
        };
        fetchTickets();
    }, [router, API_BASE_URL]);

    const formatText = (text) => {
        if (!text) return '';
        return text.toString()
            .replace(/(\d+)\s*[oO°]/g, '$1º')
            .replace(/(\d+)\s*[aAª]/g, '$1ª');
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Data não definida';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Data inválida';
            // Formato: "03 de Março"
            return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
        } catch (e) {
            return 'Erro na data';
        }
    };

    const validTickets = tickets.filter(t => t.status === 'valid');
    const historyTickets = tickets.filter(t => t.status !== 'valid'); 

    const currentList = activeTab === 'valid' ? validTickets : historyTickets;

    const openTicket = (ticket) => setSelectedTicket(ticket);
    const closeTicket = () => setSelectedTicket(null);

    if (loading) return <div className="loading-screen">Carregando carteira...</div>;

    return (
        <div className="wallet-page">
            <Toaster position="top-center" />
            <Header />

            <main className="wallet-content">
                <div className="wallet-header">
                    <h1>Meus Ingressos</h1>
                    <p>Gerencie seus próximos eventos e histórico.</p>
                </div>

                <div className="wallet-tabs">
                    <button 
                        className={`tab-btn ${activeTab === 'valid' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('valid')}
                    >
                        <FaTicketAlt /> Próximos
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('history')}
                    >
                        <FaHistory /> Histórico
                    </button>
                </div>

                <div className="tickets-grid">
                    {currentList.length === 0 ? (
                        <div className="empty-wallet">
                            <FaTicketAlt className="empty-icon" />
                            <h3>Nenhum ingresso encontrado</h3>
                            <p>Você ainda não tem ingressos nesta categoria.</p>
                            <button className="btn-explore" onClick={() => router.push('/')}>Explorar Eventos</button>
                        </div>
                    ) : (
                        currentList.map((ticket) => (
                            <div key={ticket.id || ticket._id} className="ticket-card" onClick={() => openTicket(ticket)}>
                                {/* IMAGEM DO EVENTO NA ESQUERDA */}
                                <div className="ticket-left">
                                    <img 
                                        src={ticket.event?.imageUrl || '/img/default-event.jpg'} 
                                        alt={ticket.event?.title} 
                                        className="ticket-thumb"
                                    />
                                </div>
                                
                                <div className="ticket-center">
                                    <h3>{formatText(ticket.event?.title || "Evento Desconhecido")}</h3>
                                    
                                    {/* TIPO DE INGRESSO (TAG) */}
                                    <span className="ticket-type">{formatText(ticket.ticketType?.name || "Ingresso")}</span>
                                    
                                    <div className="ticket-meta">
                                        {/* DATA E LOCAL JUNTOS */}
                                        <span className="meta-item">
                                            <FaCalendarDay /> {formatDate(ticket.event?.date)}
                                        </span>
                                        <span className="separator">•</span>
                                        <span className="meta-item">
                                            <FaMapMarkerAlt /> {ticket.event?.city || "Local não informado"}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="ticket-right">
                                    <button className="btn-qr">
                                        <FaQrcode />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>

            {/* MODAL MANTIDO IGUAL */}
            {selectedTicket && (
                <div className="modal-overlay" onClick={closeTicket}>
                    <div className="ticket-modal" onClick={e => e.stopPropagation()}>
                        <button className="close-modal" onClick={closeTicket}><FaTimes /></button>
                        <div className="modal-event-image" style={{backgroundImage: `url(${selectedTicket.event?.imageUrl || '/img/default-event.jpg'})`}}>
                            <div className="modal-overlay-gradient"></div>
                            <h2>{formatText(selectedTicket.event?.title)}</h2>
                        </div>
                        <div className="modal-body">
                            <div className="qr-container">
                                <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${selectedTicket.qrCodeData || selectedTicket.code}`} 
                                    alt="QR Code" 
                                    className="qr-image"
                                />
                                <p className="qr-code-text">{selectedTicket.qrCodeData || selectedTicket.code}</p>
                            </div>
                            <div className="ticket-info-block">
                                <div className="info-row">
                                    <span>Titular</span>
                                    <strong>{selectedTicket.user?.name || "Você"}</strong>
                                </div>
                                <div className="info-row">
                                    <span>Categoria</span>
                                    <strong>{formatText(selectedTicket.ticketType?.name)}</strong>
                                </div>
                                <div className="info-row">
                                    <span>Data</span>
                                    <strong>{formatDate(selectedTicket.event?.date)}</strong>
                                </div>
                                <div className="status-row">
                                    <span className={`status-pill ${selectedTicket.status}`}>
                                        {selectedTicket.status === 'valid' ? 'VÁLIDO PARA USO' : 'JÁ UTILIZADO'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <Footer />
        </div>
    );
}