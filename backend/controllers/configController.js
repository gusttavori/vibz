const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getPublicConfig = async (req, res) => {
    try {
        // Busca a primeira configuração encontrada no sistema
        let config = await prisma.systemConfig.findFirst({
            select: {
                premiumPrice: true,
                standardPrice: true,
                platformFee: true,
                minFee: true
            }
        });

        // Se ainda não houve configuração salva pelo admin, usa os padrões
        if (!config) {
            config = { 
                premiumPrice: 100.00, 
                standardPrice: 2.00, // Valor da diária padrão
                platformFee: 0.08,
                minFee: 2.00
            };
        }

        res.json(config);
    } catch (error) {
        console.error("Erro ao buscar configurações:", error);
        res.status(500).json({ message: 'Erro ao buscar configurações.' });
    }
};

module.exports = { 
    getPublicConfig 
};