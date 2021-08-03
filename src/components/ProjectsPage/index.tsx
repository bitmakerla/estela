import React, { Component } from "react";
import { Col, Layout, List, Row, Spin, Typography } from "antd";

import "./styles.scss";
import history from "../../history";
import { ApiService, AuthService } from "../../services";
import { ApiProjectsListRequest, Project } from "../../services/api";

const { Content } = Layout;
const { Title } = Typography;

interface ProjectsPageState {
    projects: Project[];
    loaded: boolean;
}

export class ProjectsPage extends Component<unknown, ProjectsPageState> {
    page = 1;
    PAGE_SIZE = 30;

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
        return data.results;
    }

    render(): JSX.Element {
        const { projects, loaded } = this.state;
        return (
            <Layout className="white-background">
                <Content>
                    {loaded ? (
                        <List
                            header={<Title level={3}>Projects</Title>}
                            bordered
                            dataSource={projects}
                            renderItem={(project: Project) => <List.Item>{project.name}</List.Item>}
                            className="project-list"
                        />
                    ) : (
                        <Row className="spin">
                            <Col span={6} offset={12}>
                                <Spin size="large" />
                            </Col>
                        </Row>
                    )}
                </Content>
            </Layout>
        );
    }
}
