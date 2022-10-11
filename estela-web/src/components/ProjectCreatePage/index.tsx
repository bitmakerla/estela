import React, { Component, Fragment } from "react";
import { Button, Form, Input, Layout, Typography } from "antd";

import "./styles.scss";
import history from "../../history";
import { ApiService, AuthService } from "../../services";
import { ApiProjectsCreateRequest, Project } from "../../services/api";
import { authNotification, incorrectDataNotification, Header, Sidenav } from "../../shared";

const { Content } = Layout;
const { Title } = Typography;

export class ProjectCreatePage extends Component<unknown> {
    apiService = ApiService();

    componentDidMount(): void {
        if (!AuthService.getAuthToken()) {
            authNotification();
        }
    }

    handleSubmit = (data: { name: string }): void => {
        const request: ApiProjectsCreateRequest = { data };
        this.apiService.apiProjectsCreate(request).then(
            (response: Project) => {
                history.push(`/projects/${response.pid}`);
            },
            (error: unknown) => {
                console.error(error);
                incorrectDataNotification();
            },
        );
    };

    render(): JSX.Element {
        return (
            <Layout className="general-container">
                <Layout className="white-background">
                    <Fragment>
                        <Sidenav />
                        <Content className="content-padding">
                            <Title level={2} className="text-center">
                                Create New Project
                            </Title>
                            <Form className="project-create-form" onFinish={this.handleSubmit}>
                                <Form.Item
                                    label="Project name"
                                    name="name"
                                    required
                                    rules={[{ required: true, message: "Please input project name" }]}
                                >
                                    <Input autoComplete="username" />
                                </Form.Item>
                                <Button htmlType="submit" className="project-create-button">
                                    Create Project
                                </Button>
                            </Form>
                        </Content>
                    </Fragment>
                </Layout>
            </Layout>
        );
    }
}
