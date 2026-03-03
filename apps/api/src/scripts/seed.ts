import { hash } from 'bcrypt';
import mongoose from 'mongoose';
import { loadEnv } from '../config/env';
import { RaffleSchema } from '../modules/raffles/schemas/raffle.schema';
import { UserSchema } from '../modules/auth/schemas/user.schema';

const env = loadEnv();

async function seedData(): Promise<void> {
  const RaffleModel = mongoose.model('Raffle', RaffleSchema);
  const UserModel = mongoose.model('User', UserSchema);

  const raffleExists = await RaffleModel.exists({});
  if (raffleExists) {
    console.log('Seed: raffle already exists');
  } else {
    await RaffleModel.create({
      title: 'Rifa de lanzamiento Rifaria',
      slug: 'rifa-lanzamiento-rifaria',
      description:
        'Participa comprando tus boletas y recibe tus numeros por correo. Rifa oficial con sorteo referenciado en loteria colombiana.',
      prizeName: 'Moto de lanzamiento',
      prizeImageUrl:
        'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80',
      startAt: new Date(),
      endAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 20),
      drawAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21),
      drawSource: 'Loteria de Medellin - ultimo resultado del dia',
      totalTickets: 10000,
      soldTickets: 0,
      status: 'selling',
      galleryImages: []
    });

    console.log('Seed: raffle created');
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@rifaria.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'ChangeThis123!';
  const adminExists = await UserModel.exists({ email: adminEmail.toLowerCase() });

  if (adminExists) {
    console.log('Seed: admin already exists');
  } else {
    const passwordHash = await hash(adminPassword, 12);

    await UserModel.create({
      fullName: 'Admin Rifaria',
      email: adminEmail.toLowerCase(),
      passwordHash,
      role: 'owner',
      isActive: true,
      lastLoginAt: null
    });

    console.log(`Seed: admin created (${adminEmail})`);
  }
}

async function runSeed(): Promise<void> {
  try {
    await mongoose.connect(env.MONGODB_URI);
    await seedData();
  } catch (error: unknown) {
    const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
    console.error(message);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

void runSeed();
