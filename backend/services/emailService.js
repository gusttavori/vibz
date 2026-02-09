const nodemailer = require('nodemailer');
const QRCode = require('qrcode');

// Configuração do Transporter (Use suas credenciais reais aqui)
const transporter = nodemailer.createTransport({
    service: 'gmail', // ou 'hotmail', etc.
    auth: {
        user: process.env.EMAIL_USER, // Coloque no .env: seuemail@gmail.com
        pass: process.env.EMAIL_PASS  // Coloque no .env: sua senha de app (não a senha de login)
    }
});

const generateQRCode = async (data) => {
    try {
        return await QRCode.toDataURL(data);
    } catch (err) {
        console.error(err);
        return null;
    }
};

exports.sendTicketEmail = async (user, event, tickets) => {
    try {
        // Gera um QR Code único para o pedido (ou por ingresso)
        const qrCodeData = JSON.stringify({ 
            orderId: tickets[0].orderId, 
            userId: user.id, 
            event: event.title 
        });
        const qrCodeImage = await generateQRCode(qrCodeData);

        const ticketListHtml = tickets.map(t => 
            `<li><strong>${t.type}</strong> - R$ ${t.price.toFixed(2)} (Lote: ${t.batch})</li>`
        ).join('');

        const mailOptions = {
            from: '"Vibz Ingressos" <noreply@vibz.com>',
            to: user.email,
            subject: `Seus ingressos para: ${event.title}`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <div style="background-color: #4C01B5; padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Seus Ingressos Chegaram! 🎟️</h1>
                    </div>
                    <div style="padding: 20px; border: 1px solid #ddd;">
                        <h2>Olá, ${user.name}!</h2>
                        <p>O pagamento foi confirmado e seus ingressos estão garantidos.</p>
                        
                        <h3>Detalhes do Evento:</h3>
                        <p><strong>Evento:</strong> ${event.title}</p>
                        <p><strong>Data:</strong> ${new Date(event.date).toLocaleDateString('pt-BR')} às ${new Date(event.date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</p>
                        <p><strong>Local:</strong> ${event.location} - ${event.city}</p>

                        <h3>Seus Ingressos:</h3>
                        <ul>${ticketListHtml}</ul>

                        <div style="text-align: center; margin: 30px 0;">
                            <img src="${qrCodeImage}" alt="QR Code de Acesso" style="width: 200px; height: 200px;" />
                            <p style="font-size: 12px; color: #777;">Apresente este QR Code na entrada.</p>
                        </div>

                        <p>Você também pode acessar seus ingressos através do painel "Meus Ingressos" na plataforma.</p>
                    </div>
                    <div style="background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 12px;">
                        © 2026 Vibz. Todos os direitos reservados.
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`📧 Email de ingressos enviado para ${user.email}`);
    } catch (error) {
        console.error("Erro ao enviar email:", error);
    }
};