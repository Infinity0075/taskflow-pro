const express = require("express");
const { body, validationResult, query } = require("express-validator");
const Task = require("../models/Task");
const Project = require("../models/Project");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Validation rules
const taskValidation = [
  body("title")
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage("Title must be between 3 and 200 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Description cannot exceed 1000 characters"),
  body("project").isMongoId().withMessage("Valid project ID is required"),
  body("assignee")
    .optional()
    .isMongoId()
    .withMessage("Assignee must be a valid user ID"),
  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "urgent"])
    .withMessage("Invalid priority value"),
  body("status")
    .optional()
    .isIn(["todo", "in-progress", "in-review", "completed", "cancelled"])
    .withMessage("Invalid status value"),
  body("category")
    .optional()
    .isIn([
      "feature",
      "bug",
      "improvement",
      "documentation",
      "testing",
      "other",
    ])
    .withMessage("Invalid category value"),
  body("dueDate")
    .optional()
    .isISO8601()
    .withMessage("Due date must be a valid date"),
  body("estimatedHours")
    .optional()
    .isNumeric()
    .isFloat({ min: 0, max: 1000 })
    .withMessage("Estimated hours must be between 0 and 1000"),
];

// @route   GET /api/tasks
// @desc    Get all tasks for the authenticated user
// @access  Private
router.get(
  "/",
  [
    query("project").optional().isMongoId(),
    query("status")
      .optional()
      .isIn(["todo", "in-progress", "in-review", "completed", "cancelled"]),
    query("priority").optional().isIn(["low", "medium", "high", "urgent"]),
    query("assignee").optional().isMongoId(),
    query("search").optional().trim(),
    query("overdue").optional().isBoolean(),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Invalid query parameters",
          errors: errors.array(),
        });
      }

      const {
        project,
        status,
        priority,
        assignee,
        search,
        overdue,
        page = 1,
        limit = 20,
      } = req.query;

      // Build query
      let query = {
        $or: [{ assignee: req.userId }, { creator: req.userId }],
        isArchived: false,
      };

      if (project) query.project = project;
      if (status) query.status = status;
      if (priority) query.priority = priority;
      if (assignee) query.assignee = assignee;

      // Handle overdue filter
      if (overdue === "true") {
        query.dueDate = { $lt: new Date() };
        query.status = { $nin: ["completed", "cancelled"] };
      }

      // Add text search
      if (search) {
        query.$text = { $search: search };
      }

      // Calculate skip value for pagination
      const skip = (page - 1) * limit;

      // Execute query with pagination
      const tasks = await Task.find(query)
        .populate("project", "title color")
        .populate("assignee", "name email avatar")
        .populate("creator", "name email avatar")
        .sort(search ? { score: { $meta: "textScore" } } : { createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      // Get total count for pagination
      const totalTasks = await Task.countDocuments(query);
      const totalPages = Math.ceil(totalTasks / limit);

      res.json({
        success: true,
        data: {
          tasks,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalTasks,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        },
      });
    } catch (error) {
      console.error("Get tasks error:", error);
      res.status(500).json({
        success: false,
        message: "Server error fetching tasks",
      });
    }
  }
);

// @route   GET /api/tasks/:id
// @desc    Get single task by ID
// @access  Private
router.get("/:id", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate("project", "title color")
      .populate("assignee", "name email avatar")
      .populate("creator", "name email avatar")
      .populate("comments.user", "name email avatar")
      .populate("dependencies", "title status priority");

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    // Check if user has access to this task
    const project = await Project.findById(task.project._id);
    if (!project || !project.isMember(req.userId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    res.json({
      success: true,
      data: { task },
    });
  } catch (error) {
    console.error("Get task error:", error);
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error fetching task",
    });
  }
});

// @route   POST /api/tasks
// @desc    Create a new task
// @access  Private
router.post("/", taskValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const {
      title,
      description,
      project,
      assignee,
      priority,
      status,
      category,
      dueDate,
      estimatedHours,
      labels,
    } = req.body;

    // Check if project exists and user has access
    const projectDoc = await Project.findById(project);
    if (!projectDoc) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    if (!projectDoc.isMember(req.userId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    // If assignee is provided, check if they are a member of the project
    if (assignee && !projectDoc.isMember(assignee)) {
      return res.status(400).json({
        success: false,
        message: "Assignee must be a member of the project",
      });
    }

    const task = new Task({
      title: title.trim(),
      description: description?.trim(),
      project,
      assignee: assignee || req.userId, // Default to creator if no assignee
      creator: req.userId,
      priority: priority || "medium",
      status: status || "todo",
      category: category || "other",
      dueDate: dueDate ? new Date(dueDate) : undefined,
      estimatedHours: estimatedHours || 0,
      labels: labels || [],
    });

    await task.save();

    // Populate the task before sending response
    await task.populate("project", "title color");
    await task.populate("assignee", "name email avatar");
    await task.populate("creator", "name email avatar");

    res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: { task },
    });
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({
      success: false,
      message: "Server error creating task",
    });
  }
});

// @route   PUT /api/tasks/:id
// @desc    Update task
// @access  Private
router.put(
  "/:id",
  taskValidation.filter(
    (rule) => !rule.builder.fields.includes("project") // Remove project validation for updates
  ),
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

      const task = await Task.findById(req.params.id);
      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Task not found",
        });
      }

      // Check if user has access to this task
      const project = await Project.findById(task.project);
      if (!project || !project.isMember(req.userId)) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You are not a member of this project.",
        });
      }

      // Update fields
      const allowedFields = [
        "title",
        "description",
        "assignee",
        "priority",
        "status",
        "category",
        "dueDate",
        "estimatedHours",
        "actualHours",
        "progress",
        "labels",
      ];

      const updates = {};
      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });

      // Handle date conversion
      if (updates.dueDate) {
        updates.dueDate = new Date(updates.dueDate);
      }

      // If assignee is being updated, check if they are a member
      if (updates.assignee && !project.isMember(updates.assignee)) {
        return res.status(400).json({
          success: false,
          message: "Assignee must be a member of the project",
        });
      }

      const updatedTask = await Task.findByIdAndUpdate(req.params.id, updates, {
        new: true,
        runValidators: true,
      })
        .populate("project", "title color")
        .populate("assignee", "name email avatar")
        .populate("creator", "name email avatar");

      res.json({
        success: true,
        message: "Task updated successfully",
        data: { task: updatedTask },
      });
    } catch (error) {
      console.error("Update task error:", error);
      if (error.kind === "ObjectId") {
        return res.status(404).json({
          success: false,
          message: "Task not found",
        });
      }
      res.status(500).json({
        success: false,
        message: "Server error updating task",
      });
    }
  }
);

// @route   DELETE /api/tasks/:id
// @desc    Delete task
// @access  Private
router.delete("/:id", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    // Check if user has access (creator or project owner/admin can delete)
    const project = await Project.findById(task.project);
    if (!project || !project.isMember(req.userId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    const userRole = project.getUserRole(req.userId);
    const isCreator = task.creator.toString() === req.userId;

    if (!isCreator && userRole !== "owner" && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Only task creator, project owner, or admin can delete.",
      });
    }

    await Task.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Delete task error:", error);
    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error deleting task",
    });
  }
});

// @route   POST /api/tasks/:id/comments
// @desc    Add comment to task
// @access  Private
router.post(
  "/:id/comments",
  [
    body("content")
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage("Comment must be between 1 and 500 characters"),
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

      const task = await Task.findById(req.params.id);
      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Task not found",
        });
      }

      // Check access
      const project = await Project.findById(task.project);
      if (!project || !project.isMember(req.userId)) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You are not a member of this project.",
        });
      }

      await task.addComment(req.userId, req.body.content);

      // Get updated task with populated comments
      const updatedTask = await Task.findById(task._id).populate(
        "comments.user",
        "name email avatar"
      );

      res.json({
        success: true,
        message: "Comment added successfully",
        data: {
          task: updatedTask,
          newComment: updatedTask.comments[updatedTask.comments.length - 1],
        },
      });
    } catch (error) {
      console.error("Add comment error:", error);
      res.status(500).json({
        success: false,
        message: "Server error adding comment",
      });
    }
  }
);

// @route   POST /api/tasks/:id/subtasks
// @desc    Add subtask to task
// @access  Private
router.post(
  "/:id/subtasks",
  [
    body("title")
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Subtask title must be between 1 and 100 characters"),
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

      const task = await Task.findById(req.params.id);
      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Task not found",
        });
      }

      // Check access
      const project = await Project.findById(task.project);
      if (!project || !project.isMember(req.userId)) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You are not a member of this project.",
        });
      }

      await task.addSubtask(req.body.title);

      res.json({
        success: true,
        message: "Subtask added successfully",
        data: {
          task,
          newSubtask: task.subtasks[task.subtasks.length - 1],
        },
      });
    } catch (error) {
      console.error("Add subtask error:", error);
      res.status(500).json({
        success: false,
        message: "Server error adding subtask",
      });
    }
  }
);

// @route   PUT /api/tasks/:id/subtasks/:subtaskId
// @desc    Toggle subtask completion
// @access  Private
router.put("/:id/subtasks/:subtaskId", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    // Check access
    const project = await Project.findById(task.project);
    if (!project || !project.isMember(req.userId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this project.",
      });
    }

    await task.toggleSubtask(req.params.subtaskId);
    await task.updateProgressFromSubtasks();

    res.json({
      success: true,
      message: "Subtask updated successfully",
      data: { task },
    });
  } catch (error) {
    if (error.message === "Subtask not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Toggle subtask error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating subtask",
    });
  }
});

// @route   GET /api/tasks/overdue
// @desc    Get overdue tasks for user
// @access  Private
router.get("/overdue", async (req, res) => {
  try {
    const overdueTasks = await Task.findOverdue(req.userId);

    res.json({
      success: true,
      data: {
        tasks: overdueTasks,
        count: overdueTasks.length,
      },
    });
  } catch (error) {
    console.error("Get overdue tasks error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching overdue tasks",
    });
  }
});

module.exports = router;
