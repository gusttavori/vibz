const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const cloudinary = require('../config/cloudinary');

const getLoggedInUserProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Busca o usuário logado e INCLUI os eventos favoritados
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { 
                favoritedEvents: true // Essencial para listar favoritos no perfil
            } 
        });
        
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        const { password, ...userWithoutPassword } = user;

        // Busca eventos organizados pelo usuário
        const myEvents = await prisma.event.findMany({
            where: { organizerId: userId }
        });
        
        // Retorna o objeto completo para o frontend
        res.status(200).json({ 
            user: userWithoutPassword, 
            myEvents, 
            // Garante que a lista de favoritos seja enviada explicitamente
            favoritedEvents: user.favoritedEvents || [] 
        });

    } catch (error) {
        console.error("Erro ao buscar perfil:", error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

const getPublicUserProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, profilePicture: true, coverPicture: true, createdAt: true, bio: true }
        });
        
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        const userEvents = await prisma.event.findMany({
            where: { organizerId: userId, status: 'approved' }
        });
        
        res.status(200).json({ user, userEvents });

    } catch (error) {
        res.status(500).json({ message: 'Erro interno do servidor.' });
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
            const cloudinaryResponse = await cloudinary.uploader.upload(dataURI, { folder: 'vibz_profiles' });
            updateData.profilePicture = cloudinaryResponse.secure_url;
        }

        if (req.files && req.files.coverPicture) {
            const b64 = Buffer.from(req.files.coverPicture[0].buffer).toString("base64");
            const dataURI = "data:" + req.files.coverPicture[0].mimetype + ";base64," + b64;
            const cloudinaryResponse = await cloudinary.uploader.upload(dataURI, { folder: 'vibz_covers' });
            updateData.coverPicture = cloudinaryResponse.secure_url;
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            include: { favoritedEvents: true } // Retorna atualizado com favoritos
        });
        
        const { password, ...userWithoutPassword } = updatedUser;

        res.status(200).json({ message: 'Perfil atualizado com sucesso!', user: userWithoutPassword });

    } catch (error) {
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

const getFavoritedEvents = async (req, res) => {
    try {
        const { id } = req.params;
        
        const user = await prisma.user.findUnique({
            where: { id },
            include: { favoritedEvents: true }
        });

        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        res.status(200).json(user.favoritedEvents || []);
        
    } catch (error) {
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

const toggleFavorite = async (req, res) => {
    try {
        const userId = req.user.id;
        const { eventId } = req.body;

        if (!eventId) {
            return res.status(400).json({ message: "ID do evento é obrigatório." });
        }

        // Verifica se já existe a relação
        const userCheck = await prisma.user.findUnique({
            where: { id: userId },
            include: { 
                favoritedEvents: { 
                    where: { id: eventId } 
                } 
            }
        });

        if (!userCheck) {
            return res.status(404).json({ message: "Usuário não encontrado." });
        }

        const isAlreadyFavorited = userCheck.favoritedEvents.length > 0;

        if (isAlreadyFavorited) {
            // Remove dos favoritos
            await prisma.user.update({
                where: { id: userId },
                data: {
                    favoritedEvents: {
                        disconnect: { id: eventId }
                    }
                }
            });
            return res.status(200).json({ message: "Evento removido dos favoritos.", isFavorited: false });
        } else {
            // Adiciona aos favoritos
            await prisma.user.update({
                where: { id: userId },
                data: {
                    favoritedEvents: {
                        connect: { id: eventId }
                    }
                }
            });
            return res.status(200).json({ message: "Evento adicionado aos favoritos.", isFavorited: true });
        }

    } catch (error) {
        console.error("Erro no toggleFavorite:", error);
        res.status(500).json({ message: 'Erro interno ao favoritar.', error: error.message });
    }
};

const getMyTickets = async (req, res) => {
    try {
        const tickets = await prisma.ticket.findMany({
            where: { 
                userId: req.user.id,
                status: 'valid'
            },
            include: {
                event: {
                    select: {
                        id: true,
                        title: true,
                        imageUrl: true,
                        eventDate: true,
                        location: true,
                        city: true
                    }
                },
                ticketType: {
                    select: {
                        name: true,
                        batchName: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(tickets);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar seus ingressos.' });
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