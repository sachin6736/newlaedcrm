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
    zip: {
      type: String,
      required: true,
      trim: true,
    },
    partRequested: {
      type: String,
      required: false,
      trim: true,
    },
    make: {
      type: String,
      required: true,
      trim: true,
    },
    model: {
      type: String,
      required: true,
      trim: true,
    },
    year: {
      type: String,
      required: false,
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
        "Already ordered",
      ],
      default: "Quoted",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    followUpAt: {
      type: Date,
      default: null,
    },
    followUpNote: {
      type: String,
      trim: true,
      default: "",
    },
    followUpSetBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    followUpRemindedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Lead", leadSchema);
