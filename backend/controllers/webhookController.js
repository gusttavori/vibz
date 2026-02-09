const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Event = require('../models/Event');
const User = require('../models/User');

// Esta função precisa ser exportada e configurada no server.js de um jeito especial (Raw Body)
const handleStripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        // Valida se a chamada veio mesmo do Stripe
        event = stripe.webhooks.constructEvent(
            req.body, // O corpo precisa estar em formato RAW (Buffer), não JSON
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Lida com o evento de "Pagamento Concluído"
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const metadata = session.metadata;

        // 1. SE FOR PAGAMENTO DE DESTAQUE
        if (metadata && metadata.type === 'HIGHLIGHT_FEE') {
            console.log(`💰 Pagamento de destaque recebido para o evento: ${metadata.eventId}`);
            
            try {
                // Atualiza o evento automaticamente!
                await Event.findByIdAndUpdate(metadata.eventId, {
                    highlightStatus: 'approved', // Aprova o destaque
                    isFeaturedRequested: false, // Remove da lista de pendentes
                    isFeatured: true // Marca flag de destaque
                });
                console.log('✅ Evento destacado automaticamente!');
            } catch (err) {
                console.error('Erro ao atualizar evento via webhook:', err);
            }
        }

        // 2. SE FOR VENDA DE INGRESSO (Opcional, para salvar o pedido no banco)
        // if (metadata && metadata.tickets) { ... lógica de salvar ingresso ... }
    }

    res.json({ received: true });
};

module.exports = { handleStripeWebhook };