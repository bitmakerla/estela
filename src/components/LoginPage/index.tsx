import React, { Component } from "react";
import { Button, Form, Input, Layout, Typography } from "antd";

import "./styles.scss";
import history from "../../history";
import { ApiService, AuthService } from "../../services";
import { ApiAuthLoginRequest, Token } from "../../services/api";

const { Content } = Layout;
const { Title } = Typography;

export class LoginPage extends Component<unknown> {
    apiService = ApiService();

    componentDidMount(): void {
        if (AuthService.getAuthToken()) {
            history.push("/projects");
        }
    }

    handleSubmit = (data: { username: string; password: string }): void => {
        const request: ApiAuthLoginRequest = { data };
        this.apiService.apiAuthLogin(request).then(
            (response: Token) => {
                AuthService.setAuthToken(response.key);
                history.push("/projects");
            },
            (error: unknown) => {
                console.error(error);
            },
        );
    };

    render(): JSX.Element {
        return (
            <Layout className="login-layout white-background">
                <Content>
                    <Form onFinish={this.handleSubmit}>
                        <Title>Log in</Title>
                        <div>
                            <Form.Item
                                label="Username"
                                name="username"
                                required
                                rules={[{ required: true, message: "Please input your username" }]}
                            >
                                <Input autoComplete="username" />
                            </Form.Item>
                            <Form.Item
                                label="Password"
                                name="password"
                                required
                                rules={[{ required: true, message: "Please input your password" }]}
                            >
                                <Input.Password autoComplete="current-password" />
                            </Form.Item>
                        </div>
                        <Button type="primary" block htmlType="submit">
                            Enter
                        </Button>
                    </Form>
                </Content>
            </Layout>
        );
    }
}
