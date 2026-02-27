'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import styles from '@/app/admin/new/CadastroEvento.module.css'; 
import { 
    FaImage, FaInstagram, FaPlus, FaTrashAlt, 
    FaTicketAlt, FaCalendarAlt, FaMapMarkerAlt,
    FaAlignLeft, FaArrowLeft, FaSave, FaStar,
    FaClipboardList, FaUserLock, FaCheckCircle, FaRegCircle
} from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast'; 

const getApiBaseUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
};

// --- COMPONENTE DE SKELETON (UX) ---
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

    // --- ESTADOS DO FORMULÁRIO ---
    const [loadingData, setLoadingData] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [ageRating, setAgeRating] = useState('Livre');
    const [imageFile, setImageFile] = useState(null); 
    const [imagePreview, setImagePreview] = useState(''); 
    const [refundPolicy, setRefundPolicy] = useState('O cancelamento pode ser solicitado em até 7 dias após a compra.');

    const [sessions, setSessions] = useState([{ date: '', time: '', endDate: '', endTime: '' }]);
    
    const [locationName, setLocationName] = useState('');
    const [addressStreet, setAddressStreet] = useState('');
    const [addressNumber, setAddressNumber] = useState('');
    const [addressDistrict, setAddressDistrict] = useState('');
    const [addressCity, setAddressCity] = useState('');
    const [addressState, setAddressState] = useState('');
    const [addressZipCode, setAddressZipCode] = useState('');
    
    const [organizerName, setOrganizerName] = useState('');
    const [organizerInstagram, setOrganizerInstagram] = useState('');
    
    const [isInformational, setIsInformational] = useState(false);
    const [ticketTypes, setTicketTypes] = useState([]);
    const [customQuestions, setCustomQuestions] = useState([]);

    // --- ESTADOS DE DESTAQUE ---
    const [highlightTier, setHighlightTier] = useState(null); 
    const [highlightDays, setHighlightDays] = useState(7);
    const [prices, setPrices] = useState({ standardPrice: 2, premiumPrice: 100 });

    // --- FORMATADORES ---
    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    };

    const handleZipCodeChange = (value) => {
        const cleanValue = value.replace(/\D/g, "");
        const maskedValue = cleanValue.replace(/^(\d{5})(\d)/, "$1-$2").substring(0, 9);
        setAddressZipCode(maskedValue);
    };

    // --- CARREGAMENTO DOS DADOS ---
    useEffect(() => {
        const fetchInitialData = async () => {
            if (!eventId) return;
            const token = localStorage.getItem('userToken')?.replace(/"/g, '');

            try {
                const configRes = await fetch(`${API_BASE_URL}/config/prices`);
                if (configRes.ok) {
                    const configData = await configRes.json();
                    setPrices(configData);
                }

                const res = await fetch(`${API_BASE_URL}/events/${eventId}`);
                if (!res.ok) throw new Error("Evento não encontrado");
                const data = await res.json();

                setTitle(data.title || '');
                setDescription(data.description || '');
                setCategory(data.category || '');
                setAgeRating(data.ageRating || 'Livre');
                setImagePreview(data.imageUrl || '');
                setRefundPolicy(data.refundPolicy || '');
                setIsInformational(data.isInformational || false);
                setHighlightTier(data.highlightTier || null);
                setHighlightDays(data.highlightDuration || 7);

                if (data.sessions && data.sessions.length > 0) {
                    setSessions(data.sessions.map(s => ({
                        date: formatDateForInput(s.date),
                        time: new Date(s.date).toTimeString().slice(0, 5),
                        endDate: s.endDate ? formatDateForInput(s.endDate) : '',
                        endTime: s.endDate ? new Date(s.endDate).toTimeString().slice(0, 5) : ''
                    })));
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

                setCustomQuestions(data.formSchema || []);

                // RECONSTRUÇÃO DOS TICKETS (Garantindo a manutenção do ID)
                const rawTickets = data.ticketTypes || data.tickets || [];
                const grouped = {};
                rawTickets.forEach(t => {
                    const key = `${t.name}-${t.category}`;
                    if (!grouped[key]) {
                        grouped[key] = {
                            name: t.name,
                            category: t.category || 'Inteira',
                            isHalfPrice: t.isHalfPrice || false,
                            maxPerUser: t.maxPerUser || 4,
                            hasSchedule: !!t.activityDate,
                            activityDate: t.activityDate ? formatDateForInput(t.activityDate) : '',
                            startTime: t.startTime || '',
                            endTime: t.endTime || '',
                            batches: []
                        };
                    }
                    grouped[key].batches.push({
                        id: t.id || t._id, // PEGA O ID AQUI!
                        name: t.batchName || t.batch || 'Lote',
                        price: t.price,
                        quantity: t.quantity
                    });
                });
                setTicketTypes(Object.values(grouped).length > 0 ? Object.values(grouped) : [{ name: '', category: 'Inteira', isHalfPrice: false, hasSchedule: false, maxPerUser: 4, activityDate: '', startTime: '', endTime: '', batches: [{ name: '1º Lote', price: '', quantity: '' }] }]);

            } catch (err) {
                console.error(err);
                toast.error("Erro ao carregar dados do evento.");
            } finally {
                setLoadingData(false);
            }
        };
        fetchInitialData();
    }, [eventId, API_BASE_URL]);

    // --- FUNÇÕES DE MANIPULAÇÃO ---
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) return toast.error('Imagem muito grande (Máx 5MB)');
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleAddSession = () => setSessions([...sessions, { date: '', time: '', endDate: '', endTime: '' }]);
    const handleRemoveSession = (i) => setSessions(sessions.filter((_, idx) => idx !== i));
    const handleChangeSession = (index, field, value) => {
        const updated = [...sessions];
        updated[index][field] = value;
        setSessions(updated);
    };
    
    // Ingressos
    const handleAddTicketType = () => {
        setTicketTypes([...ticketTypes, { 
            name: '', category: 'Inteira', isHalfPrice: false,
            hasSchedule: false, maxPerUser: 4, activityDate: '', startTime: '', endTime: '',
            batches: [{ name: `${ticketTypes.length + 1}º Lote`, price: '', quantity: '' }] 
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
        updated[ti].batches.push({ name: `${nextBatchNum}º Lote`, price: '', quantity: '' });
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

    // Formulário Personalizado
    const handleAddQuestion = () => setCustomQuestions([...customQuestions, { label: '', type: 'text', required: true, options: '' }]);
    const handleRemoveQuestion = (index) => setCustomQuestions(customQuestions.filter((_, i) => i !== index));
    const handleChangeQuestion = (index, field, value) => {
        const updated = [...customQuestions];
        updated[index][field] = value;
        setCustomQuestions(updated);
    };

    // --- SUBMISSÃO ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        const token = localStorage.getItem('userToken')?.replace(/"/g, '');

        if (!category) { setSaving(false); return toast.error('Selecione uma categoria.'); }
        if (sessions.some(s => !s.date || !s.time)) {
            setSaving(false);
            return toast.error("Preencha data e hora de todas as sessões.");
        }

        if (!isInformational) {
            for (const type of ticketTypes) {
                if (!type.name) { setSaving(false); return toast.error("Nome do ingresso é obrigatório."); }
                if (type.hasSchedule && (!type.activityDate || !type.startTime || !type.endTime)) {
                    setSaving(false);
                    return toast.error(`Preencha a programação para o ingresso "${type.name}"`);
                }
                for (const batch of type.batches) {
                    if (batch.price === '' || batch.price === null) { setSaving(false); return toast.error(`Preço obrigatório em ${type.name}`); }
                    if (!batch.quantity) { setSaving(false); return toast.error(`Quantidade obrigatória em ${type.name}`); }
                }
            }
        }

        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('category', category);
        formData.append('ageRating', ageRating);
        formData.append('refundPolicy', refundPolicy);
        formData.append('isInformational', isInformational);
        if (imageFile) formData.append('image', imageFile);

        // Formatação de Sessões
        const formattedSessions = sessions.map(s => ({
            date: new Date(`${s.date}T${s.time}`).toISOString(),
            endDate: s.endDate && s.endTime ? new Date(`${s.endDate}T${s.endTime}`).toISOString() : null
        }));
        formData.append('sessions', JSON.stringify(formattedSessions));
        if (formattedSessions.length > 0) formData.append('date', formattedSessions[0].date);

        // Endereço
        formData.append('location', locationName);
        formData.append('city', addressCity);
        formData.append('address', JSON.stringify({
            street: addressStreet, number: addressNumber, district: addressDistrict, 
            city: addressCity, state: addressState, zipCode: addressZipCode
        }));

        // Ingressos
        const flatTickets = [];
        if (!isInformational) {
            ticketTypes.forEach(type => {
                type.batches.forEach(batch => {
                    flatTickets.push({
                        ...type,
                        id: batch.id, // IMPORTANTE: Passando o ID para não duplicar
                        batch: batch.name,
                        price: parseFloat(batch.price.toString().replace(',', '.')),
                        quantity: parseInt(batch.quantity),
                        batches: undefined 
                    });
                });
            });
        }
        formData.append('tickets', JSON.stringify(flatTickets));

        // Organizador e Destaque
        formData.append('organizerInfo', JSON.stringify({ name: organizerName, instagram: organizerInstagram }));
        
        if (highlightTier) {
            formData.append('isFeaturedRequested', 'true');
            formData.append('highlightTier', highlightTier);
            if (highlightTier === 'STANDARD') formData.append('highlightDuration', highlightDays);
        } else {
            formData.append('isFeaturedRequested', 'false');
        }

        formData.append('formSchema', JSON.stringify(customQuestions));

        try {
            const res = await fetch(`${API_BASE_URL}/events/${eventId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

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
                    <p>Altere os detalhes do seu evento e clique em salvar.</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.formContainer}>
                    
                    {/* SEÇÃO 1: PRINCIPAL */}
                    <section className={styles.card}>
                        <div className={styles.cardHeader}>
                            <div className={styles.iconWrapper}><FaImage /></div>
                            <h3>Informações de Capa e Identidade</h3>
                        </div>
                        <div className={styles.uploadSection}>
                            <div className={styles.uploadBox} onClick={() => document.getElementById('editImage').click()}>
                                {imagePreview ? <img src={imagePreview} className={styles.imagePreview} alt="Capa" /> : <div className={styles.uploadPlaceholder}><FaImage size={48} /><span>Carregar Nova Capa</span></div>}
                                <div className={styles.imageOverlay}>Alterar Foto</div>
                            </div>
                            <input type="file" id="editImage" hidden onChange={handleImageUpload} accept="image/*" />
                        </div>
                        <div className={styles.gridTwo}>
                            <div className={styles.inputGroupFull} style={{gridColumn: 'span 2'}}>
                                <label className={styles.label}>Título do Evento</label>
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
                                <select className={styles.select} value={category} onChange={e => setCategory(e.target.value)} required>
                                    <option value="" disabled>Selecione...</option>
                                    <option>Festas e Shows</option>
                                    <option>Acadêmico / Congresso</option>
                                    <option>Cursos e Workshops</option>
                                    <option>Teatro e Cultura</option>
                                    <option>Esportes</option>
                                    <option>Gastronomia</option>
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

                    {/* SEÇÃO 2: DATAS E LOCAL */}
                    <section className={styles.card}>
                        <div className={styles.cardHeader}>
                            <div className={styles.iconWrapper}><FaCalendarAlt /></div>
                            <h3>Data e Local</h3>
                        </div>
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
                                            <input className={styles.input} type="date" value={s.endDate} onChange={e => handleChangeSession(i, 'endDate', e.target.value)} />
                                            <input className={styles.input} type="time" value={s.endTime} onChange={e => handleChangeSession(i, 'endTime', e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={handleAddSession} className={styles.addBtnSmall}><FaPlus /> Adicionar Sessão</button>
                        
                        <div className={styles.divider}></div>
                        
                        <div className={styles.inputGroupFull}>
                            <label className={styles.label}>Local</label>
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

                    {/* SEÇÃO 3: INGRESSOS */}
                    <section className={styles.card}>
                        <div className={styles.cardHeader}><div className={styles.iconWrapper}><FaTicketAlt /></div><h3>Inscrições / Ingressos</h3></div>
                        <div className={styles.infoSwitchContainer}>
                            <label className={styles.switch}>
                                <input className={styles.hiddenCheckbox} type="checkbox" checked={isInformational} onChange={e => setIsInformational(e.target.checked)} />
                                <span className={styles.slider}></span>
                            </label>
                            <div>
                                <strong style={{display: 'block', color: '#1e293b'}}>Evento APENAS informativo (Sem Inscrição/Venda)</strong>
                                <span style={{fontSize: '0.85rem', color: '#64748b'}}>Marque se o evento não tiver lista de presença ou ingressos.</span>
                            </div>
                        </div>

                        {!isInformational && (
                            <div className={styles.ticketsContainer}>
                                {ticketTypes.map((type, typeIdx) => (
                                    <div key={typeIdx} className={styles.ticketTypeCard}>
                                        <div className={styles.ticketTypeHeader}>
                                            <div className={styles.inputGroup} style={{flex: 2}}>
                                                <label className={styles.label}>Nome do Ingresso</label>
                                                <input className={styles.input} type="text" value={type.name || ''} onChange={e => handleChangeTicketType(typeIdx, 'name', e.target.value)} placeholder="Ex: Área VIP" required />
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
                                            <h4 className={styles.batchTitle}>Lotes:</h4>
                                            {type.batches.map((batch, batchIdx) => (
                                                <div key={batchIdx} className={styles.batchRow}>
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

                    {/* SEÇÃO 4: DADOS DO PARTICIPANTE */}
                    {!isInformational && (
                        <section className={styles.card}>
                            <div className={styles.cardHeader}><div className={styles.iconWrapper}><FaClipboardList /></div><h3>Dados do Participante</h3></div>
                            <div className={styles.questionList}>
                                {customQuestions.map((q, idx) => (
                                    <div key={idx} className={styles.questionCard}>
                                        <div className={styles.questionRow}>
                                            <div className={styles.inputGroup}>
                                                <label className={styles.label}>Pergunta</label>
                                                <input className={styles.input} value={q.label || ''} onChange={e => handleChangeQuestion(idx, 'label', e.target.value)} placeholder="Ex: Tamanho da Camisa" required />
                                            </div>
                                            <div className={styles.inputGroup}>
                                                <label className={styles.label}>Tipo de Resposta</label>
                                                <select className={styles.select} value={q.type || 'text'} onChange={e => handleChangeQuestion(idx, 'type', e.target.value)}>
                                                    <option value="text">Texto Curto</option>
                                                    <option value="select">Seleção</option>
                                                    <option value="checkbox">Sim/Não</option>
                                                </select>
                                            </div>
                                        </div>
                                        {q.type === 'select' && (
                                            <div className={styles.optionsRow}>
                                                <div className={styles.inputGroup}>
                                                    <label className={styles.label}>Opções (separadas por vírgula)</label>
                                                    <input className={styles.input} value={q.options || ''} onChange={e => handleChangeQuestion(idx, 'options', e.target.value)} placeholder="P, M, G, GG" />
                                                </div>
                                            </div>
                                        )}
                                        <div className={styles.questionFooter}>
                                            <label className={styles.switchLabel}>
                                                <input className={styles.checkbox} type="checkbox" checked={q.required} onChange={e => handleChangeQuestion(idx, 'required', e.target.checked)} /> Obrigatória
                                            </label>
                                            <button type="button" onClick={() => handleRemoveQuestion(idx)} className={styles.deleteQuestionBtn}><FaTrashAlt size={14} /> Excluir</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button type="button" onClick={handleAddQuestion} className={styles.addQuestionBtn}><FaPlus /> Adicionar Pergunta Personalizada</button>
                        </section>
                    )}

                    {/* SEÇÃO 5: ORGANIZADOR */}
                    <section className={styles.card}>
                        <div className={styles.cardHeader}><div className={styles.iconWrapper}><FaInstagram /></div><h3>Organizador</h3></div>
                        <div className={styles.gridTwo}>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Nome</label>
                                <input className={styles.input} placeholder="Nome do Organizador" value={organizerName} onChange={e => setOrganizerName(e.target.value)} required />
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Instagram</label>
                                <div className={styles.inputWrapper}>
                                    <FaInstagram className={styles.inputIcon}/>
                                    <input className={styles.input} placeholder="@instagram" value={organizerInstagram} onChange={e => setOrganizerInstagram(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* SEÇÃO 6: DESTAQUE */}
                    <section className={styles.card}>
                        <div className={styles.cardHeader}><div className={styles.iconWrapper}><FaStar /></div><h3>Destacar Evento (Opcional)</h3></div>
                        <div style={{padding: '20px'}}>
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
                    </section>

                    <div className={styles.footer} style={{marginTop: '20px'}}>
                        <button type="submit" className={styles.submitButton} disabled={saving}>
                            {saving ? 'Processando...' : <><FaSave style={{marginRight: '8px'}}/> SALVAR ALTERAÇÕES</>}
                        </button>
                    </div>

                </form>
            </main>
            <Footer />
        </div>
    );
};

export default EditarEvento;