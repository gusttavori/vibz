const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getPublicConfig = async (req, res) => {
    try {
        let config = await prisma.systemConfig.findFirst({
            select: {
                premiumPrice: true,
                standardPrice: true
            }
        });

        if (!config) {
            config = { premiumPrice: 100.00, standardPrice: 50.00 };
        }

        res.json(config);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar configurações.' });
    }
};

module.exports = { getPublicConfig };