import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    disposition: {
      type: String,
      enum: [
        "Quoted",
        "No Response",
        "Wrong Number",
        "Not Interested",
        "Price too high",
        "Part not available",
        "Ordered",
      ],
      default: "Quoted",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Lead", leadSchema);
