'use client';

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation"; 
import { 
    FaTicketAlt, FaMinus, FaPlus, FaShoppingCart, 
    FaChevronDown, FaChevronUp, FaMapMarkerAlt, FaTag, 
    FaCheckCircle, FaPercentage, FaInstagram, FaCalendarDay, 
    FaUserAlt, FaExternalLinkAlt, FaTimes, FaClipboardList
} from 'react-icons/fa'; 
import Header from '@/components/Header';
import toast, { Toaster } from 'react-hot-toast';
import Footer from '@/components/Footer';
import './EventoDetalhes.css'; 

const getApiBaseUrl = () => {
    if (typeof window === 'undefined') return 'http://localhost:5000/api';
    return `${window.location.protocol}//${window.location.hostname}:5000/api`;
};

const SkeletonLoader = () => (
    <div className="event-details-page-container">
        <Header />
        <div className="hero-banner skeleton-hero"></div>
        <div className="event-details-main-content">
            <div className="event-details-body">
                <div className="event-details-left-column">
                    <div className="content-box">
                        <div className="skeleton-line" style={{width: '40%', height: '30px', marginBottom: '20px'}}></div>
                        <div className="skeleton-line" style={{width: '100%', height: '15px'}}></div>
                        <div className="skeleton-line" style={{width: '100%', height: '15px'}}></div>
                    </div>
                </div>
                <div className="event-details-right-column">
                    <div className="content-box">
                        <div className="skeleton-line" style={{width: '100%', height: '200px'}}></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

export default function EventoDetalhes() {
    const params = useParams(); 
    const router = useRouter();
    const id = params?.id;
    const API_BASE_URL = getApiBaseUrl();

    const [evento, setEvento] = useState(null);
    const [loading, setLoading] = useState(true);
    const [ticketQuantities, setTicketQuantities] = useState({}); 
    const [isTicketsOpen, setIsTicketsOpen] = useState(true); 
    const [couponCode, setCouponCode] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [displayDate, setDisplayDate] = useState(null);
    const [organizerInfo, setOrganizerInfo] = useState({ name: "Produtor", instagram: "" });

    const [showParticipantModal, setShowParticipantModal] = useState(false);
    const [participantsData, setParticipantsData] = useState({});

    useEffect(() => {
        if (!id) return; 
        const loadData = async () => {
            setLoading(true);
            try {
                const fetchEvent = await fetch(`${API_BASE_URL}/events/${id}`);
                const eventData = await fetchEvent.json();

                if (fetchEvent.ok && eventData) {
                    setEvento(eventData);
                    let eventDate = null;
                    // Lógica para pegar a melhor data disponível
                    if (eventData.eventDate) eventDate = new Date(eventData.eventDate);
                    else if (eventData.sessions?.length) {
                        // Tenta parsear se for string, senão usa direto
                        const sessions = typeof eventData.sessions === 'string' ? JSON.parse(eventData.sessions) : eventData.sessions;
                        if (sessions[0]?.date) eventDate = new Date(sessions[0].date);
                    }
                    // Fallback final
                    if (!eventDate && eventData.createdAt) eventDate = new Date(eventData.createdAt);
                    
                    setDisplayDate(eventDate);

                    let orgName = eventData.organizerName || (eventData.organizer && eventData.organizer.name) || "Produtor";
                    let orgInsta = eventData.organizerInstagram || "";
                    
                    // Se organizerInfo for objeto no banco
                    if (eventData.organizerInfo) {
                         const info = typeof eventData.organizerInfo === 'string' ? JSON.parse(eventData.organizerInfo) : eventData.organizerInfo;
                         if (info.name) orgName = info.name;
                         if (info.instagram) orgInsta = info.instagram;
                    }

                    setOrganizerInfo({ name: orgName, instagram: orgInsta });
                } else {
                    toast.error("Evento não encontrado.");
                }
            } catch (error) {
                console.error("Erro:", error);
                toast.error("Erro de conexão.");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [id]);

    const handleQuantityChange = (ticketId, delta) => {
        setTicketQuantities(prev => {
            const currentQty = prev[ticketId] || 0;
            return { ...prev, [ticketId]: Math.max(0, currentQty + delta) };
        });
    };

    const handleApplyCoupon = async () => {
        if (!couponCode) return;
        
        const toastId = toast.loading("Validando cupom...");

        try {
            const response = await fetch(`${API_BASE_URL}/payments/validate-coupon`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: couponCode, eventId: id })
            });

            const data = await response.json();

            if (response.ok && data.valid) {
                setAppliedCoupon({ code: data.code, feeRate: 0.03 }); // Exemplo: taxa cai para 3%
                toast.success(data.message, { id: toastId });
            } else {
                setAppliedCoupon(null);
                toast.error(data.message || "Cupom inválido.", { id: toastId });
            }
        } catch (error) {
            setAppliedCoupon(null);
            toast.error("Erro ao validar cupom.", { id: toastId });
        }
    };

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setCouponCode("");
        toast('Cupom removido.', { icon: '🗑️' });
    };

    const handleInputChange = (ticketId, index, questionLabel, value) => {
        const key = `${ticketId}_${index}`;
        setParticipantsData(prev => ({ ...prev, [key]: { ...prev[key], [questionLabel]: value } }));
    };

    const validateParticipants = () => {
        if (!evento.formSchema || evento.formSchema.length === 0) return true;
        
        // Parse formSchema se for string
        const schema = typeof evento.formSchema === 'string' ? JSON.parse(evento.formSchema) : evento.formSchema;

        for (const [ticketId, qty] of Object.entries(ticketQuantities)) {
            if (qty > 0) {
                const ticketName = evento.tickets.find(t => t.id === ticketId || t._id === ticketId)?.name;
                for (let i = 0; i < qty; i++) {
                    const key = `${ticketId}_${i}`;
                    const data = participantsData[key] || {};
                    for (const q of schema) {
                        if (q.required && (!data[q.label] || data[q.label].trim() === '')) {
                            toast.error(`Preencha "${q.label}" para o ${ticketName} #${i+1}`);
                            return false;
                        }
                    }
                }
            }
        }
        return true;
    };

    const handleBuyClick = async () => {
        const token = localStorage.getItem('userToken');
        if (!token) {
            toast.error("Faça login para continuar.");
            // Salva a intenção de compra para redirecionar depois? (Opcional)
            router.push('/login');
            return;
        }
        
        let totalQty = 0;
        Object.values(ticketQuantities).forEach(qty => totalQty += qty);
        if (totalQty === 0) return toast.error("Selecione pelo menos um ingresso.");

        // Verifica se há formulário para preencher
        const schema = typeof evento.formSchema === 'string' ? JSON.parse(evento.formSchema) : evento.formSchema;
        
        if (schema && schema.length > 0 && !showParticipantModal) {
            setShowParticipantModal(true);
            return;
        }
        if (showParticipantModal && !validateParticipants()) return;

        const formattedParticipants = [];
        if (showParticipantModal) {
            for (const [key, data] of Object.entries(participantsData)) {
                const [ticketId] = key.split('_');
                formattedParticipants.push({ ticketTypeId: ticketId, data });
            }
        }

        try {
            toast.loading("Iniciando pagamento...");
            const response = await fetch(`${API_BASE_URL}/payments/create-checkout-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token.replace(/"/g, '')}` },
                body: JSON.stringify({ 
                    eventId: id, tickets: ticketQuantities, 
                    couponCode: appliedCoupon?.code, participantData: formattedParticipants 
                })
            });
            const data = await response.json();
            toast.dismiss();
            if (response.ok && data.url) window.location.href = data.url;
            else {
                toast.error(data.message || "Erro no pagamento.");
                if (data.message && data.message.includes("Cupom")) setAppliedCoupon(null);
            }
        } catch (error) {
            toast.dismiss();
            toast.error("Erro de conexão.");
        }
    };

    const renderParticipantInputs = () => {
        const inputs = [];
        const schema = typeof evento.formSchema === 'string' ? JSON.parse(evento.formSchema) : evento.formSchema;

        Object.entries(ticketQuantities).forEach(([ticketId, qty]) => {
            if (qty > 0) {
                const ticketInfo = evento.tickets.find(t => t.id === ticketId || t._id === ticketId);
                for (let i = 0; i < qty; i++) {
                    const key = `${ticketId}_${i}`;
                    const currentData = participantsData[key] || {};
                    inputs.push(
                        <div key={key} className="participant-card">
                            <span className="participant-badge"><FaUserAlt style={{marginRight: '6px'}}/>{ticketInfo?.name} - Participante #{i + 1}</span>
                            {schema.map((q, qIdx) => (
                                <div key={qIdx} className="form-group">
                                    <label className="form-label">{q.label} {q.required && <span className="required-mark">*</span>}</label>
                                    {q.type === 'select' ? (
                                        <select className="form-select" value={currentData[q.label] || ""} onChange={(e) => handleInputChange(ticketId, i, q.label, e.target.value)}>
                                            <option value="">Selecione...</option>{q.options.split(',').map(opt => <option key={opt} value={opt.trim()}>{opt.trim()}</option>)}
                                        </select>
                                    ) : q.type === 'checkbox' ? (
                                        <div style={{display:'flex', gap:'10px'}}><label><input type="radio" name={`${key}_${q.label}`} value="Sim" onChange={(e) => handleInputChange(ticketId, i, q.label, e.target.value)}/> Sim</label><label><input type="radio" name={`${key}_${q.label}`} value="Não" onChange={(e) => handleInputChange(ticketId, i, q.label, e.target.value)}/> Não</label></div>
                                    ) : (
                                        <input type="text" className="form-input" placeholder="Sua resposta" value={currentData[q.label] || ""} onChange={(e) => handleInputChange(ticketId, i, q.label, e.target.value)}/>
                                    )}
                                </div>
                            ))}
                        </div>
                    );
                }
            }
        });
        return inputs;
    };

    const getGoogleMapsLink = () => { if (!evento) return "#"; const query = encodeURIComponent(`${evento.location}, ${evento.city}`); return `https://www.google.com/maps/search/?api=1&query=${query}`; };
    const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
    
    if (loading) return <SkeletonLoader />;
    if (!evento) return <div className="error-screen">Evento não encontrado.</div>;

    const rate = appliedCoupon ? appliedCoupon.feeRate : 0.08; // Taxa padrão 8% ou cupom
    let total = 0;
    
    // Tratamento para garantir que tickets existe e normalizar ID
    const ticketsList = evento.tickets || evento.ticketTypes || [];

    if (ticketsList.length > 0) {
        ticketsList.forEach(ticket => {
            const tId = ticket.id || ticket._id;
            const qty = ticketQuantities[tId] || 0;
            // Preço + Taxa
            total += ((ticket.price + (ticket.price * rate)) * qty);
        });
    }

    return (
        <div className="event-details-page-container">
            <Toaster position="top-center" />
            <Header/>
            <div className="hero-banner">
                <div className="hero-background" style={{ backgroundImage: `url(${evento.imageUrl})` }}></div>
                <div className="hero-content">
                    <div className="hero-image-wrapper"><img src={evento.imageUrl} alt={evento.title} className="hero-cover" /></div>
                    <div className="hero-info">
                        <div className="hero-badges"><span className="hero-category">{evento.category}</span>{evento.ageRating && <span className="hero-rating">{evento.ageRating}</span>}</div>
                        <h1 className="hero-title">{evento.title}</h1>
                        <div className="hero-compact-row">
                            {displayDate && <div className="compact-item"><FaCalendarDay className="compact-icon" /><span>{displayDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}<span className="compact-separator"> às </span><span className="compact-time">{displayDate.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}h</span></span></div>}
                            <a href={getGoogleMapsLink()} target="_blank" rel="noopener noreferrer" className="compact-item location-link"><FaMapMarkerAlt className="compact-icon location-color" /><span className="location-text">{evento.location} - {evento.city}</span><FaExternalLinkAlt className="external-icon" /></a>
                        </div>
                    </div>
                </div>
            </div>

            <section className="event-details-main-content">
                <div className="event-details-body">
                    <div className="event-details-left-column">
                        <div className="content-box description-box"><h3>Sobre o Evento</h3><div className="description-text">{evento.description}</div></div>
                        <div className="content-box organizer-box"><h3>Organizado por</h3><div className="organizer-profile"><div className="organizer-avatar">{organizerInfo.name.charAt(0).toUpperCase()}</div><div className="organizer-info"><h4>{organizerInfo.name}</h4>{organizerInfo.instagram && <a href={`https://instagram.com/${organizerInfo.instagram.replace('@', '')}`} target="_blank" className="organizer-insta-btn"><FaInstagram /> <span>{organizerInfo.instagram.includes('@') ? organizerInfo.instagram : `@${organizerInfo.instagram}`}</span></a>}</div></div></div>
                    </div>

                    <div className="event-details-right-column">
                        <div className="tickets-section">
                            <div className="tickets-header" onClick={() => setIsTicketsOpen(!isTicketsOpen)}><h3><FaTicketAlt /> Ingressos</h3>{isTicketsOpen ? <FaChevronUp /> : <FaChevronDown />}</div>
                            {isTicketsOpen && (
                                <div className="tickets-content">
                                    {ticketsList.map(ticket => {
                                        const tId = ticket.id || ticket._id;
                                        const qty = ticketQuantities[tId] || 0;
                                        const fee = ticket.price * rate; 
                                        const available = ticket.quantity - (ticket.sold || 0);
                                        const isSoldOut = available <= 0;

                                        return (
                                            <div key={tId} className={`ticket-item ${isSoldOut ? 'ticket-sold-out' : ''}`}>
                                                <div className="ticket-info">
                                                    <span className="ticket-name">{ticket.name}</span>
                                                    <span className="ticket-batch">{ticket.batch || ticket.batchName || 'Lote Único'}</span>
                                                    <div className="ticket-price-row">
                                                        <span className="ticket-price">{ticket.price === 0 ? 'Grátis' : formatCurrency(ticket.price)}</span>
                                                        {ticket.price > 0 && <div className="fee-container"><span className={`ticket-fee ${appliedCoupon ? 'discounted-fee' : ''}`}>+ {formatCurrency(fee)} taxa</span></div>}
                                                    </div>
                                                    {isSoldOut && <span className="sold-out-badge">ESGOTADO</span>}
                                                </div>
                                                <div className="ticket-controls">
                                                    <button className="qty-btn" onClick={() => handleQuantityChange(tId, -1)} disabled={qty===0 || isSoldOut}><FaMinus size={10}/></button>
                                                    <span className="qty-display">{qty}</span>
                                                    <button className="qty-btn" onClick={() => handleQuantityChange(tId, 1)} disabled={isSoldOut || qty >= available}><FaPlus size={10}/></button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div className="coupon-section">
                                        {!appliedCoupon ? (
                                            <div className="coupon-input-group">
                                                <input type="text" placeholder="Tem um cupom?" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} className="coupon-input"/>
                                                <button onClick={handleApplyCoupon} className="coupon-btn"><FaTag /></button>
                                            </div>
                                        ) : (
                                            <div className="coupon-applied-box">
                                                <div className="coupon-active-header"><span className="coupon-code"><FaCheckCircle /> {appliedCoupon.code}</span><button onClick={handleRemoveCoupon} className="remove-coupon-btn">Remover</button></div>
                                                <div className="coupon-msg"><FaPercentage /> Taxa reduzida para 3%!</div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="tickets-footer">
                                        <div className="total-row"><span>Total</span><div className="total-values"><span className="total-price" style={appliedCoupon ? {color:'#2f855a'} : {}}>{formatCurrency(total)}</span></div></div>
                                        <button className="buy-now-button" onClick={handleBuyClick}><FaShoppingCart /> Comprar Ingressos</button>
                                        <div className="secure-checkout-text"><FaCheckCircle size={10}/> 100% Seguro</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>
            
            {showParticipantModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header"><h3><FaClipboardList /> Dados dos Participantes</h3><button className="close-modal-btn" onClick={() => setShowParticipantModal(false)}><FaTimes /></button></div>
                        <div className="modal-body"><p style={{marginBottom: '20px', color: '#64748b', fontSize: '0.95rem'}}>O organizador solicitou as seguintes informações.</p>{renderParticipantInputs()}</div>
                        <div className="modal-footer"><button className="cancel-btn" onClick={() => setShowParticipantModal(false)}>Voltar</button><button className="confirm-btn" onClick={handleBuyClick}>Ir para Pagamento <FaShoppingCart /></button></div>
                    </div>
                </div>
            )}
            <Footer />
        </div>
    );
}