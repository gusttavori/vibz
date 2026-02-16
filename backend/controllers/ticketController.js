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

async function drawTicketPDF(doc, ticket, event, user, ticketType, customName = null) {
    // Paleta de Cores inspirada no modelo
    const C = {
        BG: '#FFFFFF',        // Fundo Branco
        TEXT_DARK: '#222222', // Texto Principal (Preto suave)
        TEXT_LABEL: '#666666',// Labels (Cinza)
        PRIMARY: '#0099FF'    // Azul para destaques/links
    };

    const pageW = doc.page.width;
    const pad = 25; // Padding lateral do conteúdo de texto
    const contentW = pageW - (pad * 2);

    // Preparação de Dados
    const eventImageBuffer = await fetchImage(event.imageUrl);
    const uniqueCode = ticket.qrCodeData;
    const qrCodeImage = await QRCode.toDataURL(uniqueCode, { width: 300, margin: 0, color: { dark: '#000000', light: '#ffffff' } });

    // --- IMAGEM DE CAPA (Topo Colado) ---
    const imgH = 220;
    doc.save();
    // Clip para bordas arredondadas apenas embaixo
    doc.path(`M 0 0 L ${pageW} 0 L ${pageW} ${imgH - 16} Q ${pageW} ${imgH} ${pageW - 16} ${imgH} L ${16} ${imgH} Q 0 ${imgH} 0 ${imgH - 16} Z`).clip();

    if (eventImageBuffer) {
        try {
            doc.image(eventImageBuffer, 0, 0, { width: pageW, height: imgH, fit: [pageW, imgH], align: 'center', valign: 'center' });
        } catch (e) {
            doc.rect(0, 0, pageW, imgH).fill(C.PRIMARY);
        }
    } else {
        doc.rect(0, 0, pageW, imgH).fill(C.PRIMARY);
    }
    doc.restore();

    // --- CONTEÚDO DO INGRESSO ---
    let y = imgH + 25; // Começa logo após a imagem

    // Título do Evento
    doc.font('Helvetica-Bold').fontSize(20).fillColor(C.TEXT_DARK)
        .text(event.title.toUpperCase(), pad, y, { width: contentW, align: 'left' });
    y += doc.heightOfString(event.title.toUpperCase(), { width: contentW }) + 20;

    // --- BLOCOS DE INFORMAÇÃO (Compactos) ---
    const labelSize = 10;
    const valueSize = 12;
    const blockGap = 15; // Espaço entre blocos

    // DATA
    doc.font('Helvetica').fontSize(labelSize).fillColor(C.TEXT_LABEL).text('DATA', pad, y);
    y += labelSize + 2;
    let dateStr = "";
    if (ticketType && ticketType.activityDate) {
        dateStr = new Date(ticketType.activityDate).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
        if (ticketType.startTime) dateStr += ` • ${ticketType.startTime}`;
    } else {
        dateStr = new Date(event.eventDate || event.createdAt).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) + ` • ${new Date(event.eventDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    doc.font('Helvetica').fontSize(valueSize).fillColor(C.TEXT_DARK).text(dateStr, pad, y, { width: contentW });
    y += doc.heightOfString(dateStr, { width: contentW }) + blockGap;

    // LOCALIZAÇÃO (Com correção de sobreposição)
    doc.font('Helvetica').fontSize(labelSize).fillColor(C.TEXT_LABEL).text('LOCAL', pad, y);
    y += labelSize + 2;
    const locationText = event.location || 'Local a definir';
    const locationH = doc.heightOfString(locationText, { width: contentW });
    doc.font('Helvetica').fontSize(valueSize).fillColor(C.TEXT_DARK).text(locationText, pad, y, { width: contentW });
    y += locationH + 2; // Avança a altura do texto do local + um pequeno respiro
    
    const cityText = event.city || '';
    doc.font('Helvetica').fontSize(valueSize).fillColor(C.TEXT_LABEL).text(cityText, pad, y, { width: contentW });
    y += doc.heightOfString(cityText, { width: contentW }) + blockGap;


    // INGRESSO & PARTICIPANTE (Lado a Lado para economizar espaço)
    const col2X = pad + (contentW / 2);
    let yStartRow = y;

    // Coluna 1: Ingresso
    doc.font('Helvetica').fontSize(labelSize).fillColor(C.TEXT_LABEL).text('INGRESSO', pad, y);
    y += labelSize + 2;
    const ticketName = ticketType ? ticketType.name : 'Geral';
    doc.font('Helvetica').fontSize(valueSize).fillColor(C.TEXT_DARK).text(ticketName, pad, y, { width: (contentW / 2) - 10, ellipsis: true });
    let yCol1End = y + doc.heightOfString(ticketName, { width: (contentW / 2) - 10 }) + blockGap;

    // Coluna 2: Participante
    y = yStartRow;
    doc.font('Helvetica').fontSize(labelSize).fillColor(C.TEXT_LABEL).text('PARTICIPANTE', col2X, y);
    y += labelSize + 2;
    const participantName = customName || user.name;
    doc.font('Helvetica').fontSize(valueSize).fillColor(C.TEXT_DARK).text(participantName, col2X, y, { width: (contentW / 2) - 10, ellipsis: true });
    let yCol2End = y + doc.heightOfString(participantName, { width: (contentW / 2) - 10 }) + blockGap;

    y = Math.max(yCol1End, yCol2End); // Avança para o maior Y das duas colunas

    // VALOR
    doc.font('Helvetica').fontSize(labelSize).fillColor(C.TEXT_LABEL).text('VALOR', pad, y);
    y += labelSize + 2;
    const valor = (!ticket.price || ticket.price === 0) ? 'R$ 0,00' : `R$ ${Number(ticket.price).toFixed(2).replace('.', ',')}`;
    doc.font('Helvetica').fontSize(valueSize).fillColor(C.TEXT_DARK).text(valor, pad, y);
    y += valueSize + blockGap * 2; // Espaço maior antes do QR Code

    // --- QR CODE ---
    const qrSize = 180;
    // Verifica se cabe na página, se não, adiciona nova página
    if (y + qrSize + 50 > doc.page.height) {
        doc.addPage();
        y = 50; // Margem superior na nova página
    }

    doc.image(qrCodeImage, pad, y, { width: qrSize, height: qrSize });
    y += qrSize + 10;

    // Código Hash
    doc.font('Courier').fontSize(10).fillColor(C.TEXT_LABEL)
        .text(uniqueCode, pad, y);

    // Logo (Exemplo)
    y += 30;
    doc.font('Helvetica-Bold').fontSize(16).fillColor(C.PRIMARY)
        .text('Vibz', pad, y);
}

const generateAndSendTickets = async (order, stripeEmail = null, stripeName = null) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: order.userId } });
        const event = await prisma.event.findUnique({ where: { id: order.eventId } });

        const recipientEmail = stripeEmail || user.email;
        const recipientName = stripeName || user.name;

        const tempDir = process.env.NODE_ENV === 'production' ? '/tmp' : path.join(__dirname, '../../tmp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false });
        const pdfPath = path.join(tempDir, `tickets_${order.id}.pdf`);
        const stream = fs.createWriteStream(pdfPath);
        doc.pipe(stream);

        const tickets = await prisma.ticket.findMany({
            where: {
                userId: user.id,
                eventId: event.id,
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
                try { fs.unlinkSync(pdfPath); } catch (e) { }
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

    if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'Não autorizado. Faça login.' });
    }

    try {
        console.log("🔍 Validando:", qrCode);

        let ticket = await prisma.ticket.findUnique({
            where: { qrCodeData: qrCode },
            include: { event: true, user: true, ticketType: true }
        });

        if (!ticket) {
            try {
                ticket = await prisma.ticket.findUnique({
                    where: { id: qrCode },
                    include: { event: true, user: true, ticketType: true }
                });
            } catch (e) { }
        }

        if (!ticket) return res.status(404).json({ valid: false, message: 'Ingresso não encontrado.' });

        if (ticket.event.organizerId !== req.user.id && !req.user.isAdmin) {
            return res.status(403).json({
                valid: false,
                message: 'Permissão negada. Você não é o organizador deste evento.'
            });
        }

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

const listLastTickets = async (req, res) => {
    try {
        const tickets = await prisma.ticket.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
                qrCodeData: true,
                status: true,
                id: true,
                user: { select: { name: true } },
                event: { select: { title: true } }
            }
        });
        res.json(tickets);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

module.exports = {
    generateAndSendTickets,
    validateTicket,
    getMyTickets,
    downloadTicketPDF,
    listLastTickets
};