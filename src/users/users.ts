import express from "express";
import {prisma} from "../index";

const userRouter = express.Router();


userRouter.post("/create", async (req, res) => {
    const {id, name, email} = req.body;
    const user = await prisma.user.create({
        data: {
            id: id,
            name: name,
            email: email
        }
    })
    res.send(user).status(200);
});

export default userRouter;