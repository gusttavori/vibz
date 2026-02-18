'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGoogleLogin } from '@react-oauth/google';
import '../Auth.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true); // Novo estado para evitar "piscada"
  
  const router = useRouter();

  // --- 1. REDE DE SEGURANÇA (A Mágica para o PWA) ---
  // Assim que a tela de login abre, verifica se já existe um token válido.
  // Se existir, empurra para o dashboard imediatamente.
  useEffect(() => {
    const checkExistingAuth = () => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('userToken') : null;
        if (token) {
            // Se já tem token, nem mostra o login, vai pro dashboard
            router.replace('/');
        } else {
            setIsCheckingAuth(false); // Libera para mostrar o form
        }
    };
    checkExistingAuth();
  }, [router]);

  const realizarLoginNoNavegador = (data) => {
    setMessage(data.msg || 'Login realizado! Entrando...');
    
    if (typeof window !== 'undefined') {
        // Salva os dados
        localStorage.setItem('userToken', data.token);
        if (data.user) {
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('userName', data.user.name);
        }
        
        // --- 2. CORREÇÃO DE NAVEGAÇÃO PWA ---
        // Usamos router.push primeiro (mais suave/rápido no App)
        // O useEffect acima garante que se a página recarregar, ele redireciona de novo.
        router.push('/');
    }
  };

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
    onSuccess: async (tokenResponse) => {
      setMessage('Processando login com Google...');
      // setIsLoading(true) aqui ajuda a evitar cliques duplos no PWA
      setIsLoading(true); 
      
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
            setIsLoading(false);
        }
      } catch (error) {
        console.error("Erro ao enviar token Google para API:", error);
        setMessage("Falha ao comunicar com o servidor.");
        setIsLoading(false);
      }
    },
    onError: () => {
      setMessage('Falha ao abrir janela do Google.');
      setIsLoading(false);
    }
  });

  const handleGoToRegister = () => {
    router.push('/cadastro');
  };

  const handleForgotPassword = () => {
    router.push('/esqueci-senha');
  };

  // Se estiver verificando se já está logado, mostra um loading simples ou nada
  // Isso evita que o usuário veja o form de login por 1 segundo e depois a tela mude.
  if (isCheckingAuth) {
      return (
        <div className="auth-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
            <div className="skeleton-pulse" style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#e2e8f0' }}></div>
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