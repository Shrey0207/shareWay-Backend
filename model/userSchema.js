import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
dotenv.config();

const SECRET_KEY = process.env.SECRET_KEY;

const userSchema = new mongoose.Schema({
  //UID : Student Registration Number OR Employee Registration Number
  UID: {
    type: String,
    required: true,
    unique: true,
  },
  //user_type to register type of user being a student, teacher, misc.
  user_type: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  phone: {
    type: Number,
    required: true,
  },
  designation: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },

  fname: {
    type: String,
    required: true,
  },
  lname: {
    type: String,
    required: true,
  },

  rating: {
    type: Number,
    required: false,
  },

  postedRides: [{ type: mongoose.Schema.Types.ObjectId, ref: "Ride" }],
  requestedRides: [
    { type: mongoose.Schema.Types.ObjectId, ref: "RideRequest" },
  ],
  // tokens: [
  //   {
  //     token: {
  //       type: String,
  //       required: true,
  //     },
  //   },
  // ],
});

// Hash the password before saving
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

userSchema.methods.generateAuthToken = async function () {
  try {
    let token = jwt.sign(
      { UID: this.UID, fname: this.fname, lname: this.lname },
      SECRET_KEY
    );
    // this.tokens = this.tokens.concat({ token: token });
    // await this.save();
    // console.log("userSchema/generateAuthToken : " + token);
    return token;
  } catch (err) {
    {
      console.log(err);
    }
  }
};

// Method to compare passwords
userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

const User = mongoose.model("USERR", userSchema);

export default User;
