const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const { z } = require('zod'); // <-- Importação do Zod

// ==========================================
// 🛡️ ESQUEMA DE VALIDAÇÃO ZOD PARA ADMIN E FINANÇAS
// ==========================================
const couponSchema = z.object({
    code: z.string().min(3, "O código deve ter pelo menos 3 caracteres.").max(20),
    discountType: z.enum(['percentage_fee', 'fixed']),
    value: z.number().positive("O valor deve ser positivo."),
    partner: z.string().min(2, "Nome do parceiro obrigatório.")
});

const settingsSchema = z.object({
    platformFee: z.number().min(0, "A taxa não pode ser negativa.").max(1, "A taxa percentual não pode ser maior que 1 (100%)."),
    premiumPrice: z.number().min(0, "O preço Premium não pode ser negativo."),
    standardPrice: z.number().min(0, "O preço Standard não pode ser negativo.")
});
// ==========================================

const loginAdmin = async (req, res) => {
    try {
        const { adminCode } = req.body;
        const correctAdminCode = process.env.ADMIN_CODE;

        if (!adminCode) {
            return res.status(400).json({ message: 'O código do administrador é obrigatório.' });
        }

        if (adminCode === correctAdminCode) {
            const payload = {
                admin: { id: 'admin_user_id' }
            };

            jwt.sign(
                payload,
                process.env.JWT_SECRET,
                { expiresIn: '8h' },
                (err, token) => {
                    if (err) throw err;
                    res.status(200).json({
                        message: 'Login bem-sucedido!',
                        token: token
                    });
                }
            );
        } else {
            res.status(401).json({ message: 'Código do administrador inválido.' });
        }
    } catch (error) {
        console.error('Erro no login do admin:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

const getAdminStats = async (req, res) => {
    try {
        const totalUsers = await prisma.user.count();
        const pendingEvents = await prisma.event.count({ where: { status: 'pending' } });
        const pendingHighlights = await prisma.event.count({ where: { highlightStatus: 'pending' } });

        const financials = await prisma.order.aggregate({
            where: { status: 'paid' },
            _sum: {
                platformFee: true
            }
        });

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentOrders = await prisma.order.findMany({
            where: {
                status: 'paid',
                createdAt: { gte: sevenDaysAgo }
            },
            select: { createdAt: true, platformFee: true }
        });

        res.json({
            users: totalUsers,
            pendingEvents,
            pendingHighlights,
            revenue: financials._sum.platformFee || 0,
            chartData: recentOrders
        });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar estatísticas.' });
    }
};

const getEventsList = async (req, res) => {
    try {
        const { status, highlightStatus } = req.query;
        let where = {};

        if (status) where.status = status;
        if (highlightStatus) where.highlightStatus = highlightStatus;

        const events = await prisma.event.findMany({
            where,
            include: { organizer: { select: { name: true, email: true } } },
            orderBy: { createdAt: 'desc' }
        });

        res.json(events);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao listar eventos.' });
    }
};

const updateEventStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const event = await prisma.event.update({
            where: { id },
            data: { status }
        });

        res.json(event);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar status do evento.' });
    }
};

// --- APROVAÇÃO COM COBRANÇA ---
const updateHighlightStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { highlightStatus } = req.body;

        const event = await prisma.event.findUnique({ where: { id } });
        if (!event) return res.status(404).json({ message: "Evento não encontrado" });

        // REJEIÇÃO
        if (highlightStatus === 'rejected') {
            const updated = await prisma.event.update({
                where: { id },
                data: {
                    highlightStatus: 'rejected',
                    isFeaturedRequested: false,
                    isFeatured: false
                }
            });
            return res.json({ message: "Destaque rejeitado.", event: updated });
        }

        // APROVAÇÃO -> GERA COBRANÇA
        if (highlightStatus === 'approved') {
            const config = await prisma.systemConfig.findFirst();

            const standardDailyRate = config?.standardPrice || 2.00;
            const premiumFixedPrice = config?.premiumPrice || 100.00;

            let finalPrice = 0;
            let description = '';

            if (event.highlightTier === 'PREMIUM') {
                finalPrice = premiumFixedPrice;
                description = `Destaque Premium (Fixo até a data do evento) - ${event.title}`;
            } else {
                const days = event.highlightDuration || 7; 
                finalPrice = days * standardDailyRate;
                description = `Destaque Standard (${days} diárias a R$ ${standardDailyRate.toFixed(2)}/dia) - ${event.title}`;
            }

            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card', 'boleto'],
                line_items: [{
                    price_data: {
                        currency: 'brl',
                        product_data: {
                            name: `Destaque ${event.highlightTier || 'Standard'} - Vibz`,
                            description: description,
                        },
                        unit_amount: Math.round(finalPrice * 100), 
                    },
                    quantity: 1,
                }],
                mode: 'payment',
                success_url: `${process.env.FRONTEND_URL}/dashboard/meus-eventos?success=highlight&eventId=${event.id}`,
                cancel_url: `${process.env.FRONTEND_URL}/dashboard/meus-eventos?canceled=true`,
                metadata: {
                    type: 'EVENT_HIGHLIGHT', 
                    eventId: event.id,
                    tier: event.highlightTier,
                    duration: event.highlightDuration || 7 
                }
            });

            const updated = await prisma.event.update({
                where: { id },
                data: {
                    highlightStatus: 'approved_waiting_payment',
                    highlightPaymentLink: session.url,
                    highlightFee: finalPrice
                }
            });

            return res.json({
                message: "Aprovado! Link de pagamento gerado.",
                event: updated,
                paymentLink: session.url
            });
        }

    } catch (error) {
        console.error("Erro ao atualizar destaque:", error);
        res.status(500).json({ message: 'Erro ao atualizar destaque.' });
    }
};

const getSystemSettings = async (req, res) => {
    try {
        let config = await prisma.systemConfig.findFirst();
        if (!config) {
            config = await prisma.systemConfig.create({ data: {} });
        }
        res.json(config);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar configurações.' });
    }
};

const updateSystemSettings = async (req, res) => {
    try {
        const { platformFee, premiumPrice, standardPrice } = req.body;

        // 🛡️ Validação Zod
        const validation = settingsSchema.safeParse({
            platformFee: parseFloat(platformFee),
            premiumPrice: parseFloat(premiumPrice),
            standardPrice: parseFloat(standardPrice)
        });

        if (!validation.success) {
            return res.status(400).json({ message: validation.error.errors[0].message });
        }

        const config = await prisma.systemConfig.findFirst();

        const updated = await prisma.systemConfig.update({
            where: { id: config.id },
            data: validation.data
        });

        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao salvar configurações.' });
    }
};

// --- NOVAS FUNÇÕES PARA GERENCIAMENTO GERAL ---
const getAllEventsAdmin = async (req, res) => {
    try {
        const events = await prisma.event.findMany({
            include: {
                organizer: { select: { name: true, email: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(events);
    } catch (error) {
        console.error("Erro ao buscar todos os eventos (Admin):", error);
        res.status(500).json({ message: "Erro ao buscar eventos." });
    }
};

const deleteEventAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        const ticketsSold = await prisma.ticket.count({
            where: { eventId: id }
        });

        if (ticketsSold > 0) {
            await prisma.event.update({
                where: { id },
                data: { status: 'archived' }
            });
            return res.status(200).json({ message: "Evento arquivado com sucesso (possui vendas)." });
        } else {
            await prisma.ticketType.deleteMany({ where: { eventId: id } });
            await prisma.event.delete({ where: { id } });

            return res.status(200).json({ message: "Evento excluído permanentemente." });
        }
    } catch (error) {
        console.error("Erro ao excluir evento (Admin):", error);
        res.status(500).json({ message: "Erro interno ao excluir evento." });
    }
};

// --- CUPONS ---

const listCoupons = async (req, res) => {
    try {
        const coupons = await prisma.coupon.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(coupons);
    } catch (error) {
        console.error("Erro coupons:", error);
        res.status(500).json({ message: "Erro ao listar cupons." });
    }
};

const createCoupon = async (req, res) => {
    try {
        const { code, discountType, value, partner, maxUses, expiresAt } = req.body;

        // 🛡️ Validação Zod rigorosa contra fraudes e ataques SQL injection
        const validation = couponSchema.safeParse({
            code: code?.toUpperCase(),
            discountType,
            value: parseFloat(value),
            partner
        });

        if (!validation.success) {
            return res.status(400).json({ message: validation.error.errors[0].message });
        }

        const existing = await prisma.coupon.findUnique({ where: { code: validation.data.code } });
        if (existing) {
            return res.status(400).json({ message: "Código de cupom já existe." });
        }

        const coupon = await prisma.coupon.create({
            data: {
                ...validation.data,
                maxUses: maxUses ? parseInt(maxUses) : null,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
            }
        });

        res.status(201).json(coupon);
    } catch (error) {
        console.error("Erro create coupon:", error);
        res.status(500).json({ message: "Erro ao criar cupom." });
    }
};

const deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.coupon.delete({ where: { id } });
        res.json({ message: "Cupom excluído." });
    } catch (error) {
        res.status(500).json({ message: "Erro ao excluir cupom." });
    }
};

module.exports = {
    loginAdmin,
    getAdminStats,
    getEventsList,
    updateEventStatus,
    updateHighlightStatus,
    getSystemSettings,
    updateSystemSettings,
    getAllEventsAdmin,
    deleteEventAdmin,
    listCoupons,
    createCoupon,
    deleteCoupon
};