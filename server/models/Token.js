const mongoose = require("mongoose");

const tokenSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    counter: {
      type: String,
      ref: "Counter",
      default: "main",
      required: true,
    },

    serviceDate: {
      type: String,
      required: true,
    },

    number: {
      type: Number,
      required: true,
      min: 1,
    },

    status: {
      type: String,
      enum: [
        "Waiting",
        "Called",
        "Completed",
        "Cancelled",
        "Skipped",
      ],
      default: "Waiting",
      required: true,
    },

    active: {
      type: Boolean,
      default: true,
      required: true,
    },

    calledAt: {
      type: Date,
      default: null,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// No duplicate token numbers for the same counter and date.
tokenSchema.index(
  { counter: 1, serviceDate: 1, number: 1 },
  { unique: true }
);

// A student can have only one active token per counter.
tokenSchema.index(
  { counter: 1, student: 1 },
  {
    unique: true,
    partialFilterExpression: { active: true },
  }
);

// Only one student can be called at a counter at a time.
tokenSchema.index(
  { counter: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "Called" },
  }
);

module.exports = mongoose.model("Token", tokenSchema);