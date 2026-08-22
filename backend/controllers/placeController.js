const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.createPlace = async (req, res) => {
    try {
        const { name, address, imageUrl } = req.body;
        if (!name) return res.status(400).json({ message: "O nome do lugar é obrigatório." });

        const place = await prisma.place.create({
            data: { name, address, imageUrl }
        });
        res.status(201).json(place);
    } catch (error) {
        res.status(500).json({ message: "Erro ao criar lugar.", error: error.message });
    }
};

exports.getAllPlaces = async (req, res) => {
    try {
        const places = await prisma.place.findMany({
            orderBy: { name: 'asc' }
        });
        res.status(200).json(places);
    } catch (error) {
        res.status(500).json({ message: "Erro ao buscar lugares.", error: error.message });
    }
};

exports.updatePlace = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address, imageUrl } = req.body;

        const place = await prisma.place.update({
            where: { id },
            data: { name, address, imageUrl }
        });
        res.status(200).json(place);
    } catch (error) {
        res.status(500).json({ message: "Erro ao atualizar lugar.", error: error.message });
    }
};

exports.deletePlace = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.place.delete({ where: { id } });
        res.status(200).json({ message: "Lugar removido com sucesso." });
    } catch (error) {
        res.status(500).json({ message: "Erro ao remover lugar.", error: error.message });
    }
};