'use client';

import React, { useState, useEffect } from 'react';
import { FaDownload, FaTimes, FaShareSquare, FaPlusSquare } from 'react-icons/fa';
import './InstallAppButton.css'; // Criaremos a seguir

const InstallAppButton = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isIOS, setIsIOS] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // 1. Verifica se já está instalado (Standalone)
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
            setIsStandalone(true);
        }

        // 2. Detecta se é iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        setIsIOS(/iphone|ipad|ipod/.test(userAgent));

        // 3. Captura o evento de instalação do Chrome/Android
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleClick = () => {
        if (isIOS) {
            // Se for iPhone, abre o modal de instruções
            setShowModal(true);
        } else if (deferredPrompt) {
            // Se for Android/Desktop, força o prompt nativo
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    setDeferredPrompt(null);
                }
            });
        } else {
            // Fallback caso não suporte ou já esteja instalado
            alert("Para instalar, verifique as configurações do seu navegador ou clique em 'Adicionar à tela de início'.");
        }
    };

    // Se já estiver instalado como App, não mostra o botão
    if (isStandalone) return null;

    return (
        <>
            {/* O Botão que vai no Footer */}
            <button className="footer-install-btn" onClick={handleClick}>
                <FaDownload /> Instalar App
            </button>

            {/* O Modal para iOS */}
            {showModal && (
                <div className="ios-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="ios-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="ios-modal-header">
                            <h3>Instalar no iPhone</h3>
                            <button onClick={() => setShowModal(false)}><FaTimes /></button>
                        </div>
                        
                        <div className="ios-instructions">
                            <p>O iOS não permite instalação automática. Siga estes passos simples:</p>
                            
                            <div className="step">
                                <span className="step-number">1</span>
                                <p>Toque no botão de <strong>Compartilhar</strong> na barra inferior do navegador.</p>
                                <FaShareSquare className="step-icon" />
                            </div>

                            <div className="step">
                                <span className="step-number">2</span>
                                <p>Role para baixo e selecione <strong>"Adicionar à Tela de Início"</strong>.</p>
                                <FaPlusSquare className="step-icon" />
                            </div>
                            
                            <div className="step">
                                <span className="step-number">3</span>
                                <p>Clique em <strong>"Adicionar"</strong> no canto superior direito.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default InstallAppButton;