'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode'; 
import toast, { Toaster } from 'react-hot-toast';
import { 
    FaQrcode, FaCheckCircle, FaTimesCircle, FaUser, 
    FaTicketAlt, FaCalendarDay, FaRedo, FaCamera, FaChevronLeft
} from 'react-icons/fa';
import './Validador.css';

const getApiBaseUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
};

export default function ValidadorUniversal() {
    const [scanResult, setScanResult] = useState(null);
    const [status, setStatus] = useState('idle'); 
    const [errorMessage, setErrorMessage] = useState('');
    
    const API_BASE_URL = getApiBaseUrl();
    const html5QrCodeRef = useRef(null);

    const triggerHaptic = (type) => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            if (type === 'success') navigator.vibrate([50, 50, 50]); 
            if (type === 'error') navigator.vibrate([200, 100, 200]); 
        }
    };

    const stopScanner = async () => {
        if (html5QrCodeRef.current) {
            try {
                if (html5QrCodeRef.current.isScanning) {
                    await html5QrCodeRef.current.stop();
                }
                html5QrCodeRef.current.clear();
            } catch (err) {
                console.warn("Erro ao parar scanner (pode já estar parado):", err);
            }
        }
    };

    const onScanSuccess = async (decodedText) => {
        // Para a câmera imediatamente ao ler um código válido
        await stopScanner();

        setStatus('processing');

        try {
            const token = localStorage.getItem('userToken');
            const cleanToken = token ? token.replace(/"/g, '') : '';
            
            // Log para debug (útil se você inspecionar via USB no celular)
            console.log("QR Code Lido:", decodedText);

            const res = await fetch(`${API_BASE_URL}/tickets/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cleanToken}`
                },
                body: JSON.stringify({ qrCode: decodedText })
            });

            const data = await res.json();

            if (res.ok && data.valid) {
                setStatus('success');
                setScanResult(data.details); 
                triggerHaptic('success');
                toast.success("VALIDADO!", { duration: 2000 });
            } else {
                setStatus('error');
                let msg = data.message || "Ingresso Inválido";
                if (data.usedAt) {
                    const usedDate = new Date(data.usedAt);
                    const hora = usedDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    const dia = usedDate.toLocaleDateString('pt-BR');
                    msg = `USADO: ${dia} às ${hora}`;
                }
                setErrorMessage(msg);
                triggerHaptic('error');
                toast.error("NEGADO", { duration: 3000 });
            }
        } catch (error) {
            setStatus('error');
            console.error("Erro na validação:", error);
            setErrorMessage("Erro de conexão com o servidor.");
            toast.error("Sem conexão");
        }
    };

    const startScanner = () => {
        setScanResult(null);
        setErrorMessage('');
        setStatus('scanning');

        // Pequeno delay para garantir renderização do container
        setTimeout(() => {
            if (!html5QrCodeRef.current) {
                html5QrCodeRef.current = new Html5Qrcode("reader");
            }

            const config = { 
                fps: 10, 
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0 
            };

            html5QrCodeRef.current.start(
                { facingMode: "environment" }, 
                config,
                onScanSuccess,
                (errorMessage) => {
                    // Erros de frame são ignorados (ex: baixa luz, sem foco)
                }
            ).catch(err => {
                console.error("Erro ao iniciar câmera:", err);
                setStatus('idle');
                toast.error("Erro ao acessar câmera. Verifique permissões.");
            });
        }, 100);
    };

    const reset = () => {
        stopScanner();
        setStatus('idle');
        setScanResult(null);
    };

    useEffect(() => {
        return () => {
            stopScanner(); // Garante limpeza ao sair da página
        };
    }, []);

    return (
        <div className={`validator-page ${status}`}>
            <Toaster position="top-center" />
            
            <header className="validator-nav">
                <div className="nav-content">
                    <img src="/img/vibe_site.png" alt="Vibz" className="nav-logo" />
                    <span className="nav-badge">Staff Access</span>
                </div>
            </header>

            <main className="validator-main">
                {status === 'idle' && (
                    <div className="state-card idle fade-in">
                        <div className="pulse-ring">
                            <div className="qr-icon-wrapper">
                                <FaQrcode />
                            </div>
                        </div>
                        <h1>Validação de Entrada</h1>
                        <p>Aponte a câmera para o QR Code do ingresso.</p>
                        <button className="btn-primary-large" onClick={startScanner}>
                            <FaCamera /> Iniciar Leitura
                        </button>
                    </div>
                )}

                {status === 'scanning' && (
                    <div className="state-fullscreen scanning fade-in">
                        <div className="scan-overlay">
                            <div className="scan-frame">
                                <div className="laser"></div>
                            </div>
                            <p className="scan-instruction">Enquadre o código no centro</p>
                        </div>
                        <div id="reader"></div>
                        
                        <button className="btn-close-scan" onClick={reset}>
                            <FaChevronLeft /> Cancelar
                        </button>
                    </div>
                )}

                {status === 'processing' && (
                    <div className="state-card processing fade-in">
                        <div className="spinner"></div>
                        <h3>Verificando...</h3>
                    </div>
                )}

                {status === 'success' && (
                    <div className="state-card result success slide-up">
                        <div className="result-header">
                            <FaCheckCircle className="icon-result" />
                            <h2>ACESSO LIBERADO</h2>
                        </div>
                        <div className="ticket-details">
                            <div className="detail-row">
                                <span className="label"><FaUser/> Cliente</span>
                                <span className="value">{scanResult?.user}</span>
                            </div>
                            <div className="detail-row">
                                <span className="label"><FaTicketAlt/> Tipo</span>
                                <span className="value highlight">{scanResult?.type}</span>
                            </div>
                            <div className="detail-row">
                                <span className="label"><FaCalendarDay/> Evento</span>
                                <span className="value">{scanResult?.event}</span>
                            </div>
                        </div>
                        <button className="btn-primary-large" onClick={startScanner}>Ler Próximo</button>
                        <button className="btn-text" onClick={reset}>Voltar</button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="state-card result error slide-up">
                        <div className="result-header">
                            <FaTimesCircle className="icon-result" />
                            <h2>ACESSO NEGADO</h2>
                        </div>
                        <div className="error-box">
                            <p>{errorMessage}</p>
                        </div>
                        <button className="btn-secondary-large" onClick={startScanner}><FaRedo /> Tentar Novamente</button>
                        <button className="btn-text" onClick={reset}>Voltar ao Início</button>
                    </div>
                )}
            </main>
        </div>
    );
}