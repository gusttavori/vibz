const nodemailer = require('nodemailer');
const QRCode = require('qrcode');

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

// Verificação de conexão SMTP
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

// 1. E-mail de Ingresso (COMPRADOR)
exports.sendTicketEmail = async (user, event, tickets) => {
    try {
        const qrCodeData = JSON.stringify({ orderId: tickets[0].orderId, userId: user.id || user._id });
        const qrCodeImage = await generateQRCode(qrCodeData);
        const ticketListHtml = tickets.map(t => `<li>${t.type} - R$ ${t.price.toFixed(2)}</li>`).join('');

        await transporter.sendMail({
            from: '"Vibz" <vibzeventos@gmail.com>', // PADRONIZADO
            to: user.email,
            subject: `🎟️ Seus ingressos: ${event.title}`,
            html: `<p>Olá ${user.name}, seu pagamento foi confirmado!</p><ul>${ticketListHtml}</ul><img src="${qrCodeImage}" />`
        });
        console.log(`✅ E-mail de ingresso enviado para: ${user.email}`);
    } catch (error) { console.error("❌ Erro sendTicketEmail:", error.message); }
};

// 2. E-mail de Status (ORGANIZADOR - Publicação/Aprovação)
exports.sendEventStatusEmail = async (organizerEmail, organizerName, eventTitle, status, eventId, reason = "") => {
    // Trava de segurança: Se não houver e-mail, não tenta enviar
    if (!organizerEmail) {
        console.error("❌ Tentativa de envio abortada: organizerEmail é indefinido.");
        return;
    }

    try {
        const isApproved = status === 'approved';
        const subject = isApproved ? `✅ Evento APROVADO: ${eventTitle}` : `❌ Evento Reprovado: ${eventTitle}`;
        
        await transporter.sendMail({
            from: '"Vibz" <vibzeventos@gmail.com>',
            to: organizerEmail, // Aqui estava chegando vazio/undefined
            subject: subject,
            html: `<h3>Olá ${organizerName}</h3><p>Seu evento <strong>${eventTitle}</strong> foi ${isApproved ? 'aprovado' : 'reprovado'}.</p>${!isApproved ? `<p>Motivo: ${reason}</p>` : ''}`
        });
    } catch (err) { 
        console.error("❌ Erro técnico no transporter (SMTP):", err.message); 
    }
};

// 3. E-mail de Recebimento (ORGANIZADOR - Ao Criar)
exports.sendEventReceivedEmail = async (organizerEmail, organizerName, eventTitle) => {
    try {
        await transporter.sendMail({
            from: '"Vibz" <vibzeventos@gmail.com>', // PADRONIZADO
            to: organizerEmail,
            subject: `📝 Evento Recebido: ${eventTitle}`,
            html: `<p>Olá ${organizerName}, recebemos o cadastro de <strong>${eventTitle}</strong> e estamos analisando.</p>`
        });
        console.log(`✅ E-mail de recebimento enviado para: ${organizerEmail}`);
    } catch (err) { console.error("❌ Erro sendEventReceivedEmail:", err.message); }
};

// 4. E-mail de Alerta (ADMIN)
exports.sendAdminNotificationEmail = async (eventDetails) => {
    try {
        await transporter.sendMail({
            from: '"Vibz" <vibzeventos@gmail.com>', // PADRONIZADO
            to: 'vibzeventos@gmail.com',
            subject: `🔔 NOVO EVENTO PARA ANALISAR: ${eventDetails.title}`,
            html: `<p>Novo evento pendente: <strong>${eventDetails.title}</strong></p><p>Organizador: ${eventDetails.organizerName}</p>`
        });
        console.log(`✅ Notificação enviada ao Admin`);
    } catch (err) { console.error("❌ Erro sendAdminNotificationEmail:", err.message); }
};