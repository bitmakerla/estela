import React, { Component } from "react";
import { Button, Form, Input, Layout, Typography } from "antd";

import "./styles.scss";
import history from "../../history";
import { ApiService, AuthService } from "../../services";
import { ApiAuthRegisterRequest, Token } from "../../services/api";
import { Header, badPasswordNotification, invalidDataNotification, emailConfirmationNotification } from "../../shared";

const { Content } = Layout;
const { Title } = Typography;

export class RegisterPage extends Component<unknown> {
    apiService = ApiService();

    componentDidMount(): void {
        if (AuthService.getAuthToken()) {
            history.push("/projects");
        }
    }

    isAlphanumeric(word: string): boolean {
        const alpha = /([a-zA-Z])/;
        const numeric = /(\d)/;
        if (alpha.test(word) && numeric.test(word)) {
            return true;
        }
        badPasswordNotification("Your password must contain letters and numbers.");
        return false;
    }

    lowercaseAndUppercase(word: string): boolean {
        if (word == word.toUpperCase() || word == word.toLowerCase()) {
            badPasswordNotification("You password must contain upper case and lower case letters.");
            return false;
        }
        return true;
    }

    hasMinLength(word: string, length: number): boolean {
        if (word.length < length) {
            badPasswordNotification("You password must contain at least 8 characters.");
            return false;
        }
        return true;
    }

    validatePassword(password: string): boolean {
        if (this.hasMinLength(password, 8) && this.lowercaseAndUppercase(password) && this.isAlphanumeric(password)) {
            return true;
        }
        return false;
    }

    handleSubmit = (data: { email: string; username: string; password: string }): void => {
        if (!this.validatePassword(data.password)) {
            badPasswordNotification(`The password you have entered is not secure enough. Please
                      choose a password that complies with our security
                      policies. Avoid common passwords and passwords that are too
                      similar to your username or email.`);
            return;
        }

        const request: ApiAuthRegisterRequest = { data };
        this.apiService.apiAuthRegister(request).then(
            (response: Token) => {
                if (response.user !== undefined) {
                    AuthService.setUserUsername(response.user);
                }
                emailConfirmationNotification();
                history.push("/login");
            },
            (error: unknown) => {
                console.error(error);
                invalidDataNotification();
            },
        );
    };

    render(): JSX.Element {
        return (
            <Layout className="white-background">
                <Header />
                <Content className="register-content">
                    <Form onFinish={this.handleSubmit}>
                        <Title className="text-center">Register</Title>
                        <div className="register-inputs">
                            <Form.Item
                                label="Email"
                                name="email"
                                required
                                rules={[{ required: true, message: "Please input your email", type: "email" }]}
                            >
                                <Input autoComplete="email" />
                            </Form.Item>
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
                        <Button type="primary" htmlType="submit" className="register-button">
                            Sign up
                        </Button>
                    </Form>
                </Content>
            </Layout>
        );
    }
}
