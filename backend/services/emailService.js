const nodemailer = require('nodemailer');
const QRCode = require('qrcode');

// Configuração do Transporter para o Brevo (Sendinblue)
const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    auth: {
        user: process.env.EMAIL_USER, // Seu e-mail de login no Brevo
        pass: process.env.EMAIL_PASS  // Sua chave SMTP do Brevo
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
            `<li><strong>${t.type}</strong> - R$ ${t.price.toFixed(2)} (Lote: ${t.batch})</li>`
        ).join('');

        const mailOptions = {
            from: '"Vibz Ingressos" <contato@vibz.com>',
            to: user.email,
            subject: `🎟️ Seus ingressos para: ${event.title}`,
            html: `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: auto;">
                    <div style="background-color: #4C01B5; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="color: white; margin: 0;">Seus Ingressos Chegaram!</h1>
                    </div>
                    <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
                        <h2>Olá, ${user.name}!</h2>
                        <p>Seu pagamento foi confirmado. Prepare-se para o evento!</p>
                        <hr style="border: 0; border-top: 1px solid #eee;" />
                        <h3>Detalhes:</h3>
                        <p><strong>Evento:</strong> ${event.title}</p>
                        <p><strong>Local:</strong> ${event.location} - ${event.city}</p>
                        <h3>Seus Ingressos:</h3>
                        <ul>${ticketListHtml}</ul>
                        <div style="text-align: center; margin: 30px 0; background: #f9f9f9; padding: 20px; border-radius: 10px;">
                            <img src="${qrCodeImage}" alt="QR Code" style="width: 200px;" />
                            <p style="font-size: 12px; color: #666; margin-top: 10px;">Apresente este código na entrada do evento.</p>
                        </div>
                    </div>
                    <div style="text-align: center; padding: 20px; font-size: 12px; color: #999;">
                        © 2026 Vibz platform.
                    </div>
                </div>
            `
        };
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error("Erro ao enviar e-mail de ingresso:", error);
    }
};

// E-mail de Status do Evento (Enviado para o ORGANIZADOR ao Aprovar/Reprovar)
exports.sendEventStatusEmail = async (organizerEmail, organizerName, eventTitle, status, eventId, reason = "") => {
    const isApproved = status === 'approved';
    const subject = isApproved ? `✅ Seu evento foi APROVADO: ${eventTitle}` : `❌ Atualização sobre o evento: ${eventTitle}`;
    const eventLink = `${process.env.FRONTEND_URL}/evento/${eventId}`;

    const htmlContent = `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px;">
            <div style="padding: 20px; text-align: center; background: ${isApproved ? '#10b981' : '#ef4444'}; color: white; border-radius: 10px 10px 0 0;">
                <h2 style="margin: 0;">Evento ${isApproved ? 'Aprovado' : 'Reprovado'}</h2>
            </div>
            <div style="padding: 30px;">
                <p>Olá, <strong>${organizerName}</strong>,</p>
                <p>O status do seu evento <strong>${eventTitle}</strong> foi atualizado.</p>
                ${isApproved 
                    ? `<p>Parabéns! Seu evento já está publicado e pronto para receber vendas.</p>
                       <a href="${eventLink}" style="display: inline-block; padding: 12px 25px; background: #4C01B5; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Ver Evento Publicado</a>`
                    : `<p>Infelizmente seu evento não foi aprovado nesta análise.</p>
                       <div style="background: #fff5f5; padding: 15px; border-left: 4px solid #ef4444; margin: 15px 0;">
                           <strong>Motivo:</strong> ${reason || "Não especificado pela moderação."}
                       </div>`
                }
            </div>
        </div>
    `;
    await transporter.sendMail({ from: '"Vibz Moderação" <contato@vibz.com>', to: organizerEmail, subject: subject, html: htmlContent });
};

// E-mail de Confirmação de Recebimento (Enviado para o ORGANIZADOR ao Criar)
exports.sendEventReceivedEmail = async (organizerEmail, organizerName, eventTitle) => {
    const htmlContent = `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: auto;">
            <h2>Olá, ${organizerName}!</h2>
            <p>Recebemos o cadastro do seu evento: <strong>${eventTitle}</strong>.</p>
            <p>Ele foi enviado para nossa equipe de curadoria e em breve você receberá um e-mail confirmando a aprovação.</p>
            <p>Atenciosamente,<br>Equipe Vibz</p>
        </div>
    `;
    await transporter.sendMail({ from: '"Vibz" <contato@vibz.com>', to: organizerEmail, subject: `📝 Evento Recebido: ${eventTitle}`, html: htmlContent });
};

// E-mail para a PLATAFORMA (Notifica que há um novo evento para moderar)
exports.sendAdminNotificationEmail = async (eventDetails) => {
    const htmlContent = `
        <div style="font-family: sans-serif; color: #333; border: 1px solid #4C01B5; padding: 20px;">
            <h2 style="color: #4C01B5;">🔔 Novo Evento para Moderação</h2>
            <p>Um novo evento foi cadastrado e aguarda aprovação:</p>
            <hr>
            <p><strong>Evento:</strong> ${eventDetails.title}</p>
            <p><strong>Organizador:</strong> ${eventDetails.organizerName}</p>
            <p><strong>Cidade:</strong> ${eventDetails.city}</p>
            <hr>
            <p>Acesse o painel administrativo para revisar.</p>
        </div>
    `;
    await transporter.sendMail({ from: '"Vibz Sistema" <sistema@vibz.com>', to: process.env.EMAIL_USER, subject: `🔔 NOVO EVENTO: ${eventDetails.title}`, html: htmlContent });
};