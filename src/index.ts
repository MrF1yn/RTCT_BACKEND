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

import express, { Express, Request, Response } from "express";
import {createServer} from "node:http";
import {Server} from "socket.io";
import dotenv from "dotenv";
import { PrismaClient } from '@prisma/client'
import userRouter from "./users/users";

dotenv.config();

const app: Express = express();
const server = createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;
const prisma = new PrismaClient();

export { prisma };

app.use(express.json());

app.use("/users", userRouter);

app.get("/", (req: Request, res: Response) => {
    res.send("Express + TypeScript Server");
});






io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
    socket.on('message', (msg) => {
        console.log('message: ' + msg + " from: " + socket.id);

    });
});

server.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});

