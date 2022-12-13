var app = require('express')();
var http = require('http').Server(app);
const { MongoClient, ObjectId} = require('mongodb');
var jsonwebtoken = require('jsonwebtoken');
var secret = "secret";
const port = process.env.PORT || 4000
const cors = require('cors');
const bodyParser = require('body-parser');
app.use(bodyParser.json({extended: true}));

app.use(cors({ origin: '*' }));

var io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        allowedHeaders: ["authorizationToken"]

    }
})
app.set('socketIo', io);

const uri = "mongodb+srv://backend_api:wUxq6JpeA5Q9MyBc@cluster0.uevphbe.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
var onlineUsers = [];

async function findOnlineFriends(id, onlineUsers) {
    return new Promise(function(resolve, reject) {
        let friends
        let onlineFriends = [];
    client.db('test').collection('users').findOne({_id: id}).then((user) => {
        console.log("user result " + user);
        friends = user.friends;
        console.log("friends " + friends);
        friends.forEach((friend) => {
            onlineUsers.forEach((onlineUser) => {
               // console.log("onlineUser.id " + onlineUser.id + " friend " + friend);
                if (friend.toString() == onlineUser.id.toString()) {
                    console.log("match")
                onlineFriends.push({id: friend, socketId: onlineUser.socketId,
                    firstName : onlineUser.firstName, lastName: onlineUser.lastName});
                }
            })
         })
    resolve(onlineFriends);
    })
    })

}


function findData(id, onlineUsers) {
    try{
    return new Promise(function(resolve, reject) {
    let friends
    client.db('test').collection('users').findOne({_id: id}).then((user) => {
        if(user.friends) {
            friendIds = user.friends;

            const projection = {_id: 1, firstName: 1, lastName: 1};
            client.db('test').collection('users').find({_id: {$in: friendIds}}, {projection}).toArray().then((friends) => {

                findOnlineFriends(id, onlineUsers).then((onlineFriends) => {
                    console.log("onlineFriends fundet " + JSON.stringify(onlineFriends));

                    let offlineFriends = [];

                    //hvis onlineFriends indeholder friend, så skal den ikke tilføjes til offlineFriends
                    let onlineFriendsIds = onlineFriends.map((friend) => friend.id.toString());
                    console.log("onlineFriendsIds " + onlineFriendsIds);
                    console.log("typeof onlineFriendsIds " + typeof onlineFriendsIds[0] + " typeof friendIds " + typeof friendIds[0]);
                    friends.forEach((friend) => {
                        if (!onlineFriendsIds.includes(friend._id.toString())) {
                            console.log("offline friend " + friend._id);
                            offlineFriends.push(friend);
                        }
                    })
                    //remove duplicate ids of onlineFriends
                    let uniqueOnlineFriends = onlineFriends.filter((friend, index, self) => index === self.findIndex((t) => (t.id === friend.id)))

                    let invitedFriends = [];
                    client.db('test').collection('invites').find({invitedBy: new ObjectId(id)}).toArray().then((invites) => {
                        invitedFriends = invites;
                        resolve({
                            onlineFriends: uniqueOnlineFriends,
                            offlineFriends: offlineFriends,
                            invitedFriends: invitedFriends
                        });
                    })
                })

            })
        } else {
            resolve({})
        }
    })

    })
    } catch (err) {
        console.log("error " + err);
    }
}

io.on('connection', function(socket){
    console.log('a user connected: ' + socket.id);
        try {
            var id
            const token = socket.handshake.headers.authorizationtoken
            console.log("scoket.handshake.header: " + JSON.stringify(socket.handshake.headers.authorizationtoken))
            if (token){
                console.log("token " + token);
                decoded = jsonwebtoken.verify(token, secret);
                console.log("id " + JSON.stringify(decoded._id));
                id = JSON.stringify(decoded._id).replace(/['"]+/g, '');

                
                id = new ObjectId(id);
            } else {
                console.log("no token");
            }
                    console.log('Connected to Database')
                    const users = client.db('test').collection('users')
                    users.findOne({_id: id}).then((user) => {
                        //add user if not already in array
                            onlineUsers.push({id: user._id, socketId: socket.id, firstName: user.firstName, lastName: user.lastName});

                        let friends = user.friends;

                        findData(id, onlineUsers).then((data) => {
                            console.log("data " + data);
                            io.to(socket.id).emit('onlineFriends', data.onlineFriends);
                            io.to(socket.id).emit('offlineFriends', data.offlineFriends);
                            io.to(socket.id).emit('invitedFriends', data.invitedFriends);
                        })

                        findOnlineFriends(id, onlineUsers).then((onlineFriends) => {
                            console.log("onlineFriends fundet " + onlineFriends);
                            onlineFriends.forEach((friend) => {
                                findData(friend.id, onlineUsers).then((data) => {
                                    io.to(friend.socketId).emit('onlineFriends', data.onlineFriends);
                                    io.to(friend.socketId).emit('offlineFriends', data.offlineFriends);
                                    io.to(friend.socketId).emit('invitedFriends', data.invitedFriends);
                                })
                            })
                        })

                        /*
                        onlineUsers.forEach((onlineUser) => {
                            //find online friends and emit friend offline
                            console.log(findOnlineFriends(user._id, onlineUsers));
                            findOnlineFriends(user._id, onlineUsers).then((onlineFriends) => {
                                console.log("onlineFriends " + onlineFriends.length);
                                console.log("onlineFriends " + JSON.stringify(onlineFriends));
                                    findData(user._id, onlineUsers).then((data) => {
                                        console.log("data " + JSON.stringify(data));
                                        io.to(onlineFriend.socketId).emit('data', {data: data});
                                })
                            })

                            if (friends.some((friend) => friend.toString() == onlineUser.id.toString())) {
                                    io.to(socket.id).emit('friendOnline', onlineUser.id);
                                    io.to(onlineUser.socketId).emit('friendOnline', id);
                                } else {
                                    io.to(socket.id).emit('friendOffline', onlineUser.id);
                                }
                        })
                        */
                    })
            // users.push(user);
        } catch (e) {
            console.log(e);
        }

        // find invited but unregistered friends
    try {

        const id = new ObjectId(socket.handshake.query.id);
        console.log("socket.handshake.query.id" + socket.handshake.query.id)
        const invites = client.db('test').collection('invites');
        invites.find({invitedBy: id}).toArray().then((unregisteredFriends) => {
            console.log(unregisteredFriends);
            unregisteredFriends.forEach((friend) => {
                if (!friend.accepted) {
                    console.log( "unregistered friend: " + friend._id);
                    io.to(socket.id).emit('unregisteredFriend', friend);
                }
            })
        })
    } catch (e) {
        console.log(e);
    }

    socket.on('disconnect', function(){
        console.log('user disconnected:' + socket.id);

        try {
        //find online user with socket id and remove from onlineUsers array
        onlineUsers.forEach((disconnectedUser, index) => {
            if (disconnectedUser.socketId == socket.id) {
                let id = disconnectedUser.id;
                onlineUsers.splice(index, 1);
                findOnlineFriends(id, onlineUsers).then((onlineFriends) => {
                    console.log("onlineFriends fundet " + onlineFriends);
                    onlineFriends.forEach((friend) => {
                        findData(friend.id, onlineUsers).then((data) => {
                            io.to(friend.socketId).emit('onlineFriends', data.onlineFriends);
                            io.to(friend.socketId).emit('offlineFriends', data.offlineFriends);
                            io.to(friend.socketId).emit('invitedFriends', data.invitedFriends);
                        })
                    })
                })


            }

                /*
                const users = client.db('test').collection('users')
                users.findOne({_id: disconnectedUser.id}).then((disconnectedUser) => {console.log(disconnectedUser)
                    let friends = disconnectedUser.friends;
                    console.log("friends size + " + friends.length)
                    onlineUsers.forEach((user) => {
                        //find online friends and emit friend offline
                        if (friends.some((friend) => friend.toString() == user.id.toString())) {
                            io.to(user.socketId).emit('friendOffline', disconnectedUser._id);
                            console.log("friend offline: " + disconnectedUser._id);
                        }

                    })
                    */
            })
    } catch (e) {
        console.log(e);
    }
    });
});


const auth = function(req, res, next) {
    let _id;
    if (req.headers.authorization) {
        let token = req.headers.authorization.split(' ')[1];

        let decoded = jsonwebtoken.verify(token, secret)
        if (decoded) {
            console.log("decoded " + JSON.stringify(decoded));
            console.log("decoded: " + decoded._id);
            _id = new ObjectId(decoded._id)
            req._id = _id;
            next();
        } else {
            res.status(401).send("Invalid token");
        }

    } else {
        res.status(401).send("no token");
    }
}

//send invite
app.post('/send-invite', auth, function(req, res) {
    try {
        _id = req._id


        console.log("_id " + _id + "new ObjectId(_id) " + new ObjectId(_id) );
        let invitedEmail = req.body.invitedEmail;
        console.log("invitedEmail: " + invitedEmail);
        console.log("invitedBy: " + _id);
        client.db('test').collection('invites').findOne({email: invitedEmail, invitedBy: _id}).then((user) => {
            if (!user) {
                console.log("Invite does not exist; creating invite" + invitedEmail);
                client.db('test').collection('invites').insertOne({
                    invitedBy: _id,
                    email: invitedEmail,
                    acceptedInvite: false
                }).then((result) => {
                    console.log("invite inserted: " + JSON.stringify(result));
                    res.status(200).send("Invite sent");
                })
            } else {
                console.log("Invite already exists" + invitedEmail);
                res.status(200).send("Invite already exists");
            }
        })
    } catch (e) {
        console.log(e);
    }
    })

app.post('/accept-invite', auth, function(req, res) {
    try {
        let newUserId = req._id
        let invitedEmail = req.body.invitedEmail;
        let invitedBy = req.body.inviterId;
        console.log("inviterId: " + invitedBy);
        console.log("req._id" + req._id);

        console.log("_id " + req._id + "new ObjectId(_id) " + new ObjectId(req._id) );

        if(invitedBy && invitedEmail) {
            console.log("invitedEmail: " + invitedEmail);

            // update invite where invited = newEmail and acceptedInvite = false to acceptedInvite = true
            client.db('test').collection('invites').updateOne({
                invitedBy: new ObjectId(invitedBy),
                email: invitedEmail,
                acceptedInvite: false
            }, {$set: {acceptedInvite: true}}).then((result) => {
                console.log("invite updated: " + JSON.stringify(result));
                res.status(200).send("Invite accepted");
                // set invitedBy as friend of newUserId and newUserId as friend of invitedBy
                    client.db('test').collection('users').updateOne({_id: new ObjectId(newUserId)}, {$push: {friends: new ObjectId(invitedBy)}}).then((result) => {
                        console.log("user updated: " + JSON.stringify(result));
                        client.db('test').collection('users').updateOne({_id: new ObjectId(invitedBy)}, {$push: {friends: new ObjectId(newUserId)}}).then((result) => {
                            console.log("user updated: " + JSON.stringify(result));
                        })
                    })
                })
        } else {
            res.send("No invite found");
        }
    } catch (e) {
        console.log(e);
        res.status(500).send("Internal server error");
    }
})

app.get('/invites', auth, function(req, res) {
    try {
        if(req.headers.authorization) {
            authHeader = req.headers.authorization;
            _id = req._id
            console.log(" _id: " + _id + "authHeader: " + JSON.stringify(authHeader));
            // finde email for users with _id = _id
            client.db('test').collection('users').findOne({_id: new ObjectId(_id)}).then((user) => {
                console.log("user: " + JSON.stringify(user));
                client.db('test').collection('invites').find({email: user.email}).toArray().then((invites) => {
                    res.status(200).send(invites);
                })
            })
        } else {
            res.status(401).send("Unauthorized");
        }
    } catch (e) {
        console.log(e);
        res.status(500).send("Internal server error");
    }

})




http.listen(port, function(){
    console.log('listening on *:4000');
});