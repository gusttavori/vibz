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
    port: 587, 
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

function drawField(doc, label, value, x, y, width, colorLabel, colorValue, isBoldValue = true) {
    if (isNaN(x) || isNaN(y) || isNaN(width)) return 0;

    doc.font('Helvetica').fontSize(9).fillColor(colorLabel).text((label || '').toUpperCase(), x, y);
    const labelHeight = doc.heightOfString((label || '').toUpperCase(), { width }) + 4;
    
    doc.font(isBoldValue ? 'Helvetica-Bold' : 'Helvetica').fontSize(11).fillColor(colorValue);
    
    const safeValue = value || '-';
    const valueHeight = doc.heightOfString(safeValue, { width });
    doc.text(safeValue, x, y + labelHeight, { width });
    
    return labelHeight + valueHeight;
}

async function drawTicketPDF(doc, ticket, event, user, ticketType, customName = null) {
    const C = { 
        BG: '#F4F4F4', 
        CARD: '#FFFFFF', 
        TEXT_DARK: '#222222', 
        TEXT_LIGHT: '#666666', 
        PRIMARY: '#4C01B5', 
        DIVIDER: '#EEEEEE' 
    };

    const pageW = doc.page ? doc.page.width : 595.28;
    const pageH = doc.page ? doc.page.height : 841.89;
    
    const cardW = 380;
    const cardX = (pageW - cardW) / 2;
    const cardY = 40; 
    const cardH = 700; 

    doc.rect(0, 0, pageW, pageH).fill(C.BG);

    doc.roundedRect(cardX + 3, cardY + 3, cardW, cardH, 12).fillColor('rgba(0,0,0,0.1)').fill();
    doc.roundedRect(cardX, cardY, cardW, cardH, 12).fillColor(C.CARD).fill();

    const imgH = 180;
    const eventImageBuffer = await fetchImage(event.imageUrl);

    doc.save();
    
    doc.path('M ' + cardX + ' ' + (cardY + 12) + 
             ' Q ' + cardX + ' ' + cardY + ' ' + (cardX + 12) + ' ' + cardY + 
             ' L ' + (cardX + cardW - 12) + ' ' + cardY + 
             ' Q ' + (cardX + cardW) + ' ' + cardY + ' ' + (cardX + cardW) + ' ' + (cardY + 12) + 
             ' L ' + (cardX + cardW) + ' ' + (cardY + imgH) + 
             ' L ' + cardX + ' ' + (cardY + imgH) + ' Z').clip();

    if (eventImageBuffer) {
        try {
            doc.image(eventImageBuffer, cardX, cardY, { width: cardW, height: imgH, fit: [cardW, imgH], align: 'center', valign: 'center' });
        } catch (e) { doc.rect(cardX, cardY, cardW, imgH).fill(C.PRIMARY); }
    } else {
        doc.rect(cardX, cardY, cardW, imgH).fill(C.PRIMARY);
    }
    doc.restore();

    let y = cardY + imgH + 25;
    const pad = 25;
    const contentW = cardW - (pad * 2);

    doc.font('Helvetica-Bold').fontSize(18).fillColor(C.TEXT_DARK)
        .text((event.title || 'Evento').toUpperCase(), cardX + pad, y, { width: contentW, align: 'left' });
    
    y += doc.heightOfString((event.title || 'Evento').toUpperCase(), { width: contentW }) + 20;

    doc.moveTo(cardX + pad, y).lineTo(cardX + cardW - pad, y).lineWidth(1).strokeColor(C.DIVIDER).stroke();
    y += 20;

    const colGap = 20;
    const colW = (contentW - colGap) / 2;
    const col1X = cardX + pad;
    const col2X = cardX + pad + colW + colGap;
    const rowGap = 20;

    let dateStr = "";
    if (ticketType && ticketType.activityDate) {
        try {
            dateStr = new Date(ticketType.activityDate).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
            if (ticketType.startTime) dateStr += `\n${ticketType.startTime}`;
        } catch (e) { dateStr = "Data a confirmar"; }
    } else {
        try {
            const d = new Date(event.eventDate || event.createdAt);
            dateStr = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
            dateStr += `\n${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        } catch (e) { dateStr = "Data a confirmar"; }
    }

    const h1 = drawField(doc, 'DATA E HORÁRIO', dateStr, col1X, y, colW, C.PRIMARY, C.TEXT_DARK);
    const h2 = drawField(doc, 'PARTICIPANTE', customName || user.name || 'Convidado', col2X, y, colW, C.PRIMARY, C.TEXT_DARK);
    y += Math.max(h1, h2) + rowGap;

    const locationFull = `${event.location || 'Local a definir'}\n${event.city || ''}`;
    const ticketInfo = `${ticketType ? ticketType.name : 'Geral'}\n${ticketType?.batchName || 'Lote Único'}`;

    const h3 = drawField(doc, 'LOCALIZAÇÃO', locationFull, col1X, y, colW, C.PRIMARY, C.TEXT_DARK);
    const h4 = drawField(doc, 'TIPO DE INGRESSO', ticketInfo, col2X, y, colW, C.PRIMARY, C.TEXT_DARK);
    y += Math.max(h3, h4) + rowGap;

    const priceVal = (!ticket.price || Number(ticket.price) === 0) ? 'GRÁTIS' : `R$ ${Number(ticket.price).toFixed(2).replace('.', ',')}`;
    const h5 = drawField(doc, 'VALOR PAGO', priceVal, col1X, y, colW, C.PRIMARY, C.TEXT_DARK);
    y += h5 + 25;

    doc.moveTo(cardX, y).lineTo(cardX + cardW, y).lineWidth(1).dash(4, { space: 4 }).strokeColor(C.DIVIDER).stroke();
    doc.undash();
    y += 30;

    const uniqueCode = ticket.qrCodeData || 'CODE-ERROR';
    const qrCodeImage = await QRCode.toDataURL(uniqueCode, { width: 400, margin: 0, color: { dark: '#000000', light: '#ffffff' } });
    const qrSize = 160;
    const qrX = cardX + (cardW - qrSize) / 2;

    if (y + qrSize + 50 > pageH) {
        doc.addPage();
        y = 50;
    }

    doc.image(qrCodeImage, qrX, y, { width: qrSize, height: qrSize });
    y += qrSize + 10;

    doc.font('Courier').fontSize(10).fillColor(C.TEXT_LIGHT)
       .text(uniqueCode, cardX, y, { width: cardW, align: 'center' });
    y += 20;

    doc.font('Helvetica-Bold').fontSize(14).fillColor(C.PRIMARY)
       .text('Vibz', cardX, y, { width: cardW, align: 'center' });
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

        const ticketsRaw = await prisma.ticket.findMany({
            where: { orderId: order.id }
        });

        if (ticketsRaw.length === 0) {
            console.error("Nenhum ticket encontrado para gerar PDF no pedido", order.id);
            doc.addPage();
            doc.text("Erro ao gerar ingressos. Contate o suporte.");
        } else {
            for (const ticket of ticketsRaw) {
                let tType = null;
                if (ticket.ticketTypeId) {
                    tType = await prisma.ticketType.findUnique({ where: { id: ticket.ticketTypeId } });
                }
                
                doc.addPage();
                await drawTicketPDF(doc, ticket, event, user, tType, recipientName);
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
    const { qrCodeData, ticketId, qrCode } = req.body;
    
    if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'Não autorizado. Faça login.' });
    }

    const searchKey = qrCodeData || qrCode;

    if (!searchKey && !ticketId) {
        return res.status(400).json({ success: false, message: "Dados de validação não fornecidos (Falta QR Code ou ID)." });
    }

    try {
        let ticket = await prisma.ticket.findFirst({
            where: {
                OR: [
                    { qrCodeData: searchKey ? searchKey : undefined },
                    { id: ticketId ? ticketId : undefined }
                ]
            }
        });

        if (!ticket && searchKey) {
            try {
                ticket = await prisma.ticket.findUnique({ where: { id: searchKey } });
            } catch (e) {}
        }

        if (!ticket) return res.status(404).json({ valid: false, message: 'Ingresso não encontrado.' });

        ticket.event = await prisma.event.findUnique({ where: { id: ticket.eventId } });
        ticket.user = await prisma.user.findUnique({ where: { id: ticket.userId } });
        ticket.ticketType = ticket.ticketTypeId ? await prisma.ticketType.findUnique({ where: { id: ticket.ticketTypeId } }) : null;

        if (!ticket.event) return res.status(404).json({ valid: false, message: 'Evento referente ao ingresso não encontrado.' });

        if (ticket.event.organizerId !== req.user.id && !req.user.isAdmin) {
            return res.status(403).json({ valid: false, message: 'Permissão negada. Você não é o organizador deste evento.' });
        }
        
        if (ticket.status !== 'valid') {
            return res.status(400).json({ 
                valid: false, 
                message: `Ingresso já utilizado.`,
                details: { 
                    user: ticket.user?.name, 
                    type: ticket.ticketType?.name,
                    event: ticket.event?.title
                },
                usedAt: ticket.usedAt 
            });
        }

        const updatedTicket = await prisma.ticket.update({ 
            where: { id: ticket.id }, 
            data: { status: 'used', usedAt: new Date() } 
        });
        
        res.json({ 
            valid: true, 
            message: 'Acesso Liberado! ✅', 
            details: { 
                user: ticket.user?.name, 
                event: ticket.event?.title, 
                type: ticket.ticketType?.name, 
                batch: ticket.ticketType?.batchName
            },
            ticket: updatedTicket
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
            where: { userId: userId },
            orderBy: { createdAt: "desc" }
        });

        const formattedTickets = await Promise.all(tickets.map(async (t) => {
            const event = await prisma.event.findUnique({ where: { id: t.eventId } });
            const ticketType = t.ticketTypeId ? await prisma.ticketType.findUnique({ where: { id: t.ticketTypeId } }) : null;
            
            return {
                ...t,
                event: event,
                ticketType: ticketType
            };
        }));

        res.json(formattedTickets);
    } catch (error) {
        console.error("Erro ao buscar meus ingressos:", error);
        res.status(500).json({ message: "Erro interno do servidor ao carregar ingressos." });
    }
};

const downloadTicketPDF = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
        
        if (!ticket) return res.status(404).send('Ingresso não encontrado');

        ticket.event = await prisma.event.findUnique({ where: { id: ticket.eventId } });
        ticket.user = await prisma.user.findUnique({ where: { id: ticket.userId } });
        ticket.ticketType = ticket.ticketTypeId ? await prisma.ticketType.findUnique({ where: { id: ticket.ticketTypeId } }) : null;

        if (!ticket.event) return res.status(404).send('Evento não encontrado');

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
            orderBy: { createdAt: 'desc' }
        });
        
        const formatted = await Promise.all(tickets.map(async (t) => {
            const user = await prisma.user.findUnique({ where: { id: t.userId }, select: { name: true } });
            const event = await prisma.event.findUnique({ where: { id: t.eventId }, select: { title: true } });
            
            return {
                id: t.id,
                qrCodeData: t.qrCodeData,
                status: t.status,
                user: user,
                event: event
            };
        }));
        
        res.json(formatted);
    } catch (e) { 
        res.status(500).json({ error: e.message }); 
    }
};

// --- FUNÇÃO ATUALIZADA: Exportar relatório de inscrições (CSV/Excel) ---
const exportEventTicketsExcel = async (req, res) => {
    try {
        const { eventId } = req.params;
        const userId = req.user.id;

        // Verifica se o evento pertence ao organizador (ou se é admin)
        const event = await prisma.event.findUnique({ where: { id: eventId } });
        if (!event) return res.status(404).json({ message: 'Evento não encontrado.' });

        if (event.organizerId !== userId && !req.user.isAdmin) {
            return res.status(403).json({ message: 'Acesso negado.' });
        }

        // Busca todos os ingressos emitidos para este evento
        const tickets = await prisma.ticket.findMany({
            where: { eventId: eventId },
            orderBy: { createdAt: 'desc' }
        });

        let allCustomKeys = [];
        if (event.formSchema) {
            try {
                const schema = typeof event.formSchema === 'string' ? JSON.parse(event.formSchema) : event.formSchema;
                if (Array.isArray(schema)) {
                    allCustomKeys = schema.map(q => q.label);
                }
            } catch(e) { console.error("Erro ao ler formSchema no export", e); }
        }

        const dataForExcel = await Promise.all(tickets.map(async (t) => {
            const user = await prisma.user.findUnique({ where: { id: t.userId }, select: { name: true, email: true } });
            const tType = t.ticketTypeId ? await prisma.ticketType.findUnique({ where: { id: t.ticketTypeId } }) : null;

            let customData = {};
            if (t.participantData) {
                try {
                    customData = typeof t.participantData === 'string' 
                        ? JSON.parse(t.participantData) 
                        : t.participantData;
                } catch(e) {}
            }

            const normalizedCustomData = {};
            allCustomKeys.forEach(key => {
                normalizedCustomData[key] = customData[key] || "Não respondeu";
            });

            return {
                "ID do Ingresso": t.id,
                "Status": t.status === 'valid' ? 'Pronto para Uso' : t.status === 'used' ? 'Já Utilizado' : t.status === 'cancelled' ? 'Cancelado' : t.status,
                "Participante": user?.name || "Desconhecido",
                "E-mail": user?.email || "Não informado",
                ...normalizedCustomData,
                "Atividade / Palestra": tType?.name || "Geral",
                "Lote": tType?.batchName || "Lote Único",
                "Valor (R$)": Number(t.price || 0).toFixed(2),
                "Data de Utilização": t.usedAt ? new Date(t.usedAt).toLocaleString('pt-BR') : 'Não utilizado',
                "Data da Inscrição": new Date(t.createdAt).toLocaleString('pt-BR'),
                "Código QR": t.qrCodeData
            };
        }));

        res.json({
            eventTitle: event.title,
            tickets: dataForExcel
        });

    } catch (error) {
        console.error("Erro ao exportar relatório:", error);
        res.status(500).json({ message: "Erro interno ao gerar relatório." });
    }
};

const cancelTicket = async (req, res) => {
    try {
        const { ticketId } = req.params;

        const userId = req.user.id; 

        const result = await prisma.$transaction(async (tx) => {
            const ticket = await tx.ticket.findUnique({
                where: { id: ticketId }
            });

            if (!ticket) {
                throw new Error('Ingresso não encontrado.');
            }

            if (ticket.status === 'cancelled') {
                throw new Error('Este ingresso já está cancelado.');
            }

            const canceledTicket = await tx.ticket.update({
                where: { id: ticketId },
                data: { status: 'cancelled' }
            });

            if (ticket.ticketTypeId) {
                const tType = await tx.ticketType.findUnique({ where: { id: ticket.ticketTypeId }});
                if (tType && tType.sold > 0) {
                    await tx.ticketType.update({
                        where: { id: ticket.ticketTypeId },
                        data: { sold: { decrement: 1 } }
                    });
                }
            }

            return canceledTicket;
        });

        res.status(200).json({ 
            message: "Inscrição cancelada com sucesso! A vaga foi devolvida ao sistema.", 
            ticket: result 
        });

    } catch (error) {
        console.error("Erro ao cancelar ingresso:", error);
        res.status(400).json({ message: error.message || "Erro interno ao cancelar inscrição." });
    }
};

module.exports = { 
    generateAndSendTickets, 
    validateTicket, 
    getMyTickets, 
    downloadTicketPDF,
    listLastTickets,
    exportEventTicketsExcel,
    cancelTicket
};