'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import '../Auth.css'; 

// CORREÇÃO: Usa variável de ambiente (que já inclui /api)
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
      // CORREÇÃO: Removido '/api' manual, pois API_BASE_URL já tem
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
            router.push('/login');
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
        <h2 style={{ color: '#1a1a1a', marginBottom: '20px' }}>Crie sua conta</h2>

        <input 
            type="text" 
            placeholder="Nome Completo" 
            required 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
        />
        <input 
            type="email" 
            placeholder="Email" 
            required 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
        />
        <input 
            type="password" 
            placeholder="Senha" 
            required 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
        />
        <input 
            type="password" 
            placeholder="Confirmar Senha" 
            required 
            value={confirmPassword} 
            onChange={(e) => setConfirmPassword(e.target.value)} 
        />

        <button type="submit" className="auth-button" disabled={isLoading}>
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

        {message && <p className="auth-message">{message}</p>}
      </form>
    </div>
  );
}