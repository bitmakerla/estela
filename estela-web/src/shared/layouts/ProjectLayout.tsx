import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { Layout } from "antd";
import { Header, ProjectSidenav } from "..";
import CustomerVerifier from "ExternalComponents/CustomerVerifier";

interface RouteParams {
    projectId: string;
}

interface ProjectLayoutProps {
    children?: JSX.Element | JSX.Element[];
}

export const ProjectLayout: React.FC<ProjectLayoutProps> = ({ children }) => {
    const [path, setPath] = useState("dashboard");
    const { projectId } = useParams<RouteParams>();

    const updatePathHandler = (newPath: string) => {
        setPath(newPath);
    };
    return (
        <Layout>
            <CustomerVerifier />
            <Header />
            <Layout className="white-background">
                <ProjectSidenav projectId={projectId} path={path} updatePath={updatePathHandler} />
                {children}
            </Layout>
        </Layout>
    );
};
