import Lead from "../models/Lead.js";
import User from "../models/User.js";

const EXTERNAL_SOURCES = ["website", "facebook", "other"];

async function getRoundRobinFilter() {
  const adminIds = await User.find({ role: "admin" }).distinct("_id");

  return {
    assignedTo: { $ne: null },
    $or: [
      { source: { $in: EXTERNAL_SOURCES } },
      { createdBy: { $in: adminIds } },
    ],
  };
}

export async function getNextAssignee() {
  const users = await User.find({
    role: "user",
    leadAssignmentEnabled: { $ne: false },
  }).sort({ createdAt: 1 });

  if (users.length === 0) {
    return null;
  }

  const lastAssignedLead = await Lead.findOne(await getRoundRobinFilter())
    .sort({ createdAt: -1 })
    .select("assignedTo");

  if (!lastAssignedLead?.assignedTo) {
    return users[0]._id;
  }

  const lastIndex = users.findIndex((user) => user._id.equals(lastAssignedLead.assignedTo));
  const nextIndex = lastIndex === -1 ? 0 : (lastIndex + 1) % users.length;

  return users[nextIndex]._id;
}

export async function resolveAssignmentForCreator(user) {
  if (user.role === "user") {
    return user._id;
  }

  return getNextAssignee();
}
