"use client";
import { useEffect, useState } from "react";

const CONSENT_KEY = "vibz_cookie_consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Verifica se já tem consentimento ao carregar
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      setVisible(true);
    }

    // Fica escutando se alguma página (como a Política) pedir para abrir o modal
    const handleOpenModal = () => setVisible(true);
    window.addEventListener("vibz-open-cookie-consent", handleOpenModal);

    return () => {
      window.removeEventListener("vibz-open-cookie-consent", handleOpenModal);
    };
  }, []);

  const updateConsent = (analytics) => {
    const consent = {
      necessary: true,
      analytics,
      timestamp: new Date().toISOString(),
    };

    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    window.dispatchEvent(new CustomEvent("vibz-consent-change", { detail: consent }));
    
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div role="dialog" aria-label="Preferências de cookies" className="cookie-consent">
      <div className="cookie-consent-content">
        <h2>Utilizamos cookies</h2>
        <p>
          A Vibz utiliza cookies necessários para o funcionamento seguro
          da plataforma e, com sua autorização, tecnologias de análise para
          compreender como o site é utilizado.
        </p>
        <div className="cookie-consent-actions">
          <button onClick={() => updateConsent(false)}>Recusar Não Essenciais</button>
          <button onClick={() => updateConsent(true)}>Aceitar Todos</button>
        </div>
      </div>
    </div>
  );
}