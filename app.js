const http = require("http");
const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server);
const port = 8080;
app.use(express.static(__dirname + "/public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

// Trie Node Definition
class TrieNode {
  constructor() {
    this.children = {};
    this.isEndOfWord = false;
  }
}

// Trie Data Structure
class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  insert(word) {
    let node = this.root;
    for (let char of word) {
      if (!node.children[char]) {
        node.children[char] = new TrieNode();
      }
      node = node.children[char];
    }
    node.isEndOfWord = true;
  }

  containsBadWord(text) {
    let words = text.split(/\s+/);
    let filteredWords = words.map(word => 
      this.search(word) ? "*".repeat(word.length) : word
    );
    return filteredWords.join(" ");
  }

  search(word) {
    let node = this.root;
    for (let char of word) {
      if (!node.children[char]) return false;
      node = node.children[char];
    }
    return node.isEndOfWord;
  }
}

// Load abusive words into Trie
const trie = new Trie();
const loadBadWords = () => {
  const filePath = path.join(__dirname, "badwords.txt");
  if (fs.existsSync(filePath)) {
    const words = fs.readFileSync(filePath, "utf-8").split(/\r?\n/);
    words.forEach((word) => trie.insert(word.trim().toLowerCase()));
    console.log("Abuse words loaded into Trie.");
  } else {
    console.log("File Not Found!");
  }
};
loadBadWords();

// Socket.io Set-up
var users = {};

io.on("connection", (socket) => {
  socket.on("new-user-joined", (username) => {
    users[socket.id] = username;
    socket.broadcast.emit("user-connected", username);
    io.emit("user-list", users);
  });

  socket.on("disconnect", () => {
    socket.broadcast.emit("user-disconnected", users[socket.id]);
    delete users[socket.id];
    io.emit("user-list", users);
  });

  socket.on("message", (data) => {
    let filteredMsg = trie.containsBadWord(data.msg.toLowerCase());
    console.log(`Original: ${data.msg} | Filtered: ${filteredMsg}`);
    socket.broadcast.emit("message", { user: data.user, msg: filteredMsg });
  });
});

// Server Start
server.listen(port, () => {
  console.log("Server started @ Port : " + port);
});
