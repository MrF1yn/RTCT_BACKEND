import express from "express";
import {prisma} from "../index";

const projectsRouter = express.Router();


projectsRouter.post("/create", async (req, res) => {
    const { name, adminId} = req.body;
    const project = await prisma.project.create({
        data: {
            name: name,
            image: Buffer.from(""),
            adminId: adminId,
            githubRepo: "www.github.com"
        }
    });
    res.send(project).status(200);
});

export default projectsRouter;