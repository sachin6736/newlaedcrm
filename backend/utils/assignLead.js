import Lead from "../models/Lead.js";
import User from "../models/User.js";

export async function getNextAssignee() {
  const users = await User.find({ role: "user" }).sort({ createdAt: 1 });

  if (users.length === 0) {
    return null;
  }

  const lastAssignedLead = await Lead.findOne({ assignedTo: { $ne: null } })
    .sort({ createdAt: -1 })
    .select("assignedTo");

  if (!lastAssignedLead?.assignedTo) {
    return users[0]._id;
  }

  const lastIndex = users.findIndex((user) => user._id.equals(lastAssignedLead.assignedTo));
  const nextIndex = lastIndex === -1 ? 0 : (lastIndex + 1) % users.length;

  return users[nextIndex]._id;
}