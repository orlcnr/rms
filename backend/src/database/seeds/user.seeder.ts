import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';
import { Role } from '../../common/enums/role.enum';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserSeeder {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async seed() {
    const salt = await bcrypt.genSalt();
    const commonPassword = await bcrypt.hash('Kartal1903', salt);

    const users = [
      {
        email: 'oralodabas@gmail.com',
        password_hash: commonPassword,
        first_name: 'oral',
        last_name: 'çınar',
        role: Role.SUPER_ADMIN,
        is_active: true,
      },
      {
        email: 'owner@tomubulunmeyhanesi.com',
        password_hash: commonPassword,
        first_name: 'owner',
        last_name: 'tomubulunmeyhanesi',
        role: Role.RESTAURANT_OWNER,
        is_active: true,
      },
    ];

    for (const data of users) {
      const existing = await this.userRepository.findOneBy({
        email: data.email,
      });
      if (!existing) {
        const user = this.userRepository.create(data);
        await this.userRepository.save(user);
        console.log(`User seeded: ${data.email}`);
      } else {
        console.log(`User already exists: ${data.email}`);
      }
    }
  }
}
