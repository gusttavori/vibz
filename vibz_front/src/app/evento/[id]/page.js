'use client';

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation"; 
import { 
    FaTicketAlt, FaMinus, FaPlus, FaShoppingCart, 
    FaChevronDown, FaChevronUp, FaMapMarkerAlt, FaTag, 
    FaCheckCircle, FaPercentage, FaInstagram, FaCalendarDay, 
    FaUserAlt, FaExternalLinkAlt, FaTimes, FaClipboardList,
    FaInfoCircle, FaClock, FaCopy
} from 'react-icons/fa'; 
import Header from '@/components/Header';
import toast, { Toaster } from 'react-hot-toast';
import Footer from '@/components/Footer';
import './EventoDetalhes.css'; 

const getApiBaseUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
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

const formatDateSimple = (dateStr) => {
    if (!dateStr) return null;
    const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}`; 
    }
    return null;
};

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
    
    // NOVO ESTADO: Controla a replicação de dados
    const [replicateData, setReplicateData] = useState(false);

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
                    if (eventData.eventDate) eventDate = new Date(eventData.eventDate);
                    else if (eventData.sessions?.length) {
                        const sessions = typeof eventData.sessions === 'string' ? JSON.parse(eventData.sessions) : eventData.sessions;
                        if (sessions[0]?.date) eventDate = new Date(sessions[0].date);
                    }
                    if (!eventDate && eventData.createdAt) eventDate = new Date(eventData.createdAt);
                    
                    setDisplayDate(eventDate);

                    let orgName = eventData.organizerName || (eventData.organizer && eventData.organizer.name) || "Produtor";
                    let orgInsta = eventData.organizerInstagram || "";
                    
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
        const ticket = evento.tickets.find(t => t.id === ticketId || t._id === ticketId);
        const maxPerUser = ticket?.maxPerUser || 4; 

        setTicketQuantities(prev => {
            const currentQty = prev[ticketId] || 0;
            const newQty = currentQty + delta;

            if (newQty > maxPerUser) {
                toast.error(`Limite de ${maxPerUser} ingressos por pessoa.`);
                return prev;
            }

            return { ...prev, [ticketId]: Math.max(0, newQty) };
        });
    };

    const hasTimeConflict = (candidateTicket, currentSelection) => {
        if (!candidateTicket.startTime || !candidateTicket.endTime || !candidateTicket.activityDate) return false;

        const toMinutes = (t) => {
            if(!t) return 0;
            const [h, m] = t.split(':').map(Number);
            return h * 60 + m;
        };
        
        const candDate = new Date(candidateTicket.activityDate).toISOString().split('T')[0];
        const candStart = toMinutes(candidateTicket.startTime);
        const candEnd = toMinutes(candidateTicket.endTime);

        for (const [tId, qty] of Object.entries(currentSelection)) {
            if (qty > 0 && tId !== candidateTicket.id && tId !== candidateTicket._id) {
                const selectedTicket = evento.tickets.find(t => (t.id === tId || t._id === tId));
                
                if (selectedTicket && selectedTicket.activityDate && selectedTicket.startTime && selectedTicket.endTime) {
                      const selDate = new Date(selectedTicket.activityDate).toISOString().split('T')[0];
                      
                      if (candDate === selDate) {
                          const selStart = toMinutes(selectedTicket.startTime);
                          const selEnd = toMinutes(selectedTicket.endTime);

                          if (Math.max(candStart, selStart) < Math.min(candEnd, selEnd)) {
                              return true;
                          }
                      }
                }
            }
        }
        return false;
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
                setAppliedCoupon({ code: data.code, feeRate: 0.03 }); 
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

    // Função auxiliar para pegar todas as chaves de participantes (ticketId_index)
    const getAllParticipantKeys = () => {
        const keys = [];
        Object.entries(ticketQuantities).forEach(([ticketId, qty]) => {
            for (let i = 0; i < qty; i++) {
                keys.push(`${ticketId}_${i}`);
            }
        });
        return keys;
    };

    const handleReplicateDataToggle = (e) => {
        const isChecked = e.target.checked;
        setReplicateData(isChecked);

        if (isChecked) {
            const allKeys = getAllParticipantKeys();
            if (allKeys.length > 1) {
                const firstKey = allKeys[0];
                const firstData = participantsData[firstKey] || {};
                
                setParticipantsData(prev => {
                    const newData = { ...prev };
                    allKeys.slice(1).forEach(key => {
                        newData[key] = { ...newData[key], ...firstData };
                    });
                    return newData;
                });
                toast.success("Dados copiados para todos os ingressos!");
            }
        }
    };

    const handleInputChange = (ticketId, index, questionLabel, value) => {
        const key = `${ticketId}_${index}`;
        
        setParticipantsData(prev => {
            // Atualiza o campo atual
            const newData = { ...prev, [key]: { ...prev[key], [questionLabel]: value } };

            // Se a replicação estiver ativa e estamos editando o PRIMEIRO participante
            if (replicateData) {
                const allKeys = getAllParticipantKeys();
                const firstKey = allKeys[0];

                if (key === firstKey) {
                    // Copia o valor para todos os outros participantes
                    allKeys.slice(1).forEach(targetKey => {
                        newData[targetKey] = { 
                            ...newData[targetKey], 
                            [questionLabel]: value 
                        };
                    });
                }
            }
            return newData;
        });
    };

    const validateParticipants = () => {
        if (!evento.formSchema || evento.formSchema.length === 0) return true;
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
            router.push('/login');
            return;
        }
        
        let totalQty = 0;
        Object.values(ticketQuantities).forEach(qty => totalQty += qty);
        if (totalQty === 0) return toast.error("Selecione pelo menos um ingresso.");

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
        let globalIndex = 0;

        Object.entries(ticketQuantities).forEach(([ticketId, qty]) => {
            if (qty > 0) {
                const ticketInfo = evento.tickets.find(t => t.id === ticketId || t._id === ticketId);
                for (let i = 0; i < qty; i++) {
                    const key = `${ticketId}_${i}`;
                    const currentData = participantsData[key] || {};
                    const isFirst = globalIndex === 0; // Identifica se é o primeiro formulário de todos
                    
                    inputs.push(
                        <div key={key} className="participant-card">
                            <span className="participant-badge">
                                <FaUserAlt style={{marginRight: '6px'}}/>
                                {ticketInfo?.name} - Participante #{i + 1}
                                {isFirst && replicateData && <span style={{marginLeft: '10px', fontSize: '0.7em', color: '#0369a1'}}>(Principal - Dados serão copiados)</span>}
                            </span>
                            
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
                    globalIndex++;
                }
            }
        });
        return inputs;
    };

    const getGoogleMapsLink = () => { if (!evento) return "#"; const query = encodeURIComponent(`${evento.location}, ${evento.city}`); return `https://www.google.com/maps/search/?api=1&query=${query}`; };
    const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
    
    if (loading) return <SkeletonLoader />;
    if (!evento) return <div className="error-screen">Evento não encontrado.</div>;

    const rate = appliedCoupon ? appliedCoupon.feeRate : 0.08; 
    let total = 0;
    
    const ticketsList = evento.tickets || evento.ticketTypes || [];

    if (ticketsList.length > 0) {
        ticketsList.forEach(ticket => {
            const tId = ticket.id || ticket._id;
            const qty = ticketQuantities[tId] || 0;
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
                        {evento.isInformational ? (
                            <div className="info-card">
                                <div className="info-header">
                                    <FaInfoCircle size={28} />
                                    <h3>Evento Informativo</h3>
                                </div>
                                <div className="info-body">
                                    <p>A venda de ingressos para este evento não é realizada pela Vibz.</p>
                                    <p className="info-highlight">Para mais informações, listas ou reservas, entre em contato diretamente com a produção.</p>
                                    
                                    {organizerInfo.instagram ? (
                                        <a href={`https://instagram.com/${organizerInfo.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="info-action-btn">
                                            <FaInstagram /> Acessar Instagram da Produção
                                        </a>
                                    ) : (
                                        <button className="info-action-btn disabled" disabled>Contato não informado</button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="tickets-section">
                                <div className="tickets-header" onClick={() => setIsTicketsOpen(!isTicketsOpen)}><h3><FaTicketAlt /> Ingressos</h3>{isTicketsOpen ? <FaChevronUp /> : <FaChevronDown />}</div>
                                {isTicketsOpen && (
                                    <div className="tickets-content">
                                        {ticketsList.length > 0 ? (
                                            ticketsList.map(ticket => {
                                                const tId = ticket.id || ticket._id;
                                                const qty = ticketQuantities[tId] || 0;
                                                const fee = ticket.price * rate; 
                                                const available = ticket.quantity - (ticket.sold || 0);
                                                const isSoldOut = available <= 0;
                                                
                                                const maxPerUser = ticket.maxPerUser || 4;
                                                const isMaxReached = qty >= maxPerUser;

                                                const isConflict = hasTimeConflict(ticket, ticketQuantities);
                                                const disablePlus = isSoldOut || qty >= available || isMaxReached || (qty === 0 && isConflict);

                                                const dateLabel = formatDateSimple(ticket.activityDate);

                                                return (
                                                    <div key={tId} className={`ticket-item ${isSoldOut ? 'ticket-sold-out' : ''} ${isConflict && qty === 0 ? 'ticket-conflict' : ''}`}>
                                                        <div className="ticket-info">
                                                            <span className="ticket-name">{ticket.name}</span>
                                                            <span className="ticket-batch">{ticket.batch || ticket.batchName || 'Lote Único'}</span>
                                                            {ticket.startTime && ticket.endTime && (
                                                                <span className="ticket-time-badge">
                                                                    {dateLabel && (
                                                                        <>
                                                                            <FaCalendarDay style={{marginRight:'4px'}}/> {dateLabel} <span style={{margin:'0 6px', opacity:0.4}}>|</span> 
                                                                        </>
                                                                    )}
                                                                    <FaClock style={{marginRight:'4px'}}/> {ticket.startTime} - {ticket.endTime}
                                                                </span>
                                                            )}
                                                            <div className="ticket-price-row">
                                                                <span className="ticket-price">{ticket.price === 0 ? 'Grátis' : formatCurrency(ticket.price)}</span>
                                                                {ticket.price > 0 && <div className="fee-container"><span className={`ticket-fee ${appliedCoupon ? 'discounted-fee' : ''}`}>+ {formatCurrency(fee)} taxa</span></div>}
                                                            </div>
                                                            {isSoldOut && <span className="sold-out-badge">ESGOTADO</span>}
                                                            {isConflict && qty === 0 && (
                                                                <span className="conflict-warning">Choque de horário com outro item</span>
                                                            )}
                                                        </div>
                                                        <div className="ticket-controls">
                                                            <button className="qty-btn" onClick={() => handleQuantityChange(tId, -1)} disabled={qty===0 || isSoldOut}><FaMinus size={10}/></button>
                                                            <span className="qty-display">{qty}</span>
                                                            <button className="qty-btn" onClick={() => handleQuantityChange(tId, 1)} disabled={disablePlus}><FaPlus size={10}/></button>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <p className="no-tickets-msg">Nenhum ingresso disponível no momento.</p>
                                        )}
                                        {ticketsList.length > 0 && (
                                            <>
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
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </section>
            
            {showParticipantModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header"><h3><FaClipboardList /> Dados dos Participantes</h3><button className="close-modal-btn" onClick={() => setShowParticipantModal(false)}><FaTimes /></button></div>
                        <div className="modal-body">
                            {/* --- FEATURE: PREENCHIMENTO AUTOMÁTICO --- */}
                            <div className="replicate-container" style={{backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', padding: '12px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center'}}>
                                <input 
                                    type="checkbox" 
                                    id="replicateCheck" 
                                    checked={replicateData} 
                                    onChange={handleReplicateDataToggle} 
                                    style={{width: '18px', height: '18px', marginRight: '10px', cursor: 'pointer'}} 
                                />
                                <label htmlFor="replicateCheck" style={{fontSize: '0.9rem', color: '#0369a1', cursor: 'pointer', fontWeight: '600'}}>
                                    Repetir dados do primeiro participante para todos
                                </label>
                            </div>

                            <p style={{marginBottom: '20px', color: '#64748b', fontSize: '0.95rem'}}>O organizador solicitou as seguintes informações para a gestão do evento.</p>
                            {renderParticipantInputs()}
                            
                            <div style={{marginTop: '20px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#64748b'}}>
                                <FaInfoCircle style={{marginRight: '5px', verticalAlign: 'middle'}}/>
                                <strong>Privacidade:</strong> Os dados acima serão compartilhados com o organizador 
                                (<strong>{organizerInfo.name}</strong>) exclusivamente para a realização deste evento. 
                                A Vibz atua como operadora dos dados.
                            </div>
                        </div>
                        <div className="modal-footer"><button className="cancel-btn" onClick={() => setShowParticipantModal(false)}>Voltar</button><button className="confirm-btn" onClick={handleBuyClick}>Ir para Pagamento <FaShoppingCart /></button></div>
                    </div>
                </div>
            )}
            <Footer />
        </div>
    );
}