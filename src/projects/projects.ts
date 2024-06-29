import express from "express";
import {prisma, verifierMiddleware} from "../index";

const projectsRouter = express.Router();


projectsRouter.post("/create", verifierMiddleware, async (req: any, res) => {
    const {name, githubRepo, image} = req.body;


    const project = await prisma.project.create({
        data: {
            name: name,
            image: image,
            adminId: req.user.id,
            githubRepo: githubRepo,
        }
    });
    const user = await prisma.user.update({
        include: {
            projects: true,
            adminProjects: true
        },
        where: {
            id: req.user.id
        },
        data: {
            projects: {
                connect: {
                    projectId: project.projectId
                },

            }
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

projectsRouter.get("/:id", verifierMiddleware, async (req: any, res) => {
    const {id} = req.params;

    const project = await prisma.project.findUnique({
        include: {
            members: true,
            admin: true,
            pendingMembers: true
        },
        where: {
            projectId: parseInt(id)
        }
    });
    const user = await prisma.user.findUnique({
        where: {
            id: req.user.id
        }
    });
    if (!user) {
        res.status(401).send("User not found");
        return;
    }
    if (!project) {
        res.status(401).send("Project Not found").status(400);
        return;
    }
    if (project.adminId !== req.user.id && !project.members.includes(user)) {
        res.status(404).send("You are not authorized to view this project").status(400);
        return;
    }
    res.send(project).status(200);
});


projectsRouter.get("/requests_page/:id", verifierMiddleware, async (req: any, res) => {
    const {id} = req.params;

    const project = await prisma.project.findUnique({
        where: {
            projectId: parseInt(id)
        }
    });
    if (!project) {
        res.status(401).send("Project Not found").status(400);
        return;
    }
    res.send({
        projectId: project.projectId,
        image: project.image,
        name: project.name
    }).status(200);
});


projectsRouter.get("/request/:id", verifierMiddleware, async (req: any, res) => {
    const {id} = req.params;

    const project = await prisma.project.findUnique({
        include: {
            admin: true,
            members: true,
            pendingMembers: true
        },
        where: {
            projectId: parseInt(id)
        }
    });
    const user = await prisma.user.findUnique({
        where: {
            id: req.user.id
        }
    });

    if (!user) {
        res.status(401).send("User not found");
        return;
    }
    if (!project) {
        res.status(401).send("Project Not found").status(400);
        return;
    }
    if (project.adminId === req.user.id || project.members.includes(user)) {
        res.status(404).send("You are already part of the project!").status(400);
        return;
    }
    if (project.pendingMembers.includes(user)) {
        res.status(404).send("You have already requested for joinging the project!").status(400);
        return;
    }
    const updatedProject = await prisma.project.update({
        where: {
            projectId: parseInt(id)
        },
        data: {
            pendingMembers: {
                connect: {
                    id: req.user.id
                }
            }
        }
    });
    res.status(200).send("Successfully requested access the project");
});


projectsRouter.delete("/:id", verifierMiddleware, async (req: any, res) => {
    const {id} = req.params;
    const project = await prisma.project.findUnique({
        include: {
            members: true,
            admin: true,
            pendingMembers: true
        },
        where: {
            projectId: parseInt(id)
        }
    }).catch((err) => {
        res.status(400).send(err);
    });
    if (!project) {
        res.status(404).send("Project not found");
        return;
    }
    if (project.adminId !== req.user.id) {
        res.status(401).send("You are not authorized to delete this project");
        return;
    }
    await prisma.project.delete({
        where: {
            projectId: parseInt(id)
        }
    }).catch((err) => {
        res.status(401).send(err);
    });
    res.status(200).send(project);
});

projectsRouter.patch("/update", verifierMiddleware, async (req: any, res) => {
    const {projectId, name, image, githubRepo, addMemberId, remMemberId,removePendingMemberId , workspace, document} = req.body;
    const finalData: any = {
        name: name,
        image: image,
        githubRepo: githubRepo,
        workspace: workspace,
        document: document,
        members: addMemberId || remMemberId ? ({}) : null,
        pendingMembers: null,
        removePendingMemberId: removePendingMemberId
    }

    if (addMemberId && finalData.members) {
        finalData.members.connect = {
            id: addMemberId
        }
        finalData.pendingMembers = {
            disconnect: {
                id: addMemberId
            }
        }
    }
    if(removePendingMemberId && finalData.removePendingMemberId){
        finalData.removePendingMemberId = {
            disconnect: {
                id: removePendingMemberId
            }
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
            id: req.user.id
        }
    });
    if (!user) {
        res.status(404).send("User not found");
        return;
    }
    if (!JSON.stringify(user.adminProjects).includes(projectId)) {
        res.status(401).send("Unauthorized");
        return;
    }
    const project = await prisma.project.update({
        include: {
            members: true,
            pendingMembers: true
        },
        where: {
            projectId: parseInt(projectId)
        },
        data: data
    }).catch((err) => {
        res.status(400).send(err);
    });
    res.status(200).send(project);
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