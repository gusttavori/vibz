'use client';

import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import './PrivacyPolicy.css';

export default function PrivacyPolicy() {
    return (
        <div className="policy-page-wrapper">
            <Header />

            <main className="policy-content">
                <header className="policy-header">
                    <h1>Política de Privacidade</h1>
                    <p className="subtitle">Transparência total no uso da sua navegação.</p>
                </header>

                <section className="policy-section">
                    <h2>1. Sobre a Vibz</h2>
                    <p>
                        A <strong>Vibz</strong> valoriza a sua privacidade. Por sermos um guia de curadoria cultural, nosso modelo de negócio é baseado na transparência. Diferente de plataformas convencionais, <strong>não coletamos, não armazenamos e não processamos dados pessoais</strong> dos nossos visitantes.
                    </p>
                </section>

                <section className="policy-section">
                    <h2>2. Coleta de Dados</h2>
                    <p>
                        Como a Vibz funciona como um diretório informativo, nossa política de dados é simplificada:
                    </p>
                    <ul>
                        <li><strong>Sem Cadastro:</strong> Não exigimos criação de conta ou login para que você acesse a agenda cultural.</li>
                        <li><strong>Sem Dados Financeiros:</strong> Não processamos pagamentos. Toda transação de ingresso ocorre exclusivamente em plataformas externas oficiais dos organizadores.</li>
                        <li><strong>Cookies Técnicos:</strong> Utilizamos cookies apenas para funções técnicas essenciais (como salvar suas preferências de navegação localmente no seu navegador).</li>
                    </ul>
                </section>

                <section className="policy-section">
                    <h2>3. Sites de Terceiros</h2>
                    <p>
                        Ao navegar na Vibz, você poderá encontrar links que redirecionam para sites de bilheteria ou redes sociais dos produtores. Ao clicar nesses links, você sairá da nossa plataforma. Recomendamos que leia a Política de Privacidade do site de destino, pois a Vibz não possui controle sobre como eles gerenciam seus dados.
                    </p>
                </section>

                <section className="policy-section">
                    <h2>4. Dados Estatísticos</h2>
                    <p>
                        Podemos utilizar ferramentas de análise (como o Google Analytics) para entender o tráfego da nossa plataforma de forma <strong>agregada e anônima</strong>. Isso nos ajuda a saber quais eventos são mais populares e melhorar a experiência de curadoria, sem jamais identificar quem é você.
                    </p>
                </section>

                <section className="policy-section">
                    <h2>5. Contato</h2>
                    <p>
                        Se tiver qualquer dúvida sobre nossa postura em relação à privacidade, entre em contato através do e-mail: <strong>vibzeventos@gmail.com</strong>
                    </p>
                </section>
            </main>

            <Footer />
        </div>
    );
}