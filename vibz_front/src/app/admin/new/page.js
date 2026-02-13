'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header'; 
import Link from 'next/link';
import styles from './CadastroEvento.module.css';
import { 
    FaImage, FaInstagram, FaPlus, FaTrashAlt, 
    FaTicketAlt, FaStar, FaCalendarAlt, FaMapMarkerAlt,
    FaAlignLeft, FaLayerGroup, FaArrowLeft, FaClipboardList, FaClock, FaUserLock
} from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast'; 

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const CadastroEvento = () => {
    const router = useRouter();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [ageRating, setAgeRating] = useState('Livre');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    
    const [sessions, setSessions] = useState([
        { date: '', time: '', endDate: '', endTime: '' }
    ]);
    
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

    const [ticketTypes, setTicketTypes] = useState([
        { 
            name: '', category: 'Inteira', isHalfPrice: false,
            hasSchedule: false, 
            maxPerUser: 4, // NOVO CAMPO (Padrão 4)
            activityDate: '', startTime: '', endTime: '', 
            batches: [{ name: 'Lote Único', price: '0', quantity: '' }]
        }
    ]);

    const [customQuestions, setCustomQuestions] = useState([]);
    const [refundPolicy, setRefundPolicy] = useState('O cancelamento pode ser solicitado em até 7 dias após a compra.');
    const [isFeaturedRequested, setIsFeaturedRequested] = useState(false);
    const FEATURED_FEE = 9.90;
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('userToken');
        if (!token) router.push('/login');
    }, [router]);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) return toast.error('Imagem muito grande (Máx: 5MB)');
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };
    
    const handleAddSession = () => setSessions([...sessions, { date: '', time: '', endDate: '', endTime: '' }]);
    const handleRemoveSession = (index) => {
        if (sessions.length === 1) return toast.error("Mínimo de 1 data.");
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
            hasSchedule: false,
            maxPerUser: 4,
            activityDate: '', startTime: '', endTime: '',
            batches: [{ name: 'Lote Único', price: '0', quantity: '' }]
        }]);
    };
    const handleRemoveTicketType = (index) => {
        if (ticketTypes.length === 1) return toast.error("Mínimo de 1 tipo de ingresso.");
        setTicketTypes(ticketTypes.filter((_, i) => i !== index));
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

    const handleAddBatch = (typeIndex) => {
        const updated = [...ticketTypes];
        const nextBatchNum = updated[typeIndex].batches.length + 1;
        updated[typeIndex].batches.push({ name: `${nextBatchNum}º Lote`, price: '0', quantity: '' });
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

    const handleAddQuestion = () => {
        setCustomQuestions([...customQuestions, { label: '', type: 'text', required: true, options: '' }]);
    };
    const handleRemoveQuestion = (index) => {
        setCustomQuestions(customQuestions.filter((_, i) => i !== index));
    };
    const handleChangeQuestion = (index, field, value) => {
        const updated = [...customQuestions];
        updated[index][field] = value;
        setCustomQuestions(updated);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('userToken')?.replace(/"/g, '');

        if (!imageFile) return toast.error('Adicione uma capa para o evento.');
        if (!termsAccepted) return toast.error('Você deve aceitar os termos e a política de privacidade.');
        if (!category) return toast.error('Selecione uma categoria.');
        
        for (let i = 0; i < sessions.length; i++) {
            if (!sessions[i].date || !sessions[i].time) return toast.error(`Preencha data e hora da sessão ${i + 1}`);
        }

        if (!isInformational) {
            if (ticketTypes.length === 0) return toast.error("Adicione pelo menos um ingresso.");
            for (const type of ticketTypes) {
                if (!type.name) return toast.error("Nome do tipo de ingresso é obrigatório.");
                if (!type.maxPerUser || type.maxPerUser < 1) return toast.error(`Limite por pessoa inválido para o ingresso "${type.name}".`);
                
                if (type.hasSchedule) {
                    if (!type.activityDate) return toast.error(`Preencha a data da atividade para o ingresso "${type.name}"`);
                    if ((type.startTime && !type.endTime) || (!type.startTime && type.endTime) || (!type.startTime && !type.endTime)) {
                        return toast.error(`Preencha início e fim para o horário do ingresso "${type.name}"`);
                    }
                }

                for (const batch of type.batches) {
                    if (batch.price === '' || batch.price === null || batch.price === undefined) {
                        return toast.error(`Preencha o preço para ${type.name} (coloque 0 se for grátis).`);
                    }
                    if (!batch.quantity) return toast.error(`Preencha a quantidade de vagas para ${type.name}.`);
                }
            }
        }

        for (const q of customQuestions) {
            if (!q.label) return toast.error("Preencha a pergunta do formulário do participante.");
            if (q.type === 'select' && !q.options) return toast.error("Adicione opções para a pergunta de seleção.");
        }

        setLoading(true);

        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('category', category);
        formData.append('ageRating', ageRating);
        formData.append('refundPolicy', refundPolicy);
        formData.append('image', imageFile);
        formData.append('isInformational', isInformational); 

        const formattedSessions = sessions.map(s => {
            let isoStart = null;
            try { isoStart = new Date(`${s.date}T${s.time}:00`).toISOString(); } catch(e) {}
            return { date: isoStart || s.date, rawDate: s.date, rawTime: s.time };
        });
        if (formattedSessions.length > 0) formData.append('date', formattedSessions[0].date);
        formData.append('sessions', JSON.stringify(formattedSessions));
        
        formData.append('location', locationName);
        formData.append('city', addressCity);
        formData.append('address', JSON.stringify({
            street: addressStreet, number: addressNumber, district: addressDistrict,
            city: addressCity, state: addressState, zipCode: addressZipCode
        }));
        
        const flatTickets = [];
        if (!isInformational) {
            ticketTypes.forEach(type => {
                type.batches.forEach(batch => {
                    flatTickets.push({
                        name: type.name, category: type.category, isHalfPrice: type.isHalfPrice,
                        activityDate: type.hasSchedule ? type.activityDate : null,
                        startTime: type.hasSchedule ? type.startTime : null,
                        endTime: type.hasSchedule ? type.endTime : null,
                        maxPerUser: parseInt(type.maxPerUser), // ENVIA O LIMITE
                        batch: batch.name, 
                        price: parseFloat(batch.price.toString().replace(',', '.')),
                        quantity: parseInt(batch.quantity),
                        description: `${type.name} - ${batch.name}`
                    });
                });
            });
        }
        formData.append('tickets', JSON.stringify(flatTickets));
        
        formData.append('organizerName', organizerName);
        formData.append('organizerInstagram', organizerInstagram);
        formData.append('organizer', JSON.stringify({ name: organizerName, instagram: organizerInstagram }));
        formData.append('isFeaturedRequested', isFeaturedRequested);
        formData.append('formSchema', JSON.stringify(customQuestions));

        try {
            const res = await fetch(`${API_BASE_URL}/events`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Erro ao criar evento.');

            toast.success('Evento criado com sucesso!');
            setTimeout(() => router.push('/dashboard'), 2000); 
        } catch (err) {
            console.error(err);
            toast.error(err.message || "Erro de conexão.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.pageWrapper}>
            <Toaster position="top-right" />
            <Header/>

            <main className={styles.mainContent}>
                <div className={styles.pageHeader}>
                    <button className={styles.backBtn} onClick={() => router.back()}>
                        <FaArrowLeft /> Voltar
                    </button>
                    <h1>Criar Novo Evento</h1>
                    <p>Divulgue, gerencie e venda ingressos de forma simples.</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.formContainer}>
                    <section className={styles.card}>
                        <div className={styles.cardHeader}><div className={styles.iconWrapper}><FaImage /></div><h3>Informações Principais</h3></div>
                        <div className={styles.uploadSection}>
                            <div className={styles.uploadBox} onClick={() => document.getElementById('imageUpload').click()}>
                                {imagePreview ? <img src={imagePreview} className={styles.imagePreview} alt="Capa" /> : <div className={styles.uploadPlaceholder}><FaImage size={48} /><span>Carregar Capa</span></div>}
                            </div>
                            <input type="file" id="imageUpload" accept="image/*" onChange={handleImageUpload} hidden />
                        </div>
                        <div className={styles.gridTwo}>
                            <div className={styles.inputGroupFull} style={{gridColumn:'span 2'}}>
                                <label className={styles.label}>Nome do Evento</label>
                                <div className={styles.inputWrapper}><FaAlignLeft className={styles.inputIcon}/><input className={styles.input} value={title} onChange={e=>setTitle(e.target.value)} required placeholder="Ex: Festival de Música ou Workshop Profissional"/></div>
                            </div>
                            <div className={styles.inputGroupFull} style={{gridColumn:'span 2'}}>
                                <label className={styles.label}>Descrição</label>
                                <textarea className={styles.textarea} value={description} onChange={e=>setDescription(e.target.value)} required placeholder="Detalhes, atrações, cronograma, sobre o curso..."/>
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Categoria</label>
                                <div className={styles.inputWrapper}>
                                    <FaLayerGroup className={styles.inputIcon}/>
                                    <select className={styles.select} value={category} onChange={e=>setCategory(e.target.value)} required>
                                            <option value="">Selecione...</option>
                                            <option>Festas e Shows</option>
                                            <option>Acadêmico / Congresso</option>
                                            <option>Cursos e Workshops</option>
                                            <option>Teatro e Cultura</option>
                                            <option>Esportes</option>
                                            <option>Gastronomia</option>
                                    </select>
                                </div>
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Classificação</label>
                                <select className={styles.select} value={ageRating} onChange={e=>setAgeRating(e.target.value)}><option>Livre</option><option>12+</option><option>14+</option><option>16+</option><option>18+</option></select>
                            </div>
                        </div>
                    </section>

                    <section className={styles.card}>
                        <div className={styles.cardHeader}><div className={styles.iconWrapper}><FaCalendarAlt /></div><h3>Data e Local</h3></div>
                        {sessions.map((s,i)=>(
                            <div key={i} className={styles.sessionCard}>
                                <div className={styles.sessionHeader}><h4>Sessão #{i+1}</h4>{sessions.length>1 && <button type="button" onClick={()=>handleRemoveSession(i)} className={styles.trashBtn}><FaTrashAlt/></button>}</div>
                                <div className={styles.gridTwo}>
                                    <div className={styles.inputGroup}><label className={styles.label}>Início</label><div className={styles.gridDateTime}><input type="date" className={styles.input} value={s.date} onChange={e=>handleChangeSession(i,'date',e.target.value)} required/><input type="time" className={styles.input} value={s.time} onChange={e=>handleChangeSession(i,'time',e.target.value)} required/></div></div>
                                    <div className={styles.inputGroup}><label className={styles.label}>Fim (Opcional)</label><div className={styles.gridDateTime}><input type="date" className={styles.input} value={s.endDate} onChange={e=>handleChangeSession(i,'endDate',e.target.value)}/><input type="time" className={styles.input} value={s.endTime} onChange={e=>handleChangeSession(i,'endTime',e.target.value)}/></div></div>
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={handleAddSession} className={styles.addBtnSmall}><FaPlus /> Adicionar data</button>
                        <div className={styles.divider}></div>
                        <div className={styles.inputGroupFull}><label className={styles.label}>Local</label><div className={styles.inputWrapper}><FaMapMarkerAlt className={styles.inputIcon}/><input className={styles.input} value={locationName} onChange={e=>setLocationName(e.target.value)} required placeholder="Ex: Espaço de Eventos, Teatro ou Auditório"/></div></div>
                        <div className={styles.gridAddressTop}>
                            <div className={styles.inputGroup}><label className={styles.label}>CEP</label><input className={styles.input} value={addressZipCode} onChange={e=>setAddressZipCode(e.target.value)} required/></div>
                            <div className={styles.inputGroup}><label className={styles.label}>Cidade</label><input className={styles.input} value={addressCity} onChange={e=>setAddressCity(e.target.value)} required/></div>
                            <div className={styles.inputGroup}><label className={styles.label}>UF</label><input className={styles.input} value={addressState} onChange={e=>setAddressState(e.target.value)} maxLength={2} required/></div>
                        </div>
                        <div className={styles.gridAddressStreet}>
                            <div className={styles.inputGroup}><label className={styles.label}>Rua</label><input className={styles.input} value={addressStreet} onChange={e=>setAddressStreet(e.target.value)}/></div>
                            <div className={styles.inputGroup}><label className={styles.label}>Nº</label><input className={styles.input} value={addressNumber} onChange={e=>setAddressNumber(e.target.value)}/></div>
                        </div>
                        <div className={styles.inputGroup}><label className={styles.label}>Bairro</label><input className={styles.input} value={addressDistrict} onChange={e=>setAddressDistrict(e.target.value)}/></div>
                    </section>

                    <section className={styles.card}>
                        <div className={styles.cardHeader}>
                            <div className={styles.iconWrapper}><FaTicketAlt /></div>
                            <h3>Inscrições / Ingressos</h3>
                        </div>
                        
                        <div className={styles.infoSwitchContainer} style={{marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
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
                                            <div className={styles.inputGroup} style={{flex: 2}}><label className={styles.label}>Nome do Ingresso</label><input className={styles.input} type="text" value={type.name} onChange={e => handleChangeTicketType(typeIdx, 'name', e.target.value)} placeholder="Ex: Palestra ou Área VIP" required /></div>
                                            <div className={styles.inputGroup} style={{flex: 1}}><label className={styles.label}>Categoria</label><select className={styles.select} value={type.category} onChange={e => handleChangeTicketType(typeIdx, 'category', e.target.value)}><option>Inteira</option><option>Meia / Estudante</option><option>VIP</option><option>Cortesia</option></select></div>
                                            {ticketTypes.length > 1 && <button type="button" onClick={() => handleRemoveTicketType(typeIdx)} className={styles.trashBtn}><FaTrashAlt /></button>}
                                        </div>

                                        <div style={{display:'flex', gap:'20px', marginBottom: '15px', flexWrap:'wrap'}}>
                                            {/* CAMPO NOVO: MÁX POR PESSOA */}
                                            <div className={styles.inputGroup} style={{flex: '0 0 180px'}}>
                                                <label className={styles.label}><FaUserLock style={{marginRight:'5px'}}/> Máx. por pessoa</label>
                                                <input 
                                                    className={styles.input} 
                                                    type="number" 
                                                    min="1"
                                                    value={type.maxPerUser} 
                                                    onChange={e => handleChangeTicketType(typeIdx, 'maxPerUser', e.target.value)} 
                                                    required 
                                                />
                                            </div>

                                            <div style={{display:'flex', alignItems:'center', paddingTop:'20px'}}>
                                                <label className={styles.checkboxLabel} style={{fontSize: '0.9rem', color: '#475569', fontWeight: '600'}}>
                                                    <input 
                                                        className={styles.checkbox} 
                                                        type="checkbox" 
                                                        checked={type.hasSchedule} 
                                                        onChange={e => handleChangeTicketType(typeIdx, 'hasSchedule', e.target.checked)} 
                                                    />
                                                    Data/horário específico (Palestras)
                                                </label>
                                            </div>
                                        </div>

                                        {type.hasSchedule && (
                                            <div style={{backgroundColor: '#f1f5f9', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e2e8f0', animation: 'fadeIn 0.3s ease'}}>
                                                <h4 style={{fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '10px', display:'flex', alignItems:'center', gap:'6px'}}><FaClock /> Horário da Atividade</h4>
                                                <div className={styles.gridTwo}>
                                                    <div className={styles.inputGroup}>
                                                        <label className={styles.label}>Data da Atividade</label>
                                                        <input type="date" className={styles.inputSmall} value={type.activityDate} onChange={e => handleChangeTicketType(typeIdx, 'activityDate', e.target.value)} />
                                                    </div>
                                                    <div className={styles.inputGroup}>
                                                        <label className={styles.label}>Horário (Início - Fim)</label>
                                                        <div style={{display:'flex', gap:'5px'}}>
                                                            <input type="time" className={styles.inputSmall} value={type.startTime} onChange={e => handleChangeTicketType(typeIdx, 'startTime', e.target.value)} placeholder="Início" />
                                                            <input type="time" className={styles.inputSmall} value={type.endTime} onChange={e => handleChangeTicketType(typeIdx, 'endTime', e.target.value)} placeholder="Fim" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className={styles.batchesContainer}>
                                            <h4 className={styles.batchTitle}>Lotes:</h4>
                                            {type.batches.map((batch, batchIdx) => (
                                                <div key={batchIdx} className={styles.batchRow}>
                                                    <div className={styles.inputGroup}><input className={styles.inputSmall} type="text" value={batch.name} onChange={e => handleChangeBatch(typeIdx, batchIdx, 'name', e.target.value)} placeholder="Lote" /></div>
                                                    <div className={styles.inputGroup}>
                                                        <div className={styles.inputWrapper}>
                                                            <span className={styles.currencyPrefix}>R$</span>
                                                            <input className={styles.inputSmall} type="number" value={batch.price} onChange={e => handleChangeBatch(typeIdx, batchIdx, 'price', e.target.value)} placeholder="0,00" min="0" step="0.01" required />
                                                        </div>
                                                        {parseFloat(batch.price) === 0 && <span style={{fontSize:'0.7rem', color:'green', fontWeight:'bold', marginTop: '2px', display:'block'}}>GRÁTIS</span>}
                                                    </div>
                                                    <div className={styles.inputGroup}><input className={styles.inputSmall} type="number" value={batch.quantity} onChange={e => handleChangeBatch(typeIdx, batchIdx, 'quantity', e.target.value)} placeholder="Vagas" min="1" required /></div>
                                                    {type.batches.length > 1 && <button type="button" onClick={() => handleRemoveBatch(typeIdx, batchIdx)} className={styles.removeBatchBtn}><FaTrashAlt size={14} /></button>}
                                                </div>
                                            ))}
                                            <button type="button" onClick={() => handleAddBatch(typeIdx)} className={styles.addBatchBtn}><FaPlus size={12} /> Adicionar Lote</button>
                                        </div>
                                    </div>
                                ))}
                                <button type="button" onClick={handleAddTicketType} className={styles.addBtnFull}><FaPlus /> Adicionar Tipo de Inscrição</button>
                            </div>
                        )}
                    </section>

                    {!isInformational && (
                        <section className={styles.card}>
                            <div className={styles.cardHeader}><div className={styles.iconWrapper}><FaClipboardList /></div><h3>Dados do Participante</h3></div>
                            
                            <div style={{marginBottom: '20px', padding: '12px', background: '#fff7ed', border: '1px solid #fdba74', borderRadius: '8px', color: '#c2410c', fontSize: '0.9rem'}}>
                                <strong>⚠️ Atenção à LGPD:</strong> Evite solicitar dados sensíveis (como religião, saúde, orientação sexual ou dados bancários) a menos que seja estritamente necessário para a execução do evento. Você é o controlador desses dados.
                            </div>

                            <p style={{fontSize: '0.9rem', color: '#64748b', marginBottom: '24px', lineHeight: '1.5'}}>Configure aqui os dados extras que você precisa coletar de cada pessoa.</p>
                            
                            <div className={styles.questionList}>
                                {customQuestions.map((q, idx) => (
                                    <div key={idx} className={styles.questionCard}>
                                        <div className={styles.questionRow}>
                                            <div className={styles.inputGroup}><label className={styles.label}>Pergunta</label><input className={styles.input} value={q.label} onChange={e => handleChangeQuestion(idx, 'label', e.target.value)} placeholder="Pergunta" required /></div>
                                            <div className={styles.inputGroup}><label className={styles.label}>Tipo de Resposta</label><select className={styles.select} value={q.type} onChange={e => handleChangeQuestion(idx, 'type', e.target.value)}><option value="text">Texto Curto</option><option value="select">Seleção (Dropdown)</option><option value="checkbox">Caixa de Seleção (Sim/Não)</option></select></div>
                                        </div>
                                        {q.type === 'select' && (<div className={styles.optionsRow}><div className={styles.inputGroup}><label className={styles.label}>Opções (separadas por vírgula)</label><input className={styles.input} value={q.options} onChange={e => handleChangeQuestion(idx, 'options', e.target.value)} placeholder="Ex: P, M, G, GG" /></div></div>)}
                                        <div className={styles.questionFooter}><label className={styles.switchLabel}><input className={styles.checkbox} type="checkbox" checked={q.required} onChange={e => handleChangeQuestion(idx, 'required', e.target.checked)} /> Resposta Obrigatória</label><button type="button" onClick={() => handleRemoveQuestion(idx)} className={styles.deleteQuestionBtn}><FaTrashAlt size={14} /> Excluir</button></div>
                                    </div>
                                ))}
                            </div>
                            <button type="button" onClick={handleAddQuestion} className={styles.addQuestionBtn}><FaPlus /> Adicionar Pergunta Personalizada</button>
                        </section>
                    )}

                    <section className={styles.card}>
                        <div className={styles.cardHeader}><div className={styles.iconWrapper}><FaInstagram /></div><h3>Organizador</h3></div>
                        <div className={styles.gridTwo}>
                            <div className={styles.inputGroup}><label className={styles.label}>Nome</label><input className={styles.input} placeholder="Nome da Produtora ou Organizador" value={organizerName} onChange={e=>setOrganizerName(e.target.value)} required/></div>
                            <div className={styles.inputGroup}><label className={styles.label}>Instagram</label><div className={styles.inputWrapper}><FaInstagram className={styles.inputIcon}/><input className={styles.input} placeholder="@instagram" value={organizerInstagram} onChange={e=>setOrganizerInstagram(e.target.value)}/></div></div>
                        </div>
                    </section>

                    <div className={`${styles.featuredBox} ${isFeaturedRequested ? styles.featuredActive : ''}`} onClick={() => setIsFeaturedRequested(!isFeaturedRequested)}>
                        <div className={styles.featuredInfo}><div className={styles.featuredIcon}><FaStar /></div><div className={styles.featuredText}><h4>Destaque seu evento</h4><p>Apareça no topo e venda mais.</p></div></div>
                        <div style={{display: 'flex', alignItems: 'center'}}><div className={styles.featuredPrice}>R$ {FEATURED_FEE.toFixed(2)}</div><label className={styles.switch} onClick={e => e.stopPropagation()}><input className={styles.hiddenCheckbox} type="checkbox" checked={isFeaturedRequested} onChange={e => setIsFeaturedRequested(e.target.checked)} /><span className={styles.slider}></span></label></div>
                    </div>

                    <div className={styles.footer}>
                        <div className={styles.termsBox}>
                            <input 
                                className={styles.checkbox} 
                                type="checkbox" 
                                checked={termsAccepted} 
                                onChange={e => setTermsAccepted(e.target.checked)} 
                            />
                            <label style={{marginLeft: '10px'}}>
                                Li e concordo com os <Link href="/termos" target="_blank" style={{color: '#4C01B5', textDecoration: 'underline'}}>Termos de Uso</Link> e <Link href="/politica" target="_blank" style={{color: '#4C01B5', textDecoration: 'underline'}}>Política de Privacidade</Link>.
                            </label>
                        </div>
                        <button type="submit" className={styles.submitButton} disabled={loading}>{loading ? 'Criando...' : 'PUBLICAR EVENTO'}</button>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default CadastroEvento;