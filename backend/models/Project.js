const mongoose = require("mongoose");

const ProjectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Project title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters long"],
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        role: {
          type: String,
          enum: ["owner", "admin", "member", "viewer"],
          default: "member",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    status: {
      type: String,
      enum: ["planning", "active", "on-hold", "completed", "archived"],
      default: "planning",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    color: {
      type: String,
      default: "#6366f1", // Indigo color
      match: [/^#[0-9A-F]{6}$/i, "Please enter a valid hex color"],
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      validate: {
        validator: function (value) {
          return !value || value > this.startDate;
        },
        message: "End date must be after start date",
      },
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: [20, "Tag cannot exceed 20 characters"],
      },
    ],
    settings: {
      isPublic: {
        type: Boolean,
        default: false,
      },
      allowComments: {
        type: Boolean,
        default: true,
      },
      autoArchive: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
ProjectSchema.index({ owner: 1, createdAt: -1 });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ priority: 1 });
ProjectSchema.index({ "members.user": 1 });
ProjectSchema.index({ title: "text", description: "text" });

// Virtual for task count (will be populated when needed)
ProjectSchema.virtual("taskCount", {
  ref: "Task",
  localField: "_id",
  foreignField: "project",
  count: true,
});

// Virtual for completed tasks count
ProjectSchema.virtual("completedTasksCount", {
  ref: "Task",
  localField: "_id",
  foreignField: "project",
  match: { status: "completed" },
  count: true,
});

// Method to add member to project
ProjectSchema.methods.addMember = function (userId, role = "member") {
  const existingMember = this.members.find(
    (member) => member.user.toString() === userId.toString()
  );

  if (existingMember) {
    throw new Error("User is already a member of this project");
  }

  this.members.push({
    user: userId,
    role: role,
    joinedAt: new Date(),
  });

  return this.save();
};

// Method to remove member from project
ProjectSchema.methods.removeMember = function (userId) {
  this.members = this.members.filter(
    (member) => member.user.toString() !== userId.toString()
  );
  return this.save();
};

// Method to check if user is a member
ProjectSchema.methods.isMember = function (userId) {
  return (
    this.members.some(
      (member) => member.user.toString() === userId.toString()
    ) || this.owner.toString() === userId.toString()
  );
};

// Method to get user role in project
ProjectSchema.methods.getUserRole = function (userId) {
  if (this.owner.toString() === userId.toString()) {
    return "owner";
  }

  const member = this.members.find(
    (member) => member.user.toString() === userId.toString()
  );

  return member ? member.role : null;
};

// Static method to find projects by user
ProjectSchema.statics.findByUser = function (userId) {
  return this.find({
    $or: [{ owner: userId }, { "members.user": userId }],
  })
    .populate("owner", "name email avatar")
    .populate("members.user", "name email avatar")
    .sort({ updatedAt: -1 });
};

// Pre-save middleware to update progress
ProjectSchema.pre("save", function (next) {
  // Ensure progress is within valid range
  if (this.progress < 0) this.progress = 0;
  if (this.progress > 100) this.progress = 100;

  // Auto-update status based on progress
  if (this.progress === 100 && this.status !== "completed") {
    this.status = "completed";
  } else if (this.progress > 0 && this.status === "planning") {
    this.status = "active";
  }

  next();
});

module.exports = mongoose.model("Project", ProjectSchema);
