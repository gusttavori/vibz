'use client';

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FaCheckCircle, FaTicketAlt, FaHome } from 'react-icons/fa';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import './Sucesso.css'; 

export default function SucessoPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('session_id');

    return (
        <div className="success-page-container">
            <Header />
            
            <main className="success-content">
                <div className="success-card">
                    <div className="icon-wrapper">
                        <FaCheckCircle className="success-icon" />
                    </div>
                    
                    <h1>Pagamento Confirmado!</h1>
                    <p className="subtitle">Sua compra foi realizada com sucesso.</p>
                    
                    <div className="info-box">
                        <p><strong>Enviamos os ingressos para o seu e-mail.</strong></p>
                        <p className="small">Verifique também sua caixa de spam.</p>
                    </div>

                    <div className="actions">
                        {/* CORREÇÃO AQUI: Mudamos de /meus-eventos para /perfil */}
                        <button 
                            onClick={() => router.push('/perfil')} 
                            className="btn-primary"
                        >
                            <FaTicketAlt /> Ver Meus Ingressos
                        </button>
                        
                        <Link href="/" className="btn-secondary">
                            <FaHome /> Voltar para Home
                        </Link>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}