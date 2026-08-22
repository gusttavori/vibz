const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.createArtist = async (req, res) => {
    try {
        const { name, genre, imageUrl } = req.body;
        if (!name) return res.status(400).json({ message: "O nome do artista é obrigatório." });

        const artist = await prisma.artist.create({
            data: { name, genre, imageUrl }
        });
        res.status(201).json(artist);
    } catch (error) {
        res.status(500).json({ message: "Erro ao criar artista.", error: error.message });
    }
};

exports.getAllArtists = async (req, res) => {
    try {
        const artists = await prisma.artist.findMany({
            orderBy: { name: 'asc' }
        });
        res.status(200).json(artists);
    } catch (error) {
        res.status(500).json({ message: "Erro ao buscar artistas.", error: error.message });
    }
};

exports.updateArtist = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, genre, imageUrl } = req.body;
        
        const artist = await prisma.artist.update({
            where: { id },
            data: { name, genre, imageUrl }
        });
        res.status(200).json(artist);
    } catch (error) {
        res.status(500).json({ message: "Erro ao atualizar artista.", error: error.message });
    }
};

exports.deleteArtist = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.artist.delete({ where: { id } });
        res.status(200).json({ message: "Artista removido com sucesso." });
    } catch (error) {
        res.status(500).json({ message: "Erro ao remover artista.", error: error.message });
    }
};