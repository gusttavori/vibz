'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode'; 
import toast, { Toaster } from 'react-hot-toast';
import { 
    FaQrcode, FaCheckCircle, FaTimesCircle, FaUser, 
    FaTicketAlt, FaCalendarDay, FaRedo, FaCamera, FaChevronLeft, FaLock, FaIdBadge
} from 'react-icons/fa';
import './Validador.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function ValidadorUniversal() {
    const [scanResult, setScanResult] = useState(null);
    const [status, setStatus] = useState('checking_permission'); 
    const [errorMessage, setErrorMessage] = useState('');
    const html5QrCodeRef = useRef(null);

    // Efeito para verificar se o usuário é organizador
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

    const onScanSuccess = async (decodedText) => {
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
                body: JSON.stringify({ qrCode: decodedText.trim() })
            });

            const data = await res.json();

            if (res.ok && data.valid) {
                setStatus('success');
                setScanResult(data.details); 
                // Ex: data.details = { user: "João", type: "VIP", batch: "1º Lote", event: "Festa X" }
                toast.success("VALIDADO!");
            } else {
                setStatus('error');
                setErrorMessage(data.message || "Acesso Negado");
                toast.error("NEGADO");
            }
        } catch (error) {
            setStatus('error');
            setErrorMessage("Erro de conexão.");
        }
    };

    const startScanner = () => {
        setScanResult(null); // Limpa resultado anterior
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
                toast.error("Erro na câmera.");
            });
        }, 150);
    };

    const reset = () => {
        stopScanner();
        setStatus('idle');
        setScanResult(null);
    };

    if (status === 'checking_permission') return <div className="loader-container"><div className="spinner"></div></div>;

    if (status === 'unauthorized') return (
        <div className="state-card unauthorized">
            <FaLock size={50} color="#ff4d4d" />
            <h1>Acesso Restrito</h1>
            <p>Apenas organizadores autorizados podem acessar o validador.</p>
            <button className="btn-primary-large" onClick={() => window.location.href = '/'}>Voltar ao Site</button>
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
                {status === 'idle' && (
                    <div className="state-card idle">
                        <div className="pulse-ring">
                            <FaQrcode size={50} />
                        </div>
                        <h1>Validador Oficial</h1>
                        <p>Pronto para ler ingressos</p>
                        <button className="btn-primary-large" onClick={startScanner}>
                            <FaCamera /> Iniciar Leitura
                        </button>
                    </div>
                )}

                {status === 'scanning' && (
                    <div className="state-fullscreen">
                        <div id="reader"></div>
                        <div className="scan-overlay">
                            <p>Enquadre o QR Code</p>
                        </div>
                        <button className="btn-close-scan" onClick={reset}>
                            <FaChevronLeft /> Cancelar
                        </button>
                    </div>
                )}

                {status === 'processing' && (
                    <div className="state-card processing">
                        <div className="spinner"></div>
                        <h3>Validando...</h3>
                    </div>
                )}

                {/* --- TELA DE SUCESSO MELHORADA --- */}
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
                                <span className="label"><FaTicketAlt /> Tipo de Ingresso</span>
                                <span className="value type">{scanResult?.type}</span>
                                {scanResult?.batch && <span className="value batch">({scanResult.batch})</span>}
                            </div>

                            <div className="info-row">
                                <span className="label"><FaCalendarDay /> Evento</span>
                                <span className="value event">{scanResult?.event}</span>
                            </div>
                        </div>

                        <button className="btn-primary-large" onClick={startScanner}>
                            <FaRedo /> Ler Próximo
                        </button>
                        <button className="btn-text" onClick={reset}>Voltar ao Início</button>
                    </div>
                )}

                {/* --- TELA DE ERRO --- */}
                {status === 'error' && (
                    <div className="state-card result error">
                        <div className="result-header">
                            <FaTimesCircle className="icon-result" />
                            <h2>ACESSO NEGADO</h2>
                        </div>
                        <div className="error-box">
                            <p className="error-msg">{errorMessage}</p>
                        </div>
                        <button className="btn-secondary-large" onClick={startScanner}>
                            <FaRedo /> Tentar Novamente
                        </button>
                        <button className="btn-text" onClick={reset}>Voltar</button>
                    </div>
                )}
            </main>
        </div>
    );
}