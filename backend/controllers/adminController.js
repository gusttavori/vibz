const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

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

const updateHighlightStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { highlightStatus } = req.body;

        const isFeatured = highlightStatus === 'approved';

        const event = await prisma.event.update({
            where: { id },
            data: { 
                highlightStatus,
                isFeatured,
                isFeaturedRequested: false
            }
        });

        res.json(event);
    } catch (error) {
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

module.exports = {
    loginAdmin,
    getAdminStats,
    getEventsList,
    updateEventStatus,
    updateHighlightStatus,
    getSystemSettings,
    updateSystemSettings
};