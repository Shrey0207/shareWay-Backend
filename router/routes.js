import mongoose from "mongoose";
import express from "express";
const router = express.Router();
import jwt from "jsonwebtoken";
import User from "../model/userSchema.js";
import dotenv from "dotenv";
import authenticate from "../middleware/Authenticate.js";
import Ride from "../model/rideSchema.js";
import RideRequest from "../model/rideRequestSchema.js";
import moment from "moment";

dotenv.config();

router.get("/", (req, res) => {
  res.send("Welcome to NATIONAL INSTITUTE OF TECHNOLOGY's CAR POOL SYSTEM");
});

router.post("/user/register", async (req, res) => {
  const { UID, user_type, fname, lname, email, designation, phone, password } =
    req.body;
  // console.log(req.body);
  try {
    const existingUser = await User.findOne({ UID });
    if (existingUser) {
      return res
        .status(400)
        .send("UID already exists. Please contact the administrator.");
    }
    const user = new User({
      UID,
      user_type,
      fname,
      lname,
      email,
      designation,
      phone,
      password,
    });
    await user.save();
    // console.log(user);
    res.status(201).send("USER registered successfully");
  } catch (error) {
    console.log(error);
  }
});
router.post("/user/login", async (req, res) => {
  const { UID, password } = req.body;
  // console.log("UID : " + UID);
  try {
    const user = await User.findOne({ UID });
    if (user) {
      const isMatch = await user.comparePassword(password);
      if (isMatch) {
        // console.log("Successful sign in");
        const token = await user.generateAuthToken();
        // console.log("Token /routes/ -> " + token);
        res.status(200).send({ user, token });
      } else {
        console.log("Wrong Password");
        res.status(401).send("Wrong Password");
      }
    } else {
      res.status(401).send("INVALID UID");
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("Server error");
  }
});

router.post("/users/:UID/rides", async (req, res) => {
  const { UID } = req.params;
  const { from, to, no_of_pass, doj, arrivalTime, departureTime, price } =
    req.body;

  // Ensure that the ride is not in the past
  const currentDate = moment().format("YYYY-MM-DD");
  if (moment(doj).isBefore(currentDate)) {
    return res.status(400).json({ message: "Cannot post a ride in the past." });
  }

  try {
    const user = await User.findOne({ UID: UID });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const ride = new Ride({
      PublisherID: UID,
      from,
      to,
      no_of_pass,
      doj,
      arrivalTime,
      departureTime,
      price,
    });

    await ride.save();
    user.postedRides.push(ride._id);
    await user.save();

    res.send("Ride published successfully");
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/user/:UID/rides", authenticate, async (req, res) => {
  const { UID } = req.params;

  try {
    // Get the current date without the time part
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    // Find all rides posted by the user
    const userRides = await Ride.find({
      PublisherID: UID,
    });

    // Filter the rides where the date of journey is today or in the future
    const filteredRides = userRides.filter((ride) => {
      const rideDate = new Date(ride.doj); // Convert the doj string to a Date object
      rideDate.setHours(0, 0, 0, 0); // Ignore time part for comparison
      return rideDate >= currentDate; // Compare with the current date
    });

    res.status(200).json(filteredRides);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch rides" });
  }
});

router.get("/user/dashboard", authenticate, function (req, res) {
  try {
    console.log("Hello from GET /user/dashboard");

    // Extract only the necessary information you want to send
    const userInfo = {
      UID: req.rootUser.UID,
      fname: req.rootUser.fname.trim(),
      lname: req.rootUser.lname.trim(),
      email: req.rootUser.email,
      phone: req.rootUser.phone,
      user_type: req.rootUser.user_type,
      postedRides: req.rootUser.postedRides,
      requestedRides: req.rootUser.requestedRides,
    };

    // Send the structured response
    res.status(200).json({ success: true, user: userInfo });
  } catch (error) {
    console.error("Error fetching user dashboard data:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.get("/user/data/:UID", async (req, res) => {
  const UID = req.params.UID;
  try {
    const data = await User.findOne({ UID });
    res.send(data);
  } catch (err) {
    console.log(err);
  }
});

// router.get("/rides/all", async (req, res) => {
//   try {
//     const query = {};
//     if (req.query.from_location) query.from_location = req.query.from_location;
//     if (req.query.to_location) query.to_location = req.query.to_location;
//     if (req.query.doj) query.doj = req.query.doj;
//     if (req.query.price) query.price = req.query.price;

//     // Fetch rides
//     const rides = await Ride.find(query);

//     // Fetch publisher details for each ride
//     const ridesWithPublisherDetails = await Promise.all(
//       rides.map(async (ride) => {
//         const user = await User.findOne({ UID: ride.PublisherID });
//         return {
//           ...ride.toObject(),
//           publisher_fname: user ? user.fname : "Unknown",
//           publisher_lname: user ? user.lname : "Unknown",
//         };
//       })
//     );

//     res.status(200).json(ridesWithPublisherDetails);
//   } catch (err) {
//     console.log(err);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// });
router.get("/rides/search", async (req, res) => {
  try {
    const { from_location, to_location, doj, seats = 1 } = req.query;

    const query = {};

    if (from_location) query.from = from_location;
    if (to_location) query.to = to_location;

    // Handle date filtering
    if (doj) {
      query.doj = doj;
    } else {
      // If date is not provided, show all future rides
      const currentDate = new Date().toISOString().split("T")[0]; // Get current date in YYYY-MM-DD format
      query.doj = { $gte: currentDate };
    }

    // Filter based on seat availability
    query.no_of_pass = { $gte: parseInt(seats) };

    // Fetch rides based on query
    const rides = await Ride.find(query);

    // Fetch publisher details for each ride
    const ridesWithPublisherDetails = await Promise.all(
      rides.map(async (ride) => {
        const user = await User.findOne({ UID: ride.PublisherID });
        return {
          ...ride.toObject(),
          publisher_fname: user ? user.fname : "Unknown",
          publisher_lname: user ? user.lname : "Unknown",
        };
      })
    );

    res.status(200).json(ridesWithPublisherDetails);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/rides/future", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0]; // Get today's date in YYYY-MM-DD format
    const rides = await Ride.find({ doj: { $gte: today } });

    // Fetch publisher details for each ride
    const ridesWithPublisherDetails = await Promise.all(
      rides.map(async (ride) => {
        const user = await User.findOne({ UID: ride.PublisherID });
        return {
          ...ride.toObject(),
          publisher_fname: user ? user.fname : "Unknown",
          publisher_lname: user ? user.lname : "Unknown",
        };
      })
    );

    res.status(200).json(ridesWithPublisherDetails);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Request to be added to a ride by another user
router.post("/users/:uid/requests", async (req, res) => {
  try {
    const { publisher_id, ride_id } = req.body;
    const { uid } = req.params;

    // Debug: Log the UID to ensure it's being received correctly
    // console.log("UID from params:", uid);

    // Query the user by the correct field name
    const user = await User.findOne({ UID: uid }); // Adjust field name based on your schema
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the ride exists and fetch the number of available seats
    const ride = await Ride.findById(ride_id);
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }
    if (ride.no_of_pass <= 0) {
      return res.status(400).json({ message: "Seats not available" });
    }

    // Check if the requestee has already requested this ride
    const existingRequest = await RideRequest.findOne({
      requestee_id: uid,
      ride_id,
    });
    if (existingRequest) {
      return res.status(400).json({ message: "Ride already requested" });
    }

    // Create a new ride request
    const newRequest = new RideRequest({
      requestee_id: uid,
      ride_id,
      publisher_id,
      status: "pending",
    });
    await newRequest.save();

    // Add the request to the user's requestedRides array
    user.requestedRides.push(newRequest._id);
    await user.save();

    res.status(200).json({ message: "Ride requested successfully" });
  } catch (err) {
    res.status(500).json({ message: `Server error: ${err.message}` });
  }
});

// Backend route to get requested rides
router.get("/users/:uid/requests", async (req, res) => {
  try {
    const { uid } = req.params;
    // console.log("UID from params:", uid);

    // Find the user by UID
    const user = await User.findOne({ UID: uid });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Fetch the ride requests where the user is the requestee
    const requests = await RideRequest.find({
      requestee_id: uid,
    }).populate("ride_id");
    // console.log("Requests found:", requests);

    res.status(200).json(requests);
  } catch (err) {
    res.status(500).json({ message: `Server error: ${err.message}` });
  }
});
router.get("/users/:uid/requeststatus", async (req, res) => {
  try {
    const { uid } = req.params;
    const today = new Date().toISOString().split("T")[0]; // Get today's date in YYYY-MM-DD format

    // Step 1: Find the user by UID
    const user = await User.findOne({ UID: uid }).populate("requestedRides");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Step 2: Find all ride requests of the user
    const rideRequests = await RideRequest.find({
      _id: { $in: user.requestedRides },
    }).populate("ride_id"); // Populate ride_id to get ride details

    // Step 3: Prepare a list to store detailed information
    const detailedRequests = [];

    for (const rideRequest of rideRequests) {
      // Get ride details
      const ride = await Ride.findById(rideRequest.ride_id);

      if (!ride) {
        console.log(`Ride not found for request ${rideRequest._id}`);
        continue;
      }

      // Filter by date of journey, only include today's or future rides
      const rideDate = new Date(ride.doj).toISOString().split("T")[0];
      if (rideDate < today) {
        continue; // Skip rides in the past
      }

      // Get publisher details
      const publisher = await User.findOne({ UID: ride.PublisherID });

      if (!publisher) {
        console.log(`Publisher not found for ride ${ride._id}`);
        continue;
      }

      // Prepare the detailed information
      const requestDetail = {
        requestID: rideRequest._id,
        rideID: ride._id,
        from: ride.from,
        to: ride.to,
        doj: ride.doj,
        seatsAvailable: ride.no_of_pass,
        price: ride.price,
        arrivalTime: ride.arrivalTime, // Include arrival time
        departureTime: ride.departureTime, // Include departure time
        requestStatus: rideRequest.status,
        publisherName: `${publisher.fname} ${publisher.lname}`,
        publisherEmail: publisher.email, // Add email
        publisherPhone: publisher.phone, // Add phone
      };

      detailedRequests.push(requestDetail);
    }

    // Log detailed requests to the console
    // console.log("Detailed Requests:", detailedRequests);

    // Send the detailed requests as a response
    res.status(200).json(detailedRequests);
  } catch (err) {
    console.error("Server error:", err.message);
    res.status(500).json({ message: `Server error: ${err.message}` });
  }
});

// Route to get ride details by slug (MongoDB ObjectId)
router.get("/rides/:slug/requests", async (req, res) => {
  try {
    const { slug } = req.params;

    // Validate the MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(slug)) {
      return res.status(400).json({ message: "Invalid ride ID" });
    }

    // Find the ride by ObjectId
    const ride = await Ride.findById(slug);

    // If the ride is not found
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    // Return the ride details
    res.status(200).json(ride);
  } catch (error) {
    console.error("Error fetching ride details:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/rides/:rideId/requesters", async (req, res) => {
  const { rideId } = req.params;

  try {
    // Find all ride requests with the specified ride_id
    const rideRequests = await RideRequest.find({ ride_id: rideId });

    // Log ride requests for debugging
    // console.log("Ride Requests:", rideRequests);

    // If no requests found, return an empty array
    if (rideRequests.length === 0) {
      return res.json({ requests: [] });
    }

    // Iterate over rideRequests to fetch user details based on UID
    const requestsWithUserDetails = await Promise.all(
      rideRequests.map(async (request) => {
        const user = await User.findOne({ UID: request.requestee_id });

        return {
          ...request._doc,
          requesteeName: `${user?.fname || "N/A"} ${user?.lname || "N/A"}`,
          requesteeEmail: user?.email || "N/A",
          requesteePhone: user?.phone || "N/A",
        };
      })
    );

    // Send the combined data to the frontend
    res.json({ requests: requestsWithUserDetails });
  } catch (error) {
    console.error("Error fetching ride requests:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
// Route to update the status of a ride request
router.put("/rides/:rideId/request/:requestId", async (req, res) => {
  const { rideId, requestId } = req.params;
  const { status } = req.body;

  try {
    // Validate the status
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // Find the ride
    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    // Find the request by ID and update its status
    const updatedRequest = await RideRequest.findByIdAndUpdate(
      requestId,
      { status },
      { new: true }
    );

    // If the request is not found
    if (!updatedRequest) {
      return res.status(404).json({ message: "Request not found" });
    }

    // If the request is approved, decrease the number of available seats
    if (status === "approved") {
      ride.no_of_pass = (parseInt(ride.no_of_pass, 10) - 1).toString();
      await ride.save();
    }

    res
      .status(200)
      .json({ message: `Request ${status} successfully`, updatedRequest });
  } catch (error) {
    console.error("Error updating request status:", error);
    res.status(500).json({ message: "Server error" });
  }
});

//completed rides returning route
router.get("/user/:uid/completedrides", async (req, res) => {
  const { uid } = req.params;
  const currentDate = moment().format("YYYY-MM-DD");

  try {
    // Find the user by UID
    const user = await User.findOne({ UID: uid })
      .populate("postedRides")
      .populate("requestedRides");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get old posted rides
    const oldPostedRides = user.postedRides
      .filter((ride) => moment(ride.doj).isBefore(currentDate))
      .map((ride) => ({
        ...ride.toObject(),
        isRequestedRide: false, // Add a flag to differentiate
      }));

    // Get old requested rides and publisher info
    let oldRequestedRides = [];
    for (let request of user.requestedRides) {
      const ride = await Ride.findById(request.ride_id);
      if (ride && moment(ride.doj).isBefore(currentDate)) {
        const publisher = await User.findOne({ UID: ride.PublisherID });
        oldRequestedRides.push({
          ...ride.toObject(),
          status: request.status,
          publisherName: `${publisher.fname} ${publisher.lname}`, // Add publisher's name
          isRequestedRide: true, // Add a flag to differentiate
        });
      }
    }

    // Merge and sort both arrays by date in descending order
    const allRides = [...oldPostedRides, ...oldRequestedRides].sort((a, b) =>
      moment(b.doj).diff(moment(a.doj))
    );

    res.json({ allRides });
  } catch (error) {
    console.error("Error fetching completed rides:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/ride/details/:rideId", async (req, res) => {
  const { rideId } = req.params;
  try {
    const ride = await Ride.findById(rideId);
    if (!ride) {
      console.log("Ride not found");
      return res.status(404).json({ message: "Ride not found" });
    }

    const pendingRequests = await RideRequest.find({
      ride_id: rideId,
      status: "pending",
    });

    const acceptedRequests = await RideRequest.find({
      ride_id: rideId,
      status: "approved",
    });

    const rejectedRequests = await RideRequest.find({
      ride_id: rideId,
      status: "rejected",
    });

    // Fetch user details for pending requests
    const pendingRequestUsers = await Promise.all(
      pendingRequests.map(async (request) => {
        const user = await User.findOne({ UID: request.requestee_id });
        return {
          ...request.toObject(),
          requestee_name: `${user.fname} ${user.lname}`,
          requestee_id: user.UID,
        };
      })
    );

    // Fetch user details for accepted requests
    const acceptedRequestUsers = await Promise.all(
      acceptedRequests.map(async (request) => {
        const user = await User.findOne({ UID: request.requestee_id });
        return {
          ...request.toObject(),
          requestee_name: `${user.fname} ${user.lname}`,
          requestee_id: user.UID,
        };
      })
    );

    // Fetch user details for rejected requests
    const rejectedRequestUsers = await Promise.all(
      rejectedRequests.map(async (request) => {
        const user = await User.findOne({ UID: request.requestee_id });
        return {
          ...request.toObject(),
          requestee_name: `${user.fname} ${user.lname}`,
          requestee_id: user.UID,
        };
      })
    );

    res.status(200).json({
      ride,
      pendingRequests: pendingRequestUsers,
      acceptedRequests: acceptedRequestUsers,
      rejectedRequests: rejectedRequestUsers,
    });
  } catch (error) {
    console.error("Server error:", error); // Log the exact error
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
