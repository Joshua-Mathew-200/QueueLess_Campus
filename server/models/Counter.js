const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: "main",
    },

    name: {
      type: String,
      default: "Campus Print Shop",
      required: true,
    },

    isOpen: {
      type: Boolean,
      default: false,
    },

    serviceDate: {
      type: String,
      required: true,
    },

    lastTokenNumber: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Counter", counterSchema);