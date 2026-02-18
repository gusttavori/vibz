'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useGoogleLogin } from '@react-oauth/google';
import '../Auth.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  const router = useRouter();

  const realizarLoginNoNavegador = useCallback((data) => {
    if (typeof window !== 'undefined') {
        const tokenValue = typeof data.token === 'string' ? data.token : JSON.stringify(data.token);
        localStorage.setItem('userToken', tokenValue);
        
        if (data.user) {
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('userName', data.user.name);
        }
        
        setMessage('Login realizado! Redirecionando...');
        
        setTimeout(() => {
             window.location.replace('/');
        }, 100);
    }
  }, []);

  const handleGoogleCallback = useCallback(async (code) => {
    setIsLoading(true);
    setIsCheckingAuth(true);
    setMessage('Autenticando com Google...');
    try {
      const response = await fetch(`${API_BASE_URL}/auth/google-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
      });
      const data = await response.json();
      if (response.ok) {
          realizarLoginNoNavegador(data);
      } else {
          setMessage(data.msg || 'Falha na autenticação com Google.');
          setIsLoading(false);
          setIsCheckingAuth(false);
      }
    } catch (error) {
      console.error("Erro ao processar callback do Google:", error);
      setMessage("Erro ao comunicar com o servidor.");
      setIsLoading(false);
      setIsCheckingAuth(false);
    }
  }, [realizarLoginNoNavegador]);

  useEffect(() => {
    const checkAuthAndParams = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const token = typeof window !== 'undefined' ? localStorage.getItem('userToken') : null;

        if (code) {
            handleGoogleCallback(code);
        } else if (token) {
            window.location.replace('/');
        } else {
            setIsCheckingAuth(false);
        }
    };
    checkAuthAndParams();
  }, [handleGoogleCallback]);

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
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Erro na requisição:', error);
      setMessage('Erro de conexão com o servidor.');
      setIsLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    flow: 'auth-code',
    ux_mode: 'redirect',
    redirect_uri: typeof window !== 'undefined' ? `${window.location.origin}/login` : '',
  });

  const handleGoToRegister = () => {
    router.push('/cadastro');
  };

  const handleForgotPassword = () => {
    router.push('/esqueci-senha');
  };

  if (isCheckingAuth) {
      return (
        <div className="auth-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
            <div className="skeleton-pulse" style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#4C01B5', opacity: 0.6 }}></div>
        </div>
      );
  }

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

        <button type="button" className="google-button" onClick={() => googleLogin()} disabled={isLoading}>
            <img src="/img/icon_google.svg" alt="Google Logo" className="google-logo"/>
            {isLoading ? 'Aguarde...' : 'Continue com Google'}
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