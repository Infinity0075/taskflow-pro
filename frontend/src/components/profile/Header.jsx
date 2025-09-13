import React, { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Menu,
  Search,
  Bell,
  Plus,
  Sun,
  Moon,
  User,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";

const Header = ({ onMenuClick }) => {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [isDark, setIsDark] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Get page title based on current route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/dashboard") return "Dashboard";
    if (path === "/projects") return "Projects";
    if (path.startsWith("/projects/")) return "Project Details";
    if (path === "/tasks") return "Tasks";
    if (path.startsWith("/tasks/")) return "Task Details";
    if (path === "/profile") return "Profile";
    return "TaskFlow Pro";
  };

  // Get page subtitle/breadcrumb
  const getPageSubtitle = () => {
    const path = location.pathname;
    if (path === "/dashboard") return "Overview of your projects and tasks";
    if (path === "/projects") return "Manage your project portfolio";
    if (path.startsWith("/projects/")) return "View and manage project details";
    if (path === "/tasks") return "Track and organize your tasks";
    if (path.startsWith("/tasks/")) return "View and update task information";
    if (path === "/profile") return "Manage your account settings";
    return "Professional project management platform";
  };

  const toggleDarkMode = () => {
    setIsDark(!isDark);
    // In a real app, you'd persist this preference and apply the dark class to document.documentElement
    document.documentElement.classList.toggle("dark");
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  // Mock notifications (in real app, fetch from API)
  const notifications = [
    {
      id: 1,
      title: "New task assigned",
      message: 'You have been assigned to "Update landing page"',
      time: "5 min ago",
      unread: true,
    },
    {
      id: 2,
      title: "Project deadline approaching",
      message: "Mobile App Redesign is due in 2 days",
      time: "1 hour ago",
      unread: true,
    },
    {
      id: 3,
      title: "Task completed",
      message: 'Sarah completed "API Documentation"',
      time: "3 hours ago",
      unread: false,
    },
  ];

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <header className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 sticky top-0 z-30">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left section */}
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Page title and breadcrumb */}
            <div className="hidden sm:block">
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
                {getPageTitle()}
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {getPageSubtitle()}
              </p>
            </div>
          </div>

          {/* Center section - Search (hidden on mobile) */}
          <div className="hidden md:block flex-1 max-w-md mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search projects, tasks..."
                className="w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-neutral-50 dark:bg-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
              />
            </div>
          </div>

          {/* Right section */}
          <div className="flex items-center space-x-3">
            {/* Quick action button */}
            <button className="hidden sm:flex items-center px-4 py-2 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg hover:from-primary-600 hover:to-secondary-600 transition-all shadow-sm hover:shadow-md group">
              <Plus className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform" />
              <span className="text-sm font-medium">New Task</span>
            </button>

            {/* Mobile quick action */}
            <button className="sm:hidden p-2 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg hover:from-primary-600 hover:to-secondary-600 transition-all shadow-sm">
              <Plus className="h-4 w-4" />
            </button>

            {/* Dark mode toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
            >
              {isDark ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors relative"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-error-500 text-white text-xs rounded-full flex items-center justify-center font-medium animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications dropdown */}
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-80 bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 py-2 z-50"
                >
                  <div className="px-4 py-2 border-b border-neutral-200 dark:border-neutral-700">
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                      Notifications
                    </h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors cursor-pointer ${
                          notification.unread
                            ? "bg-primary-50/50 dark:bg-primary-900/10"
                            : ""
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div
                            className={`w-2 h-2 rounded-full mt-2 ${
                              notification.unread
                                ? "bg-primary-500"
                                : "bg-neutral-300"
                            }`}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-neutral-900 dark:text-white">
                              {notification.title}
                            </p>
                            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
                              {notification.time}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2 border-t border-neutral-200 dark:border-neutral-700">
                    <button className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium">
                      View all notifications
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              >
                <img
                  src={
                    user?.avatar ||
                    `https://ui-avatars.com/api/?name=${user?.name}&background=6366f1&color=ffffff`
                  }
                  alt={user?.name}
                  className="w-8 h-8 rounded-full ring-2 ring-primary-100 dark:ring-primary-800"
                />
                <ChevronDown className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
              </button>

              {/* User dropdown menu */}
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-56 bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 py-2 z-50"
                >
                  <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">
                      {user?.name}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {user?.email}
                    </p>
                  </div>

                  <div className="py-2">
                    <Link
                      to="/profile"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                    >
                      <User className="h-4 w-4 mr-3" />
                      Profile
                    </Link>
                    <button className="w-full flex items-center px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
                      <Settings className="h-4 w-4 mr-3" />
                      Settings
                    </button>
                  </div>

                  <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center px-4 py-2 text-sm text-error-700 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Sign out
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Click outside handlers */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
      {showNotifications && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowNotifications(false)}
        />
      )}
    </header>
  );
};

export default Header;
