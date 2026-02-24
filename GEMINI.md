# 🤖 Project Intelligence: Restaurant Management System (RMS)

This file is the main guide for Gemini Code Assist and KiloCode Agent. Refer to the following structures to understand and develop the project.

## 📁 Agentic Context & Rules
When writing code and making architectural decisions, show 100% compliance with the rules in these folders:
- **General Rules:** `.agent/rules/` (Especially `rms-core-rules.md` and `backend-rules.md`)
- **UI/UX Standards:** `.agent/rules/frontend-dry-component-rules.md` and `rms-theme-rules.md`
- **Workflows:** Follow the processes in the `.agent/workflows/` folder.

## 📝 Development Planning & Memory (/plans)
Any development, debugging or new feature addition process related to the project is carried out through the `/plans` folder.

### Planning Protocol:
1. **Plan Reading:** Before starting any work, read the existing `.md` files in the `/plans` folder. Understand what has been done before and where it was left off.
2. **Plan Creation:** When starting a new feature, first create a file named `/plans/feature-name.md`. In this file, specify the steps to be taken (checklist).
3. **Plan Update:** When you complete a step, check the checkbox in the relevant plan file and note the current status.
4. **Record:** The `/plans` folder is your "long-term memory". Never forget that the plans made are there and that you should follow the history of the project from there.

## 🚀 Commands and Triggers
- **@plans:** Check the current work list.
- **@rules:** Check that the code you are writing complies with the standards.
- **Init:** When analyzing the project, produce solutions using the skills under `.agent/skills`.

## 🛠 Tech Stack Summary
- **Backend:** NestJS, TypeORM, PostgreSQL.
- **Frontend:** Next.js (Web), React Native/Expo (Mobile).
- **Styling:** Tailwind CSS & Shadcn/UI (according to RMS Theme Rules).
- **Services:** Redis, RabbitMQ, Elasticsearch.

## 🏗️ Project Structure
- **/backend**: The NestJS backend application.
- **/web**: The Next.js web application.
- **/mobile**: The React Native/Expo mobile application.
- **/docker**: Docker-related files and configurations.
- **/docs**: Project documentation.
- **/plans**: Development plans and project memory.
- **/.agent**: AI agent configurations, rules, and skills.

## 📜 Key Scripts

### Backend (`/backend`)
- `npm run start:dev`: Starts the backend in watch mode.
- `npm run build`: Builds the backend for production.
- `npm run test`: Runs backend tests.
- `npm run migration:run`: Runs database migrations.

### Frontend (`/web`)
- `npm run dev`: Starts the frontend development server on port 3003.
- `npm run build`: Builds the frontend for production.
- `npm run start`: Starts the frontend production server on port 3003.

### Mobile (`/mobile`)
- `npm run start`: Starts the mobile app development server.
- `npm run android`: Runs the mobile app on Android.
- `npm run ios`: Runs the mobile app on iOS.

## 🐳 Docker
- `docker-compose up -d`: Starts the services in detached mode.
- `docker-compose down`: Stops the services.
