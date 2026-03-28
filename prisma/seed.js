const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Sembrando base de datos...');

  // Crear administrador (propietario de los objetos iniciales)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@galizanoreusa.com' },
    update: {},
    create: {
      email: 'admin@galizanoreusa.com',
      passwordHash: await bcrypt.hash('admin2026!', 12),
      role: 'admin',
      nombre: 'Administrador Galizano Reusa',
      bankIban: 'ES0000000000000000000000',
      emailVerified: true,
    },
  });
  console.log('  ✅ Admin:', admin.email);

  // Crear ofertante de ejemplo
  const ofertante = await prisma.user.upsert({
    where: { email: 'ofertante@demo.com' },
    update: {},
    create: {
      email: 'ofertante@demo.com',
      passwordHash: await bcrypt.hash('password123', 12),
      role: 'ofertante',
      nombre: 'María García',
      bankIban: 'ES1234567890123456789012',
      emailVerified: true,
    },
  });
  console.log('  ✅ Ofertante:', ofertante.email);

  // Crear cliente de ejemplo
  const cliente = await prisma.user.upsert({
    where: { email: 'cliente@demo.com' },
    update: {},
    create: {
      email: 'cliente@demo.com',
      passwordHash: await bcrypt.hash('password123', 12),
      role: 'cliente',
      nombre: 'Carlos López',
      direccion: 'Calle del Mar 15, Galizano',
      dni: '12345678A',
      emailVerified: true,
    },
  });
  console.log('  ✅ Cliente:', cliente.email);

  // Crear artículos de ejemplo
  const items = [
    {
      ownerId: admin.id,
      titulo: 'Tabla de Surf 6 pies',
      descripcion: 'Tabla de surf en buen estado, ideal para principiantes. Incluye leash.',
      fotos: '["/uploads/tabla-surf.jpg"]',
      tipoTransaccion: 'ambos_alquiler',
      precioMedioDia: 8.00,
      precioDiaEntero: 12.00,
      importeFianza: 30.00,
      slug: 'tabla-surf-6-pies',
    },
    {
      ownerId: admin.id,
      titulo: 'Sombrilla de playa',
      descripcion: 'Sombrilla grande con protección UV50+. Fácil de clavar en la arena.',
      fotos: '["/uploads/sombrilla.jpg"]',
      tipoTransaccion: 'alquiler_dia',
      precioDiaEntero: 5.00,
      importeFianza: 15.00,
      slug: 'sombrilla-playa',
    },
    {
      ownerId: admin.id,
      titulo: 'Palas y pelota de playa',
      descripcion: 'Set de palas de madera con pelota para jugar en la playa.',
      fotos: '["/uploads/palas.jpg"]',
      tipoTransaccion: 'todos',
      precioVenta: 10.00,
      precioMedioDia: 3.00,
      precioDiaEntero: 5.00,
      importeFianza: 10.00,
      slug: 'palas-pelota-playa',
    },
    {
      ownerId: admin.id,
      titulo: 'Gafas de bucear',
      descripcion: 'Gafas de snorkel con tubo. Cristal antivaho. Talla adulto.',
      fotos: '["/uploads/gafas-bucear.jpg"]',
      tipoTransaccion: 'ambos_alquiler',
      precioMedioDia: 4.00,
      precioDiaEntero: 6.00,
      importeFianza: 20.00,
      slug: 'gafas-bucear',
    },
  ];

  for (const itemData of items) {
    const QRCode = require('qrcode');
    const slug = itemData.slug;
    const qrCode = await QRCode.toDataURL(`${process.env.BASE_URL || 'http://localhost:4001'}/o/${slug}`, {
      width: 400,
      margin: 2,
      errorCorrectionLevel: 'H',
    });

    await prisma.item.upsert({
      where: { slug },
      update: { fotos: itemData.fotos, qrCode, ownerId: itemData.ownerId },
      create: { ...itemData, qrCode },
    });
    console.log(`  ✅ Artículo: ${itemData.titulo}`);
  }

  console.log('\n🌊 Seed completado. Credenciales de demo:');
  console.log('  Admin:     admin@galizanoreusa.com / admin2026!');
  console.log('  Ofertante: ofertante@demo.com / password123');
  console.log('  Cliente:   cliente@demo.com / password123');
}

main()
  .catch((e) => {
    console.error('Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
