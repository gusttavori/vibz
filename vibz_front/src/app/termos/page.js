'use client';

import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import './Termos.css';

export default function TermosDeUso() {
    return (
        <div className="terms-page-wrapper">
            <Header />

            <main className="terms-content">
                <header className="terms-header">
                    <h1>Termos de Uso</h1>
                    <p className="subtitle">Última atualização: Junho de 2026</p>
                </header>

                <section className="terms-section">
                    <h2>1. Sobre a Vibz</h2>
                    <p>
                        A <strong>Vibz</strong> atua como um guia de curadoria cultural, facilitando o acesso às informações sobre eventos, festivais, congressos e atividades em Vitória da Conquista e região. 
                        Nossa plataforma é um diretório informativo e não atua como organizadora ou vendedora de ingressos.
                    </p>
                </section>

                <section className="terms-section">
                    <h2>2. Natureza das Informações</h2>
                    <p>
                        Todas as informações exibidas — como datas, locais, preços e descrições — são fornecidas pelos organizadores dos eventos. 
                        Embora a Vibz se esforce para manter o conteúdo preciso e atualizado através da nossa curadoria, não garantimos a disponibilidade ou a veracidade absoluta das informações. Recomendamos sempre a confirmação nos canais oficiais do evento antes de qualquer planejamento.
                    </p>
                </section>

                <section className="terms-section">
                    <h2>3. Isenção de Responsabilidade</h2>
                    <p>
                        A Vibz não se responsabiliza por:
                    </p>
                    <ul>
                        <li>Cancelamentos, adiamentos ou alterações na grade de eventos;</li>
                        <li>Qualidade, segurança ou execução dos eventos listados;</li>
                        <li>Transações financeiras realizadas em sites externos (sites de venda de ingressos ou produtores);</li>
                        <li>Problemas decorrentes da aquisição de ingressos em canais não oficiais.</li>
                    </ul>
                </section>

                <section className="terms-section">
                    <h2>4. Privacidade e Dados</h2>
                    <p>
                        Como a Vibz é um guia informativo, <strong>não realizamos coleta de dados pessoais</strong>. Não exigimos login ou cadastro para acessar nosso conteúdo. O uso de cookies em nossa plataforma é limitado a funções técnicas essenciais para melhorar a sua navegação.
                    </p>
                </section>

                <section className="terms-section">
                    <h2>5. Propriedade Intelectual</h2>
                    <p>
                        O design, a marca e a estrutura de curadoria da Vibz são de propriedade exclusiva da nossa plataforma. É vedada a cópia integral ou o uso não autorizado de nosso conteúdo de curadoria. Imagens e logotipos de eventos são utilizados com caráter informativo.
                    </p>
                </section>

                <section className="terms-section">
                    <h2>6. Contato</h2>
                    <p>
                        Dúvidas sobre nossa curadoria ou solicitações de parceria podem ser enviadas diretamente para: <strong>vibzeventos@gmail.com</strong>
                    </p>
                </section>
            </main>

            <Footer />
        </div>
    );
}