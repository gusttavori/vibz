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
    // Paleta de Cores
    const C = { 
        BG: '#F2F4F8', 
        CARD: '#FFFFFF', 
        TEXT_DARK: '#111827', 
        TEXT_MED: '#374151',
        TEXT_LIGHT: '#9ca3af', 
        PRIMARY: '#4C01B5', 
        BORDER: '#e5e7eb',
        ACCENT_BG: '#f3f4f6'
    };
    
    // --- DIMENSÕES MÁXIMAS (Card Ocupando a Página) ---
    const pageW = doc.page.width;   // ~595
    const pageH = doc.page.height;  // ~841
    const margin = 20;              // Margem fina para aproveitar o espaço
    
    const cardX = margin;
    const cardY = margin;
    const cardW = pageW - (margin * 2);
    const cardH = pageH - (margin * 2);

    // Preparação de Dados
    const eventImageBuffer = await fetchImage(event.imageUrl);
    const uniqueCode = ticket.qrCodeData;
    // QR Code grande e nítido
    const qrCodeImage = await QRCode.toDataURL(uniqueCode, { width: 450, margin: 1, color: { dark: '#000000', light: '#ffffff' } });

    // 1. Fundo da Página (Cinza suave)
    doc.rect(0, 0, pageW, pageH).fill(C.BG);
    
    // 2. Sombra do Card
    doc.roundedRect(cardX + 4, cardY + 6, cardW, cardH, 16).fillColor('#cbd5e1').fillOpacity(0.5).fill();
    doc.fillOpacity(1); // Reset opacidade

    // 3. Card Principal Branco
    doc.roundedRect(cardX, cardY, cardW, cardH, 16).fillColor(C.CARD).fill();

    // --- CABEÇALHO / IMAGEM (Hero Aumentado) ---
    const imgH = 320; // AUMENTADO PARA 320px
    doc.save();
    // Clip para arredondar apenas topo
    doc.path(`M ${cardX} ${cardY + 16} Q ${cardX} ${cardY} ${cardX + 16} ${cardY} L ${cardX + cardW - 16} ${cardY} Q ${cardX + cardW} ${cardY} ${cardX + cardW} ${cardY + 16} L ${cardX + cardW} ${cardY + imgH} L ${cardX} ${cardY + imgH} Z`).clip();
    
    if (eventImageBuffer) {
        try { 
            doc.image(eventImageBuffer, cardX, cardY, { width: cardW, height: imgH, fit: [cardW, imgH], align: 'center', valign: 'center' }); 
        } catch (e) {}
    } else {
        doc.rect(cardX, cardY, cardW, imgH).fill(C.PRIMARY); // Fallback Roxo
    }
    doc.restore();

    // --- CONTEÚDO PRINCIPAL ---
    let y = cardY + imgH + 35; // Espaço após imagem
    const pad = 35; // Espaçamento lateral interno
    const contentW = cardW - (pad * 2);

    // Título do Evento (Grande e Bold)
    doc.font('Helvetica-Bold').fontSize(26).fillColor(C.TEXT_DARK)
        .text(event.title.toUpperCase(), cardX + pad, y, { width: contentW, align: 'left', lineGap: 5 });
    
    y += doc.heightOfString(event.title.toUpperCase(), { width: contentW }) + 15;

    // Divisor Fino
    doc.moveTo(cardX + pad, y).lineTo(cardX + cardW - pad, y).lineWidth(1).strokeColor(C.BORDER).stroke();
    y += 25; // Espaço após divisor

    // --- GRID DE INFORMAÇÕES (Layout 2 Colunas) ---
    const colGap = 20;
    const colWidth = (contentW / 2) - (colGap / 2);
    const col1X = cardX + pad;
    const col2X = cardX + pad + colWidth + colGap;
    
    // Altura de cada bloco do grid (reduzida ligeiramente para compactar)
    const blockHeight = 80;
    let currentY = y;

    // --- LINHA 1: DATA (Esq) vs PARTICIPANTE (Dir) ---
    
    // Data (Esquerda)
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

    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.PRIMARY).text('DATA E HORÁRIO', col1X, currentY);
    doc.font('Helvetica-Bold').fontSize(13).fillColor(C.TEXT_MED).text(dateStr, col1X, currentY + 15, { width: colWidth });
    doc.font('Helvetica').fontSize(12).fillColor(C.TEXT_LIGHT).text(timeStr, col1X, currentY + 32, { width: colWidth });

    // Participante (Direita)
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.PRIMARY).text('PARTICIPANTE', col2X, currentY);
    doc.font('Helvetica-Bold').fontSize(14).fillColor(C.TEXT_DARK).text(customName || user.name, col2X, currentY + 15, { width: colWidth, ellipsis: true });

    currentY += blockHeight; // Pula para próxima linha do grid

    // --- LINHA 2: LOCAL (Esq) vs TIPO INGRESSO (Dir) ---

    // Local (Esquerda)
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.PRIMARY).text('LOCALIZAÇÃO', col1X, currentY);
    // IMPORTANTE: ellipsis: true impede que textos longos invadam a outra coluna ou linhas abaixo
    doc.font('Helvetica-Bold').fontSize(12).fillColor(C.TEXT_MED).text(event.location, col1X, currentY + 15, { width: colWidth, height: 30, ellipsis: true });
    doc.font('Helvetica').fontSize(11).fillColor(C.TEXT_LIGHT).text(event.city || '', col1X, currentY + 32, { width: colWidth, ellipsis: true });

    // Tipo Ingresso (Direita)
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.PRIMARY).text('TIPO DE INGRESSO', col2X, currentY);
    doc.font('Helvetica-Bold').fontSize(13).fillColor(C.TEXT_DARK).text(ticketType ? ticketType.name : 'Geral', col2X, currentY + 15, { width: colWidth, height: 30, ellipsis: true });
    doc.font('Helvetica').fontSize(11).fillColor(C.TEXT_LIGHT).text(ticketType?.batchName || 'Lote Único', col2X, currentY + 32, { width: colWidth, ellipsis: true });

    currentY += blockHeight; // Pula para próxima linha

    // --- LINHA 3: VALOR (Direita) ---
    // (Opcional, se quiser valor na esquerda pode por status ou organizador)
    const valor = (!ticket.price || ticket.price === 0) ? 'GRÁTIS' : `R$ ${Number(ticket.price).toFixed(2).replace('.', ',')}`;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.PRIMARY).text('VALOR PAGO', col2X, currentY);
    doc.font('Helvetica-Bold').fontSize(14).fillColor(C.TEXT_DARK).text(valor, col2X, currentY + 15);

    // --- ÁREA DO QR CODE (Reposicionada de baixo para cima) ---
    
    const qrBoxSize = 220;
    const qrBoxX = (pageW - qrBoxSize) / 2;

    // Define o limite inferior seguro, deixando espaço para o rodapé "Vibz Eventos"
    // cardY + cardH é o final do card branco. Subtraímos 70px para o rodapé e respiro.
    const safeBottomY = cardY + cardH - 70; 

    // Altura total necessária para o bloco QR (Box + Hash + margens)
    const qrBlockTotalHeight = qrBoxSize + 40;

    // Calcula onde o bloco deve começar (Y) para terminar no limite seguro
    let qrAreaY = safeBottomY - qrBlockTotalHeight;

    // Garante que não sobreponha o conteúdo do grid (currentY) se este tiver descido muito
    // Adiciona 40px de respiro mínimo após o último conteúdo
    qrAreaY = Math.max(qrAreaY, currentY + 40); 

    
    // Linha pontilhada separadora
    doc.moveTo(cardX + 20, qrAreaY - 25).lineTo(cardX + cardW - 20, qrAreaY - 25)
       .lineWidth(1).dash(4, { space: 4 }).strokeColor(C.BORDER).stroke();
    doc.undash();

    // Box Fundo QR
    doc.roundedRect(qrBoxX, qrAreaY, qrBoxSize, qrBoxSize, 12).fill(C.ACCENT_BG);
    
    // Imagem QR Code centralizada no box
    const qrImgSize = 180;
    const qrImgX = (pageW - qrImgSize) / 2;
    const qrImgY = qrAreaY + (qrBoxSize - qrImgSize) / 2;
    
    doc.image(qrCodeImage, qrImgX, qrImgY, { width: qrImgSize, height: qrImgSize });

    // Código Hash abaixo do box
    doc.font('Courier').fontSize(10).fillColor(C.TEXT_LIGHT)
        .text(uniqueCode, 0, qrAreaY + qrBoxSize + 15, { width: pageW, align: 'center' });

    // Rodapé "Vibz Eventos" na borda inferior do card
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

        // --- NOVA TRAVA DE SEGURANÇA: Organizador ou Admin ---
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