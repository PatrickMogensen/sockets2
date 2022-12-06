//setup nodejs expxress server

var express = require('express');
var app = express();
var cors = require('cors')
app.use(cors())
var socket = require('socket.io');
var http = require('http').Server(app);
var io = socket(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]

    }
})
app.set('socketIo', io);


/* vi skal have to funktioner
1. en der finder al den data en given bruger skal bruge (online venner, offline venner og inviterede venner)
function findData(id)
2. en der returnerer et array med alle online venners socket id'er og id'er
function findOnlineFriends(id)
 */

function findOnlineFriends(id, onlineUsers) {
    let friends
    client.db('test').collection('users').findOne({_id: id}).then((user) => {
        friends = user.friends;
    })

    let onlineFriends = [];
    friends.forEach((friend) => {
        onlineUsers.forEach((onlineUser) => {
            if (friend == onlineUser.id) {
                onlineFriends.push({id: friend, socketId: onlineUser.socketId});
            }
        })
    })
    return onlineFriends;
}


function findData(id, onlineUsers) {
    let friends
    client.db('test').collection('users').findOne({_id: id}).then((user) => {
        friends = user.friends;
    })
    let onlineFriends = findOnlineFriends(id, onlineUsers);
    let offlineFriends = [];
    friends.forEach((friend) => {
        if (!onlineFriends.some((onlineFriend) => onlineFriend.id == friend)) {
            offlineFriends.push(friend);
        }
    })
    let invitedFriends = [];
    client.db('test').collection('invites').find({invitedBy: id}).toArray().then((invites) => {
        invitedFriends = invites;
    })
    return {onlineFriends: onlineFriends, offlineFriends: offlineFriends, invitedFriends: invitedFriends};
}




    //find online friends
    let onlineFriends = [];
    let offlineFriends = [];
    let invitedFriends = [];

    //find offline friends
    //find invited friends
    //return array with all data

    
}
    const users = client.db('test').collection('users');
    users.findOne({_id: id}).

var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectId;

class OnlineUser {
    constructor(user, socketID) {
        this.user = user;
        this.socketIds = [socketID];
    }
}
const uri = "mongodb+srv://backend_api:wUxq6JpeA5Q9MyBc@cluster0.uevphbe.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
var onlineUsers = {};


// on connection fetch user from db, create new OnlineUser and add to onlineUsers array
io.on('connection', function(socket){
    console.log('a user connected: ' + socket.id);
    try {
        const id = new ObjectId(socket.handshake.query.id);
                console.log('Connected to Database')
                const users = client.db('test').collection('users')
                users.findOne({_id: id}).then((user) => {
                    let onlineUser = new OnlineUser(user, socket.id);
                    onlineUsers[user._id] = onlineUser;
                    console.log(JSON.stringify(onlineUsers));
                    onlineUsers.add(onlineUser);


                })} catch (e) {
                    console.log(e);
                }})




http.listen(3000, function(){
    console.log('listening on *:3000');
});
