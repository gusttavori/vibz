// src/components/VLibrasWidget.js
'use client';

import { useEffect } from 'react';

export default function VLibrasWidget() {
    useEffect(() => {
        // Cria a tag de script dinamicamente
        const script = document.createElement('script');
        script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
        script.async = true;
        
        script.onload = () => {
            // Quando o script carregar, inicializa o widget
            if (window.VLibras) {
                new window.VLibras.Widget('https://vlibras.gov.br/app');
            }
        };

        document.body.appendChild(script);

        // Limpeza (embora no layout principal raramente desmonte)
        return () => {
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        };
    }, []);

    return (
        <div vw="true" className="enabled">
            <div vw-access-button="true" className="active"></div>
            <div vw-plugin-wrapper="true">
                <div className="vw-plugin-top-wrapper"></div>
            </div>
        </div>
    );
}