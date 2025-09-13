const jwt = require("jsonwebtoken");

const jwtConfig = {
  accessToken: {
    secret: process.env.JWT_SECRET || process.env.JWT_SECRET_PRIMARY,
    expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES || "15m",
  },
  refreshToken: {
    secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET_SECONDARY,
    expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES || "7d",
  },
};

const generateTokens = (userId, rememberMe = false) => {
  const payload = { userId };

  const accessToken = jwt.sign(payload, jwtConfig.accessToken.secret, {
    expiresIn: rememberMe ? "1h" : jwtConfig.accessToken.expiresIn,
    issuer: process.env.JWT_ISSUER || "taskflow-pro",
    audience: process.env.JWT_AUDIENCE || "taskflow-users",
  });

  const refreshToken = jwt.sign(payload, jwtConfig.refreshToken.secret, {
    expiresIn: rememberMe ? "30d" : jwtConfig.refreshToken.expiresIn,
    issuer: process.env.JWT_ISSUER || "taskflow-pro",
  });

  return { accessToken, refreshToken };
};

const verifyToken = (token, type = "access") => {
  const secret =
    type === "refresh"
      ? jwtConfig.refreshToken.secret
      : jwtConfig.accessToken.secret;

  return jwt.verify(token, secret);
};

module.exports = { generateTokens, verifyToken, jwtConfig };
