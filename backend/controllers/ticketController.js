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

// Função para desenhar ícones (opcional, mantida para estilo)
function drawIcon(doc, type, x, y, size, color) {
    doc.save();
    doc.fillColor(color);
    if (type === 'calendar') {
        doc.roundedRect(x, y, size, size, size * 0.2).fill();
        doc.fillColor('white').rect(x + size * 0.2, y + size * 0.4, size * 0.6, size * 0.1).fill();
    } else if (type === 'pin') {
        doc.circle(x + size / 2, y + size * 0.4, size * 0.3).fill();
        doc.moveTo(x + size * 0.2, y + size * 0.5).lineTo(x + size / 2, y + size).lineTo(x + size * 0.8, y + size * 0.5).fill();
    }
    doc.restore();
}

async function drawTicketPDF(doc, ticket, event, user, ticketType, customName = null) {
    const C = { 
        BG: '#F2F4F8', 
        CARD: '#FFFFFF', 
        TEXT_DARK: '#111827', 
        TEXT_MED: '#374151', 
        TEXT_LIGHT: '#6b7280', 
        PRIMARY: '#4C01B5', 
        BORDER: '#e5e7eb',
        ACCENT_BG: '#f9fafb'
    };
    
    // --- DIMENSÕES (Card Ocupando Página A4) ---
    const pageW = doc.page.width;   // ~595
    const pageH = doc.page.height;  // ~841
    const margin = 20;              // Margem fina
    
    const cardX = margin;
    const cardY = margin;
    const cardW = pageW - (margin * 2);
    const cardH = pageH - (margin * 2);

    // Preparação dos dados
    const eventImageBuffer = await fetchImage(event.imageUrl);
    const uniqueCode = ticket.qrCodeData;
    const qrCodeImage = await QRCode.toDataURL(uniqueCode, { width: 450, margin: 1, color: { dark: '#000000', light: '#ffffff' } });

    // 1. Fundo da Página
    doc.rect(0, 0, pageW, pageH).fill(C.BG);
    
    // 2. Sombra e Card Principal
    doc.roundedRect(cardX + 3, cardY + 3, cardW, cardH, 12).fillColor('#cbd5e1').fillOpacity(0.5).fill(); // Sombra
    doc.fillOpacity(1); 
    doc.roundedRect(cardX, cardY, cardW, cardH, 12).fillColor(C.CARD).fill(); // Card Branco

    // --- IMAGEM DE CAPA ---
    const imgH = 220; 
    doc.save();
    // Clip arredondado apenas no topo
    doc.path(`M ${cardX} ${cardY + 12} Q ${cardX} ${cardY} ${cardX + 12} ${cardY} L ${cardX + cardW - 12} ${cardY} Q ${cardX + cardW} ${cardY} ${cardX + cardW} ${cardY + 12} L ${cardX + cardW} ${cardY + imgH} L ${cardX} ${cardY + imgH} Z`).clip();
    
    if (eventImageBuffer) {
        try { 
            // 'cover' garante que a imagem preencha a largura sem distorcer
            doc.image(eventImageBuffer, cardX, cardY, { width: cardW, height: imgH, align: 'center', valign: 'center', fit: [cardW, imgH] }); 
        } catch (e) {}
    } else {
        doc.rect(cardX, cardY, cardW, imgH).fill(C.PRIMARY);
    }
    doc.restore();

    // --- CONTEÚDO DO INGRESSO ---
    let y = cardY + imgH + 30; // Margem inicial após a foto
    const pad = 30; 
    const contentW = cardW - (pad * 2);

    // Título do Evento
    doc.font('Helvetica-Bold').fontSize(24).fillColor(C.TEXT_DARK)
       .text(event.title.toUpperCase(), cardX + pad, y, { width: contentW, align: 'left' });
    
    // Atualiza Y baseado na altura real do título
    y += doc.heightOfString(event.title.toUpperCase(), { width: contentW }) + 15;

    // Linha Divisória
    doc.moveTo(cardX + pad, y).lineTo(cardX + cardW - pad, y).lineWidth(1).strokeColor(C.BORDER).stroke();
    y += 25;

    // --- GRID DE DUAS COLUNAS ---
    const colGap = 20;
    const colWidth = (contentW / 2) - (colGap / 2);
    const col1X = cardX + pad;
    const col2X = cardX + pad + colWidth + colGap;
    
    let yLeft = y;
    let yRight = y;

    // === COLUNA ESQUERDA ===
    
    // Data
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.PRIMARY).text('DATA E HORÁRIO', col1X, yLeft);
    yLeft += 12;
    
    let dateStr = "";
    let timeStr = "";
    if (ticketType && ticketType.activityDate) {
        const dateObj = new Date(ticketType.activityDate);
        dateStr = dateObj.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
        if (ticketType.startTime) {
            timeStr = ticketType.startTime + (ticketType.endTime ? ` - ${ticketType.endTime}` : '');
        } else {
             const eventD = new Date(event.eventDate);
             timeStr = eventD.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }
    } else {
        const dateObj = new Date(event.eventDate || event.createdAt || new Date());
        dateStr = dateObj.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
        timeStr = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    doc.font('Helvetica').fontSize(13).fillColor(C.TEXT_MED).text(dateStr, col1X, yLeft, { width: colWidth });
    yLeft += doc.heightOfString(dateStr, { width: colWidth }) + 2;
    doc.font('Helvetica').fontSize(12).fillColor(C.TEXT_LIGHT).text(timeStr, col1X, yLeft, { width: colWidth });
    yLeft += 35; // Espaço para próximo bloco

    // Localização (AQUI ESTAVA O ERRO DE SOBREPOSIÇÃO)
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.PRIMARY).text('LOCALIZAÇÃO', col1X, yLeft);
    yLeft += 12;
    
    // Escreve o local e calcula a altura que ele ocupou
    const locationName = event.location || 'Local a definir';
    doc.font('Helvetica-Bold').fontSize(12).fillColor(C.TEXT_MED)
       .text(locationName, col1X, yLeft, { width: colWidth });
    
    yLeft += doc.heightOfString(locationName, { width: colWidth }) + 4; // Pula a altura exata do texto + respiro

    // Escreve a cidade embaixo, sem risco de sobrepor
    doc.font('Helvetica').fontSize(11).fillColor(C.TEXT_LIGHT)
       .text(event.city || '', col1X, yLeft, { width: colWidth });


    // === COLUNA DIREITA ===

    // Participante
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.PRIMARY).text('PARTICIPANTE', col2X, yRight);
    yRight += 12;
    const pName = customName || user.name;
    doc.font('Helvetica-Bold').fontSize(13).fillColor(C.TEXT_DARK).text(pName, col2X, yRight, { width: colWidth, ellipsis: true });
    yRight += doc.heightOfString(pName, { width: colWidth }) + 35;

    // Tipo de Ingresso
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.PRIMARY).text('TIPO DE INGRESSO', col2X, yRight);
    yRight += 12;
    const tName = ticketType ? ticketType.name : 'Geral';
    doc.font('Helvetica').fontSize(13).fillColor(C.TEXT_MED).text(tName, col2X, yRight, { width: colWidth });
    yRight += doc.heightOfString(tName, { width: colWidth }) + 2;
    doc.font('Helvetica').fontSize(11).fillColor(C.TEXT_LIGHT).text(ticketType?.batchName || 'Lote Único', col2X, yRight);
    yRight += 35;

    // Valor
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.PRIMARY).text('VALOR', col2X, yRight);
    yRight += 12;
    const valor = (!ticket.price || ticket.price === 0) ? 'GRÁTIS' : `R$ ${Number(ticket.price).toFixed(2).replace('.', ',')}`;
    doc.font('Helvetica-Bold').fontSize(13).fillColor(C.TEXT_DARK).text(valor, col2X, yRight);


    // --- QR CODE (ANCORADO NO RODAPÉ) ---
    // Em vez de depender do Y do texto, vamos calcular de baixo para cima
    // Isso garante que ele sempre fique na parte inferior do card, independente do tamanho do texto
    
    const qrSize = 170;
    const qrBoxH = 240; // Altura da área reservada para o QR
    const footerYStart = cardY + cardH - qrBoxH; // Começa a desenhar aqui

    // Linha pontilhada separando o conteúdo do QR Code
    doc.moveTo(cardX + 20, footerYStart).lineTo(cardX + cardW - 20, footerYStart)
       .lineWidth(1).dash(4, { space: 4 }).strokeColor(C.BORDER).stroke();
    doc.undash();

    // Posição centralizada do QR
    const qrX = (pageW - qrSize) / 2;
    const qrY = footerYStart + 30; // 30px de margem da linha pontilhada

    // Desenha o QR Code
    doc.image(qrCodeImage, qrX, qrY, { width: qrSize, height: qrSize });

    // Código Hash abaixo do QR
    doc.font('Courier').fontSize(10).fillColor(C.TEXT_LIGHT)
       .text(uniqueCode, 0, qrY + qrSize + 10, { width: pageW, align: 'center' });

    // Logo Vibz no fim absoluto
    doc.font('Helvetica-Bold').fontSize(12).fillColor(C.PRIMARY).opacity(0.8)
       .text('Vibz Eventos', 0, cardY + cardH - 25, { width: pageW, align: 'center' });
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
            } catch (e) {}
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