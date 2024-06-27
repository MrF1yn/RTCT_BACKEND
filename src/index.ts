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
import {Server} from "socket.io";
import dotenv from "dotenv";
import { PrismaClient } from '@prisma/client'
import userRouter from "./users/users";
import projectsRouter from "./projects/projects";
import cors from "cors";
import {setupKinde, protectRoute, getUser, GrantType} from "@kinde-oss/kinde-node-express";
import {jwtVerify} from "@kinde-oss/kinde-node-express";


import {MongoClient, ServerApiVersion} from 'mongodb';
const uri = "mongodb+srv://mrflyn6000:wlMS2pJFUH0Lckau@cluster0.iyp4pok.mongodb.net/?appName=Cluster0";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
export const mongoClient = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await mongoClient.connect();
        // Send a ping to confirm a successful connection
        await mongoClient.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    }catch (e) {
        console.error(e);
    }
}
run().catch(console.dir);



dotenv.config();
// const config = {
//     clientId: process.env.KINDE_CLIENT_ID || "",
//     issuerBaseUrl: process.env.KINDE_ISSUER_URL || "",
//     siteUrl: process.env.KINDE_SITE_URL || "",
//     secret: process.env.KINDE_CLIENT_SECRET || "",
//     redirectUrl: process.env.KINDE_POST_LOGIN_REDIRECT_URL || "",
//     scope: "openid profile email",
//     grantType: GrantType.AUTHORIZATION_CODE, //or CLIENT_CREDENTIALS or PKCE
//     unAuthorisedUrl: process.env.KINDE_POST_LOGOUT_REDIRECT_URL || "",
//     postLogoutRedirectUrl: process.env.KINDE_POST_LOGOUT_REDIRECT_URL || ""
// };

const app: Express = express();
// setupKinde(config, app);
const server = createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;
const prisma = new PrismaClient();


const verifier = jwtVerify("https://mrflyn6000.kinde.com", {"audience": "rtct_backend_api"});
export {verifier};
export { prisma };

export async function verifierMiddleware (req: any, res: any, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1] || "";
        const headers = {
            'Accept':'application/json',
            'Authorization':`Bearer ${token}`
        };
        const result = await fetch('https://mrflyn6000.kinde.com/oauth2/user_profile',
            {
                method: 'GET',

                headers: headers
            });


        // const payload = await verifier.verify(token);
        if(result.status === 200){
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



app.use(cors({
    origin: "*",
    credentials:true,            //access-control-allow-credentials:true
}));

app.use(express.json({
    limit: "5mb"
}));

app.use("/users", userRouter);
app.use("/projects", projectsRouter);

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

