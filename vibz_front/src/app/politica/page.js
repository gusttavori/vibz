'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import './PrivacyPolicy.css'; // Certifique-se de copiar o CSS para a pasta src/app/politica/

export default function PrivacyPolicy() {
    const router = useRouter();

    const handleCreateEventClick = () => {
        router.push('/cadastrar-evento');
    };

    const handleLoginClick = () => {
        router.push('/login');
    };

    return (
        <div className="privacy-policy-container">
            <Header/>

            <main className="privacy-policy-content">
                <h1 className="policy-title">Política de Privacidade</h1>
                <p>
                    Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações ao utilizar a <strong>Vibz</strong>, nossa plataforma de divulgação, organização e venda de ingressos para eventos.
                </p>

                <section className="policy-section">
                    <h2 className="section-title">1. Informações Coletadas</h2>
                    <ul className="policy-list">
                        <li><strong>1.1 Dados Pessoais:</strong> Nome, CPF, e-mail, telefone, endereço e outras informações fornecidas no cadastro ou compra de ingressos.</li>
                        <li><strong>1.2 Dados de Pagamento:</strong> Informações necessárias para processar transações, coletadas por intermediadores de pagamento e não armazenadas diretamente pela Vibz.</li>
                        <li><strong>1.3 Dados de Uso:</strong> Informações sobre navegação, páginas visitadas, interações com eventos e dispositivo utilizado.</li>
                        <li><strong>1.4 Cookies e Tecnologias Semelhantes:</strong> Utilizamos cookies para melhorar sua experiência, personalizar conteúdo e recomendar eventos.</li>
                    </ul>
                </section>

                <section className="policy-section">
                    <h2 className="section-title">2. Uso das Informações</h2>
                    <p>Todas as informações coletadas são usadas para:</p>
                    <ul className="policy-list">
                        <li><strong>2.1</strong> Processar cadastros e compras de ingressos.</li>
                        <li><strong>2.2</strong> Divulgar eventos de forma personalizada.</li>
                        <li><strong>2.3</strong> Enviar confirmações, novidades e atualizações.</li>
                        <li><strong>2.4</strong> Garantir a segurança dos usuários e prevenir fraudes.</li>
                        <li><strong>2.5</strong> Melhorar e otimizar a experiência na plataforma.</li>
                    </ul>
                    <p>Todos os dados trafegam criptografados e são armazenados em servidores seguros.</p>
                </section>

                <section className="policy-section">
                    <h2 className="section-title">3. Compartilhamento de Dados</h2>
                    <p>Não vendemos seus dados. Podemos compartilhá-los apenas:</p>
                    <ul className="policy-list">
                        <li><strong>3.1</strong> Com prestadores de serviços necessários para o funcionamento da plataforma.</li>
                        <li><strong>3.2</strong> Para cumprir obrigações legais ou ordens judiciais.</li>
                        <li><strong>3.3</strong> Com seu consentimento expresso.</li>
                    </ul>
                </section>

                <section className="policy-section">
                    <h2 className="section-title">4. Direitos do Titular</h2>
                    <ul className="policy-list">
                        <li><strong>4.1</strong> Confirmar, acessar e corrigir seus dados.</li>
                        <li><strong>4.2</strong> Solicitar anonimização, bloqueio ou exclusão de dados.</li>
                        <li><strong>4.3</strong> Solicitar portabilidade para outro serviço.</li>
                        <li><strong>4.4</strong> Revogar consentimento para tratamento de dados.</li>
                    </ul>
                </section>

                <section className="policy-section">
                    <h2 className="section-title">5. Retenção de Dados</h2>
                    <p>Manteremos seus dados apenas pelo tempo necessário para cumprir as finalidades descritas nesta política ou exigências legais.</p>
                </section>

                <section className="policy-section">
                    <h2 className="section-title">6. Alterações na Política</h2>
                    <p>Podemos atualizar esta Política periodicamente. Alterações relevantes serão comunicadas e a data da última atualização estará sempre disponível.</p>
                </section>

                <section className="policy-section">
                    <h2 className="section-title">7. Contato</h2>
                    <p>Dúvidas ou solicitações sobre privacidade podem ser enviadas para: <strong>privacidade@vibz.com.br</strong></p>
                </section>
            </main>

            <footer className="footer">
                <img src="/img/vibe_site.png" alt="Logo da Vibz" className="footer-logo-img" />
            </footer>
        </div>
    );
}