const express = require("express");
const app = express();
const port = process.env.PORT;
const socket = require("socket.io");
const cors = require("cors");

function User(username, player, wordschoosen, wordToGuess, points) {
  this.username = username;
  this.player = player;
  this.wordschoosen = wordschoosen;
  this.wordToGuess = wordToGuess;
  this.points = points;
}
const players = [];
app.use(cors());
app.use(express.json());

const server = app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});

const io = socket(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  socket.on("join_game", (data) => {
    if (players.length === 2) {
      io.emit("player_entered", { err: "2 players are already connected" });
      return;
    }
    let player = new User(data.currentUser.username, !players.length ? 1 : 2);
    console.log(player, "This is the user from constructor");
    players.push(player);
    socket.join(data.gameId);
    io.emit("player_entered", { players: players });
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
    players[currentPlayerIndex].points =
      players[currentPlayerIndex].points + data;
    let temp = players[0].player;
    players[0].player = players[1].player;
    players[1].player = temp;
    io.emit("switch_context", players);
  });

  socket.on("exit_game", (gameId) => {
    players.pop();
    players.pop();
    socket.leave(gameId);
    socket.broadcast.emit("game_ended");
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});
