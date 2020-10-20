const express = require("express");
const jwt = require("express-jwt");
const jwksRsa = require("jwks-rsa");
const { join } = require("path");
const morgan = require("morgan");
const helmet = require("helmet");
const app = express();
const authConfig = require("./auth_config.json");

// Jwt Middleware
const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${authConfig.domain}/.well-known/jwks.json`
  }),

  audience: authConfig.audience,
  issuer: `https://${authConfig.domain}/`,
  algorithms: ["RS256"]
});

// API Endpoint
app.get("/api/external", checkJwt, (req, res) => {
  res.send({
    msg: "success"
  });
});

// Error Handling
app.use(function(err, req, res, next) {
  if (err.name === "UnauthorizedError") {
    return res.status(401).send({ msg: "Invalid token" });
  }

  next(err, req, res);
});

app.get("/auth_config.json", (req, res) => {
  res.sendFile(join(__dirname, "auth_config.json"));
});

app.use(morgan("dev"));
app.use(helmet());
app.use(express.static(join(__dirname, "public")));

app.get("/*", (_, res) => {
  res.sendFile(join(__dirname, "index.html"));
});

process.on("SIGINT", function() {
  process.exit();
});

module.exports = app;
