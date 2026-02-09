'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import './Termos.css'; // Certifique-se de que o CSS está nesta pasta
import Header from '@/components/Header';

export default function TermosDeUso() {
    const router = useRouter();

    const handleCreateEventClick = () => {
        router.push('/cadastrar-evento');
    };

    const handleLoginClick = () => {
        router.push('/login');
    };

    return (
        <div className="terms-of-use-container">
            <Header/>

            <main className="terms-of-use-content">
                <h1 className="policy-title">Termos de Uso</h1>
                <p>
                    Estes Termos de Uso regulam o acesso e a utilização da <strong>Vibz</strong>, plataforma digital para divulgação, organização e compra de ingressos para eventos. Ao utilizar nossos serviços, você concorda com os termos descritos abaixo.
                </p>

                <section className="policy-section">
                    <h2 className="section-title">1. Definições</h2>
                    <ul className="policy-list">
                        <li><strong>1.1 Plataforma:</strong> Refere-se ao site, aplicativo e demais serviços digitais oferecidos pela Vibz.</li>
                        <li><strong>1.2 Usuário:</strong> Qualquer pessoa que acesse e utilize a plataforma, seja como visitante, organizador de eventos ou participante.</li>
                        <li><strong>1.3 Organizador:</strong> Pessoa física ou jurídica responsável pela criação e gerenciamento de eventos na plataforma.</li>
                        <li><strong>1.4 Participante:</strong> Usuário que adquire ingressos ou se inscreve em eventos divulgados na Vibz.</li>
                    </ul>
                </section>

                <section className="policy-section">
                    <h2 className="section-title">2. Uso da Plataforma</h2>
                    <ul className="policy-list">
                        <li><strong>2.1 Cadastro:</strong> Para criar eventos ou comprar ingressos, o usuário deve se cadastrar com informações verdadeiras e atualizadas.</li>
                        <li><strong>2.2 Responsabilidade do Organizador:</strong> O organizador é totalmente responsável pelo conteúdo, veracidade e legalidade das informações sobre seu evento.</li>
                        <li><strong>2.3 Moderação:</strong> A Vibz poderá remover ou editar conteúdos que violem a lei ou nossas diretrizes.</li>
                    </ul>
                </section>

                <section className="policy-section">
                    <h2 className="section-title">3. Direitos e Obrigações</h2>
                    <ul className="policy-list">
                        <li><strong>3.1 Organizadores:</strong> Divulgar eventos com informações corretas e atualizadas, respeitar direitos autorais e leis vigentes, e não publicar conteúdos ofensivos, discriminatórios ou fraudulentos.</li>
                        <li><strong>3.2 Participantes:</strong> Utilizar a plataforma de forma responsável, verificar as informações dos eventos antes da compra e compreender que a Vibz não se responsabiliza pela execução ou alterações dos eventos.</li>
                        <li><strong>3.3 Vibz:</strong> Disponibilizar um ambiente seguro e funcional, atuando como intermediária na transação entre organizadores e participantes, sem se responsabilizar pela execução ou qualidade dos eventos.</li>
                    </ul>
                </section>

                <section className="policy-section">
                    <h2 className="section-title">4. Compra de Ingressos</h2>
                    <ul className="policy-list">
                        <li><strong>4.1</strong> Valores, taxas e políticas de reembolso são definidos pelo organizador e informados na página do evento.</li>
                        <li><strong>4.2</strong> Ingressos são pessoais e intransferíveis, salvo autorização expressa do organizador.</li>
                        <li><strong>4.3</strong> A confirmação da compra será enviada por e-mail, contendo QR Code ou código de validação para acesso ao evento.</li>
                    </ul>
                </section>

                <section className="policy-section">
                    <h2 className="section-title">5. Propriedade Intelectual</h2>
                    <ul className="policy-list">
                        <li><strong>5.1</strong> Todos os conteúdos da Vibz, incluindo textos, logotipos, design e software, são protegidos por direitos autorais e não podem ser utilizados sem autorização.</li>
                    </ul>
                </section>

                <section className="policy-section">
                    <h2 className="section-title">6. Privacidade</h2>
                    <ul className="policy-list">
                        <li><strong>6.1</strong> A Vibz respeita a privacidade dos usuários e segue a legislação brasileira de proteção de dados (LGPD). Para mais detalhes, consulte nossa Política de Privacidade.</li>
                    </ul>
                </section>

                <section className="policy-section">
                    <h2 className="section-title">7. Limitação de Responsabilidade</h2>
                    <ul className="policy-list">
                        <li><strong>7.1</strong> A Vibz atua exclusivamente como intermediária tecnológica e não se responsabiliza por cancelamentos, alterações ou problemas decorrentes da execução dos eventos.</li>
                    </ul>
                </section>

                <section className="policy-section">
                    <h2 className="section-title">8. Alterações nos Termos</h2>
                    <ul className="policy-list">
                        <li><strong>8.1</strong> Podemos alterar estes Termos de Uso a qualquer momento. Alterações relevantes serão comunicadas e o uso contínuo da plataforma indica aceitação das mudanças.</li>
                    </ul>
                </section>

                <section className="policy-section">
                    <h2 className="section-title">9. Contato</h2>
                    <ul className="policy-list">
                        <li><strong>9.1</strong> Dúvidas ou solicitações podem ser enviadas para: <strong>contato@vibz.com.br</strong></li>
                    </ul>
                </section>
            </main>

            <footer className="footer">
                <img src="/img/vibe_site.png" alt="Logo da Vibz" className="footer-logo-img" />
            </footer>
        </div>
    );
}