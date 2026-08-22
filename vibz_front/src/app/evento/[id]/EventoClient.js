'use client';

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
    FaMapMarkerAlt, FaInstagram, FaCalendarDay, FaExternalLinkAlt, 
    FaUber, FaHamburger, FaGlassMartiniAlt, FaHotel,
    FaTicketAlt, FaPlus, FaMinus, FaChevronDown, FaChevronUp, FaClock, FaTimes 
} from 'react-icons/fa';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import toast, { Toaster } from 'react-hot-toast';
import './EventoDetalhes.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function EventoDetalhes() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id;
    
    const [evento, setEvento] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false); 
    const [ticketQuantities, setTicketQuantities] = useState({});
    const [ownedTickets, setOwnedTickets] = useState([]); 
    const [selectedDayTab, setSelectedDayTab] = useState(0); 
    const [isTicketDropdownOpen, setIsTicketDropdownOpen] = useState(false); 

    // ESTADOS PARA O MODAL DO FORMULÁRIO PERSONALIZADO
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [customFormData, setCustomFormData] = useState({});
    const [formSchema, setFormSchema] = useState([]);

    useEffect(() => {
        if (!id) return;
        
        fetch(`${API_BASE_URL}/events/${id}`)
            .then(res => res.json())
            .then(data => { 
                setEvento(data); 
                
                // Lê o schema de formulário cadastrado pelo organizador
                if (data.formSchema) {
                    try {
                        const parsedSchema = typeof data.formSchema === 'string' ? JSON.parse(data.formSchema) : data.formSchema;
                        setFormSchema(Array.isArray(parsedSchema) ? parsedSchema : []);
                    } catch (e) { console.error("Erro ao parsear formSchema", e); }
                }

                setLoading(false); 
                
                // Pega apenas o ID do usuário para checar de forma visual se ele está logado
                const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
                if (userId) {
                    // Busca ingressos usando Cookies HttpOnly
                    fetch(`${API_BASE_URL}/tickets/my-tickets`, {
                        credentials: 'include' // <-- Segurança ativada
                    })
                    .then(res => {
                        if(res.status === 401) {
                            localStorage.removeItem('userId'); // Limpa UI se cookie expirou
                            return [];
                        }
                        return res.json();
                    })
                    .then(ticketData => {
                        if (Array.isArray(ticketData)) {
                            const userTks = ticketData.filter(t => 
                                (t.event?.id === id || t.eventId === id) && t.status !== 'cancelled'
                            );
                            setOwnedTickets(userTks);
                        }
                    })
                    .catch(err => console.error("Erro ao buscar histórico de ingressos:", err));
                }
            })
            .catch(() => { toast.error("Erro ao carregar"); setLoading(false); });
    }, [id]);

    if (loading) {
        return (
            <div className="vibz-loading-container" role="status">
                <div className="vibz-spinner"></div>
                <h2 className="vibz-loading-title">Preparando a Vibe...</h2>
                <p className="vibz-loading-subtitle">Buscando os detalhes deste evento para você.</p>
            </div>
        );
    }
    
    if (!evento) return <div className="error-screen" role="alert">Evento não encontrado.</div>;

    const displayDate = new Date(evento.date || evento.createdAt);
    const orgInfo = typeof evento.organizerInfo === 'string' ? JSON.parse(evento.organizerInfo || '{}') : (evento.organizerInfo || {});

    const uniqueDatesSet = new Set();
    
    if (evento.tickets && evento.tickets.length > 0) {
        evento.tickets.forEach(ticket => {
            if (ticket.activityDate) {
                const tDate = String(ticket.activityDate).split('T')[0];
                uniqueDatesSet.add(tDate);
            }
        });
    }

    const uniqueDatesArray = Array.from(uniqueDatesSet).sort();

    if (uniqueDatesArray.length === 0) {
        const fallbackDate = String(evento.date || evento.createdAt).split('T')[0];
        uniqueDatesArray.push(fallbackDate);
    }

    const dayTabs = uniqueDatesArray.map((dateStr, index) => {
        const sessionDate = new Date(`${dateStr}T12:00:00`);
        const formattedDate = sessionDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        
        return {
            index,
            label: `Dia ${index + 1} (${formattedDate})`,
            dateString: dateStr
        };
    });

    const currentDayTab = dayTabs[selectedDayTab] || dayTabs[0];

    const filteredTickets = (evento.tickets || []).filter(ticket => {
        if (ticket.activityDate && currentDayTab.dateString) {
            const tDate = String(ticket.activityDate).split('T')[0];
            if (tDate === currentDayTab.dateString) return true;
            return false;
        }
        return selectedDayTab === 0;
    });

    const assignedTicketsCount = (evento.tickets || []).filter(t => !!t.activityDate).length;

    const ticketsToDisplay = (assignedTicketsCount === 0 && selectedDayTab === 0) 
        ? (evento.tickets || []) 
        : filteredTickets;

    const toMinutes = (timeStr) => {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };

    const isTicketExpired = (ticket) => {
        if (!ticket.activityDate || !ticket.startTime) return false;
        
        const datePart = String(ticket.activityDate).split('T')[0];
        const timePart = ticket.startTime.substring(0, 5);
        const ticketDateTime = new Date(`${datePart}T${timePart}:00`);
        const now = new Date();
        const limitTime = new Date(ticketDateTime.getTime() - 5 * 60000);
        
        return now >= limitTime;
    };

    const handleQuantityChange = (ticketData, delta) => {
        const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
        if (!userId && delta > 0) {
            toast.error("Faça login para selecionar ingressos.");
            router.push('/login');
            return;
        }

        const ticket = typeof ticketData === 'string' ? evento.tickets.find(t => (t.id || t._id) === ticketData) : ticketData;
        if (!ticket) return; 

        const getBaseName = (name) => {
            if (!name) return '';
            return name.split(/[-|:]/)[0].trim();
        };

        const baseName = getBaseName(ticket.name);
        const tId = ticket.id || ticket._id;

        const maxPerUser = ticket.maxPerUser || 1;
        const available = (ticket.quantity || 0) - (ticket.sold || 0);
        const currentQty = ticketQuantities[tId] || 0;

        if (delta > 0) {
            if (currentQty >= available) {
                toast.error(`Estes ingressos esgotaram!`);
                return;
            }

            const ownedCount = ownedTickets.filter(t => (t.ticketType?.id === tId || t.ticketTypeId === tId)).length;
            if (currentQty + ownedCount >= maxPerUser) {
                toast.error(`Você atingiu o limite de ${maxPerUser} vaga(s) para "${baseName}".`);
                return;
            }

            let conflictDetected = false;

            const checkConflict = (existingTicket) => {
                if (conflictDetected || !existingTicket) return;
                if ((existingTicket.id || existingTicket._id) === tId) return;

                const existingBaseName = getBaseName(existingTicket.name);

                if (existingBaseName.toLowerCase() === baseName.toLowerCase()) {
                    toast.error(`Você já selecionou ou garantiu uma vaga para "${baseName}".`);
                    conflictDetected = true;
                    return;
                }

                if (ticket.activityDate && existingTicket.activityDate && ticket.startTime && existingTicket.startTime && ticket.endTime && existingTicket.endTime) {
                    const d1 = String(ticket.activityDate).split('T')[0];
                    const d2 = String(existingTicket.activityDate).split('T')[0];
                    
                    if (d1 === d2) {
                        const start1 = toMinutes(ticket.startTime);
                        const end1 = toMinutes(ticket.endTime);
                        const start2 = toMinutes(existingTicket.startTime);
                        const end2 = toMinutes(existingTicket.endTime);

                        if (Math.max(start1, start2) < Math.min(end1, end2)) {
                            toast.error(`Conflito de horário! "${baseName}" acontece na mesma hora que "${existingBaseName}".`);
                            conflictDetected = true;
                        }
                    }
                }
            };

            Object.keys(ticketQuantities).forEach(key => {
                if (ticketQuantities[key] <= 0) return;
                const existingInCart = evento.tickets.find(t => (t.id || t._id) === key);
                checkConflict(existingInCart);
            });

            ownedTickets.forEach(owned => {
                const existingOwned = evento.tickets.find(t => (t.id || t._id) === (owned.ticketType?.id || owned.ticketTypeId));
                checkConflict(existingOwned);
            });

            if (conflictDetected) return; 
        }

        const newQty = Math.max(0, currentQty + delta);
        setTicketQuantities(prev => ({ ...prev, [tId]: newQty }));
    };

    const totalSelectedTickets = Object.values(ticketQuantities).reduce((acc, curr) => acc + curr, 0);

    const handleContinueClick = () => {
        const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
        if (!userId) {
            toast.error("Você precisa estar logado para garantir seu ingresso.");
            router.push('/login');
            return;
        }

        if (formSchema.length > 0) {
            const initialFormData = {};
            Object.keys(ticketQuantities).forEach(tId => {
                if (ticketQuantities[tId] > 0) {
                    initialFormData[tId] = {};
                }
            });
            setCustomFormData(initialFormData);
            setShowCheckoutModal(true);
        } else {
            submitFinalCheckout(null);
        }
    };

    const handleFormInputChange = (ticketId, fieldId, value) => {
        setCustomFormData(prev => ({
            ...prev,
            [ticketId]: {
                ...prev[ticketId],
                [fieldId]: value
            }
        }));
    };

    const validateAndSubmitForm = (e) => {
        e.preventDefault();
        
        const formattedParticipantData = [];
        
        for (const [tId, answers] of Object.entries(customFormData)) {
            const mappedAnswers = {};
            formSchema.forEach(field => {
                mappedAnswers[field.label] = answers[field.id] || "";
            });
            
            formattedParticipantData.push({
                ticketTypeId: tId,
                data: mappedAnswers
            });
        }

        submitFinalCheckout(formattedParticipantData);
    };

    const submitFinalCheckout = async (participantDataArray) => {
        const ticketsPayload = {};
        Object.entries(ticketQuantities).forEach(([tId, qty]) => {
            if (qty > 0) ticketsPayload[tId] = qty;
        });

        setIsProcessing(true);
        
        try {
            const bodyPayload = {
                eventId: evento.id || evento._id,
                tickets: ticketsPayload,
            };

            if (participantDataArray) {
                bodyPayload.participantData = participantDataArray;
            }

            const response = await fetch(`${API_BASE_URL}/payments/create-checkout-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // <-- COMPRA SEGURA VIA COOKIE
                body: JSON.stringify(bodyPayload)
            });

            if (response.status === 401) {
                toast.error("Sua sessão expirou. Faça login para continuar.");
                router.push('/login');
                setIsProcessing(false);
                return;
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao processar ingresso.');
            }

            if (data.url) {
                window.location.href = data.url;
            } else {
                toast.success("Inscrição confirmada com sucesso! Verifique seu e-mail.");
                setShowCheckoutModal(false);
                setTicketQuantities({});
                
                setTimeout(() => window.location.reload(), 1500);
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const addressQuery = encodeURIComponent(`${evento.location}, ${evento.city}`);
    const locationName = encodeURIComponent(evento.location); 
    
    const uberLink = `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[nickname]=${locationName}&dropoff[formatted_address]=${addressQuery}`;
    const hoteisLink = `https://www.google.com/maps/search/hoteis+perto+de+${addressQuery}`;
    const baresLink = `https://www.google.com/maps/search/bares+perto+de+${addressQuery}`;
    const restaurantesLink = `https://www.google.com/maps/search/restaurantes+perto+de+${addressQuery}`;

    const renderTicketBox = () => {
        if (!evento.tickets || evento.tickets.length === 0) return null;

        return (
            <div className="vibz-guide ticket-box" style={{ width: '100%', marginBottom: '25px', boxSizing: 'border-box' }}>
                <div 
                    className="ticket-dropdown-header" 
                    onClick={() => setIsTicketDropdownOpen(!isTicketDropdownOpen)}
                    role="button"
                    tabIndex={0}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                        <FaTicketAlt className="guide-icon" aria-hidden="true" style={{ margin: 0, fontSize: '1.6rem', flexShrink: 0 }} />
                        <div style={{ textAlign: 'left', minWidth: 0 }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Ingressos Oficiais</h3>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#a78bfa' }}>
                                Toque para selecionar palestras e dias
                            </p>
                        </div>
                    </div>
                    <div className="dropdown-toggle-icon" style={{ flexShrink: 0 }}>
                        {isTicketDropdownOpen ? <FaChevronUp /> : <FaChevronDown />}
                    </div>
                </div>

                {isTicketDropdownOpen && (
                    <div className="ticket-dropdown-content">
                        <div className="vibz-ticket-selector">
                            {dayTabs.length > 1 && (
                                <div className="vibz-day-tabs" role="tablist" aria-label="Dias do evento">
                                    {dayTabs.map((tab) => (
                                        <button
                                            key={tab.index}
                                            role="tab"
                                            aria-selected={selectedDayTab === tab.index}
                                            className={`vibz-day-tab ${selectedDayTab === tab.index ? 'active' : ''}`}
                                            onClick={() => setSelectedDayTab(tab.index)}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {ticketsToDisplay.length > 0 ? (
                                ticketsToDisplay.map(ticket => {
                                    const tId = ticket.id || ticket._id;
                                    const qty = ticketQuantities[tId] || 0;
                                    const isFree = parseFloat(ticket.price) === 0 || ticket.price === "0" || !ticket.price;

                                    const available = (ticket.quantity || 0) - (ticket.sold || 0);
                                    const isSoldOut = available <= 0;
                                    const isExpired = isTicketExpired(ticket);
                                    const maxPerUser = ticket.maxPerUser || 1;
                                    const ownedCount = ownedTickets.filter(t => (t.ticketType?.id === tId || t.ticketTypeId === tId)).length;
                                    const canAddMore = !isSoldOut && !isExpired && (qty + ownedCount < maxPerUser) && (qty < available);

                                    return (
                                        <div key={tId} className={`vibz-ticket-row ${isSoldOut || isExpired ? 'sold-out' : ''}`}>
                                            <div className="ticket-details" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    <strong style={{ fontSize: '0.95rem', color: '#f8fafc' }}>{ticket.name}</strong>
                                                    
                                                    {!isSoldOut && !isExpired && available <= 10 && available > 0 && (
                                                        <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                                                            🔥 Restam apenas {available} vaga{available > 1 ? 's' : ''}!
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                {ticket.startTime && (
                                                    <span className="ticket-time-badge">
                                                        <FaClock aria-hidden="true" />
                                                        {ticket.startTime.substring(0, 5)} {ticket.endTime ? `às ${ticket.endTime.substring(0, 5)}` : ''}
                                                    </span>
                                                )}
                                                
                                                <span className="ticket-price" style={{ color: '#a78bfa', fontSize: '0.85rem', fontWeight: '600' }}>
                                                    {isFree ? "Gratuito" : `R$ ${parseFloat(ticket.price).toFixed(2).replace('.', ',')}`}
                                                </span>
                                            </div>
                                            
                                            <div className="ticket-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {isExpired ? (
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8', padding: '6px 10px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                                                        ENCERRADO
                                                    </span>
                                                ) : isSoldOut ? (
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#e11d48', padding: '6px 10px', background: 'rgba(225, 29, 72, 0.1)', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                                                        ESGOTADO
                                                    </span>
                                                ) : ownedCount >= maxPerUser && qty === 0 ? (
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#10b981', padding: '6px 10px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                                                        JÁ GARANTIDO
                                                    </span>
                                                ) : (
                                                    <>
                                                        <button 
                                                            onClick={() => handleQuantityChange(ticket, -1)} 
                                                            disabled={qty === 0}
                                                            aria-label={`Remover um ingresso de ${ticket.name}`}
                                                        >
                                                            <FaMinus aria-hidden="true" />
                                                        </button>
                                                        <span className="ticket-qty-display" aria-live="polite">{qty}</span>
                                                        <button 
                                                            onClick={() => handleQuantityChange(ticket, 1)}
                                                            aria-label={`Adicionar um ingresso de ${ticket.name}`}
                                                            disabled={!canAddMore} 
                                                            className={!canAddMore ? 'disabled-plus' : ''}
                                                        >
                                                            <FaPlus aria-hidden="true" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="vibz-msg" style={{fontSize: '0.85rem', color: '#94a3b8', margin: '15px 0', textAlign: 'center'}}>
                                    Nenhuma atividade cadastrada para este dia.
                                </p>
                            )}

                            <button 
                                className="vibz-btn-primary mt-4" 
                                onClick={handleContinueClick}
                                disabled={totalSelectedTickets === 0 || isProcessing}
                            >
                                {isProcessing ? 'Garantindo ingressos...' : `Continuar (${totalSelectedTickets} ${totalSelectedTickets === 1 ? 'ingresso' : 'ingressos'})`}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="vibz-details-page">
            <Toaster />
            <Header />
            
            <section className="vibz-hero">
                {/* 🌟 ESTRUTURA DO HERO REORGANIZADA PARA "EFEITO PÔSTER" 🌟 */}
                <div className="vibz-hero-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '20px' }}>
                    
                    {/* 1. CATEGORIA NO TOPO */}
                    <span className="vibz-category-pill" style={{ marginBottom: 0 }}>
                        {evento.category}
                    </span>
                    
                    {/* 2. IMAGEM NO MEIO (Forçada para 16:9) */}
                    <div className="vibz-image-minimal" aria-hidden="true" style={{ width: '100%', maxWidth: '800px', margin: '5px 0' }}>
                        <img src={evento.imageUrl} alt="" style={{ width: '100%', height: 'auto', aspectRatio: '16/9', objectFit: 'cover', borderRadius: '20px' }} />
                    </div>

                    {/* 3. TÍTULO E META INFO ABAIXO DA IMAGEM */}
                    <div className="vibz-hero-info" style={{ alignItems: 'center', width: '100%' }}>
                        <h1 className="vibz-title">{evento.title}</h1>
                        
                        <div className="vibz-meta-minimal" style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: '20px' }}>
                            <span className="meta-item">
                                <FaCalendarDay className="meta-icon" aria-hidden="true" /> 
                                {displayDate.toLocaleDateString('pt-BR')}
                            </span>
                            <span className="meta-item">
                                <FaMapMarkerAlt className="meta-icon" aria-hidden="true" /> 
                                {evento.location} - {evento.city}
                            </span>
                        </div>
                    </div>

                </div>
            </section>

            <main id="conteudo-principal" className="vibz-content" tabIndex="-1">
                <div className="vibz-grid">
                    
                    <section className="vibz-main" style={{ minWidth: 0 }}>
                        {renderTicketBox()}

                        <div className="vibz-card">
                            <h3>Sobre o Evento</h3>
                            <p className="vibz-desc">{evento.description}</p>
                        </div>
                        
                        <div className="vibz-card">
                            <h3>Organizado por</h3>
                            <div className="vibz-org">
                                <div className="vibz-avatar" aria-hidden="true">{orgInfo.name?.charAt(0) || 'V'}</div>
                                <div className="vibz-org-info">
                                    <h4>{orgInfo.name || "Produtor Cultural"}</h4>
                                    {orgInfo.instagram && (
                                        <a href={`https://instagram.com/${orgInfo.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="vibz-insta" aria-label={`Instagram de ${orgInfo.name}`}>
                                            <InstagramIcon /> {orgInfo.instagram}
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                    <aside className="vibz-sidebar" style={{ minWidth: 0 }}>
                        
                        {(!evento.tickets || evento.tickets.length === 0) && (
                            <div className="vibz-guide-external">
                                <FaTicketAlt className="guide-icon" aria-hidden="true" />
                                <h3>Ingressos Oficiais</h3>
                                <p className="external-subtitle">
                                    {evento.externalUrl ? 'Disponível via Curadoria' : 'Evento Informativo'}
                                </p>
                                <p className="external-text">
                                    {evento.externalUrl 
                                        ? 'Curadoria oficial. Clique abaixo para acessar a bilheteria no canal oficial do produtor.'
                                        : 'Acesse as redes sociais da produção para detalhes sobre reservas ou ingressos físicos.'}
                                </p>
                                {evento.externalUrl && (
                                    <a href={evento.externalUrl} target="_blank" rel="noopener noreferrer" className="vibz-btn-primary" style={{ width: '100%', textDecoration: 'none' }}>
                                        <FaExternalLinkAlt aria-hidden="true" style={{ marginRight: '8px' }} /> Acessar Ingressos
                                    </a>
                                )}
                            </div>
                        )}

                        <div className="vibz-guide"> 
                            <h3>Planeje seu Rolê</h3>
                            <p>Facilite sua chegada e descubra o que tem por perto.</p>
                            
                            <div className="vibz-utility-buttons">
                                <a href={uberLink} target="_blank" rel="noopener noreferrer" className="vibz-btn-uber">
                                    <FaUber aria-hidden="true" /> Ir de Uber
                                </a>
                                
                                <div className="vibz-places-list">
                                    <a href={hoteisLink} target="_blank" rel="noopener noreferrer" className="vibz-btn-outline">
                                        <FaHotel aria-hidden="true" /> Hotéis próximos
                                    </a>
                                    <a href={baresLink} target="_blank" rel="noopener noreferrer" className="vibz-btn-outline">
                                        <FaGlassMartiniAlt aria-hidden="true" /> Bares próximos
                                    </a>
                                    <a href={restaurantesLink} target="_blank" rel="noopener noreferrer" className="vibz-btn-outline">
                                        <FaHamburger aria-hidden="true" /> Restaurantes próximos
                                    </a>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </main>
            <Footer />

            {/* ======================================================== */}
            {/* MODAL DE CHECKOUT (APARECE SE TIVER FORMULÁRIO EXIGIDO)  */}
            {/* ======================================================== */}
            {showCheckoutModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
                    <div style={{ background: '#111118', width: '100%', maxWidth: '500px', borderRadius: '16px', border: '1px solid rgba(139, 92, 246, 0.3)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
                        
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                            <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem' }}>Finalizar Inscrição</h3>
                            <button onClick={() => setShowCheckoutModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}>
                                <FaTimes />
                            </button>
                        </div>

                        <form onSubmit={validateAndSubmitForm} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
                            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '25px' }}>
                                
                                <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.5' }}>
                                    A organização solicitou algumas informações adicionais para concluir a sua reserva de vagas.
                                </p>

                                {Object.keys(ticketQuantities).map(tId => {
                                    if (ticketQuantities[tId] === 0) return null;
                                    const ticketInfo = evento.tickets.find(t => (t.id || t._id) === tId);

                                    return (
                                        <div key={tId} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '20px' }}>
                                            <h4 style={{ margin: '0 0 15px', color: '#a78bfa', fontSize: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                                                Ingresso: {ticketInfo?.name}
                                            </h4>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                                {formSchema.map((field) => (
                                                    <div key={field.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                        <label style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: '500' }}>
                                                            {field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                                                        </label>
                                                        <input 
                                                            type={field.type} 
                                                            required={field.required}
                                                            value={customFormData[tId]?.[field.id] || ''}
                                                            onChange={(e) => handleFormInputChange(tId, field.id, e.target.value)}
                                                            style={{ padding: '12px 14px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.95rem', outline: 'none' }}
                                                            placeholder={`Sua resposta...`}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div style={{ padding: '20px 24px', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', marginTop: 'auto' }}>
                                <button type="submit" disabled={isProcessing} style={{ width: '100%', padding: '16px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', transition: '0.2s', opacity: isProcessing ? 0.7 : 1 }}>
                                    {isProcessing ? 'Processando e Gerando Ingresso...' : 'Confirmar e Gerar Ingresso'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function InstagramIcon() {
    return <FaInstagram aria-hidden="true" />;
}