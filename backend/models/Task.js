const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters long"],
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project is required"],
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["todo", "in-progress", "in-review", "completed", "cancelled"],
      default: "todo",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    category: {
      type: String,
      enum: [
        "feature",
        "bug",
        "improvement",
        "documentation",
        "testing",
        "other",
      ],
      default: "other",
    },
    labels: [
      {
        type: String,
        trim: true,
        maxlength: [20, "Label cannot exceed 20 characters"],
      },
    ],
    dueDate: {
      type: Date,
      validate: {
        validator: function (value) {
          return !value || value > new Date();
        },
        message: "Due date must be in the future",
      },
    },
    estimatedHours: {
      type: Number,
      min: [0, "Estimated hours cannot be negative"],
      max: [1000, "Estimated hours cannot exceed 1000"],
    },
    actualHours: {
      type: Number,
      min: [0, "Actual hours cannot be negative"],
      default: 0,
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    attachments: [
      {
        name: String,
        url: String,
        type: String,
        size: Number,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    comments: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        content: {
          type: String,
          required: true,
          maxlength: [500, "Comment cannot exceed 500 characters"],
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    subtasks: [
      {
        title: {
          type: String,
          required: true,
          maxlength: [100, "Subtask title cannot exceed 100 characters"],
        },
        isCompleted: {
          type: Boolean,
          default: false,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    dependencies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
      },
    ],
    isArchived: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
    },
    startedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
TaskSchema.index({ project: 1, status: 1 });
TaskSchema.index({ assignee: 1, status: 1 });
TaskSchema.index({ creator: 1, createdAt: -1 });
TaskSchema.index({ dueDate: 1 });
TaskSchema.index({ priority: 1, status: 1 });
TaskSchema.index({ title: "text", description: "text" });

// Virtual for overdue status
TaskSchema.virtual("isOverdue").get(function () {
  return (
    this.dueDate &&
    this.dueDate < new Date() &&
    this.status !== "completed" &&
    this.status !== "cancelled"
  );
});

// Virtual for days until due
TaskSchema.virtual("daysUntilDue").get(function () {
  if (!this.dueDate) return null;
  const timeDiff = this.dueDate - new Date();
  return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
});

// Virtual for completed subtasks count
TaskSchema.virtual("completedSubtasksCount").get(function () {
  return this.subtasks.filter((subtask) => subtask.isCompleted).length;
});

// Virtual for subtasks completion percentage
TaskSchema.virtual("subtasksProgress").get(function () {
  if (this.subtasks.length === 0) return 100;
  return Math.round((this.completedSubtasksCount / this.subtasks.length) * 100);
});

// Method to add comment
TaskSchema.methods.addComment = function (userId, content) {
  this.comments.push({
    user: userId,
    content: content.trim(),
    createdAt: new Date(),
  });
  return this.save();
};

// Method to add subtask
TaskSchema.methods.addSubtask = function (title) {
  this.subtasks.push({
    title: title.trim(),
    isCompleted: false,
    createdAt: new Date(),
  });
  return this.save();
};

// Method to toggle subtask completion
TaskSchema.methods.toggleSubtask = function (subtaskId) {
  const subtask = this.subtasks.id(subtaskId);
  if (subtask) {
    subtask.isCompleted = !subtask.isCompleted;
    return this.save();
  }
  throw new Error("Subtask not found");
};

// Method to update progress based on subtasks
TaskSchema.methods.updateProgressFromSubtasks = function () {
  if (this.subtasks.length > 0) {
    this.progress = this.subtasksProgress;
  }
  return this.save();
};

// Static method to find tasks by user
TaskSchema.statics.findByUser = function (userId, options = {}) {
  const query = {
    $or: [{ assignee: userId }, { creator: userId }],
    isArchived: false,
  };

  if (options.status) query.status = options.status;
  if (options.project) query.project = options.project;
  if (options.priority) query.priority = options.priority;

  return this.find(query)
    .populate("project", "title color")
    .populate("assignee", "name email avatar")
    .populate("creator", "name email avatar")
    .sort({ createdAt: -1 });
};

// Static method to find overdue tasks
TaskSchema.statics.findOverdue = function (userId) {
  return this.find({
    $or: [{ assignee: userId }, { creator: userId }],
    dueDate: { $lt: new Date() },
    status: { $nin: ["completed", "cancelled"] },
    isArchived: false,
  })
    .populate("project", "title color")
    .populate("assignee", "name email avatar");
};

// Pre-save middleware
TaskSchema.pre("save", function (next) {
  // Update completion timestamp
  if (this.isModified("status")) {
    if (this.status === "completed" && !this.completedAt) {
      this.completedAt = new Date();
      this.progress = 100;
    } else if (this.status === "in-progress" && !this.startedAt) {
      this.startedAt = new Date();
    }
  }

  // Update progress based on status
  if (this.status === "completed") {
    this.progress = 100;
  } else if (this.status === "todo") {
    this.progress = 0;
  }

  next();
});

// Post-save middleware to update project progress
TaskSchema.post("save", async function (doc) {
  try {
    const Project = mongoose.model("Project");
    const Task = mongoose.model("Task");

    // Calculate project progress based on tasks
    const tasks = await Task.find({ project: doc.project });
    if (tasks.length > 0) {
      const totalProgress = tasks.reduce((sum, task) => sum + task.progress, 0);
      const averageProgress = Math.round(totalProgress / tasks.length);

      await Project.findByIdAndUpdate(doc.project, {
        progress: averageProgress,
      });
    }
  } catch (error) {
    console.error("Error updating project progress:", error);
  }
});

module.exports = mongoose.model("Task", TaskSchema);
