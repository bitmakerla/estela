import React, { Component, Fragment } from "react";
import { Link } from "react-router-dom";
import { Layout, List, Typography } from "antd";

import "./styles.scss";
import history from "../../history";
import { ApiService, AuthService } from "../../services";
import { ApiProjectsListRequest, Project } from "../../services/api";
import { Header, Sidenav, Spin } from "../../shared";

const { Content } = Layout;
const { Title } = Typography;

interface ProjectsPageState {
    projects: Project[];
    loaded: boolean;
}

export class ProjectListPage extends Component<unknown, ProjectsPageState> {
    page = 1;
    PAGE_SIZE = 30;
    totalProjects = 0;

    state: ProjectsPageState = {
        projects: [],
        loaded: false,
    };
    apiService = ApiService();

    async componentDidMount(): Promise<void> {
        if (!AuthService.getAuthToken()) {
            history.push("/login");
        } else {
            const projects = await this.getProjects(this.page);
            this.setState({ projects: [...projects], loaded: true });
        }
    }

    async getProjects(page: number): Promise<Project[]> {
        const requestParams: ApiProjectsListRequest = { page, pageSize: this.PAGE_SIZE };
        const data = await this.apiService.apiProjectsList(requestParams);
        this.totalProjects = data.count;
        return data.results;
    }

    render(): JSX.Element {
        const { projects, loaded } = this.state;
        return (
            <Layout className="general-container">
                <Header />
                <Layout className="white-background">
                    {loaded ? (
                        <Fragment>
                            <Sidenav />
                            <Content>
                                <List
                                    header={<Title level={3}>Projects</Title>}
                                    bordered
                                    dataSource={projects}
                                    renderItem={(project: Project) => (
                                        <List.Item>
                                            <Link to={`/projects/${project.pid}`}>{project.name}</Link>
                                        </List.Item>
                                    )}
                                    className="project-list"
                                />
                            </Content>
                        </Fragment>
                    ) : (
                        <Spin />
                    )}
                </Layout>
            </Layout>
        );
    }
}
