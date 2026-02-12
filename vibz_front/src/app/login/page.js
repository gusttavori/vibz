'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGoogleLogin } from '@react-oauth/google';
import '../Auth.css';

// Padronizado para incluir /api
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();

      if (response.ok) {
        realizarLoginNoNavegador(data);
      } else {
        setMessage(data.msg || 'Erro ao fazer login.');
      }
    } catch (error) {
      console.error('Erro na requisição:', error);
      setMessage('Erro de conexão com o servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setMessage('Processando login com Google...');
      try {
        const response = await fetch(`${API_BASE_URL}/auth/google-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                googleAccessToken: tokenResponse.access_token 
            }),
        });
        const data = await response.json();
        if (response.ok) {
            realizarLoginNoNavegador(data);
        } else {
            setMessage(data.msg || 'Erro ao logar com Google no servidor.');
        }
      } catch (error) {
        console.error("Erro ao enviar token Google para API:", error);
        setMessage("Falha ao comunicar com o servidor.");
      }
    },
    onError: () => {
        setMessage('Falha ao abrir janela do Google.');
    }
  });

  const realizarLoginNoNavegador = (data) => {
    setMessage(data.msg || 'Login realizado!');
    if (typeof window !== 'undefined') {
        localStorage.setItem('userToken', data.token);
        if (data.user) {
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('userName', data.user.name);
        }
    }
    // Redireciona para home ou dashboard
    router.push('/');
  };

  const handleGoToRegister = () => {
    router.push('/cadastro');
  };

  const handleForgotPassword = () => {
    router.push('/esqueci-senha');
  };

  return (
    <div className="auth-container">
      <img src="/img/vibe_site.png" alt="Logo da Vibz" className="logo"/>

      <form className="auth-form" onSubmit={handleSubmit}>
        <h2 className="auth-title">Bem-vindo de volta!</h2>
        <p className="auth-description">Acesse sua conta para continuar.</p>

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
        
        <div>
          <button 
              type="button" 
              className="forgot-password-link"
              onClick={handleForgotPassword}
          >
              Esqueceu sua senha?
          </button>
        </div>

        <button type="submit" className="auth-button" disabled={isLoading}>
            {isLoading ? 'Entrando...' : 'Entrar'}
        </button>

        <button type="button" className="google-button" onClick={() => googleLogin()}>
            <img src="/img/icon_google.svg" alt="Google Logo" className="google-logo"/>
            Continue com Google
        </button>

        <p>Ainda não tem uma conta?</p>
        
        <button 
            type="button" 
            className="small-button" 
            onClick={handleGoToRegister}
        >
            Cadastre-se
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