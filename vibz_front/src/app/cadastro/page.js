'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import '../Auth.css'; 

// Padronizado para incluir /api
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function Cadastro() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    if (password !== confirmPassword) {
        setMessage("As senhas não coincidem.");
        setIsLoading(false);
        return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Cadastro realizado com sucesso! Redirecionando...');
        if (data.token) {
            localStorage.setItem('userToken', data.token);
            if(data.user) {
                localStorage.setItem('userId', data.user.id);
                localStorage.setItem('userName', data.user.name);
            }
        }
        
        setTimeout(() => {
            router.push('/login'); // Ou dashboard
        }, 1500);
      } else {
        setMessage(data.msg || 'Erro ao cadastrar.');
      }
    } catch (error) {
      console.error('Erro no cadastro:', error);
      setMessage('Erro de conexão com o servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToLogin = () => {
    router.push('/login');
  };

  return (
    <div className="auth-container">
      <img src="/img/vibe_site.png" alt="Logo da Vibz" className="logo" />

      <form className="auth-form" onSubmit={handleSubmit}>
        <h2 className="auth-title">Crie sua conta</h2>
        <p className="auth-description">Comece a gerenciar e explorar eventos.</p>

        <div className="input-spacer">
            <input 
                type="text" 
                placeholder="Nome Completo" 
                required 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
            />
        </div>
        <div className="input-spacer">
            <input 
                type="email" 
                placeholder="Email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
            />
        </div>
        <div className="input-spacer">
            <input 
                type="password" 
                placeholder="Senha" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
            />
        </div>
        <div className="input-spacer">
            <input 
                type="password" 
                placeholder="Confirmar Senha" 
                required 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
            />
        </div>

        <button type="submit" className="auth-button" disabled={isLoading} style={{ marginTop: '15px' }}>
            {isLoading ? 'Cadastrando...' : 'Cadastrar'}
        </button>

        <p>Já tem uma conta?</p>
        <button 
            type="button" 
            className="small-button" 
            onClick={handleGoToLogin}
        >
            Fazer Login
        </button>

        {message && (
            <div className="message-container">
                <p className="auth-message">{message}</p>
            </div>
        )}
      </form>
    </div>
  );
}