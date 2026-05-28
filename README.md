# Week 2 Project

# 🔐 Authentication API (Node.js + TypeScript + PostgreSQL)

A secure authentication backend built with Express, TypeScript, PostgreSQL, JWT, Zod validation, and Swagger documentation. Includes refresh token rotation and role-based access control.

---

## 🚀 Features

- User registration and login
- JWT authentication (access + refresh tokens)
- Refresh token rotation (secure session handling)
- Logout (token invalidation)
- Role-based access control (user / admin)
- Protected routes middleware
- Input validation using Zod
- PostgreSQL database integration
- Swagger API documentation

---

## 🛠 Tech Stack

Node.js, Express.js, TypeScript, PostgreSQL, JWT (jsonwebtoken), Zod, Swagger (swagger-ui-express)

---

## 📁 Project Structure

src/config, src/controllers, src/db, src/middlewares, src/routes, app.ts

---

## ⚙️ Setup

npm install  
Create .env file:

PORT=5000  
DATABASE_URL=your_postgres_url  
JWT_SECRET=your_secret_key  

---

## ▶️ Run Project

Development: npm run dev  
Production: npm run build && npm start  

---

## 📡 API Endpoints

POST /auth/register → Register user  
POST /auth/login → Login user  
POST /auth/refresh → Refresh token  
POST /auth/logout → Logout user  
GET /auth/me → Get current user (protected)  
GET /auth/admin → Get all users (admin only)

---

## 🔐 Authentication

Use token in headers:

Authorization: Bearer <access_token>

---

## 📖 Swagger Documentation

http://localhost:5000/api-docs

---

## 🧠 Key Concepts

JWT authentication flow, refresh token rotation, middleware-based architecture, role-based access control, schema validation (Zod), modular Express structure

---

## 📌 Future Improvements

Rate limiting, email verification, password reset flow, OAuth login (Google/GitHub), centralized logging

---

## 👨‍💻 Author

Muhammad Umer — Backend Developer (PERN Stack)