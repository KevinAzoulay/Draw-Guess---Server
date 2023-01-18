const express = require("express");
const app = express();
const port = process.env.PORT || 8080;
const socket = require("socket.io");
const cors = require("cors");

function User(username, player, wordschoosen, wordToGuess, points) {
  this.username = username;
  this.player = player;
  this.wordschoosen = wordschoosen;
  this.wordToGuess = wordToGuess;
  this.points = 0;
}
const players = [];
let gameId = "";
app.use(cors());
app.use(express.json());

const server = app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

const io = socket(server, {
  cors: {
    origin: "*",
  },
});
console.log(
  io.on("connection", (socket) => {
    socket.on("join_game", (data) => {
      if (players.length === 2) {
        io.emit("room_full");
        return;
      }
      let player = new User(data.currentUser.username, data.currentUser.player);
      // let player = new User(data.currentUser.username, !players.length ? 1 : 2);
      console.log(player, "This is the user from constructor");
      players.push(player);
      gameId = data.gameId;
      socket.join(data.gameId);
      io.emit("player_entered", { players: player });
      console.log(players);
    });

    socket.on("send_word", (data) => {
      console.log(data.data, "from word");
      const wordToGuess = data.data.word;
      if (data.player == 1) {
        players[0] = { ...players[0], wordschoosen: wordToGuess };
        players[1] = { ...players[1], wordToGuess: wordToGuess };
      } else {
        players[1] = { ...players[0], wordschoosen: wordToGuess };
        players[0] = { ...players[1], wordToGuess: wordToGuess };
      }
      socket.broadcast.emit("received_word", {
        wordToGuess,
        currentBetPoint: data.data.currentBetPoint,
      });
    });

    socket.on("send_canvas", (data) => {
      console.log("send_message", data);
      const canvasParams = data.data;
      socket.broadcast.emit("received_canvas", canvasParams);
    });

    socket.on("add_point", ({ data, player }) => {
      let currentPlayerIndex = players.findIndex((p) => p.player == player);
      console.log(data + player + currentPlayerIndex, +players);
      players[currentPlayerIndex].points =
        players[currentPlayerIndex].points + data;
      console.log(
        players[currentPlayerIndex].points + "Point fromn server" + data
      );
      let temp = players[0].player;
      players[0].player = players[1].player;
      players[1].player = temp;
      io.emit("switch_context", players);
    });

    socket.on("exit_game", (gameId) => {
      players.pop();
      players.pop();
      socket.leave(gameId);
      gameId = "";
      socket.broadcast.emit("game_ended");
    });

    socket.on("disconnect", () => {
      console.log("user disconnected");
    });
  })
);

app.get("/", (req, res) => {
  res.send("Hello World!");
});
