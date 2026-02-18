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
    FaClipboardList, FaClock, FaUserLock, FaCheckCircle, FaRegCircle, FaBolt, FaInfoCircle
} from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast'; 

const getApiBaseUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
};

const FormSkeleton = () => (
    <div className={styles.pageWrapper}>
        <Header />
        <main className={styles.mainContent}>
            <div className={styles.pageHeader}>
                <div className={`${styles.skSubtitle} ${styles.skeletonPulse}`} style={{width: '120px'}}></div>
                <div className={`${styles.skTitle} ${styles.skeletonPulse}`} style={{width: '400px', height: '45px', marginTop: '15px'}}></div>
            </div>
            <div className={styles.formContainer}>
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className={styles.skCard}></div>
                ))}
            </div>
        </main>
        <Footer />
    </div>
);

const EditarEvento = () => {
    const router = useRouter();
    const params = useParams();
    const eventId = params?.id;
    const API_BASE_URL = getApiBaseUrl();

    // --- ESTADOS ---
    const [loadingData, setLoadingData] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [ageRating, setAgeRating] = useState('Livre');
    const [imageFile, setImageFile] = useState(null); 
    const [imagePreview, setImagePreview] = useState(''); 
    const [refundPolicy, setRefundPolicy] = useState('');
    const [sessions, setSessions] = useState([]);
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

    // Destaque
    const [highlightTier, setHighlightTier] = useState(null); 
    const [highlightDays, setHighlightDays] = useState(7);
    const [prices, setPrices] = useState({ standardPrice: 2, premiumPrice: 100 });

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

    // --- CARREGAR DADOS ---
    useEffect(() => {
        const fetchAll = async () => {
            if (!eventId) return;
            const token = localStorage.getItem('userToken')?.replace(/"/g, '');

            try {
                const [priceRes, eventRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/config/prices`),
                    fetch(`${API_BASE_URL}/events/${eventId}`)
                ]);

                if (priceRes.ok) setPrices(await priceRes.json());
                
                if (eventRes.ok) {
                    const data = await eventRes.json();
                    setTitle(data.title || '');
                    setDescription(data.description || '');
                    setCategory(data.category || '');
                    setAgeRating(data.ageRating || 'Livre');
                    setImagePreview(data.imageUrl || '');
                    setRefundPolicy(data.refundPolicy || '');
                    setIsInformational(data.isInformational || false);
                    setHighlightTier(data.highlightTier || null);
                    setHighlightDays(data.highlightDuration || 7);

                    if (data.sessions) {
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

                    const org = data.organizerInfo || {};
                    setOrganizerName(org.name || '');
                    setOrganizerInstagram(org.instagram || '');
                    setCustomQuestions(data.formSchema || []);

                    // Reconstrução de Ingressos/Lotes
                    const rawTickets = data.ticketTypes || [];
                    const grouped = {};
                    rawTickets.forEach(t => {
                        const key = `${t.name}-${t.category}`;
                        if (!grouped[key]) {
                            grouped[key] = {
                                name: t.name, category: t.category, isHalfPrice: t.isHalfPrice,
                                maxPerUser: t.maxPerUser, hasSchedule: !!t.activityDate,
                                activityDate: t.activityDate ? formatDateForInput(t.activityDate) : '',
                                startTime: t.startTime || '', endTime: t.endTime || '',
                                batches: []
                            };
                        }
                        grouped[key].batches.push({ id: t.id, name: t.batchName, price: t.price, quantity: t.quantity });
                    });
                    setTicketTypes(Object.values(grouped));
                }
            } catch (err) {
                toast.error("Erro ao carregar o evento.");
            } finally {
                setLoadingData(false);
            }
        };
        fetchAll();
    }, [eventId, API_BASE_URL]);

    // --- MANIPULAÇÃO ---
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleAddTicketType = () => {
        setTicketTypes([...ticketTypes, { 
            name: '', category: 'Inteira', isHalfPrice: false, hasSchedule: false, maxPerUser: 4, 
            batches: [{ name: '1º Lote', price: '', quantity: '' }] 
        }]);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setSaving(true);
        const token = localStorage.getItem('userToken')?.replace(/"/g, '');

        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('category', category);
        formData.append('ageRating', ageRating);
        formData.append('refundPolicy', refundPolicy);
        formData.append('isInformational', isInformational);
        if (imageFile) formData.append('image', imageFile);

        const formattedSessions = sessions.map(s => ({
            date: new Date(`${s.date}T${s.time}`).toISOString(),
            endDate: s.endDate ? new Date(`${s.endDate}T${s.endTime}`).toISOString() : null
        }));
        formData.append('sessions', JSON.stringify(formattedSessions));
        formData.append('date', formattedSessions[0].date);

        formData.append('location', locationName);
        formData.append('city', addressCity);
        formData.append('address', JSON.stringify({ street: addressStreet, number: addressNumber, district: addressDistrict, state: addressState, zipCode: addressZipCode }));

        const flatTickets = [];
        if (!isInformational) {
            ticketTypes.forEach(type => {
                type.batches.forEach(batch => {
                    flatTickets.push({ ...type, batch: batch.name, price: parseFloat(batch.price), quantity: parseInt(batch.quantity), batches: undefined });
                });
            });
        }
        formData.append('tickets', JSON.stringify(flatTickets));

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
                toast.success("Evento salvo com sucesso!");
                router.push('/dashboard');
            } else {
                toast.error("Erro ao salvar alterações.");
            }
        } catch (e) {
            toast.error("Erro de conexão.");
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
                    <p>Refine os detalhes e publique as atualizações para seus participantes.</p>
                </div>

                <form onSubmit={handleUpdate} className={styles.formContainer}>
                    
                    {/* CARD: PRINCIPAL */}
                    <section className={styles.card}>
                        <div className={styles.cardHeader}>
                            <div className={styles.iconWrapper}><FaImage /></div>
                            <h3>Capa e Informações Básicas</h3>
                        </div>
                        
                        <div className={styles.uploadSection}>
                            <div className={styles.uploadBox} onClick={() => document.getElementById('editImg').click()}>
                                {imagePreview ? <img src={imagePreview} className={styles.imagePreview} /> : <FaPlus />}
                                <div className={styles.imageOverlay}>Alterar Capa</div>
                            </div>
                            <input type="file" id="editImg" hidden onChange={handleImageUpload} />
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
                                <label className={styles.label}>Descrição Detalhada</label>
                                <textarea className={styles.textarea} value={description} onChange={e => setDescription(e.target.value)} required />
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Categoria</label>
                                <select className={styles.select} value={category} onChange={e => setCategory(e.target.value)}>
                                    <option>Festas e Shows</option>
                                    <option>Acadêmico / Congresso</option>
                                    <option>Teatro e Cultura</option>
                                    <option>Esportes</option>
                                </select>
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Classificação Etária</label>
                                <select className={styles.select} value={ageRating} onChange={e => setAgeRating(e.target.value)}>
                                    <option>Livre</option><option>12+</option><option>14+</option><option>16+</option><option>18+</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* CARD: DATAS */}
                    <section className={styles.card}>
                        <div className={styles.cardHeader}>
                            <div className={styles.iconWrapper}><FaCalendarAlt /></div>
                            <h3>Agenda do Evento</h3>
                        </div>
                        {sessions.map((s, i) => (
                            <div key={i} className={styles.sessionCard}>
                                <div className={styles.sessionHeader}>
                                    <h4>Sessão #{i+1}</h4>
                                    {sessions.length > 1 && <button type="button" onClick={() => handleRemoveSession(i)} className={styles.trashBtn}><FaTrashAlt /></button>}
                                </div>
                                <div className={styles.gridTwo}>
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>Data de Início</label>
                                        <div className={styles.gridDateTime}>
                                            <input className={styles.input} type="date" value={s.date} onChange={e => {const u=[...sessions]; u[i].date=e.target.value; setSessions(u)}} required />
                                            <input className={styles.input} type="time" value={s.time} onChange={e => {const u=[...sessions]; u[i].time=e.target.value; setSessions(u)}} required />
                                        </div>
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>Data de Término</label>
                                        <div className={styles.gridDateTime}>
                                            <input className={styles.input} type="date" value={s.endDate} onChange={e => {const u=[...sessions]; u[i].endDate=e.target.value; setSessions(u)}} />
                                            <input className={styles.input} type="time" value={s.endTime} onChange={e => {const u=[...sessions]; u[i].endTime=e.target.value; setSessions(u)}} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={handleAddSession} className={styles.addBtnSmall}><FaPlus /> Adicionar Nova Data</button>
                        <div className={styles.divider}></div>
                        <div className={styles.inputGroupFull}>
                            <label className={styles.label}>Nome do Local</label>
                            <div className={styles.inputWrapper}>
                                <FaMapMarkerAlt className={styles.inputIcon} />
                                <input className={styles.input} value={locationName} onChange={e => setLocationName(e.target.value)} required />
                            </div>
                        </div>
                        <div className={styles.gridAddressTop}>
                            <div className={styles.inputGroup}><label className={styles.label}>CEP</label><input className={styles.input} value={addressZipCode} onChange={e => handleZipCodeChange(e.target.value)} /></div>
                            <div className={styles.inputGroup}><label className={styles.label}>Cidade</label><input className={styles.input} value={addressCity} onChange={e => setAddressCity(e.target.value)} required /></div>
                            <div className={styles.inputGroup}><label className={styles.label}>UF</label><input className={styles.input} value={addressState} onChange={e => setAddressState(e.target.value.toUpperCase())} maxLength={2} /></div>
                        </div>
                    </section>

                    {/* CARD: INGRESSOS */}
                    <section className={styles.card}>
                        <div className={styles.cardHeader}><div className={styles.iconWrapper}><FaTicketAlt /></div><h3>Gestão de Ingressos</h3></div>
                        
                        <div className={styles.infoSwitchContainer}>
                            <label className={styles.switch}>
                                <input className={styles.hiddenCheckbox} type="checkbox" checked={isInformational} onChange={e => setIsInformational(e.target.checked)} />
                                <span className={styles.slider}></span>
                            </label>
                            <div className={styles.switchText}>
                                <strong>Evento Apenas Informativo</strong>
                                <p>Marque esta opção se o evento não possuir venda de ingressos ou inscrições na plataforma.</p>
                            </div>
                        </div>

                        {!isInformational && (
                            <div className={styles.ticketsContainer}>
                                {ticketTypes.map((type, ti) => (
                                    <div key={ti} className={styles.ticketTypeCard}>
                                        <div className={styles.ticketTypeHeader}>
                                            <div className={styles.inputGroup} style={{flex: 3}}>
                                                <label className={styles.label}>Nome do Setor / Ingresso</label>
                                                <input className={styles.input} value={type.name} onChange={e => {const u=[...ticketTypes]; u[ti].name=e.target.value; setTicketTypes(u)}} required />
                                            </div>
                                            <div className={styles.inputGroup} style={{flex: 1}}>
                                                <label className={styles.label}>Tipo</label>
                                                <select className={styles.select} value={type.category} onChange={e => {const u=[...ticketTypes]; u[ti].category=e.target.value; setTicketTypes(u)}}>
                                                    <option>Inteira</option><option>Meia</option><option>VIP</option><option>Cortesia</option>
                                                </select>
                                            </div>
                                            <button type="button" onClick={() => handleRemoveTicketType(ti)} className={styles.trashBtn} style={{marginTop: '28px'}}><FaTrashAlt /></button>
                                        </div>

                                        <div className={styles.batchesContainer}>
                                            <h4 className={styles.batchTitle}>Lotes Ativos</h4>
                                            {type.batches.map((b, bi) => (
                                                <div key={bi} className={styles.batchRow}>
                                                    <input className={styles.inputSmall} value={b.name} disabled />
                                                    <div className={styles.inputWrapper}>
                                                        <span className={styles.currencyPrefix}>R$</span>
                                                        <input className={styles.inputSmall} type="number" value={b.price} onChange={e => {const u=[...ticketTypes]; u[ti].batches[bi].price=e.target.value; setTicketTypes(u)}} required />
                                                    </div>
                                                    <input className={styles.inputSmall} type="number" value={b.quantity} onChange={e => {const u=[...ticketTypes]; u[ti].batches[bi].quantity=e.target.value; setTicketTypes(u)}} placeholder="Qtd" required />
                                                </div>
                                            ))}
                                            <button type="button" onClick={() => {const u=[...ticketTypes]; u[ti].batches.push({name: `${u[ti].batches.length+1}º Lote`, price:'', quantity:''}); setTicketTypes(u)}} className={styles.addBatchBtn}><FaPlus /> Novo Lote</button>
                                        </div>
                                    </div>
                                ))}
                                <button type="button" onClick={handleAddTicketType} className={styles.addBtnFull}><FaPlus /> Criar Novo Tipo de Ingresso</button>
                            </div>
                        )}
                    </section>

                    {/* CARD: FORMULÁRIO */}
                    {!isInformational && (
                        <section className={styles.card}>
                            <div className={styles.cardHeader}><div className={styles.iconWrapper}><FaClipboardList /></div><h3>Dados do Participante</h3></div>
                            <div className={styles.questionList}>
                                {customQuestions.map((q, idx) => (
                                    <div key={idx} className={styles.questionCard}>
                                        <div className={styles.questionRow}>
                                            <div className={styles.inputGroup}><label className={styles.label}>Pergunta</label><input className={styles.input} value={q.label} onChange={e => {const u=[...customQuestions]; u[idx].label=e.target.value; setCustomQuestions(u)}} required /></div>
                                            <div className={styles.inputGroup}><label className={styles.label}>Tipo</label><select className={styles.select} value={q.type} onChange={e => {const u=[...customQuestions]; u[idx].type=e.target.value; setCustomQuestions(u)}}><option value="text">Texto</option><option value="select">Escolha</option><option value="checkbox">Sim/Não</option></select></div>
                                        </div>
                                        <div className={styles.questionFooter}>
                                            <label className={styles.switchLabel}><input className={styles.checkbox} type="checkbox" checked={q.required} onChange={e => {const u=[...customQuestions]; u[idx].required=e.target.checked; setCustomQuestions(u)}} /> Obrigatório</label>
                                            <button type="button" onClick={() => setCustomQuestions(customQuestions.filter((_, i)=> i !== idx))} className={styles.deleteQuestionBtn}><FaTrashAlt /> Remover</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button type="button" onClick={handleAddQuestion} className={styles.addQuestionBtn}><FaPlus /> Nova Pergunta no Formulário</button>
                        </section>
                    )}

                    {/* CARD: DESTAQUE (UX DE TRÁFEGO PAGO) */}
                    <section className={styles.card}>
                        <div className={styles.cardHeader}><div className={styles.iconWrapper}><FaStar /></div><h3>Potencialize sua Visibilidade</h3></div>
                        <div className={styles.highlightGrid}>
                            
                            <div onClick={() => setHighlightTier(null)} className={`${styles.highlightCard} ${highlightTier === null ? styles.active : ''}`}>
                                <div className={styles.highlightHeader}><strong>Plano Básico</strong>{highlightTier === null ? <FaCheckCircle color="var(--primary-purple)"/> : <FaRegCircle color="#cbd5e1"/>}</div>
                                <p>Publicação padrão na listagem. Ideal para eventos pequenos.</p>
                                <span className={styles.priceTag}>Grátis</span>
                            </div>

                            <div onClick={() => setHighlightTier('STANDARD')} className={`${styles.highlightCard} ${highlightTier === 'STANDARD' ? styles.activeStandard : ''}`}>
                                <div className={styles.highlightHeader}><strong>Standard (Diário)</strong>{highlightTier === 'STANDARD' ? <FaCheckCircle color="var(--primary-purple)"/> : <FaRegCircle color="#cbd5e1"/>}</div>
                                <div className={styles.trafficSelector}>
                                    <label>Duração do Tráfego: <strong>{highlightDays} dias</strong></label>
                                    <input type="range" min="1" max="45" value={highlightDays} onChange={e => setHighlightDays(parseInt(e.target.value))} onClick={e => e.stopPropagation()} />
                                    <div className={styles.totalPrice}>Total: R$ {(highlightDays * prices.standardPrice).toFixed(2)}</div>
                                    <small>R$ {prices.standardPrice.toFixed(2)} / dia</small>
                                </div>
                            </div>

                            <div onClick={() => setHighlightTier('PREMIUM')} className={`${styles.highlightCard} ${highlightTier === 'PREMIUM' ? styles.activePremium : ''}`}>
                                <div className={styles.highlightHeader}><strong>Premium (Até o Evento)</strong>{highlightTier === 'PREMIUM' ? <FaCheckCircle color="#f59e0b"/> : <FaRegCircle color="#cbd5e1"/>}</div>
                                <p>Exposição máxima no Banner Principal e Topo da Home.</p>
                                <span className={styles.priceTag}>R$ {prices.premiumPrice.toFixed(2)}</span>
                            </div>

                        </div>
                    </section>

                    <button type="submit" className={styles.submitButton} disabled={saving}>
                        {saving ? 'SALVANDO ALTERAÇÕES...' : <><FaSave /> SALVAR TODAS AS ATUALIZAÇÕES</>}
                    </button>
                </form>
            </main>
            <Footer />
        </div>
    );
};

export default EditarEvento;