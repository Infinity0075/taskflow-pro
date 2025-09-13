const express = require("express");
const { body, validationResult, query } = require("express-validator");
const Project = require("../models/Project");
const Task = require("../models/Task");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Validation rules
const projectValidation = [
  body("title")
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Title must be between 3 and 100 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),
  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "urgent"])
    .withMessage("Invalid priority value"),
  body("status")
    .optional()
    .isIn(["planning", "active", "on-hold", "completed", "archived"])
    .withMessage("Invalid status value"),
  body("color")
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage("Color must be a valid hex color"),
  body("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid date"),
];

// @route   GET /api/projects
// @desc    Get all projects for the authenticated user
// @access  Private
router.get(
  "/",
  [
    query("status")
      .optional()
      .isIn(["planning", "active", "on-hold", "completed", "archived"]),
    query("priority").optional().isIn(["low", "medium", "high", "urgent"]),
    query("search").optional().trim(),
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
  ],
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Invalid query parameters",
          errors: errors.array(),
        });
      }

      const { status, priority, search, page = 1, limit = 10 } = req.query;

      // Build query
      let query = {
        $or: [{ owner: req.userId }, { "members.user": req.userId }],
      };

      if (status) query.status = status;
      if (priority) query.priority = priority;

      // Add text search if provided
      if (search) {
        query.$text = { $search: search };
      }

      // Calculate skip value for pagination
      const skip = (page - 1) * limit;

      // Execute query with pagination
      const projects = await Project.find(query)
        .populate("owner", "name email avatar")
        .populate("members.user", "name email avatar")
        .populate("taskCount")
        .populate("completedTasksCount")
        .sort(search ? { score: { $meta: "textScore" } } : { updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      // Get total count for pagination
      const totalProjects = await Project.countDocuments(query);
      const totalPages = Math.ceil(totalProjects / limit);

      res.json({
        success: true,
        data: {
          projects,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalProjects,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        },
      });
    } catch (error) {
      console.error("Get projects error:", error);
      res.status(500).json({
        success: false,
        message: "Server error fetching projects",
      });
    }
  }
);

// @route   GET /api/projects/:id
// @desc    Get single project by ID
// @access  Private
router.get("/:id", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar")
      .populate("taskCount")
      .populate("completedTasksCount");

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Check if user has access to this project
    if (!project.isMember(req.userId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    // Get project tasks
    const tasks = await Task.find({ project: project._id })
      .populate("assignee", "name email avatar")
      .populate("creator", "name email avatar")
      .sort({ createdAt: -1 })
      .limit(20); // Limit to recent tasks

    res.json({
      success: true,
      data: {
        project,
        tasks: tasks || [],
      },
    });
  } catch (error) {
    console.error("Get project error:", error);
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error fetching project",
    });
  }
});

// @route   POST /api/projects
// @desc    Create a new project
// @access  Private
router.post("/", projectValidation, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { title, description, priority, status, color, endDate, tags } =
      req.body;

    const project = new Project({
      title: title.trim(),
      description: description?.trim(),
      owner: req.userId,
      priority: priority || "medium",
      status: status || "planning",
      color: color || "#6366f1",
      endDate: endDate ? new Date(endDate) : undefined,
      tags: tags || [],
    });

    await project.save();

    // Populate the project before sending response
    await project.populate("owner", "name email avatar");

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: { project },
    });
  } catch (error) {
    console.error("Create project error:", error);
    res.status(500).json({
      success: false,
      message: "Server error creating project",
    });
  }
});

// @route   PUT /api/projects/:id
// @desc    Update project
// @access  Private
router.put("/:id", projectValidation, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Check permissions (only owner and admins can edit)
    const userRole = project.getUserRole(req.userId);
    if (!userRole || (userRole !== "owner" && userRole !== "admin")) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only project owner and admins can edit.",
      });
    }

    // Update fields
    const allowedFields = [
      "title",
      "description",
      "priority",
      "status",
      "color",
      "endDate",
      "tags",
      "progress",
    ];
    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Handle date conversion
    if (updates.endDate) {
      updates.endDate = new Date(updates.endDate);
    }

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar");

    res.json({
      success: true,
      message: "Project updated successfully",
      data: { project: updatedProject },
    });
  } catch (error) {
    console.error("Update project error:", error);
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error updating project",
    });
  }
});

// @route   DELETE /api/projects/:id
// @desc    Delete project
// @access  Private
router.delete("/:id", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Check permissions (only owner can delete)
    if (project.owner.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only project owner can delete.",
      });
    }

    // Delete all tasks associated with this project
    await Task.deleteMany({ project: project._id });

    // Delete the project
    await Project.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Project and all associated tasks deleted successfully",
    });
  } catch (error) {
    console.error("Delete project error:", error);
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error deleting project",
    });
  }
});

// @route   POST /api/projects/:id/members
// @desc    Add member to project
// @access  Private
router.post(
  "/:id/members",
  [
    body("email").isEmail().withMessage("Please provide a valid email"),
    body("role")
      .optional()
      .isIn(["admin", "member", "viewer"])
      .withMessage("Invalid role"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const project = await Project.findById(req.params.id);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }

      // Check permissions
      const userRole = project.getUserRole(req.userId);
      if (!userRole || (userRole !== "owner" && userRole !== "admin")) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied. Only project owner and admins can add members.",
        });
      }

      const { email, role = "member" } = req.body;

      // Find user by email
      const User = require("../models/User");
      const userToAdd = await User.findByEmail(email);
      if (!userToAdd) {
        return res.status(404).json({
          success: false,
          message: "User not found with this email",
        });
      }

      // Add member to project
      await project.addMember(userToAdd._id, role);

      // Get updated project with populated members
      const updatedProject = await Project.findById(project._id)
        .populate("owner", "name email avatar")
        .populate("members.user", "name email avatar");

      res.json({
        success: true,
        message: "Member added successfully",
        data: { project: updatedProject },
      });
    } catch (error) {
      if (error.message === "User is already a member of this project") {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      console.error("Add member error:", error);
      res.status(500).json({
        success: false,
        message: "Server error adding member",
      });
    }
  }
);

// @route   DELETE /api/projects/:id/members/:userId
// @desc    Remove member from project
// @access  Private
router.delete("/:id/members/:userId", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Check permissions
    const userRole = project.getUserRole(req.userId);
    const isRemovingSelf = req.params.userId === req.userId;

    if (
      !isRemovingSelf &&
      (!userRole || (userRole !== "owner" && userRole !== "admin"))
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Only project owner, admins, or the member themselves can remove membership.",
      });
    }

    // Cannot remove project owner
    if (project.owner.toString() === req.params.userId) {
      return res.status(400).json({
        success: false,
        message: "Cannot remove project owner from project",
      });
    }

    await project.removeMember(req.params.userId);

    res.json({
      success: true,
      message: "Member removed successfully",
    });
  } catch (error) {
    console.error("Remove member error:", error);
    res.status(500).json({
      success: false,
      message: "Server error removing member",
    });
  }
});

module.exports = router;
