const express = require("express");
const jwt = require("express-jwt");
const jwksRsa = require("jwks-rsa");
const { join } = require("path");
const morgan = require("morgan");
const helmet = require("helmet");
const app = express();
const request = require("request");
const bodyParser = require("body-parser");
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

// Order History Function
function recHist(callback) {
  
  const options = { method: 'POST',
  url: 'https://dev-9obe8yjx.us.auth0.com/oauth/token',
  headers: { 'content-type': 'application/json' },
  body: '{"client_id":"ydKZ55jgSiLCzPQiPoDTO6IgjA8OXk4v","client_secret":"A-loyk_cEbT_rJY4Eg45ywDPcW12tDIZRJt-SD22UhsnSNGhGAIzPwkOBCLdbzvm","audience":"https://dev-9obe8yjx.us.auth0.com/api/v2/","grant_type":"client_credentials"}' };

  request(options, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      result = JSON.parse(body);
      var resultToken = result.access_token
      return callback(resultToken);
    } else {
      return callback(null, error);;
    }
  });

};

// API Endpoint to Record User History
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.raw());
app.post("/api/orderhistory", (req, res) => {
  
  const bodyData = req.body
  const user_id = bodyData.userid
  const order_time = bodyData.datetime
  const order_num = bodyData.ordernum
  
  recHist(function(result){
    const options = { 
      method: 'PATCH',
      json: true,
      url: 'https://dev-9obe8yjx.us.auth0.com/api/v2/users/' + user_id,
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'authorization': 'Bearer ' + result
      },
      body: {
        'app_metadata': {
            [order_num] : [order_time]
        }
      }
    }

    request(options, function(error, response, body) {
      if (!error && response.statusCode == 200) {
        console.log(body)
        res.send({
          msg: "recorded"
        })
      } else {
        console.log(error)
        res.send({
          msg: "error"
        })
      }
    });
  })
});

// API Endpoint to get User Order History
app.post("/api/uoh", (req, res) => {
  const bodyData = req.body
  const user_id = bodyData.userid

  recHist(function(result){
    const options = { 
      method: 'GET',
      json: true,
      url: 'https://dev-9obe8yjx.us.auth0.com/api/v2/users/' + user_id + '?fields=app_metadata&include_fields=true',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'authorization': 'Bearer ' + result
      }
    }

    request(options, function(error, response, body) {
      if (!error && response.statusCode == 200) {
        // console.log(body)
        res.send({
          msg: body,
        })
      } else {
        console.log(error)
        res.send({
          msg: "error"
        })
      }
    });
  })

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
