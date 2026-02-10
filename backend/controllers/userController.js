const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const cloudinary = require('../config/cloudinary');

const getLoggedInUserProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { favoritedEvents: true } 
        });
        
        if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });

        const { password, ...userWithoutPassword } = user;

        const myEvents = await prisma.event.findMany({
            where: { organizerId: userId }
        });
        
        res.status(200).json({ 
            user: userWithoutPassword, 
            myEvents, 
            favoritedEvents: user.favoritedEvents || [] 
        });

    } catch (error) {
        console.error("Erro perfil:", error);
        res.status(500).json({ message: 'Erro interno.' });
    }
};

const getPublicUserProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, profilePicture: true, coverPicture: true, createdAt: true, bio: true }
        });
        if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });

        const userEvents = await prisma.event.findMany({
            where: { organizerId: userId, status: 'approved' }
        });
        res.status(200).json({ user, userEvents });
    } catch (error) {
        res.status(500).json({ message: 'Erro interno.' });
    }
};

const editUserProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, bio } = req.body;
        const updateData = {};

        if (name) updateData.name = name;
        if (bio) updateData.bio = bio;

        if (req.files && req.files.profilePicture) {
            const b64 = Buffer.from(req.files.profilePicture[0].buffer).toString("base64");
            const dataURI = "data:" + req.files.profilePicture[0].mimetype + ";base64," + b64;
            const resCloud = await cloudinary.uploader.upload(dataURI, { folder: 'vibz_profiles' });
            updateData.profilePicture = resCloud.secure_url;
        }

        if (req.files && req.files.coverPicture) {
            const b64 = Buffer.from(req.files.coverPicture[0].buffer).toString("base64");
            const dataURI = "data:" + req.files.coverPicture[0].mimetype + ";base64," + b64;
            const resCloud = await cloudinary.uploader.upload(dataURI, { folder: 'vibz_covers' });
            updateData.coverPicture = resCloud.secure_url;
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            include: { favoritedEvents: true }
        });
        
        const { password, ...userWithoutPassword } = updatedUser;
        res.status(200).json({ message: 'Atualizado!', user: userWithoutPassword });

    } catch (error) {
        res.status(500).json({ message: 'Erro interno.' });
    }
};

const getFavoritedEvents = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({
            where: { id },
            include: { favoritedEvents: true }
        });
        if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });
        res.status(200).json(user.favoritedEvents || []);
    } catch (error) {
        res.status(500).json({ message: 'Erro interno.' });
    }
};

// --- TOGGLE FAVORITE BLINDADO ---
const toggleFavorite = async (req, res) => {
    try {
        const userId = req.user.id;
        const { eventId } = req.body;

        if (!eventId) return res.status(400).json({ message: "ID do evento obrigatório." });

        // 1. Verifica se o evento existe para evitar erro de chave estrangeira
        const eventExists = await prisma.event.findUnique({ where: { id: eventId } });
        if (!eventExists) return res.status(404).json({ message: "Evento não encontrado." });

        // 2. Verifica relação atual
        const userCheck = await prisma.user.findUnique({
            where: { id: userId },
            include: { 
                favoritedEvents: { where: { id: eventId } } 
            }
        });

        if (!userCheck) return res.status(404).json({ message: "Usuário não encontrado." });

        const isFavorited = userCheck.favoritedEvents.length > 0;

        if (isFavorited) {
            // REMOVER
            await prisma.user.update({
                where: { id: userId },
                data: { favoritedEvents: { disconnect: { id: eventId } } }
            });
            return res.status(200).json({ message: "Removido.", isFavorited: false });
        } else {
            // ADICIONAR
            await prisma.user.update({
                where: { id: userId },
                data: { favoritedEvents: { connect: { id: eventId } } }
            });
            return res.status(200).json({ message: "Adicionado.", isFavorited: true });
        }

    } catch (error) {
        console.error("Erro toggleFavorite:", error);
        res.status(500).json({ message: 'Erro ao favoritar.', error: error.message });
    }
};

const getMyTickets = async (req, res) => {
    try {
        const tickets = await prisma.ticket.findMany({
            where: { userId: req.user.id, status: 'valid' },
            include: {
                event: { select: { id: true, title: true, imageUrl: true, eventDate: true, location: true, city: true } },
                ticketType: { select: { name: true, batchName: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(tickets);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar ingressos.' });
    }
};

module.exports = {
    getLoggedInUserProfile,
    getPublicUserProfile,
    editUserProfile,
    getFavoritedEvents,
    toggleFavorite,
    getMyTickets
};