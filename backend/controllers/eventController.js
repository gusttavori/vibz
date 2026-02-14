const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const cloudinary = require('../config/cloudinary');
const { 
    sendEventStatusEmail, 
    sendEventReceivedEmail, 
    sendAdminNotificationEmail 
} = require('../services/emailService');

const mapEventToFrontend = (event) => {
    const safeDate = event.eventDate ? new Date(event.eventDate).toISOString() : new Date(event.createdAt).toISOString();
    let parsedSessions = [];
    if (event.sessions) {
        parsedSessions = typeof event.sessions === 'string' ? JSON.parse(event.sessions) : event.sessions;
    } else {
        parsedSessions = [{ date: safeDate, endDate: safeDate }];
    }

    let organizerData = { name: "Organizador", instagram: "" };
    if (event.organizerInfo) {
        const info = typeof event.organizerInfo === 'string' ? JSON.parse(event.organizerInfo) : event.organizerInfo;
        organizerData = { name: info.name || "Organizador", instagram: info.instagram || "" };
    } else if (event.organizer) {
        organizerData = { name: event.organizer.name, instagram: "" };
    }

    return {
        ...event,
        _id: event.id,
        classificacaoEtaria: event.ageRating || 'Livre',
        address: { street: event.location || '', city: event.city || '', number: 'S/N', state: 'BA' },
        sessions: parsedSessions,
        date: safeDate,
        tickets: event.ticketTypes ? event.ticketTypes.map(t => ({
            ...t,
            _id: t.id,
            batch: t.batchName, 
            price: t.price,
            quantity: t.quantity, 
            sold: t.sold,
            status: t.status, 
            salesEnd: t.salesEnd ? new Date(t.salesEnd).toISOString() : null,
            activityDate: t.activityDate ? new Date(t.activityDate).toISOString().split('T')[0] : '',
            startTime: t.startTime || '',
            endTime: t.endTime || '',
            maxPerUser: t.maxPerUser || 4
        })) : [],
        formSchema: event.formSchema ? (typeof event.formSchema === 'string' ? JSON.parse(event.formSchema) : event.formSchema) : [],
        organizer: organizerData,
        organizerName: organizerData.name,
        organizerInstagram: organizerData.instagram,
        isInformational: event.isInformational 
    };
};

const createEvent = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'Acesso negado. Usuário não autenticado.' });
        }

        const { 
            title, description, category, ageRating, 
            date, sessions, 
            location, city, address, 
            tickets, 
            organizerName, organizerInstagram,
            isFeaturedRequested,
            formSchema,
            refundPolicy,
            isInformational 
        } = req.body;

        const userId = req.user.id;
        const isInfoBool = isInformational === 'true' || isInformational === true;
        const isFeaturedBool = isFeaturedRequested === 'true' || isFeaturedRequested === true;

        let parsedAddress, parsedTicketsFlat, parsedSessions, parsedFormSchema;
        try {
            parsedAddress = address ? JSON.parse(address) : {};
            parsedTicketsFlat = tickets ? JSON.parse(tickets) : [];
            parsedSessions = sessions ? JSON.parse(sessions) : [];
            parsedFormSchema = formSchema ? JSON.parse(formSchema) : [];
        } catch (parseError) {
            return res.status(400).json({ message: "Dados JSON inválidos." });
        }

        let imageUrl = '';
        if (req.file) {
            const b64 = Buffer.from(req.file.buffer).toString("base64");
            const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
            const cloudinaryResponse = await cloudinary.uploader.upload(dataURI, { folder: 'vibz_events' });
            imageUrl = cloudinaryResponse.secure_url;
        } else {
            return res.status(400).json({ message: "A imagem do evento é obrigatória." });
        }
        
        let mainEventDate = new Date();
        if (date) { mainEventDate = new Date(date); } 
        else if (parsedSessions.length > 0) { mainEventDate = new Date(parsedSessions[0].date); }

        const eventData = {
            title, description, imageUrl, city,
            location: location || parsedAddress.street,
            category: category ? category.trim() : "Geral",
            ageRating, priceFrom: 0, status: 'pending',
            organizerId: userId, isFeaturedRequested: isFeaturedBool,
            highlightStatus: isFeaturedBool ? 'pending' : 'none',
            refundPolicy: refundPolicy || "7 dias após a compra",
            eventDate: mainEventDate,
            sessions: parsedSessions,
            organizerInfo: { name: organizerName || "Organizador", instagram: organizerInstagram || "" },
            formSchema: parsedFormSchema,
            isInformational: isInfoBool
        };

        if (parsedTicketsFlat.length > 0) {
            eventData.ticketTypes = {
                create: parsedTicketsFlat.map(t => ({
                    name: t.name, batchName: t.batch, price: parseFloat(t.price),
                    quantity: parseInt(t.quantity), maxPerUser: parseInt(t.maxPerUser) || 4,
                    status: 'active',
                    activityDate: t.activityDate ? new Date(t.activityDate) : null,
                    startTime: t.startTime || null, endTime: t.endTime || null
                }))
            };
        }

        const event = await prisma.event.create({
            data: eventData,
            include: { ticketTypes: true }
        });

        // --- DISPARO DE E-MAILS (Non-blocking para evitar Connection Timeout de derrubar o servidor) ---
        sendEventReceivedEmail(req.user.email, organizerName, title)
            .catch(err => console.error("Falha silenciosa e-mail org:", err.message));
        
        sendAdminNotificationEmail({ 
            title, 
            organizerName, 
            city, 
            date: mainEventDate.toLocaleDateString('pt-BR') 
        }).catch(err => console.error("Falha silenciosa e-mail admin:", err.message));

        res.status(201).json({ 
            message: 'Evento enviado para análise.', 
            event: mapEventToFrontend(event) 
        });

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
        if (existingEvent.organizerId !== userId) return res.status(403).json({ message: 'Sem permissão.' });

        const { 
            title, description, category, ageRating, 
            refundPolicy, location, city, 
            sessions, tickets, organizerInfo, formSchema,
            isInformational 
        } = req.body;

        let isInfoBool = isInformational !== undefined ? (isInformational === 'true' || isInformational === true) : existingEvent.isInformational;

        let imageUrl = existingEvent.imageUrl;
        if (req.file) {
            const b64 = Buffer.from(req.file.buffer).toString("base64");
            const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
            const cloudinaryResponse = await cloudinary.uploader.upload(dataURI, { folder: 'vibz_events' });
            imageUrl = cloudinaryResponse.secure_url;
        }

        const parsedSessions = typeof sessions === 'string' ? JSON.parse(sessions) : sessions;
        const parsedOrganizerInfo = typeof organizerInfo === 'string' ? JSON.parse(organizerInfo) : organizerInfo;
        const parsedFormSchema = typeof formSchema === 'string' ? JSON.parse(formSchema) : formSchema;

        let mainEventDate = existingEvent.eventDate;
        if (parsedSessions && parsedSessions.length > 0) {
            mainEventDate = new Date(parsedSessions[0].date);
        }

        const updatedEvent = await prisma.event.update({
            where: { id },
            data: {
                title, description, 
                category: category ? category.trim() : existingEvent.category,
                ageRating, refundPolicy,
                imageUrl, location, city,
                eventDate: mainEventDate,
                sessions: parsedSessions,
                organizerInfo: parsedOrganizerInfo,
                formSchema: parsedFormSchema,
                isInformational: isInfoBool 
            }
        });

        if (tickets) {
            const ticketsData = typeof tickets === 'string' ? JSON.parse(tickets) : tickets;
            if (ticketsData.length > 0) {
                for (const t of ticketsData) {
                    let safeActivityDate = t.activityDate ? new Date(t.activityDate) : null;
                    const ticketPayload = {
                        name: t.name, price: parseFloat(t.price), quantity: parseInt(t.quantity), 
                        batchName: t.batch, category: t.category, isHalfPrice: t.isHalfPrice,
                        activityDate: safeActivityDate, startTime: t.startTime || null,
                        endTime: t.endTime || null, maxPerUser: parseInt(t.maxPerUser) || 4
                    };

                    if (t.id) {
                        await prisma.ticketType.update({ where: { id: t.id }, data: ticketPayload });
                    } else {
                        await prisma.ticketType.create({ data: { ...ticketPayload, eventId: id } });
                    }
                }
            }
        }
        res.json(mapEventToFrontend(updatedEvent));
    } catch (error) {
        console.error("Erro updateEvent:", error);
        res.status(500).json({ message: 'Erro ao atualizar evento.' });
    }
};

const getMyEvents = async (req, res) => {
    try {
        const events = await prisma.event.findMany({
            where: { organizerId: req.user.id },
            include: { _count: { select: { tickets: true } }, ticketTypes: true },
            orderBy: { createdAt: 'desc' }
        });
        const formattedEvents = events.map(mapEventToFrontend);
        const totalTicketsSold = events.reduce((acc, ev) => acc + (ev.ticketTypes ? ev.ticketTypes.reduce((sum, t) => sum + (t.sold || 0), 0) : 0), 0);
        res.json({ myEvents: formattedEvents, metrics: { activeEvents: events.length, totalRevenue: 0, ticketsSold: totalTicketsSold } });
    } catch (error) {
        console.error("Erro getMyEvents:", error);
        res.status(500).json({ message: 'Erro ao carregar dashboard.' });
    }
};

const approveEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const event = await prisma.event.update({
            where: { id },
            data: { status: 'approved' },
            include: { organizer: { select: { email: true, name: true } } }
        });
        sendEventStatusEmail(event.organizer.email, event.organizer.name, event.title, 'approved', event.id)
            .catch(e => console.error("Erro email aprovação:", e.message));
        res.json({ success: true, message: "Evento aprovado e organizador notificado!" });
    } catch (error) {
        res.status(500).json({ message: "Erro ao aprovar evento." });
    }
};

const rejectEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body; 
        const event = await prisma.event.update({
            where: { id },
            data: { status: 'rejected' },
            include: { organizer: { select: { email: true, name: true } } }
        });
        sendEventStatusEmail(event.organizer.email, event.organizer.name, event.title, 'rejected', event.id, reason)
            .catch(e => console.error("Erro email reprovação:", e.message));
        res.json({ success: true, message: "Evento reprovado e organizador notificado." });
    } catch (error) {
        res.status(500).json({ message: "Erro ao reprovar evento." });
    }
};

const toggleTicketStatus = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { status } = req.body; 
        const ticket = await prisma.ticketType.findUnique({ where: { id: ticketId }, include: { event: true } });
        if (!ticket) return res.status(404).json({ message: 'Ingresso não encontrado.' });
        if (ticket.event.organizerId !== req.user.id) return res.status(403).json({ message: 'Sem permissão.' });
        const updatedTicket = await prisma.ticketType.update({ where: { id: ticketId }, data: { status: status } });
        res.json({ success: true, status: updatedTicket.status });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar status.' });
    }
};

const getEvents = async (req, res) => {
    try {
        const events = await prisma.event.findMany({
            where: { status: 'approved' },
            include: { ticketTypes: true, organizer: { select: { name: true, id: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(events.map(mapEventToFrontend));
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar eventos.' });
    }
};

const getEventById = async (req, res) => {
    try {
        const event = await prisma.event.findUnique({
            where: { id: req.params.id },
            include: { organizer: { select: { name: true, id: true } }, ticketTypes: true }
        });
        if (!event) return res.status(404).json({ message: 'Evento não encontrado' });
        res.json(mapEventToFrontend(event));
    } catch (err) {
        res.status(500).json({ message: 'Erro no servidor' });
    }
};

const getFeaturedEvents = async (req, res) => {
    try {
        const events = await prisma.event.findMany({ where: { isFeatured: true, status: 'approved' }, include: { ticketTypes: true } });
        res.json(events.map(mapEventToFrontend));
    } catch (e) { res.status(500).json({ message: "Erro" }); }
};

const getEventsByCategory = async (req, res) => {
    try {
        let { categoryName } = req.params;
        const events = await prisma.event.findMany({
            where: { category: { equals: decodeURIComponent(categoryName), mode: 'insensitive' }, status: 'approved' },
            include: { ticketTypes: true },
            orderBy: { eventDate: 'asc' }
        });
        res.json(events.map(mapEventToFrontend));
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar por categoria' });
    }
};

const searchEvents = async (req, res) => {
    const { query } = req.query;
    if (!query) return res.json([]);
    const events = await prisma.event.findMany({
        where: { status: 'approved', OR: [{ title: { contains: query, mode: 'insensitive' } }, { city: { contains: query, mode: 'insensitive' } }] },
        include: { ticketTypes: true }
    });
    res.json(events.map(mapEventToFrontend));
};

const toggleFavorite = async (req, res) => { res.status(200).json({ success: true }); };

const getEventCities = async (req, res) => {
    const cities = await prisma.event.findMany({ where: { status: 'approved' }, select: { city: true }, distinct: ['city'] });
    res.json(cities.map(c => c.city));
};

const getEventParticipants = async (req, res) => {
    try {
        const { id } = req.params;
        const event = await prisma.event.findUnique({ where: { id }, select: { title: true, organizerId: true } });
        if (!event || event.organizerId !== req.user.id) return res.status(403).json({ message: 'Sem permissão.' });
        const tickets = await prisma.ticket.findMany({
            where: { eventId: id, status: { in: ['valid', 'used'] } },
            include: { user: { select: { name: true, email: true } }, ticketType: { select: { name: true, batchName: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ 
            eventTitle: event.title,
            participants: tickets.map(t => ({ id: t.id, status: t.status, buyerName: t.user.name, buyerEmail: t.user.email, ticketType: t.ticketType.name, ...t.participantData })) 
        });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao carregar lista.' });
    }
};

const getPendingEvents = async (req, res) => { 
    try {
        const events = await prisma.event.findMany({ where: { status: 'pending' }, include: { organizer: { select: { name: true, email: true } } } });
        res.json(events);
    } catch (error) { res.status(500).json({ message: "Erro" }); }
};

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