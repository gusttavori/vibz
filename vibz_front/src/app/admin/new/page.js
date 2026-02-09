'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header'; 
import styles from './CadastroEvento.module.css';
import { 
    FaImage, FaInstagram, FaPlus, FaTrashAlt, 
    FaTicketAlt, FaStar, FaCalendarAlt, FaMapMarkerAlt,
    FaAlignLeft, FaLayerGroup, FaArrowLeft, FaClipboardList
} from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast'; 

// --- CORREÇÃO AQUI ---
// Usamos a variável de ambiente. Se não existir (localhost), usa a porta 5000 local.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const CadastroEvento = () => {
    const router = useRouter();
    // A variável API_BASE_URL já foi definida acima, não precisa chamar função

    // --- ESTADOS ---
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [ageRating, setAgeRating] = useState('Livre');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    
    // Sessões
    const [sessions, setSessions] = useState([
        { date: '', time: '', endDate: '', endTime: '' }
    ]);
    
    // Localização
    const [locationName, setLocationName] = useState('');
    const [addressStreet, setAddressStreet] = useState('');
    const [addressNumber, setAddressNumber] = useState('');
    const [addressDistrict, setAddressDistrict] = useState('');
    const [addressCity, setAddressCity] = useState('');
    const [addressState, setAddressState] = useState('');
    const [addressZipCode, setAddressZipCode] = useState('');
    
    // Organizador
    const [organizerName, setOrganizerName] = useState('');
    const [organizerInstagram, setOrganizerInstagram] = useState('');
    
    // Ingressos
    const [ticketTypes, setTicketTypes] = useState([
        { 
            name: '', category: 'Inteira', isHalfPrice: false,
            batches: [{ name: '1º Lote', price: '', quantity: '' }]
        }
    ]);

    // FASE 2: Formulário Personalizado (Campos do Participante)
    const [customQuestions, setCustomQuestions] = useState([]);

    const [refundPolicy, setRefundPolicy] = useState('O cancelamento pode ser solicitado em até 7 dias após a compra, desde que a solicitação seja feita até 48h antes do evento.');
    const [isFeaturedRequested, setIsFeaturedRequested] = useState(false);
    const FEATURED_FEE = 9.90;
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('userToken');
        if (!token) router.push('/login');
    }, [router]);

    // --- HANDLERS GENÉRICOS ---
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

    // --- HANDLERS DE INGRESSO ---
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

    // --- HANDLERS DE FORMULÁRIO PERSONALIZADO ---
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

    // --- SUBMIT ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('userToken')?.replace(/"/g, '');

        if (!imageFile) return toast.error('Adicione uma capa para o evento.');
        if (!termsAccepted) return toast.error('Aceite os termos para continuar.');
        if (!category) return toast.error('Selecione uma categoria.');
        
        for (let i = 0; i < sessions.length; i++) {
            if (!sessions[i].date || !sessions[i].time) return toast.error(`Preencha data e hora da sessão ${i + 1}`);
        }

        for (const type of ticketTypes) {
            if (!type.name) return toast.error("Nome do tipo de ingresso é obrigatório (ex: Pista).");
            for (const batch of type.batches) {
                if (!batch.price || !batch.quantity) return toast.error(`Preencha preço e quantidade para ${type.name} - ${batch.name}`);
            }
        }

        // Validação básica do formulário personalizado
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
        ticketTypes.forEach(type => {
            type.batches.forEach(batch => {
                flatTickets.push({
                    name: type.name, category: type.category, isHalfPrice: type.isHalfPrice,
                    batch: batch.name, 
                    price: parseFloat(batch.price.toString().replace(',', '.')),
                    quantity: parseInt(batch.quantity),
                    description: `${type.name} - ${batch.name}`
                });
            });
        });
        formData.append('tickets', JSON.stringify(flatTickets));
        
        formData.append('organizerName', organizerName);
        formData.append('organizerInstagram', organizerInstagram);
        formData.append('organizer', JSON.stringify({ name: organizerName, instagram: organizerInstagram }));
        formData.append('isFeaturedRequested', isFeaturedRequested);

        // FASE 2: Envia o formulário personalizado
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
                    <p>Preencha as informações para começar a vender.</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.formContainer}>
                    
                    {/* 1. INFO PRINCIPAL */}
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
                                <div className={styles.inputWrapper}><FaAlignLeft className={styles.inputIcon}/><input className={styles.input} value={title} onChange={e=>setTitle(e.target.value)} required placeholder="Ex: Festival de Verão"/></div>
                            </div>
                            <div className={styles.inputGroupFull} style={{gridColumn:'span 2'}}>
                                <label className={styles.label}>Descrição</label>
                                <textarea className={styles.textarea} value={description} onChange={e=>setDescription(e.target.value)} required placeholder="Detalhes do evento..."/>
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Categoria</label>
                                <div className={styles.inputWrapper}><FaLayerGroup className={styles.inputIcon}/><select className={styles.select} value={category} onChange={e=>setCategory(e.target.value)} required><option value="">Selecione...</option><option>Festas e Shows</option><option>Teatro</option><option>Esportes</option><option>Gastronomia</option><option>Cursos</option></select></div>
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Classificação</label>
                                <select className={styles.select} value={ageRating} onChange={e=>setAgeRating(e.target.value)}><option>Livre</option><option>12+</option><option>14+</option><option>16+</option><option>18+</option></select>
                            </div>
                        </div>
                    </section>

                    {/* 2. DATA E LOCAL */}
                    <section className={styles.card}>
                        <div className={styles.cardHeader}><div className={styles.iconWrapper}><FaCalendarAlt /></div><h3>Data e Local</h3></div>
                        {sessions.map((s,i)=>(
                            <div key={i} className={styles.sessionCard}>
                                <div className={styles.sessionHeader}><h4>Data #{i+1}</h4>{sessions.length>1 && <button type="button" onClick={()=>handleRemoveSession(i)} className={styles.trashBtn}><FaTrashAlt/></button>}</div>
                                <div className={styles.gridTwo}>
                                    <div className={styles.inputGroup}><label className={styles.label}>Início</label><div className={styles.gridDateTime}><input type="date" className={styles.input} value={s.date} onChange={e=>handleChangeSession(i,'date',e.target.value)} required/><input type="time" className={styles.input} value={s.time} onChange={e=>handleChangeSession(i,'time',e.target.value)} required/></div></div>
                                    <div className={styles.inputGroup}><label className={styles.label}>Fim (Opcional)</label><div className={styles.gridDateTime}><input type="date" className={styles.input} value={s.endDate} onChange={e=>handleChangeSession(i,'endDate',e.target.value)}/><input type="time" className={styles.input} value={s.endTime} onChange={e=>handleChangeSession(i,'endTime',e.target.value)}/></div></div>
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={handleAddSession} className={styles.addBtnSmall}><FaPlus /> Adicionar data</button>
                        
                        <div className={styles.divider}></div>
                        <div className={styles.inputGroupFull}><label className={styles.label}>Local</label><div className={styles.inputWrapper}><FaMapMarkerAlt className={styles.inputIcon}/><input className={styles.input} value={locationName} onChange={e=>setLocationName(e.target.value)} required placeholder="Nome do espaço"/></div></div>
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

                    {/* 3. INGRESSOS */}
                    <section className={styles.card}>
                        <div className={styles.cardHeader}><div className={styles.iconWrapper}><FaTicketAlt /></div><h3>Ingressos e Lotes</h3></div>
                        <div className={styles.ticketsContainer}>
                            {ticketTypes.map((type, typeIdx) => (
                                <div key={typeIdx} className={styles.ticketTypeCard}>
                                    <div className={styles.ticketTypeHeader}>
                                            <div className={styles.inputGroup} style={{flex: 2}}><label className={styles.label}>Nome do Ingresso</label><input className={styles.input} type="text" value={type.name} onChange={e => handleChangeTicketType(typeIdx, 'name', e.target.value)} placeholder="Ex: Pista" required /></div>
                                            <div className={styles.inputGroup} style={{flex: 1}}><label className={styles.label}>Categoria</label><select className={styles.select} value={type.category} onChange={e => handleChangeTicketType(typeIdx, 'category', e.target.value)}><option>Inteira</option><option>Meia</option><option>VIP</option><option>Cortesia</option></select></div>
                                            {ticketTypes.length > 1 && <button type="button" onClick={() => handleRemoveTicketType(typeIdx)} className={styles.trashBtn}><FaTrashAlt /></button>}
                                    </div>
                                    <div className={styles.batchesContainer}>
                                            <h4 className={styles.batchTitle}>Lotes:</h4>
                                            {type.batches.map((batch, batchIdx) => (
                                                <div key={batchIdx} className={styles.batchRow}>
                                                    <div className={styles.inputGroup}><input className={styles.inputSmall} type="text" value={batch.name} onChange={e => handleChangeBatch(typeIdx, batchIdx, 'name', e.target.value)} placeholder="Lote" /></div>
                                                    <div className={styles.inputGroup}><div className={styles.inputWrapper}><span className={styles.currencyPrefix}>R$</span><input className={styles.inputSmall} type="number" value={batch.price} onChange={e => handleChangeBatch(typeIdx, batchIdx, 'price', e.target.value)} placeholder="0,00" min="0" step="0.01" required /></div></div>
                                                    <div className={styles.inputGroup}><input className={styles.inputSmall} type="number" value={batch.quantity} onChange={e => handleChangeBatch(typeIdx, batchIdx, 'quantity', e.target.value)} placeholder="Qtd" min="1" required /></div>
                                                    {type.batches.length > 1 && <button type="button" onClick={() => handleRemoveBatch(typeIdx, batchIdx)} className={styles.removeBatchBtn}><FaTrashAlt size={14} /></button>}
                                                </div>
                                            ))}
                                            <button type="button" onClick={() => handleAddBatch(typeIdx)} className={styles.addBatchBtn}><FaPlus size={12} /> Adicionar Lote</button>
                                    </div>
                                    <div className={styles.ticketFooter}><label className={styles.checkboxLabel}><input className={styles.checkbox} type="checkbox" checked={type.isHalfPrice} onChange={e => handleChangeTicketType(typeIdx, 'isHalfPrice', e.target.checked)} /> Disponibilizar meia-entrada</label></div>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={handleAddTicketType} className={styles.addBtnFull}><FaPlus /> Adicionar Ingresso</button>
                    </section>

                    {/* 4. FORMULÁRIO PERSONALIZADO (FASE 2) */}
                    <section className={styles.card}>
                        <div className={styles.cardHeader}><div className={styles.iconWrapper}><FaClipboardList /></div><h3>Formulário do Participante</h3></div>
                        <p style={{fontSize: '0.9rem', color: '#64748b', marginBottom: '24px', lineHeight: '1.5'}}>
                            Adicione perguntas específicas que o participante deve responder para cada ingresso comprado. 
                            <br/><small>(Ex: Nome completo, RG, Tamanho da Camiseta, Restrição Alimentar)</small>
                        </p>
                        
                        <div className={styles.questionList}>
                            {customQuestions.map((q, idx) => (
                                <div key={idx} className={styles.questionCard}>
                                    <div className={styles.questionRow}>
                                        <div className={styles.inputGroup}>
                                            <label className={styles.label}>Pergunta</label>
                                            <input 
                                                className={styles.input} 
                                                value={q.label} 
                                                onChange={e => handleChangeQuestion(idx, 'label', e.target.value)} 
                                                placeholder="Ex: Qual o número do seu RG?" 
                                                required 
                                            />
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label className={styles.label}>Tipo de Resposta</label>
                                            <select 
                                                className={styles.select} 
                                                value={q.type} 
                                                onChange={e => handleChangeQuestion(idx, 'type', e.target.value)}
                                            >
                                                <option value="text">Texto Curto</option>
                                                <option value="select">Seleção (Dropdown)</option>
                                                <option value="checkbox">Caixa de Seleção (Sim/Não)</option>
                                            </select>
                                        </div>
                                    </div>

                                    {q.type === 'select' && (
                                        <div className={styles.optionsRow}>
                                            <div className={styles.inputGroup}>
                                                <label className={styles.label}>Opções (separadas por vírgula)</label>
                                                <input 
                                                    className={styles.input} 
                                                    value={q.options} 
                                                    onChange={e => handleChangeQuestion(idx, 'options', e.target.value)} 
                                                    placeholder="Ex: P, M, G, GG" 
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className={styles.questionFooter}>
                                        <label className={styles.switchLabel}>
                                            <input 
                                                className={styles.checkbox} 
                                                type="checkbox" 
                                                checked={q.required} 
                                                onChange={e => handleChangeQuestion(idx, 'required', e.target.checked)} 
                                            /> 
                                            Resposta Obrigatória
                                        </label>

                                        <button type="button" onClick={() => handleRemoveQuestion(idx)} className={styles.deleteQuestionBtn}>
                                            <FaTrashAlt size={14} /> Excluir Pergunta
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <button type="button" onClick={handleAddQuestion} className={styles.addQuestionBtn}>
                            <FaPlus /> Adicionar Pergunta
                        </button>
                    </section>

                    {/* 5. ORGANIZADOR */}
                    <section className={styles.card}>
                        <div className={styles.cardHeader}><div className={styles.iconWrapper}><FaInstagram /></div><h3>Organizador</h3></div>
                        <div className={styles.gridTwo}>
                            <input className={styles.input} placeholder="Nome do Produtor" value={organizerName} onChange={e=>setOrganizerName(e.target.value)} required/>
                            <div className={styles.inputWrapper}><FaInstagram className={styles.inputIcon}/><input className={styles.input} placeholder="@instagram" value={organizerInstagram} onChange={e=>setOrganizerInstagram(e.target.value)}/></div>
                        </div>
                    </section>

                    {/* DESTAQUE E FOOTER */}
                    <div className={`${styles.featuredBox} ${isFeaturedRequested ? styles.featuredActive : ''}`} onClick={() => setIsFeaturedRequested(!isFeaturedRequested)}>
                        <div className={styles.featuredInfo}>
                            <div className={styles.featuredIcon}><FaStar /></div>
                            <div className={styles.featuredText}><h4>Destaque seu evento</h4><p>Apareça no topo e venda mais.</p></div>
                        </div>
                        <div style={{display: 'flex', alignItems: 'center'}}>
                            <div className={styles.featuredPrice}>R$ {FEATURED_FEE.toFixed(2)}</div>
                            <div className={styles.switch}>
                                <input className={styles.hiddenCheckbox} type="checkbox" checked={isFeaturedRequested} onChange={e => setIsFeaturedRequested(e.target.checked)} />
                                <span className={styles.slider}></span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.footer}>
                        <div className={styles.termsBox}>
                            <input className={styles.checkbox} type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} />
                            <label style={{marginLeft: '10px'}}>Li e concordo com os Termos.</label>
                        </div>
                        <button type="submit" className={styles.submitButton} disabled={loading}>{loading ? 'Criando...' : 'CRIAR EVENTO'}</button>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default CadastroEvento;