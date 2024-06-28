// const app = require('express')();
// const server = require('http').createServer(app);
// const io = require('socket.io')(server);
// const port = process.env.PORT || 8080;
// app.get('/', function(req, res) {
//     res.sendfile('index.html');
// });
// server.listen(port, function() {
//     console.log(`Listening on port ${port}`);
// });

import express, {Express, NextFunction, Request, Response} from "express";
import {createServer} from "node:http";
import {Server, Socket} from "socket.io";
import dotenv from "dotenv";
import {PrismaClient} from '@prisma/client'
import userRouter from "./users/users";
import projectsRouter from "./projects/projects";
import cors from "cors";
import {setupKinde, protectRoute, getUser, GrantType} from "@kinde-oss/kinde-node-express";
import {jwtVerify} from "@kinde-oss/kinde-node-express";


import {Db, Document, MongoClient, ServerApiVersion} from 'mongodb';
import {DefaultEventsMap} from "socket.io/dist/typed-events";
import {randomUUID} from "node:crypto";


const uri = "mongodb+srv://mrflyn6000:wlMS2pJFUH0Lckau@cluster0.iyp4pok.mongodb.net/?appName=Cluster0";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
export const mongoClient = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

export let mongoDb: Db;

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await mongoClient.connect();
        // Send a ping to confirm a successful connection
        await mongoClient.db("rtct").command({ping: 1});
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
        mongoDb = mongoClient.db("rtct");
    } catch (e) {
        console.error(e);
    }
}

run().catch(console.dir);


dotenv.config();

const app: Express = express();
// setupKinde(config, app);
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        credentials: true,
    },
});
const port = process.env.PORT || 3000;
const prisma = new PrismaClient();
const socketUsersMap = new Map<Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>, any>();
const userChatHistory = new Map<string, [[any, any]]>();
const verifier = jwtVerify("https://mrflyn6000.kinde.com", {"audience": "rtct_backend_api"});
export {verifier};
export {prisma};

export async function verifierMiddleware(req: any, res: any, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1] || "";
        const headers = {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
        };
        const result = await fetch('https://mrflyn6000.kinde.com/oauth2/user_profile',
            {
                method: 'GET',

                headers: headers
            });


        // const payload = await verifier.verify(token);
        if (result.status === 200) {
            req.user = await result.json();
            next();
            return;
        }
        res.send("Invalid token").status(401);
        return;
    } catch (err) {
        console.log(err);
        res.send("Invalid token ERROR").status(401);
        return;
    }
}


function populateMessagePacket(user: any, msg: string) {
    return {
        id: randomUUID().toString(),
        senderID: user.id,
        senderName: user.first_name + " " + user.last_name,
        timestamp: new Date().getTime(),
        content: {
            msgType: "text",
            text: msg
        }
    }
}


app.use(cors({
    origin: "*",
    credentials: true,            //access-control-allow-credentials:true
}));

app.use(express.json({
    limit: "5mb"
}));

app.use("/users", userRouter);
app.use("/projects", projectsRouter);

app.get("/", (req: Request, res: Response) => {
    res.send("Express + TypeScript Server");
});


io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    // ...
    const headers = {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
    };
    const result = await fetch('https://mrflyn6000.kinde.com/oauth2/user_profile',
        {
            method: 'GET',
            headers: headers
        });


    // const payload = await verifier.verify(token);
    if (result.status === 200) {
        socketUsersMap.set(socket, await result.json());
        next();
        return;
    }
    const err = new Error("not authorized");
    next(err);

});

io.on('connection', (socket) => {
    const user = socketUsersMap.get(socket);
    console.log(user.first_name + ' connected');
    socket.on('disconnect', () => {
        console.log(user.first_name + ' disconnected');
        socketUsersMap.delete(socket);
    });

    socket.on('project:join', async (projectId) => {
        const user = socketUsersMap.get(socket);
        const project = await prisma.project.findUnique({
            include: {
                members: true,
                admin: true
            },
            where: {
                projectId: parseInt(projectId)
            }
        }).catch((err) => {
            console.log(err);
        });
        if (!project) {
            return;
        }
        if (project.members.toString().includes(user.id) || project.adminId === user.id) {
            socket.join(projectId);
            const chatHistory = userChatHistory.get(projectId);
            if(!chatHistory) return;
            for(let [user1, packet] of chatHistory){
                socket.emit('project:message:receive', projectId, user1, packet);
            }
        }
    });

    socket.on('project:message:send', async (projectId, msg) => {
        const user = socketUsersMap.get(socket);

        if (socket.rooms.has(projectId)){
            const chatHistory = userChatHistory.get(projectId);
            const packet = populateMessagePacket(user, msg);
            io.to(projectId).emit('project:message:receive', projectId, user, packet);
            if (chatHistory) {
                chatHistory.push([user, packet]);
                userChatHistory.set(projectId, chatHistory);
            } else{
                userChatHistory.set(projectId, [[user, packet]]);
            }

        }
    });

    socket.on('message:history', async (msg) => {
        console.log('message: ' + msg + " from: " + socket.id);
        const user = socketUsersMap.get(socket);
        const history = (await mongoDb.collection("chat_history").find({userId: user.id}).toArray());
        socket.emit('message:history', JSON.stringify(history));
        const chatHistory = userChatHistory.get(user.id);
        if (!chatHistory) return;
        for (let [user1, packet] of chatHistory) {
            socket.emit('message:receive', user1, packet);
        }
    });

    socket.on('message:send', async (target, msg) => {
        const user = socketUsersMap.get(socket);
        const packet = populateMessagePacket(user, msg);
        const senderChatHistory = userChatHistory.get(user.id);
        const receiverChatHistory = userChatHistory.get(target);
        if (senderChatHistory) {
            senderChatHistory.push([user, packet]);
            userChatHistory.set(user.id, senderChatHistory);
        } else {
            userChatHistory.set(user.id, [[user, packet]]);
        }
        if (receiverChatHistory) {
            receiverChatHistory.push([user, packet]);
            userChatHistory.set(target, receiverChatHistory);
        } else {
            userChatHistory.set(target, [[user, packet]]);
        }

        socket.emit('message:receive', user, packet);
        const targetSocket =
            Array.from(socketUsersMap).find(([_, user]) => user.id === target);
        if (!targetSocket?.length) return;
        targetSocket[0].emit('message:receive', user, packet);
    });


});


server.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});

