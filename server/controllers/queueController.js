const mongoose = require("mongoose");
const Counter = require("../models/Counter");
const Token = require("../models/Token");

function formatToken(token) {
  if (!token) return null;

  return {
    id: token._id,
    label: `P-${String(token.number).padStart(2, "0")}`,
    number: token.number,
    serviceDate: token.serviceDate,
    status: token.status,
  };
}

async function getQueueStatus(req, res, next) {
  try {
    const counter = await Counter.findById("main");

    if (!counter) {
      return res.status(503).json({
        message: "The counter is not ready. Please try again.",
      });
    }

    const myToken = await Token.findOne({
      counter: "main",
      student: req.user._id,
      active: true,
    });

    const calledToken = await Token.findOne({
      counter: "main",
      status: "Called",
    });

    const waitingCount = await Token.countDocuments({
      counter: "main",
      status: "Waiting",
    });

    let peopleAhead = null;

    if (myToken) {
      peopleAhead = await Token.countDocuments({
        counter: "main",
        serviceDate: myToken.serviceDate,
        active: true,
        number: { $lt: myToken.number },
      });
    }

    res.set("Cache-Control", "no-store");

    res.json({
      counter: {
        name: counter.name,
        isOpen: counter.isOpen,
        serviceDate: counter.serviceDate,
      },
      currentToken: formatToken(calledToken),
      myToken: formatToken(myToken),
      waitingCount,
      peopleAhead,
    });
  } catch (error) {
    next(error);
  }
}

function todayInIndia() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const part = (type) =>
    parts.find((item) => item.type === type).value;

  return `${part("year")}-${part("month")}-${part("day")}`;
}

async function setAdmission(req, res, next) {
  const { isOpen } = req.body || {};

  if (typeof isOpen !== "boolean") {
    return res.status(400).json({
      message: "isOpen must be true or false.",
    });
  }

  try {
    let result;

    await mongoose.connection.transaction(async (session) => {
      // Coordinate changes to this counter.
      const counter = await Counter.findOneAndUpdate(
        { _id: "main" },
        { $inc: { __v: 1 } },
        { new: true, session }
      );

      if (!counter) {
        const error = new Error("Counter is not ready.");
        error.status = 503;
        throw error;
      }

      const today = todayInIndia();

      if (isOpen && counter.serviceDate !== today) {
        const activeToken = await Token.findOne({
          counter: "main",
          active: true,
        }).session(session);

        if (activeToken) {
          const error = new Error(
            "Resolve the previous day's active tokens first."
          );
          error.status = 409;
          throw error;
        }

        counter.serviceDate = today;
        counter.lastTokenNumber = 0;
      }

      counter.isOpen = isOpen;
      await counter.save({ session });

      result = {
        name: counter.name,
        isOpen: counter.isOpen,
        serviceDate: counter.serviceDate,
      };
    });

    res.json({
      message: isOpen ? "Queue opened." : "Queue closed.",
      counter: result,
    });
  } catch (error) {
    if (error.status === 409 || error.status === 503) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    next(error);
  }
}

async function joinQueue(req, res, next) {
  try {
    let createdToken;

    await mongoose.connection.transaction(async (session) => {
      const counter = await Counter.findOneAndUpdate(
        { _id: "main" },
        { $inc: { __v: 1 } },
        { new: true, session }
      );

      if (!counter) {
        const error = new Error("Counter is not ready.");
        error.status = 503;
        throw error;
      }

      if (
        !counter.isOpen ||
        counter.serviceDate !== todayInIndia()
      ) {
        const error = new Error("The queue is currently closed.");
        error.status = 409;
        throw error;
      }

      const existingToken = await Token.findOne({
        counter: "main",
        student: req.user._id,
        active: true,
      }).session(session);

      if (existingToken) {
        const error = new Error(
          "You already have an active token."
        );
        error.status = 409;
        throw error;
      }

      counter.lastTokenNumber += 1;
      await counter.save({ session });

      const tokens = await Token.create(
        [
          {
            student: req.user._id,
            counter: "main",
            serviceDate: counter.serviceDate,
            number: counter.lastTokenNumber,
            status: "Waiting",
            active: true,
          },
        ],
        { session }
      );

      createdToken = tokens[0];
    });

    res.status(201).json({
      message: "You joined the queue.",
      token: formatToken(createdToken),
    });
  } catch (error) {
    if (error.status === 409 || error.status === 503) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Queue changed. Refresh before trying again.",
      });
    }

    next(error);
  }
}
async function callNext(req, res, next) {
  try {
    let calledToken;

    await mongoose.connection.transaction(async (session) => {
      const counter = await Counter.findOneAndUpdate(
        { _id: "main" },
        { $inc: { __v: 1 } },
        { new: true, session }
      );

      if (!counter) {
        const error = new Error("Counter is not ready.");
        error.status = 503;
        throw error;
      }

      const currentToken = await Token.findOne({
        counter: "main",
        status: "Called",
      }).session(session);

      if (currentToken) {
        const error = new Error(
          "Complete or skip the current student first."
        );
        error.status = 409;
        throw error;
      }

      calledToken = await Token.findOneAndUpdate(
        {
          counter: "main",
          serviceDate: counter.serviceDate,
          status: "Waiting",
          active: true,
        },
        {
          $set: {
            status: "Called",
            calledAt: new Date(),
          },
        },
        {
          sort: { number: 1 },
          new: true,
          session,
          runValidators: true,
        }
      );

      if (!calledToken) {
        const error = new Error("No students are waiting.");
        error.status = 409;
        throw error;
      }
    });

    res.json({
      message: `Calling ${formatToken(calledToken).label}.`,
      token: formatToken(calledToken),
    });
  } catch (error) {
    if (error.status === 409 || error.status === 503) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    next(error);
  }
}
async function resolveToken(req, res, next) {
  const { tokenId, status } = req.body || {};

  if (
    typeof tokenId !== "string" ||
    !mongoose.isObjectIdOrHexString(tokenId) ||
    !["Completed", "Skipped"].includes(status)
  ) {
    return res.status(400).json({
      message: "Provide a valid token and resolution status.",
    });
  }

  try {
    let resolvedToken;

    await mongoose.connection.transaction(async (session) => {
      const counter = await Counter.findOneAndUpdate(
        { _id: "main" },
        { $inc: { __v: 1 } },
        { new: true, session }
      );

      if (!counter) {
        const error = new Error("Counter is not ready.");
        error.status = 503;
        throw error;
      }

      resolvedToken = await Token.findOneAndUpdate(
        {
          _id: tokenId,
          counter: "main",
          status: "Called",
          active: true,
        },
        {
          $set: {
            status,
            active: false,
            resolvedAt: new Date(),
          },
        },
        {
          new: true,
          session,
          runValidators: true,
        }
      );

      if (!resolvedToken) {
        const error = new Error(
          "This token is no longer awaiting service. Refresh the queue."
        );
        error.status = 409;
        throw error;
      }
    });

    res.json({
      message: `${formatToken(resolvedToken).label} marked as ${status}.`,
      token: formatToken(resolvedToken),
    });
  } catch (error) {
    if (error.status === 409 || error.status === 503) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    next(error);
  }
}
async function cancelToken(req, res, next) {
  const { tokenId } = req.body || {};

  if (
    typeof tokenId !== "string" ||
    !mongoose.isObjectIdOrHexString(tokenId)
  ) {
    return res.status(400).json({
      message: "Provide a valid token.",
    });
  }

  try {
    const token = await Token.findOneAndUpdate(
      {
        _id: tokenId,
        student: req.user._id,
        counter: "main",
        status: "Waiting",
        active: true,
      },
      {
        $set: {
          status: "Cancelled",
          active: false,
          resolvedAt: new Date(),
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!token) {
      return res.status(409).json({
        message: "Only your own waiting token can be cancelled.",
      });
    }

    res.json({
      message: `${formatToken(token).label} cancelled.`,
      token: formatToken(token),
    });
  } catch (error) {
    next(error);
  }
}
async function getMyHistory(req, res, next) {
  const pageText = req.query.page ?? "1";

  if (
    typeof pageText !== "string" ||
    !/^[1-9]\d*$/.test(pageText)
  ) {
    return res.status(400).json({
      message: "Page must be a positive whole number.",
    });
  }

  const page = Number(pageText);
  const limit = 10;

  if (!Number.isSafeInteger(page) || page > 10000) {
    return res.status(400).json({
      message: "Page number is too large.",
    });
  }

  try {
    const filter = {
      counter: "main",
      student: req.user._id,
      active: false,
    };

    const total = await Token.countDocuments(filter);

    const tokens = await Token.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.set("Cache-Control", "no-store");

    res.json({
      tokens: tokens.map((token) => ({
        ...formatToken(token),
        createdAt: token.createdAt,
        resolvedAt: token.resolvedAt,
      })),
      page,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
}
async function getDailyStats(req, res, next) {
  try {
    const serviceDate = todayInIndia();

    const results = await Token.aggregate([
      {
        $match: {
          counter: "main",
          serviceDate,
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const counts = {
      Waiting: 0,
      Called: 0,
      Completed: 0,
      Cancelled: 0,
      Skipped: 0,
    };

    for (const item of results) {
      counts[item._id] = item.count;
    }

    const totalIssued = Object.values(counts).reduce(
      (total, count) => total + count,
      0
    );

    res.set("Cache-Control", "no-store");

    res.json({
      serviceDate,
      totalIssued,
      counts,
    });
  } catch (error) {
    next(error);
  }
}
module.exports = {
  getQueueStatus,
  setAdmission,
  joinQueue,
  callNext,
  resolveToken,
  cancelToken,
  getMyHistory,
  getDailyStats,
};