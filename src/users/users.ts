import express from "express";
import {prisma} from "../index";

const userRouter = express.Router();


userRouter.post("/create", async (req, res) => {
    const {id, name, email} = req.body;
    const user = await prisma.user.upsert({
        where:{
            id: id
        },
        update:{},
        create: {
            id: id,
            name: name,
            email: email
        }
    }).catch((err) => {
        res.send(err).status(400);
    });
    res.send(user).status(200);
});


userRouter.get("/:email", async (req, res) => {
    const {email} = req.params;
    const user = await prisma.user.findUnique({
        include:{
          projects: true,
          adminProjects: true
        },
        where:{
            email: email
        }
    }).catch((err) => {
        res.send(err).status(400);
    });
    if (!user){
        res.send("User not found").status(404);
        return;
    }
    res.send(user).status(200);
});

userRouter.patch("/update", async (req, res) => {
    const {id, name, email} = req.body;
    const user = await prisma.user.upsert({
        where:{
            id: id
        },
        update:{
            name: name,
        },
        create: {
            id: id,
            name: name,
            email: email
        }
    }).catch((err) => {
        res.send(err).status(400);
    });
    res.send(user).status(200);
});

export default userRouter;