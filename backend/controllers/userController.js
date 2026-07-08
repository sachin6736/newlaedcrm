import User from "../models/User.js";

export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const { name, email, password, role = "user" } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, and password.",
      });
    }

    if (!["admin", "user"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be either admin or user.",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "A user with this email already exists.",
      });
    }

    const user = await User.create({ name, email, password, role });

    res.status(201).json({
      success: true,
      message: "User created successfully.",
      data: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        leadAssignmentEnabled: user.leadAssignmentEnabled,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateLeadAssignmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { leadAssignmentEnabled } = req.body;

    if (typeof leadAssignmentEnabled !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Lead assignment status must be true or false.",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (user.role !== "user") {
      return res.status(400).json({
        success: false,
        message: "Lead assignment can only be changed for users.",
      });
    }

    user.leadAssignmentEnabled = leadAssignmentEnabled;
    await user.save();

    res.status(200).json({
      success: true,
      message: leadAssignmentEnabled
        ? "Lead assignment resumed for this user."
        : "Lead assignment paused for this user.",
      data: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        leadAssignmentEnabled: user.leadAssignmentEnabled,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
