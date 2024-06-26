import express from "express";
import {prisma} from "../index";

const projectsRouter = express.Router();


projectsRouter.post("/create", async (req, res) => {
    const {name, adminId, githubRepo, image} = req.body;


    const project = await prisma.project.create({
        data: {
            name: name,
            image: Buffer.from(image),
            adminId: adminId,
            githubRepo: githubRepo,
        }
    });
    const user = await prisma.user.update({
        include: {
            projects: true,
            adminProjects: true
        },
        where: {
            id: adminId
        },
        data: {
            projects: {
                connect: {
                    projectId: project.projectId
                },

            }
        }

    });
    if (!user) {
        res.send("User not found").status(404);
        return;
    }
    res.send(user).status(200);
});

projectsRouter.get("/:id/:userId", async (req, res) => {
    const {id, userId} = req.params;
    const project = await prisma.project.findUnique({
        include: {
            members: true,
            admin: true
        },
        where: {
            projectId: parseInt(id)
        }
    });
    const user = await prisma.user.findUnique({
        where: {
            id: userId
        }
    });
    if (!user) {
        res.send("User not found").status(404);
        return;
    }
    if (!project) {
        res.send("Project not found").status(404);
        return;
    }
    if (project.adminId !== userId && !project.members.includes(user)) {
        res.send("You are not authorized to view this project").status(401);
        return;
    }
    res.send(project).status(200);
});

projectsRouter.patch("/update", async (req, res) => {
    const {adminId, projectId, name, image, githubRepo, addMemberId, remMemberId, workspace, document} = req.body;
    const finalData: any = {
        name: name,
        image: image,
        githubRepo: githubRepo,
        workspace: workspace,
        document: document,
        members: addMemberId || remMemberId ? ({}) : null,
    }

    if (addMemberId && finalData.members) {
        finalData.members.connect = {
            id: addMemberId
        }
    }
    if (remMemberId && finalData.members) {
        finalData.members.disconnect = {
            id: remMemberId
        }
    }

    const data = omitNullish(finalData);
    const user = await prisma.user.findUnique({
        include: {
            adminProjects: true,
        },
        where: {
            id: adminId.toString()
        }
    });
    if (!user) {
        res.send("User not found").status(404);
        return;
    }
    if (!JSON.stringify(user.adminProjects).includes(projectId.toString())) {
        res.send("Unauthorized").status(401);
        return;
    }
    const project = await prisma.project.update({
        include: {
            members: true,
        },
        where: {
            projectId: parseInt(projectId)
        },
        data: data
    }).catch((err) => {
        res.send(err).status(400);
    });
    res.send(project).status(200);
});

function omitNullish(obj: any) {
    for (const key in obj) {
        if (!obj[key]) {
            delete obj[key];
        }
    }
    return obj;
}

export default projectsRouter;