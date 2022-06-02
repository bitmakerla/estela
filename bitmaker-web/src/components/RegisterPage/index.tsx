import React, { Component } from "react";
import { Button, Form, Input, Layout, Typography } from "antd";

import "./styles.scss";
import history from "../../history";
import { ApiService, AuthService } from "../../services";
import { ApiAuthRegisterRequest, Token } from "../../services/api";
import {
    Header,
    insecurePasswordNotification,
    emailConfirmationNotification,
    invalidDataNotification,
} from "../../shared";

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
        insecurePasswordNotification("Your password must contain letters and numbers.");
        return false;
    }

    lowercaseAndUppercase(word: string): boolean {
        if (word == word.toUpperCase() || word == word.toLowerCase()) {
            insecurePasswordNotification("You password must contain upper case and lower case letters.");
            return false;
        }
        return true;
    }

    hasMinLength(word: string, length: number): boolean {
        if (word.length < length) {
            insecurePasswordNotification("You password must contain at least 8 characters.");
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
                if (error instanceof Response) {
                    error
                        .json()
                        .then((data) => ({
                            data: data,
                            status: error.status,
                        }))
                        .then((res) => {
                            Object.keys(res.data).forEach((key) => {
                                const message: string = res.data[key];
                                invalidDataNotification(message);
                            });
                        });
                } else {
                    console.error("Unexpected error", error);
                }
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
