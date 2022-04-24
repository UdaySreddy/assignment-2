let express = require("express");
let sqlite = require("sqlite");
let sqlite3 = require("sqlite3");
let path = require("path");
let bcrypt = require("bcrypt");
let jwt = require("jsonwebtoken");
let { open } = require("sqlite");
let app = express();
app.use(express.json());
let base = path.join(__dirname, "twitterClone.db");
let db = null;
let initiate = async () => {
  try {
    db = await open({
      filename: base,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log(`server running http://localhost:3000 running....`);
    });
  } catch (e) {
    console.log(`error:${e.message}`);
    process.exit(1);
  }
};
initiate();

//register user api

app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  console.log(username, password, name, gender);
  let query1 = `select * from user where username = "${username}";`;
  let x = await db.get(query1);
  console.log(x);

  if (x !== undefined) {
    response.send("User already exists");
    response.status(400);
  } else if (password.length < 6) {
    response.send("Password is too short");
    response.status(400);
  } else {
    let hashedPassword = await bcrypt.hash(password, 15);
    console.log(hashedPassword);
    let query2 = `insert into user (username, password, name, gender) 
      values("${username}", "${hashedPassword}", "${name}", "${gender}");`;
    await db.run(query2);
    response.status(200);
    response.send("User created successfully");
  }
});

//login user
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  let query3 = `select * from user where username = "${username}";`;
  let x = await db.get(query3);
  console.log(x);
  if (x === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    let ismatch = await bcrypt.compare(password, x.password);
    console.log(ismatch);
    if (ismatch) {
      let payload = { username: username };
      let jwttoken = await jwt.sign(payload, "secret_key");
      response.send({ jwtToken: jwttoken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

let logger = (request, response, next) => {
  let jwtToken;
  let authHead = request.headers["authorization"];
  if (authHead !== undefined) {
    jwtToken = authHead.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "secret_key", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

//get tweets user follows

app.get("/user/tweets/feed/", logger, async (request, response) => {
  const { username } = request;
  console.log(username);
  let querytweet = `select username,tweet,date_time as dateTime from 
  ((user inner join follower on user.user_id=follower.follower_user_id) as t 
 inner join tweet on t.following_user_id = tweet.user_id ) as q 
 
  where user.username = "${username}"
  limit 4;`;
  let tweets = await db.all(querytweet);
  console.log(tweets);
});

//delete user
app.delete("/delete/:userId", async (request, response) => {
  const { userId } = request.params;
  let deleteQuery = `delete from user where user_id= ${userId};`;
  await db.run(deleteQuery);
  response.send("user deleted");
});

module.exports = app;
