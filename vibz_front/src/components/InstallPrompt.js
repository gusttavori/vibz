'use client';
import { useState, useEffect } from 'react';
import { FaDownload, FaTimes } from 'react-icons/fa';
import './InstallPrompt.css';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detectar iOS
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIos);

    // Lógica Android/Chrome
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Só mostra se o usuário não recusou antes
      if (!localStorage.getItem('installRefused')) {
        setShow(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Lógica iOS (Mostra se não estiver instalado e não recusou)
    if (isIos && !window.navigator.standalone && !localStorage.getItem('installRefused')) {
        setShow(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
        alert("Para instalar no iPhone:\n1. Toque no botão de Compartilhar (quadrado com seta)\n2. Selecione 'Adicionar à Tela de Início'");
    } else if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') setShow(false);
        setDeferredPrompt(null);
    }
  };

  const handleClose = () => {
    setShow(false);
    localStorage.setItem('installRefused', 'true');
  };

  if (!show) return null;

  return (
    <div className="install-prompt-overlay">
      <div className="install-card">
        <div className="install-text">
          <strong>Instalar App Vibz</strong>
          <p>Melhor experiência e acesso offline.</p>
        </div>
        <div className="install-actions">
          <button className="btn-install" onClick={handleInstallClick}>
            <FaDownload /> {isIOS ? 'Instalar' : 'Baixar'}
          </button>
          <button className="btn-close" onClick={handleClose}>
            <FaTimes />
          </button>
        </div>
      </div>
    </div>
  );
}