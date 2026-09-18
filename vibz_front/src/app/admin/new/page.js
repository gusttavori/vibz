'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header'; 
import styles from './CadastroEvento.module.css';
import { 
    FaImage, FaInstagram, FaPlus, FaTrashAlt, FaTicketAlt,
    FaStar, FaCalendarAlt, FaMapMarkerAlt, FaMusic,
    FaAlignLeft, FaArrowLeft, FaLink, FaCheckCircle, FaRegCircle,
    FaChevronDown, FaChevronUp, FaCopy, FaArrowRight, FaClipboardCheck
} from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast'; 

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const CadastroEvento = () => {
    const router = useRouter();

    const [currentStep, setCurrentStep] = useState(1);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [ageRating, setAgeRating] = useState('Livre');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [sellOnPlatform, setSellOnPlatform] = useState(true);
    const [externalUrl, setExternalUrl] = useState(''); 
    const [instagramImportUrl, setInstagramImportUrl] = useState('');
    const [isImportingInsta, setIsImportingInsta] = useState(false);

    const [tickets, setTickets] = useState([
        { name: '', price: '', quantity: '', isFree: false, hasSchedule: false, activityDate: '', startTime: '', endTime: '' }
    ]);
    const [expandedTicketIndex, setExpandedTicketIndex] = useState(0); 
    
    const [requireCustomForm, setRequireCustomForm] = useState(false);
    const [formFields, setFormFields] = useState([
        { id: 1, label: '', type: 'text', required: true }
    ]);

    const [sessions, setSessions] = useState([
        { date: '', time: '', endDate: '', endTime: '', lineup: [] }
    ]);
    
    const [locationName, setLocationName] = useState('');
    const [addressStreet, setAddressStreet] = useState('');
    const [addressNumber, setAddressNumber] = useState('');
    const [addressDistrict, setAddressDistrict] = useState('');
    const [addressCity, setAddressCity] = useState('');
    const [addressState, setAddressState] = useState('');
    const [addressZipCode, setAddressZipCode] = useState('');
    
    const [organizers, setOrganizers] = useState([
        { name: '', instagram: '' }
    ]);
    
    const [isFeaturedRequested, setIsFeaturedRequested] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [loading, setLoading] = useState(false);

    // Captura automática de imagem, descrição e organizador vindos do Bookmarklet do Instagram
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const imgParam = params.get('img');
            const descParam = params.get('desc');
            const orgParam = params.get('org');

            if (imgParam) {
                setImagePreview(decodeURIComponent(imgParam));
            }
            if (descParam) {
                setDescription(decodeURIComponent(descParam));
            }
            if (orgParam) {
                const decodedOrg = decodeURIComponent(orgParam);
                setTitle(decodedOrg); // Preenche o título/nome do bar
                setOrganizers([{ name: decodedOrg, instagram: `@${decodedOrg.toLowerCase().replace(/\s+/g, '')}` }]); // Preenche o organizador
                toast.success(`Dados de @${decodedOrg} importados com sucesso! 🚀`);
            }
        }
    }, []);

    // Se a categoria for "Bares e Entretenimento", desativa automaticamente a venda complexa de ingressos na plataforma
    useEffect(() => {
        if (category === 'Bares e Entretenimento') {
            setSellOnPlatform(false);
        }
    }, [category]);

    useEffect(() => {
        const verifySession = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/auth/me`, {
                    method: 'GET',
                    credentials: 'include'
                });
                if (!res.ok) router.push('/login');
            } catch (error) {
                router.push('/login');
            }
        };
        verifySession();
    }, [router]);

    const handleZipCodeChange = (value) => {
        const cleanValue = value.replace(/\D/g, "");
        const maskedValue = cleanValue.replace(/^(\d{5})(\d)/, "$1-$2").substring(0, 9);
        setAddressZipCode(maskedValue);
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) return toast.error('Imagem muito grande (Máx: 5MB)');
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    // Importação rápida via link do Instagram (oEmbed) para Bares
    const handleImportFromInstagram = async () => {
        if (!instagramImportUrl) return toast.error('Cole o link do post do Instagram.');
        setIsImportingInsta(true);
        try {
            const res = await fetch(`https://graph.facebook.com/v15.0/instagram_oembed?url=${encodeURIComponent(instagramImportUrl)}&omitscript=true`);
            const data = await res.json();
            if (data && data.thumbnail_url) {
                setImagePreview(data.thumbnail_url);
                if (data.title) setDescription(data.title);
                toast.success('Flyer e legenda importados do Instagram com sucesso!');
            } else {
                toast.error('Não foi possível extrair a imagem deste link. Verifique se o post é público.');
            }
        } catch (e) {
            toast.error('Erro ao importar do Instagram.');
        } finally {
            setIsImportingInsta(false);
        }
    };
    
    const handleAddOrganizer = () => setOrganizers([...organizers, { name: '', instagram: '' }]);
    const handleRemoveOrganizer = (index) => {
        if (organizers.length === 1) return toast.error("Mínimo de 1 organizador.");
        setOrganizers(organizers.filter((_, i) => i !== index));
    };
    const handleChangeOrganizer = (index, field, value) => {
        const updated = [...organizers];
        updated[index][field] = value;
        setOrganizers(updated);
    };

    const handleAddSession = () => setSessions([...sessions, { date: '', time: '', endDate: '', endTime: '', lineup: [] }]);
    const handleRemoveSession = (index) => {
        if (sessions.length === 1) return toast.error("Mínimo de 1 data.");
        setSessions(sessions.filter((_, i) => i !== index));
    };
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

    const handleAddFormField = () => setFormFields([...formFields, { id: Date.now(), label: '', type: 'text', required: true }]);
    const handleRemoveFormField = (id) => setFormFields(formFields.filter(f => f.id !== id));
    const handleChangeFormField = (id, field, value) => setFormFields(formFields.map(f => f.id === id ? { ...f, [field]: value } : f));

    const handleAddTicket = () => {
        setTickets([...tickets, { name: '', price: '', quantity: '', isFree: false, hasSchedule: false, activityDate: '', startTime: '', endTime: '' }]);
        setExpandedTicketIndex(tickets.length); 
    };
    const handleDuplicateTicket = (index) => {
        const ticketToCopy = tickets[index];
        const newTicket = { ...ticketToCopy, name: `${ticketToCopy.name} (Cópia)` };
        const updated = [...tickets];
        updated.splice(index + 1, 0, newTicket);
        setTickets(updated);
        setExpandedTicketIndex(index + 1); 
        toast.success('Atividade clonada com sucesso!');
    };
    const handleRemoveTicket = (index) => {
        if (tickets.length === 1) return toast.error("Mínimo de 1 ingresso/atividade.");
        setTickets(tickets.filter((_, i) => i !== index));
        setExpandedTicketIndex(Math.max(0, index - 1)); 
    };
    const handleChangeTicket = (index, field, value) => {
        const updated = [...tickets];
        updated[index][field] = value;
        if (field === 'isFree' && value === true) updated[index].price = '0';
        if (field === 'hasSchedule' && value === false) {
            updated[index].activityDate = '';
            updated[index].startTime = '';
            updated[index].endTime = '';
        }
        setTickets(updated);
    };

    const handleNextStep = () => {
        if (currentStep === 1) {
            if (!imageFile && !imagePreview) return toast.error('Adicione uma capa ou importe do Instagram.');
            if (!title || !category || !description) return toast.error('Preencha as informações principais.');
            for (let org of organizers) {
                if (!org.name) return toast.error('Preencha o nome de todos os organizadores.');
            }
        }
        if (currentStep === 2) {
            if (!locationName || !addressCity) return toast.error('Preencha o local e a cidade.');
            for (let i = 0; i < sessions.length; i++) {
                if (!sessions[i].date || !sessions[i].time) return toast.error(`Preencha data e hora da sessão ${i + 1}`);
            }
        }
        if (currentStep === 3) {
            if (sellOnPlatform) {
                for (let i = 0; i < tickets.length; i++) {
                    if (!tickets[i].name) return toast.error(`Preencha o nome do ingresso ${i + 1}`);
                    if (!tickets[i].isFree && !tickets[i].price) return toast.error(`Preencha o preço do ingresso ${i + 1}`);
                    if (!tickets[i].quantity) return toast.error(`Preencha a quantidade do ingresso ${i + 1}`);
                    if (tickets[i].hasSchedule && (!tickets[i].activityDate || !tickets[i].startTime)) {
                        return toast.error(`Preencha a data e horário da atividade: ${tickets[i].name || i + 1}`);
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!termsAccepted) return toast.error('Você deve confirmar e aceitar os termos.');

        const formData = new FormData();
        
        formData.append('title', title);
        formData.append('description', description);
        formData.append('category', category);
        formData.append('ageRating', ageRating);
        if (imageFile) {
            formData.append('image', imageFile);
        } else if (imagePreview) {
            formData.append('imageUrl', imagePreview); 
        }

        formData.append('sellOnPlatform', sellOnPlatform);
        if (!sellOnPlatform) {
            formData.append('externalUrl', externalUrl);
            formData.append('isInformational', 'true');
            formData.append('formSchema', '[]');
        } else {
            formData.append('externalUrl', '');
            formData.append('isInformational', 'false');

            const formattedTickets = tickets.map(t => {
                const parsedPrice = parseFloat(t.price.toString().replace(',', '.'));
                return {
                    name: t.name,
                    price: t.isFree ? 0 : Math.round(parsedPrice * 100),
                    quantity: parseInt(t.quantity),
                    isFree: t.isFree,
                    hasSchedule: Boolean(t.hasSchedule),
                    activityDate: t.hasSchedule && t.activityDate ? t.activityDate : null,
                    startTime: t.hasSchedule ? t.startTime : null,
                    endTime: t.hasSchedule ? t.endTime : null,
                    batch: 'Lote Único',
                    category: 'Inteira',
                    maxPerUser: 4
                };
            });
            
            formData.append('tickets', JSON.stringify(formattedTickets));

            let finalSchema = [];
            if (requireCustomForm) {
                finalSchema = formFields.filter(f => f.label.trim() !== '');
            }
            formData.append('formSchema', JSON.stringify(finalSchema));
        }

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

        if (formattedSessions.length > 0) formData.append('date', formattedSessions[0].date);
        formData.append('sessions', JSON.stringify(formattedSessions));
        
        formData.append('location', locationName);
        formData.append('city', addressCity);
        formData.append('address', JSON.stringify({
            street: addressStreet, number: addressNumber, district: addressDistrict,
            city: addressCity, state: addressState, zipCode: addressZipCode
        }));
        
        formData.append('organizerInfo', JSON.stringify(organizers));
        formData.append('isFeaturedRequested', isFeaturedRequested ? 'true' : 'false');

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/events`, {
                method: 'POST',
                credentials: 'include', 
                body: formData,
            });

            if (res.status === 401) {
                toast.error('Sessão expirada. Faça login novamente.');
                router.push('/login');
                return;
            }

            if (!res.ok) throw new Error('Erro ao criar evento.');
            
            toast.success('Publicado na Agenda Cultural!');
            setTimeout(() => router.push('/dashboard'), 1500); 
        } catch (err) {
            toast.error(err.message);
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
                        <FaArrowLeft /> Cancelar
                    </button>
                    <h1>{category === 'Bares e Entretenimento' ? 'Cadastrar Programação de Bar' : 'Cadastrar Novo Evento'}</h1>
                    <p>{category === 'Bares e Entretenimento' ? 'Modo Rápido: Publique o line-up ou flyer do seu estabelecimento.' : 'Siga os passos abaixo para configurar seu evento.'}</p>
                </div>

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
                                <div className={styles.inputGroup} style={{marginBottom: '25px'}}>
                                    <label className={styles.label}>Categoria Principal</label>
                                    <select className={styles.select} value={category || ''} onChange={e=>setCategory(e.target.value)} required>
                                        <option value="">Selecione...</option>
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

                                {/* ATALHO DE IMPORTAÇÃO INSTAGRAM PARA BARES */}
                                {category === 'Bares e Entretenimento' && (
                                    <div style={{ background: '#faf5ff', border: '1px dashed #7c3aed', padding: '20px', borderRadius: '12px', marginBottom: '25px' }}>
                                        <h4 style={{ color: '#6d28d9', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <FaInstagram /> Importar Flyer Direto do Instagram
                                        </h4>
                                        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '12px' }}>
                                            Cole o link do post do Instagram do seu bar para puxar a arte do flyer automaticamente.
                                        </p>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <input 
                                                className={styles.input} 
                                                placeholder="https://www.instagram.com/p/..." 
                                                value={instagramImportUrl} 
                                                onChange={e => setInstagramImportUrl(e.target.value)} 
                                            />
                                            <button 
                                                type="button" 
                                                onClick={handleImportFromInstagram} 
                                                disabled={isImportingInsta}
                                                style={{ background: '#7c3aed', color: '#fff', border: 'none', padding: '0 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                            >
                                                {isImportingInsta ? 'Puxando...' : 'Importar'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className={styles.cardHeader}><div className={styles.iconWrapper}><FaImage /></div><h3>Design e Descrição</h3></div>
                                <div className={styles.uploadSection}>
                                    <div className={styles.uploadBox} onClick={() => document.getElementById('imageUpload').click()}>
                                        {imagePreview ? <img src={imagePreview} className={styles.imagePreview} alt="Capa" /> : <div className={styles.uploadPlaceholder}><FaImage size={48} /><span>Carregar Capa ou Flyer</span></div>}
                                    </div>
                                    <input type="file" id="imageUpload" accept="image/*" onChange={handleImageUpload} hidden />
                                </div>
                                <div className={styles.gridTwo}>
                                    <div className={styles.inputGroupFull} style={{gridColumn:'span 2'}}>
                                        <label className={styles.label}>{category === 'Bares e Entretenimento' ? 'Nome do Estabelecimento / Bar' : 'Título do Evento'}</label>
                                        <div className={styles.inputWrapper}><FaAlignLeft className={styles.inputIcon}/><input className={styles.input} value={title || ''} onChange={e=>setTitle(e.target.value)} required placeholder={category === 'Bares e Entretenimento' ? 'Ex: Bar do Zé' : 'Ex: Festival de Música'}/></div>
                                    </div>
                                    <div className={styles.inputGroupFull} style={{gridColumn:'span 2'}}>
                                        <label className={styles.label}>Descrição / Programação</label>
                                        <textarea className={styles.textarea} value={description || ''} onChange={e=>setDescription(e.target.value)} required placeholder={category === 'Bares e Entretenimento' ? 'Happy hour, atrações da semana, promoções...' : 'Detalhes completos do evento...'}/>
                                    </div>
                                    {category !== 'Bares e Entretenimento' && (
                                        <div className={styles.inputGroup}>
                                            <label className={styles.label}>Classificação Etária</label>
                                            <select className={styles.select} value={ageRating || 'Livre'} onChange={e=>setAgeRating(e.target.value)}><option>Livre</option><option>12+</option><option>14+</option><option>16+</option><option>18+</option></select>
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section className={styles.card}>
                                <div className={styles.cardHeader}><div className={styles.iconWrapper}><FaInstagram /></div><h3>{category === 'Bares e Entretenimento' ? 'Responsável / Estabelecimento' : 'Produtor(es) Organizador(es)'}</h3></div>
                                
                                {organizers.map((org, index) => (
                                    <div key={index} style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: index < organizers.length - 1 ? '1px dashed #e2e8f0' : 'none' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                            <h4 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>Organizador #{index + 1}</h4>
                                            {organizers.length > 1 && (
                                                <button type="button" onClick={() => handleRemoveOrganizer(index)} className={styles.trashBtn} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                                                    <FaTrashAlt />
                                                </button>
                                            )}
                                        </div>
                                        <div className={styles.gridTwo}>
                                            <div className={styles.inputGroup}>
                                                <label className={styles.label}>Nome</label>
                                                <input className={styles.input} placeholder="Ex: Bar do Zé" value={org.name} onChange={e => handleChangeOrganizer(index, 'name', e.target.value)} required />
                                            </div>
                                            <div className={styles.inputGroup}>
                                                <label className={styles.label}>Instagram (Opcional)</label>
                                                <div className={styles.inputWrapper}>
                                                    <FaInstagram className={styles.inputIcon} />
                                                    <input className={styles.input} placeholder="@instagram" value={org.instagram} onChange={e => handleChangeOrganizer(index, 'instagram', e.target.value)} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {category !== 'Bares e Entretenimento' && (
                                    <button type="button" onClick={handleAddOrganizer} className={styles.addBtnSmall} style={{ marginTop: '10px' }}>
                                        <FaPlus /> Adicionar outro organizador
                                    </button>
                                )}
                            </section>
                        </div>
                    )}

                    {/* ================= PASSO 2 ================= */}
                    {currentStep === 2 && (
                        <div className="wizard-step animate-fade-in">
                            <section className={styles.card}>
                                <div className={styles.cardHeader}><div className={styles.iconWrapper}><FaCalendarAlt /></div><h3>{category === 'Bares e Entretenimento' ? 'Dias de Funcionamento / Atrações' : 'Agenda de Realização'}</h3></div>
                                {sessions.map((s,i)=>(
                                    <div key={i} className={styles.sessionCard}>
                                        <div className={styles.sessionHeader}><h4>Sessão / Data #{i+1}</h4>{sessions.length>1 && <button type="button" onClick={()=>handleRemoveSession(i)} className={styles.trashBtn}><FaTrashAlt/></button>}</div>
                                        <div className={styles.gridTwo}>
                                            <div className={styles.inputGroup}><label className={styles.label}>Início (Abertura)</label><div className={styles.gridDateTime}><input type="date" className={styles.input} value={s.date || ''} onChange={e=>handleChangeSession(i,'date',e.target.value)} required/><input type="time" className={styles.input} value={s.time || ''} onChange={e=>handleChangeSession(i,'time',e.target.value)} required/></div></div>
                                            <div className={styles.inputGroup}><label className={styles.label}>Fim (Encerramento - Opcional)</label><div className={styles.gridDateTime}><input type="date" className={styles.input} value={s.endDate || ''} onChange={e=>handleChangeSession(i,'endDate',e.target.value)}/><input type="time" className={styles.input} value={s.endTime || ''} onChange={e=>handleChangeSession(i,'endTime',e.target.value)}/></div></div>
                                        </div>
                                    </div>
                                ))}
                                <button type="button" onClick={handleAddSession} className={styles.addBtnSmall}><FaPlus /> Adicionar nova data</button>
                            </section>

                            <section className={styles.card}>
                                <div className={styles.cardHeader}><div className={styles.iconWrapper}><FaMapMarkerAlt /></div><h3>Endereço</h3></div>
                                <div className={styles.inputGroupFull}><label className={styles.label}>Nome do Local / Estabelecimento</label><div className={styles.inputWrapper}><FaMapMarkerAlt className={styles.inputIcon}/><input className={styles.input} value={locationName || ''} onChange={e=>setLocationName(e.target.value)} required placeholder="Ex: Bar do Zé"/></div></div>
                                <div className={styles.gridAddressTop}>
                                    <div className={styles.inputGroup}><label className={styles.label}>CEP</label><input className={styles.input} value={addressZipCode || ''} onChange={e=>handleZipCodeChange(e.target.value)} required placeholder="00000-000"/></div>
                                    <div className={styles.inputGroup}><label className={styles.label}>Cidade</label><input className={styles.input} value={addressCity || ''} onChange={e=>setAddressCity(e.target.value)} required/></div>
                                    <div className={styles.inputGroup}><label className={styles.label}>UF</label><input className={styles.input} value={addressState || ''} onChange={e=>setAddressState(e.target.value)} maxLength={2} required/></div>
                                </div>
                                <div className={styles.gridAddressStreet}>
                                    <div className={styles.inputGroup}><label className={styles.label}>Rua / Logradouro</label><input className={styles.input} value={addressStreet || ''} onChange={e=>setAddressStreet(e.target.value)}/></div>
                                    <div className={styles.inputGroup}><label className={styles.label}>Nº</label><input className={styles.input} value={addressNumber || ''} onChange={e=>setAddressNumber(e.target.value)}/></div>
                                </div>
                                <div className={styles.inputGroup}><label className={styles.label}>Bairro</label><input className={styles.input} value={addressDistrict || ''} onChange={e=>setAddressDistrict(e.target.value)}/></div>
                            </section>
                        </div>
                    )}

                    {/* ================= PASSO 3 ================= */}
                    {currentStep === 3 && (
                        <div className="wizard-step animate-fade-in">
                            {category === 'Bares e Entretenimento' && (
                                <section className={styles.card} style={{ marginBottom: '30px', border: '2px solid #4c01b5' }}>
                                    <div className={styles.cardHeader}>
                                        <div className={styles.iconWrapper} style={{ background: '#4c01b5', color: '#fff' }}><FaMusic /></div>
                                        <h3 style={{ color: '#4c01b5' }}>Programação de Atrações (Line-up)</h3>
                                    </div>
                                    <p style={{fontSize: '0.9rem', color: '#64748b', marginBottom: '20px'}}>
                                        Defina quem vai tocar em cada data. Isso vai gerar a vitrine de shows ao vivo do bar!
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
                                                        placeholder="Nome da Atração (Ex: Banda X)" 
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
                                                    <button type="button" onClick={() => handleRemoveLineup(sIndex, aIndex)} className={styles.trashBtn} title="Remover Artista">
                                                        <FaTrashAlt />
                                                    </button>
                                                </div>
                                            ))}
                                            
                                            <button 
                                                type="button" 
                                                onClick={() => handleAddLineup(sIndex)} 
                                                style={{ background: 'none', border: '1px dashed #4c01b5', color: '#4c01b5', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px' }}
                                            >
                                                <FaPlus /> Adicionar Atração neste dia
                                            </button>
                                        </div>
                                    ))}
                                </section>
                            )}

                            <section className={styles.card}>
                                <div className={styles.cardHeader}>
                                    <div className={styles.iconWrapper}><FaTicketAlt /></div>
                                    <h3>{category === 'Bares e Entretenimento' ? 'Link de Reservas / Redirecionamento' : 'Gestão de Ingressos e Reservas'}</h3>
                                </div>
                                
                                {category !== 'Bares e Entretenimento' && (
                                    <div className={styles.infoSwitchContainer}>
                                        <label className={styles.switch}>
                                            <input className={styles.hiddenCheckbox} type="checkbox" checked={sellOnPlatform} onChange={e => setSellOnPlatform(e.target.checked)} />
                                            <span className={styles.slider}></span>
                                        </label>
                                        <div>
                                            <strong style={{display: 'block', color: '#0f172a'}}>Gerar Ingressos / Lista VIP pela Vibz</strong>
                                            <span style={{fontSize: '0.85rem', color: '#64748b'}}>Desmarque se for usar o evento apenas como vitrine de informações ou usar link externo.</span>
                                        </div>
                                    </div>
                                )}

                                {!sellOnPlatform ? (
                                    <div className={styles.inputGroupFull} style={{marginTop: '20px', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0'}}>
                                        <label className={styles.label}>{category === 'Bares e Entretenimento' ? 'Link do Instagram, WhatsApp para Reservas ou Cardápio' : 'Link de Vendas, Reservas ou Instagram (Opcional)'}</label>
                                        <div className={styles.inputWrapper}>
                                            <FaLink className={styles.inputIcon}/>
                                            <input className={styles.input} type="url" value={externalUrl || ''} onChange={e=>setExternalUrl(e.target.value)} placeholder="https://..." />
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{marginTop: '25px', display: 'flex', flexDirection: 'column', gap: '15px'}}>
                                        {tickets.map((t, index) => {
                                            const isExpanded = expandedTicketIndex === index;
                                            return (
                                                <div key={index} style={{ backgroundColor: isExpanded ? '#fff' : '#f8fafc', border: `1px solid ${isExpanded ? '#4c01b5' : '#e2e8f0'}`, borderRadius: '12px', overflow: 'hidden', transition: 'all 0.3s ease', boxShadow: isExpanded ? '0 10px 15px -3px rgba(76,1,181,0.1)' : 'none' }}>
                                                    
                                                    <div 
                                                        onClick={() => setExpandedTicketIndex(isExpanded ? -1 : index)}
                                                        style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none' }}
                                                    >
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            <strong style={{ color: '#0f172a', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <FaTicketAlt color="#4c01b5" /> {t.name || `Atividade #${index + 1}`}
                                                            </strong>
                                                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                                {t.isFree ? 'Gratuito' : t.price ? `R$ ${t.price}` : 'Preço não definido'} • {t.quantity ? `${t.quantity} vagas` : 'Vagas não definidas'}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            {isExpanded ? <FaChevronUp color="#94a3b8" /> : <FaChevronDown color="#94a3b8" />}
                                                        </div>
                                                    </div>

                                                    {isExpanded && (
                                                        <div style={{ padding: '20px', backgroundColor: '#fff' }}>
                                                            <div className={styles.gridTwo}>
                                                                <div className={styles.inputGroupFull} style={{gridColumn: 'span 2'}}>
                                                                    <label className={styles.label}>Nome do Ingresso / Reserva</label>
                                                                    <input className={styles.input} value={t.name} onChange={e => handleChangeTicket(index, 'name', e.target.value)} placeholder="Ex: Entrada VIP ou Reserva de Mesa" required />
                                                                </div>
                                                                
                                                                <div className={styles.inputGroup}>
                                                                    <label className={styles.label}>Vagas / Quantidade</label>
                                                                    <input type="number" min="1" className={styles.input} value={t.quantity} onChange={e => handleChangeTicket(index, 'quantity', e.target.value)} required placeholder="Ex: 50" />
                                                                </div>

                                                                <div className={styles.inputGroup}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                                        <label className={styles.label} style={{ margin: 0 }}>Valor</label>
                                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#10b981', fontWeight: 'bold', cursor: 'pointer' }}>
                                                                            <input type="checkbox" checked={t.isFree} onChange={e => handleChangeTicket(index, 'isFree', e.target.checked)} style={{ accentColor: '#10b981', cursor: 'pointer' }} />
                                                                            Gratuito / Lista Free
                                                                        </label>
                                                                    </div>
                                                                    {!t.isFree ? (
                                                                        <input type="number" step="0.01" min="0" className={styles.input} value={t.price} onChange={e => handleChangeTicket(index, 'price', e.target.value)} required placeholder="R$ 0,00" />
                                                                    ) : (
                                                                        <div style={{ padding: '12px', background: '#f0fdf4', border: '1px dashed #86efac', borderRadius: '10px', color: '#166534', fontSize: '0.9rem', textAlign: 'center', fontWeight: '600' }}>R$ 0,00 (Sem Custo)</div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
                                                                <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600', color: '#4c01b5'}}>
                                                                    <input type="checkbox" checked={t.hasSchedule || false} onChange={e => handleChangeTicket(index, 'hasSchedule', e.target.checked)} style={{cursor: 'pointer', accentColor: '#4c01b5'}}/>
                                                                    Esta venda possui data/horário exclusivo?
                                                                </label>
                                                                {t.hasSchedule && (
                                                                    <div style={{marginTop: '15px', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '10px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '15px'}}>
                                                                        <div><label style={{fontSize: '0.75rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px'}}>DATA EXATA</label><input type="date" className={styles.input} value={t.activityDate || ''} onChange={e => handleChangeTicket(index, 'activityDate', e.target.value)} required/></div>
                                                                        <div><label style={{fontSize: '0.75rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px'}}>INÍCIO</label><input type="time" className={styles.input} value={t.startTime || ''} onChange={e => handleChangeTicket(index, 'startTime', e.target.value)} required/></div>
                                                                        <div><label style={{fontSize: '0.75rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px'}}>TÉRMINO</label><input type="time" className={styles.input} value={t.endTime || ''} onChange={e => handleChangeTicket(index, 'endTime', e.target.value)}/></div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                                                                {tickets.length > 1 && (
                                                                    <button type="button" onClick={() => handleRemoveTicket(index)} style={{ padding: '8px 12px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                                                                        <FaTrashAlt /> Remover
                                                                    </button>
                                                                )}
                                                                <button type="button" onClick={() => handleDuplicateTicket(index)} style={{ padding: '8px 15px', background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', transition: '0.2s' }}>
                                                                    <FaCopy /> Duplicar e Alterar Horário
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        
                                        <button type="button" onClick={handleAddTicket} style={{width: '100%', padding: '16px', borderRadius: '12px', border: '2px dashed #a78bfa', background: 'rgba(76, 1, 181, 0.05)', color: '#4c01b5', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: '0.2s'}}>
                                            <FaPlus /> Adicionar Novo Lote / Ingresso Zerado
                                        </button>
                                    </div>
                                )}
                            </section>
                        </div>
                    )}

                    {/* ================= PASSO 4 ================= */}
                    {currentStep === 4 && (
                        <div className="wizard-step animate-fade-in">
                            <section className={styles.card}>
                                <div className={styles.cardHeader}><div className={styles.iconWrapper}><FaStar /></div><h3>Destaque e Revisão</h3></div>
                                
                                <div style={{padding: '0 0 20px 0'}}>
                                    <div onClick={() => setIsFeaturedRequested(!isFeaturedRequested)} style={{border: isFeaturedRequested ? '2px solid #F59E0B' : '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', cursor: 'pointer', background: isFeaturedRequested ? '#FFFBEB' : '#fff', transition: '0.2s'}}>
                                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                            <strong style={{color: isFeaturedRequested ? '#B45309' : '#64748b'}}>Solicitar Selo de Evento / Bar Patrocinado</strong>
                                            {isFeaturedRequested ? <FaCheckCircle size={24} color="#F59E0B"/> : <FaRegCircle size={24} color="#cbd5e1"/>}
                                        </div>
                                        <p style={{fontSize:'0.85rem', color:'#64748b', marginTop:'10px', marginBottom: 0}}>Aparecerá nos grandes banners rotativos no topo da agenda.</p>
                                    </div>
                                </div>

                                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <h4 style={{ margin: '0 0 15px', color: '#0f172a' }}>Resumo do Cadastro</h4>
                                    <ul style={{ margin: 0, paddingLeft: '20px', color: '#475569', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <li><strong>Título / Estabelecimento:</strong> {title || '-'}</li>
                                        <li><strong>Categoria:</strong> {category || '-'}</li>
                                        <li><strong>Local:</strong> {locationName || '-'}</li>
                                        <li><strong>Sessões cadastradas:</strong> {sessions.length}</li>
                                        <li><strong>Modelo:</strong> {sellOnPlatform ? 'Com Ingressos / Reservas Vibz' : 'Vitrine / Link Externo'}</li>
                                    </ul>
                                </div>
                            </section>

                            <div className={styles.footer} style={{ marginTop: '30px' }}>
                                <div className={styles.termsBox} style={{ background: '#fff', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                                    <label style={{display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', margin: 0}}>
                                        <input className={styles.checkbox} type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} style={{ marginTop: '4px' }} />
                                        <span style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.5 }}>
                                            Confirmo que as informações estão corretas e estou ciente das políticas de publicação da plataforma Vibz.
                                        </span>
                                    </label>
                                </div>
                                <button onClick={handleSubmit} className={styles.submitButton} disabled={loading || !termsAccepted} style={{ width: '100%', padding: '18px', fontSize: '1.1rem', background: termsAccepted ? '#10b981' : '#cbd5e1' }}>
                                    {loading ? 'PUBLICANDO...' : <><FaClipboardCheck /> CONFIRMAR E PUBLICAR</>}
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

export default CadastroEvento;