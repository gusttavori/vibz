'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import styles from '@/app/admin/new/CadastroEvento.module.css';
import { 
    FaImage, FaInstagram, FaPlus, FaTrashAlt, 
    FaTicketAlt, FaCalendarAlt, FaMapMarkerAlt,
    FaAlignLeft, FaLayerGroup, FaArrowLeft, FaSave, FaStar,
    FaClipboardList, FaClock, FaUserLock, FaCheckCircle, FaRegCircle, FaBolt
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
    const [highlightTier, setHighlightTier] = useState(null); // null, 'STANDARD', 'PREMIUM'
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
                // Busca configurações de preço do sistema
                const configRes = await fetch(`${API_BASE_URL}/config/prices`);
                if (configRes.ok) {
                    const configData = await configRes.json();
                    setPrices(configData);
                }

                // Busca dados do evento
                const res = await fetch(`${API_BASE_URL}/events/${eventId}`);
                if (!res.ok) throw new Error("Evento não encontrado");
                const data = await res.json();

                // Mapeamento de dados básicos
                setTitle(data.title || '');
                setDescription(data.description || '');
                setCategory(data.category || '');
                setAgeRating(data.ageRating || 'Livre');
                setImagePreview(data.imageUrl || '');
                setRefundPolicy(data.refundPolicy || '');
                setIsInformational(data.isInformational || false);
                setHighlightTier(data.highlightTier || null);
                setHighlightDays(data.highlightDuration || 7);

                // Mapeamento de Sessões
                if (data.sessions && data.sessions.length > 0) {
                    setSessions(data.sessions.map(s => ({
                        date: formatDateForInput(s.date),
                        time: new Date(s.date).toTimeString().slice(0, 5),
                        endDate: s.endDate ? formatDateForInput(s.endDate) : '',
                        endTime: s.endDate ? new Date(s.endDate).toTimeString().slice(0, 5) : ''
                    })));
                }

                // Mapeamento de Localização
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

                // Organizador
                const org = data.organizerInfo || data.organizer || {};
                setOrganizerName(org.name || '');
                setOrganizerInstagram(org.instagram || '');

                // Mapeamento de Perguntas Personalizadas
                setCustomQuestions(data.formSchema || []);

                // RECONSTRUÇÃO DOS TICKETS (De flat list para grupos de lotes)
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
                        id: t.id,
                        name: t.batchName || t.batch || 'Lote',
                        price: t.price,
                        quantity: t.quantity
                    });
                });
                setTicketTypes(Object.values(grouped).length > 0 ? Object.values(grouped) : [{ name: '', category: 'Inteira', batches: [{ name: '1º Lote', price: '', quantity: '' }] }]);

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
    
    const handleAddTicketType = () => setTicketTypes([...ticketTypes, { name: '', category: 'Inteira', isHalfPrice: false, hasSchedule: false, maxPerUser: 4, batches: [{ name: '1º Lote', price: '', quantity: '' }] }]);
    const handleRemoveTicketType = (i) => setTicketTypes(ticketTypes.filter((_, idx) => idx !== i));
    
    const handleAddBatch = (ti) => {
        const updated = [...ticketTypes];
        updated[ti].batches.push({ name: `${updated[ti].batches.length + 1}º Lote`, price: '', quantity: '' });
        setTicketTypes(updated);
    };

    const handleAddQuestion = () => setCustomQuestions([...customQuestions, { label: '', type: 'text', required: true, options: '' }]);

    // --- SUBMISSÃO ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        const token = localStorage.getItem('userToken')?.replace(/"/g, '');

        // Validações Básicas
        if (sessions.some(s => !s.date || !s.time)) {
            setSaving(false);
            return toast.error("Preencha data e hora de todas as sessões.");
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
        formData.append('date', formattedSessions[0].date);

        // Endereço
        formData.append('location', locationName);
        formData.append('city', addressCity);
        formData.append('address', JSON.stringify({
            street: addressStreet, number: addressNumber, district: addressDistrict, 
            state: addressState, zipCode: addressZipCode
        }));

        // Ingressos (Planificando para o Backend)
        const flatTickets = [];
        if (!isInformational) {
            ticketTypes.forEach(type => {
                type.batches.forEach(batch => {
                    flatTickets.push({
                        ...type,
                        batch: batch.name,
                        price: parseFloat(batch.price),
                        quantity: parseInt(batch.quantity),
                        batches: undefined // Remove a chave aninhada antes de enviar
                    });
                });
            });
        }
        formData.append('tickets', JSON.stringify(flatTickets));

        // Destaque
        if (highlightTier) {
            formData.append('isFeaturedRequested', 'true');
            formData.append('highlightTier', highlightTier);
            if (highlightTier === 'STANDARD') formData.append('highlightDuration', highlightDays);
        }

        formData.append('organizerInfo', JSON.stringify({ name: organizerName, instagram: organizerInstagram }));
        formData.append('formSchema', JSON.stringify(customQuestions));

        try {
            const res = await fetch(`${API_BASE_URL}/events/${eventId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                toast.success("Evento atualizado com sucesso!");
                router.push('/dashboard');
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
                                {imagePreview ? <img src={imagePreview} className={styles.imagePreview} alt="Capa" /> : <FaImage size={40} />}
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
                            <h3>Quando e Onde?</h3>
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
                                            <input className={styles.input} type="date" value={s.date} onChange={e => {const u=[...sessions]; u[i].date=e.target.value; setSessions(u)}} required />
                                            <input className={styles.input} type="time" value={s.time} onChange={e => {const u=[...sessions]; u[i].time=e.target.value; setSessions(u)}} required />
                                        </div>
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>Término (Opcional)</label>
                                        <div className={styles.gridDateTime}>
                                            <input className={styles.input} type="date" value={s.endDate} onChange={e => {const u=[...sessions]; u[i].endDate=e.target.value; setSessions(u)}} />
                                            <input className={styles.input} type="time" value={s.endTime} onChange={e => {const u=[...sessions]; u[i].endTime=e.target.value; setSessions(u)}} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={handleAddSession} className={styles.addBtnSmall}><FaPlus /> Adicionar Sessão</button>
                        <div className={styles.divider}></div>
                        <div className={styles.inputGroupFull}>
                            <label className={styles.label}>Local do Evento</label>
                            <div className={styles.inputWrapper}>
                                <FaMapMarkerAlt className={styles.inputIcon} />
                                <input className={styles.input} value={locationName} onChange={e => setLocationName(e.target.value)} required />
                            </div>
                        </div>
                        <div className={styles.gridAddressTop}>
                            <div className={styles.inputGroup}><label className={styles.label}>CEP</label><input className={styles.input} value={addressZipCode} onChange={e => handleZipCodeChange(e.target.value)} /></div>
                            <div className={styles.inputGroup}><label className={styles.label}>Cidade</label><input className={styles.input} value={addressCity} onChange={e => setAddressCity(e.target.value)} required /></div>
                            <div className={styles.inputGroup}><label className={styles.label}>UF</label><input className={styles.input} value={addressState} onChange={e => setAddressState(e.target.value)} maxLength={2} /></div>
                        </div>
                    </section>

                    {/* SEÇÃO 3: INGRESSOS */}
                    <section className={styles.card}>
                        <div className={styles.cardHeader}><div className={styles.iconWrapper}><FaTicketAlt /></div><h3>Gestão de Ingressos</h3></div>
                        
                        <div className={styles.infoSwitchContainer}>
                            <label className={styles.switch}>
                                <input className={styles.hiddenCheckbox} type="checkbox" checked={isInformational} onChange={e => setIsInformational(e.target.checked)} />
                                <span className={styles.slider}></span>
                            </label>
                            <div>
                                <strong>Evento Informativo</strong>
                                <p>Ative para ocultar a venda de ingressos (divulgação apenas).</p>
                            </div>
                        </div>

                        {!isInformational && (
                            <div className={styles.ticketsContainer}>
                                {ticketTypes.map((type, ti) => (
                                    <div key={ti} className={styles.ticketTypeCard}>
                                        <div className={styles.ticketTypeHeader}>
                                            <div className={styles.inputGroup} style={{flex: 3}}>
                                                <label className={styles.label}>Nome do Ingresso</label>
                                                <input className={styles.input} value={type.name} onChange={e => {const u=[...ticketTypes]; u[ti].name=e.target.value; setTicketTypes(u)}} required />
                                            </div>
                                            <div className={styles.inputGroup} style={{flex: 1}}>
                                                <label className={styles.label}>Categoria</label>
                                                <select className={styles.select} value={type.category} onChange={e => {const u=[...ticketTypes]; u[ti].category=e.target.value; setTicketTypes(u)}}>
                                                    <option>Inteira</option><option>Meia</option><option>VIP</option><option>Cortesia</option>
                                                </select>
                                            </div>
                                            <button type="button" onClick={() => handleRemoveTicketType(ti)} className={styles.trashBtn}><FaTrashAlt /></button>
                                        </div>

                                        {type.batches.map((b, bi) => (
                                            <div key={bi} className={styles.batchRow}>
                                                <div className={styles.inputGroup} style={{flex: 1}}><input className={styles.inputSmall} value={b.name} disabled /></div>
                                                <div className={styles.inputGroup} style={{flex: 1}}>
                                                    <div className={styles.inputWrapper}><span className={styles.currencyPrefix}>R$</span>
                                                        <input className={styles.inputSmall} type="number" value={b.price} onChange={e => {const u=[...ticketTypes]; u[ti].batches[bi].price=e.target.value; setTicketTypes(u)}} required />
                                                    </div>
                                                </div>
                                                <div className={styles.inputGroup} style={{flex: 1}}>
                                                    <input className={styles.inputSmall} type="number" value={b.quantity} onChange={e => {const u=[...ticketTypes]; u[ti].batches[bi].quantity=e.target.value; setTicketTypes(u)}} placeholder="Qtd" required />
                                                </div>
                                            </div>
                                        ))}
                                        <button type="button" onClick={() => handleAddBatch(ti)} className={styles.addBatchBtn}><FaPlus /> Novo Lote</button>
                                    </div>
                                ))}
                                <button type="button" onClick={handleAddTicketType} className={styles.addBtnFull}><FaPlus /> Criar Novo Tipo de Ingresso</button>
                            </div>
                        )}
                    </section>

                    {/* SEÇÃO 4: DESTAQUE */}
                    <section className={styles.card}>
                        <div className={styles.cardHeader}><div className={styles.iconWrapper}><FaStar /></div><h3>Destaque e Promoção</h3></div>
                        <div style={{padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px'}}>
                            
                            <div onClick={() => setHighlightTier(null)} className={`${styles.highlightCard} ${highlightTier === null ? styles.active : ''}`}>
                                <div style={{display:'flex', justifyContent:'space-between'}}><strong>Básico</strong>{highlightTier === null ? <FaCheckCircle color="#4C01B5"/> : <FaRegCircle color="#cbd5e1"/>}</div>
                                <p>Sem destaque. Gratuito.</p>
                            </div>

                            <div onClick={() => setHighlightTier('STANDARD')} className={`${styles.highlightCard} ${highlightTier === 'STANDARD' ? styles.activeStandard : ''}`}>
                                <div style={{display:'flex', justifyContent:'space-between'}}><strong>Standard</strong>{highlightTier === 'STANDARD' ? <FaCheckCircle color="#4C01B5"/> : <FaRegCircle color="#cbd5e1"/>}</div>
                                <div style={{marginTop: '10px'}}>
                                    <label style={{fontSize: '0.8rem', fontWeight: 'bold'}}>Tempo: {highlightDays} dias</label>
                                    <input type="range" min="1" max="45" value={highlightDays} onChange={e => setHighlightDays(parseInt(e.target.value))} style={{width: '100%', accentColor: '#4C01B5'}} onClick={e => e.stopPropagation()} />
                                    <strong style={{display: 'block', marginTop: '5px'}}>R$ {(highlightDays * prices.standardPrice).toFixed(2)}</strong>
                                </div>
                            </div>

                            <div onClick={() => setHighlightTier('PREMIUM')} className={`${styles.highlightCard} ${highlightTier === 'PREMIUM' ? styles.activePremium : ''}`}>
                                <div style={{display:'flex', justifyContent:'space-between'}}><strong>Premium</strong>{highlightTier === 'PREMIUM' ? <FaCheckCircle color="#F59E0B"/> : <FaRegCircle color="#cbd5e1"/>}</div>
                                <h4 style={{fontSize: '1.2rem', margin: '10px 0'}}>R$ {prices.premiumPrice.toFixed(2)}</h4>
                                <p style={{fontSize: '0.75rem'}}>Válido até o evento! Máxima visibilidade.</p>
                            </div>
                        </div>
                    </section>

                    {/* SEÇÃO 5: ORGANIZADOR */}
                    <section className={styles.card}>
                        <div className={styles.cardHeader}><div className={styles.iconWrapper}><FaInstagram /></div><h3>Dados do Organizador</h3></div>
                        <div className={styles.gridTwo}>
                            <div className={styles.inputGroup}><label className={styles.label}>Exibir Nome Como</label><input className={styles.input} value={organizerName} onChange={e => setOrganizerName(e.target.value)} /></div>
                            <div className={styles.inputGroup}><label className={styles.label}>Instagram (@)</label><input className={styles.input} value={organizerInstagram} onChange={e => setOrganizerInstagram(e.target.value)} /></div>
                        </div>
                    </section>

                    <button type="submit" className={styles.submitButton} disabled={saving}>
                        {saving ? 'Processando...' : <><FaSave /> SALVAR ALTERAÇÕES</>}
                    </button>
                </form>
            </main>
            <Footer />
        </div>
    );
};

export default EditarEvento;