const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { Resend } = require('resend');
const nodemailer = require('nodemailer');

// Inicializa o Resend com a chave do arquivo .env
const resend = new Resend(process.env.RESEND_API_KEY);

// Configuração do Nodemailer (Fallback para Gmail se não houver domínio)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Seu e-mail Gmail
        pass: process.env.EMAIL_PASS  // Senha de App do Gmail
    }
});

async function fetchImage(src) {
    if (!src) return null;
    try {
        const response = await axios.get(src, { responseType: 'arraybuffer', timeout: 5000 });
        return response.data;
    } catch (error) {
        return null;
    }
}

function drawIcon(doc, type, x, y, size, color) {
    doc.save();
    doc.fillColor(color);
    if (type === 'calendar') {
        doc.roundedRect(x, y, size, size, size * 0.2).fill();
        doc.fillColor('white').rect(x + size * 0.2, y + size * 0.4, size * 0.6, size * 0.1).fill();
        doc.rect(x + size * 0.2, y + size * 0.6, size * 0.6, size * 0.1).fill();
        doc.rect(x + size * 0.3, y + size * 0.15, size * 0.1, size * 0.15).fill();
        doc.rect(x + size * 0.6, y + size * 0.15, size * 0.1, size * 0.15).fill();
    } else if (type === 'pin') {
        doc.circle(x + size / 2, y + size * 0.4, size * 0.3).fill();
        doc.moveTo(x + size * 0.2, y + size * 0.5)
            .lineTo(x + size / 2, y + size)
            .lineTo(x + size * 0.8, y + size * 0.5).fill();
        doc.fillColor('white').circle(x + size / 2, y + size * 0.4, size * 0.1).fill();
    }
    doc.restore();
}

async function drawTicketPDF(doc, ticket, event, user, ticketType, customName = null) {
    const C = { BG: '#F2F4F8', CARD: '#FFFFFF', TEXT_DARK: '#333333', TEXT_LIGHT: '#777777', PRIMARY: '#4C01B5' };
    const cardW = 400;
    const cardH = 680;
    const cardX = (595.28 - cardW) / 2;
    const cardY = (841.89 - cardH) / 2;

    const eventImageBuffer = await fetchImage(event.imageUrl);
    const uniqueCode = ticket.qrCodeData;
    const qrCodeImage = await QRCode.toDataURL(uniqueCode, { width: 300, margin: 0, color: { dark: '#000000', light: '#ffffff' } });

    doc.rect(0, 0, 595.28, 841.89).fill(C.BG);
    doc.roundedRect(cardX, cardY, cardW, cardH, 12).fillColor(C.CARD).fillOpacity(1).fill();

    const imgH = 200;
    if (eventImageBuffer) {
        doc.save();
        doc.roundedRect(cardX, cardY, cardW, imgH, 12).clip();
        try { doc.image(eventImageBuffer, cardX, cardY, { width: cardW }); } catch (e) {}
        doc.restore();
    } else {
        doc.save();
        doc.roundedRect(cardX, cardY, cardW, imgH, 12).clip();
        doc.rect(cardX, cardY, cardW, imgH).fill('#ddd');
        doc.restore();
    }

    let y = cardY + imgH + 25;
    const pad = 30;
    const contentW = cardW - (pad * 2);

    doc.font('Helvetica-Bold').fontSize(20).fillColor(C.TEXT_DARK)
        .text(event.title.toUpperCase(), cardX + pad, y, { width: contentW, align: 'left' });
    y += doc.heightOfString(event.title.toUpperCase(), { width: contentW }) + 25;

    const dateObj = new Date(event.eventDate || event.createdAt || new Date());
    const dateStr = dateObj.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '');
    const timeStr = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    doc.font('Helvetica').fontSize(10).fillColor(C.TEXT_LIGHT).text('DATA', cardX + pad, y);
    doc.font('Helvetica-Bold').fontSize(12).fillColor(C.TEXT_DARK).text(`${dateStr} • ${timeStr}`, cardX + pad, y + 15);
    drawIcon(doc, 'calendar', cardX + cardW - pad - 20, y + 5, 18, C.PRIMARY);
    y += 50;

    doc.font('Helvetica').fontSize(10).fillColor(C.TEXT_LIGHT).text('LOCAL', cardX + pad, y);
    doc.font('Helvetica-Bold').fontSize(12).fillColor(C.TEXT_DARK).text(`${event.location} - ${event.city || ''}`, cardX + pad, y + 15, { width: contentW - 30 });
    drawIcon(doc, 'pin', cardX + cardW - pad - 20, y + 5, 18, C.PRIMARY);
    y += 60;

    const qrSize = 150;
    doc.image(qrCodeImage, cardX + pad, y, { width: qrSize, height: qrSize });
    
    doc.font('Helvetica').fontSize(10).fillColor(C.TEXT_DARK)
        .text(uniqueCode, cardX + pad, y + qrSize + 5, { width: qrSize, align: 'center' });

    const detailsX = cardX + pad + qrSize + 25;
    let detailsY = y + 10;

    doc.font('Helvetica').fontSize(9).fillColor(C.TEXT_LIGHT).text('INGRESSO', detailsX, detailsY);
    doc.font('Helvetica-Bold').fontSize(13).fillColor(C.TEXT_DARK).text(ticketType ? ticketType.name : 'Ingresso', detailsX, detailsY + 12);
    detailsY += 45;

    doc.font('Helvetica').fontSize(9).fillColor(C.TEXT_LIGHT).text('PARTICIPANTE', detailsX, detailsY);
    doc.font('Helvetica-Bold').fontSize(12).fillColor(C.TEXT_DARK).text(customName || user.name, detailsX, detailsY + 12, { width: cardW - detailsX - pad, ellipsis: true });
    detailsY += 45;

    doc.font('Helvetica').fontSize(9).fillColor(C.TEXT_LIGHT).text('VALOR', detailsX, detailsY);
    doc.font('Helvetica-Bold').fontSize(13).fillColor(C.TEXT_DARK).text((!ticket.price || ticket.price === 0) ? 'R$ 0,00' : `R$ ${Number(ticket.price).toFixed(2).replace('.', ',')}`, detailsX, detailsY + 12);

    const logoY = cardY + cardH - 40;
    doc.font('Helvetica-Bold').fontSize(14).fillColor(C.PRIMARY)
        .text('Vibz', cardX, logoY, { width: cardW, align: 'center' });
}

const generateAndSendTickets = async (order, stripeEmail = null, stripeName = null) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: order.userId } });
        const event = await prisma.event.findUnique({ where: { id: order.eventId } });
        
        const recipientEmail = stripeEmail || user.email;
        const recipientName = stripeName || user.name;

        // Render e Vercel usam o diretório /tmp para arquivos temporários
        const tempDir = path.join('/tmp'); 
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false });
        const pdfPath = path.join(tempDir, `tickets_${order.id}.pdf`);
        const stream = fs.createWriteStream(pdfPath);
        doc.pipe(stream);

        const tickets = await prisma.ticket.findMany({
            where: { 
                userId: user.id, 
                eventId: event.id,
                createdAt: { gte: new Date(Date.now() - 120000) } 
            },
            include: { ticketType: true }
        });

        if (tickets.length === 0) {
            console.error("Nenhum ticket encontrado para gerar PDF.");
            doc.addPage();
            doc.text("Erro ao gerar ingressos. Contate o suporte.");
        } else {
            for (const ticket of tickets) {
                doc.addPage();
                await drawTicketPDF(doc, ticket, event, user, ticket.ticketType, recipientName);
            }
        }
        
        doc.end();

        stream.on('finish', async () => {
            try {
                // Ler o arquivo para Buffer para enviar
                const pdfBuffer = fs.readFileSync(pdfPath);

                // Tenta enviar via Resend se configurado, senão usa Nodemailer
                if (process.env.RESEND_API_KEY && process.env.EMAIL_DOMAIN_VERIFIED === 'true') {
                    await resend.emails.send({
                        from: 'Vibz <ingressos@vibz.com.br>', // Altere para seu domínio verificado
                        to: recipientEmail,
                        subject: `Seus ingressos para ${event.title}`,
                        html: `
                            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                                <h2 style="color: #4C01B5;">Olá, ${recipientName}!</h2>
                                <p>Seu pagamento foi confirmado com sucesso.</p>
                                <p>Em anexo estão seus ingressos para <strong>${event.title}</strong>.</p>
                                <hr/>
                                <p>Nos vemos lá!<br/>Equipe Vibz</p>
                            </div>
                        `,
                        attachments: [
                            {
                                filename: `Ingressos_${event.title.replace(/\s+/g, '_')}.pdf`,
                                content: pdfBuffer
                            }
                        ]
                    });
                    console.log('📧 Email enviado via Resend para:', recipientEmail);
                } else {
                    // Fallback para Nodemailer (Gmail)
                    const mailOptions = {
                        from: `"Vibz Ingressos" <${process.env.EMAIL_USER}>`,
                        to: recipientEmail,
                        subject: `Seus ingressos para ${event.title}`,
                        html: `
                            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                                <h2 style="color: #4C01B5;">Olá, ${recipientName}!</h2>
                                <p>Seu pagamento foi confirmado com sucesso.</p>
                                <p>Em anexo estão seus ingressos para <strong>${event.title}</strong>.</p>
                                <hr/>
                                <p>Nos vemos lá!<br/>Equipe Vibz</p>
                            </div>
                        `,
                        attachments: [
                            {
                                filename: `Ingressos_${event.title.replace(/\s+/g, '_')}.pdf`,
                                content: pdfBuffer
                            }
                        ]
                    };

                    await transporter.sendMail(mailOptions);
                    console.log('📧 Email enviado via Gmail para:', recipientEmail);
                }

            } catch (err) {
                console.error('❌ Erro ao enviar email:', err);
            } finally {
                // Limpa o arquivo temporário
                try { fs.unlinkSync(pdfPath); } catch(e) {}
            }
        });

        return { success: true };
    } catch (error) {
        console.error("❌ Erro ao gerar ingressos:", error);
        return { success: false, error };
    }
};

const validateTicket = async (req, res) => {
    const { qrCode } = req.body;
    try {
        const ticket = await prisma.ticket.findUnique({ where: { qrCodeData: qrCode } });
        if (!ticket) return res.status(404).json({ valid: false, message: 'Ingresso não encontrado.' });
        
        const event = await prisma.event.findUnique({ where: { id: ticket.eventId } });
        const user = await prisma.user.findUnique({ where: { id: ticket.userId } });
        const ticketType = await prisma.ticketType.findUnique({ where: { id: ticket.ticketTypeId } });

        if (ticket.status !== 'valid') {
            const usedDate = ticket.usedAt ? new Date(ticket.usedAt).toLocaleString('pt-BR') : 'Anteriormente';
            return res.status(400).json({ 
                valid: false, 
                message: `Ingresso já utilizado em ${usedDate}.`,
                details: { user: user.name, type: ticketType?.name },
                usedAt: ticket.usedAt 
            });
        }

        await prisma.ticket.update({ where: { id: ticket.id }, data: { status: 'used', usedAt: new Date() } });
        
        res.json({ 
            valid: true, 
            message: 'Acesso Liberado! ✅', 
            details: { 
                user: user.name, 
                event: event.title, 
                type: ticketType?.name,
                batch: ticketType?.batchName
            } 
        });
    } catch (e) { 
        console.error(e);
        res.status(500).json({ message: 'Erro interno ao validar.' }); 
    }
};

const getMyTickets = async (req, res) => {
    try {
        const userId = req.user.id;
        const tickets = await prisma.ticket.findMany({ 
            where: { userId }, 
            orderBy: { createdAt: 'desc' },
            include: { event: true, ticketType: true }
        });

        const enriched = await Promise.all(tickets.map(async (t) => {
            let qrImg = null;
            if (t.qrCodeData) qrImg = await QRCode.toDataURL(t.qrCodeData);

            let eventDate = t.event.eventDate;
            if (!eventDate && t.event.sessions) {
                try {
                    const s = typeof t.event.sessions === 'string' ? JSON.parse(t.event.sessions) : t.event.sessions;
                    if (s[0] && s[0].date) eventDate = s[0].date;
                } catch(e) {}
            }
            if (!eventDate) eventDate = t.event.createdAt;

            return {
                ...t,
                qrCodeImage: qrImg,
                event: t.event ? { 
                    ...t.event, 
                    date: eventDate 
                } : {},
                ticketType: t.ticketType || { name: 'Geral' }
            };
        }));
        res.json(enriched);
    } catch (e) { 
        console.error(e);
        res.status(500).json({ message: 'Erro ao buscar ingressos.' }); 
    }
};

const downloadTicketPDF = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const ticket = await prisma.ticket.findUnique({ 
            where: { id: ticketId },
            include: { event: true, user: true, ticketType: true }
        });

        if (!ticket) return res.status(404).send('Ingresso não encontrado');

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Ingresso_${ticket.event.title.replace(/\s+/g, '_')}.pdf`);

        const doc = new PDFDocument({ size: 'A4', margin: 0 });
        doc.pipe(res);

        await drawTicketPDF(doc, ticket, ticket.event, ticket.user, ticket.ticketType, null);

        doc.end();

    } catch (error) {
        console.error('Erro download PDF:', error);
        res.status(500).send('Erro ao gerar PDF');
    }
};

module.exports = { generateAndSendTickets, validateTicket, getMyTickets, downloadTicketPDF };