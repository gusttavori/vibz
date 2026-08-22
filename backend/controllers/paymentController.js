const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');
const { generateAndSendTickets } = require('./ticketController');
const { sendNewSaleEmail } = require('../services/emailService');

const STRIPE_PERCENTAGE = 0.0399;
const STRIPE_FIXED = 0.39;

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
        const { code, eventId } = req.body;

        if (!code || !eventId) {
            return res.status(400).json({ message: 'Dados incompletos.' });
        }

        const coupon = await prisma.coupon.findUnique({
            where: { code: code, isActive: true }
        });

        if (!coupon) {
            return res.status(404).json({ message: 'Cupom inválido ou expirado.' });
        }

        const now = new Date();
        if (coupon.validFrom && now < new Date(coupon.validFrom)) return res.status(400).json({ message: 'Cupom ainda não disponível.' });
        if (coupon.validUntil && now > new Date(coupon.validUntil)) return res.status(400).json({ message: 'Cupom expirado.' });

        if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) return res.status(400).json({ message: 'Limite de usos atingido.' });

        const event = await prisma.event.findUnique({ where: { id: eventId } });
        if (!event) return res.status(404).json({ message: 'Evento não encontrado.' });

        if (coupon.partnerId) {
            if (coupon.partnerId !== event.partnerId) {
                return res.status(400).json({ message: 'Este cupom não é válido para este evento.' });
            }
        }

        return res.json({
            valid: true,
            code: coupon.code,
            discountType: coupon.discountType,
            message: 'Cupom aplicado com sucesso!'
        });

    } catch (error) {
        return res.status(500).json({ message: 'Erro interno ao validar cupom.' });
    }
};

const createCheckoutSession = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'Sessão expirada. Faça login novamente.' });
        }

        const { eventId, tickets, couponCode, participantData } = req.body;
        const userId = req.user.id;

        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: { organizer: true } 
        });

        if (!event) return res.status(404).json({ message: 'Evento não encontrado.' });

        if (event.isInformational) {
            return res.status(400).json({ message: 'Este evento é apenas informativo e não possui vendas online.' });
        }

        const ticketIdsToCheck = Object.keys(tickets).filter(tid => tickets[tid] > 0);
        if (ticketIdsToCheck.length > 1) {
            const dbTickets = await prisma.ticketType.findMany({
                where: { id: { in: ticketIdsToCheck } }
            });

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
                            const start1 = toMinutes(t1.startTime);
                            const end1 = toMinutes(t1.endTime);
                            const start2 = toMinutes(t2.startTime);
                            const end2 = toMinutes(t2.endTime);

                            if (Math.max(start1, start2) < Math.min(end1, end2)) {
                                return res.status(400).json({
                                    message: `Conflito de horário: "${t1.name}" e "${t2.name}" ocorrem simultaneamente.`
                                });
                            }
                        }
                    }
                }
            }
        }

        let validCoupon = null;
        let platformRate = 0.08;
        let partnerRate = 0.00;

        if (couponCode) {
            validCoupon = await prisma.coupon.findUnique({
                where: { code: couponCode, isActive: true }
            });

            if (validCoupon) {
                if (validCoupon.partnerId && validCoupon.partnerId !== event.partnerId) {
                    return res.status(400).json({ message: 'Cupom inválido para este produtor/parceiro.' });
                }

                if (validCoupon.discountType === 'PERCENTAGE') {
                    const totalFee = Math.max(0, 8 - validCoupon.discountValue) / 100;
                    platformRate = totalFee / 2;
                    partnerRate = totalFee / 2;
                }
            }
        }

        const line_items = [];
        const orderItemsData = [];

        let totalBaseAmount = 0;
        let totalPlatformFee = 0;
        let totalPartnerCommission = 0;
        let totalPaid = 0;

        // VALIDAÇÃO PRÉVIA (Aviso rápido para o usuário antes da transação)
        for (const [ticketTypeId, quantity] of Object.entries(tickets)) {
            if (quantity <= 0) continue;

            const tType = await prisma.ticketType.findUnique({ where: { id: ticketTypeId } });
            if (!tType || tType.eventId !== eventId) continue;

            const available = tType.quantity - tType.sold;
            if (available < quantity) {
                return res.status(400).json({ message: `O ingresso "${tType.name}" esgotou ou não tem quantidade suficiente.` });
            }

            const unitPrice = parseFloat(tType.price);
            let unitPlatformFee = 0;
            let unitPartnerFee = 0;
            let grossUnitTotal = 0;

            if (unitPrice > 0) {
                unitPlatformFee = unitPrice * platformRate;
                unitPartnerFee = unitPrice * partnerRate;
                const targetNet = unitPrice + unitPlatformFee + unitPartnerFee;
                grossUnitTotal = (targetNet + STRIPE_FIXED) / (1 - STRIPE_PERCENTAGE);
            } else {
                grossUnitTotal = 0;
            }

            totalBaseAmount += (unitPrice * quantity);
            totalPlatformFee += (unitPlatformFee * quantity);
            totalPartnerCommission += (unitPartnerFee * quantity);
            totalPaid += (grossUnitTotal * quantity);

            orderItemsData.push({
                ticketTypeId: tType.id,
                quantity: quantity,
                unitPrice: unitPrice
            });

            if (grossUnitTotal > 0) {
                line_items.push({
                    price_data: {
                        currency: 'brl',
                        product_data: { name: `${tType.name} - ${tType.batchName || 'Lote Único'}` },
                        unit_amount: Math.round(grossUnitTotal * 100),
                    },
                    quantity: quantity,
                });
            }
        }

        const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000';

        // ============================================
        // LÓGICA DE INGRESSO GRATUITO (COM TRANSAÇÃO ATÔMICA)
        // ============================================
        if (totalPaid === 0) {
            try {
                // INÍCIO DA TRANSAÇÃO ATÔMICA (Bloqueia o banco para impedir concorrência/overbooking)
                const { order, totalTicketsGenerated } = await prisma.$transaction(async (tx) => {
                    
                    // 1. Revalida estoque e limites dentro do ambiente bloqueado
                    for (const item of orderItemsData) {
                        const tType = await tx.ticketType.findUnique({
                            where: { id: item.ticketTypeId },
                        });

                        const available = tType.quantity - tType.sold;
                        if (available < item.quantity) {
                            throw new Error(`Infelizmente as vagas para "${tType.name}" esgotaram no último segundo.`);
                        }

                        // Revalidação Atômica: Checa se o usuário tentou burlar o limite do ingresso
                        const userBoughtCount = await tx.ticket.count({
                            where: {
                                userId: userId,
                                ticketTypeId: item.ticketTypeId,
                                status: { in: ['valid', 'used'] }
                            }
                        });

                        const maxAllowed = tType.maxPerUser || 4;
                        if ((userBoughtCount + item.quantity) > maxAllowed) {
                            throw new Error(`Limite excedido para "${tType.name}". O limite é de ${maxAllowed} vaga(s) por pessoa.`);
                        }

                        // ATUALIZAÇÃO SEGURA: Já tira a vaga do banco
                        await tx.ticketType.update({
                            where: { id: item.ticketTypeId },
                            data: { sold: { increment: item.quantity } }
                        });
                    }

                    // 2. Cria o Pedido (Order)
                    const newOrder = await tx.order.create({
                        data: {
                            userId: userId,
                            eventId: eventId,
                            couponId: validCoupon ? validCoupon.id : null,
                            subtotal: 0,
                            totalAmount: 0,
                            platformFee: 0,
                            status: 'paid',
                            paymentIntentId: `free_${crypto.randomUUID()}`
                        }
                    });

                    // 3. Gera os Ingressos associados ao pedido
                    let generatedCount = 0;
                    for (const item of orderItemsData) {
                        for (let i = 0; i < item.quantity; i++) {
                            let customData = {};
                            if (participantData && Array.isArray(participantData)) {
                                const pData = participantData.find(p => p.ticketTypeId === item.ticketTypeId);
                                if (pData) customData = pData.data;
                            }

                            await tx.ticket.create({
                                data: {
                                    ticketTypeId: item.ticketTypeId,
                                    eventId: eventId,
                                    userId: userId,
                                    orderId: newOrder.id,
                                    qrCodeData: crypto.randomUUID(),
                                    status: 'valid',
                                    price: 0,
                                    participantData: customData
                                }
                            });
                            generatedCount++;
                        }
                    }

                    return { order: newOrder, totalTicketsGenerated: generatedCount };
                });
                // FIM DA TRANSAÇÃO ATÔMICA

                // Disparo de E-mails feito de forma paralela para não atrasar a resposta
                try {
                    const user = await prisma.user.findUnique({ where: { id: userId } });
                    if (user) {
                        generateAndSendTickets(order, user.email, user.name).catch(() => {});
                    }
                } catch (emailError) {}

                try {
                    if (event.organizer && event.organizer.email) {
                        sendNewSaleEmail(event.organizer.email, event.organizer.name, event.title, totalTicketsGenerated, 0).catch(() => {});
                    }
                } catch (emailError) {}

                return res.json({
                    url: `${clientUrl}/sucesso?session_id=${order.paymentIntentId}&is_free=true`
                });

            } catch (txError) {
                // Se der qualquer erro dentro do $transaction (Ex: Estourou o limite de vagas), ele cai aqui e devolve a resposta clara para o frontend
                return res.status(400).json({ message: txError.message });
            }
        }

        // ============================================
        // LÓGICA DE INGRESSO PAGO (STRIPE - Atual em Desuso)
        // ============================================
        const order = await prisma.order.create({
            data: {
                userId,
                eventId,
                couponId: validCoupon ? validCoupon.id : null,
                subtotal: totalBaseAmount,
                totalAmount: totalPaid,
                platformFee: totalPlatformFee,
                status: 'pending'
            }
        });

        for (const item of orderItemsData) {
            for (let i = 0; i < item.quantity; i++) {
                let customData = {};
                if (participantData && Array.isArray(participantData)) {
                    const pData = participantData.find(p => p.ticketTypeId === item.ticketTypeId);
                    if (pData) customData = pData.data;
                }

                await prisma.ticket.create({
                    data: {
                        ticketTypeId: item.ticketTypeId,
                        eventId: eventId,
                        userId: userId,
                        orderId: order.id,
                        qrCodeData: crypto.randomUUID(),
                        status: 'pending',
                        price: item.unitPrice,
                        participantData: customData
                    }
                });
            }
        }

        let paymentIntentData = undefined;
        const organizerStripeId = event.organizer?.stripeAccountId;
        const isOrganizerReady = event.organizer?.stripeOnboardingComplete && organizerStripeId;

        if (isOrganizerReady) {
            paymentIntentData = { transfer_group: order.id };
        }

        const participantsJSON = JSON.stringify(participantData || []).substring(0, 499);

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items,
            payment_intent_data: paymentIntentData,
            success_url: `${clientUrl}/sucesso?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${clientUrl}/evento/${eventId}`,
            metadata: {
                type: 'TICKET_SALE',
                orderId: order.id,
                eventId: eventId,
                participantsPreview: participantsJSON
            }
        });

        res.json({ url: session.url });

    } catch (error) {
        console.error("Erro checkout:", error);
        res.status(500).json({ message: 'Erro ao processar pedido.', error: error.message });
    }
};

const createHighlightCheckoutSession = async (req, res) => {
    try {
        const { eventId, highlightType } = req.body;
        const event = await prisma.event.findUnique({ where: { id: eventId } });
        if (!event) return res.status(404).json({ message: 'Evento não encontrado.' });

        const price = highlightType === 'premium' ? 100 : 50;
        const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000';

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [{
                price_data: {
                    currency: 'brl',
                    product_data: { name: `Destaque: ${event.title}` },
                    unit_amount: price * 100,
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

const handleStripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        const payload = req.rawBody || req.body;
        event = stripe.webhooks.constructEvent(payload, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const { type, orderId, eventId } = session.metadata;
        const stripeEmail = session.customer_details?.email;
        const stripeName = session.customer_details?.name;

        if (type === 'TICKET_SALE') {
            try {
                const updatedOrder = await prisma.order.update({
                    where: { id: orderId },
                    data: { status: 'paid', paymentIntentId: session.payment_intent }
                });

                const pendingTickets = await prisma.ticket.findMany({
                    where: { orderId: orderId }
                });

                const qtyByType = {};
                pendingTickets.forEach(t => {
                    qtyByType[t.ticketTypeId] = (qtyByType[t.ticketTypeId] || 0) + 1;
                });

                let totalTickets = 0;
                for (const [tId, qty] of Object.entries(qtyByType)) {
                    await prisma.ticketType.update({
                        where: { id: tId },
                        data: { sold: { increment: qty } }
                    });
                    totalTickets += qty;
                }

                await prisma.ticket.updateMany({
                    where: { orderId: orderId },
                    data: { status: 'valid' }
                });

                const user = await prisma.user.findUnique({ where: { id: updatedOrder.userId } });
                if (user) {
                    generateAndSendTickets(updatedOrder, stripeEmail || user.email, stripeName || user.name).catch(() => {});
                }

                const eventData = await prisma.event.findUnique({
                    where: { id: updatedOrder.eventId },
                    include: { organizer: true }
                });

                if (eventData && eventData.organizer) {
                    const totalValue = Number(updatedOrder.totalAmount);
                    sendNewSaleEmail(eventData.organizer.email, eventData.organizer.name, eventData.title, totalTickets, totalValue).catch(() => {});
                }

            } catch (err) {
                console.error("Erro webhook ticket:", err);
            }
        }

        if (type === 'EVENT_HIGHLIGHT') {
            try {
                await prisma.event.update({
                    where: { id: eventId },
                    data: {
                        isFeatured: true,
                        highlightStatus: 'approved',
                        isFeaturedRequested: false
                    }
                });
            } catch (err) {
                console.error("Erro ao processar destaque:", err);
            }
        }
    }

    if (event.type === 'account.updated') {
        const account = event.data.object;
        if (account.charges_enabled) {
            try {
                await prisma.user.updateMany({
                    where: { stripeAccountId: account.id },
                    data: { stripeOnboardingComplete: true }
                });
            } catch (err) {}
        } else {
            try {
                await prisma.user.updateMany({
                    where: { stripeAccountId: account.id },
                    data: { stripeOnboardingComplete: false }
                });
            } catch (err) {}
        }
    }

    res.json({ received: true });
};

module.exports = {
    createCheckoutSession,
    createHighlightCheckoutSession,
    handleStripeWebhook,
    validateCoupon,
    connectStripeAccount
};