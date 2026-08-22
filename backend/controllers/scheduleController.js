const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.createSchedule = async (req, res) => {
    try {
        const { artistId, placeId, date, time, title } = req.body; // <-- Adicionado title
        
        if (!artistId || !placeId || !date) {
            return res.status(400).json({ message: "Artista, Lugar e Data são obrigatórios." });
        }

        const finalTime = time && time.trim() !== '' ? time : "A definir";

        const existingSchedule = await prisma.schedule.findFirst({
            where: { artistId, placeId, date, time: finalTime }
        });

        if (existingSchedule) {
            return res.status(400).json({ message: "Esta programação já está cadastrada no sistema." });
        }

        const schedule = await prisma.schedule.create({
            data: { artistId, placeId, date, time: finalTime, title } 
        });
        
        res.status(201).json(schedule);
    } catch (error) {
        res.status(500).json({ message: "Erro ao criar programação.", error: error.message });
    }
};

exports.getAllSchedules = async (req, res) => {
    try {
        const { date, placeId, artistId } = req.query;
        
        // Filtros dinâmicos para o frontend
        const filters = {};
        if (date) filters.date = date;
        if (placeId) filters.placeId = placeId;
        if (artistId) filters.artistId = artistId;

        const schedules = await prisma.schedule.findMany({
            where: filters,
            include: {
                artist: true,
                place: true
            },
            orderBy: [
                { date: 'asc' },
                { time: 'asc' }
            ]
        });
        res.status(200).json(schedules);
    } catch (error) {
        res.status(500).json({ message: "Erro ao buscar programações.", error: error.message });
    }
};

exports.updateSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        const { artistId, placeId, date, time } = req.body;

        const schedule = await prisma.schedule.update({
            where: { id },
            data: { artistId, placeId, date, time }
        });
        res.status(200).json(schedule);
    } catch (error) {
        res.status(500).json({ message: "Erro ao atualizar programação.", error: error.message });
    }
};

exports.deleteSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.schedule.delete({ where: { id } });
        res.status(200).json({ message: "Programação cancelada/removida com sucesso." });
    } catch (error) {
        res.status(500).json({ message: "Erro ao remover programação.", error: error.message });
    }
};