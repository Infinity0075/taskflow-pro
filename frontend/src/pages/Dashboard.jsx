import React from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  CheckSquare,
  Clock,
  FolderOpen,
  TrendingUp,
  Users,
  AlertCircle,
  Calendar,
} from "lucide-react";

const Dashboard = () => {
  // Mock data (in real app, fetch from API)
  const stats = {
    totalProjects: 12,
    totalTasks: 48,
    completedTasks: 32,
    overdueTeasks: 5,
    activeProjects: 8,
    teamMembers: 15,
  };

  const recentTasks = [
    {
      id: 1,
      title: "Update user authentication system",
      project: "TaskFlow Pro",
      priority: "high",
      dueDate: "2024-01-20",
      status: "in-progress",
    },
    {
      id: 2,
      title: "Design landing page mockups",
      project: "Website Redesign",
      priority: "medium",
      dueDate: "2024-01-22",
      status: "todo",
    },
    {
      id: 3,
      title: "Write API documentation",
      project: "Mobile App",
      priority: "low",
      dueDate: "2024-01-25",
      status: "completed",
    },
  ];

  const StatCard = ({ icon: Icon, title, value, change, color }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 hover:shadow-lg transition-shadow"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
            {title}
          </p>
          <p className="text-2xl font-bold text-neutral-900 dark:text-white">
            {value}
          </p>
          {change && (
            <p
              className={`text-sm ${
                change > 0 ? "text-success-600" : "text-error-600"
              } mt-1`}
            >
              {change > 0 ? "+" : ""}
              {change}%
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </motion.div>
  );

  const TaskCard = ({ task }) => {
    const priorityColors = {
      high: "bg-error-100 text-error-700 dark:bg-error-900/20 dark:text-error-400",
      medium:
        "bg-warning-100 text-warning-700 dark:bg-warning-900/20 dark:text-warning-400",
      low: "bg-success-100 text-success-700 dark:bg-success-900/20 dark:text-success-400",
    };

    const statusColors = {
      completed:
        "bg-success-100 text-success-700 dark:bg-success-900/20 dark:text-success-400",
      "in-progress":
        "bg-primary-100 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400",
      todo: "bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300",
    };

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between mb-3">
          <h4 className="font-medium text-neutral-900 dark:text-white line-clamp-2">
            {task.title}
          </h4>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              priorityColors[task.priority]
            }`}
          >
            {task.priority}
          </span>
        </div>

        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
          {task.project}
        </p>

        <div className="flex items-center justify-between">
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              statusColors[task.status]
            }`}
          >
            {task.status.replace("-", " ")}
          </span>
          <div className="flex items-center text-xs text-neutral-500 dark:text-neutral-400">
            <Calendar className="w-3 h-3 mr-1" />
            {new Date(task.dueDate).toLocaleDateString()}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
            Dashboard
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Welcome back! Here's what's happening with your projects.
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Today
          </p>
          <p className="text-lg font-semibold text-neutral-900 dark:text-white">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={FolderOpen}
          title="Active Projects"
          value={stats.activeProjects}
          change={12}
          color="bg-gradient-to-br from-primary-500 to-primary-600"
        />
        <StatCard
          icon={CheckSquare}
          title="Completed Tasks"
          value={stats.completedTasks}
          change={8}
          color="bg-gradient-to-br from-success-500 to-success-600"
        />
        <StatCard
          icon={Clock}
          title="Overdue Tasks"
          value={stats.overdueTeasks}
          change={-15}
          color="bg-gradient-to-br from-error-500 to-error-600"
        />
        <StatCard
          icon={Users}
          title="Team Members"
          value={stats.teamMembers}
          change={5}
          color="bg-gradient-to-br from-secondary-500 to-secondary-600"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tasks */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary-100 dark:bg-primary-900/20 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                  Recent Tasks
                </h2>
              </div>
              <button className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium">
                View All
              </button>
            </div>

            <div className="space-y-4">
              {recentTasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <TaskCard task={task} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Quick Actions & Notifications */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6"
          >
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg hover:from-primary-600 hover:to-secondary-600 transition-all shadow-sm hover:shadow-md group">
                <CheckSquare className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                Create New Task
              </button>
              <button className="w-full flex items-center justify-center px-4 py-3 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors">
                <FolderOpen className="w-4 h-4 mr-2" />
                New Project
              </button>
              <button className="w-full flex items-center justify-center px-4 py-3 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors">
                <Users className="w-4 h-4 mr-2" />
                Invite Team Member
              </button>
            </div>
          </motion.div>

          {/* Notifications */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6"
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-warning-100 dark:bg-warning-900/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-warning-600 dark:text-warning-400" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Notifications
              </h3>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-warning-50 dark:bg-warning-900/10 border border-warning-200 dark:border-warning-800 rounded-lg">
                <p className="text-sm text-warning-800 dark:text-warning-300 font-medium">
                  5 tasks are overdue
                </p>
                <p className="text-xs text-warning-600 dark:text-warning-400 mt-1">
                  Review and update your task deadlines
                </p>
              </div>
              <div className="p-3 bg-primary-50 dark:bg-primary-900/10 border border-primary-200 dark:border-primary-800 rounded-lg">
                <p className="text-sm text-primary-800 dark:text-primary-300 font-medium">
                  Project "Mobile App" updated
                </p>
                <p className="text-xs text-primary-600 dark:text-primary-400 mt-1">
                  Sarah added 3 new tasks
                </p>
              </div>
              <div className="p-3 bg-success-50 dark:bg-success-900/10 border border-success-200 dark:border-success-800 rounded-lg">
                <p className="text-sm text-success-800 dark:text-success-300 font-medium">
                  Team meeting completed
                </p>
                <p className="text-xs text-success-600 dark:text-success-400 mt-1">
                  Weekly standup finished
                </p>
              </div>
            </div>
          </motion.div>

          {/* Progress Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6"
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-success-100 dark:bg-success-900/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-success-600 dark:text-success-400" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                This Week
              </h3>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-neutral-600 dark:text-neutral-400">
                    Tasks Completed
                  </span>
                  <span className="font-medium text-neutral-900 dark:text-white">
                    12/15
                  </span>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-success-500 to-success-600 h-2 rounded-full"
                    style={{ width: "80%" }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-neutral-600 dark:text-neutral-400">
                    Projects Progress
                  </span>
                  <span className="font-medium text-neutral-900 dark:text-white">
                    67%
                  </span>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full"
                    style={{ width: "67%" }}
                  ></div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
