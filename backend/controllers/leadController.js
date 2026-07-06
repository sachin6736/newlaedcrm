import Lead from "../models/Lead.js";
import { getNextAssignee, resolveAssignmentForCreator } from "../utils/assignLead.js";

const DEFAULT_PAGE_SIZE = 10;
const EXTERNAL_SOURCES = ["website", "facebook", "other"];

const buildDateExpression = ({ year, month, day } = {}) => {
  const parts = [];

  if (year && year !== "all") {
    parts.push({ $eq: [{ $year: "$createdAt" }, Number(year)] });
  }

  if (month && month !== "all") {
    parts.push({ $eq: [{ $month: "$createdAt" }, Number(month)] });
  }

  if (day && day !== "all") {
    parts.push({ $eq: [{ $dayOfMonth: "$createdAt" }, Number(day)] });
  }

  if (parts.length === 0) {
    return null;
  }

  if (parts.length === 1) {
    return parts[0];
  }

  return { $and: parts };
};

const SEARCH_FIELDS = ["name", "email", "phone", "make", "model", "year", "partRequested", "notes"];

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildSearchFilter = (search) => {
  const term = search?.trim();

  if (!term) {
    return null;
  }

  const pattern = escapeRegex(term);

  return {
    $or: SEARCH_FIELDS.map((field) => ({
      [field]: { $regex: pattern, $options: "i" },
    })),
  };
};

const buildLeadFilter = ({ disposition, year, month, day, search } = {}) => {
  const conditions = [];

  if (disposition && disposition !== "all") {
    conditions.push({ disposition });
  }

  const dateExpression = buildDateExpression({ year, month, day });

  if (dateExpression) {
    conditions.push({ $expr: dateExpression });
  }

  const searchFilter = buildSearchFilter(search);

  if (searchFilter) {
    conditions.push(searchFilter);
  }

  if (conditions.length === 0) {
    return {};
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return { $and: conditions };
};

export const getLeads = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(Number(req.query.limit) || DEFAULT_PAGE_SIZE, 1);
    const skip = (page - 1) * limit;
    const disposition = req.query.disposition || "all";
    const year = req.query.year || "all";
    const month = req.query.month || "all";
    const day = req.query.day || "all";
    const search = req.query.search?.trim() || "";
    const listFilter = buildLeadFilter({ disposition, year, month, day, search });
    const dateOptionsFilter = buildLeadFilter({ disposition, search });

    const [leads, total, quoted, ordered, availableDates] = await Promise.all([
      populateLeadFields(Lead.find(listFilter))
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Lead.countDocuments(listFilter),
      Lead.countDocuments({ ...listFilter, disposition: "Quoted" }),
      Lead.countDocuments({ ...listFilter, disposition: "Ordered" }),
      Lead.aggregate([
        { $match: dateOptionsFilter },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: -1 } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: leads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: skip + leads.length < total,
        hasPreviousPage: page > 1,
      },
      stats: {
        total,
        quoted,
        ordered,
        availableDates: availableDates.map(({ _id, count }) => ({
          date: _id,
          count,
        })),
      },
      filters: {
        disposition,
        year,
        month,
        day,
        search,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createLead = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      zip,
      partRequested,
      make,
      model,
      year,
      disposition = "Quoted",
      notes = "",
      source = "website",
    } = req.body;

    const isAuthenticatedRequest = Boolean(req.user);
    const normalizedSource = EXTERNAL_SOURCES.includes(source) ? source : "website";
    const assignedTo = isAuthenticatedRequest
      ? await resolveAssignmentForCreator(req.user)
      : await getNextAssignee();

    const lead = await Lead.create({
      name,
      email,
      phone,
      zip,
      partRequested,
      make,
      model,
      year,
      disposition,
      notes,
      assignedTo,
      createdBy: req.user?._id || null,
      source: isAuthenticatedRequest ? "manual" : normalizedSource,
    });

    const populatedLead = await populateLeadFields(Lead.findById(lead._id));

    res.status(201).json({ success: true, data: populatedLead });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const populateLeadFields = (query) =>
  query
    .populate("assignedTo", "name email")
    .populate("createdBy", "name email")
    .populate("followUpSetBy", "name email");

export const getDueFollowUps = async (req, res) => {
  try {
    const now = new Date();
    const filter = {
      followUpAt: { $lte: now, $ne: null },
      followUpRemindedAt: null,
    };

    if (req.user.role !== "admin") {
      filter.assignedTo = req.user._id;
    }

    const leads = await populateLeadFields(
      Lead.find(filter).sort({ followUpAt: 1 })
    );

    res.status(200).json({
      success: true,
      data: leads,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, disposition, followUpAt, followUpNote, clearFollowUp } = req.body;

    const lead = await Lead.findById(id);

    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    let hasUpdates = false;

    if (notes !== undefined) {
      lead.notes = notes;
      hasUpdates = true;
    }

    if (disposition !== undefined) {
      lead.disposition = disposition;
      hasUpdates = true;
    }

    if (clearFollowUp) {
      lead.followUpAt = null;
      lead.followUpNote = "";
      lead.followUpSetBy = null;
      lead.followUpRemindedAt = null;
      hasUpdates = true;
    } else if (followUpAt !== undefined) {
      if (followUpAt === null) {
        lead.followUpAt = null;
        lead.followUpNote = "";
        lead.followUpSetBy = null;
        lead.followUpRemindedAt = null;
      } else {
        const parsedDate = new Date(followUpAt);

        if (Number.isNaN(parsedDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid follow-up date.",
          });
        }

        lead.followUpAt = parsedDate;
        lead.followUpNote = followUpNote?.trim() || "";
        lead.followUpSetBy = req.user._id;
        lead.followUpRemindedAt = null;
      }

      hasUpdates = true;
    } else if (followUpNote !== undefined && lead.followUpAt) {
      lead.followUpNote = followUpNote;
      hasUpdates = true;
    }

    if (!hasUpdates) {
      return res.status(400).json({ success: false, message: "No valid fields to update" });
    }

    await lead.save();

    const updatedLead = await populateLeadFields(Lead.findById(lead._id));

    res.status(200).json({ success: true, data: updatedLead });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const dismissFollowUp = async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findById(id);

    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    if (!lead.followUpAt) {
      return res.status(400).json({
        success: false,
        message: "This lead has no follow-up scheduled.",
      });
    }

    if (
      req.user.role !== "admin" &&
      lead.assignedTo?.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only dismiss follow-ups for your assigned leads.",
      });
    }

    lead.followUpRemindedAt = new Date();
    await lead.save();

    const updatedLead = await populateLeadFields(Lead.findById(lead._id));

    res.status(200).json({ success: true, data: updatedLead });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
