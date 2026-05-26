const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const cloudinary = require('../config/cloudinary');

const { 
    sendEventStatusEmail, 
    sendEventReceivedEmail, 
    sendAdminNotificationEmail 
} = require('../services/emailService');

// --- MAPPER PARA O FRONTEND (Agenda Cultural) ---
const mapEventToFrontend = (event) => {
    const safeDate = event.eventDate ? new Date(event.eventDate).toISOString() : new Date(event.createdAt).toISOString();
    
    let parsedSessions = [];
    if (event.sessions) {
        parsedSessions = typeof event.sessions === 'string' ? JSON.parse(event.sessions) : event.sessions;
    } else {
        parsedSessions = [{ date: safeDate, endDate: safeDate }];
    }

    let organizerNameFinal = "Curador Vibz";
    let organizerInstaFinal = "";

    if (event.organizerInfo) {
        try {
            const info = typeof event.organizerInfo === 'string' ? JSON.parse(event.organizerInfo) : event.organizerInfo;
            if (info.name && info.name.trim() !== "") organizerNameFinal = info.name;
            if (info.instagram) organizerInstaFinal = info.instagram;
        } catch (e) {
            console.error("Erro parse organizerInfo:", e);
        }
    }

    if (organizerNameFinal === "Curador Vibz" && event.organizer && event.organizer.name) {
        organizerNameFinal = event.organizer.name;
    }

    return {
        ...event,
        _id: event.id,
        classificacaoEtaria: event.ageRating || 'Livre',
        address: { street: event.location || '', city: event.city || '', number: 'S/N', state: 'BA' },
        sessions: parsedSessions,
        date: safeDate,
        tickets: [], // Mantido como array vazio para evitar erros no frontend antigo
        formSchema: event.formSchema ? (typeof event.formSchema === 'string' ? JSON.parse(event.formSchema) : event.formSchema) : [],
        organizer: { name: organizerNameFinal, instagram: organizerInstaFinal },
        organizerName: organizerNameFinal,
        organizerInstagram: organizerInstaFinal,
        isInformational: true, // Forçamos como informativo na Agenda
        highlightStatus: event.highlightStatus,
        highlightPaymentLink: event.highlightPaymentLink 
    };
};

// --- CRIAÇÃO E ATUALIZAÇÃO ---
const createEvent = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'Acesso negado. Usuário não autenticado.' });
        }

        const { 
            title, description, category, ageRating, date, sessions, 
            location, city, address, organizerInfo, 
            isFeaturedRequested, formSchema, externalUrl
        } = req.body;

        const userId = req.user.id;
        
        let finalOrganizerName = "Curador Vibz";
        let finalOrganizerInsta = "";

        if (organizerInfo) {
            try {
                let parsedOrganizerInfo = JSON.parse(organizerInfo);
                if (parsedOrganizerInfo.name) finalOrganizerName = parsedOrganizerInfo.name;
                if (parsedOrganizerInfo.instagram) finalOrganizerInsta = parsedOrganizerInfo.instagram;
            } catch (e) {
                console.error("Erro ao ler organizerInfo:", e);
            }
        }

        const isFeaturedBool = (isFeaturedRequested === 'true' || isFeaturedRequested === true);

        let parsedAddress = address ? JSON.parse(address) : {};
        let parsedSessions = sessions ? JSON.parse(sessions) : [];
        let parsedFormSchema = formSchema ? JSON.parse(formSchema) : [];

        let imageUrl = '';
        if (req.file) {
            const b64 = Buffer.from(req.file.buffer).toString("base64");
            const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
            const cloudinaryResponse = await cloudinary.uploader.upload(dataURI, { folder: 'vibz_events' });
            imageUrl = cloudinaryResponse.secure_url;
        } else {
            return res.status(400).json({ message: "A imagem do evento é obrigatória." });
        }
        
        let mainEventDate = date ? new Date(date) : (parsedSessions.length > 0 ? new Date(parsedSessions[0].date) : new Date());

        const event = await prisma.event.create({
            data: {
                title, description, imageUrl, city,
                location: location || parsedAddress.street,
                category: category ? category.trim() : "Geral",
                ageRating, status: 'approved', // Eventos criados pelo curador já nascem aprovados
                organizerId: userId, 
                isFeaturedRequested: isFeaturedBool,
                isFeatured: isFeaturedBool, // Como curador, se você marcar destaque, já ativa
                externalUrl: externalUrl || null,
                eventDate: mainEventDate,
                sessions: parsedSessions,
                organizerInfo: { name: finalOrganizerName, instagram: finalOrganizerInsta },
                formSchema: parsedFormSchema,
                isInformational: true
            }
        });

        res.status(201).json({ message: 'Evento publicado com sucesso.', event: mapEventToFrontend(event) });
    } catch (error) {
        console.error("Erro no createEvent:", error);
        if (!res.headersSent) res.status(500).json({ message: 'Erro interno ao criar evento.' });
    }
};

const updateEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const existingEvent = await prisma.event.findUnique({ where: { id } });

        if (!existingEvent) return res.status(404).json({ message: 'Evento não encontrado.' });
        if (existingEvent.organizerId !== userId && !req.user.isAdmin) return res.status(403).json({ message: 'Sem permissão.' });

        const { title, description, category, ageRating, location, city, sessions, organizerInfo, formSchema, externalUrl } = req.body;

        let imageUrl = existingEvent.imageUrl;
        if (req.file) {
            const b64 = Buffer.from(req.file.buffer).toString("base64");
            const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
            const cloudinaryResponse = await cloudinary.uploader.upload(dataURI, { folder: 'vibz_events' });
            imageUrl = cloudinaryResponse.secure_url;
        }

        const parsedSessions = typeof sessions === 'string' ? JSON.parse(sessions) : sessions;
        let mainEventDate = existingEvent.eventDate;
        if (parsedSessions && parsedSessions.length > 0) mainEventDate = new Date(parsedSessions[0].date);

        let parsedOrgInfo = existingEvent.organizerInfo;
        if (organizerInfo) {
            parsedOrgInfo = typeof organizerInfo === 'string' ? JSON.parse(organizerInfo) : organizerInfo;
        }

        const updatedEvent = await prisma.event.update({
            where: { id },
            data: {
                title, description, category: category ? category.trim() : existingEvent.category,
                ageRating, imageUrl, location, city,
                eventDate: mainEventDate, sessions: parsedSessions,
                organizerInfo: parsedOrgInfo,
                externalUrl: externalUrl || existingEvent.externalUrl,
                formSchema: typeof formSchema === 'string' ? JSON.parse(formSchema) : formSchema,
            }
        });

        res.json(mapEventToFrontend(updatedEvent));
    } catch (error) {
        console.error("Erro updateEvent:", error);
        res.status(500).json({ message: 'Erro ao atualizar evento.' });
    }
};

// --- BUSCAS DE EVENTOS (TOTALMENTE LIMPAS) ---
const getMyEvents = async (req, res) => {
    try {
        const events = await prisma.event.findMany({
            where: { organizerId: req.user.id },
            orderBy: { createdAt: 'desc' }
        });
        const formattedEvents = events.map(mapEventToFrontend);
        res.json({ myEvents: formattedEvents, metrics: { activeEvents: events.filter(e => e.status === 'approved').length } });
    } catch (error) {
        console.error("Erro getMyEvents:", error);
        res.status(500).json({ message: 'Erro ao buscar eventos do painel.' });
    }
};

const getEvents = async (req, res) => {
    try {
        const events = await prisma.event.findMany({
            where: { status: 'approved' },
            include: { organizer: { select: { name: true, id: true } } },
            orderBy: { eventDate: 'asc' }
        });
        res.status(200).json(events.map(mapEventToFrontend));
    } catch (error) { res.status(500).json({ message: 'Erro ao buscar eventos públicos.' }); }
};

const getEventById = async (req, res) => {
    try {
        const event = await prisma.event.findUnique({
            where: { id: req.params.id },
            include: { organizer: { select: { name: true, id: true } } }
        });
        if (!event) return res.status(404).json({ message: 'Evento não encontrado' });
        res.json(mapEventToFrontend(event));
    } catch (err) { res.status(500).json({ message: 'Erro no servidor' }); }
};

const getFeaturedEvents = async (req, res) => {
    try {
        const events = await prisma.event.findMany({ 
            where: { isFeatured: true, status: 'approved' },
            orderBy: { eventDate: 'asc' }
        });
        res.json(events.map(mapEventToFrontend));
    } catch (e) { res.status(500).json({ message: "Erro" }); }
};

const getEventsByCategory = async (req, res) => {
    try {
        let { categoryName } = req.params;
        const decoded = decodeURIComponent(categoryName);
        const events = await prisma.event.findMany({
            where: { 
                category: { contains: decoded, mode: 'insensitive' },
                status: 'approved' 
            },
            orderBy: { eventDate: 'asc' }
        });
        res.json(events.map(mapEventToFrontend));
    } catch (error) { res.status(500).json({ message: 'Erro ao buscar por categoria' }); }
};

const searchEvents = async (req, res) => {
    const { query, city } = req.query;
    if (!query && !city) return res.json([]);
    
    try {
        const decodedQuery = query ? decodeURIComponent(query) : "";
        const events = await prisma.event.findMany({
            where: { 
                status: 'approved',
                city: city ? { equals: city, mode: 'insensitive' } : undefined,
                OR: decodedQuery ? [
                    { title: { contains: decodedQuery, mode: 'insensitive' } },
                    { category: { contains: decodedQuery, mode: 'insensitive' } },
                    { location: { contains: decodedQuery, mode: 'insensitive' } }
                ] : undefined
            },
            orderBy: { eventDate: 'asc' }
        });
        res.json(events.map(mapEventToFrontend));
    } catch (err) {
        res.status(500).json([]);
    }
};

const getEventCities = async (req, res) => {
    const cities = await prisma.event.findMany({ where: { status: 'approved' }, select: { city: true }, distinct: ['city'] });
    res.json(cities.map(c => c.city));
};

// --- APROVAÇÕES MANUAIS (Para eventos de terceiros, se você decidir abrir no futuro) ---
const approveEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const event = await prisma.event.update({
            where: { id },
            data: { status: 'approved' }
        });
        res.json({ success: true, message: "Evento aprovado!" });
    } catch (error) { res.status(500).json({ message: "Erro interno." }); }
};

const rejectEvent = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.event.update({
            where: { id },
            data: { status: 'rejected' }
        });
        res.json({ success: true, message: "Evento ocultado." });
    } catch (error) { res.status(500).json({ message: "Erro ao ocultar evento." }); }
};

// --- FUNÇÕES "FANTASMAS" (Para manter a compatibilidade do Routes sem quebrar a API) ---
const getEventParticipants = async (req, res) => { res.json({ eventTitle: "Histórico", participants: [] }); };
const toggleTicketStatus = async (req, res) => { res.json({ success: true }); };
const toggleFavorite = async (req, res) => { res.status(200).json({ success: true }); };
const getPendingEvents = async (req, res) => { res.json([]); };
const getPendingHighlights = async (req, res) => { res.json([]); };
const approveHighlight = async (req, res) => { res.json({}); };
const rejectHighlight = async (req, res) => { res.json({}); };

module.exports = {
    createEvent, updateEvent, getMyEvents, getEvents, getEventById,
    toggleFavorite, getEventsByCategory, getFeaturedEvents, getEventCities,
    searchEvents, getPendingEvents, approveEvent, rejectEvent, 
    getPendingHighlights, approveHighlight, rejectHighlight,
    getEventParticipants, toggleTicketStatus 
};