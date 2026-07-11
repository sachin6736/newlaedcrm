import { EventEmitter } from "events";

const leadEvents = new EventEmitter();
// Many concurrent SSE clients are expected in multi-user CRM use.
leadEvents.setMaxListeners(0);

export const emitLeadCreated = (lead) => {
  leadEvents.emit("lead:created", lead);
};

export const onLeadCreated = (listener) => {
  leadEvents.on("lead:created", listener);
  return () => leadEvents.off("lead:created", listener);
};
