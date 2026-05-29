import express from "express";
import { env } from "./config/env";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";

import authRouter from "./routes/auth.routes";
import userRouter from "./routes/user.routes";
import { connectDB } from "./db/pool";

const app = express();

// middleware
app.use(express.json());

// swagger docs
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec)
);

// routes
app.use("/auth", authRouter);
app.use("/users", userRouter);

// start server
const startServer = async () => {
  try {
    await connectDB();

    app.listen(env.PORT, () => {
      console.log(`Server running on port ${env.PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();