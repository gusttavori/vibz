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
                        highlightStatus: 'paid', // Status final
                        isFeaturedRequested: false, 
                        isFeatured: true, // AGORA SIM ESTÁ DESTACADO
                        highlightPaymentLink: null // Limpa o link
                    }
                });
                console.log('✅ Evento destacado com sucesso!');
            } catch (err) { console.error('Erro ao destacar:', err); }
        }

        // --- 2. VENDA DE INGRESSO ---
        if (metadata && metadata.type === 'TICKET_SALE') {
            try {
                const updatedOrder = await prisma.order.update({
                    where: { id: metadata.orderId },
                    data: { status: 'paid', paymentIntentId: session.payment_intent },
                    include: { items: true }
                });

                let participantsData = [];
                try { participantsData = JSON.parse(metadata.participantsPreview || '[]'); } catch (e) {}

                for (const item of updatedOrder.items) {
                    await prisma.ticketType.update({
                        where: { id: item.ticketTypeId },
                        data: { sold: { increment: item.quantity } }
                    });

                    for (let i = 0; i < item.quantity; i++) {
                        const cleanQrCode = crypto.randomUUID();
                        const pData = participantsData.find(p => p.ticketTypeId === item.ticketTypeId);
                        
                        await prisma.ticket.create({
                            data: {
                                status: 'valid',
                                qrCodeData: cleanQrCode,
                                price: item.unitPrice,
                                userId: updatedOrder.userId,
                                eventId: updatedOrder.eventId,
                                ticketTypeId: item.ticketTypeId,
                                orderId: updatedOrder.id,
                                participantData: pData ? pData.data : {}
                            }
                        });
                    }
                }

                console.log("🎟️ Ingressos gerados via Webhook.");

                const user = await prisma.user.findUnique({ where: { id: updatedOrder.userId } });
                if (user) {
                    await generateAndSendTickets(updatedOrder, stripeEmail || user.email, stripeName || user.name).catch(console.error);
                }

                const eventData = await prisma.event.findUnique({
                    where: { id: updatedOrder.eventId },
                    include: { organizer: true }
                });

                if (eventData && eventData.organizer) {
                    const totalTickets = updatedOrder.items.reduce((acc, item) => acc + item.quantity, 0);
                    const totalValue = Number(updatedOrder.totalAmount); 

                    await sendNewSaleEmail(
                        eventData.organizer.email,
                        eventData.organizer.name,
                        eventData.title,
                        totalTickets,
                        totalValue
                    );
                }

            } catch (err) {
                console.error("❌ Erro crítico webhook venda:", err);
            }
        }
    }

    res.json({ received: true });
};

module.exports = { handleStripeWebhook };