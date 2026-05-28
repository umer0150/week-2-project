import express from "express";
import { env } from "./config/env";
import "./db/pool";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";

import authRouter from "./routes/auth.routes";

const app = express();

app.use(express.json());

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec)
);

app.use("/auth", authRouter);


app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
});