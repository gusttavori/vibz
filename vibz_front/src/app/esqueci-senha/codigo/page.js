'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import '../../Auth.css'; 

// CORREÇÃO: Variável padrão
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function ForgotPasswordStep2() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const storedEmail = sessionStorage.getItem('resetEmail');
    if (!storedEmail) {
      router.push('/esqueci-senha'); 
    } else {
      setEmail(storedEmail);
    }
  }, [router]);

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setMessage('');
    
    if (code.length !== 6) {
      setMessage('O código deve ter 6 dígitos.');
      return;
    }

    setIsLoading(true);

    try {
      // CORREÇÃO: Removeu '/api' manual
      const response = await fetch(`${API_BASE_URL}/auth/validate-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (response.ok) {
        sessionStorage.setItem('resetCode', code);
        router.push('/esqueci-senha/nova-senha');
      } else {
        setMessage(data.msg || 'Código inválido.');
      }
    } catch (error) {
      console.error('Erro:', error);
      setMessage('Erro de conexão com o servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <img src="/img/vibe_site.png" alt="Logo da Vibz" className="logo" />

      <form className="auth-form" onSubmit={handleVerifyCode}>
        <h2 className="auth-title">Código de Verificação</h2>
        <p className="auth-description">
          Enviamos um código para <strong>{email}</strong>.
        </p>

        <input 
            type="text" 
            placeholder="Código (6 dígitos)" 
            required 
            value={code}
            maxLength={6}
            pattern="\d*" 
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))} 
        />

        <button type="submit" className="auth-button" disabled={isLoading}>
          {isLoading ? 'Verificando...' : 'Validar Código'}
        </button>

        <div className="back-button">
          <button type="button" className="small-button" onClick={() => router.push('/esqueci-senha')}>
            Reenviar E-mail
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