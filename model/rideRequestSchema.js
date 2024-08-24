import mongoose from "mongoose";

const rideRequestSchema = new mongoose.Schema(
  {
    requestee_id: {
      type: String,
      required: true,
    },
    ride_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ride",
      required: true,
    },
    publisher_id: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      default: "pending", // status can be 'pending', 'approved', 'rejected'
    },
  },
  { timestamps: true }
);
const RideRequest = mongoose.model("RideRequest", rideRequestSchema);
export default RideRequest;
