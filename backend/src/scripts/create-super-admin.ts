import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { AppDataSource } from '../database/data-source';
import { Role } from '../common/enums/role.enum';
import { User } from '../modules/users/entities/user.entity';

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
}

function generateTemporaryPassword(length = 20): string {
  const bytes = randomBytes(length);
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let output = '';

  for (let index = 0; index < length; index += 1) {
    output += chars[bytes[index] % chars.length];
  }

  return `A!1${output.slice(3)}`;
}

async function main() {
  const email = getArg('email');
  const firstName = getArg('firstName') || 'System';
  const lastName = getArg('lastName') || 'Administrator';

  if (!email) {
    throw new Error(
      'Missing required --email argument. Example: npm run create:super-admin -- --email=admin@example.com',
    );
  }

  await AppDataSource.initialize();

  const repository = AppDataSource.getRepository(User);
  const existing = await repository.findOne({ where: { email } });

  if (existing) {
    throw new Error(`User with email ${email} already exists.`);
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  const user = repository.create({
    email,
    first_name: firstName,
    last_name: lastName,
    password_hash: passwordHash,
    role: Role.SUPER_ADMIN,
    is_active: true,
    must_change_password: true,
  });

  await repository.save(user);

  process.stdout.write(`Super admin created: ${email}\n`);
  process.stdout.write(`Temporary password: ${temporaryPassword}\n`);
}

main()
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });
