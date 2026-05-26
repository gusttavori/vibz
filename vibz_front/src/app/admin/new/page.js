'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header'; 
import Link from 'next/link';
import styles from './CadastroEvento.module.css';
import { 
    FaImage, FaInstagram, FaPlus, FaTrashAlt, 
    FaStar, FaCalendarAlt, FaMapMarkerAlt,
    FaAlignLeft, FaArrowLeft, FaLink, FaCheckCircle, FaRegCircle
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
    const [externalUrl, setExternalUrl] = useState(''); // Novo Campo para Link Oficial
    
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
    
    const [isFeaturedRequested, setIsFeaturedRequested] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleZipCodeChange = (value) => {
        const cleanValue = value.replace(/\D/g, "");
        const maskedValue = cleanValue.replace(/^(\d{5})(\d)/, "$1-$2").substring(0, 9);
        setAddressZipCode(maskedValue);
    };

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('userToken')?.replace(/"/g, '');

        if (!imageFile) return toast.error('Adicione uma capa para o evento.');
        if (!termsAccepted) return toast.error('Você deve aceitar os termos.');
        if (!category) return toast.error('Selecione uma categoria.');
        
        for (let i = 0; i < sessions.length; i++) {
            if (!sessions[i].date || !sessions[i].time) return toast.error(`Preencha data e hora da sessão ${i + 1}`);
        }

        setLoading(true);
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('category', category);
        formData.append('ageRating', ageRating);
        formData.append('image', imageFile);
        formData.append('externalUrl', externalUrl); 

        const formattedSessions = sessions.map(s => {
            let isoStart = null;
            try { isoStart = new Date(`${s.date}T${s.time}:00`).toISOString(); } catch(e) {}
            return { date: isoStart || s.date };
        });
        if (formattedSessions.length > 0) formData.append('date', formattedSessions[0].date);
        formData.append('sessions', JSON.stringify(formattedSessions));
        
        formData.append('location', locationName);
        formData.append('city', addressCity);
        formData.append('address', JSON.stringify({
            street: addressStreet, number: addressNumber, district: addressDistrict,
            city: addressCity, state: addressState, zipCode: addressZipCode
        }));
        
        formData.append('organizerInfo', JSON.stringify({ name: organizerName, instagram: organizerInstagram }));
        formData.append('isFeaturedRequested', isFeaturedRequested ? 'true' : 'false');
        formData.append('isInformational', 'true');

        try {
            const res = await fetch(`${API_BASE_URL}/events`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });
            if (!res.ok) throw new Error('Erro ao criar evento.');
            toast.success('Evento publicado na Agenda Cultural!');
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
                        <FaArrowLeft /> Voltar
                    </button>
                    <h1>Cadastrar Evento na Agenda</h1>
                    <p>Adicione um novo evento ao catálogo da Vibz.</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.formContainer}>
                    <section className={styles.card}>
                        <div className={styles.cardHeader}><div className={styles.iconWrapper}><FaImage /></div><h3>Informações Principais</h3></div>
                        <div className={styles.uploadSection}>
                            <div className={styles.uploadBox} onClick={() => document.getElementById('imageUpload').click()}>
                                {imagePreview ? <img src={imagePreview} className={styles.imagePreview} alt="Capa" /> : <div className={styles.uploadPlaceholder}><FaImage size={48} /><span>Carregar Capa (Obrigatório)</span></div>}
                            </div>
                            <input type="file" id="imageUpload" accept="image/*" onChange={handleImageUpload} hidden />
                        </div>
                        <div className={styles.gridTwo}>
                            <div className={styles.inputGroupFull} style={{gridColumn:'span 2'}}>
                                <label className={styles.label}>Nome do Evento</label>
                                <div className={styles.inputWrapper}><FaAlignLeft className={styles.inputIcon}/><input className={styles.input} value={title || ''} onChange={e=>setTitle(e.target.value)} required placeholder="Ex: Festival de Música ou Workshop Profissional"/></div>
                            </div>
                            <div className={styles.inputGroupFull} style={{gridColumn:'span 2'}}>
                                <label className={styles.label}>Descrição Completa</label>
                                <textarea className={styles.textarea} value={description || ''} onChange={e=>setDescription(e.target.value)} required placeholder="Detalhes, atrações, cronograma..."/>
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Categoria</label>
                                <select className={styles.select} value={category || ''} onChange={e=>setCategory(e.target.value)} required>
                                    <option value="">Selecione...</option>
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
                                <select className={styles.select} value={ageRating || 'Livre'} onChange={e=>setAgeRating(e.target.value)}><option>Livre</option><option>12+</option><option>14+</option><option>16+</option><option>18+</option></select>
                            </div>
                            <div className={styles.inputGroupFull} style={{gridColumn:'span 2'}}>
                                <label className={styles.label}>Link Oficial de Vendas / Mais Informações</label>
                                <div className={styles.inputWrapper}><FaLink className={styles.inputIcon}/><input className={styles.input} type="url" value={externalUrl || ''} onChange={e=>setExternalUrl(e.target.value)} placeholder="https://sympla.com.br/... (Opcional)"/></div>
                            </div>
                        </div>
                    </section>

                    <section className={styles.card}>
                        <div className={styles.cardHeader}><div className={styles.iconWrapper}><FaCalendarAlt /></div><h3>Data e Local</h3></div>
                        {sessions.map((s,i)=>(
                            <div key={i} className={styles.sessionCard}>
                                <div className={styles.sessionHeader}><h4>Sessão #{i+1}</h4>{sessions.length>1 && <button type="button" onClick={()=>handleRemoveSession(i)} className={styles.trashBtn}><FaTrashAlt/></button>}</div>
                                <div className={styles.gridTwo}>
                                    <div className={styles.inputGroup}><label className={styles.label}>Início</label><div className={styles.gridDateTime}><input type="date" className={styles.input} value={s.date || ''} onChange={e=>handleChangeSession(i,'date',e.target.value)} required/><input type="time" className={styles.input} value={s.time || ''} onChange={e=>handleChangeSession(i,'time',e.target.value)} required/></div></div>
                                    <div className={styles.inputGroup}><label className={styles.label}>Fim (Opcional)</label><div className={styles.gridDateTime}><input type="date" className={styles.input} value={s.endDate || ''} onChange={e=>handleChangeSession(i,'endDate',e.target.value)}/><input type="time" className={styles.input} value={s.endTime || ''} onChange={e=>handleChangeSession(i,'endTime',e.target.value)}/></div></div>
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={handleAddSession} className={styles.addBtnSmall}><FaPlus /> Adicionar nova data</button>
                        <div className={styles.divider}></div>
                        <div className={styles.inputGroupFull}><label className={styles.label}>Nome do Local</label><div className={styles.inputWrapper}><FaMapMarkerAlt className={styles.inputIcon}/><input className={styles.input} value={locationName || ''} onChange={e=>setLocationName(e.target.value)} required placeholder="Ex: Parque de Exposições"/></div></div>
                        <div className={styles.gridAddressTop}>
                            <div className={styles.inputGroup}><label className={styles.label}>CEP</label><input className={styles.input} value={addressZipCode || ''} onChange={e=>handleZipCodeChange(e.target.value)} required placeholder="00000-000"/></div>
                            <div className={styles.inputGroup}><label className={styles.label}>Cidade</label><input className={styles.input} value={addressCity || ''} onChange={e=>setAddressCity(e.target.value)} required/></div>
                            <div className={styles.inputGroup}><label className={styles.label}>UF</label><input className={styles.input} value={addressState || ''} onChange={e=>setAddressState(e.target.value)} maxLength={2} required/></div>
                        </div>
                        <div className={styles.gridAddressStreet}>
                            <div className={styles.inputGroup}><label className={styles.label}>Rua</label><input className={styles.input} value={addressStreet || ''} onChange={e=>setAddressStreet(e.target.value)}/></div>
                            <div className={styles.inputGroup}><label className={styles.label}>Nº</label><input className={styles.input} value={addressNumber || ''} onChange={e=>setAddressNumber(e.target.value)}/></div>
                        </div>
                        <div className={styles.inputGroup}><label className={styles.label}>Bairro</label><input className={styles.input} value={addressDistrict || ''} onChange={e=>setAddressDistrict(e.target.value)}/></div>
                    </section>

                    <section className={styles.card}>
                        <div className={styles.cardHeader}><div className={styles.iconWrapper}><FaInstagram /></div><h3>Produtor Original</h3></div>
                        <div className={styles.gridTwo}>
                            <div className={styles.inputGroup}><label className={styles.label}>Nome do Produtor</label><input className={styles.input} placeholder="Ex: Festa Boa Produções" value={organizerName || ''} onChange={e=>setOrganizerName(e.target.value)} required/></div>
                            <div className={styles.inputGroup}><label className={styles.label}>Instagram (Opcional)</label><div className={styles.inputWrapper}><FaInstagram className={styles.inputIcon}/><input className={styles.input} placeholder="@instagram" value={organizerInstagram || ''} onChange={e=>setOrganizerInstagram(e.target.value)}/></div></div>
                        </div>
                    </section>

                    <section className={styles.card}>
                        <div className={styles.cardHeader}><div className={styles.iconWrapper}><FaStar /></div><h3>Destaque</h3></div>
                        <div style={{padding: '20px'}}>
                            <div onClick={() => setIsFeaturedRequested(!isFeaturedRequested)} style={{border: isFeaturedRequested ? '2px solid #F59E0B' : '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', cursor: 'pointer', background: isFeaturedRequested ? '#FFFBEB' : '#fff', transition: '0.2s'}}>
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                    <strong style={{color: isFeaturedRequested ? '#B45309' : '#64748b'}}>Marcar como Evento Patrocinado</strong>
                                    {isFeaturedRequested ? <FaCheckCircle color="#B45309"/> : <FaRegCircle color="#cbd5e1"/>}
                                </div>
                                <p style={{fontSize:'0.85rem', color:'#64748b', marginTop:'10px'}}>Este evento aparecerá no topo da agenda e com selo de destaque.</p>
                            </div>
                        </div>
                    </section>

                    <div className={styles.footer}>
                        <div className={styles.termsBox}>
                            <input className={styles.checkbox} type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} />
                            <label style={{marginLeft: '10px'}}>Confirmo que as informações estão corretas e podem ser publicadas.</label>
                        </div>
                        <button type="submit" className={styles.submitButton} disabled={loading}>{loading ? 'Salvando...' : 'PUBLICAR NA AGENDA'}</button>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default CadastroEvento;