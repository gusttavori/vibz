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
                    <p className="subtitle">Última atualização: Agosto de 2026</p>
                </header>

                <section className="policy-section">
                    <p>
                        A Vibz valoriza a privacidade e a proteção dos dados pessoais de seus Usuários. Esta Política de Privacidade explica, de forma transparente, quais dados pessoais podem ser tratados pela Vibz, para quais finalidades, com quem podem ser compartilhados, como são protegidos e quais direitos podem ser exercidos pelos titulares.
                    </p>
                    <p>
                        A Política considera a Lei Geral de Proteção de Dados Pessoais — LGPD (Lei nº 13.709/2018), o Marco Civil da Internet (Lei nº 12.965/2014) e as regulamentações aplicáveis da Autoridade Nacional de Proteção de Dados — ANPD.
                    </p>
                </section>

                <section className="policy-section">
                    <h2>1. Quem é responsável pelo tratamento dos dados?</h2>
                    <p>A posição jurídica da Vibz depende da atividade de tratamento realizada.</p>
                    <p><strong>1.1. Vibz como Controladora</strong><br/>
                    A Vibz atua como Controladora quando determina as finalidades e os meios do tratamento necessários para suas próprias atividades, incluindo, conforme aplicável:</p>
                    <ul>
                        <li>criação e gerenciamento de contas;</li>
                        <li>autenticação;</li>
                        <li>emissão técnica de ingressos;</li>
                        <li>funcionamento da Plataforma;</li>
                        <li>comunicações operacionais;</li>
                        <li>segurança;</li>
                        <li>prevenção a fraudes;</li>
                        <li>cumprimento de obrigações legais;</li>
                        <li>atendimento aos Usuários.</li>
                    </ul>
                    <p><strong>1.2. Vibz como Operadora</strong><br/>
                    Em determinadas atividades relacionadas aos formulários personalizados dos Organizadores, a Vibz poderá atuar como Operadora quando tratar dados pessoais em nome do Organizador e conforme as finalidades determinadas por ele.<br/>
                    Nessa situação, o Organizador será responsável por determinar a finalidade e a necessidade da coleta, bem como pelas obrigações que lhe forem atribuídas pela legislação aplicável.</p>
                    <p><strong>1.3. Classificação</strong><br/>
                    A classificação como Controladora ou Operadora será determinada conforme a atividade concreta de tratamento e as decisões efetivamente tomadas sobre suas finalidades e meios, não apenas pela existência de uma funcionalidade tecnológica.</p>
                </section>

                <section className="policy-section">
                    <h2>2. Quais dados pessoais podem ser tratados?</h2>
                    <p>A Vibz busca aplicar o princípio da minimização, tratando apenas dados adequados, pertinentes e necessários às finalidades correspondentes.</p>
                    
                    <p><strong>2.1. Dados de cadastro</strong><br/>
                    Podem ser tratados:</p>
                    <ul>
                        <li>nome;</li>
                        <li>endereço de e-mail;</li>
                        <li>informações necessárias à autenticação e gerenciamento da conta.</li>
                    </ul>

                    <p><strong>2.2. Login via Google</strong><br/>
                    Quando o Usuário optar por utilizar o login via Google, a Vibz poderá receber os dados disponibilizados pelo provedor para autenticação, conforme a configuração e as permissões apresentadas no processo de autenticação.</p>

                    <p><strong>2.3. Dados relacionados aos ingressos</strong><br/>
                    Podem ser tratados:</p>
                    <ul>
                        <li>identificação do ingresso;</li>
                        <li>evento relacionado;</li>
                        <li>situação da inscrição;</li>
                        <li>informações necessárias para emissão;</li>
                        <li>informações necessárias ao controle de acesso e check-in;</li>
                        <li>histórico operacional relacionado à inscrição ou ao ingresso.</li>
                    </ul>

                    <p><strong>2.4. Dados técnicos e registros de acesso</strong><br/>
                    Podem ser tratados dados necessários à operação e segurança da Plataforma, incluindo, conforme aplicável:</p>
                    <ul>
                        <li>endereço IP;</li>
                        <li>data e hora de acesso;</li>
                        <li>informações técnicas do navegador ou dispositivo;</li>
                        <li>registros de acesso;</li>
                        <li>informações de diagnóstico;</li>
                        <li>informações necessárias à prevenção e investigação de fraudes.</li>
                    </ul>
                    <p>Os registros de acesso a aplicações de internet serão mantidos nos casos e pelos prazos determinados pela legislação aplicável.</p>

                    <p><strong>2.5. Dados fornecidos em formulários de eventos</strong><br/>
                    O Organizador poderá utilizar os formulários disponibilizados pela Vibz para solicitar informações adicionais permitidas pela Plataforma, desde que relacionadas à finalidade legítima do evento. Exemplos podem incluir:</p>
                    <ul>
                        <li>telefone;</li>
                        <li>cidade;</li>
                        <li>data de nascimento;</li>
                        <li>informações logísticas;</li>
                        <li>respostas a perguntas relacionadas ao evento.</li>
                    </ul>
                    <p>Esses dados são tratados no contexto do evento correspondente e disponibilizados ao respectivo Organizador por meio das funcionalidades da Plataforma.</p>
                </section>

                <section className="policy-section">
                    <h2>3. Dados que não podem ser solicitados pelos formulários</h2>
                    <p>Como medida de minimização e redução de riscos, a Vibz restringe tecnicamente a utilização dos formulários para determinadas categorias de informações. É proibida a utilização dos formulários para solicitar:</p>
                    <ul>
                        <li>dados pessoais sensíveis, informações sobre saúde, religião, opinião política, origem racial ou étnica, filiação sindical, vida sexual, dados genéticos, dados biométricos;</li>
                        <li>senhas, credenciais de autenticação;</li>
                        <li>números completos de cartões, códigos de segurança de cartões, informações bancárias destinadas à movimentação financeira, chaves Pix;</li>
                        <li>fotografias ou cópias de documentos pessoais;</li>
                        <li>localização GPS em tempo real.</li>
                    </ul>
                    <p>A lista acima não significa que outras formas de tratamento não previstas expressamente nesta Política sejam automaticamente permitidas.</p>
                </section>

                <section className="policy-section">
                    <h2>4. Responsabilidade pelos formulários dos Organizadores</h2>
                    <p>4.1. O Organizador é responsável pela finalidade, necessidade e legitimidade dos dados que decidir solicitar aos participantes por meio dos formulários de seu evento.</p>
                    <p>4.2. O Organizador deve observar a LGPD e demais normas aplicáveis, inclusive quanto à transparência, finalidade, necessidade, segurança, conservação e atendimento aos direitos dos titulares.</p>
                    <p>4.3. A existência de um campo tecnicamente disponível na Plataforma não representa autorização jurídica para qualquer finalidade de tratamento.</p>
                    <p>4.4. A Vibz poderá restringir ou bloquear formulários que violem as regras da Plataforma ou apresentem indícios de tratamento incompatível com a legislação.</p>
                    <p>4.5. O titular poderá entrar em contato com a Vibz para comunicar situações que considere incompatíveis com estas regras.</p>
                </section>

                <section className="policy-section">
                    <h2>5. Para quais finalidades a Vibz trata dados?</h2>
                    <p>Os dados pessoais podem ser tratados para:</p>
                    <ul>
                        <li>criação e gerenciamento de contas;</li>
                        <li>autenticação;</li>
                        <li>emissão e gerenciamento de ingressos;</li>
                        <li>envio de ingressos e comunicações operacionais;</li>
                        <li>funcionamento da Plataforma;</li>
                        <li>disponibilização de ferramentas aos Organizadores;</li>
                        <li>atendimento e suporte;</li>
                        <li>segurança da informação;</li>
                        <li>prevenção e investigação de fraudes;</li>
                        <li>manutenção e melhoria da infraestrutura;</li>
                        <li>cumprimento de obrigações legais e regulatórias;</li>
                        <li>exercício regular de direitos.</li>
                    </ul>
                    <p>A Vibz não utiliza dados pessoais para finalidades incompatíveis com aquelas informadas ao titular ou permitidas pela legislação.</p>
                </section>

                <section className="policy-section">
                    <h2>6. Bases legais</h2>
                    <p>As bases legais utilizadas dependerão da finalidade específica do tratamento.</p>
                    <p><strong>6.1. Execução de contrato:</strong> Quando necessária para execução de contrato ou de procedimentos preliminares relacionados aos serviços solicitados pelo Usuário.</p>
                    <p><strong>6.2. Cumprimento de obrigação legal ou regulatória:</strong> Quando o tratamento for necessário para cumprimento de obrigações impostas pela legislação ou por regulamentação aplicável.</p>
                    <p><strong>6.3. Legítimo interesse:</strong> Quando aplicável e desde que observados os requisitos legais, especialmente para segurança da Plataforma, prevenção de fraudes, proteção dos sistemas, melhoria operacional, e identificação e correção de falhas.</p>
                    <p><strong>6.4. Consentimento:</strong> Quando o consentimento for a base legal adequada e juridicamente necessária para determinada finalidade. Quando o tratamento depender de consentimento, o titular poderá revogá-lo, observadas as consequências e limitações legais.</p>
                </section>

                <section className="policy-section">
                    <h2>7. Com quem os dados podem ser compartilhados?</h2>
                    <p>A Vibz não comercializa dados pessoais. Os dados poderão ser compartilhados, conforme necessário e aplicável, com:</p>
                    <p><strong>7.1. Organizadores:</strong> Dados relacionados ao ingresso e informações fornecidas pelo participante no formulário específico do evento poderão ser disponibilizados ao respectivo Organizador para finalidades relacionadas ao evento.</p>
                    <p><strong>7.2. Provedores de tecnologia e infraestrutura:</strong> Poderão receber dados os fornecedores necessários ao funcionamento da Plataforma, incluindo serviços de:</p>
                    <ul>
                        <li>hospedagem, infraestrutura e armazenamento;</li>
                        <li>envio de e-mails;</li>
                        <li>autenticação, segurança e monitoramento técnico.</li>
                    </ul>
                    <p>O compartilhamento será limitado ao necessário para a prestação do serviço correspondente.</p>
                    <p><strong>7.3. Gateway de pagamento:</strong> Quando a venda de ingressos pagos for reativada, os dados necessários ao processamento da transação poderão ser compartilhados com o provedor de pagamento utilizado pela Vibz. A Vibz não armazenará em seus próprios servidores os dados completos dos cartões de pagamento, conforme a arquitetura implementada para o serviço.</p>
                    <p><strong>7.4. Autoridades públicas:</strong> Dados poderão ser fornecidos quando houver obrigação legal, ordem judicial válida ou outra hipótese legal que autorize ou determine o compartilhamento.</p>
                </section>

                <section className="policy-section">
                    <h2>8. Cookies, Analytics e Tecnologias de Segurança</h2>
                    <p><strong>8.1. Cookies essenciais:</strong> A Vibz utiliza tecnologias necessárias para autenticação, gerenciamento de sessão e segurança da Plataforma. Quando utilizados, cookies de autenticação poderão possuir atributos de segurança como HttpOnly, que impede seu acesso por scripts executados no navegador.</p>
                    <p><strong>8.2. Google Analytics:</strong> A Vibz utiliza o Google Analytics para compreender o uso da Plataforma, analisar tráfego, desempenho e comportamento de navegação e auxiliar na melhoria dos serviços. A coleta e o tratamento realizados pelo Analytics dependem da configuração efetivamente implementada na Plataforma e das funcionalidades disponibilizadas pelo serviço. A Vibz não deverá apresentar os dados como anonimizados ou agregados quando a configuração efetivamente utilizada não garantir essa condição.</p>
                    <p><strong>8.3. Gerenciamento de cookies:</strong> Quando forem utilizados cookies ou tecnologias que não sejam estritamente necessários ao funcionamento da Plataforma, a Vibz observará as exigências legais e regulatórias aplicáveis, inclusive quanto à transparência e, quando necessário, à obtenção de consentimento.</p>
                    
                    {/* Botão de Revogação de Consentimento (LGPD) */}
                    <button 
                        onClick={() => window.dispatchEvent(new Event('vibz-open-cookie-consent'))}
                        style={{
                            marginTop: '15px', padding: '10px 20px', backgroundColor: '#27272a',
                            color: '#fff', border: '1px solid #3f3f46', borderRadius: '8px',
                            cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem'
                        }}
                    >
                        Gerenciar Preferências de Cookies
                    </button>
                </section>

                <section className="policy-section">
                    <h2>9. Segurança da Informação</h2>
                    <p>9.1. A Vibz adota medidas técnicas e administrativas compatíveis com a natureza de suas operações e com os riscos envolvidos para proteger os dados pessoais contra acessos não autorizados e situações acidentais ou ilícitas de destruição, perda, alteração, comunicação ou tratamento inadequado.</p>
                    <p>9.2. Entre as medidas utilizadas poderão estar:</p>
                    <ul>
                        <li>HTTPS/TLS;</li>
                        <li>controle de acesso e autenticação;</li>
                        <li>proteção de sessões e cookies com atributos de segurança;</li>
                        <li>restrição de privilégios;</li>
                        <li>mecanismos de prevenção a fraude e monitoramento técnico;</li>
                        <li>medidas de segurança da infraestrutura.</li>
                    </ul>
                    <p>9.3. Nenhum sistema conectado à internet pode ser considerado absolutamente imune a falhas, ataques ou incidentes.</p>
                    <p>9.4. A Vibz não promete segurança absoluta, mas mantém medidas compatíveis com a natureza, escala e risco de suas operações.</p>
                </section>

                <section className="policy-section">
                    <h2>10. Incidentes de Segurança</h2>
                    <p>10.1. A Vibz manterá procedimentos compatíveis com a legislação aplicável para identificação, avaliação, tratamento e registro de incidentes de segurança envolvendo dados pessoais.</p>
                    <p>10.2. Quando um incidente puder acarretar risco ou dano relevante aos titulares e estiver sujeito à obrigação de comunicação, a Vibz observará os procedimentos e prazos estabelecidos pela regulamentação aplicável da ANPD.</p>
                    <p>A regulamentação atualmente vigente estabelece, para o controlador, prazo de 3 dias úteis para comunicação à ANPD e aos titulares nos casos abrangidos pelo Regulamento de Comunicação de Incidente de Segurança.</p>
                    <p>10.3. A comunicação poderá ocorrer de forma preliminar e complementar quando permitido pela regulamentação aplicável.</p>
                    <p>10.4. A Vibz manterá registro dos incidentes de segurança com dados pessoais pelo período exigido pela regulamentação aplicável.</p>
                </section>

                <section className="policy-section">
                    <h2>11. Retenção e Exclusão dos Dados</h2>
                    <p>11.1. Os dados pessoais serão conservados pelo período necessário para cumprir as finalidades para as quais foram coletados, observadas as obrigações legais, regulatórias e as hipóteses de conservação previstas na LGPD.</p>
                    <p>11.2. A exclusão da conta não implica necessariamente a eliminação imediata de todos os dados. Algumas informações poderão ser conservadas quando necessário para:</p>
                    <ul>
                        <li>cumprimento de obrigação legal ou regulatória;</li>
                        <li>cumprimento de prazos legais de retenção;</li>
                        <li>exercício regular de direitos;</li>
                        <li>prevenção e investigação de fraudes;</li>
                        <li>preservação de registros necessários à segurança;</li>
                        <li>cumprimento de determinações judiciais ou administrativas.</li>
                    </ul>
                    <p>11.3. Os registros de acesso a aplicações de internet serão conservados nos casos e pelos prazos estabelecidos pelo Marco Civil da Internet e demais normas aplicáveis.</p>
                    <p>11.4. Encerrada a necessidade de conservação, os dados serão eliminados, anonimizados ou submetidos a tratamento compatível com a legislação aplicável.</p>
                </section>

                <section className="policy-section">
                    <h2>12. Crianças e Adolescentes</h2>
                    <p>12.1. O tratamento de dados pessoais de crianças e adolescentes observará o princípio do melhor interesse e as regras específicas estabelecidas pela LGPD e demais legislação aplicável.</p>
                    <p>12.2. A Vibz não direciona deliberadamente a Plataforma à coleta autônoma e indiscriminada de dados de crianças.</p>
                    <p>12.3. Quando o tratamento envolver crianças ou adolescentes, serão observadas as exigências legais específicas aplicáveis à situação concreta.</p>
                    <p>12.4. Os Organizadores também deverão observar as regras aplicáveis quando seus eventos ou formulários envolverem crianças ou adolescentes.</p>
                </section>

                <section className="policy-section">
                    <h2>13. Direitos dos Titulares</h2>
                    <p>Nos termos do art. 18 da LGPD e observadas as condições, hipóteses e limitações legais, o titular poderá solicitar, conforme aplicável:</p>
                    <ul>
                        <li>confirmação da existência de tratamento;</li>
                        <li>acesso aos dados pessoais;</li>
                        <li>correção de dados incompletos, inexatos ou desatualizados;</li>
                        <li>anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade com a legislação;</li>
                        <li>portabilidade dos dados, observada a regulamentação aplicável;</li>
                        <li>eliminação dos dados tratados com base no consentimento, ressalvadas as hipóteses legais de conservação;</li>
                        <li>informações sobre entidades públicas e privadas com as quais os dados tenham sido compartilhados;</li>
                        <li>informações sobre a possibilidade de não fornecer consentimento e suas consequências;</li>
                        <li>revogação do consentimento;</li>
                        <li>oposição ao tratamento realizado com fundamento em legítimo interesse, quando cabível;</li>
                        <li>revisão de decisões tomadas unicamente com base em tratamento automatizado, quando aplicável.</li>
                    </ul>
                    <p>O exercício desses direitos poderá estar sujeito às condições, procedimentos e limitações previstos na legislação.</p>
                </section>

                <section className="policy-section">
                    <h2>14. Canal de Privacidade</h2>
                    <p>A Vibz disponibiliza um canal eletrônico para solicitações relacionadas à privacidade e proteção de dados.<br/>
                    <strong>E-mail:</strong> vibzeventos@gmail.com</p>
                    <p>O canal poderá ser utilizado para:</p>
                    <ul>
                        <li>solicitações relacionadas aos direitos dos titulares;</li>
                        <li>dúvidas sobre esta Política;</li>
                        <li>solicitações de exclusão de conta;</li>
                        <li>comunicação de problemas relacionados a formulários;</li>
                        <li>comunicação de possíveis incidentes ou violações de privacidade.</li>
                    </ul>
                    <p>Quando a Vibz estiver legalmente dispensada de indicar um Encarregado pelo tratamento de dados, o canal eletrônico acima funcionará como canal de comunicação com os titulares, conforme a regulamentação aplicável aos agentes de tratamento de pequeno porte. A Resolução CD/ANPD nº 2/2022 prevê essa possibilidade para agentes que se enquadrem nos requisitos aplicáveis.</p>
                </section>

                <section className="policy-section">
                    <h2>15. Agentes de Tratamento de Pequeno Porte</h2>
                    <p>Quando a Vibz estiver enquadrada como agente de tratamento de pequeno porte e preencher os requisitos legais e regulamentares para esse tratamento diferenciado, poderá usufruir das flexibilizações previstas na regulamentação da ANPD. Isso não elimina os princípios, direitos dos titulares, bases legais e demais obrigações estabelecidas pela LGPD.</p>
                </section>

                <section className="policy-section">
                    <h2>16. Transferência Internacional de Dados</h2>
                    <p>Alguns provedores de tecnologia utilizados pela Vibz poderão realizar tratamento de dados fora do Brasil. Quando houver transferência internacional de dados pessoais, a Vibz observará os requisitos e mecanismos previstos na LGPD e na regulamentação aplicável da ANPD. A Vibz buscará utilizar mecanismos de transferência compatíveis com a legislação aplicável e adequados às circunstâncias do tratamento.</p>
                </section>

                <section className="policy-section">
                    <h2>17. Alterações desta Política</h2>
                    <p>17.1. Esta Política poderá ser atualizada para refletir mudanças na Plataforma, alterações operacionais, evolução tecnológica ou mudanças na legislação e regulamentação aplicáveis.</p>
                    <p>17.2. A versão vigente permanecerá disponível na Plataforma e será identificada pela respectiva data de atualização.</p>
                    <p>17.3. Alterações relevantes poderão ser comunicadas por meios razoáveis, quando aplicável.</p>
                </section>
            </main>

            <Footer />
        </div>
    );
}