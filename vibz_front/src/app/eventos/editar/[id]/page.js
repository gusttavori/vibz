'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import styles from '@/app/admin/new/CadastroEvento.module.css'; 
import { 
    FaImage, FaInstagram, FaPlus, FaTrashAlt, 
    FaTicketAlt, FaCalendarAlt, FaMapMarkerAlt, FaMusic,
    FaAlignLeft, FaArrowLeft, FaArrowRight, FaStar,
    FaClipboardList, FaUserLock, FaCheckCircle, FaRegCircle, FaLink,
    FaClipboardCheck, FaChevronDown, FaChevronUp, FaCopy
} from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast'; 

const getApiBaseUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
};

const parseLocalDatetime = (utcString) => {
    if (!utcString) return { date: '', time: '' };
    try {
        const d = new Date(utcString);
        if (isNaN(d.getTime())) return { date: '', time: '' };
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return { date: `${year}-${month}-${day}`, time: `${hours}:${minutes}` };
    } catch (e) {
        return { date: '', time: '' };
    }
};

const extractDateSafely = (dateString) => {
    if (!dateString) return '';
    if (dateString.includes('T')) {
        if (dateString.includes('T00:00:00')) return dateString.split('T')[0];
        return parseLocalDatetime(dateString).date;
    }
    return dateString;
};

const FormSkeleton = () => (
    <div className={styles.pageWrapper}>
        <Header />
        <main className={styles.mainContent}>
            <div className={styles.pageHeader}>
                <div className={`${styles.skSubtitle} ${styles.skeletonPulse}`} style={{width: '100px'}}></div>
                <div className={`${styles.skTitle} ${styles.skeletonPulse}`} style={{width: '300px', height: '40px', marginTop: '10px'}}></div>
            </div>
            <div className={styles.formContainer}>
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className={styles.skCard} style={{height: '200px', marginBottom: '20px', borderRadius: '20px', background: '#fff', border: '1px solid #eee'}}></div>
                ))}
            </div>
        </main>
    </div>
);

const EditarEvento = () => {
    const router = useRouter();
    const params = useParams();
    const eventId = params?.id;
    const API_BASE_URL = getApiBaseUrl();

    // --- ESTADOS DO WIZARD ---
    const [currentStep, setCurrentStep] = useState(1);
    const [loadingData, setLoadingData] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // --- ESTADOS DOS DADOS ---
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [ageRating, setAgeRating] = useState('Livre');
    const [imageFile, setImageFile] = useState(null); 
    const [imagePreview, setImagePreview] = useState(''); 
    const [refundPolicy, setRefundPolicy] = useState('O cancelamento pode ser solicitado em até 7 dias após a compra.');

    const [sessions, setSessions] = useState([{ date: '', time: '', endDate: '', endTime: '', lineup: [] }]);
    
    const [locationName, setLocationName] = useState('');
    const [addressStreet, setAddressStreet] = useState('');
    const [addressNumber, setAddressNumber] = useState('');
    const [addressDistrict, setAddressDistrict] = useState('');
    const [addressCity, setAddressCity] = useState('');
    const [addressState, setAddressState] = useState('');
    const [addressZipCode, setAddressZipCode] = useState('');
    
    const [organizerName, setOrganizerName] = useState('');
    const [organizerInstagram, setOrganizerInstagram] = useState('');
    
    const [sellOnPlatform, setSellOnPlatform] = useState(true);
    const [externalUrl, setExternalUrl] = useState(''); 

    const [ticketTypes, setTicketTypes] = useState([]);
    
    // --- FORMULÁRIO PERSONALIZADO ---
    const [requireCustomForm, setRequireCustomForm] = useState(false);
    const [formFields, setFormFields] = useState([{ id: 1, label: '', type: 'text', required: true }]);

    // --- DESTAQUE ---
    const [highlightTier, setHighlightTier] = useState(null); 
    const [highlightDays, setHighlightDays] = useState(7);
    const [prices, setPrices] = useState({ standardPrice: 2, premiumPrice: 100 });
    const [termsAccepted, setTermsAccepted] = useState(false);

    const handleZipCodeChange = (value) => {
        const cleanValue = value.replace(/\D/g, "");
        const maskedValue = cleanValue.replace(/^(\d{5})(\d)/, "$1-$2").substring(0, 9);
        setAddressZipCode(maskedValue);
    };

    useEffect(() => {
        const fetchInitialData = async () => {
            if (!eventId) return;

            try {
                const configRes = await fetch(`${API_BASE_URL}/config/prices`);
                if (configRes.ok) {
                    const configData = await configRes.json();
                    setPrices(configData);
                }

                // Carrega os dados do evento sem Auth (rota publica)
                const res = await fetch(`${API_BASE_URL}/events/${eventId}`);
                if (!res.ok) throw new Error("Evento não encontrado");
                const data = await res.json();

                setTitle(data.title || '');
                setDescription(data.description || '');
                setCategory(data.category || '');
                setAgeRating(data.ageRating || 'Livre');
                setImagePreview(data.imageUrl || '');
                setRefundPolicy(data.refundPolicy || '');
                
                setSellOnPlatform(!data.isInformational);
                setExternalUrl(data.externalUrl || '');

                setHighlightTier(data.highlightTier || null);
                setHighlightDays(data.highlightDuration || 7);

                if (data.sessions && data.sessions.length > 0) {
                    setSessions(data.sessions.map(s => {
                        const start = parseLocalDatetime(s.date);
                        const end = s.endDate ? parseLocalDatetime(s.endDate) : { date: '', time: '' };
                        return {
                            date: start.date,
                            time: start.time || (s.time ? s.time.slice(0, 5) : ''),
                            endDate: end.date,
                            endTime: end.time || (s.endTime ? s.endTime.slice(0, 5) : ''),
                            lineup: s.lineup || [] 
                        };
                    }));
                }

                setLocationName(data.location || '');
                setAddressCity(data.city || '');
                if (data.address) {
                    const addr = typeof data.address === 'string' ? JSON.parse(data.address) : data.address;
                    setAddressStreet(addr.street || '');
                    setAddressNumber(addr.number || '');
                    setAddressDistrict(addr.district || '');
                    setAddressState(addr.state || '');
                    setAddressZipCode(addr.zipCode || '');
                }

                const org = data.organizerInfo || data.organizer || {};
                setOrganizerName(org.name || '');
                setOrganizerInstagram(org.instagram || '');

                if (data.formSchema && data.formSchema.length > 0) {
                    setRequireCustomForm(true);
                    setFormFields(data.formSchema.map((q, idx) => ({ ...q, id: idx })));
                }

                const rawTickets = data.ticketTypes || data.tickets || [];
                const finalTicketsMap = new Map();

                rawTickets.forEach(t => {
                    const actDate = extractDateSafely(t.activityDate);
                    const tStart = t.startTime || '';
                    const tEnd = t.endTime || '';
                    const uniqueKey = `${t.name}-${t.category}-${actDate}-${tStart}-${tEnd}`;

                    if (!finalTicketsMap.has(uniqueKey)) {
                        finalTicketsMap.set(uniqueKey, {
                            uniqueGroupId: uniqueKey, 
                            name: t.name || 'Geral',
                            category: t.category || 'Inteira',
                            isHalfPrice: t.isHalfPrice || false,
                            maxPerUser: t.maxPerUser || 4,
                            hasSchedule: !!(actDate || tStart),
                            activityDate: actDate,
                            startTime: tStart,
                            endTime: tEnd,
                            batches: []
                        });
                    }

                    const group = finalTicketsMap.get(uniqueKey);
                    group.batches.push({
                        id: t.id || t._id, 
                        name: t.batchName || t.batch || 'Lote',
                        price: t.price !== undefined && t.price !== null ? parseFloat(t.price) : '',
                        quantity: t.quantity !== undefined && t.quantity !== null ? parseInt(t.quantity) : ''
                    });
                });

                const finalTickets = Array.from(finalTicketsMap.values());
                if (finalTickets.length > 0) {
                    setTicketTypes(finalTickets);
                } else {
                    setTicketTypes([{ uniqueGroupId: Date.now().toString(), name: '', category: 'Inteira', isHalfPrice: false, hasSchedule: false, maxPerUser: 4, activityDate: '', startTime: '', endTime: '', batches: [{ id: null, name: '1º Lote', price: '', quantity: '' }] }]);
                }

            } catch (err) {
                console.error(err);
                toast.error("Erro ao carregar dados do evento.");
            } finally {
                setLoadingData(false);
            }
        };
        fetchInitialData();
    }, [eventId, API_BASE_URL]);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) return toast.error('Imagem muito grande (Máx 5MB)');
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    // --- FUNÇÕES DE SESSÕES E LINEUP ---
    const handleAddSession = () => setSessions([...sessions, { date: '', time: '', endDate: '', endTime: '', lineup: [] }]);
    const handleRemoveSession = (i) => setSessions(sessions.filter((_, idx) => idx !== i));
    const handleChangeSession = (index, field, value) => {
        const updated = [...sessions];
        updated[index][field] = value;
        setSessions(updated);
    };

    const handleAddLineup = (sessionIndex) => {
        const updated = [...sessions];
        if (!updated[sessionIndex].lineup) updated[sessionIndex].lineup = [];
        updated[sessionIndex].lineup.push({ name: '', time: '' });
        setSessions(updated);
    };
    const handleRemoveLineup = (sessionIndex, artistIndex) => {
        const updated = [...sessions];
        updated[sessionIndex].lineup.splice(artistIndex, 1);
        setSessions(updated);
    };
    const handleLineupChange = (sessionIndex, artistIndex, field, value) => {
        const updated = [...sessions];
        updated[sessionIndex].lineup[artistIndex][field] = value;
        setSessions(updated);
    };
    
    // --- FUNÇÕES DE INGRESSOS ---
    const handleAddTicketType = () => {
        setTicketTypes([...ticketTypes, { 
            uniqueGroupId: Date.now().toString(),
            name: '', category: 'Inteira', isHalfPrice: false,
            hasSchedule: false, maxPerUser: 4, activityDate: '', startTime: '', endTime: '',
            batches: [{ id: null, name: `1º Lote`, price: '', quantity: '' }] 
        }]);
    };
    const handleRemoveTicketType = (i) => {
        if (ticketTypes.length === 1) return toast.error("Mínimo de 1 tipo de ingresso.");
        setTicketTypes(ticketTypes.filter((_, idx) => idx !== i));
    };
    const handleChangeTicketType = (index, field, value) => {
        const updated = [...ticketTypes];
        updated[index][field] = value;
        if (field === 'hasSchedule' && value === false) {
            updated[index].activityDate = '';
            updated[index].startTime = '';
            updated[index].endTime = '';
        }
        setTicketTypes(updated);
    };

    const handleAddBatch = (ti) => {
        const updated = [...ticketTypes];
        const nextBatchNum = updated[ti].batches.length + 1;
        updated[ti].batches.push({ id: null, name: `${nextBatchNum}º Lote`, price: '', quantity: '' });
        setTicketTypes(updated);
    };
    const handleRemoveBatch = (typeIndex, batchIndex) => {
        const updated = [...ticketTypes];
        if (updated[typeIndex].batches.length === 1) return toast.error("Mínimo de 1 lote por ingresso.");
        updated[typeIndex].batches = updated[typeIndex].batches.filter((_, i) => i !== batchIndex);
        setTicketTypes(updated);
    };
    const handleChangeBatch = (typeIndex, batchIndex, field, value) => {
        const updated = [...ticketTypes];
        updated[typeIndex].batches[batchIndex][field] = value;
        setTicketTypes(updated);
    };

    // --- FUNÇÕES DO FORMULÁRIO PERSONALIZADO ---
    const handleAddFormField = () => setFormFields([...formFields, { id: Date.now(), label: '', type: 'text', required: true }]);
    const handleRemoveFormField = (id) => setFormFields(formFields.filter(f => f.id !== id));
    const handleChangeFormField = (id, field, value) => setFormFields(formFields.map(f => f.id === id ? { ...f, [field]: value } : f));

    // --- WIZARD NAVEGAÇÃO E VALIDAÇÃO ---
    const handleNextStep = () => {
        if (currentStep === 1) {
            if (!title || !category || !description) return toast.error('Preencha as informações principais.');
        }
        if (currentStep === 2) {
            if (!locationName || !addressCity) return toast.error('Preencha o local e a cidade.');
            for (let i = 0; i < sessions.length; i++) {
                if (!sessions[i].date || !sessions[i].time) return toast.error(`Preencha data e hora da sessão ${i + 1}`);
            }
        }
        if (currentStep === 3) {
            if (!sellOnPlatform && !externalUrl && category !== 'Bares e Entretenimento') {
                return toast.error('Insira o link oficial de vendas ou reserva.');
            }
            if (sellOnPlatform) {
                for (const type of ticketTypes) {
                    if (!type.name) return toast.error("Nome do ingresso é obrigatório.");
                    if (type.hasSchedule && (!type.activityDate || !type.startTime)) return toast.error(`Preencha a programação para o ingresso "${type.name}"`);
                    for (const batch of type.batches) {
                        if (batch.price === '' || batch.price === null) return toast.error(`Preço obrigatório em ${type.name}`);
                        if (!batch.quantity) return toast.error(`Quantidade obrigatória em ${type.name}`);
                    }
                }
                if (requireCustomForm) {
                    for (let f of formFields) {
                        if (!f.label) return toast.error('Preencha a pergunta em todos os campos personalizados.');
                    }
                }
            }
        }
        setCurrentStep(prev => Math.min(prev + 1, 4));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handlePrevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // --- ENVIO PARA O BACKEND ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!termsAccepted) return toast.error('Você deve confirmar e aceitar os termos.');
        
        setSaving(true);

        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('category', category);
        formData.append('ageRating', ageRating);
        formData.append('refundPolicy', refundPolicy);
        
        formData.append('sellOnPlatform', sellOnPlatform ? 'true' : 'false');
        formData.append('isInformational', sellOnPlatform ? 'false' : 'true');
        formData.append('externalUrl', sellOnPlatform ? '' : externalUrl);
        
        if (imageFile) formData.append('image', imageFile);

        const formattedSessions = sessions.map(s => {
            let isoStart = null;
            let isoEnd = null;
            try { isoStart = new Date(`${s.date}T${s.time}:00`).toISOString(); } catch(e) {}
            try { if (s.endDate) isoEnd = new Date(`${s.endDate}T${s.endTime || '00:00'}:00`).toISOString(); } catch(e) {}
            return { 
                date: isoStart || s.date,
                endDate: isoEnd || s.endDate,
                lineup: s.lineup || [] 
            };
        });
        formData.append('sessions', JSON.stringify(formattedSessions));
        if (formattedSessions.length > 0) formData.append('date', formattedSessions[0].date);

        formData.append('location', locationName);
        formData.append('city', addressCity);
        formData.append('address', JSON.stringify({
            street: addressStreet, number: addressNumber, district: addressDistrict, 
            city: addressCity, state: addressState, zipCode: addressZipCode
        }));

        const flatTickets = [];
        if (sellOnPlatform) {
            ticketTypes.forEach(type => {
                type.batches.forEach(batch => {
                    const ticketData = {
                        name: type.name,
                        category: type.category || 'Inteira',
                        isHalfPrice: Boolean(type.isHalfPrice),
                        maxPerUser: parseInt(type.maxPerUser) || 4,
                        hasSchedule: Boolean(type.hasSchedule),
                        batch: batch.name || 'Lote',
                        price: parseFloat((batch.price || 0).toString().replace(',', '.')),
                        quantity: parseInt(batch.quantity) || 0
                    };
                    if (batch.id) { ticketData.id = batch.id; ticketData._id = batch.id; }
                    if (type.hasSchedule) {
                        if (type.activityDate) ticketData.activityDate = type.activityDate;
                        if (type.startTime) ticketData.startTime = type.startTime;
                        if (type.endTime) ticketData.endTime = type.endTime;
                    }
                    flatTickets.push(ticketData);
                });
            });
        }
        
        const ticketsJson = JSON.stringify(flatTickets);
        formData.append('tickets', ticketsJson);
        formData.append('ticketTypes', ticketsJson); // Manter retrocompatibilidade

        formData.append('organizerInfo', JSON.stringify({ name: organizerName, instagram: organizerInstagram }));
        
        let finalSchema = [];
        if (requireCustomForm) {
            finalSchema = formFields.filter(f => f.label.trim() !== '');
        }
        formData.append('formSchema', JSON.stringify(finalSchema));

        if (highlightTier) {
            formData.append('isFeaturedRequested', 'true');
            formData.append('highlightTier', highlightTier);
            if (highlightTier === 'STANDARD') formData.append('highlightDuration', highlightDays);
        } else {
            formData.append('isFeaturedRequested', 'false');
        }

        try {
            const res = await fetch(`${API_BASE_URL}/events/${eventId}`, {
                method: 'PUT',
                credentials: 'include', // <-- Salva a Edição usando Cookie
                body: formData
            });

            if (res.status === 401) return router.push('/login');

            if (res.ok) {
                toast.success("Evento atualizado com sucesso!");
                setTimeout(() => router.push('/dashboard'), 2000);
            } else {
                const err = await res.json();
                toast.error(err.message || "Erro ao salvar alterações.");
            }
        } catch (error) {
            toast.error("Erro de conexão com o servidor.");
        } finally {
            setSaving(false);
        }
    };

    if (loadingData) return <FormSkeleton />;

    return (
        <div className={styles.pageWrapper}>
            <Toaster position="top-right" />
            <Header />

            <main className={styles.mainContent}>
                <div className={styles.pageHeader}>
                    <button className={styles.backBtn} onClick={() => router.push('/dashboard')}>
                        <FaArrowLeft /> Voltar ao Painel
                    </button>
                    <h1>Editar Evento</h1>
                    <p>Altere os detalhes do seu evento nos passos abaixo e salve.</p>
                </div>

                {/* --- BARRA DE PROGRESSO DO WIZARD --- */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '15px', left: '0', right: '0', height: '2px', background: '#e2e8f0', zIndex: 0 }}></div>
                    <div style={{ position: 'absolute', top: '15px', left: '0', width: `${((currentStep - 1) / 3) * 100}%`, height: '2px', background: '#4c01b5', transition: '0.3s ease', zIndex: 0 }}></div>
                    
                    {['Informações', 'Agenda e Local', 'Ingressos', 'Publicação'].map((stepName, index) => {
                        const stepNumber = index + 1;
                        const isActive = currentStep === stepNumber;
                        const isCompleted = currentStep > stepNumber;
                        return (
                            <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
                                <div style={{ 
                                    width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: isActive || isCompleted ? '#4c01b5' : '#f8fafc', color: isActive || isCompleted ? '#fff' : '#94a3b8',
                                    border: `2px solid ${isActive || isCompleted ? '#4c01b5' : '#e2e8f0'}`, fontWeight: 'bold', fontSize: '0.9rem', transition: '0.3s ease'
                                }}>
                                    {isCompleted ? <FaCheckCircle /> : stepNumber}
                                </div>
                                <span style={{ fontSize: '0.75rem', marginTop: '8px', color: isActive ? '#0f172a' : '#94a3b8', fontWeight: isActive ? '700' : '500' }}>{stepName}</span>
                            </div>
                        );
                    })}
                </div>

                <div className={styles.formContainer}>
                    
                    {/* ================= PASSO 1 ================= */}
                    {currentStep === 1 && (
                        <div className="wizard-step animate-fade-in">
                            <section className={styles.card}>
                                <div className={styles.cardHeader}><div className={styles.iconWrapper}><FaImage /></div><h3>Design e Descrição</h3></div>
                                <div className={styles.uploadSection}>
                                    <div className={styles.uploadBox} onClick={() => document.getElementById('editImage').click()}>
                                        {imagePreview ? <img src={imagePreview} className={styles.imagePreview} alt="Capa" /> : <div className={styles.uploadPlaceholder}><FaImage size={48} /><span>Carregar Capa</span></div>}
                                    </div>
                                    <input type="file" id="editImage" hidden onChange={handleImageUpload} accept="image/*" />
                                </div>
                                <div className={styles.gridTwo}>
                                    <div className={styles.inputGroupFull} style={{gridColumn: 'span 2'}}>
                                        <label className={styles.label}>Título do Evento ou Nome do Bar</label>
                                        <div className={styles.inputWrapper}>
                                            <FaAlignLeft className={styles.inputIcon} />
                                            <input className={styles.input} value={title} onChange={e => setTitle(e.target.value)} required />
                                        </div>
                                    </div>
                                    <div className={styles.inputGroupFull} style={{gridColumn: 'span 2'}}>
                                        <label className={styles.label}>Descrição do Evento</label>
                                        <textarea className={styles.textarea} value={description} onChange={e => setDescription(e.target.value)} required />
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>Categoria</label>
                                        {/* ATUALIZADO: Dropdown com as novas categorias separadas */}
                                        <select className={styles.select} value={category} onChange={e => setCategory(e.target.value)} required>
                                            <option value="" disabled>Selecione...</option>
                                            <option>Festas e Shows</option>
                                            <option>Acadêmico</option>
                                            <option>Congressos e Convenções</option>
                                            <option>Cursos e Workshops</option>
                                            <option>Teatro e Cultura</option>
                                            <option>Esportes</option>
                                            <option>Gastronomia</option>
                                            <option>Religioso</option>
                                            <option>Bares e Entretenimento</option>
                                        </select>
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>Classificação Etária</label>
                                        <select className={styles.select} value={ageRating} onChange={e => setAgeRating(e.target.value)}>
                                            <option>Livre</option><option>10+</option><option>12+</option><option>14+</option><option>16+</option><option>18+</option>
                                        </select>
                                    </div>
                                </div>
                            </section>
                            <section className={styles.card}>
                                <div className={styles.cardHeader}><div className={styles.iconWrapper}><FaInstagram /></div><h3>Organizador</h3></div>
                                <div className={styles.gridTwo}>
                                    <div className={styles.inputGroup}><label className={styles.label}>Nome</label><input className={styles.input} placeholder="Nome do Organizador" value={organizerName} onChange={e => setOrganizerName(e.target.value)} required /></div>
                                    <div className={styles.inputGroup}><label className={styles.label}>Instagram (Opcional)</label><div className={styles.inputWrapper}><FaInstagram className={styles.inputIcon}/><input className={styles.input} placeholder="@instagram" value={organizerInstagram} onChange={e => setOrganizerInstagram(e.target.value)} /></div></div>
                                </div>
                            </section>
                        </div>
                    )}

                    {/* ================= PASSO 2 ================= */}
                    {currentStep === 2 && (
                        <div className="wizard-step animate-fade-in">
                            <section className={styles.card}>
                                <div className={styles.cardHeader}><div className={styles.iconWrapper}><FaCalendarAlt /></div><h3>Data e Local</h3></div>
                                {sessions.map((s, i) => (
                                    <div key={i} className={styles.sessionCard}>
                                        <div className={styles.sessionHeader}>
                                            <h4>Sessão #{i+1}</h4>
                                            {sessions.length > 1 && <button type="button" onClick={() => handleRemoveSession(i)} className={styles.trashBtn}><FaTrashAlt /></button>}
                                        </div>
                                        <div className={styles.gridTwo}>
                                            <div className={styles.inputGroup}>
                                                <label className={styles.label}>Início</label>
                                                <div className={styles.gridDateTime}>
                                                    <input className={styles.input} type="date" value={s.date} onChange={e => handleChangeSession(i, 'date', e.target.value)} required />
                                                    <input className={styles.input} type="time" value={s.time} onChange={e => handleChangeSession(i, 'time', e.target.value)} required />
                                                </div>
                                            </div>
                                            <div className={styles.inputGroup}>
                                                <label className={styles.label}>Fim (Opcional)</label>
                                                <div className={styles.gridDateTime}>
                                                    <input className={styles.input} type="date" value={s.endDate || ''} onChange={e => handleChangeSession(i, 'endDate', e.target.value)} />
                                                    <input className={styles.input} type="time" value={s.endTime || ''} onChange={e => handleChangeSession(i, 'endTime', e.target.value)} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <button type="button" onClick={handleAddSession} className={styles.addBtnSmall}><FaPlus /> Adicionar Sessão/Data</button>
                                
                                <div className={styles.divider}></div>
                                
                                <div className={styles.inputGroupFull}>
                                    <label className={styles.label}>Nome do Local</label>
                                    <div className={styles.inputWrapper}>
                                        <FaMapMarkerAlt className={styles.inputIcon} />
                                        <input className={styles.input} value={locationName} onChange={e => setLocationName(e.target.value)} required placeholder="Ex: Espaço de Eventos" />
                                    </div>
                                </div>
                                <div className={styles.gridAddressTop}>
                                    <div className={styles.inputGroup}><label className={styles.label}>CEP</label><input className={styles.input} value={addressZipCode} onChange={e => handleZipCodeChange(e.target.value)} /></div>
                                    <div className={styles.inputGroup}><label className={styles.label}>Cidade</label><input className={styles.input} value={addressCity} onChange={e => setAddressCity(e.target.value)} required /></div>
                                    <div className={styles.inputGroup}><label className={styles.label}>UF</label><input className={styles.input} value={addressState} onChange={e => setAddressState(e.target.value)} maxLength={2} required /></div>
                                </div>
                                <div className={styles.gridAddressStreet}>
                                    <div className={styles.inputGroup}><label className={styles.label}>Rua</label><input className={styles.input} value={addressStreet} onChange={e => setAddressStreet(e.target.value)} /></div>
                                    <div className={styles.inputGroup}><label className={styles.label}>Nº</label><input className={styles.input} value={addressNumber} onChange={e => setAddressNumber(e.target.value)} /></div>
                                </div>
                                <div className={styles.inputGroup}><label className={styles.label}>Bairro</label><input className={styles.input} value={addressDistrict} onChange={e => setAddressDistrict(e.target.value)} /></div>
                            </section>
                        </div>
                    )}

                    {/* ================= PASSO 3 ================= */}
                    {currentStep === 3 && (
                        <div className="wizard-step animate-fade-in">
                            
                            {/* --- LINE-UP EXCLUSIVO PARA BARES --- */}
                            {category === 'Bares e Entretenimento' && (
                                <section className={styles.card} style={{ marginBottom: '30px', border: '2px solid #4c01b5' }}>
                                    <div className={styles.cardHeader}>
                                        <div className={styles.iconWrapper} style={{ background: '#4c01b5', color: '#fff' }}><FaMusic /></div>
                                        <h3 style={{ color: '#4c01b5' }}>Programação de Atrações (Line-up)</h3>
                                    </div>
                                    <p style={{fontSize: '0.9rem', color: '#64748b', marginBottom: '20px'}}>
                                        Defina quem vai tocar em cada data que você criou no passo anterior.
                                    </p>
                                    
                                    {sessions.map((session, sIndex) => (
                                        <div key={sIndex} style={{ marginBottom: '20px', background: '#f8fafc', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                            <h4 style={{ margin: '0 0 15px 0', color: '#0f172a', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <FaCalendarAlt color="#4c01b5"/> {session.date ? new Date(`${session.date}T12:00:00`).toLocaleDateString('pt-BR') : `Data ${sIndex + 1}`}
                                            </h4>
                                            
                                            {(session.lineup || []).map((artist, aIndex) => (
                                                <div key={aIndex} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                                                    <input 
                                                        className={styles.input} 
                                                        placeholder="Nome da Atração" 
                                                        value={artist.name} 
                                                        onChange={(e) => handleLineupChange(sIndex, aIndex, 'name', e.target.value)} 
                                                        style={{ flex: 1 }}
                                                    />
                                                    <input 
                                                        type="time" 
                                                        className={styles.input} 
                                                        value={artist.time} 
                                                        onChange={(e) => handleLineupChange(sIndex, aIndex, 'time', e.target.value)} 
                                                        style={{ width: '130px' }}
                                                    />
                                                    <button type="button" onClick={() => handleRemoveLineup(sIndex, aIndex)} className={styles.trashBtn}>
                                                        <FaTrashAlt />
                                                    </button>
                                                </div>
                                            ))}
                                            
                                            <button type="button" onClick={() => handleAddLineup(sIndex)} style={{ background: 'none', border: '1px dashed #4c01b5', color: '#4c01b5', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px' }}>
                                                <FaPlus /> Adicionar Atração neste dia
                                            </button>
                                        </div>
                                    ))}
                                </section>
                            )}

                            <section className={styles.card}>
                                <div className={styles.cardHeader}><div className={styles.iconWrapper}><FaTicketAlt /></div><h3>Vendas e Ingressos</h3></div>
                                
                                <div className={styles.infoSwitchContainer}>
                                    <label className={styles.switch}>
                                        <input className={styles.hiddenCheckbox} type="checkbox" checked={sellOnPlatform} onChange={e => setSellOnPlatform(e.target.checked)} />
                                        <span className={styles.slider}></span>
                                    </label>
                                    <div>
                                        <strong style={{display: 'block', color: '#1e293b'}}>Vender ingressos pela Vibz</strong>
                                        <span style={{fontSize: '0.85rem', color: '#64748b'}}>Desmarque se a venda for realizada em outro site ou for apenas Vitrine.</span>
                                    </div>
                                </div>

                                {!sellOnPlatform && (
                                    <div className={styles.inputGroupFull} style={{marginTop: '20px', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0'}}>
                                        <label className={styles.label}>Link Oficial de Vendas Externo ou Reserva</label>
                                        <div className={styles.inputWrapper}>
                                            <FaLink className={styles.inputIcon}/>
                                            <input className={styles.input} type="url" value={externalUrl} onChange={e=>setExternalUrl(e.target.value)} placeholder="https://..." />
                                        </div>
                                    </div>
                                )}

                                {sellOnPlatform && (
                                    <div className={styles.ticketsContainer} style={{marginTop: '20px'}}>
                                        {ticketTypes.map((type, typeIdx) => (
                                            <div key={type.uniqueGroupId || typeIdx} className={styles.ticketTypeCard}>
                                                <div className={styles.ticketTypeHeader}>
                                                    <div className={styles.inputGroup} style={{flex: 2}}>
                                                        <label className={styles.label}>Nome do Ingresso</label>
                                                        <input className={styles.input} type="text" value={type.name || ''} onChange={e => handleChangeTicketType(typeIdx, 'name', e.target.value)} placeholder="Ex: Dia 1 - 19h00" required />
                                                    </div>
                                                    <div className={styles.inputGroup} style={{flex: 1}}>
                                                        <label className={styles.label}>Categoria</label>
                                                        <select className={styles.select} value={type.category || 'Inteira'} onChange={e => handleChangeTicketType(typeIdx, 'category', e.target.value)}>
                                                            <option>Inteira</option><option>Meia / Estudante</option><option>VIP</option><option>Cortesia</option>
                                                        </select>
                                                    </div>
                                                    {ticketTypes.length > 1 && <button type="button" onClick={() => handleRemoveTicketType(typeIdx)} className={styles.trashBtn}><FaTrashAlt /></button>}
                                                </div>
                                                
                                                <div style={{display:'flex', gap:'20px', marginBottom: '15px', flexWrap:'wrap'}}>
                                                    <div className={styles.inputGroup} style={{flex: '0 0 180px'}}>
                                                        <label className={styles.label}><FaUserLock/> Máx. por pessoa</label>
                                                        <input className={styles.input} type="number" min="1" value={type.maxPerUser} onChange={e => handleChangeTicketType(typeIdx, 'maxPerUser', e.target.value)} required />
                                                    </div>
                                                    <div style={{display:'flex', alignItems:'center', paddingTop:'20px'}}>
                                                        <label className={styles.checkboxLabel}>
                                                            <input className={styles.checkbox} type="checkbox" checked={type.hasSchedule} onChange={e => handleChangeTicketType(typeIdx, 'hasSchedule', e.target.checked)} /> 
                                                            Data/horário específico
                                                        </label>
                                                    </div>
                                                </div>

                                                {type.hasSchedule && (
                                                    <div style={{backgroundColor: '#f1f5f9', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e2e8f0'}}>
                                                        <div className={styles.gridTwo}>
                                                            <div className={styles.inputGroup}>
                                                                <label className={styles.label}>Data</label>
                                                                <input type="date" className={styles.inputSmall} value={type.activityDate || ''} onChange={e => handleChangeTicketType(typeIdx, 'activityDate', e.target.value)} />
                                                            </div>
                                                            <div className={styles.inputGroup}>
                                                                <label className={styles.label}>Horário</label>
                                                                <div style={{display:'flex', gap:'5px'}}>
                                                                    <input type="time" className={styles.inputSmall} value={type.startTime || ''} onChange={e => handleChangeTicketType(typeIdx, 'startTime', e.target.value)} />
                                                                    <input type="time" className={styles.inputSmall} value={type.endTime || ''} onChange={e => handleChangeTicketType(typeIdx, 'endTime', e.target.value)} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className={styles.batchesContainer}>
                                                    <h4 className={styles.batchTitle}>Lotes e Preços:</h4>
                                                    {type.batches.map((batch, batchIdx) => (
                                                        <div key={batch.id || batchIdx} className={styles.batchRow}>
                                                            <div className={styles.inputGroup}>
                                                                <input className={styles.inputSmall} type="text" value={batch.name || ''} onChange={e => handleChangeBatch(typeIdx, batchIdx, 'name', e.target.value)} placeholder="Lote" />
                                                            </div>
                                                            <div className={styles.inputGroup}>
                                                                <div className={styles.inputWrapper}>
                                                                    <span className={styles.currencyPrefix}>R$</span>
                                                                    <input className={styles.inputSmall} type="number" value={batch.price} onChange={e => handleChangeBatch(typeIdx, batchIdx, 'price', e.target.value)} min="0" step="0.01" required />
                                                                </div>
                                                            </div>
                                                            <div className={styles.inputGroup}>
                                                                <input className={styles.inputSmall} type="number" value={batch.quantity} onChange={e => handleChangeBatch(typeIdx, batchIdx, 'quantity', e.target.value)} placeholder="Vagas" min="1" required />
                                                            </div>
                                                            {type.batches.length > 1 && <button type="button" onClick={() => handleRemoveBatch(typeIdx, batchIdx)} className={styles.removeBatchBtn}><FaTrashAlt size={14} /></button>}
                                                        </div>
                                                    ))}
                                                    <button type="button" onClick={() => handleAddBatch(typeIdx)} className={styles.addBatchBtn}><FaPlus size={12} /> Adicionar Lote</button>
                                                </div>
                                            </div>
                                        ))}
                                        <button type="button" onClick={handleAddTicketType} className={styles.addBtnFull}><FaPlus /> Criar Novo Tipo de Ingresso</button>
                                    </div>
                                )}
                            </section>
                            
                            {/* --- FORMULÁRIO PERSONALIZADO --- */}
                            {sellOnPlatform && (
                                <section className={styles.card}>
                                    <div className={styles.cardHeader}><div className={styles.iconWrapper}><FaClipboardCheck /></div><h3>Formulário Personalizado</h3></div>
                                    <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '10px' }}>
                                        Exija informações adicionais na inscrição (Ex: WhatsApp, Igreja, Mesa Desejada).
                                    </p>
                                    
                                    {/* ALERTA DE UX SOBRE A LGPD */}
                                    <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', padding: '10px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                                        <span style={{ fontSize: '0.85rem', color: '#991B1B' }}>
                                            <strong>Regra LGPD:</strong> É proibido solicitar dados sensíveis (religião, saúde), dados bancários, senhas ou fotos de documentos (RG/CNH). O sistema bloqueará o salvamento caso identifique termos restritos.
                                        </span>
                                    </div>

                                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '25px', padding: '15px', border: '1px solid #e2e8f0', borderRadius: '10px', background: requireCustomForm ? '#f8fafc' : '#fff' }}>
                                        <input type="checkbox" checked={requireCustomForm} onChange={e => setRequireCustomForm(e.target.checked)} style={{ accentColor: '#4c01b5', transform: 'scale(1.2)' }} />
                                        <strong style={{ color: requireCustomForm ? '#4c01b5' : '#475569' }}>Quero exigir informações extras na compra</strong>
                                    </label>

                                    {requireCustomForm && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                            {formFields.map((field) => (
                                                <div key={field.id} style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', flexWrap: 'wrap' }}>
                                                    <div className={styles.inputGroup} style={{ flex: '2 1 250px' }}>
                                                        <label className={styles.label}>Pergunta / Campo</label>
                                                        <input className={styles.input} value={field.label} onChange={e => handleChangeFormField(field.id, 'label', e.target.value)} placeholder="Ex: Qual seu WhatsApp?" required />
                                                    </div>
                                                    <div className={styles.inputGroup} style={{ flex: '1 1 150px' }}>
                                                        <label className={styles.label}>Tipo de Resposta</label>
                                                        <select className={styles.select} value={field.type} onChange={e => handleChangeFormField(field.id, 'type', e.target.value)}>
                                                            <option value="text">Texto Curto</option><option value="tel">Telefone / WhatsApp</option><option value="email">E-mail</option>
                                                        </select>
                                                    </div>
                                                    <div style={{ flex: '1 1 auto', display: 'flex', justifyContent: 'flex-start', paddingBottom: '12px' }}>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.95rem', color: '#334155', fontWeight: 'bold' }}>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={field.required} 
                                                                onChange={e => handleChangeFormField(field.id, 'required', e.target.checked)} 
                                                                style={{ accentColor: '#4c01b5', width: '18px', height: '18px', margin: 0, cursor: 'pointer' }} 
                                                            />
                                                            Obrigatório
                                                        </label>
                                                    </div>
                                                    <button type="button" onClick={() => handleRemoveFormField(field.id)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '12px 15px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Remover Pergunta">
                                                        <FaTrashAlt />
                                                    </button>
                                                </div>
                                            ))}
                                            <button type="button" onClick={handleAddFormField} style={{ alignSelf: 'flex-start', background: '#e0e7ff', color: '#4c01b5', border: 'none', padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <FaPlus /> Adicionar Nova Pergunta
                                            </button>
                                        </div>
                                    )}
                                </section>
                            )}
                        </div>
                    )}

                    {/* ================= PASSO 4 ================= */}
                    {currentStep === 4 && (
                        <div className="wizard-step animate-fade-in">
                            <section className={styles.card}>
                                <div className={styles.cardHeader}><div className={styles.iconWrapper}><FaStar /></div><h3>Destaque e Revisão</h3></div>
                                
                                <div style={{padding: '0 0 20px 0'}}>
                                    <p style={{marginBottom: '20px', color: '#64748b'}}>Escolha como você quer destacar seu evento na plataforma.</p>
                                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px'}}>
                                        <div onClick={() => setHighlightTier(null)} style={{border: highlightTier === null ? '2px solid #64748b' : '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', cursor: 'pointer', background: highlightTier === null ? '#f8fafc' : '#fff', transition: '0.2s'}}>
                                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}><strong>Básico</strong>{highlightTier === null ? <FaCheckCircle color="#64748b"/> : <FaRegCircle color="#cbd5e1"/>}</div>
                                            <p style={{fontSize:'0.85rem', color:'#64748b', marginTop:'10px'}}>Publicação padrão na lista. Sem custo.</p>
                                        </div>

                                        <div onClick={() => setHighlightTier('STANDARD')} style={{border: highlightTier === 'STANDARD' ? '2px solid #4C01B5' : '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', cursor: 'pointer', background: highlightTier === 'STANDARD' ? '#F3E8FF' : '#fff', transition: '0.2s'}}>
                                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}><strong style={{color: '#4C01B5'}}>Destaque Standard</strong>{highlightTier === 'STANDARD' ? <FaCheckCircle color="#4C01B5"/> : <FaRegCircle color="#cbd5e1"/>}</div>
                                            <div style={{marginTop: '15px'}}>
                                                <label style={{fontSize: '0.8rem', fontWeight: '600', color: '#4C01B5'}}>Quantos dias?</label>
                                                <input type="range" min="1" max="45" value={highlightDays} onChange={(e) => setHighlightDays(parseInt(e.target.value))} onClick={(e) => e.stopPropagation()} style={{width: '100%', accentColor: '#4C01B5', cursor: 'pointer'}} />
                                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px'}}>
                                                    <span style={{fontWeight: 'bold', color: '#4C01B5'}}>{highlightDays} dias</span>
                                                    <span style={{fontSize: '1.2rem', fontWeight: '800', color: '#1e293b'}}>R$ {(highlightDays * prices.standardPrice).toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div onClick={() => setHighlightTier('PREMIUM')} style={{border: highlightTier === 'PREMIUM' ? '2px solid #F59E0B' : '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', cursor: 'pointer', background: highlightTier === 'PREMIUM' ? '#FFFBEB' : '#fff', transition: '0.2s'}}>
                                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}><strong style={{color: '#B45309'}}>Destaque Premium</strong>{highlightTier === 'PREMIUM' ? <FaCheckCircle color="#B45309"/> : <FaRegCircle color="#cbd5e1"/>}</div>
                                            <h4 style={{fontSize:'1.4rem', margin:'15px 0', color: '#B45309'}}>R$ {prices.premiumPrice.toFixed(2)}</h4>
                                            <p style={{fontSize:'0.75rem', color:'#64748b', marginTop:'5px'}}>Exposição máxima no Banner Principal e Topo da Home.</p>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <h4 style={{ margin: '0 0 15px', color: '#0f172a' }}>Resumo da Edição</h4>
                                    <ul style={{ margin: 0, paddingLeft: '20px', color: '#475569', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <li><strong>Título:</strong> {title || '-'}</li>
                                        <li><strong>Categoria:</strong> {category || '-'}</li>
                                        <li><strong>Sessões cadastradas:</strong> {sessions.length}</li>
                                        <li><strong>Ingressos/Lotes:</strong> {sellOnPlatform ? ticketTypes.length : 'Venda Externa / Vitrine'}</li>
                                    </ul>
                                </div>
                            </section>

                            <div className={styles.footer} style={{ marginTop: '30px' }}>
                                <div className={styles.termsBox} style={{ background: '#fff', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                                    <label style={{display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', margin: 0}}>
                                        <input className={styles.checkbox} type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} style={{ marginTop: '4px' }} />
                                        <span style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.5 }}>
                                            Confirmo que as alterações estão corretas e desejo atualizar o evento na plataforma.
                                        </span>
                                    </label>
                                </div>
                                <button onClick={handleSubmit} className={styles.submitButton} disabled={saving || !termsAccepted} style={{ width: '100%', padding: '18px', fontSize: '1.1rem', background: termsAccepted ? '#10b981' : '#cbd5e1' }}>
                                    {saving ? 'SALVANDO...' : <><FaClipboardCheck /> SALVAR ALTERAÇÕES</>}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* --- CONTROLES DE NAVEGAÇÃO DO WIZARD --- */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', borderTop: '1px solid #e2e8f0', paddingTop: '25px' }}>
                        {currentStep > 1 ? (
                            <button type="button" onClick={handlePrevStep} style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '12px 24px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: '0.2s' }}>
                                <FaArrowLeft /> Passo Anterior
                            </button>
                        ) : <div></div>}

                        {currentStep < 4 && (
                            <button type="button" onClick={handleNextStep} style={{ background: '#4c01b5', color: '#fff', border: 'none', padding: '12px 30px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: '0.2s', boxShadow: '0 4px 6px rgba(76,1,181,0.2)' }}>
                                Próximo Passo <FaArrowRight />
                            </button>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default EditarEvento;