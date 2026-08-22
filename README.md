# 💜 Vibz — Plataforma de Gestão e Descoberta de Eventos

> Uma solução SaaS inovadora para o mercado de entretenimento, conectando produtores de eventos ao seu público através de uma experiência de compra fluida e uma gestão de bilheteria inteligente. Desenvolvido pela **FLXCHE**.

---

## 💜 Visão Geral do Produto

A Vibz foi projetada para modernizar a interação entre o público e as casas de eventos. A plataforma atua em duas frentes complementares: um agregador cultural dinâmico para os usuários descobrirem o que está acontecendo na cidade, e um robusto sistema de controle B2B para que organizadores possam orquestrar vendas, gerenciar lotes e validar a portaria com máxima segurança.

## 🎯 Experiência B2B e B2C

* **Vitrine e Descoberta:** Feed dinâmico otimizado para facilitar a navegação do usuário final entre categorias, datas e locais.
* **Checkout de Alta Conversão:** Integração nativa de pagamentos garantindo um fluxo de compra rápido, com suporte a formulários personalizados exigidos pelos produtores.
* **Ingressos Digitais Inteligentes:** Geração e disparo automatizado de ingressos em PDF contendo QR Codes criptografados únicos por participante.
* **Painel do Organizador:** Dashboard com métricas em tempo real, controle de lotes, capacidade de sessões e edição do *line-up* do evento.
* **Controle de Portaria:** Validador interno ágil integrado ao banco de dados, prevenindo fraudes e otimizando o fluxo de entrada.
* **Inteligência de Dados:** Exportação avançada de relatórios de presença com filtros cruzados diretamente pelo *client-side*.

## 🛡️ Arquitetura e Segurança

* Arquitetura desacoplada, garantindo escalabilidade independente entre o cliente e os serviços da API.
* Blindagem contra ataques XSS e roubo de sessão utilizando JWT envelopado estritamente em cookies `HttpOnly` e `SameSite`.
* Validação de ponta a ponta na entrada de dados da API utilizando esquemas rigorosos de tipagem.

## 💻 Stack Tecnológico

* **Frontend:** React, Next.js, CSS Modules (Design System Proprietário).
* **Backend:** Node.js, Express, Prisma ORM, PostgreSQL.
* **Integrações Chave:** Stripe API (Processamento financeiro e Webhooks), Resend (E-mails transacionais) e Cloudinary (CDN de Mídia).

---
*Plataforma desenvolvida por Gusttavo / FLXCHE.*
