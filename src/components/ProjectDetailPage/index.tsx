import React, { Component, Fragment } from "react";
import { Layout, Typography, Row } from "antd";
import { RouteComponentProps } from "react-router-dom";

import "./styles.scss";
import history from "../../history";
import { ApiService, AuthService } from "../../services";
import { ApiProjectsReadRequest, Project } from "../../services/api";
import { Header, ProjectSidenav, Spin } from "../../shared";

const { Content } = Layout;
const { Text, Title } = Typography;

interface ProjectDetailPageState {
    name: string;
    loaded: boolean;
}

interface RouteParams {
    projectId: string;
}

export class ProjectDetailPage extends Component<RouteComponentProps<RouteParams>, ProjectDetailPageState> {
    state: ProjectDetailPageState = {
        name: "",
        loaded: false,
    };
    apiService = ApiService();
    projectId: string = this.props.match.params.projectId;

    async componentDidMount(): Promise<void> {
        if (!AuthService.getAuthToken()) {
            history.push("/login");
        } else {
            const requestParams: ApiProjectsReadRequest = { pid: this.projectId };
            this.apiService.apiProjectsRead(requestParams).then(
                (response: Project) => {
                    this.setState({ name: response.name, loaded: true });
                },
                (error: unknown) => {
                    console.error(error);
                    history.push("/login");
                },
            );
        }
    }

    render(): JSX.Element {
        const { loaded, name } = this.state;
        return (
            <Layout className="general-container">
                <Header />
                <Layout className="white-background">
                    {loaded ? (
                        <Fragment>
                            <ProjectSidenav projectId={this.projectId} />
                            <Content className="content-padding">
                                <Title level={3} className="text-center">
                                    {name}
                                </Title>
                                <Row justify="center" className="project-data">
                                    <Text>
                                        <b>Project ID:</b>&nbsp; {this.projectId}
                                    </Text>
                                </Row>
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
