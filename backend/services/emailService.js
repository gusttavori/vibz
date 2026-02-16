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
        const ticketListHtml = tickets.map(t => `<li>${t.ticketType?.name || 'Ingresso'} - R$ ${Number(t.price).toFixed(2)}</li>`).join('');

        await transporter.sendMail({
            from: '"Vibz Ingressos" <vibzeventos@gmail.com>',
            to: user.email,
            subject: `🎟️ Seus ingressos: ${event.title}`,
            html: `<p>Olá ${user.name}, seu pagamento foi confirmado!</p><ul>${ticketListHtml}</ul><p>Apresente o QR Code abaixo na entrada:</p><img src="${qrCodeImage}" />`
        });
        console.log(`✅ E-mail de ingresso enviado para: ${user.email}`);
    } catch (error) { console.error("❌ Erro sendTicketEmail:", error.message); }
};

// 2. E-mail de Status (ORGANIZADOR - Publicação/Aprovação)
exports.sendEventStatusEmail = async (organizerEmail, organizerName, eventTitle, status, eventId, reason = "") => {
    if (!organizerEmail) return;

    try {
        const isApproved = status === 'approved';
        const subject = isApproved ? `✅ Evento APROVADO: ${eventTitle}` : `❌ Evento Reprovado: ${eventTitle}`;
        
        await transporter.sendMail({
            from: '"Vibz Admin" <vibzeventos@gmail.com>',
            to: organizerEmail,
            subject: subject,
            html: `<h3>Olá ${organizerName}</h3><p>Seu evento <strong>${eventTitle}</strong> foi ${isApproved ? 'aprovado e já está público!' : 'reprovado'}.</p>${!isApproved ? `<p>Motivo: ${reason}</p>` : ''}`
        });
    } catch (err) { 
        console.error("❌ Erro sendEventStatusEmail:", err.message); 
    }
};

// 3. E-mail de Recebimento (ORGANIZADOR - Ao Criar)
exports.sendEventReceivedEmail = async (organizerEmail, organizerName, eventTitle) => {
    if (!organizerEmail) return;
    try {
        await transporter.sendMail({
            from: '"Vibz Equipe" <vibzeventos@gmail.com>',
            to: organizerEmail,
            subject: `📝 Evento Recebido: ${eventTitle}`,
            html: `<p>Olá ${organizerName}, recebemos o cadastro de <strong>${eventTitle}</strong> e estamos analisando.</p>`
        });
    } catch (err) { console.error("❌ Erro sendEventReceivedEmail:", err.message); }
};

// 4. E-mail de Alerta (ADMIN)
exports.sendAdminNotificationEmail = async (eventDetails) => {
    try {
        await transporter.sendMail({
            from: '"Vibz System" <vibzeventos@gmail.com>',
            to: 'vibzeventos@gmail.com', // E-mail do Admin
            subject: `🔔 NOVO EVENTO PARA ANALISAR: ${eventDetails.title}`,
            html: `<p>Novo evento pendente: <strong>${eventDetails.title}</strong></p><p>Organizador: ${eventDetails.organizerName}</p>`
        });
    } catch (err) { console.error("❌ Erro sendAdminNotificationEmail:", err.message); }
};

// 5. NOVA VENDA REALIZADA (ORGANIZADOR) - TÓPICO 8
exports.sendNewSaleEmail = async (organizerEmail, organizerName, eventTitle, quantity, totalValue) => {
    if (!organizerEmail) return;

    try {
        const formattedValue = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue);
        
        await transporter.sendMail({
            from: '"Vibz Financeiro" <vibzeventos@gmail.com>',
            to: organizerEmail,
            subject: `💰 Nova venda! ${quantity}x ingressos para ${eventTitle}`,
            html: `
                <div style="font-family: sans-serif; color: #333; border: 1px solid #eee; border-radius: 8px; overflow: hidden; max-width: 600px;">
                    <div style="background-color: #4C01B5; padding: 20px; text-align: center;">
                        <h2 style="color: white; margin: 0;">Venda Realizada! 🚀</h2>
                    </div>
                    <div style="padding: 20px;">
                        <p>Olá, <strong>${organizerName}</strong>!</p>
                        <p>Boas notícias! Você acabou de vender novos ingressos.</p>
                        
                        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 5px 0;"><strong>📅 Evento:</strong> ${eventTitle}</p>
                            <p style="margin: 5px 0;"><strong>🎟 Quantidade:</strong> ${quantity} ingresso(s)</p>
                            <p style="margin: 5px 0;"><strong>💵 Valor Total:</strong> <span style="color: #10b981; font-weight: bold;">${formattedValue}</span></p>
                        </div>

                        <p>Acesse seu painel para ver mais detalhes financeiros.</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                        <p style="font-size: 12px; color: #888; text-align: center;">Equipe Vibz</p>
                    </div>
                </div>
            `
        });
        console.log(`💰 Notificação de venda enviada para: ${organizerEmail}`);
    } catch (err) {
        console.error("❌ Erro sendNewSaleEmail:", err.message);
    }
};