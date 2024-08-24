import mongoose from "mongoose";
const rideSchema = new mongoose.Schema({
  PublisherID: {
    type: String,
    required: true,
  },
  from: {
    type: String,
    required: true,
  },
  to: {
    type: String,
    required: true,
  },
  no_of_pass: {
    type: String,
    required: true,
  },
  doj: {
    type: String,
    required: true,
  },
  arrivalTime: {
    type: String, // Store time as string in HH:mm format
    required: true,
  },
  departureTime: {
    type: String, // Store time as string in HH:mm format
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
});

const Ride = mongoose.model("Ride", rideSchema);

export default Ride;
