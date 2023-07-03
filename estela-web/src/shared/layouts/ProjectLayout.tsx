import React, { useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { Layout } from "antd";
import { Header, ProjectSideNav } from "..";
import ExternalVerifier from "ExternalComponents/ExternalVerifier";

interface RouteParams {
    projectId: string;
}

interface ProjectLayoutProps {
    children?: JSX.Element | JSX.Element[];
}

export const ProjectLayout: React.FC<ProjectLayoutProps> = ({ children }) => {
    const location = useLocation();
    const pathSegments = location.pathname.split("/");
    let lastSegment = pathSegments[pathSegments.length - 1];

    if (lastSegment === "") {
        pathSegments.pop();
        lastSegment = pathSegments[pathSegments.length - 1];
    }

    if (!isNaN(lastSegment)) {
        pathSegments.pop();
        lastSegment = pathSegments[pathSegments.length - 1];
    }

    const [path, setPath] = useState(lastSegment);
    const { projectId } = useParams<RouteParams>();

    const updatePathHandler = (newPath: string) => {
        setPath(newPath);
    };

    return (
        <Layout>
            <ExternalVerifier />
            <Header />
            <Layout className="white-background">
                <ProjectSideNav projectId={projectId} path={path} updatePath={updatePathHandler} />
                {children}
            </Layout>
        </Layout>
    );
};
