'use client';

import React, { useState, useEffect, useRef } from 'react';
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
    const [manualCode, setManualCode] = useState(''); // Estado para o código digitado
    const [inputType, setInputType] = useState('camera'); // 'camera' ou 'manual'
    
    const html5QrCodeRef = useRef(null);

    // 1. Verificação de Permissão (Mantida e melhorada a msg de erro)
    useEffect(() => {
        const checkPermission = async () => {
            try {
                const token = localStorage.getItem('userToken')?.replace(/"/g, '');
                if (!token) {
                    setStatus('unauthorized');
                    return;
                }
                const res = await fetch(`${API_BASE_URL}/users/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                
                if (data.myEvents?.length === 0 && !data.user.isAdmin) {
                    setStatus('unauthorized');
                } else {
                    setStatus('idle');
                }
            } catch (err) {
                setStatus('unauthorized');
            }
        };
        checkPermission();
    }, []);

    const stopScanner = async () => {
        if (html5QrCodeRef.current?.isScanning) {
            await html5QrCodeRef.current.stop();
            html5QrCodeRef.current.clear();
        }
    };

    // Função unificada para validar (seja por Câmera ou Digitação)
    const handleValidation = async (code) => {
        await stopScanner();
        setStatus('processing');

        try {
            const token = localStorage.getItem('userToken')?.replace(/"/g, '');
            const res = await fetch(`${API_BASE_URL}/tickets/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ qrCode: code.trim() })
            });

            const data = await res.json();

            if (res.ok && data.valid) {
                setStatus('success');
                setScanResult(data.details); 
                setManualCode(''); // Limpa o campo manual
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

    // Handler da Câmera
    const onScanSuccess = (decodedText) => {
        handleValidation(decodedText);
    };

    // Handler do Input Manual
    const onManualSubmit = (e) => {
        e.preventDefault();
        if (!manualCode || manualCode.length < 5) {
            toast.error("Digite um código válido");
            return;
        }
        handleValidation(manualCode);
    };

    const startScanner = () => {
        setScanResult(null);
        setInputType('camera');
        setStatus('scanning');
        setTimeout(() => {
            if (!html5QrCodeRef.current) html5QrCodeRef.current = new Html5Qrcode("reader");
            html5QrCodeRef.current.start(
                { facingMode: "environment" }, 
                { fps: 10, qrbox: 250 },
                onScanSuccess,
                () => {} 
            ).catch(() => {
                setStatus('idle');
                toast.error("Erro na câmera. Tente digitar o código.");
            });
        }, 150);
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

    // TELA DE NÃO AUTORIZADO (Requisito 1)
    if (status === 'unauthorized') return (
        <div className="state-card unauthorized">
            <div className="icon-wrapper-error">
                <FaLock size={40} color="#fff" />
            </div>
            <h1>Acesso Restrito</h1>
            <p>Para validar ingressos, você precisa estar logado com a conta da <strong>organização do evento</strong>.</p>
            
            <button className="btn-primary-large" onClick={() => window.location.href = '/login'}>
                <FaSignInAlt /> Fazer Login
            </button>
            <button className="btn-text" onClick={() => window.location.href = '/'}>
                Voltar ao Início
            </button>
        </div>
    );

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
                {/* TELA INICIAL (IDLE) */}
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

                {/* TELA DE SCANNER */}
                {status === 'scanning' && (
                    <div className="state-fullscreen">
                        <div id="reader"></div>
                        <div className="scan-overlay">
                            <p>Enquadre o QR Code</p>
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

                {/* TELA DE INPUT MANUAL (Requisito 2) */}
                {status === 'manual_entry' && (
                    <div className="state-card manual">
                        <div className="icon-header">
                            <FaKeyboard size={40} color="var(--primary)" />
                        </div>
                        <h2>Digitação Manual</h2>
                        <p>Insira o código alfanumérico do ingresso.</p>
                        
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
                                Validar Ingresso
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

                {/* TELA DE SUCESSO */}
                {status === 'success' && (
                    <div className="state-card result success">
                        <div className="result-header">
                            <FaCheckCircle className="icon-result" />
                            <h2>ACESSO LIBERADO</h2>
                        </div>
                        
                        <div className="ticket-info-box">
                            <div className="info-row">
                                <span className="label"><FaUser /> Nome do Cliente</span>
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

                {/* TELA DE ERRO */}
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
                            
                            {/* Se o erro foi na câmera, oferece opção manual */}
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