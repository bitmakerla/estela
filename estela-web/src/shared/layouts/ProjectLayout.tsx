import React, { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import { Layout } from "antd";
import { Header, ProjectSideNav } from "..";
import ExternalVerifier from "ExternalComponents/ExternalVerifier";
import { TourOverlay } from "../../tour";
import { ApiService } from "../../services";

interface RouteParams {
    projectId: string;
    spiderId?: string;
    jobId?: string;
    cronjobId?: string;
}

interface ProjectLayoutProps {
    children?: JSX.Element | JSX.Element[];
}

interface Crumb {
    label: string;
    path?: string;
}

export const ProjectLayout: React.FC<ProjectLayoutProps> = ({ children }) => {
    const location = useLocation();
    const pathSegments = location.pathname.split("/").filter(Boolean);
    const section = pathSegments[2] ?? "dashboard";

    let lastSegment = pathSegments[pathSegments.length - 1];
    if (!isNaN(lastSegment as unknown as number)) {
        lastSegment = pathSegments[pathSegments.length - 2];
    }

    const { projectId, spiderId, jobId, cronjobId } = useParams<RouteParams>();
    const [path, setPath] = useState(lastSegment);
    const [projectName, setProjectName] = useState<string>(
        () => sessionStorage.getItem(`project-name-${projectId}`) ?? "",
    );
    const [spiderName, setSpiderName] = useState<string>(() =>
        spiderId ? sessionStorage.getItem(`spider-name-${spiderId}`) ?? "..." : "",
    );
    const apiService = ApiService();

    useEffect(() => {
        apiService.apiProjectsRead({ pid: projectId }).then((project) => {
            setProjectName(project.name);
            sessionStorage.setItem(`project-name-${projectId}`, project.name);
        });
    }, [projectId]);

    useEffect(() => {
        const sid = Number(spiderId);
        if (spiderId && !isNaN(sid)) {
            apiService.apiProjectsSpidersRead({ pid: projectId, sid }).then((spider) => {
                setSpiderName(spider.name);
                sessionStorage.setItem(`spider-name-${spiderId}`, spider.name);
            });
        } else {
            setSpiderName("");
        }
    }, [projectId, spiderId]);

    const updatePathHandler = (newPath: string) => {
        setPath(newPath);
    };

    const getCrumbs = (): Crumb[] => {
        const project: Crumb = { label: projectName || projectId, path: `/projects/${projectId}/dashboard` };

        if (section === "dashboard") return [project, { label: "Dashboard" }];
        if (section === "jobs") return [project, { label: "Jobs" }];
        if (section === "cronjobs") return [project, { label: "Schedule" }];
        if (section === "activity") return [project, { label: "Activity" }];
        if (section === "members") return [project, { label: "Members" }];
        if (section === "settings") return [project, { label: "Settings" }];
        if (section === "deploys") return [project, { label: "Deploys" }];

        if (section === "spiders") {
            if (!spiderId) return [project, { label: "Spiders" }];
            if (jobId) {
                return [project, { label: "Jobs", path: `/projects/${projectId}/jobs` }, { label: `Job-${jobId}` }];
            }
            if (cronjobId) {
                return [
                    project,
                    { label: "Schedule", path: `/projects/${projectId}/cronjobs` },
                    { label: `Schedule-job-${cronjobId}` },
                ];
            }
            return [project, { label: "Spiders", path: `/projects/${projectId}/spiders` }, { label: spiderName }];
        }

        return [project];
    };

    const crumbs = getCrumbs();

    const breadcrumb = (
        <span className="flex items-center gap-2 text-base">
            {crumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                    {index > 0 && <span className="text-estela-black-low">/</span>}
                    {crumb.path ? (
                        <Link to={crumb.path} className="font-semibold hover:text-estela">
                            {crumb.label}
                        </Link>
                    ) : (
                        <span className="text-estela-black-medium font-medium">{crumb.label}</span>
                    )}
                </React.Fragment>
            ))}
        </span>
    );

    return (
        <Layout>
            <ExternalVerifier />
            <Header breadcrumb={breadcrumb} />
            <Layout className="white-background">
                <ProjectSideNav projectId={projectId} path={path} updatePath={updatePathHandler} />
                {children}
            </Layout>
            <TourOverlay />
        </Layout>
    );
};
