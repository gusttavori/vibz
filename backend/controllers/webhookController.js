const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');
const { generateAndSendTickets } = require('./ticketController');
const { sendNewSaleEmail } = require('../services/emailService');

const handleStripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        const payload = req.rawBody || req.body;
        event = stripe.webhooks.constructEvent(payload, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error(`❌ Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const metadata = session.metadata;
        const stripeEmail = session.customer_details?.email;
        const stripeName = session.customer_details?.name;

        console.log(`🔔 Webhook recebido. Tipo: ${metadata?.type}`);

        // --- 1. ATIVAÇÃO DE DESTAQUE ---
        if (metadata && metadata.type === 'EVENT_HIGHLIGHT') {
            try {
                await prisma.event.update({
                    where: { id: metadata.eventId },
                    data: { 
                        highlightStatus: 'paid',
                        isFeaturedRequested: false, 
                        isFeatured: true, 
                        highlightPaymentLink: null 
                    }
                });
                console.log('✅ Evento destacado com sucesso!');
            } catch (err) { console.error('Erro ao destacar:', err); }
        }

        // --- 2. VENDA DE INGRESSO (COMPRA CONFIRMADA) ---
        if (metadata && metadata.type === 'TICKET_SALE') {
            try {
                // 🛡️ IDEMPOTÊNCIA: Verifica se o pedido já não foi processado antes
                const existingOrder = await prisma.order.findUnique({ 
                    where: { id: metadata.orderId },
                    include: { items: true, event: true } 
                });
                
                if (!existingOrder) return res.status(404).json({ error: 'Pedido não encontrado' });
                
                if (existingOrder.status === 'paid' || existingOrder.status === 'refunded') {
                    console.log('⚠️ Pedido já processado anteriormente. Ignorando evento duplicado.');
                    return res.json({ received: true });
                }

                // 🗄️ TRANSAÇÃO ATÔMICA: Tudo ou Nada
                await prisma.$transaction(async (tx) => {
                    
                    // 1. Marca o pedido como Pago
                    await tx.order.update({
                        where: { id: existingOrder.id },
                        data: { status: 'paid', paymentIntentId: session.payment_intent }
                    });

                    // 2. Destrói as Reservas de Estoque Temporárias
                    let reservationIds = [];
                    try { reservationIds = JSON.parse(metadata.reservationIds || '[]'); } catch (e) {}
                    if (reservationIds.length > 0) {
                        await tx.ticketReservation.deleteMany({
                            where: { id: { in: reservationIds } }
                        });
                    }

                    // 3. Incrementa Estoque e Gera os Ingressos
                    let participantsData = [];
                    try { participantsData = JSON.parse(metadata.participantsPreview || '[]'); } catch (e) {}

                    for (const item of existingOrder.items) {
                        await tx.ticketType.update({
                            where: { id: item.ticketTypeId },
                            data: { sold: { increment: item.quantity } }
                        });

                        for (let i = 0; i < item.quantity; i++) {
                            const cleanQrCode = crypto.randomUUID();
                            const pData = participantsData.find(p => p.ticketTypeId === item.ticketTypeId);
                            
                            await tx.ticket.create({
                                data: {
                                    status: 'VALID',
                                    qrCodeData: cleanQrCode,
                                    price: item.unitPrice,
                                    userId: existingOrder.userId,
                                    eventId: existingOrder.eventId,
                                    ticketTypeId: item.ticketTypeId,
                                    orderId: existingOrder.id,
                                    participantData: pData ? pData.data : {}
                                }
                            });
                        }
                    }

                    // 4. LIVRO-RAZÃO: Credita o valor puro do ingresso na conta do Organizador
                    await tx.financialLedger.create({
                        data: {
                            organizerId: existingOrder.event.organizerId,
                            eventId: existingOrder.eventId,
                            orderId: existingOrder.id,
                            type: 'SALE',
                            amount: existingOrder.subtotal, // Organizador ganha o Subtotal em centavos
                            description: `Venda (Pedido: ${existingOrder.id})`
                        }
                    });

                    // 5. CUPOM: Registra o uso único para aquele usuário
                    if (existingOrder.couponId) {
                        const usageExists = await tx.couponUsage.findFirst({
                            where: { userId: existingOrder.userId, couponId: existingOrder.couponId }
                        });
                        
                        if (!usageExists) {
                            await tx.couponUsage.create({
                                data: { userId: existingOrder.userId, couponId: existingOrder.couponId, orderId: existingOrder.id }
                            });
                            await tx.coupon.update({
                                where: { id: existingOrder.couponId },
                                data: { usedCount: { increment: 1 } }
                            });
                        }
                    }
                });

                console.log("🎟️ Ingressos gerados, estoque consolidado e Livro-Razão atualizado.");

                // 📧 E-mails executados fora da transação do banco (segurança de performance)
                const user = await prisma.user.findUnique({ where: { id: existingOrder.userId } });
                if (user) {
                    await generateAndSendTickets(existingOrder, stripeEmail || user.email, stripeName || user.name).catch(console.error);
                }

                if (existingOrder.event && existingOrder.event.organizer) {
                    const totalTickets = existingOrder.items.reduce((acc, item) => acc + item.quantity, 0);
                    // Avisa o organizador convertendo os centavos de volta pra R$ só no email
                    const organizadorGanhoReal = existingOrder.subtotal / 100;
                    await sendNewSaleEmail(existingOrder.event.organizer.email, existingOrder.event.organizer.name, existingOrder.event.title, totalTickets, organizadorGanhoReal).catch(() => {});
                }

            } catch (err) {
                console.error("❌ Erro crítico webhook venda:", err);
            }
        }
    }

    // --- 3. ATUALIZAÇÃO DA CONTA STRIPE CONNECT ---
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

module.exports = { handleStripeWebhook };