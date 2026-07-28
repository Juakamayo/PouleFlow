// Seed de datos fijos: armas y categorías estándar de esgrima.
// Se corre automáticamente en cada arranque del contenedor (ver docker-entrypoint.sh),
// usando upsert para que sea seguro correrlo múltiples veces sin duplicar datos.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const weapons = ['EPEE', 'FOIL', 'SABER'];

const categories = [
  'Sub-9',
  'Sub-11',
  'Sub-13',
  'Precadete',
  'Cadete',
  'Juvenil',
  'Todo Competidor',
  'Novicio',
  'Universitario',
  'Preveterano',
  'Veterano 1',
  'Veterano 2',
  'Veterano 3',
];

async function main() {
  for (const name of weapons) {
    await prisma.weapon.upsert({ where: { name }, update: {}, create: { name } });
  }

  for (const name of categories) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }

  console.log(`Seed completado: ${weapons.length} armas, ${categories.length} categorías.`);
}

main()
  .catch((e) => {
    console.error('Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
