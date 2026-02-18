const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Rota para buscar preços (Pública)
router.get('/prices', async (req, res) => {
    try {
        let config = await prisma.systemConfig.findFirst({
            select: {
                premiumPrice: true,
                standardPrice: true
            }
        });

        // Valores padrão caso o banco esteja vazio
        if (!config) {
            config = { premiumPrice: 100.00, standardPrice: 2.00 };
        }

        res.json(config);
    } catch (error) {
        console.error("Erro ao buscar configs:", error);
        res.status(500).json({ message: 'Erro interno.' });
    }
});

module.exports = router;