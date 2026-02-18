const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

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

// --- APROVAÇÃO COM COBRANÇA (ATUALIZADO) ---
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
            // 1. Pega preço atual do banco
            const config = await prisma.systemConfig.findFirst();
            
            // Standard agora é diária (R$ 2.00 por padrão), Premium é fixo (R$ 100.00)
            const standardDailyRate = config?.standardPrice || 2.00;
            const premiumFixedPrice = config?.premiumPrice || 100.00;
            
            let finalPrice = 0;
            let description = '';

            if (event.highlightTier === 'PREMIUM') {
                finalPrice = premiumFixedPrice;
                description = `Destaque Premium (Fixo até a data do evento) - ${event.title}`;
            } else {
                // STANDARD: Calcula preço por dia
                const days = event.highlightDuration || 7; // Padrão 7 dias se não estiver definido
                finalPrice = days * standardDailyRate;
                description = `Destaque Standard (${days} diárias a R$ ${standardDailyRate.toFixed(2)}/dia) - ${event.title}`;
            }

            // 2. Cria sessão na Stripe
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card', 'boleto'],
                line_items: [{
                    price_data: {
                        currency: 'brl',
                        product_data: {
                            name: `Destaque ${event.highlightTier || 'Standard'} - Vibz`,
                            description: description,
                        },
                        unit_amount: Math.round(finalPrice * 100), // Em centavos
                    },
                    quantity: 1,
                }],
                mode: 'payment',
                success_url: `${process.env.FRONTEND_URL}/dashboard/meus-eventos?success=highlight&eventId=${event.id}`,
                cancel_url: `${process.env.FRONTEND_URL}/dashboard/meus-eventos?canceled=true`,
                metadata: {
                    type: 'EVENT_HIGHLIGHT', // Importante para o Webhook identificar
                    eventId: event.id,
                    tier: event.highlightTier,
                    duration: event.highlightDuration || 7 // Passa duração para o webhook calcular validade
                }
            });

            // 3. Atualiza evento com link e status de espera
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
        
        const config = await prisma.systemConfig.findFirst();
        
        const updated = await prisma.systemConfig.update({
            where: { id: config.id },
            data: { 
                platformFee: parseFloat(platformFee),
                premiumPrice: parseFloat(premiumPrice),
                standardPrice: parseFloat(standardPrice)
            }
        });

        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao salvar configurações.' });
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

        if (!code || !value || !partner) {
            return res.status(400).json({ message: "Preencha os campos obrigatórios." });
        }

        const existing = await prisma.coupon.findUnique({ where: { code } });
        if (existing) {
            return res.status(400).json({ message: "Código de cupom já existe." });
        }

        const coupon = await prisma.coupon.create({
            data: {
                code: code.toUpperCase(),
                discountType,
                discountValue: parseFloat(value),
                partner,
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
    listCoupons,
    createCoupon,
    deleteCoupon
};