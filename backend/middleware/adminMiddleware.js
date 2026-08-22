const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const adminMiddleware = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        
        if (user && user.role === 'admin') {
            next();
        } else {
            res.status(403).json({ message: 'Acesso negado. Apenas administradores.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Erro no servidor.' });
    }
};

module.exports = adminMiddleware;