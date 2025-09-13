const express = require("express");
const Task = require("../models/Task");
const Project = require("../models/Project");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// @route   GET /api/dashboard/stats
// @desc    Get dashboard statistics for the authenticated user
// @access  Private
router.get("/stats", async (req, res) => {
  try {
    const userId = req.userId;

    // Get user's projects
    const userProjects = await Project.findByUser(userId);
    const projectIds = userProjects.map((project) => project._id);

    // Get tasks statistics
    const [
      totalTasks,
      todoTasks,
      inProgressTasks,
      completedTasks,
      overdueTasks,
      highPriorityTasks,
      recentTasks,
    ] = await Promise.all([
      // Total tasks
      Task.countDocuments({
        $or: [{ assignee: userId }, { creator: userId }],
        isArchived: false,
      }),

      // Todo tasks
      Task.countDocuments({
        $or: [{ assignee: userId }, { creator: userId }],
        status: "todo",
        isArchived: false,
      }),

      // In progress tasks
      Task.countDocuments({
        $or: [{ assignee: userId }, { creator: userId }],
        status: "in-progress",
        isArchived: false,
      }),

      // Completed tasks
      Task.countDocuments({
        $or: [{ assignee: userId }, { creator: userId }],
        status: "completed",
        isArchived: false,
      }),

      // Overdue tasks
      Task.countDocuments({
        $or: [{ assignee: userId }, { creator: userId }],
        dueDate: { $lt: new Date() },
        status: { $nin: ["completed", "cancelled"] },
        isArchived: false,
      }),

      // High priority tasks
      Task.countDocuments({
        $or: [{ assignee: userId }, { creator: userId }],
        priority: { $in: ["high", "urgent"] },
        status: { $nin: ["completed", "cancelled"] },
        isArchived: false,
      }),

      // Recent tasks (last 7 days)
      Task.countDocuments({
        $or: [{ assignee: userId }, { creator: userId }],
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        isArchived: false,
      }),
    ]);

    // Project statistics
    const projectStats = {
      total: userProjects.length,
      active: userProjects.filter((p) => p.status === "active").length,
      completed: userProjects.filter((p) => p.status === "completed").length,
      onHold: userProjects.filter((p) => p.status === "on-hold").length,
    };

    // Calculate productivity metrics
    const completionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const overdueRate =
      totalTasks > 0 ? Math.round((overdueTasks / totalTasks) * 100) : 0;

    res.json({
      success: true,
      data: {
        tasks: {
          total: totalTasks,
          todo: todoTasks,
          inProgress: inProgressTasks,
          completed: completedTasks,
          overdue: overdueTasks,
          highPriority: highPriorityTasks,
          recent: recentTasks,
        },
        projects: projectStats,
        metrics: {
          completionRate,
          overdueRate,
          productivity: Math.max(0, completionRate - overdueRate),
        },
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching dashboard statistics",
    });
  }
});

// @route   GET /api/dashboard/recent-activity
// @desc    Get recent activity for dashboard
// @access  Private
router.get("/recent-activity", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const userId = req.userId;

    // Get recent tasks (created or updated in last 30 days)
    const recentTasks = await Task.find({
      $or: [{ assignee: userId }, { creator: userId }],
      $or: [
        {
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        {
          updatedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      ],
      isArchived: false,
    })
      .populate("project", "title color")
      .populate("assignee", "name email avatar")
      .populate("creator", "name email avatar")
      .sort({ updatedAt: -1 })
      .limit(limit);

    // Get recent projects
    const recentProjects = await Project.find({
      $or: [{ owner: userId }, { "members.user": userId }],
      updatedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    })
      .populate("owner", "name email avatar")
      .sort({ updatedAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        recentTasks,
        recentProjects,
      },
    });
  } catch (error) {
    console.error("Recent activity error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching recent activity",
    });
  }
});

// @route   GET /api/dashboard/upcoming-deadlines
// @desc    Get upcoming deadlines
// @access  Private
router.get("/upcoming-deadlines", async (req, res) => {
  try {
    const userId = req.userId;
    const daysAhead = parseInt(req.query.days) || 7;
    const limit = parseInt(req.query.limit) || 10;

    const upcomingDeadline = new Date();
    upcomingDeadline.setDate(upcomingDeadline.getDate() + daysAhead);

    const upcomingTasks = await Task.find({
      $or: [{ assignee: userId }, { creator: userId }],
      dueDate: {
        $gte: new Date(),
        $lte: upcomingDeadline,
      },
      status: { $nin: ["completed", "cancelled"] },
      isArchived: false,
    })
      .populate("project", "title color")
      .populate("assignee", "name email avatar")
      .sort({ dueDate: 1 })
      .limit(limit);

    res.json({
      success: true,
      data: {
        tasks: upcomingTasks,
        count: upcomingTasks.length,
      },
    });
  } catch (error) {
    console.error("Upcoming deadlines error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching upcoming deadlines",
    });
  }
});

// @route   GET /api/dashboard/task-distribution
// @desc    Get task distribution by status, priority, and category
// @access  Private
router.get("/task-distribution", async (req, res) => {
  try {
    const userId = req.userId;

    // Task distribution by status
    const statusDistribution = await Task.aggregate([
      {
        $match: {
          $or: [{ assignee: userId }, { creator: userId }],
          isArchived: false,
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          status: "$_id",
          count: 1,
          _id: 0,
        },
      },
    ]);

    // Task distribution by priority
    const priorityDistribution = await Task.aggregate([
      {
        $match: {
          $or: [{ assignee: userId }, { creator: userId }],
          isArchived: false,
        },
      },
      {
        $group: {
          _id: "$priority",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          priority: "$_id",
          count: 1,
          _id: 0,
        },
      },
    ]);

    // Task distribution by category
    const categoryDistribution = await Task.aggregate([
      {
        $match: {
          $or: [{ assignee: userId }, { creator: userId }],
          isArchived: false,
        },
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          category: "$_id",
          count: 1,
          _id: 0,
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        byStatus: statusDistribution,
        byPriority: priorityDistribution,
        byCategory: categoryDistribution,
      },
    });
  } catch (error) {
    console.error("Task distribution error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching task distribution",
    });
  }
});

// @route   GET /api/dashboard/productivity-trends
// @desc    Get productivity trends over time
// @access  Private
router.get("/productivity-trends", async (req, res) => {
  try {
    const userId = req.userId;
    const days = parseInt(req.query.days) || 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Daily task completion trend
    const completionTrend = await Task.aggregate([
      {
        $match: {
          $or: [{ assignee: userId }, { creator: userId }],
          status: "completed",
          completedAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$completedAt",
            },
          },
          completed: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
      {
        $project: {
          date: "$_id",
          completed: 1,
          _id: 0,
        },
      },
    ]);

    // Daily task creation trend
    const creationTrend = await Task.aggregate([
      {
        $match: {
          creator: userId,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          created: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
      {
        $project: {
          date: "$_id",
          created: 1,
          _id: 0,
        },
      },
    ]);

    // Weekly productivity summary
    const weeklyStats = await Task.aggregate([
      {
        $match: {
          $or: [{ assignee: userId }, { creator: userId }],
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            week: { $week: "$createdAt" },
            year: { $year: "$createdAt" },
          },
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: {
              $cond: [{ $eq: ["$status", "completed"] }, 1, 0],
            },
          },
          overdueTasks: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lt: ["$dueDate", new Date()] },
                    { $nin: ["$status", ["completed", "cancelled"]] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          week: "$_id.week",
          year: "$_id.year",
          totalTasks: 1,
          completedTasks: 1,
          overdueTasks: 1,
          completionRate: {
            $cond: [
              { $gt: ["$totalTasks", 0] },
              {
                $multiply: [
                  { $divide: ["$completedTasks", "$totalTasks"] },
                  100,
                ],
              },
              0,
            ],
          },
          _id: 0,
        },
      },
      {
        $sort: { year: 1, week: 1 },
      },
    ]);

    res.json({
      success: true,
      data: {
        completionTrend,
        creationTrend,
        weeklyStats,
      },
    });
  } catch (error) {
    console.error("Productivity trends error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching productivity trends",
    });
  }
});

// @route   GET /api/dashboard/project-progress
// @desc    Get progress overview for user's projects
// @access  Private
router.get("/project-progress", async (req, res) => {
  try {
    const userId = req.userId;

    const projects = await Project.find({
      $or: [{ owner: userId }, { "members.user": userId }],
    })
      .populate("owner", "name email avatar")
      .populate("taskCount")
      .populate("completedTasksCount")
      .sort({ updatedAt: -1 })
      .limit(10);

    // Enhance projects with task statistics
    const enhancedProjects = await Promise.all(
      projects.map(async (project) => {
        const taskStats = await Task.aggregate([
          { $match: { project: project._id } },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ]);

        const statusCounts = {};
        taskStats.forEach((stat) => {
          statusCounts[stat._id] = stat.count;
        });

        return {
          ...project.toJSON(),
          taskStats: {
            todo: statusCounts.todo || 0,
            inProgress: statusCounts["in-progress"] || 0,
            inReview: statusCounts["in-review"] || 0,
            completed: statusCounts.completed || 0,
            cancelled: statusCounts.cancelled || 0,
            total: Object.values(statusCounts).reduce(
              (sum, count) => sum + count,
              0
            ),
          },
        };
      })
    );

    res.json({
      success: true,
      data: {
        projects: enhancedProjects,
      },
    });
  } catch (error) {
    console.error("Project progress error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching project progress",
    });
  }
});

module.exports = router;
