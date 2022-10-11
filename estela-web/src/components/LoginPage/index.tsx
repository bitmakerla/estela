import React, { Component } from "react";
import { Button, Form, Input, Layout, Typography } from "antd";

import "./styles.scss";
import history from "../../history";
import { ApiService, AuthService } from "../../services";
import { ApiAuthLoginRequest, Token } from "../../services/api";
import { handleInvalidDataError } from "../../utils";

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
                if (response.user !== undefined) {
                    AuthService.setUserUsername(response.user);
                }
                history.push("/projects");
            },
            (error: unknown) => {
                handleInvalidDataError(error);
            },
        );
    };

    render(): JSX.Element {
        return (
            <Layout className="white-background">
                <Content className="login-content">
                    <Form onFinish={this.handleSubmit}>
                        <Title className="text-center">Log in</Title>
                        <div className="login-inputs">
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
                        <Button type="primary" htmlType="submit" className="login-button">
                            Enter
                        </Button>
                    </Form>
                </Content>
            </Layout>
        );
    }
}
