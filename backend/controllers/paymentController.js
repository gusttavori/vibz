const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');
const { generateAndSendTickets } = require('./ticketController');
const { sendNewSaleEmail } = require('../services/emailService');

const connectStripeAccount = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });

        let accountId = user.stripeAccountId;

        if (!accountId) {
            const account = await stripe.accounts.create({
                type: 'standard',
                email: user.email,
            });
            accountId = account.id;

            await prisma.user.update({
                where: { id: userId },
                data: { stripeAccountId: accountId }
            });
        }

        const origin = req.headers.origin || process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000';

        const accountLink = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: `${origin}/dashboard?refresh_stripe=true`,
            return_url: `${origin}/dashboard?success_stripe=true`,
            type: 'account_onboarding',
        });

        res.json({ url: accountLink.url });
    } catch (error) {
        console.error("Erro ao gerar link Stripe:", error);
        res.status(500).json({ message: 'Erro ao conectar com o banco.' });
    }
};

const validateCoupon = async (req, res) => {
    try {
        // 🛡️ Segurança: Identifica o usuário para a trava de uso único
        const userId = req.user?.id;
        const { code, eventId } = req.body;

        if (!code || !eventId || !userId) {
            return res.status(400).json({ message: 'Dados incompletos ou usuário não autenticado.' });
        }

        const coupon = await prisma.coupon.findUnique({
            where: { code: code, isActive: true }
        });

        if (!coupon) return res.status(404).json({ message: 'Cupom inválido ou expirado.' });

        // Validações de data e limite global
        const now = new Date();
        if (coupon.validFrom && now < coupon.validFrom) return res.status(400).json({ message: 'Cupom ainda não disponível.' });
        if (coupon.validUntil && now > coupon.validUntil) return res.status(400).json({ message: 'Cupom expirado.' });
        if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) return res.status(400).json({ message: 'Limite de usos deste cupom atingido.' });

        // Validação de evento/parceiro
        const event = await prisma.event.findUnique({ where: { id: eventId } });
        if (!event) return res.status(404).json({ message: 'Evento não encontrado.' });
        
        if (coupon.partnerId && coupon.partnerId !== event.partnerId) {
            return res.status(400).json({ message: 'Este cupom não é válido para este evento.' });
        }

        // 🛡️ TRAVA DE USO ÚNICO POR USUÁRIO
        const userUsage = await prisma.couponUsage.findFirst({
            where: { userId: userId, couponId: coupon.id }
        });

        if (userUsage) {
            return res.status(400).json({ message: 'Você já utilizou este cupom em outra compra.' });
        }

        // 🛡️ TRAVA FINANCEIRA: O cupom não pode descontar 100% da taxa
        if (coupon.discountType === 'PERCENTAGE' || coupon.discountType === 'PERCENTAGE_FEE') {
            // Em centavos, 100% seria 10000. Limitamos a 99% (9900)
            if (coupon.discountValue >= 10000) {
                return res.status(400).json({ message: 'Configuração de cupom inválida (desconto excede o limite permitido).' });
            }
        }

        return res.json({
            valid: true,
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            message: 'Cupom aplicado com sucesso!'
        });

    } catch (error) {
        console.error("Erro validar cupom:", error);
        return res.status(500).json({ message: 'Erro interno ao validar cupom.' });
    }
};

const createCheckoutSession = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Sessão expirada. Faça login novamente.' });

        const { eventId, tickets, couponCode, participantData } = req.body;

        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: { organizer: true } 
        });

        if (!event) return res.status(404).json({ message: 'Evento não encontrado.' });
        if (event.isInformational) return res.status(400).json({ message: 'Este evento é apenas informativo e não possui vendas online.' });

        // --- VALIDAÇÃO DE CONFLITO DE HORÁRIO ---
        const ticketIdsToCheck = Object.keys(tickets).filter(tid => tickets[tid] > 0);
        if (ticketIdsToCheck.length > 1) {
            const dbTickets = await prisma.ticketType.findMany({ where: { id: { in: ticketIdsToCheck } } });
            const toMinutes = (t) => {
                if (!t) return 0;
                const [h, m] = t.split(':').map(Number);
                return h * 60 + m;
            };

            for (let i = 0; i < dbTickets.length; i++) {
                for (let j = i + 1; j < dbTickets.length; j++) {
                    const t1 = dbTickets[i];
                    const t2 = dbTickets[j];
                    if (t1.activityDate && t2.activityDate && t1.startTime && t2.startTime && t1.endTime && t2.endTime) {
                        const d1 = new Date(t1.activityDate).toISOString().split('T')[0];
                        const d2 = new Date(t2.activityDate).toISOString().split('T')[0];
                        if (d1 === d2) {
                            if (Math.max(toMinutes(t1.startTime), toMinutes(t2.startTime)) < Math.min(toMinutes(t1.endTime), toMinutes(t2.endTime))) {
                                return res.status(400).json({ message: `Conflito de horário: "${t1.name}" e "${t2.name}" ocorrem simultaneamente.` });
                            }
                        }
                    }
                }
            }
        }

        // --- VALIDAÇÃO DE CUPOM ---
        let validCoupon = null;
        if (couponCode) {
            validCoupon = await prisma.coupon.findUnique({ where: { code: couponCode, isActive: true } });
            if (validCoupon) {
                const userUsage = await prisma.couponUsage.findFirst({ where: { userId, couponId: validCoupon.id } });
                if (userUsage) return res.status(400).json({ message: 'Você já utilizou este cupom.' });
            }
        }

        // ============================================
        // 🛡️ TRANSAÇÃO ATÔMICA E RESERVA DE ESTOQUE
        // ============================================
        const reservationResult = await prisma.$transaction(async (tx) => {
            const reservations = [];
            const items = [];

            for (const [ticketTypeId, quantity] of Object.entries(tickets)) {
                if (quantity <= 0) continue;

                const tType = await tx.ticketType.findUnique({ where: { id: ticketTypeId } });
                if (!tType || tType.eventId !== eventId) continue;

                // Consulta vagas ocupadas (Vendidos + Reservas Ativas de outros usuários)
                const activeReservations = await tx.ticketReservation.aggregate({
                    _sum: { quantity: true },
                    where: { ticketTypeId, expiresAt: { gt: new Date() } }
                });
                
                const reservedCount = activeReservations._sum.quantity || 0;
                const available = tType.quantity - tType.sold - reservedCount;

                if (available < quantity) {
                    throw new Error(`Infelizmente, o ingresso "${tType.name}" esgotou as vagas neste exato segundo.`);
                }

                // Verifica o limite de compra por pessoa
                const userBoughtCount = await tx.ticket.count({
                    where: { userId, ticketTypeId, status: { in: ['VALID', 'USED'] } }
                });
                const userReservedCount = await tx.ticketReservation.aggregate({
                    _sum: { quantity: true },
                    where: { userId, ticketTypeId, expiresAt: { gt: new Date() } }
                });
                
                const totalUserHas = userBoughtCount + (userReservedCount._sum.quantity || 0);
                const maxAllowed = tType.maxPerUser || 4;
                
                if ((totalUserHas + quantity) > maxAllowed) {
                    throw new Error(`O limite para "${tType.name}" é de ${maxAllowed} ingresso(s) por pessoa.`);
                }

                // Cria a reserva blindada de 5 minutos
                const expiresAt = new Date(Date.now() + 5 * 60 * 1000); 
                const reservation = await tx.ticketReservation.create({
                    data: { userId, eventId, ticketTypeId, quantity, expiresAt }
                });
                
                reservations.push(reservation);
                items.push({
                    ticketTypeId: tType.id,
                    name: tType.name,
                    batchName: tType.batchName,
                    quantity: quantity,
                    unitPrice: tType.price // Preço 100% vindo do BD em centavos
                });
            }
            return { reservations, items };
        });

        // ============================================
        // 🧮 MATEMÁTICA FINANCEIRA (EM CENTAVOS)
        // ============================================
        const itemsToProcess = reservationResult.items;
        const orderItemsData = [];
        
        let totalBaseAmount = 0; // Valor bruto dos ingressos (vai para o organizador)
        let totalTicketsQuantity = 0;

        for (const item of itemsToProcess) {
            totalBaseAmount += (item.unitPrice * item.quantity);
            totalTicketsQuantity += item.quantity;
            orderItemsData.push({ ticketTypeId: item.ticketTypeId, quantity: item.quantity, unitPrice: item.unitPrice });
        }

        // Taxa fixa da plataforma: 10%
        let platformFee = Math.round(totalBaseAmount * 0.10);
        let discountAmount = 0;

        // Abate o cupom EXCLUSIVAMENTE da taxa Vibz
        if (validCoupon) {
            if (validCoupon.discountType === 'PERCENTAGE' || validCoupon.discountType === 'PERCENTAGE_FEE') {
                discountAmount = Math.round(platformFee * (validCoupon.discountValue / 10000));
            } else if (validCoupon.discountType === 'FIXED') {
                discountAmount = validCoupon.discountValue;
            }

            // REGRA: A taxa Vibz nunca pode ser zerada.
            if (discountAmount >= platformFee) discountAmount = platformFee - 1; 
        }

        const totalPaid = totalBaseAmount + platformFee - discountAmount;
        const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000';

        // ============================================
        // INGRESSOS 100% GRATUITOS (Sem Stripe)
        // ============================================
        if (totalPaid === 0) {
            const newOrder = await prisma.order.create({
                data: {
                    userId, eventId, couponId: validCoupon ? validCoupon.id : null,
                    subtotal: 0, discountAmount: 0, platformFee: 0, totalAmount: 0,
                    status: 'paid', paymentIntentId: `free_${crypto.randomUUID()}`
                }
            });

            // Converte a Reserva direto em Ingressos
            for (const item of itemsToProcess) {
                await prisma.ticketType.update({
                    where: { id: item.ticketTypeId },
                    data: { sold: { increment: item.quantity } }
                });

                for (let i = 0; i < item.quantity; i++) {
                    const pData = participantData?.find(p => p.ticketTypeId === item.ticketTypeId);
                    await prisma.ticket.create({
                        data: {
                            ticketTypeId: item.ticketTypeId, eventId, userId, orderId: newOrder.id,
                            qrCodeData: crypto.randomUUID(), status: 'VALID', price: 0,
                            participantData: pData ? pData.data : {}
                        }
                    });
                }
            }
            
            // Registra o uso do cupom (se houver) e deleta as reservas
            if (validCoupon) {
                await prisma.couponUsage.create({ data: { userId, couponId: validCoupon.id, orderId: newOrder.id } });
            }
            await prisma.ticketReservation.deleteMany({ where: { id: { in: reservationResult.reservations.map(r => r.id) } }});
            
            // Disparos
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (user) generateAndSendTickets(newOrder, user.email, user.name).catch(() => {});
            if (event.organizer?.email) sendNewSaleEmail(event.organizer.email, event.organizer.name, event.title, totalTicketsQuantity, 0).catch(() => {});

            return res.json({ url: `${clientUrl}/sucesso?session_id=${newOrder.paymentIntentId}&is_free=true` });
        }

        // ============================================
        // 💳 INGRESSOS PAGOS (Stripe + Repasse Futuro)
        // ============================================
        const order = await prisma.order.create({
            data: {
                userId, eventId, couponId: validCoupon ? validCoupon.id : null,
                subtotal: totalBaseAmount, discountAmount, platformFee, totalAmount: totalPaid,
                status: 'pending',
                items: { create: orderItemsData }
            }
        });

        const line_items = [];
        
        // 1. Linha(s) dos Ingressos
        for (const item of itemsToProcess) {
            if (item.unitPrice > 0) {
                line_items.push({
                    price_data: {
                        currency: 'brl',
                        product_data: { name: `${item.name} - ${item.batchName || 'Lote Único'}` },
                        unit_amount: item.unitPrice, 
                    },
                    quantity: item.quantity,
                });
            }
        }

        // 2. Linha da Taxa Vibz (separada e abatida do cupom)
        const taxaLiquida = platformFee - discountAmount;
        if (taxaLiquida > 0) {
            const feeName = discountAmount > 0 
                ? `Taxa de Conveniência (Cupom aplicado: -${(discountAmount/100).toLocaleString('pt-BR', {style:'currency', currency:'BRL'})})` 
                : `Taxa de Conveniência (10%)`;

            line_items.push({
                price_data: {
                    currency: 'brl',
                    product_data: { name: feeName },
                    unit_amount: taxaLiquida, 
                },
                quantity: 1,
            });
        }

        const participantsJSON = JSON.stringify(participantData || []).substring(0, 499);
        const reservationIds = reservationResult.reservations.map(r => r.id);

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card', 'pix'],
            mode: 'payment',
            line_items,
            payment_intent_data: { transfer_group: order.id },
            success_url: `${clientUrl}/sucesso?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${clientUrl}/evento/${eventId}`,
            metadata: {
                type: 'TICKET_SALE',
                orderId: order.id,
                eventId: eventId,
                participantsPreview: participantsJSON,
                reservationIds: JSON.stringify(reservationIds)
            }
        });

        res.json({ url: session.url });

    } catch (error) {
        console.error("Erro checkout:", error);
        res.status(400).json({ message: error.message || 'Erro ao processar pedido.' });
    }
};

const createHighlightCheckoutSession = async (req, res) => {
    try {
        const { eventId, highlightType } = req.body;
        const event = await prisma.event.findUnique({ where: { id: eventId } });
        if (!event) return res.status(404).json({ message: 'Evento não encontrado.' });

        const price = highlightType === 'premium' ? 10000 : 5000; // Em centavos
        const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000';

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card', 'pix'],
            mode: 'payment',
            line_items: [{
                price_data: {
                    currency: 'brl',
                    product_data: { name: `Destaque: ${event.title}` },
                    unit_amount: price,
                },
                quantity: 1,
            }],
            success_url: `${clientUrl}/dashboard`,
            cancel_url: `${clientUrl}/dashboard`,
            metadata: {
                type: 'EVENT_HIGHLIGHT',
                eventId,
                highlightType
            }
        });

        res.json({ url: session.url });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao criar sessão de destaque.' });
    }
};

module.exports = {
    createCheckoutSession,
    createHighlightCheckoutSession,
    validateCoupon,
    connectStripeAccount
};