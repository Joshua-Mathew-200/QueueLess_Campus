const bcrypt = require("bcryptjs");
const User = require("../models/User");

async function register(req, res) {
  const { name, email, password } = req.body || {};

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    return res.status(400).json({
      message: "Name, email and password are required.",
    });
  }

  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanName || cleanName.length > 100) {
    return res.status(400).json({
      message: "Name must contain 1 to 100 characters.",
    });
  }

  if (
    cleanEmail.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
  ) {
    return res.status(400).json({
      message: "Enter a valid email address.",
    });
  }

  if (
    password.length < 8 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    return res.status(400).json({
      message: "Use at least 8 characters and at most 72 bytes for the password.",
    });
  }

  try {
    const existingUser = await User.findOne({
      email: cleanEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "This email is already registered.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      role: "student",
    });

    return res.status(201).json({
      message: "Student registered successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "This email is already registered.",
      });
    }

    console.error("Registration failed:", error.name);

    return res.status(500).json({
      message: "Registration failed. Please try again.",
    });
  }
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

async function login(req, res, next) {
  const { email, password } = req.body || {};

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    email.length > 254 ||
    !password ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    return res.status(400).json({
      message: "Enter a valid email and password.",
    });
  }

  try {
    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+passwordHash");

    const matches = user
      ? await bcrypt.compare(password, user.passwordHash)
      : false;

    if (!matches) {
      return res.status(401).json({
        message: "Incorrect email or password.",
      });
    }

    req.session.regenerate((error) => {
      if (error) return next(error);

      req.session.userId = user._id.toString();

      req.session.save((error) => {
        if (error) return next(error);

        res.json({
          message: "Logged in successfully.",
          user: publicUser(user),
        });
      });
    });
  } catch (error) {
    next(error);
  }
}

async function getMe(req, res, next) {
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

    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
}

function logout(req, res, next) {
  req.session.destroy((error) => {
    if (error) return next(error);

    res.clearCookie("queueless.sid", {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    res.json({
      message: "Logged out successfully.",
    });
  });
}

module.exports = { register, login, getMe, logout };