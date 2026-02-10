const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateAndSendTickets } = require('./ticketController');

const STRIPE_PERCENTAGE = 0.0399; 
const STRIPE_FIXED = 0.39;        

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
        console.error("Erro ao validar cupom:", error);
        return res.status(500).json({ message: 'Erro interno ao validar cupom.' });
    }
};

const createCheckoutSession = async (req, res) => {
    try {
        // Validação de segurança
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'Sessão expirada.' });
        }

        const { eventId, tickets, couponCode, participantData } = req.body;
        const userId = req.user.id;

        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: { organizer: true, partner: true }
        });

        if (!event) return res.status(404).json({ message: 'Evento não encontrado.' });

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

        // --- LÓGICA DE EVENTO GRATUITO (CORRIGIDA) ---
        if (totalPaid === 0) {
            console.log("🎟️ Evento Gratuito detectado. Processando sem Stripe...");

            const order = await prisma.order.create({
                data: {
                    userId,
                    eventId,
                    couponId: validCoupon?.id,
                    subtotal: 0,
                    totalAmount: 0,
                    platformFee: 0,
                    status: 'paid', // Status finalizado
                    // REMOVIDO: paymentStatus: 'paid' (Campo não existe no schema)
                    paymentIntentId: `free_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    items: { create: orderItemsData }
                },
                include: { items: true } 
            });

            for (const item of order.items) {
                await prisma.ticketType.update({
                    where: { id: item.ticketTypeId },
                    data: { sold: { increment: item.quantity } }
                });

                for (let i = 0; i < item.quantity; i++) {
                    const uniqueCode = `${order.id}-${item.id}-${i}-${Date.now()}`;
                    
                    let customData = {};
                    if (participantData && Array.isArray(participantData)) {
                        const pData = participantData.find(p => p.ticketTypeId === item.ticketTypeId);
                        if (pData) customData = pData.data;
                    }

                    await prisma.ticket.create({
                        data: {
                            userId: userId,
                            eventId: eventId,
                            ticketTypeId: item.ticketTypeId,
                            order: { connect: { id: order.id } }, // Conexão correta
                            qrCodeData: uniqueCode,
                            status: 'valid',
                            price: 0,
                            participantData: customData
                        }
                    });
                }
            }

            try {
                const user = await prisma.user.findUnique({ where: { id: userId } });
                if (user) {
                    await generateAndSendTickets(order, user.email, user.name);
                }
            } catch (emailError) {
                console.error("Erro ao enviar email grátis:", emailError);
            }

            return res.json({ 
                url: `${process.env.CLIENT_URL}/sucesso?session_id=${order.paymentIntentId}&is_free=true` 
            });
        }

        // --- FLUXO PAGO (STRIPE) ---
        let paymentIntentData = {};
        const organizerStripeId = event.organizer?.stripeAccountId;
        const isOrganizerReady = event.organizer?.stripeOnboardingComplete && organizerStripeId;

        if (isOrganizerReady) {
            const applicationFeeAmount = Math.round((totalPlatformFee + totalPartnerCommission) * 100);
            paymentIntentData = {
                application_fee_amount: applicationFeeAmount,
                transfer_data: { destination: organizerStripeId },
            };
        }

        const order = await prisma.order.create({
            data: {
                userId,
                eventId,
                couponId: validCoupon?.id,
                subtotal: totalBaseAmount,
                totalAmount: totalPaid,
                platformFee: totalPlatformFee,
                status: 'pending',
                items: { create: orderItemsData }
            }
        });

        const participantsJSON = JSON.stringify(participantData || []).substring(0, 499); 

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items,
            payment_intent_data: isOrganizerReady ? paymentIntentData : undefined,
            success_url: `${process.env.CLIENT_URL}/sucesso?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.CLIENT_URL}/evento/${eventId}`,
            metadata: { 
                type: 'TICKET_SALE', 
                orderId: order.id,
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
            success_url: `${process.env.CLIENT_URL}/dashboard`,
            cancel_url: `${process.env.CLIENT_URL}/dashboard`,
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

        let participantsData = [];
        try {
            participantsData = JSON.parse(session.metadata.participantsPreview || '[]');
        } catch (e) {}

        if (type === 'TICKET_SALE') {
            try {
                const updatedOrder = await prisma.order.update({
                    where: { id: orderId },
                    data: { status: 'paid', paymentIntentId: session.payment_intent },
                    include: { items: true }
                });

                for (const item of updatedOrder.items) {
                    await prisma.ticketType.update({
                        where: { id: item.ticketTypeId },
                        data: { sold: { increment: item.quantity } }
                    });

                    for (let i = 0; i < item.quantity; i++) {
                        const pData = participantsData.find(p => p.ticketTypeId === item.ticketTypeId);
                        
                        await prisma.ticket.create({
                            data: {
                                ticketTypeId: item.ticketTypeId,
                                eventId: updatedOrder.eventId,
                                userId: updatedOrder.userId,
                                // CORREÇÃO: Adicionada conexão com Order aqui também
                                order: { connect: { id: updatedOrder.id } },
                                qrCodeData: `${orderId}-${item.id}-${i}-${Date.now()}`,
                                price: item.unitPrice,
                                status: 'valid',
                                participantData: pData ? pData.data : {} 
                            }
                        });
                    }
                }
                
                await generateAndSendTickets(updatedOrder, stripeEmail, stripeName);
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
    res.json({ received: true });
};

module.exports = { 
    createCheckoutSession, 
    createHighlightCheckoutSession, 
    handleStripeWebhook, 
    validateCoupon 
};