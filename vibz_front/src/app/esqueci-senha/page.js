'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import '../Auth.css'; 

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function ForgotPasswordStep1() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSendCode = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        sessionStorage.setItem('resetEmail', email);
        setMessage('Código enviado com sucesso! Redirecionando...');
        
        setTimeout(() => {
            router.push('/esqueci-senha/codigo');
        }, 1500);
      } else {
        setError(data.message || data.msg || 'Erro ao enviar código. Verifique o e-mail.');
      }
    } catch (err) {
      console.error('Erro:', err);
      setError('Erro de conexão com o servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
          <img src="/img/vibe_site.png" alt="Logo da Vibz" className="logo" style={{width:'120px', margin:'0 auto 20px', display:'block'}} />

          <form className="auth-form" onSubmit={handleSendCode}>
            <h2 className="auth-title">Recuperar Senha</h2>
            <p className="auth-description">
              Digite seu e-mail para receber o código de verificação.
            </p>

            {message && <div className="success-message" style={{color:'green', textAlign:'center', marginBottom:'15px'}}>{message}</div>}
            {error && <div className="error-message" style={{color:'red', textAlign:'center', marginBottom:'15px'}}>{error}</div>}

            <div className="input-group">
                <input 
                  type="email" 
                  placeholder="Seu e-mail cadastrado" 
                  required 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="auth-input"
                />
            </div>

            <button type="submit" className="auth-button" disabled={isLoading}>
              {isLoading ? 'Enviando...' : 'Enviar Código'}
            </button>

            <div className="back-button">
              <button type="button" className="small-button" onClick={() => router.push('/login')}>
                Voltar para Login
              </button>
            </div>
          </form>
      </div>
    </div>
  );
}