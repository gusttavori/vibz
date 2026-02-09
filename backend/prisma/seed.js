const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs'); // Certifique-se de ter instalado: npm install bcryptjs

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando o seed do banco de dados...');

  // --------------------------------------------------------
  // 1. CRIAR USUÁRIO ADMIN (Essencial após resetar o banco)
  // --------------------------------------------------------
  const adminEmail = 'admin@vibz.com';
  // Senha: "123456"
  const hashedPassword = await bcrypt.hash('123456', 10);

  // Verifica se já existe para não dar erro de Unique
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!admin) {
    admin = await prisma.user.create({
      data: {
        name: 'Gustavo Admin',
        email: adminEmail,
        password: hashedPassword,
        isAdmin: true,
        stripeOnboardingComplete: true, // Conta verificada para testes
        bio: 'Conta administrativa do sistema VIBZ.',
      },
    });
    console.log(`✅ Admin criado: ${adminEmail} (Senha: 123456)`);
  } else {
    console.log(`ℹ️ Admin já existe: ${adminEmail}`);
  }

  // --------------------------------------------------------
  // 2. PARCEIRO: GALEGO DIVULGAÇÕES
  // --------------------------------------------------------
  let partner = await prisma.partner.findFirst({ 
    where: { name: 'Galego Divulgações' } 
  });

  if (!partner) {
    partner = await prisma.partner.create({
      data: { 
        name: 'Galego Divulgações', 
        description: 'Maior divulgador de eventos da região.',
        instagram: '@galego_divulgacoes' 
      }
    });
    console.log('✅ Parceiro "Galego Divulgações" criado.');
  } else {
    console.log('ℹ️ Parceiro "Galego Divulgações" já existia.');
  }

  // --------------------------------------------------------
  // 3. CUPOM: GALEGO (Estratégia Agressiva)
  // --------------------------------------------------------
  
  // Remove anterior se existir
  try {
    await prisma.coupon.delete({ where: { code: 'GALEGO' } });
  } catch (e) {}

  await prisma.coupon.create({
    data: {
      code: 'GALEGO',
      description: 'Cupom oficial do Galego',
      
      // --- Configuração Nova do Schema ---
      discountType: 'PERCENTAGE', // Tipo do desconto para o USUÁRIO
      discountValue: 5.0,         // Usuário ganha 5% OFF no ingresso
      
      // --- Regras de Uso ---
      maxUses: 5000,
      usageLimitPerUser: 5,
      isActive: true,
      
      // --- Vínculo ---
      partnerId: partner.id,

      // --- Taxas Internas (Estratégia 1% / 2%) ---
      platformFeeMin: 1.0, // VIBZ reduz sua taxa para 1%
      partnerShare: 2.0,   // Parceiro ganha 2% sobre a venda
    }
  });

  console.log('✅ Cupom GALEGO configurado:');
  console.log('   -> Cliente ganha: 5% de desconto');
  console.log('   -> Vibz ganha: 1% taxa');
  console.log('   -> Parceiro ganha: 2% comissão');

  console.log('🚀 Seed finalizado com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });