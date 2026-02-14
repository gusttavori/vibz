const nodemailer = require('nodemailer');
const QRCode = require('qrcode');

// Configuração robusta para Render + Brevo na Porta 2525
const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 2525, 
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    },
    connectionTimeout: 10000, 
    greetingTimeout: 10000,
    socketTimeout: 15000
});

// Verificação de conexão ao iniciar o servidor
transporter.verify((error) => {
    if (error) {
        console.error("❌ ERRO SMTP (Porta 2525):", error.message);
    } else {
        console.log("✅ Servidor de e-mails pronto (Porta 2525)");
    }
});

const generateQRCode = async (data) => {
    try {
        return await QRCode.toDataURL(data);
    } catch (err) {
        console.error("Erro ao gerar QR Code:", err);
        return null;
    }
};

// 1. E-mail de Ingresso (Enviado para o COMPRADOR)
exports.sendTicketEmail = async (user, event, tickets) => {
    try {
        const qrCodeData = JSON.stringify({ orderId: tickets[0].orderId, userId: user.id || user._id });
        const qrCodeImage = await generateQRCode(qrCodeData);
        const ticketListHtml = tickets.map(t => `<li>${t.type} - R$ ${t.price.toFixed(2)}</li>`).join('');

        await transporter.sendMail({
            from: '"Vibz Ingressos" <vibzeventos@gmail.com>',
            to: user.email,
            subject: `🎟️ Seus ingressos: ${event.title}`,
            html: `<p>Olá ${user.name}, seu pagamento foi confirmado!</p><ul>${ticketListHtml}</ul><img src="${qrCodeImage}" />`
        });
        console.log(`✅ E-mail de ingresso enviado para: ${user.email}`);
    } catch (error) { console.error("❌ Erro sendTicketEmail:", error.message); }
};

// 2. E-mail de Status (Organizador - Aprovação/Reprovação)
exports.sendEventStatusEmail = async (organizerEmail, organizerName, eventTitle, status, eventId, reason = "") => {
    try {
        const isApproved = status === 'approved';
        await transporter.sendMail({
            from: '"Vibz Moderação" <vibzeventos@gmail.com>',
            to: organizerEmail,
            subject: isApproved ? `✅ Evento APROVADO: ${eventTitle}` : `❌ Evento Reprovado: ${eventTitle}`,
            html: `<h3>Olá ${organizerName}</h3><p>Seu evento ${eventTitle} foi ${isApproved ? 'aprovado' : 'reprovado'}.</p>${!isApproved ? `<p>Motivo: ${reason}</p>` : ''}`
        });
        console.log(`✅ E-mail de status enviado para: ${organizerEmail}`);
    } catch (err) { console.error("❌ Erro sendEventStatusEmail:", err.message); }
};

// 3. E-mail de Confirmação de Recebimento (Organizador)
exports.sendEventReceivedEmail = async (organizerEmail, organizerName, eventTitle) => {
    try {
        await transporter.sendMail({
            from: '"Vibz" <vibzeventos@gmail.com>',
            to: organizerEmail,
            subject: `📝 Evento Recebido: ${eventTitle}`,
            html: `<p>Olá ${organizerName}, recebemos o cadastro de <strong>${eventTitle}</strong> e estamos analisando.</p>`
        });
        console.log(`✅ E-mail de recebimento enviado para: ${organizerEmail}`);
    } catch (err) { console.error("❌ Erro sendEventReceivedEmail:", err.message); }
};

// 4. E-mail para a Plataforma (Admin) - CORREÇÃO: Destinatário fixo real
exports.sendAdminNotificationEmail = async (eventDetails) => {
    try {
        await transporter.sendMail({
            from: '"Vibz Sistema" <vibzeventos@gmail.com>',
            to: 'vibzeventos@gmail.com', // Usando e-mail real para evitar erros de login SMTP
            subject: `🔔 NOVO EVENTO PARA ANALISAR: ${eventDetails.title}`,
            html: `<p>Novo evento pendente: <strong>${eventDetails.title}</strong></p><p>Organizador: ${eventDetails.organizerName}</p>`
        });
        console.log(`✅ Notificação de novo evento enviada ao Admin`);
    } catch (err) { console.error("❌ Erro sendAdminNotificationEmail:", err.message); }
};