let io;

export const setSocketServer = (socketServer) => {
  io = socketServer;
};

/** Send a new-lead alert only to the assignee and CRM administrators. */
export const emitLeadCreated = (lead) => {
  if (!io) {
    return;
  }

  const payload = lead.toObject ? lead.toObject() : lead;
  const assigneeId = payload.assignedTo?._id ?? payload.assignedTo;

  if (assigneeId) {
    io.to(`user:${assigneeId}`).emit("lead:created", payload);
  }

  io.to("admins").emit("lead:created", payload);
};
