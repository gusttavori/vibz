'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import '../../Auth.css'; 

const API_BASE_URL = 'http://localhost:5000';

export default function ForgotPasswordStep3() {
  const router = useRouter();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Dados recuperados da sessão
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    const storedEmail = sessionStorage.getItem('resetEmail');
    const storedCode = sessionStorage.getItem('resetCode');

    if (!storedEmail || !storedCode) {
      router.push('/esqueci-senha'); // Se faltar dados, reinicia o fluxo
    } else {
      setEmail(storedEmail);
      setCode(storedCode);
    }
  }, [router]);

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setMessage('As senhas não coincidem.');
      return;
    }
    
    if (newPassword.length < 6) {
        setMessage('A senha deve ter no mínimo 6 caracteres.');
        return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      // Envia E-mail + Código + Nova Senha para o backend
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Senha alterada com sucesso! Redirecionando...');
        // Limpa a sessão por segurança
        sessionStorage.removeItem('resetEmail');
        sessionStorage.removeItem('resetCode');
        
        setTimeout(() => {
            router.push('/login');
        }, 2000);
      } else {
        setMessage(data.msg || 'Erro ao alterar senha. O código pode estar expirado.');
      }
    } catch (error) {
      console.error('Erro:', error);
      setMessage('Erro de conexão.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <img src="/img/vibe_site.png" alt="Logo da Vibz" className="logo" />

      <form className="auth-form" onSubmit={handleResetPassword}>
        <h2 className="auth-title">Nova Senha</h2>
        <p className="auth-description">
          Crie uma nova senha para sua conta.
        </p>

        <input 
          type="password" 
          placeholder="Nova Senha" 
          required 
          value={newPassword} 
          onChange={(e) => setNewPassword(e.target.value)} 
          className="input-spacer"
        />

        <input 
          type="password" 
          placeholder="Confirme a Nova Senha" 
          required 
          value={confirmPassword} 
          onChange={(e) => setConfirmPassword(e.target.value)} 
        />

        <button type="submit" className="auth-button" disabled={isLoading}>
          {isLoading ? 'Alterando...' : 'Alterar Senha'}
        </button>

        <div className="back-button">
          <button type="button" className="small-button" onClick={() => router.push('/esqueci-senha/codigo')}>
            Voltar
          </button>
        </div>
      </form>

      {message && (
        <div className="message-container">
            <p className="auth-message">{message}</p>
        </div>
      )}
    </div>
  );
}