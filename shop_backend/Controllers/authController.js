import jwt from "jsonwebtoken";
import User from "../Models/userModel.js";
import bcrypt from "bcrypt";

export const registerController = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res
        .status(400)
        .json({ status: false, message: "Email and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res
        .status(400)
        .json({ status: false, message: "User already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = new User({ email: normalizedEmail, password: hashedPassword });
    await newUser.save();

    res
      .status(201)
      .json({ status: true, message: "User registered successfully" });
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ status: false, message: "User already exists" });
    }
    res.status(500).json({ status: false, message: "Server error" });
  }
};

export const loginController = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res
        .status(400)
        .json({ status: false, message: "Email and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find the user by email
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res
        .status(401)
        .json({ status: false, message: "Invalid email or password" });
    }

    // Compare the passwords
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res
        .status(401)
        .json({ status: false, message: "Invalid email or password" });
    }

    // Generate a JWT token
    const jwtSecret = process.env.JWT_SECRET_KEY || "AmanIsDeveloper";
    const token = jwt.sign({ userId: user._id }, jwtSecret, {
      expiresIn: "1h",
    });

    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("token", token, {
      maxAge: 1000 * 60 * 60, // 1 hour
      httpOnly: true,
      secure: isProduction, // true on HTTPS prod
      sameSite: isProduction ? "None" : "Lax",
      path: "/",
    });

    return res.status(200).json({
      status: true,
      message: "Logged in",
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

export const logoutController = (req, res) => {
  const isProduction = process.env.NODE_ENV === "production";
  res.clearCookie("token", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "None" : "Lax",
    path: "/",
  });
  res.status(200).json({ status: true, message: "Logged out successfully" });
};

export const getUserController = async (req, res) => {
  try {
    // Get user
    const user = await User.findOne({ _id: req.user.userId });
    if (!user) {
      return res
        .status(404)
        .json({ status: false, message: "Unauthorized user" });
    }

    const { email, products, sales } = user;
    return res
      .status(200)
      .json({ status: true, data: { email, products, sales } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: "Server error" });
  }
};
