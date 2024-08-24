import jwt from "jsonwebtoken";
import User from "../model/userSchema.js";
import dotenv from "dotenv";

dotenv.config();

const SECRET_KEY = process.env.SECRET_KEY;

const authenticate = async (req, res, next) => {
  try {
    const token = req.header("Authorization").replace("Bearer ", "");
    const decoded = jwt.verify(token, SECRET_KEY);
    const user = await User.findOne({ UID: decoded.UID });

    if (!user) {
      throw new Error("User not found");
    }

    req.rootUser = user; // Ensure you're using req.rootUser in your route
    req.token = token;
    next();
  } catch (error) {
    res.status(401).send({ error: "Authentication failed" });
  }
};

export default authenticate;
