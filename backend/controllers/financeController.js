const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// =======================================================
// 💸 REEMBOLSO PARCIAL (Por Ingresso)
// =======================================================
const refundTicket = async (req, res) => {
    try {
        const userId = req.user.id;
        const { ticketId } = req.body;

        if (!ticketId) return res.status(400).json({ message: 'ID do ingresso não fornecido.' });

        // 1. Busca o ingresso, o pedido e o evento
        const ticket = await prisma.ticket.findUnique({
            where: { id: ticketId },
            include: {
                order: true,
                event: true
            }
        });

        if (!ticket) return res.status(404).json({ message: 'Ingresso não encontrado.' });
        if (ticket.userId !== userId) return res.status(403).json({ message: 'Não autorizado.' });
        if (ticket.status !== 'VALID') return res.status(400).json({ message: 'Este ingresso não é elegível para reembolso.' });

        // 2. Trava de 24 horas antes do evento
        const eventDate = new Date(ticket.event.eventDate);
        const hoursDifference = (eventDate - new Date()) / (1000 * 60 * 60);

        if (hoursDifference < 24) {
            return res.status(400).json({ message: 'O prazo para reembolso (24h antes do evento) expirou.' });
        }

        // 3. Tratamento para ingresso gratuito (Sem Stripe)
        if (ticket.price === 0 || ticket.order.totalAmount === 0) {
            await prisma.ticket.update({
                where: { id: ticketId },
                data: { status: 'REFUNDED' }
            });
            return res.json({ message: 'Ingresso gratuito cancelado com sucesso.' });
        }

        // 4. Efetua o reembolso parcial na Stripe
        // O valor devolvido é EXATAMENTE o ticket.price (A taxa Vibz não é devolvida)
        const refundAmount = ticket.price; 

        await stripe.refunds.create({
            payment_intent: ticket.order.paymentIntentId,
            amount: refundAmount,
            reason: 'requested_by_customer'
        });

        // 5. Transação Atômica: Atualiza o status e debita o organizador no Livro-Razão
        await prisma.$transaction(async (tx) => {
            await tx.ticket.update({
                where: { id: ticketId },
                data: { status: 'REFUNDED' }
            });

            await tx.financialLedger.create({
                data: {
                    organizerId: ticket.event.organizerId,
                    eventId: ticket.event.id,
                    orderId: ticket.orderId,
                    type: 'REFUND',
                    amount: -refundAmount, // Valor negativo (tira do saldo do organizador)
                    description: `Reembolso de ingresso (Ticket: ${ticket.id})`
                }
            });
        });

        return res.json({ message: 'Reembolso processado com sucesso. O valor retornará na fatura do cartão ou Pix.' });

    } catch (error) {
        console.error('Erro no reembolso:', error);
        res.status(500).json({ message: 'Erro interno ao processar reembolso.', error: error.message });
    }
};

// =======================================================
// 🏦 REPASSE (PAYOUT) AO ORGANIZADOR PÓS-EVENTO
// =======================================================
const processEventPayout = async (req, res) => {
    try {
        // Rota protegida: Geralmente acionada por um Admin do Vibz ou um CronJob automatizado
        const { eventId } = req.body;

        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: { organizer: true }
        });

        if (!event) return res.status(404).json({ message: 'Evento não encontrado.' });
        if (!event.organizer.stripeAccountId) {
            return res.status(400).json({ message: 'O organizador não possui uma conta Stripe conectada.' });
        }

        // 1. Soma todo o Livro-Razão do evento (Vendas - Reembolsos - Chargebacks)
        const ledgerSum = await prisma.financialLedger.aggregate({
            _sum: { amount: true },
            where: { eventId: eventId }
        });

        const balanceToPayout = ledgerSum._sum.amount || 0;

        // Se o saldo for 0 ou negativo, não há o que transferir
        if (balanceToPayout <= 0) {
            return res.status(400).json({ message: 'Não há saldo positivo para repasse neste evento. (Saldo atual: R$ ' + (balanceToPayout/100) + ')' });
        }

        // 2. Faz a transferência do saldo líquido para a conta conectada do organizador
        const transfer = await stripe.transfers.create({
            amount: balanceToPayout,
            currency: 'brl',
            destination: event.organizer.stripeAccountId,
            transfer_group: eventId,
            description: `Repasse final do evento: ${event.title}`
        });

        // 3. Registra o repasse no Livro-Razão para "zerar" a dívida do Vibz com o organizador
        await prisma.financialLedger.create({
            data: {
                organizerId: event.organizer.id,
                eventId: event.id,
                type: 'PAYOUT',
                amount: -balanceToPayout, // Lançamento negativo zera o saldo contábil
                description: `Repasse realizado (Transfer ID: ${transfer.id})`
            }
        });

        return res.json({ 
            message: 'Repasse realizado com sucesso!', 
            transferId: transfer.id, 
            amountPaid: balanceToPayout 
        });

    } catch (error) {
        console.error('Erro no repasse:', error);
        res.status(500).json({ message: 'Erro interno ao processar repasse.', error: error.message });
    }
};

module.exports = {
    refundTicket,
    processEventPayout
};