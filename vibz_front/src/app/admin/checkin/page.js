'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode'; 
import toast, { Toaster } from 'react-hot-toast';
import { 
    FaQrcode, FaCheckCircle, FaTimesCircle, FaUser, 
    FaTicketAlt, FaCalendarDay, FaRedo, FaCamera, FaChevronLeft, FaLock
} from 'react-icons/fa';
import './Validador.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function ValidadorUniversal() {
    const [scanResult, setScanResult] = useState(null);
    const [status, setStatus] = useState('checking_permission'); // Novo estado inicial
    const [errorMessage, setErrorMessage] = useState('');
    const html5QrCodeRef = useRef(null);

    // Efeito para verificar se o usuário é organizador antes de mostrar o validador
    useEffect(() => {
        const checkPermission = async () => {
            try {
                const token = localStorage.getItem('userToken')?.replace(/"/g, '');
                if (!token) {
                    setStatus('unauthorized');
                    return;
                }
                // Verificamos no perfil se ele tem eventos ou é staff
                const res = await fetch(`${API_BASE_URL}/users/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                
                // Se não tiver eventos criados e não for admin, bloqueia
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
                    <span className="nav-badge">Painel de Controle</span>
                </div>
            </header>

            <main className="validator-main">
                {status === 'idle' && (
                    <div className="state-card idle">
                        <FaQrcode size={60} />
                        <h1>Validador Oficial</h1>
                        <button className="btn-primary-large" onClick={startScanner}><FaCamera /> Abrir Câmera</button>
                    </div>
                )}

                {status === 'scanning' && (
                    <div className="state-fullscreen">
                        <div id="reader"></div>
                        <button className="btn-close-scan" onClick={() => setStatus('idle')}><FaChevronLeft /> Voltar</button>
                    </div>
                )}

                {status === 'processing' && <div className="spinner"></div>}

                {status === 'success' && (
                    <div className="state-card result success">
                        <FaCheckCircle className="icon-result" />
                        <h2>{scanResult?.user}</h2>
                        <p>{scanResult?.type}</p>
                        <button className="btn-primary-large" onClick={startScanner}>Próxima Leitura</button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="state-card result error">
                        <FaTimesCircle className="icon-result" />
                        <h2>NEGADO</h2>
                        <p>{errorMessage}</p>
                        <button className="btn-secondary-large" onClick={startScanner}><FaRedo /> Tentar Novamente</button>
                    </div>
                )}
            </main>
        </div>
    );
}