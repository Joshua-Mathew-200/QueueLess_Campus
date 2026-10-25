const User = require("../models/User");

async function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({
      message: "Please log in.",
    });
  }

  try {
    const user = await User.findById(req.session.userId);

    if (!user) {
      return res.status(401).json({
        message: "Please log in again.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

function requireStudent(req, res, next) {
  if (req.user.role !== "student") {
    return res.status(403).json({
      message: "Only students can perform this action.",
    });
  }

  next();
}

function requireStaff(req, res, next) {
  if (req.user.role !== "staff") {
    return res.status(403).json({
      message: "Only staff can perform this action.",
    });
  }

  next();
}

module.exports = {
  requireAuth,
  requireStudent,
  requireStaff,
};