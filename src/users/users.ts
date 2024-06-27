import express, {NextFunction} from "express";
import {prisma, verifierMiddleware} from "../index";


const userRouter = express.Router();


userRouter.post("/create", verifierMiddleware, async (req: any, res) => {
    console.log(req.user)
    const user = await prisma.user.upsert({
        include: {
            adminProjects: true,
            projects: true
        },
        where: {
            id: req.user.id
        },
        update: {},
        create: {
            id: req.user.id,
            name: req.user.first_name + " " + req.user.last_name,
            email: req.user.preferred_email,
            image: req.user.picture
        }
    }).catch((err) => {
        res.status(400).send(err);
    });
    res.status(200).send(user);
});

userRouter.get("/verify/:email", async (req, res) => {
    const {email} = req.params;
    console.log("VERIFY");
    const user = await prisma.user.findUnique({
        where: {
            email: email
        }
    }).then((user) => {
            if (!user) {
                res.sendStatus(400);
                return;
            }
            res.sendStatus(200);
        }
    ).catch((err) => {
        console.log(err);
        res.status(400).send(err);
    });

});

userRouter.get("/", verifierMiddleware, async (req: any, res) => {
    const user = await prisma.user.findUnique({
        include: {
            projects: true,
            adminProjects: true
        },
        where: {
            id: req.user.id
        }
    }).catch((err) => {
        res.status(400).send(err);
    });
    if (!user) {
        res.status(404).send("User not found");
        return;
    }
    res.status(200).send(user);
});

userRouter.patch("/update", verifierMiddleware, async (req: any, res) => {
    const {name} = req.body;
    const user = await prisma.user.upsert({
        where: {
            id: req.user.id
        },
        update: {
            name: name,
        },
        create: {
            id: req.user.id,
            name: name,
            email: req.user.email,
            image: req.user.picture
        }
    }).catch((err) => {
        res.status(400).send(err);
    });
    res.status(200).send(user);
});

export default userRouter;