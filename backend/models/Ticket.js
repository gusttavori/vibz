const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Código único para o QR Code (pode ser um hash ou UUID)
    qrCodeData: { type: String, required: true, unique: true },
    
    // Tipo do ingresso (Pista, VIP, etc)
    ticketType: { type: String, required: true },
    price: { type: Number, required: true },
    
    // Status do uso
    status: {
        type: String,
        enum: ['valid', 'used', 'cancelled'],
        default: 'valid'
    },
    usedAt: { type: Date } // Data de quando entrou no evento
}, { timestamps: true });

module.exports = mongoose.model('Ticket', TicketSchema);