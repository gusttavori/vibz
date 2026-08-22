const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const cloudinary = require('../config/cloudinary');
const { z } = require('zod'); // <-- Importação do Zod

const { 
    sendEventStatusEmail, 
    sendEventReceivedEmail, 
    sendAdminNotificationEmail 
} = require('../services/emailService');

// ==========================================
// 🛡️ ESQUEMA DE VALIDAÇÃO ZOD PARA EVENTOS
// ==========================================
const eventSchema = z.object({
    title: z.string().min(3, "O título do evento precisa ter no mínimo 3 caracteres."),
    description: z.string().min(10, "A descrição do evento precisa ter no mínimo 10 caracteres."),
    category: z.string().min(2, "A categoria do evento é obrigatória.")
});
// ==========================================

// --- HELPER: Junta os ingressos ao evento na hora de buscar do Banco ---
const attachTicketsToEvents = async (events) => {
    if (!events || events.length === 0) return events;
    const eventIds = events.map(e => e.id);
    const allTickets = await prisma.ticketType.findMany({ where: { eventId: { in: eventIds } } });
    return events.map(e => ({
        ...e,
        ticketTypes: allTickets.filter(t => t.eventId === e.id)
    }));
};

// --- MAPPER PARA O FRONTEND ---
const mapEventToFrontend = (event) => {
    const safeDate = event.eventDate ? new Date(event.eventDate).toISOString() : new Date(event.createdAt).toISOString();
    
    let parsedSessions = [];
    if (event.sessions) {
        parsedSessions = typeof event.sessions === 'string' ? JSON.parse(event.sessions) : event.sessions;
    } else {
        parsedSessions = [{ date: safeDate, endDate: safeDate }];
    }

    let parsedTickets = [];
    if (event.ticketTypes) {
        parsedTickets = typeof event.ticketTypes === 'string' ? JSON.parse(event.ticketTypes) : event.ticketTypes;
    } else if (event.tickets) {
        parsedTickets = typeof event.tickets === 'string' ? JSON.parse(event.tickets) : event.tickets;
    }

    // Injeção visual do hasSchedule para o frontend funcionar sem precisar salvar no banco
    parsedTickets = parsedTickets.map(t => ({
        ...t,
        hasSchedule: !!(t.activityDate || t.startTime)
    }));

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
        tickets: parsedTickets, 
        formSchema: event.formSchema ? (typeof event.formSchema === 'string' ? JSON.parse(event.formSchema) : event.formSchema) : [],
        organizer: { name: organizerNameFinal, instagram: organizerInstaFinal },
        organizerName: organizerNameFinal,
        organizerInstagram: organizerInstaFinal,
        isInformational: event.isInformational !== undefined ? event.isInformational : true, 
        highlightStatus: event.highlightStatus,
        highlightPaymentLink: event.highlightPaymentLink 
    };
};

// --- CRIAÇÃO DE EVENTOS ---
const createEvent = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'Acesso negado. Usuário não autenticado.' });
        }

        const { 
            title, description, category, ageRating, date, sessions, 
            location, city, address, organizerInfo, 
            isFeaturedRequested, formSchema, externalUrl,
            tickets, isInformational 
        } = req.body;

        // 🛡️ Validação Zod dos campos de texto cruciais
        const validation = eventSchema.safeParse({ title, description, category });
        if (!validation.success) {
            return res.status(400).json({ message: validation.error.errors[0].message });
        }

        const userId = req.user.id;
        
        let finalOrganizerName = "Curador Vibz";
        let finalOrganizerInsta = "";

        if (organizerInfo) {
            try {
                let parsedOrganizerInfo = JSON.parse(organizerInfo);
                if (parsedOrganizerInfo.name) finalOrganizerName = parsedOrganizerInfo.name;
                if (parsedOrganizerInfo.instagram) finalOrganizerInsta = parsedOrganizerInfo.instagram;
            } catch (e) { console.error(e); }
        }

        const isFeaturedBool = (isFeaturedRequested === 'true' || isFeaturedRequested === true);
        const isInfoBool = (isInformational === 'true' || isInformational === true);

        let parsedAddress = address ? JSON.parse(address) : {};
        let parsedSessions = sessions ? JSON.parse(sessions) : [];
        let parsedFormSchema = formSchema ? JSON.parse(formSchema) : [];
        let parsedTickets = tickets ? JSON.parse(tickets) : [];

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
                title: validation.data.title, 
                description: validation.data.description, 
                imageUrl, 
                city,
                location: location || parsedAddress.street,
                category: validation.data.category,
                ageRating, 
                status: 'pending', 
                organizerId: userId, 
                isFeaturedRequested: isFeaturedBool,
                isFeatured: isFeaturedBool,
                externalUrl: externalUrl || null,
                eventDate: mainEventDate,
                sessions: parsedSessions,
                organizerInfo: { name: finalOrganizerName, instagram: finalOrganizerInsta },
                formSchema: parsedFormSchema,
                isInformational: isInfoBool
            }
        });

        if (!isInfoBool && parsedTickets.length > 0) {
            for (const t of parsedTickets) {
                await prisma.ticketType.create({
                    data: {
                        eventId: event.id,
                        name: t.name,
                        category: t.category || 'Inteira',
                        isHalfPrice: Boolean(t.isHalfPrice),
                        maxPerUser: t.maxPerUser ? parseInt(t.maxPerUser) : 4,
                        batchName: t.batch || t.batchName || 'Lote Único',
                        price: t.price ? parseFloat(t.price) : 0,
                        quantity: t.quantity ? parseInt(t.quantity) : 0,
                        activityDate: (t.activityDate && t.activityDate !== "") ? new Date(t.activityDate) : null,
                        startTime: t.startTime || null,
                        endTime: t.endTime || null
                    }
                });
            }
        }

        const eventWithTickets = await attachTicketsToEvents([event]);
        res.status(201).json({ message: 'Evento publicado com sucesso.', event: mapEventToFrontend(eventWithTickets[0]) });
    } catch (error) {
        console.error("Erro no createEvent:", error);
        if (!res.headersSent) res.status(500).json({ message: 'Erro interno ao criar evento.' });
    }
};

// --- ATUALIZAÇÃO DE EVENTOS ---
const updateEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const existingEvent = await prisma.event.findUnique({ where: { id } });

        if (!existingEvent) return res.status(404).json({ message: 'Evento não encontrado.' });
        if (existingEvent.organizerId !== userId && !req.user.isAdmin) return res.status(403).json({ message: 'Sem permissão.' });

        const { 
            title, description, category, ageRating, location, city, 
            sessions, organizerInfo, formSchema, externalUrl,
            tickets, isInformational
        } = req.body;

        // 🛡️ Validação Zod dos campos de texto cruciais
        const validation = eventSchema.safeParse({ title, description, category });
        if (!validation.success) {
            return res.status(400).json({ message: validation.error.errors[0].message });
        }

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

        const isInfoBool = isInformational !== undefined 
            ? (isInformational === 'true' || isInformational === true) 
            : existingEvent.isInformational;

        const updatedEvent = await prisma.event.update({
            where: { id },
            data: {
                title: validation.data.title, 
                description: validation.data.description, 
                category: validation.data.category,
                ageRating, imageUrl, location, city,
                eventDate: mainEventDate, sessions: parsedSessions,
                organizerInfo: parsedOrgInfo,
                externalUrl: externalUrl || existingEvent.externalUrl,
                formSchema: typeof formSchema === 'string' ? JSON.parse(formSchema) : formSchema,
                isInformational: isInfoBool
            }
        });

        if (!isInfoBool) {
            let parsedTickets = tickets ? JSON.parse(tickets) : [];
            const incomingIds = parsedTickets.map(t => t.id).filter(Boolean);

            await prisma.ticketType.deleteMany({
                where: { eventId: id, id: { notIn: incomingIds } }
            });

            for (const t of parsedTickets) {
                const ticketData = {
                    name: t.name,
                    category: t.category || 'Inteira',
                    isHalfPrice: Boolean(t.isHalfPrice),
                    maxPerUser: t.maxPerUser ? parseInt(t.maxPerUser) : 4,
                    batchName: t.batch || t.batchName || 'Lote Único',
                    price: t.price ? parseFloat(t.price) : 0,
                    quantity: t.quantity ? parseInt(t.quantity) : 0,
                    activityDate: (t.activityDate && t.activityDate !== "") ? new Date(t.activityDate) : null,
                    startTime: t.startTime || null,
                    endTime: t.endTime || null
                };

                if (t.id) {
                    await prisma.ticketType.update({ where: { id: t.id }, data: ticketData });
                } else {
                    await prisma.ticketType.create({ data: { ...ticketData, eventId: id } });
                }
            }
        }

        const eventWithTickets = await attachTicketsToEvents([updatedEvent]);
        res.json(mapEventToFrontend(eventWithTickets[0]));
    } catch (error) {
        console.error("Erro updateEvent:", error);
        res.status(500).json({ message: 'Erro ao atualizar evento.' });
    }
};

// --- BUSCAS DE EVENTOS ---
const getMyEvents = async (req, res) => {
    try {
        const events = await prisma.event.findMany({
            where: { organizerId: req.user.id },
            orderBy: { createdAt: 'desc' }
        });
        const withTickets = await attachTicketsToEvents(events);
        const formattedEvents = withTickets.map(mapEventToFrontend);
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
        const withTickets = await attachTicketsToEvents(events);
        res.status(200).json(withTickets.map(mapEventToFrontend));
    } catch (error) { res.status(500).json({ message: 'Erro ao buscar eventos públicos.' }); }
};

const getEventById = async (req, res) => {
    try {
        const event = await prisma.event.findUnique({
            where: { id: req.params.id },
            include: { organizer: { select: { name: true, id: true } } }
        });
        if (!event) return res.status(404).json({ message: 'Evento não encontrado' });
        
        const withTickets = await attachTicketsToEvents([event]);
        res.json(mapEventToFrontend(withTickets[0]));
    } catch (err) { res.status(500).json({ message: 'Erro no servidor' }); }
};

const getFeaturedEvents = async (req, res) => {
    try {
        const events = await prisma.event.findMany({ 
            where: { isFeatured: true, status: 'approved' },
            orderBy: { eventDate: 'asc' }
        });
        const withTickets = await attachTicketsToEvents(events);
        res.json(withTickets.map(mapEventToFrontend));
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
        const withTickets = await attachTicketsToEvents(events);
        res.json(withTickets.map(mapEventToFrontend));
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
        const withTickets = await attachTicketsToEvents(events);
        res.json(withTickets.map(mapEventToFrontend));
    } catch (err) {
        res.status(500).json([]);
    }
};

const getEventCities = async (req, res) => {
    const cities = await prisma.event.findMany({ where: { status: 'approved' }, select: { city: true }, distinct: ['city'] });
    res.json(cities.map(c => c.city));
};

const approveEvent = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.event.update({ where: { id }, data: { status: 'approved' } });
        res.json({ success: true, message: "Evento aprovado!" });
    } catch (error) { res.status(500).json({ message: "Erro interno." }); }
};

const rejectEvent = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.event.update({ where: { id }, data: { status: 'rejected' } });
        res.json({ success: true, message: "Evento ocultado." });
    } catch (error) { res.status(500).json({ message: "Erro ao ocultar evento." }); }
};

const getEventParticipants = async (req, res) => {
    try {
        const eventId = req.params.id;
        
        // 1. Busca os dados principais do evento
        const event = await prisma.event.findUnique({ where: { id: eventId } });
        if (!event) return res.status(404).json({ message: 'Evento não encontrado' });

        // 2. Busca todos os ingressos atrelados a este evento
        const tickets = await prisma.ticket.findMany({
            where: { eventId: eventId },
            orderBy: { createdAt: 'desc' }
        });

        // 3. Monta a lista manualmente, puxando o Usuário e o Tipo de Ingresso para cada um
        const participants = await Promise.all(tickets.map(async (t) => {
            const user = await prisma.user.findUnique({ where: { id: t.userId } });
            const tType = t.ticketTypeId ? await prisma.ticketType.findUnique({ where: { id: t.ticketTypeId } }) : null;
            
            // Extrai dados de formulário customizado, se o aluno tiver preenchido algo
            let customData = {};
            if (t.participantData) {
                try {
                    customData = typeof t.participantData === 'string' 
                        ? JSON.parse(t.participantData) 
                        : t.participantData;
                } catch(e) {}
            }

            return {
                id: t.id,
                status: t.status, // Retorna 'valid' ou 'used'
                buyerName: user?.name || 'Desconhecido',
                buyerEmail: user?.email || 'Não informado',
                code: t.qrCodeData,
                ticketType: tType?.name || 'Geral',
                batch: tType?.batchName || 'Lote Único',
                purchaseDate: t.createdAt,
                ...customData
            };
        }));

        // 4. Devolve o pacote completo que o seu Frontend (Next.js) está esperando
        res.json({
            eventTitle: event.title,
            eventImageUrl: event.imageUrl,
            formSchema: typeof event.formSchema === 'string' ? JSON.parse(event.formSchema) : (event.formSchema || []),
            participants: participants
        });
    } catch (error) {
        console.error("Erro ao buscar participantes:", error);
        res.status(500).json({ message: 'Erro interno ao carregar a lista de participantes.' });
    }
};

// --- RESTAURADO: Alteração manual de status no Painel ---
const toggleTicketStatus = async (req, res) => {
    try {
        const ticketId = req.params.ticketId || req.params.id || req.body.ticketId;
        
        const ticket = await prisma.ticket.findUnique({ 
            where: { id: ticketId }, 
            include: { event: true } 
        });
        
        if (!ticket) return res.status(404).json({ message: "Ingresso não encontrado." });
        if (ticket.event.organizerId !== req.user.id && !req.user.isAdmin) {
            return res.status(403).json({ message: "Sem permissão." });
        }

        const newStatus = ticket.status === 'valid' ? 'used' : 'valid';
        
        await prisma.ticket.update({
            where: { id: ticketId },
            data: { 
                status: newStatus, 
                usedAt: newStatus === 'used' ? new Date() : null 
            }
        });

        res.json({ success: true, newStatus });
    } catch (error) {
        console.error("Erro toggleTicketStatus:", error);
        res.status(500).json({ message: "Erro ao alterar o status do ingresso." });
    }
};

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