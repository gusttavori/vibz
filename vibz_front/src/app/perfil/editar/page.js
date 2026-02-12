'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { FaCamera, FaLock, FaChevronDown, FaChevronUp } from 'react-icons/fa'; 
import './EditProfile.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const EditProfile = () => {
    const router = useRouter();

    const [userData, setUserData] = useState({ name: '', bio: '', profilePicture: '', coverPicture: '' });
    
    // Estados de Senha
    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const [profilePictureFile, setProfilePictureFile] = useState(null);
    const [coverPictureFile, setCoverPictureFile] = useState(null);

    // --- CARREGAR DADOS ---
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
                    throw new Error('Sessão expirada.');
                }
                throw new Error('Falha ao carregar perfil.');
            }

            const data = await response.json();
            // Garante que userData tenha valores padrão para evitar erros de uncontrolled input
            setUserData({
                name: data.user.name || '',
                bio: data.user.bio || '',
                profilePicture: data.user.profilePicture || '',
                coverPicture: data.user.coverPicture || ''
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserData();
    }, []);

    // --- HANDLERS ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setUserData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            if (e.target.name === 'profilePictureFile') {
                setProfilePictureFile(file);
                setUserData(prev => ({ ...prev, profilePicture: event.target.result }));
            } else {
                setCoverPictureFile(file);
                setUserData(prev => ({ ...prev, coverPicture: event.target.result }));
            }
        };
        reader.readAsDataURL(file);
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        if (name === 'newPassword') setNewPassword(value);
        if (name === 'confirmPassword') setConfirmPassword(value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        const token = localStorage.getItem('userToken');
        const formData = new FormData();

        formData.append('name', userData.name);
        formData.append('bio', userData.bio); // Envia mesmo que vazio
        
        if (profilePictureFile) formData.append('profilePicture', profilePictureFile);
        if (coverPictureFile) formData.append('coverPicture', coverPictureFile);

        // Só valida e envia senha se a seção estiver aberta e o campo preenchido
        if (showPasswordSection && newPassword) {
            if (newPassword.length < 6) {
                setError('A senha deve ter no mínimo 6 caracteres.');
                setIsSubmitting(false);
                return;
            }
            if (newPassword !== confirmPassword) {
                setError('As novas senhas não coincidem.');
                setIsSubmitting(false);
                return;
            }
            formData.append('password', newPassword);
        }

        try {
            const response = await fetch(`${API_BASE_URL}/users/me`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Falha ao atualizar.');
            }

            const updatedData = await response.json();
            // Atualiza o estado com a resposta do servidor para garantir sincronia
            if (updatedData.user) {
                setUserData({
                    name: updatedData.user.name,
                    bio: updatedData.user.bio,
                    profilePicture: updatedData.user.profilePicture,
                    coverPicture: updatedData.user.coverPicture
                });
            }
            
            setSuccessMessage('Perfil atualizado com sucesso!');
            
            // Limpa campos de senha e fecha seção
            setNewPassword('');
            setConfirmPassword('');
            setShowPasswordSection(false);

        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (loading) return <div className="loading-screen">Carregando...</div>;
    
    return (
        <>
            <Header/>
            
            <div className="edit-profile-page">
                <div className="edit-profile-container">
                    <h1 className="title">Editar Perfil</h1>
                    
                    <form onSubmit={handleSubmit} className="edit-profile-form">
                        
                        {/* SEÇÃO DE FOTOS */}
                        <div className="photo-section">
                            <div className="cover-photo-container">
                                {userData.coverPicture ? (
                                    <img src={userData.coverPicture} alt="Capa" className="cover-photo-preview" />
                                ) : (
                                    <div className="default-cover-preview"></div>
                                )}
                                <label htmlFor="cover-upload" className="photo-upload-label cover">
                                    <FaCamera /> <span>Alterar Capa</span>
                                    <input type="file" id="cover-upload" name="coverPictureFile" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                                </label>
                            </div>
                            
                            <div className="profile-photo-container">
                                <img 
                                    src={userData.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || 'User')}&background=random&color=fff`} 
                                    alt="Perfil" 
                                    className="profile-photo-preview" 
                                />
                                <label htmlFor="profile-upload" className="photo-upload-label profile">
                                    <FaCamera />
                                    <input type="file" id="profile-upload" name="profilePictureFile" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                                </label>
                            </div>
                        </div>

                        {/* SEÇÃO DE CAMPOS */}
                        <div className="form-content">
                            <div className="form-group">
                                <label htmlFor="name">Nome Completo</label>
                                <input 
                                    type="text" 
                                    id="name" 
                                    name="name" 
                                    value={userData.name} 
                                    onChange={handleChange} 
                                    required 
                                    placeholder="Seu nome exibido no perfil"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="bio">Biografia</label>
                                <textarea 
                                    id="bio" 
                                    name="bio" 
                                    value={userData.bio} 
                                    onChange={handleChange} 
                                    rows="4"
                                    placeholder="Conte um pouco sobre você..."
                                ></textarea>
                            </div>

                            {/* --- OPÇÃO DISCRETA DE SENHA --- */}
                            <div className="password-toggle-wrapper">
                                <button 
                                    type="button" 
                                    className="toggle-password-btn"
                                    onClick={() => setShowPasswordSection(!showPasswordSection)}
                                >
                                    <FaLock size={12} /> 
                                    {showPasswordSection ? "Cancelar alteração de senha" : "Alterar minha senha"}
                                    {showPasswordSection ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
                                </button>

                                {showPasswordSection && (
                                    <div className="password-fields-container fade-in">
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label htmlFor="newPassword">Nova Senha</label>
                                                <input 
                                                    type="password" 
                                                    id="newPassword" 
                                                    name="newPassword" 
                                                    value={newPassword} 
                                                    onChange={handlePasswordChange} 
                                                    placeholder="Mínimo 6 caracteres"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label htmlFor="confirmPassword">Confirmar</label>
                                                <input 
                                                    type="password" 
                                                    id="confirmPassword" 
                                                    name="confirmPassword" 
                                                    value={confirmPassword} 
                                                    onChange={handlePasswordChange} 
                                                    placeholder="Repita a nova senha"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* MENSAGENS E BOTÕES */}
                        <div className="form-footer">
                            {error && <div className="message error">{error}</div>}
                            {successMessage && <div className="message success">{successMessage}</div>}

                            <div className="button-group">
                                <button type="button" className="cancel-btn" onClick={() => router.back()}>
                                    Cancelar
                                </button>
                                <button type="submit" className="save-btn" disabled={isSubmitting}>
                                    {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                                </button>
                            </div>
                        </div>

                    </form>
                </div>
            </div>
        </>
    );
};

export default EditProfile;