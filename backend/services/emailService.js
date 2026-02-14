const nodemailer = require('nodemailer');
const QRCode = require('qrcode');

// Configuração consistente com Porta 2525 (Brevo)
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

// Verificação de conexão SMTP ao iniciar
transporter.verify((error, success) => {
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

// E-mail de confirmação de compra (Enviado para o COMPRADOR)
exports.sendTicketEmail = async (user, event, tickets) => {
    try {
        const qrCodeData = JSON.stringify({ 
            orderId: tickets[0].orderId, 
            userId: user.id || user._id, 
            event: event.title 
        });
        const qrCodeImage = await generateQRCode(qrCodeData);

        const ticketListHtml = tickets.map(t => 
            `<li><strong>${t.type}</strong> - R$ ${t.price.toFixed(2)}</li>`
        ).join('');

        const mailOptions = {
            from: '"Vibz Ingressos" <vibzeventos@gmail.com>',
            to: user.email,
            subject: `🎟️ Seus ingressos para: ${event.title}`,
            html: `<div style="font-family: sans-serif; color: #333;">
                <h2>Olá, ${user.name}!</h2>
                <p>Seu pagamento foi confirmado.</p>
                <ul>${ticketListHtml}</ul>
                <img src="${qrCodeImage}" width="200" />
            </div>`
        };
        await transporter.sendMail(mailOptions);
        console.log(`📧 Ticket enviado para: ${user.email}`);
    } catch (error) {
        console.error("❌ Erro ao enviar ticket:", error.message);
    }
};

// E-mail de Status do Evento (Enviado para o ORGANIZADOR ao Aprovar/Reprovar)
exports.sendEventStatusEmail = async (organizerEmail, organizerName, eventTitle, status, eventId, reason = "") => {
    try {
        const isApproved = status === 'approved';
        const subject = isApproved ? `✅ Seu evento foi APROVADO: ${eventTitle}` : `❌ Atualização sobre o evento: ${eventTitle}`;
        const eventLink = `${process.env.FRONTEND_URL}/evento/${eventId}`;

        const htmlContent = `<div style="font-family: sans-serif; color: #333; padding: 20px;">
            <h2>Evento ${isApproved ? 'Aprovado' : 'Reprovado'}</h2>
            <p>Olá, ${organizerName}, o status de <strong>${eventTitle}</strong> foi atualizado.</p>
            ${isApproved ? `<a href="${eventLink}">Ver Evento Publicado</a>` : `<p>Motivo: ${reason}</p>`}
        </div>`;

        await transporter.sendMail({ from: '"Vibz Moderação" <vibzeventos@gmail.com>', to: organizerEmail, subject: subject, html: htmlContent });
        console.log(`📧 Status enviado para: ${organizerEmail}`);
    } catch (err) { console.error("❌ Erro email status:", err.message); }
};

// E-mail de Confirmação de Recebimento (Enviado para o ORGANIZADOR ao Criar)
exports.sendEventReceivedEmail = async (organizerEmail, organizerName, eventTitle) => {
    try {
        const htmlContent = `<div style="font-family: sans-serif; color: #333;">
            <h2>Olá, ${organizerName}!</h2>
            <p>Recebemos o cadastro do seu evento: <strong>${eventTitle}</strong>.</p>
            <p>Em breve você receberá um e-mail confirmando a aprovação.</p>
        </div>`;
        await transporter.sendMail({ from: '"Vibz" <vibzeventos@gmail.com>', to: organizerEmail, subject: `📝 Evento Recebido: ${eventTitle}`, html: htmlContent });
        console.log(`📧 Recebimento enviado para: ${organizerEmail}`);
    } catch (err) { console.error("❌ Erro email recebimento:", err.message); }
};

// E-mail para a PLATAFORMA (Notifica o ADMIN)
exports.sendAdminNotificationEmail = async (eventDetails) => {
    try {
        const htmlContent = `<div style="font-family: sans-serif; color: #333;">
            <h2>🔔 Novo Evento para Moderação</h2>
            <p><strong>Evento:</strong> ${eventDetails.title}</p>
            <p><strong>Organizador:</strong> ${eventDetails.organizerName}</p>
            <p>Acesse o painel para revisar.</p>
        </div>`;
        await transporter.sendMail({ 
            from: '"Vibz Eventos" <vibzeventos@gmail.com>', 
            to: process.env.EMAIL_USER, 
            subject: `🔔 NOVO EVENTO: ${eventDetails.title}`, 
            html: htmlContent 
        });
        console.log(`📧 Alerta de moderação enviado para Admin`);
    } catch (err) { console.error("❌ Erro alerta admin:", err.message); }
};