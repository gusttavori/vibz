const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { Resend } = require('resend');
const nodemailer = require('nodemailer');

const resend = new Resend(process.env.RESEND_API_KEY);

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
    socketTimeout: 10000
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
    
    // Mostra apenas os primeiros 8 dígitos para não poluir
    const displayCode = uniqueCode.length > 20 ? uniqueCode.substring(0, 8) + '...' : uniqueCode;
    doc.font('Helvetica').fontSize(10).fillColor(C.TEXT_DARK)
        .text(displayCode, cardX + pad, y + qrSize + 5, { width: qrSize, align: 'center' });

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
                // Busca tickets criados nos últimos 5 minutos para evitar pegar antigos
                createdAt: { gte: new Date(Date.now() - 300000) } 
            },
            include: { ticketType: true }
        });

        if (tickets.length === 0) {
            console.error("Nenhum ticket recente encontrado para gerar PDF.");
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
                const pdfBuffer = fs.readFileSync(pdfPath);

                if (process.env.RESEND_API_KEY && process.env.EMAIL_DOMAIN_VERIFIED === 'true') {
                    await resend.emails.send({
                        from: 'Vibz <ingressos@vibz.com.br>',
                        to: recipientEmail,
                        subject: `Seus ingressos para ${event.title}`,
                        html: `<p>Olá ${recipientName}, seus ingressos estão em anexo.</p>`,
                        attachments: [{ filename: `Ingressos.pdf`, content: pdfBuffer }]
                    });
                } else {
                    const mailOptions = {
                        from: `"Vibz Ingressos" <vibzeventos@gmail.com>`, 
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
                        attachments: [{ filename: `Ingresso_${event.title.replace(/\s+/g, '_')}.pdf`, content: pdfBuffer }]
                    };
                    
                    await transporter.sendMail(mailOptions);
                }
            } catch (err) {
                console.error('❌ Erro no envio de email:', err);
            } finally {
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
        console.log("🔍 Validando:", qrCode);

        // 1. Tenta buscar pelo campo oficial qrCodeData (UUID)
        let ticket = await prisma.ticket.findUnique({ 
            where: { qrCodeData: qrCode },
            include: { event: true, user: true, ticketType: true }
        });

        // 2. Fallback: Se falhar e o código parecer um ID (curto ou formato específico), tenta pelo ID
        if (!ticket) {
            // Só tenta pelo ID se não for um UUID longo, para evitar erro de formato do Prisma
            // ou se você tiver certeza que IDs antigos podem estar sendo usados
            try {
                ticket = await prisma.ticket.findUnique({
                    where: { id: qrCode },
                    include: { event: true, user: true, ticketType: true }
                });
            } catch (e) {
                // Se der erro de formato de ID, apenas ignora
            }
        }

        if (!ticket) return res.status(404).json({ valid: false, message: 'Ingresso não encontrado.' });
        
        if (ticket.status !== 'valid') {
            const usedDate = ticket.usedAt ? new Date(ticket.usedAt).toLocaleString('pt-BR') : 'Anteriormente';
            return res.status(400).json({ 
                valid: false, 
                message: `Ingresso já utilizado.`,
                details: { 
                    user: ticket.user.name, 
                    type: ticket.ticketType?.name,
                    event: ticket.event.title
                },
                usedAt: ticket.usedAt 
            });
        }

        await prisma.ticket.update({ where: { id: ticket.id }, data: { status: 'used', usedAt: new Date() } });
        
        res.json({ 
            valid: true, 
            message: 'Acesso Liberado! ✅', 
            details: { 
                user: ticket.user.name, 
                event: ticket.event.title, 
                type: ticket.ticketType?.name, 
                batch: ticket.ticketType?.batchName
            } 
        });
    } catch (e) { 
        console.error("Erro validação:", e);
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
            let eventDate = t.event.eventDate || t.event.createdAt;
            return {
                ...t,
                qrCodeImage: qrImg,
                event: t.event ? { ...t.event, date: eventDate } : {},
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