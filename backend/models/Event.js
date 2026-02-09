const mongoose = require('mongoose');

const AddressSchema = new mongoose.Schema({
    street: String,
    number: String,
    district: String,
    city: String,
    state: String,
    zipCode: String,
});

// --- SCHEMA DO INGRESSO (Atualizado para Legislação) ---
const TicketSchema = new mongoose.Schema({
    name: { type: String, required: true }, // Ex: "Pista Premium", "Camarote"
    
    // Preço do ingresso
    price: { type: Number, required: true, default: 0 },
    
    // Quantidade total disponibilizada neste lote/tipo
    quantity: { type: Number, required: true, default: 0 },
    
    description: String, // Regras específicas deste ingresso
    
    sold: { type: Number, default: 0 },

    // --- NOVOS CAMPOS LEGAIS ---
    isHalfPrice: { 
        type: Boolean, 
        default: false 
    }, // Identifica se é meia-entrada (Obrigatório para Lei 12.933/2013)

    category: {
        type: String,
        enum: ['Inteira', 'Meia-Entrada', 'Promocional', 'Cortesia', 'VIP'],
        default: 'Inteira'
    }, // Ajuda a categorizar no relatório final

    batch: { 
        type: String, 
        default: 'Lote Único' 
    }, // Ex: "1º Lote", "2º Lote" (Útil para virada de preço)

    maxPerUser: { 
        type: Number, 
        default: 4 
    }, // Limite de compra por CPF (Comum para evitar cambistas)

    status: {
        type: String,
        enum: ['active', 'sold_out', 'paused', 'hidden'],
        default: 'active'
    }
});

const PhysicalSalesPointSchema = new mongoose.Schema({
    name: String,
    operatingHours: String,
    street: String,
    number: String,
    district: String,
    city: String,
    state: String,
    zipCode: String,
    price: Number,
});

const OnlineSalesPointSchema = new mongoose.Schema({
    name: String,
    purchaseLink: String,
    price: Number,
});

// --- SCHEMA DA SESSÃO ---
const SessionSchema = new mongoose.Schema({
    date: { type: Date, required: true },     // Data/Hora de início
    endDate: { type: Date },                  // Data/Hora de fim
    availableTickets: { type: Number }        // (Opcional) Estoque por sessão
});

const EventSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    imageUrl: { type: String, required: true },
    
    // --- DATAS (Híbrido) ---
    sessions: [SessionSchema], 
    date: { type: Date, required: true }, 
    endDate: Date,

    location: { type: String, required: true, trim: true },
    address: AddressSchema,
    city: { type: String, required: true, trim: true, lowercase: true },
    category: {
        type: String,
        required: true,
        enum: ['Música e entretenimento', 'Esportes e Lazer', 'Teatro', 'Infantil', 'Educação e Negócios', 'Religiosos'],
    },
    classificacaoEtaria: String, // Ex: "Livre", "18+" (Importante legalmente)
    
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'finished', 'cancelled'],
        default: 'pending'
    },

    // --- CAMPOS JURÍDICOS E TRANSPARÊNCIA ---
    refundPolicy: {
        type: String,
        default: "O cancelamento pode ser solicitado em até 7 dias após a compra, desde que a solicitação seja feita até 48h antes do evento."
    }, // Cobre Art. 49 do CDC

    termsAndConditions: {
        type: String
    }, // Termos específicos do organizador

    isFeatured: { type: Boolean, default: false },
    isFeaturedRequested: { type: Boolean, default: false },
    highlightStatus: { 
        type: String, 
        enum: ['none', 'pending', 'approved', 'rejected'], 
        default: 'none' 
    },
    highlightFee: { type: Number, default: 0 },

    price: { type: Number, required: true, min: 0 }, // Preço "A partir de"
    
    tickets: [TicketSchema],
    physicalSalesPoints: [PhysicalSalesPointSchema],
    onlineSalesPoints: [OnlineSalesPointSchema],
    
    organizer: {
        name: String,
        description: String,
        instagram: String,
        email: String, // Contato obrigatório para suporte
        phone: String  // Contato opcional
    },
    
    latitude: { type: Number, required: false },
    longitude: { type: Number, required: false },
    
    favoritesCount: { type: Number, default: 0 },

    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
}, { timestamps: true });

module.exports = mongoose.model('Event', EventSchema);