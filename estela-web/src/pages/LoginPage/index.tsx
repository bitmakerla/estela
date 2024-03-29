import React, { Component } from "react";
import { Button, Form, Input, Layout, Typography, Row } from "antd";
import { Link } from "react-router-dom";

import "./styles.scss";
import history from "../../history";
import { ApiService, AuthService } from "../../services";
import { ApiAuthLoginRequest, Token } from "../../services/api";
import { handleInvalidDataError } from "../../utils";
import { UserContext, UserContextProps } from "../../context";
import { EstelaBanner } from "../../components";
import { REGISTER_PAGE_ENABLED } from "../../constants";

const { Content } = Layout;
const { Text } = Typography;

interface LoginState {
    loading: boolean;
}

export class LoginPage extends Component<unknown, LoginState> {
    state: LoginState = {
        loading: false,
    };
    apiService = ApiService();
    static contextType = UserContext;

    componentDidMount(): void {
        if (AuthService.getAuthToken()) {
            const { updateUsername, updateAccessToken, updateRole, updateEmail } = this.context as UserContextProps;
            updateUsername(AuthService.getUserUsername() ?? "");
            updateEmail(AuthService.getUserEmail() ?? "");
            updateAccessToken(AuthService.getAuthToken() ?? "");
            if (AuthService.getUserRole() && updateRole) {
                updateRole(AuthService.getUserRole() ?? "");
            }
            history.push("/projects");
        }
    }

    handleSubmit = (data: { username: string; password: string }): void => {
        this.setState({ loading: true });
        const request: ApiAuthLoginRequest = { data };
        const { updateUsername, updateEmail, updateAccessToken } = this.context as UserContextProps;
        this.apiService.apiAuthLogin(request).then(
            (response: Token) => {
                AuthService.setAuthToken(response.key);
                updateAccessToken(response.key);
                if (response.user !== undefined) {
                    AuthService.setUserUsername(response.user.username);
                    updateUsername(response.user.username);
                    AuthService.setUserEmail(response.user.email ?? "");
                    updateEmail(response.user.email ?? "");
                }
                this.setState({ loading: false });
                history.push("/projects");
            },
            (error: unknown) => {
                handleInvalidDataError(error);
                this.setState({ loading: false });
            },
        );
    };

    render(): JSX.Element {
        const { loading } = this.state;
        return (
            <Content className="h-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                <EstelaBanner />
                <Content className="flex h-fit lg:mr-36 sm:h-fit md:h-full lg:h-full justify-center items-center p-6 sm:p-auto">
                    <Form onFinish={this.handleSubmit} layout="vertical" className="p-2 w-96">
                        <Row justify="center" className="w-96 my-7">
                            <Text className="text-3xl font-bold">Login</Text>
                        </Row>
                        <Content>
                            <Form.Item
                                label="Username"
                                name="username"
                                required
                                rules={[{ required: true, message: "Please input your username" }]}
                            >
                                <Input autoComplete="username" className="border-estela rounded-md py-2" />
                            </Form.Item>
                            <Form.Item
                                label="Password"
                                name="password"
                                required
                                rules={[{ required: true, message: "Please input your password" }]}
                            >
                                <Input.Password
                                    autoComplete="current-password"
                                    className="border-estela rounded-md py-2"
                                />
                            </Form.Item>
                            <Row justify="end" className="mb-4">
                                <Link to="/forgotPassword" className="text-estela text-base font-bold text-right">
                                    Forgot password?
                                </Link>
                            </Row>
                        </Content>
                        <Button
                            loading={loading}
                            block
                            htmlType="submit"
                            className="border-estela bg-estela hover:border-estela hover:text-estela text-white rounded-md text-sm h-10"
                        >
                            Log in
                        </Button>
                        {REGISTER_PAGE_ENABLED && (
                            <Content className="text-center text-base m-5">
                                <p>If you don&apos;t have an account. You can</p>
                                <p>
                                    <Link className="text-estela text-base font-bold underline" to="/register">
                                        register here
                                    </Link>
                                </p>
                            </Content>
                        )}
                    </Form>
                </Content>
            </Content>
        );
    }
}
