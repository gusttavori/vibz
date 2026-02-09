const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const QRCode = require('qrcode');

async function main() {
  console.log('🔍 Buscando o último pedido realizado...');

  const order = await prisma.order.findFirst({
    orderBy: { createdAt: 'desc' },
    include: {
      user: true,
      items: { include: { ticketType: true } }
    }
  });

  if (!order) {
    console.log('❌ Nenhum pedido encontrado.');
    return;
  }

  console.log('------------------------------------------------');
  console.log(`🧾 PEDIDO: ${order.id}`);
  console.log(`👤 Cliente: ${order.user.name}`);
  console.log(`💰 Valor:   R$ ${order.totalPaid}`);
  console.log(`🏷️  Status:  ${order.status.toUpperCase()}`);
  console.log('------------------------------------------------');

  // Verifica se já existem ingressos
  const existingTickets = await prisma.ticket.findMany({ 
    where: { 
      userId: order.userId,
      eventId: order.eventId
    } 
  });

  if (existingTickets.length > 0) {
    console.log(`✅ Pedido PAGO e ${existingTickets.length} ingressos já existem.`);
    return;
  }

  if (order.status !== 'paid') {
    console.log('🔄 APROVANDO PEDIDO PENDENTE...');
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'paid' }
    });
  }

  console.log('🎟️  Gerando ingressos no banco...');
  const generatedTickets = [];

  for (const item of order.items) {
    for (let i = 0; i < item.quantity; i++) {
      // Gera string única para o QR Code
      const uniqueData = `${order.id}-${item.ticketTypeId}-${i}-${Date.now()}`;
      
      // O frontend gera a imagem visual, aqui salvamos os dados
      const ticket = await prisma.ticket.create({
        data: {
          eventId: order.eventId,
          userId: order.userId,
          ticketTypeId: item.ticketTypeId,
          
          qrCodeData: uniqueData,     // Dado para gerar o QR Code
          price: item.ticketType.price, // Preço pago
          status: 'valid'
          
          // REMOVIDO: batch (Não existe na tabela Ticket)
          // REMOVIDO: qrCode (Não existe na tabela Ticket)
          // REMOVIDO: orderId (Não existe na tabela Ticket)
        }
      });
      generatedTickets.push(ticket);
    }
  }

  console.log('------------------------------------------------');
  console.log(`✅ SUCESSO! ${generatedTickets.length} ingressos gerados.`);
  console.log('🚀 Agora seus ingressos devem aparecer no site!');
  console.log('------------------------------------------------');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());