import jwt from "jsonwebtoken";
import User from "../models/User.js";
 
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};
 
const ensureBootstrapAdmin = async (user) => {
  const adminCount = await User.countDocuments({ role: "admin" });

  if (adminCount === 0) {
    user.role = "admin";
    await user.save();
  }

  return user;
};
 
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
 
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password.",
      });
    }
 
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    await ensureBootstrapAdmin(user);
 
    res.status(200).json({
      success: true,
      token: generateToken(user._id),
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};