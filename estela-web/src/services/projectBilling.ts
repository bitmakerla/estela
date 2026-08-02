import { PermissionPermissionEnum, Project } from "./api";

export function getProjectOwnerUsername(project: Project): string | undefined {
    return project.users?.find((member) => member.permission === PermissionPermissionEnum.Owner)?.user?.username;
}

export function isCurrentUserProjectOwner(project: Project, username: string): boolean {
    return getProjectOwnerUsername(project) === username;
}
