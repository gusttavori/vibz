const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Buscando o último pedido realizado...');

  const lastOrder = await prisma.order.findFirst({
    orderBy: { createdAt: 'desc' },
    include: {
      user: true,
      items: { include: { ticketType: true } },
      tickets: true // Aqui veremos se os ingressos foram gerados
    }
  });

  if (!lastOrder) {
    console.log('❌ Nenhum pedido encontrado no banco de dados.');
    return;
  }

  console.log('------------------------------------------------');
  console.log(`🧾 PEDIDO ID: ${lastOrder.id}`);
  console.log(`👤 Cliente:   ${lastOrder.user.name} (${lastOrder.user.email})`);
  console.log(`📅 Data:      ${lastOrder.createdAt.toLocaleString()}`);
  console.log(`💰 Valor:     R$ ${lastOrder.totalPaid}`);
  console.log(`🏷️  Status:    ${lastOrder.status.toUpperCase()}`);
  console.log('------------------------------------------------');

  if (lastOrder.status === 'paid') {
    console.log('✅ SUCESSO TOTAL! O Webhook funcionou.');
    console.log(`🎟️  Ingressos Gerados: ${lastOrder.tickets.length}`);
    lastOrder.tickets.forEach(t => {
      console.log(`   - Ticket ID: ${t.id} | QR Code: ${t.qrCode}`);
    });
  } else {
    console.log('⚠️  O pedido consta como PENDING (Pendente).');
    console.log('\n🔎 DIAGNÓSTICO:');
    console.log('   Como você está no localhost, o Stripe não conseguiu enviar');
    console.log('   o aviso automático (Webhook) para o seu computador.');
    console.log('   Isso é NORMAL em ambiente de desenvolvimento sem túnel.');
  }
  console.log('------------------------------------------------');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());