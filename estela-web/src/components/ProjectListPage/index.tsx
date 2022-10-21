import React, { Component, Fragment } from "react";
import { Link } from "react-router-dom";
import { Button, Layout, List, Pagination, Typography } from "antd";

import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import { ApiProjectsListRequest, Project } from "../../services/api";
import { authNotification, Header, Spin } from "../../shared";

const { Content } = Layout;
const { Title } = Typography;

interface ProjectsPageState {
    projects: Project[];
    loaded: boolean;
    count: number;
    current: number;
}

export class ProjectListPage extends Component<unknown, ProjectsPageState> {
    PAGE_SIZE = 10;
    totalProjects = 0;

    state: ProjectsPageState = {
        projects: [],
        loaded: false,
        count: 0,
        current: 0,
    };
    apiService = ApiService();

    async componentDidMount(): Promise<void> {
        if (!AuthService.getAuthToken()) {
            authNotification();
        } else {
            const data = await this.getProjects(1);
            const projects: Project[] = data.data;
            this.setState({ projects: [...projects], count: data.count, current: data.current, loaded: true });
        }
    }

    async getProjects(page: number): Promise<{ data: Project[]; count: number; current: number }> {
        const requestParams: ApiProjectsListRequest = { page, pageSize: this.PAGE_SIZE };
        const data = await this.apiService.apiProjectsList(requestParams);
        this.totalProjects = data.count;
        return { data: data.results, count: data.count, current: page };
    }

    onPageChange = async (page: number): Promise<void> => {
        this.setState({ loaded: false });
        const data = await this.getProjects(page);
        const projects: Project[] = data.data;
        this.setState({
            projects: [...projects],
            count: data.count,
            current: data.current,
            loaded: true,
        });
    };

    render(): JSX.Element {
        const { projects, loaded, count, current } = this.state;
        return (
            <Layout className="general-container">
                <Header />
                <Layout className="container">
                    {loaded ? (
                        <Fragment>
                            <Content>
                                <List
                                    header={<Title level={3}>Projects</Title>}
                                    bordered
                                    dataSource={projects}
                                    renderItem={(project: Project) => (
                                        <List.Item>
                                            <Link to={`/projects/${project.pid}/dashboard`}>{project.name}</Link>
                                        </List.Item>
                                    )}
                                    className="project-list"
                                />
                                <Pagination
                                    className="pagination"
                                    defaultCurrent={1}
                                    total={count}
                                    current={current}
                                    pageSize={this.PAGE_SIZE}
                                    onChange={this.onPageChange}
                                    showSizeChanger={false}
                                />
                                <Link to="/projects/create">
                                    <Button className="create-new-project">Create New Project</Button>
                                </Link>
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
