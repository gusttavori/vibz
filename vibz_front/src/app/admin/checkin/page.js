'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import toast, { Toaster } from 'react-hot-toast';
import { 
    FaQrcode, FaCheckCircle, FaTimesCircle, FaUser, 
    FaTicketAlt, FaCalendarDay, FaRedo, FaCamera, FaChevronLeft
} from 'react-icons/fa';
import './Validador.css';

const getApiBaseUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
    }

    if (typeof window === 'undefined') return 'http://localhost:5000/api';
    
    return `${window.location.protocol}//${window.location.hostname}:5000/api`;
};

export default function ValidadorUniversal() {
    const [scanResult, setScanResult] = useState(null);
    const [status, setStatus] = useState('idle'); // idle, scanning, processing, success, error
    const [errorMessage, setErrorMessage] = useState('');
    
    const API_BASE_URL = getApiBaseUrl();
    
    const scannerRef = useRef(null);
    const observerRef = useRef(null);

    // Feedback tátil (vibração)
    const triggerHaptic = (type) => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            if (type === 'success') navigator.vibrate([50, 50, 50]); // Vibração curta e leve
            if (type === 'error') navigator.vibrate([200, 100, 200]); // Vibração longa e pesada
        }
    };

    // Função chamada ao detectar um QR Code
    const onScanSuccess = async (decodedText) => {
        // Pausa o scanner para evitar múltiplas leituras
        if (scannerRef.current) {
            scannerRef.current.clear().catch(err => console.error("Erro ao limpar scanner", err));
        }
        if (observerRef.current) observerRef.current.disconnect();

        setStatus('processing');

        try {
            const token = localStorage.getItem('userToken');
            const cleanToken = token ? token.replace(/"/g, '') : '';
            
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
                setScanResult(data.details); // Detalhes do ingresso (nome, tipo, evento)
                triggerHaptic('success');
                toast.success("VALIDADO!", { duration: 2000 });
                // Reproduzir som de sucesso (opcional)
                // playSound('success'); 
            } else {
                setStatus('error');
                let msg = data.message || "Ingresso Inválido";
                if (data.usedAt) {
                    const hora = new Date(data.usedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    msg = `USADO HOJE ÀS ${hora}`;
                }
                setErrorMessage(msg);
                triggerHaptic('error');
                toast.error("NEGADO", { duration: 3000 });
                // Reproduzir som de erro (opcional)
                // playSound('error');
            }
        } catch (error) {
            setStatus('error');
            console.error(error);
            setErrorMessage("Erro de conexão. Verifique se o Backend está rodando.");
            toast.error("Sem conexão");
        }
    };

    const startScanner = () => {
        setScanResult(null);
        setErrorMessage('');
        setStatus('scanning');

        // Pequeno delay para garantir que o DOM renderizou o elemento 'reader'
        setTimeout(() => {
            const scanner = new Html5QrcodeScanner(
                "reader",
                { 
                    fps: 10, // Frames por segundo
                    qrbox: { width: 250, height: 250 }, // Área de leitura
                    aspectRatio: 1.0,
                    showTorchButtonIfSupported: true,
                    videoConstraints: {
                        facingMode: "environment", // Câmera traseira
                        focusMode: "continuous"
                    }
                },
                false
            );
            
            scanner.render(onScanSuccess, (errorMessage) => {
                // Erros de leitura frame a frame são comuns, ignoramos para não poluir o log
            });
            scannerRef.current = scanner;

            // Observer para customizar a interface da lib html5-qrcode (ex: trocar textos em inglês)
            const readerElement = document.getElementById('reader');
            if (readerElement) {
                const observer = new MutationObserver(() => {
                    const swapLink = document.getElementById('html5-qrcode-anchor-scan-type-change'); // ID pode variar dependendo da versão, mas geralmente é este ou similar
                    if (swapLink) {
                         // Customizações de texto se necessário
                         if (swapLink.innerText.includes('Scan an Image')) swapLink.innerText = 'Enviar Foto';
                         else if (swapLink.innerText.includes('camera')) swapLink.innerText = 'Usar Câmera';
                    }
                });
                observer.observe(readerElement, { childList: true, subtree: true });
                observerRef.current = observer;
            }
        }, 100);
    };

    // Limpeza ao desmontar
    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(() => {});
            }
            if (observerRef.current) observerRef.current.disconnect();
        };
    }, []);

    const reset = () => {
        setStatus('idle');
        setScanResult(null);
    }

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
                        <button className="btn-close-scan" onClick={() => {
                            if (scannerRef.current) scannerRef.current.clear().catch(() => {});
                            reset();
                        }}>
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