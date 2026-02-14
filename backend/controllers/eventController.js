const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const cloudinary = require('../config/cloudinary');

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
        organizerData = {
            name: info.name || "Organizador",
            instagram: info.instagram || ""
        };
    } else if (event.organizer) {
        organizerData = {
            name: event.organizer.name,
            instagram: "" 
        };
    }

    return {
        ...event,
        _id: event.id,
        classificacaoEtaria: event.ageRating || 'Livre',
        address: {
            street: event.location || '',
            city: event.city || '',
            number: 'S/N',
            state: 'BA'
        },
        sessions: parsedSessions,
        date: safeDate,
        tickets: event.ticketTypes ? event.ticketTypes.map(t => ({
            ...t,
            _id: t.id,
            batch: t.batchName, 
            price: t.price,
            quantity: t.quantity, 
            sold: t.sold,
            // NOVOS CAMPOS PARA CONTROLE DE VENDAS
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

        if (!isInfoBool && parsedTicketsFlat.length === 0) {
            return res.status(400).json({ message: "Eventos com inscrição precisam de pelo menos um tipo de ingresso." });
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
        if (date) {
            mainEventDate = new Date(date);
        } else if (parsedSessions.length > 0) {
            mainEventDate = new Date(parsedSessions[0].date);
        }

        const organizerInfoObj = {
            name: organizerName || "Organizador",
            instagram: organizerInstagram || ""
        };

        let minPrice = 0;
        if (parsedTicketsFlat.length > 0) {
            minPrice = parsedTicketsFlat.reduce((min, t) => {
                const p = parseFloat(t.price);
                return p < min ? p : min;
            }, parseFloat(parsedTicketsFlat[0]?.price || 0));
        }

        const eventData = {
            title,
            description,
            imageUrl,
            city,
            location: location || parsedAddress.street,
            category: category ? category.trim() : "Geral",
            ageRating, 
            priceFrom: minPrice,
            status: 'pending',
            organizerId: userId,
            isFeaturedRequested: isFeaturedBool,
            highlightStatus: isFeaturedBool ? 'pending' : 'none',
            highlightFee: isFeaturedBool ? 9.90 : 0,
            refundPolicy: refundPolicy || "7 dias após a compra",
            eventDate: mainEventDate,
            sessions: parsedSessions,
            organizerInfo: organizerInfoObj,
            formSchema: parsedFormSchema,
            isInformational: isInfoBool
        };

        if (parsedTicketsFlat.length > 0) {
            eventData.ticketTypes = {
                create: parsedTicketsFlat.map(t => {
                    let safeActivityDate = null;
                    if (t.activityDate && typeof t.activityDate === 'string' && t.activityDate.trim() !== "") {
                        const d = new Date(t.activityDate);
                        if (!isNaN(d.getTime())) {
                            safeActivityDate = d;
                        }
                    }

                    return {
                        name: t.name,
                        category: t.category,
                        batchName: t.batch,
                        price: parseFloat(t.price),
                        quantity: parseInt(t.quantity),
                        maxPerUser: parseInt(t.maxPerUser) || 4,
                        description: t.description,
                        isHalfPrice: t.isHalfPrice || false,
                        status: 'active',
                        activityDate: safeActivityDate,
                        startTime: (t.startTime && t.startTime.trim() !== "") ? t.startTime : null,
                        endTime: (t.endTime && t.endTime.trim() !== "") ? t.endTime : null
                    };
                })
            };
        }

        const event = await prisma.event.create({
            data: eventData,
            include: { ticketTypes: true }
        });

        res.status(201).json({ 
            message: parsedTicketsFlat.length > 0 ? 'Evento criado com ingressos.' : 'Evento informativo criado.', 
            event: mapEventToFrontend(event) 
        });

    } catch (error) {
        console.error("Erro no createEvent:", error);
        res.status(500).json({ message: 'Erro interno ao criar evento.', error: error.message });
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

        let isInfoBool = existingEvent.isInformational;
        if (isInformational !== undefined) {
            isInfoBool = isInformational === 'true' || isInformational === true;
        }

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
                    const priceVal = parseFloat(t.price);
                    const qtdVal = parseInt(t.quantity);
                    const maxPerUserVal = parseInt(t.maxPerUser) || 4;
                    
                    let safeActivityDate = null;
                    if (t.activityDate && typeof t.activityDate === 'string' && t.activityDate.trim() !== "") {
                        const d = new Date(t.activityDate);
                        if (!isNaN(d.getTime())) {
                            safeActivityDate = d;
                        }
                    }
                    const startT = (t.startTime && t.startTime.trim() !== "") ? t.startTime : null;
                    const endT = (t.endTime && t.endTime.trim() !== "") ? t.endTime : null;

                    if (t.id) {
                        await prisma.ticketType.update({
                            where: { id: t.id },
                            data: {
                                name: t.name, price: priceVal, quantity: qtdVal, 
                                batchName: t.batch, category: t.category, isHalfPrice: t.isHalfPrice,
                                activityDate: safeActivityDate,
                                startTime: startT,
                                endTime: endT,
                                maxPerUser: maxPerUserVal
                            }
                        });
                    } else {
                        await prisma.ticketType.create({
                            data: {
                                eventId: id, name: t.name, price: priceVal, quantity: qtdVal,
                                batchName: t.batch, category: t.category, isHalfPrice: t.isHalfPrice,
                                activityDate: safeActivityDate,
                                startTime: startT,
                                endTime: endT,
                                maxPerUser: maxPerUserVal
                            }
                        });
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
            include: {
                _count: { select: { tickets: true } },
                // CORREÇÃO: Buscando dados completos do ticket para o painel de controle
                ticketTypes: { 
                    select: { 
                        id: true, 
                        name: true, 
                        price: true, 
                        sold: true, 
                        quantity: true, 
                        status: true,
                        batchName: true
                    } 
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        const formattedEvents = events.map(mapEventToFrontend);
        
        // Métricas básicas para o dashboard
        const totalTicketsSold = events.reduce((acc, ev) => {
            return acc + ev.ticketTypes.reduce((sum, t) => sum + t.sold, 0);
        }, 0);

        const metrics = { 
            activeEvents: events.length, 
            totalRevenue: 0, 
            ticketsSold: totalTicketsSold 
        };

        res.json({ myEvents: formattedEvents, metrics });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao carregar dashboard.' });
    }
};

// --- NOVA FUNÇÃO PARA PAUSAR/ATIVAR VENDAS ---
const toggleTicketStatus = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { status } = req.body; // 'active' ou 'paused'

        const ticket = await prisma.ticketType.findUnique({
            where: { id: ticketId },
            include: { event: true }
        });

        if (!ticket) return res.status(404).json({ message: 'Ingresso não encontrado.' });
        
        // Segurança: Apenas o dono do evento pode alterar
        if (ticket.event.organizerId !== req.user.id) {
            return res.status(403).json({ message: 'Sem permissão.' });
        }

        const updatedTicket = await prisma.ticketType.update({
            where: { id: ticketId },
            data: { status: status }
        });

        res.json({ success: true, status: updatedTicket.status });
    } catch (error) {
        console.error("Erro toggleStatus:", error);
        res.status(500).json({ message: 'Erro ao atualizar status.' });
    }
};

const getEvents = async (req, res) => {
    try {
        const events = await prisma.event.findMany({
            where: { status: 'approved' },
            include: { 
                ticketTypes: true,
                organizer: { select: { name: true, id: true } }
            },
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
            include: { 
                organizer: { select: { name: true, id: true } }, 
                ticketTypes: true 
            }
        });
        if (!event) return res.status(404).json({ message: 'Evento não encontrado' });
        res.json(mapEventToFrontend(event));
    } catch (err) {
        res.status(500).json({ message: 'Erro no servidor' });
    }
};

const getFeaturedEvents = async (req, res) => {
    const events = await prisma.event.findMany({
        where: { isFeatured: true, status: 'approved' },
        include: { ticketTypes: true }
    });
    res.json(events.map(mapEventToFrontend));
};

const getEventsByCategory = async (req, res) => {
    try {
        let { categoryName } = req.params;

        if (categoryName) {
            categoryName = decodeURIComponent(categoryName);
        }

        const events = await prisma.event.findMany({
            where: { 
                category: {
                    equals: categoryName,
                    mode: 'insensitive' 
                },
                status: 'approved' 
            },
            include: { ticketTypes: true },
            orderBy: { eventDate: 'asc' }
        });
        res.json(events.map(mapEventToFrontend));
    } catch (error) {
        console.error("Erro busca categoria:", error);
        res.status(500).json({ message: 'Erro ao buscar por categoria' });
    }
};

const searchEvents = async (req, res) => {
    const { query } = req.query;
    if (!query) return res.json([]);
    const events = await prisma.event.findMany({
        where: {
            status: 'approved',
            OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { city: { contains: query, mode: 'insensitive' } }
            ]
        },
        include: { ticketTypes: true }
    });
    res.json(events.map(mapEventToFrontend));
};

const toggleFavorite = async (req, res) => { res.status(200).json({ success: true }); };

const getEventCities = async (req, res) => {
    const cities = await prisma.event.findMany({
        where: { status: 'approved' },
        select: { city: true },
        distinct: ['city']
    });
    res.json(cities.map(c => c.city));
};

const getEventParticipants = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const event = await prisma.event.findUnique({
            where: { id },
            select: { title: true, organizerId: true, formSchema: true, imageUrl: true }
        });

        if (!event) return res.status(404).json({ message: 'Evento não encontrado.' });
        if (event.organizerId !== userId) return res.status(403).json({ message: 'Sem permissão para ver este evento.' });

        const tickets = await prisma.ticket.findMany({
            where: { 
                eventId: id, 
                status: { in: ['valid', 'used'] } 
            },
            include: {
                user: { select: { name: true, email: true } },
                ticketType: { select: { name: true, batchName: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        const participants = tickets.map(t => {
            let customData = {};
            if (t.participantData && typeof t.participantData === 'object') {
                customData = t.participantData;
            }

            return {
                id: t.id,
                code: t.qrCodeData,
                status: t.status,
                buyerName: t.user.name,
                buyerEmail: t.user.email,
                ticketType: t.ticketType.name,
                batch: t.ticketType.batchName || '-',
                purchaseDate: t.createdAt,
                ...customData
            };
        });

        res.json({ 
            eventTitle: event.title,
            eventImageUrl: event.imageUrl, 
            formSchema: typeof event.formSchema === 'string' ? JSON.parse(event.formSchema) : event.formSchema,
            participants 
        });

    } catch (error) {
        console.error("Erro ao buscar participantes:", error);
        res.status(500).json({ message: 'Erro ao carregar lista.' });
    }
};

const getPendingEvents = async (req, res) => { res.json([]); };
const approveEvent = async (req, res) => { res.json({}); };
const rejectEvent = async (req, res) => { res.json({}); };
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