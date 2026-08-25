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
                    <p className="subtitle">Última atualização: Agosto de 2026</p>
                </header>

                <section className="terms-section">
                    <p>
                        Estes Termos de Uso ("Termos") regulamentam o acesso e a utilização da plataforma tecnológica de eventos Vibz (doravante "Plataforma" ou "Vibz"), disponibilizada digitalmente.
                    </p>
                    <p>
                        Ao criar uma conta, acessar ou utilizar a Plataforma, o usuário ("Usuário", "Comprador", "Participante" ou "Organizador") declara que leu e concorda com estes Termos. Caso não concorde com qualquer de suas disposições, deverá deixar de utilizar a Plataforma.
                    </p>
                </section>

                <section className="terms-section">
                    <h2>1. Sobre a Vibz e a Natureza dos Serviços</h2>
                    <p>1.1. A Vibz é uma plataforma de tecnologia para eventos que fornece infraestrutura digital para publicação e divulgação de eventos, emissão de ingressos, gestão de inscrições, comunicação operacional e ferramentas de apoio à gestão de eventos.</p>
                    <p>1.2. A Plataforma conecta organizadores independentes ("Organizadores") ao público interessado ("Compradores" ou "Participantes"), disponibilizando recursos tecnológicos para facilitar a organização e participação em eventos.</p>
                    <p>1.3. Salvo quando expressamente indicado na própria Plataforma, a Vibz não é criadora, produtora, organizadora, promotora ou executora dos eventos publicados pelos Organizadores.</p>
                    <p>1.4. A responsabilidade pela realização, organização, estrutura, programação, segurança, acessibilidade, classificação etária, condições de acesso e demais aspectos relacionados à execução de cada evento é do respectivo Organizador, sem prejuízo das responsabilidades que eventualmente possam ser atribuídas à Vibz pela legislação aplicável.</p>
                </section>

                <section className="terms-section">
                    <h2>2. Cadastro e Acesso à Plataforma</h2>
                    <p>2.1. Algumas funcionalidades da Plataforma, incluindo a emissão de ingressos e a publicação de eventos, poderão exigir a criação de uma conta.</p>
                    <p>2.2. O cadastro poderá ser realizado mediante fornecimento de informações solicitadas pela Plataforma ou por meio de provedores de autenticação de terceiros disponibilizados pela Vibz, como o login via Google.</p>
                    <p>2.3. O Usuário declara que fornecerá informações verdadeiras, completas e atualizadas quando exigidas para utilização das funcionalidades da Plataforma.</p>
                    <p>2.4. O Usuário é responsável pela manutenção da segurança e confidencialidade de suas credenciais de acesso e deverá comunicar à Vibz qualquer utilização não autorizada de sua conta de que tenha conhecimento.</p>
                    <p>2.5. A Vibz poderá adotar medidas de segurança, verificação ou bloqueio quando identificar atividade incompatível com estes Termos, indícios de fraude ou risco à segurança da Plataforma.</p>
                    <p>2.6. Os eventos poderão possuir classificação etária definida pelo Organizador ou decorrente da legislação aplicável. É responsabilidade do Usuário verificar as condições de acesso antes de adquirir ou solicitar um ingresso.</p>
                </section>

                <section className="terms-section">
                    <h2>3. Publicação de Eventos e Responsabilidades do Organizador</h2>
                    <p>3.1. O Organizador é responsável pelas informações e conteúdos relacionados ao evento que publicar na Plataforma, incluindo, entre outros:</p>
                    <ul>
                        <li>nome e descrição do evento;</li>
                        <li>data e horário;</li>
                        <li>local;</li>
                        <li>atrações e programação;</li>
                        <li>preços;</li>
                        <li>classificação etária;</li>
                        <li>regras de acesso;</li>
                        <li>condições de participação;</li>
                        <li>informações sobre acessibilidade;</li>
                        <li>informações de contato;</li>
                        <li>alterações, adiamentos ou cancelamentos;</li>
                        <li>realização e execução do evento.</li>
                    </ul>
                    <p>3.2. O Organizador declara que possui os direitos, autorizações e licenças necessários para publicar os conteúdos e promover o evento, responsabilizando-se pelo cumprimento das normas aplicáveis à sua atividade.</p>
                    <p>3.3. O Organizador não poderá utilizar a Plataforma para promover atividades ilícitas, fraudulentas, discriminatórias, enganosas ou que violem direitos de terceiros ou a legislação brasileira.</p>
                    <p>3.4. A Vibz poderá analisar, restringir, suspender ou remover conteúdos, eventos ou contas que apresentem indícios de violação destes Termos, da legislação ou de riscos à segurança dos Usuários ou da Plataforma.</p>
                    <p>3.5. A eventual disponibilização de um evento na Plataforma não significa que a Vibz tenha validado, certificado ou garantido a veracidade de todas as informações fornecidas pelo Organizador.</p>
                </section>

                <section className="terms-section">
                    <h2>4. Formulários Personalizados e Tratamento de Dados</h2>
                    <p>4.1. A Vibz disponibiliza aos Organizadores uma ferramenta para criação de formulários personalizados destinados à coleta de informações adicionais dos Participantes, quando necessárias à organização e execução de seus eventos.</p>
                    <p>4.2. Os Organizadores devem observar os princípios da finalidade, adequação, necessidade, transparência, segurança, prevenção e demais princípios estabelecidos pela LGPD.</p>
                    <p>4.3. A Vibz adota restrições técnicas destinadas a impedir ou dificultar a utilização dos formulários para coleta de categorias de dados consideradas inadequadas ou de elevado risco para a Plataforma.</p>
                    <p>4.4. É proibida a utilização dos formulários da Vibz para solicitar:</p>
                    <ul>
                        <li>dados pessoais sensíveis, incluindo informações sobre origem racial ou étnica, religião, opinião política, filiação sindical, saúde, vida sexual, dados genéticos ou biométricos;</li>
                        <li>senhas ou credenciais de autenticação;</li>
                        <li>números completos de cartões de pagamento, códigos de segurança ou informações bancárias destinadas à movimentação financeira;</li>
                        <li>chaves Pix ou informações equivalentes utilizadas para autenticação ou movimentação financeira;</li>
                        <li>fotografias, digitalizações ou cópias de documentos pessoais, como RG, CNH ou passaporte;</li>
                        <li>dados de localização GPS em tempo real.</li>
                    </ul>
                    <p>4.5. A existência de determinado campo ou recurso na Plataforma não significa que qualquer utilização daquele campo seja juridicamente autorizada.</p>
                    <p>4.6. O Organizador é responsável por definir a finalidade, necessidade e forma de utilização dos dados que solicitar por meio de seus formulários, bem como por cumprir as obrigações legais relacionadas ao tratamento dessas informações.</p>
                    <p>4.7. Quando o Organizador determinar as finalidades e os meios do tratamento dos dados coletados em seu formulário, ele será responsável, na condição jurídica aplicável, pelo tratamento desses dados, inclusive quanto às informações fornecidas aos titulares e ao atendimento de seus direitos.</p>
                    <p>4.8. A Vibz fornece a infraestrutura tecnológica para coleta, armazenamento, disponibilização e gerenciamento dessas informações dentro das funcionalidades oferecidas pela Plataforma, podendo atuar como Operadora quando tratar os dados em nome do Organizador e de acordo com as finalidades por ele determinadas.</p>
                    <p>4.9. O Organizador não poderá utilizar os formulários para finalidades incompatíveis com o evento, para envio abusivo de comunicações ou para coleta indiscriminada de informações.</p>
                    <p>4.10. A Vibz poderá restringir, bloquear ou remover formulários que violem estes Termos, apresentem risco relevante ou sejam incompatíveis com a legislação aplicável.</p>
                    <p>4.11. O Participante poderá comunicar à Vibz qualquer formulário ou solicitação de dados que considere abusivo, inadequado ou incompatível com estas regras.</p>
                </section>

                <section className="terms-section">
                    <h2>5. Ingressos, Compras e Pagamentos</h2>
                    <p>5.1. Atualmente, a Plataforma permite a emissão de ingressos gratuitos.</p>
                    <p>5.2. As funcionalidades relacionadas à venda de ingressos pagos e processamento financeiro encontram-se temporariamente desativadas e poderão ser reativadas futuramente.</p>
                    <p>5.3. Quando a bilheteria paga estiver ativa, os pagamentos serão processados por meio de provedor especializado de serviços de pagamento (gateway).</p>
                    <p>5.4. A Vibz não pretende armazenar em seus próprios servidores os dados completos de cartões de pagamento, utilizando a infraestrutura do provedor de pagamento para processamento das transações.</p>
                    <p>5.5. Quando a venda de ingressos pagos estiver ativa, será aplicada uma taxa de conveniência de 10% (dez por cento) sobre o valor do ingresso, quando essa condição estiver expressamente informada no checkout.</p>
                    <p>5.6. O valor do ingresso, a taxa de conveniência, eventuais outros encargos aplicáveis e o valor total da compra deverão ser apresentados ao Comprador antes da conclusão da transação.</p>
                    <p>5.7. O Organizador receberá o valor base do ingresso conforme o modelo operacional da Vibz e as condições aplicáveis ao processamento da transação.</p>
                </section>

                <section className="terms-section">
                    <h2>6. Cancelamento, Direito de Arrependimento e Reembolsos</h2>
                    <p>6.1. <strong>Direito de arrependimento.</strong> Nas contratações realizadas fora do estabelecimento comercial, o consumidor poderá exercer o direito de arrependimento previsto no art. 49 do Código de Defesa do Consumidor, observado o prazo e as condições estabelecidos pela legislação aplicável. O prazo legal previsto no dispositivo é de 7 (sete) dias a contar da assinatura ou do recebimento do produto ou serviço, conforme o caso.</p>
                    <p>6.2. O exercício do direito de arrependimento produzirá os efeitos previstos na legislação aplicável, inclusive quanto à restituição dos valores pagos, quando cabível.</p>
                    <p>6.3. A Vibz não poderá estabelecer, por meio destes Termos, restrições que eliminem ou reduzam direitos assegurados obrigatoriamente ao consumidor pela legislação.</p>
                    <p>6.4. <strong>Cancelamentos voluntários fora do direito de arrependimento.</strong> Solicitações de cancelamento realizadas fora das hipóteses de direito de arrependimento estarão sujeitas às regras específicas informadas para o respectivo evento pelo Organizador, observados os direitos previstos na legislação aplicável.</p>
                    <p>6.5. <strong>Cancelamento ou alteração do evento.</strong> O Organizador é responsável pelas consequências decorrentes do cancelamento, adiamento ou alteração substancial do evento, inclusive pelas medidas necessárias perante os participantes, quando a legislação ou as circunstâncias do caso determinarem restituição ou outra forma de solução.</p>
                    <p>6.6. Quando a transação tiver sido realizada por meio da infraestrutura de pagamento da Vibz e houver viabilidade técnica, a Vibz poderá operacionalizar o estorno solicitado ou devido.</p>
                    <p>6.7. A atuação técnica da Vibz na operacionalização de um estorno não altera a responsabilidade legal atribuída ao Organizador pela realização ou cancelamento do evento, nem exclui eventual responsabilidade que a legislação possa atribuir à Vibz.</p>
                    <p>6.8. O prazo para efetivo crédito do reembolso poderá depender do gateway de pagamento, instituição financeira, administradora do cartão ou outro participante do sistema de pagamento.</p>
                    <p>6.9. As disposições desta seção não afastam os direitos assegurados ao consumidor pelo Código de Defesa do Consumidor ou por outras normas aplicáveis.</p>
                </section>

                <section className="terms-section">
                    <h2>7. Propriedade Intelectual</h2>
                    <p>7.1. A marca Vibz, sua identidade visual, software, interfaces, códigos-fonte, estrutura, design, elementos gráficos, banco de dados e demais elementos próprios da Plataforma são protegidos pela legislação aplicável.</p>
                    <p>7.2. É proibida a reprodução, cópia, distribuição, modificação, engenharia reversa ou utilização não autorizada dos elementos protegidos da Plataforma, salvo quando permitido pela legislação ou mediante autorização da Vibz.</p>
                    <p>7.3. Os conteúdos inseridos pelos Organizadores permanecem pertencentes aos respectivos titulares.</p>
                    <p>7.4. Ao publicar conteúdo na Plataforma, o Organizador declara possuir os direitos necessários para sua utilização e concede à Vibz licença não exclusiva, gratuita e limitada ao período necessário à prestação dos serviços, para hospedar, reproduzir tecnicamente, exibir e disponibilizar o conteúdo dentro da Plataforma e em materiais diretamente relacionados à divulgação do evento.</p>
                </section>

                <section className="terms-section">
                    <h2>8. Responsabilidades e Limitações</h2>
                    <p>8.1. A Vibz é responsável pelos serviços de infraestrutura tecnológica que estejam sob seu controle, observados os limites e responsabilidades estabelecidos pela legislação aplicável.</p>
                    <p>8.2. A Vibz adota medidas técnicas e administrativas compatíveis com a natureza dos serviços e com os riscos envolvidos para proteger sua infraestrutura e os dados sob sua responsabilidade.</p>
                    <p>8.3. A Vibz não garante que a Plataforma estará disponível de forma ininterrupta ou livre de falhas, especialmente quando houver manutenção, indisponibilidade de serviços de terceiros, problemas de infraestrutura, falhas de telecomunicações, eventos de força maior ou circunstâncias que escapem ao seu controle razoável.</p>
                    <p>8.4. Sem prejuízo das responsabilidades que não possam ser legalmente afastadas, a Vibz não é responsável pela organização ou execução física ou virtual dos eventos, incluindo aspectos de segurança, estrutura, atrações, programação, capacidade, qualidade, acessibilidade ou cumprimento das condições divulgadas pelo Organizador.</p>
                    <p>8.5. A Vibz não se responsabiliza por informações falsas, incompletas ou incorretas fornecidas pelo Organizador, sem prejuízo das medidas que possa adotar quando tomar conhecimento de irregularidades.</p>
                    <p>8.6. Nenhuma disposição destes Termos deverá ser interpretada como exclusão ou limitação de responsabilidade que seja vedada pela legislação brasileira.</p>
                </section>

                <section className="terms-section">
                    <h2>9. Suspensão e Encerramento de Contas</h2>
                    <p>9.1. A Vibz poderá advertir, restringir, suspender ou encerrar uma conta quando houver indícios razoáveis de:</p>
                    <ul>
                        <li>violação destes Termos;</li>
                        <li>violação da legislação;</li>
                        <li>fraude ou tentativa de fraude;</li>
                        <li>utilização indevida da Plataforma;</li>
                        <li>comprometimento da segurança da Plataforma;</li>
                        <li>utilização abusiva dos formulários;</li>
                        <li>coleta de dados proibidos;</li>
                        <li>envio de spam ou conteúdo ilícito;</li>
                        <li>utilização da conta para prejudicar terceiros ou a própria Plataforma.</li>
                    </ul>
                    <p>9.2. Sempre que razoavelmente possível e compatível com a segurança da Plataforma, a Vibz poderá comunicar o Usuário sobre a medida adotada e suas razões.</p>
                    <p>9.3. A suspensão ou encerramento de uma conta não prejudicará direitos ou obrigações que, por sua natureza, devam permanecer após o encerramento da relação.</p>
                </section>

                <section className="terms-section">
                    <h2>10. Alterações dos Termos</h2>
                    <p>10.1. A Vibz poderá atualizar estes Termos para refletir alterações na Plataforma, mudanças operacionais, evolução tecnológica ou alterações legislativas e regulatórias.</p>
                    <p>10.2. A versão vigente permanecerá disponível na Plataforma, acompanhada da respectiva data de atualização.</p>
                    <p>10.3. Alterações relevantes poderão ser comunicadas por meios razoáveis, inclusive mediante aviso na Plataforma ou comunicação eletrônica quando aplicável.</p>
                </section>

                <section className="terms-section">
                    <h2>11. Disposições Finais e Legislação Aplicável</h2>
                    <p>11.1. Estes Termos são regidos pelas leis da República Federativa do Brasil.</p>
                    <p>11.2. Aplicam-se às relações abrangidas por estes Termos, conforme o caso, o Código de Defesa do Consumidor, a Lei Geral de Proteção de Dados Pessoais, o Marco Civil da Internet e demais normas aplicáveis.</p>
                    <p>11.3. A eventual invalidade ou inexigibilidade de determinada disposição não prejudicará a validade das demais disposições, na medida permitida pela legislação.</p>
                    <p>11.4. Nas relações de consumo, será observado o foro competente segundo a legislação de proteção ao consumidor, inclusive quanto ao direito do consumidor de ajuizar ação em seu próprio domicílio quando previsto em lei.</p>
                </section>
            </main>

            <Footer />
        </div>
    );
}