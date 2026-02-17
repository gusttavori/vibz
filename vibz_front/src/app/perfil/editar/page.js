'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { FaCamera, FaLock, FaChevronDown, FaChevronUp, FaSave, FaTimes } from 'react-icons/fa'; 
import toast, { Toaster } from 'react-hot-toast';
import './EditProfile.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const EditProfile = () => {
    const router = useRouter();

    const [userData, setUserData] = useState({ 
        name: '', 
        bio: '', 
        profilePicture: '', 
        coverPicture: '' 
    });
    
    // Estados para lógica de Senha
    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const [passwords, setPasswords] = useState({ new: '', confirm: '' });
    
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Armazena os arquivos reais para envio
    const [files, setFiles] = useState({ profile: null, cover: null });

    // --- CARREGAR DADOS ---
    useEffect(() => {
        const fetchUserData = async () => {
            if (typeof window === 'undefined') return;

            const token = localStorage.getItem('userToken');
            if (!token) {
                router.push('/login');
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/users/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) {
                    if (response.status === 401) {
                        localStorage.removeItem('userToken');
                        router.push('/login');
                        return;
                    }
                    throw new Error('Falha ao carregar perfil.');
                }

                const data = await response.json();
                const user = data.user || data;

                setUserData({
                    name: user.name || '',
                    bio: user.bio || '',
                    profilePicture: user.profilePicture || '',
                    coverPicture: user.coverPicture || ''
                });
            } catch (err) {
                toast.error("Erro ao carregar dados do usuário.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [router]);

    // --- HANDLERS ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setUserData(prev => ({ ...prev, [name]: value }));
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswords(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        // Preview imediato
        const reader = new FileReader();
        reader.onload = (event) => {
            if (type === 'profile') {
                setFiles(prev => ({ ...prev, profile: file }));
                setUserData(prev => ({ ...prev, profilePicture: event.target.result }));
            } else {
                setFiles(prev => ({ ...prev, cover: file }));
                setUserData(prev => ({ ...prev, coverPicture: event.target.result }));
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const token = localStorage.getItem('userToken');
        const formData = new FormData();

        formData.append('name', userData.name);
        formData.append('bio', userData.bio);
        
        if (files.profile) formData.append('profilePicture', files.profile);
        if (files.cover) formData.append('coverPicture', files.cover);

        // Validação de Senha
        if (showPasswordSection && passwords.new) {
            if (passwords.new.length < 6) {
                toast.error('A nova senha deve ter no mínimo 6 caracteres.');
                setIsSubmitting(false);
                return;
            }
            if (passwords.new !== passwords.confirm) {
                toast.error('As senhas não coincidem.');
                setIsSubmitting(false);
                return;
            }
            formData.append('password', passwords.new);
        }

        try {
            const response = await fetch(`${API_BASE_URL}/users/me`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }, // Não setar Content-Type com FormData
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Falha ao atualizar.');
            }

            toast.success('Perfil atualizado com sucesso!');
            
            // Limpa form de senha
            setPasswords({ new: '', confirm: '' });
            setShowPasswordSection(false);
            
            // Opcional: Redirecionar após sucesso
            // setTimeout(() => router.push('/perfil'), 1500);

        } catch (err) {
            toast.error(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (loading) return <div className="loading-screen-centered"><div className="spinner"></div></div>;
    
    return (
        <div className="page-wrapper">
            <Toaster position="top-center" />
            <Header/>
            
            <div className="edit-profile-content">
                <div className="edit-card">
                    <div className="edit-header">
                        <h1>Editar Perfil</h1>
                        <p>Atualize suas informações e personalize sua conta.</p>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="edit-form">
                        
                        {/* ÁREA DE IMAGENS */}
                        <div className="images-section">
                            {/* Capa */}
                            <div className="cover-wrapper">
                                {userData.coverPicture ? (
                                    <img src={userData.coverPicture} alt="Capa" className="cover-img" />
                                ) : (
                                    <div className="default-cover"></div>
                                )}
                                <label className="upload-btn cover-btn">
                                    <FaCamera /> <span>Editar Capa</span>
                                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'cover')} hidden />
                                </label>
                            </div>
                            
                            {/* Avatar */}
                            <div className="avatar-wrapper">
                                <img 
                                    src={userData.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=random&color=fff`} 
                                    alt="Perfil" 
                                    className="avatar-img" 
                                />
                                <label className="upload-btn avatar-btn">
                                    <FaCamera />
                                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'profile')} hidden />
                                </label>
                            </div>
                        </div>

                        {/* CAMPOS DE TEXTO */}
                        <div className="fields-container">
                            <div className="input-group">
                                <label>Nome Completo</label>
                                <input 
                                    type="text" 
                                    name="name" 
                                    value={userData.name} 
                                    onChange={handleChange} 
                                    required 
                                    placeholder="Ex: Gustavo Ricardo"
                                />
                            </div>

                            <div className="input-group">
                                <label>Biografia</label>
                                <textarea 
                                    name="bio" 
                                    value={userData.bio} 
                                    onChange={handleChange} 
                                    rows="4"
                                    placeholder="Conte um pouco sobre você..."
                                ></textarea>
                            </div>

                            {/* SEÇÃO DE SENHA (ACCORDION) */}
                            <div className="password-section">
                                <button 
                                    type="button" 
                                    className={`toggle-password ${showPasswordSection ? 'active' : ''}`}
                                    onClick={() => setShowPasswordSection(!showPasswordSection)}
                                >
                                    <div className="toggle-left">
                                        <div className="icon-box"><FaLock /></div>
                                        <span>Alterar Senha</span>
                                    </div>
                                    {showPasswordSection ? <FaChevronUp /> : <FaChevronDown />}
                                </button>

                                <div className={`password-fields ${showPasswordSection ? 'open' : ''}`}>
                                    <div className="password-grid">
                                        <div className="input-group">
                                            <label>Nova Senha</label>
                                            <input 
                                                type="password" 
                                                name="new" 
                                                value={passwords.new} 
                                                onChange={handlePasswordChange} 
                                                placeholder="Mínimo 6 caracteres"
                                            />
                                        </div>
                                        <div className="input-group">
                                            <label>Confirmar Senha</label>
                                            <input 
                                                type="password" 
                                                name="confirm" 
                                                value={passwords.confirm} 
                                                onChange={handlePasswordChange} 
                                                placeholder="Repita a nova senha"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ACTIONS */}
                        <div className="form-actions">
                            <button type="button" className="btn-cancel" onClick={() => router.back()}>
                                Cancelar
                            </button>
                            <button type="submit" className="btn-save" disabled={isSubmitting}>
                                {isSubmitting ? 'Salvando...' : <><FaSave /> Salvar Alterações</>}
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditProfile;