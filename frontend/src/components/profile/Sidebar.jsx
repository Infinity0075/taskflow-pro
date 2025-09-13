import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  FolderOpen,
  CheckSquare,
  User,
  Settings,
  LogOut,
  Zap,
  X,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const navigationItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      color: "text-primary-600",
    },
    {
      name: "Projects",
      href: "/projects",
      icon: FolderOpen,
      color: "text-secondary-600",
    },
    {
      name: "Tasks",
      href: "/tasks",
      icon: CheckSquare,
      color: "text-accent-600",
    },
    {
      name: "Profile",
      href: "/profile",
      icon: User,
      color: "text-success-600",
    },
  ];

  const handleLogout = () => {
    logout();
    onClose();
  };

  const sidebarVariants = {
    open: {
      x: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
      },
    },
    closed: {
      x: "-100%",
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
      },
    },
  };

  const itemVariants = {
    open: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.2,
      },
    },
    closed: {
      opacity: 0,
      x: -20,
    },
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700">
        {/* Logo */}
        <div className="flex items-center justify-center h-16 px-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl shadow-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                TaskFlow Pro
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Project Management
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.href ||
              (item.href !== "/dashboard" &&
                location.pathname.startsWith(item.href));

            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 text-primary-700 dark:text-primary-300 shadow-sm border border-primary-100 dark:border-primary-800"
                    : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                <Icon
                  className={`mr-3 h-5 w-5 ${
                    isActive
                      ? item.color
                      : "text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-300"
                  }`}
                />
                {item.name}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="ml-auto w-2 h-2 bg-primary-500 rounded-full"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center space-x-3 mb-4">
            <img
              src={
                user?.avatar ||
                `https://ui-avatars.com/api/?name=${user?.name}&background=6366f1&color=ffffff`
              }
              alt={user?.name}
              className="w-10 h-10 rounded-full ring-2 ring-primary-100 dark:ring-primary-800"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                {user?.name}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                {user?.email}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-2 text-sm font-medium text-error-700 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 rounded-lg transition-colors group"
          >
            <LogOut className="mr-3 h-4 w-4 group-hover:scale-110 transition-transform" />
            Sign out
          </button>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <motion.div
        variants={sidebarVariants}
        initial="closed"
        animate={isOpen ? "open" : "closed"}
        className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700 lg:hidden"
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                TaskFlow Pro
              </h1>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navigationItems.map((item, index) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.href ||
              (item.href !== "/dashboard" &&
                location.pathname.startsWith(item.href));

            return (
              <motion.div
                key={item.name}
                variants={itemVariants}
                initial="closed"
                animate={isOpen ? "open" : "closed"}
                transition={{ delay: index * 0.1 }}
              >
                <NavLink
                  to={item.href}
                  onClick={onClose}
                  className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 text-primary-700 dark:text-primary-300 shadow-sm border border-primary-100 dark:border-primary-800"
                      : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white"
                  }`}
                >
                  <Icon
                    className={`mr-3 h-5 w-5 ${
                      isActive
                        ? item.color
                        : "text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-300"
                    }`}
                  />
                  {item.name}
                </NavLink>
              </motion.div>
            );
          })}
        </nav>

        {/* Mobile User Profile */}
        <motion.div
          variants={itemVariants}
          initial="closed"
          animate={isOpen ? "open" : "closed"}
          transition={{ delay: 0.4 }}
          className="p-4 border-t border-neutral-200 dark:border-neutral-700"
        >
          <div className="flex items-center space-x-3 mb-4">
            <img
              src={
                user?.avatar ||
                `https://ui-avatars.com/api/?name=${user?.name}&background=6366f1&color=ffffff`
              }
              alt={user?.name}
              className="w-10 h-10 rounded-full ring-2 ring-primary-100 dark:ring-primary-800"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                {user?.name}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                {user?.email}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-2 text-sm font-medium text-error-700 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 rounded-lg transition-colors group"
          >
            <LogOut className="mr-3 h-4 w-4 group-hover:scale-110 transition-transform" />
            Sign out
          </button>
        </motion.div>
      </motion.div>
    </>
  );
};
export default Sidebar;
