'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import styles from '../../../admin/new/CadastroEvento.module.css';
import { 
    FaImage, FaInstagram, FaPlus, FaTrashAlt, 
    FaTicketAlt, FaCalendarAlt, FaMapMarkerAlt,
    FaAlignLeft, FaLayerGroup, FaArrowLeft, FaSave, FaStar
} from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast'; 

const getApiBaseUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
    if (typeof window === 'undefined') return 'http://localhost:5000/api';
    return `${window.location.protocol}//${window.location.hostname}:5000/api`;
};

const EditarEvento = () => {
    const router = useRouter();
    const params = useParams();
    const eventId = params?.id;
    const API_BASE_URL = getApiBaseUrl();

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
    
    const [ticketTypes, setTicketTypes] = useState([]);
    const [isFeaturedRequested, setIsFeaturedRequested] = useState(false);

    useEffect(() => {
        const fetchEvent = async () => {
            if (!eventId) return;
            try {
                const res = await fetch(`${API_BASE_URL}/events/${eventId}`);
                if (!res.ok) throw new Error("Erro ao buscar evento");
                const data = await res.json();

                setTitle(data.title);
                setDescription(data.description);
                setCategory(data.category);
                setAgeRating(data.classificacaoEtaria || data.ageRating || 'Livre');
                setImagePreview(data.imageUrl); 
                setRefundPolicy(data.refundPolicy);
                setIsFeaturedRequested(data.isFeaturedRequested || false);
                
                let sessionData = [];
                if (data.sessions) {
                    sessionData = typeof data.sessions === 'string' ? JSON.parse(data.sessions) : data.sessions;
                }
                const formattedSessions = sessionData.map(s => {
                    const d = new Date(s.date);
                    const endD = s.endDate ? new Date(s.endDate) : null;
                    return {
                        date: !isNaN(d) ? d.toISOString().split('T')[0] : '',
                        time: !isNaN(d) ? d.toTimeString().slice(0, 5) : '',
                        endDate: endD && !isNaN(endD) ? endD.toISOString().split('T')[0] : '',
                        endTime: endD && !isNaN(endD) ? endD.toTimeString().slice(0, 5) : ''
                    };
                });
                
                if (formattedSessions.length === 0 && data.eventDate) {
                    const d = new Date(data.eventDate);
                    formattedSessions.push({
                        date: !isNaN(d) ? d.toISOString().split('T')[0] : '',
                        time: !isNaN(d) ? d.toTimeString().slice(0, 5) : '',
                        endDate: '', endTime: ''
                    });
                }
                setSessions(formattedSessions);

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
                
                let orgInfo = {};
                if (data.organizerInfo) {
                    orgInfo = typeof data.organizerInfo === 'string' ? JSON.parse(data.organizerInfo) : data.organizerInfo;
                } else if (data.organizer) {
                    orgInfo = data.organizer;
                }
                setOrganizerName(orgInfo.name || '');
                setOrganizerInstagram(orgInfo.instagram || '');

                const rawTickets = data.tickets || data.ticketTypes || [];
                const groupedTickets = {};
                
                rawTickets.forEach(t => {
                    const key = `${t.name}-${t.category}`;
                    if (!groupedTickets[key]) {
                        groupedTickets[key] = {
                            name: t.name,
                            category: t.category,
                            isHalfPrice: t.isHalfPrice,
                            batches: []
                        };
                    }
                    groupedTickets[key].batches.push({
                        id: t.id || t._id, 
                        name: t.batch,
                        price: t.price,
                        quantity: t.quantity
                    });
                });
                
                if (Object.keys(groupedTickets).length === 0) {
                    setTicketTypes([{ name: '', category: 'Inteira', isHalfPrice: false, batches: [{ name: '1º Lote', price: '', quantity: '' }] }]);
                } else {
                    setTicketTypes(Object.values(groupedTickets));
                }

            } catch (error) {
                console.error(error);
                toast.error("Erro ao carregar dados.");
            } finally {
                setLoadingData(false);
            }
        };
        fetchEvent();
    }, [eventId, API_BASE_URL]);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) return toast.error('A imagem não pode exceder 5MB.');
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleAddSession = () => setSessions([...sessions, { date: '', time: '', endDate: '', endTime: '' }]);
    const handleRemoveSession = (index) => {
        if (sessions.length === 1) return toast.error("Mantenha pelo menos uma data.");
        setSessions(sessions.filter((_, i) => i !== index));
    };
    const handleChangeSession = (index, field, value) => {
        const updated = [...sessions];
        updated[index][field] = value;
        setSessions(updated);
    };

    const handleAddTicketType = () => {
        setTicketTypes([...ticketTypes, { 
            name: '', category: 'Inteira', isHalfPrice: false,
            batches: [{ name: '1º Lote', price: '', quantity: '' }]
        }]);
    };

    const handleRemoveTicketType = (index) => {
        if (ticketTypes.length === 1) return toast.error("Mínimo de 1 tipo de ingresso.");
        setTicketTypes(ticketTypes.filter((_, i) => i !== index));
    };

    const handleChangeTicketType = (index, field, value) => {
        const updated = [...ticketTypes];
        updated[index][field] = value;
        setTicketTypes(updated);
    };

    const handleAddBatch = (typeIndex) => {
        const updated = [...ticketTypes];
        const nextBatchNum = updated[typeIndex].batches.length + 1;
        updated[typeIndex].batches.push({ name: `${nextBatchNum}º Lote`, price: '', quantity: '' });
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

    const handleUpdate = async (e) => {
        e.preventDefault();
        setSaving(true);
        const token = localStorage.getItem('userToken');
        if (!token) return router.push('/login');

        if (sessions.some(s => !s.date || !s.time)) {
            setSaving(false); return toast.error('Preencha data e hora das sessões.');
        }

        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('category', category);
        formData.append('ageRating', ageRating);
        formData.append('refundPolicy', refundPolicy);
        formData.append('isFeaturedRequested', isFeaturedRequested);
        
        if (imageFile) formData.append('image', imageFile);

        const formattedSessions = sessions.map(session => {
            const d = new Date(`${session.date}T${session.time}`);
            const sessionObj = { date: d.toISOString() };
            if (session.endDate && session.endTime) {
                sessionObj.endDate = new Date(`${session.endDate}T${session.endTime}`).toISOString();
            }
            return sessionObj;
        });
        
        formData.append('sessions', JSON.stringify(formattedSessions));
        if (formattedSessions.length > 0) formData.append('eventDate', formattedSessions[0].date);

        formData.append('location', locationName);
        formData.append('city', addressCity);
        formData.append('address', JSON.stringify({
            street: addressStreet, number: addressNumber, district: addressDistrict,
            city: addressCity, state: addressState, zipCode: addressZipCode
        }));

        const flatTickets = [];
        ticketTypes.forEach(type => {
            type.batches.forEach(batch => {
                flatTickets.push({
                    id: batch.id, 
                    name: type.name,
                    category: type.category,
                    isHalfPrice: type.isHalfPrice,
                    batch: batch.name,
                    price: parseFloat(batch.price),
                    quantity: parseInt(batch.quantity),
                    description: type.name + ' - ' + batch.name 
                });
            });
        });
        formData.append('tickets', JSON.stringify(flatTickets));
        
        formData.append('organizerInfo', JSON.stringify({ name: organizerName, instagram: organizerInstagram }));

        try {
            const res = await fetch(`${API_BASE_URL}/events/${eventId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                toast.success("Evento atualizado com sucesso!");
                setTimeout(() => router.push('/dashboard'), 1500);
            } else {
                const err = await res.json();
                toast.error(err.message || "Erro ao atualizar.");
            }
        } catch (error) {
            toast.error("Erro de conexão.");
        } finally {
            setSaving(false);
        }
    };

    if (loadingData) return <div style={{height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'#666'}}>Carregando editor...</div>;

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
                    <p>Atualize as informações do seu evento.</p>
                </div>

                <form onSubmit={handleUpdate} className={styles.formContainer}>
                    
                    <section className={styles.card}>
                        <div className={styles.cardHeader}>
                            <div className={styles.iconWrapper}><FaImage /></div>
                            <h3>Informações Principais</h3>
                        </div>
                        <div className={styles.uploadSection}>
                            <div className={styles.uploadBox} onClick={() => document.getElementById('editImage').click()}>
                                {imagePreview ? <img src={imagePreview} className={styles.imagePreview} alt="Preview" /> : <div className={styles.uploadPlaceholder}><FaImage size={48} /><span>Alterar Capa</span></div>}
                            </div>
                            <input type="file" id="editImage" accept="image/*" onChange={handleImageUpload} hidden />
                        </div>
                        <div className={styles.gridTwo}>
                            <div className={styles.inputGroupFull} style={{gridColumn: 'span 2'}}>
                                <label className={styles.label}>Nome do Evento</label>
                                <div className={styles.inputWrapper}><FaAlignLeft className={styles.inputIcon} /><input className={styles.input} type="text" value={title} onChange={e => setTitle(e.target.value)} required /></div>
                            </div>
                            <div className={styles.inputGroupFull} style={{gridColumn: 'span 2'}}>
                                <label className={styles.label}>Descrição</label>
                                <textarea className={styles.textarea} value={description} onChange={e => setDescription(e.target.value)} required />
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Categoria</label>
                                <div className={styles.inputWrapper}><FaLayerGroup className={styles.inputIcon} /><select className={styles.select} value={category} onChange={e => setCategory(e.target.value)}><option value="" disabled>Selecione...</option><option>Música e entretenimento</option><option>Esportes e Lazer</option><option>Teatro</option><option>Infantil</option><option>Educação e Negócios</option><option>Religiosos</option></select></div>
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Classificação</label>
                                <select className={styles.select} value={ageRating} onChange={e => setAgeRating(e.target.value)}><option>Livre</option><option>12+</option><option>14+</option><option>16+</option><option>18+</option></select>
                            </div>
                        </div>
                    </section>

                    <section className={styles.card}>
                        <div className={styles.cardHeader}>
                            <div className={styles.iconWrapper}><FaCalendarAlt /></div>
                            <h3>Data e Localização</h3>
                        </div>
                        {sessions.map((session, index) => (
                            <div key={index} className={styles.sessionCard}>
                                <div className={styles.sessionHeader}>
                                    <h4>Data #{index + 1}</h4>
                                    {sessions.length > 1 && <button type="button" onClick={() => handleRemoveSession(index)} className={styles.trashBtn}><FaTrashAlt /></button>}
                                </div>
                                <div className={styles.gridTwo}>
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>Início</label>
                                        <div className={styles.gridDateTime}>
                                            <input className={styles.input} type="date" value={session.date} onChange={e => handleChangeSession(index, 'date', e.target.value)} required />
                                            <input className={styles.input} type="time" value={session.time} onChange={e => handleChangeSession(index, 'time', e.target.value)} required />
                                        </div>
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>Término</label>
                                        <div className={styles.gridDateTime}>
                                            <input className={styles.input} type="date" value={session.endDate} onChange={e => handleChangeSession(index, 'endDate', e.target.value)} />
                                            <input className={styles.input} type="time" value={session.endTime} onChange={e => handleChangeSession(index, 'endTime', e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={handleAddSession} className={styles.addBtnSmall}><FaPlus /> Adicionar outra data</button>
                        <div className={styles.divider}></div>
                        <div className={styles.inputGroupFull}>
                            <label className={styles.label}>Nome do Local</label>
                            <div className={styles.inputWrapper}><FaMapMarkerAlt className={styles.inputIcon} /><input className={styles.input} type="text" value={locationName} onChange={e => setLocationName(e.target.value)} required /></div>
                        </div>
                        <div className={styles.gridAddressTop}>
                            <div className={styles.inputGroup}><label className={styles.label}>CEP</label><input className={styles.input} type="text" value={addressZipCode} onChange={e => setAddressZipCode(e.target.value)} /></div>
                            <div className={styles.inputGroup}><label className={styles.label}>Cidade</label><input className={styles.input} type="text" value={addressCity} onChange={e => setAddressCity(e.target.value)} required /></div>
                            <div className={styles.inputGroup}><label className={styles.label}>UF</label><input className={styles.input} type="text" value={addressState} onChange={e => setAddressState(e.target.value)} /></div>
                        </div>
                        <div className={styles.gridAddressStreet}>
                            <div className={styles.inputGroup}><label className={styles.label}>Rua</label><input className={styles.input} type="text" value={addressStreet} onChange={e => setAddressStreet(e.target.value)} /></div>
                            <div className={styles.inputGroup}><label className={styles.label}>Número</label><input className={styles.input} type="text" value={addressNumber} onChange={e => setAddressNumber(e.target.value)} /></div>
                        </div>
                    </section>

                    <section className={styles.card}>
                        <div className={styles.cardHeader}>
                            <div className={styles.iconWrapper}><FaTicketAlt /></div>
                            <h3>Ingressos</h3>
                        </div>
                        <div className={styles.ticketsContainer}>
                            {ticketTypes.map((type, typeIdx) => (
                                <div key={typeIdx} className={styles.ticketTypeCard}>
                                    <div className={styles.ticketTypeHeader}>
                                        <div className={styles.inputGroup} style={{flex: 2}}>
                                            <label className={styles.label}>Nome do Ingresso</label>
                                            <input className={styles.input} type="text" value={type.name} onChange={e => handleChangeTicketType(typeIdx, 'name', e.target.value)} placeholder="Ex: Pista" required />
                                        </div>
                                        <div className={styles.inputGroup} style={{flex: 1}}>
                                            <label className={styles.label}>Categoria</label>
                                            <select className={styles.select} value={type.category} onChange={e => handleChangeTicketType(typeIdx, 'category', e.target.value)}><option>Inteira</option><option>Meia</option><option>VIP</option><option>Cortesia</option></select>
                                        </div>
                                        {ticketTypes.length > 1 && <button type="button" onClick={() => handleRemoveTicketType(typeIdx)} className={styles.trashBtn}><FaTrashAlt /></button>}
                                    </div>
                                    <div className={styles.batchesContainer}>
                                        <h4 className={styles.batchTitle}>Lotes deste ingresso:</h4>
                                        {type.batches.map((batch, batchIdx) => (
                                            <div key={batchIdx} className={styles.batchRow}>
                                                <div className={styles.inputGroup}>
                                                    <input className={styles.inputSmall} type="text" value={batch.name} onChange={e => handleChangeBatch(typeIdx, batchIdx, 'name', e.target.value)} placeholder="Lote" />
                                                </div>
                                                <div className={styles.inputGroup}>
                                                    <div className={styles.inputWrapper}><span className={styles.currencyPrefix}>R$</span><input className={styles.inputSmall} type="number" value={batch.price} onChange={e => handleChangeBatch(typeIdx, batchIdx, 'price', e.target.value)} placeholder="0,00" min="0" step="0.01" required /></div>
                                                </div>
                                                <div className={styles.inputGroup}>
                                                    <input className={styles.inputSmall} type="number" value={batch.quantity} onChange={e => handleChangeBatch(typeIdx, batchIdx, 'quantity', e.target.value)} placeholder="Qtd" min="1" required />
                                                </div>
                                                {type.batches.length > 1 && <button type="button" onClick={() => handleRemoveBatch(typeIdx, batchIdx)} className={styles.removeBatchBtn}><FaTrashAlt size={14} /></button>}
                                            </div>
                                        ))}
                                        <button type="button" onClick={() => handleAddBatch(typeIdx)} className={styles.addBatchBtn}><FaPlus size={12} /> Adicionar Próximo Lote</button>
                                    </div>
                                    <div className={styles.ticketFooter}>
                                        <label className={styles.checkboxLabel}><input className={styles.checkbox} type="checkbox" checked={type.isHalfPrice} onChange={e => handleChangeTicketType(typeIdx, 'isHalfPrice', e.target.checked)} /> Meia-entrada disponível</label>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={handleAddTicketType} className={styles.addBtnFull}><FaPlus /> Novo Tipo de Ingresso</button>
                    </section>

                    <section className={styles.card}>
                        <div className={styles.cardHeader}>
                            <div className={styles.iconWrapper}><FaInstagram /></div>
                            <h3>Organizador</h3>
                        </div>
                        <div className={styles.gridTwo}>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Nome</label>
                                <input className={styles.input} type="text" value={organizerName} onChange={e => setOrganizerName(e.target.value)} required />
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Instagram</label>
                                <div className={styles.inputWrapper}><FaInstagram className={styles.inputIcon} /><input className={styles.input} type="text" value={organizerInstagram} onChange={e => setOrganizerInstagram(e.target.value)} placeholder="@usuario" /></div>
                            </div>
                        </div>
                    </section>

                    <button type="submit" className={styles.submitButton} disabled={saving}>
                        {saving ? 'Salvando...' : <><FaSave style={{marginRight:'10px'}}/> SALVAR ALTERAÇÕES</>}
                    </button>
                </form>
            </main>
        </div>
    );
};

export default EditarEvento;