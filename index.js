import express from "express";
const app = express();
import dotenv from "dotenv";
import cors from "cors";
// Load environment variables from .env file
dotenv.config();

//db connection
import "./db/conn.js";

//routes
import router from "./router/routes.js";

const port = process.env.PORT;

app.use(
  cors({
    origin: "http://localhost:3000", // Specify your client origin here
    credentials: true, // Allow credentials
  })
);

app.options(
  "*",
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000"); // Adjust the origin as needed
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});
app.use(express.json());
app.use(router);
app.listen(port, () => {
  console.log(`Server running at: http://localhost:${port}/`);
});
