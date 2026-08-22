'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode'; 
import toast, { Toaster } from 'react-hot-toast';
import { 
    FaQrcode, FaCheckCircle, FaTimesCircle, FaUser, 
    FaTicketAlt, FaCalendarDay, FaRedo, FaCamera, FaChevronLeft, 
    FaLock, FaKeyboard, FaSignInAlt 
} from 'react-icons/fa';
import './Validador.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function ValidadorUniversal() {
    const [scanResult, setScanResult] = useState(null);
    const [status, setStatus] = useState('checking_permission'); 
    const [errorMessage, setErrorMessage] = useState('');
    const [manualCode, setManualCode] = useState('');
    const [inputType, setInputType] = useState('camera');
    const [isPwa, setIsPwa] = useState(false);
    
    const html5QrCodeRef = useRef(null);

    // 1. Verificação de Permissão do Usuário via Cookie HttpOnly
    useEffect(() => {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
        if (isStandalone) {
            setIsPwa(true);
        }

        const checkPermission = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/users/me`, {
                    credentials: 'include' // <-- Envia o Cookie de segurança
                });
                
                if (!res.ok) throw new Error('Falha ao buscar perfil');

                const data = await res.json();
                
                const hasEvents = data.myEvents && data.myEvents.length > 0;
                const isAdmin = data.user && data.user.isAdmin;

                if (!hasEvents && !isAdmin) {
                    setStatus('unauthorized');
                } else {
                    setStatus('idle');
                }
            } catch (err) {
                console.error("Erro permissão:", err);
                setStatus('unauthorized');
            }
        };
        checkPermission();
    }, []);

    // 2. Limpeza de Câmera Fantasma (Desliga ao sair da página)
    useEffect(() => {
        return () => {
            if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
                html5QrCodeRef.current.stop().catch(console.error);
            }
        };
    }, []);

    // --- CONTROLE DE CÂMERA BLINDADO PARA PWA E NAVEGADOR ---
    const stopScanner = async () => {
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
            try {
                await html5QrCodeRef.current.stop();
                html5QrCodeRef.current.clear();
            } catch (err) {
                console.warn("Aviso ao tentar parar o scanner:", err);
            }
        }
    };

    const startScanner = async () => {
        setScanResult(null);
        setInputType('camera');
        setStatus('scanning');
        
        if (html5QrCodeRef.current) {
            try {
                if (html5QrCodeRef.current.isScanning) {
                    await html5QrCodeRef.current.stop();
                }
                html5QrCodeRef.current.clear();
            } catch (e) {}
            html5QrCodeRef.current = null;
        }

        setTimeout(async () => {
            try {
                html5QrCodeRef.current = new Html5Qrcode("reader");
                
                const windowWidth = window.innerWidth || document.documentElement.clientWidth;
                const windowHeight = window.innerHeight || document.documentElement.clientHeight;
                const squareSize = Math.floor(Math.min(windowWidth, windowHeight) * 0.75);
                
                await html5QrCodeRef.current.start(
                    { facingMode: "environment" },
                    { 
                        fps: 30,
                        disableFlip: false,
                        aspectRatio: windowHeight / windowWidth,
                        qrbox: { width: squareSize, height: squareSize }
                    },
                    onScanSuccess,
                    () => {} 
                );
            } catch (err) {
                console.error("Erro crítico na câmera:", err);
                setStatus('idle');
                toast.error("Erro na câmera. Tente pelo navegador ou digite o código.");
            }
        }, 300);
    };

    // --- FLUXO DE VALIDAÇÃO SEGURO ---
    const handleValidation = async (code) => {
        await stopScanner();
        setStatus('processing');

        try {
            const res = await fetch(`${API_BASE_URL}/tickets/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include', // <-- Validação via Cookie
                body: JSON.stringify({ qrCode: code.trim() })
            });

            if (res.status === 401) {
                setStatus('unauthorized');
                return;
            }

            const data = await res.json();

            if (res.ok && data.valid) {
                setStatus('success');
                setScanResult(data.details); 
                setManualCode(''); 
                toast.success("VALIDADO!");
            } else {
                setStatus('error');
                setErrorMessage(data.message || "Acesso Negado");
                toast.error("NEGADO");
            }
        } catch (error) {
            setStatus('error');
            setErrorMessage("Erro de conexão com o servidor.");
        }
    };

    const onScanSuccess = (decodedText) => {
        handleValidation(decodedText);
    };

    const onManualSubmit = (e) => {
        e.preventDefault();
        if (!manualCode || manualCode.length < 5) {
            toast.error("Digite um código válido");
            return;
        }
        handleValidation(manualCode);
    };

    const switchToManual = () => {
        stopScanner();
        setScanResult(null);
        setInputType('manual');
        setStatus('manual_entry');
    };

    const reset = () => {
        stopScanner();
        setStatus('idle');
        setScanResult(null);
        setManualCode('');
    };

    if (status === 'checking_permission') return <div className="loader-container"><div className="spinner"></div></div>;

    return (
        <div className={`validator-page ${status}`}>
            <Toaster position="top-center" />
            
            <header className="validator-nav">
                <div className="nav-content">
                    <img src="/img/vibe_site.png" alt="Vibz" className="nav-logo" />
                    <span className="nav-badge">Staff</span>
                </div>
            </header>

            <main className="validator-main">
                
                {status === 'unauthorized' && (
                    <div className="state-card unauthorized">
                        <div className="icon-wrapper-error">
                            <FaLock size={32} />
                        </div>
                        <h1>Acesso Restrito</h1>
                        <p>Esta área é exclusiva para <strong>organizadores com eventos ativos</strong>.</p>
                        
                        <button className="btn-primary-large" onClick={async () => {
                            try {
                                await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
                            } catch(e) {}
                            localStorage.removeItem('userId');
                            localStorage.removeItem('userName');
                            window.location.href = '/login';
                        }}>
                            <FaSignInAlt /> Trocar Conta
                        </button>
                        <button className="btn-text" onClick={() => window.location.href = '/'}>
                            Voltar ao Início
                        </button>
                    </div>
                )}

                {status === 'idle' && (
                    <>
                        {isPwa && (
                            <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #f59e0b', borderRadius: '12px', padding: '15px', marginBottom: '15px', color: '#fcd34d', fontSize: '0.9rem', textAlign: 'center', lineHeight: '1.5' }}>
                                <strong>⚠️ Atenção (Modo App):</strong><br/>
                                Para garantir o foco e a velocidade da câmera, recomendamos acessar este validador <strong>diretamente no navegador</strong> (Safari/Chrome).
                            </div>
                        )}

                        <div style={{ background: 'rgba(76, 1, 181, 0.15)', border: '1px solid #4C01B5', borderRadius: '12px', padding: '15px', marginBottom: '20px', color: '#c4b5fd', fontSize: '0.9rem', textAlign: 'center', lineHeight: '1.5' }}>
                            <strong>💡 Dica da Portaria:</strong><br/>
                            Se preferir, você também pode dar baixa nos ingressos buscando pelo nome do cliente na aba <strong>Participantes</strong> do seu Painel.
                        </div>
                    </>
                )}

                {status === 'idle' && (
                    <div className="state-card idle">
                        <div className="pulse-ring">
                            <FaQrcode size={50} />
                        </div>
                        <h1>Validador Oficial</h1>
                        <p>Escolha como deseja validar</p>
                        
                        <div className="action-buttons">
                            <button className="btn-primary-large" onClick={startScanner}>
                                <FaCamera /> Ler QR Code
                            </button>
                            <button className="btn-secondary-large" onClick={switchToManual}>
                                <FaKeyboard /> Digitar Código
                            </button>
                        </div>
                    </div>
                )}

                {status === 'scanning' && (
                    <div className="state-fullscreen">
                        <div id="reader" className="camera-container"></div>
                        <div className="scan-overlay">
                            <p>Aponte a câmera para o QR Code</p>
                        </div>
                        <div className="scan-controls">
                            <button className="btn-manual-overlay" onClick={switchToManual}>
                                <FaKeyboard /> Digitar
                            </button>
                            <button className="btn-close-scan" onClick={reset}>
                                <FaChevronLeft /> Cancelar
                            </button>
                        </div>
                    </div>
                )}

                {status === 'manual_entry' && (
                    <div className="state-card manual">
                        <div className="icon-header">
                            <FaKeyboard size={40} color="var(--primary-purple)" />
                        </div>
                        <h2>Digitação Manual</h2>
                        <p>Insira o código do ingresso.</p>
                        
                        <form onSubmit={onManualSubmit} className="manual-form">
                            <input 
                                type="text" 
                                className="input-code"
                                placeholder="Ex: abcd-1234-xyz"
                                value={manualCode}
                                onChange={(e) => setManualCode(e.target.value)}
                                autoFocus
                            />
                            <button type="submit" className="btn-primary-large">
                                Validar
                            </button>
                        </form>
                        <button className="btn-text" onClick={reset}>Voltar</button>
                    </div>
                )}

                {status === 'processing' && (
                    <div className="state-card processing">
                        <div className="spinner"></div>
                        <h3>Validando...</h3>
                    </div>
                )}

                {status === 'success' && (
                    <div className="state-card result success">
                        <div className="result-header">
                            <FaCheckCircle className="icon-result" />
                            <h2>ACESSO LIBERADO</h2>
                        </div>
                        
                        <div className="ticket-info-box">
                            <div className="info-row">
                                <span className="label"><FaUser /> Cliente</span>
                                <span className="value name">{scanResult?.user}</span>
                            </div>
                            <div className="info-row">
                                <span className="label"><FaTicketAlt /> Tipo</span>
                                <span className="value type">{scanResult?.type}</span>
                                {scanResult?.batch && <span className="value batch">({scanResult.batch})</span>}
                            </div>
                            <div className="info-row">
                                <span className="label"><FaCalendarDay /> Evento</span>
                                <span className="value event">{scanResult?.event}</span>
                            </div>
                        </div>

                        <button className="btn-primary-large" onClick={inputType === 'manual' ? switchToManual : startScanner}>
                            <FaRedo /> Próxima Validação
                        </button>
                        <button className="btn-text" onClick={reset}>Voltar ao Início</button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="state-card result error">
                        <div className="result-header">
                            <FaTimesCircle className="icon-result" />
                            <h2>ACESSO NEGADO</h2>
                        </div>
                        <div className="error-box">
                            <p className="error-msg">{errorMessage}</p>
                        </div>
                        
                        <div className="error-actions">
                            <button className="btn-secondary-large" onClick={inputType === 'manual' ? switchToManual : startScanner}>
                                <FaRedo /> Tentar Novamente
                            </button>
                            {inputType === 'camera' && (
                                <button className="btn-primary-large" onClick={switchToManual} style={{marginTop: '10px'}}>
                                    <FaKeyboard /> Validar Manualmente
                                </button>
                            )}
                        </div>
                        <button className="btn-text" onClick={reset}>Voltar</button>
                    </div>
                )}
            </main>
        </div>
    );
}