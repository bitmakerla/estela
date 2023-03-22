import React, { Component } from "react";
import { Button, Form, Input, Layout, Space, Typography } from "antd";
import type { FormInstance } from "antd/es/form";
import { ApiService } from "../../services";
import { ApiAccountChangePasswordConfirmRequest, ApiAccountChangePasswordValidateRequest } from "../../services/api";
import Bitmaker from "../../assets/logo/bitmaker.svg";
import Estela from "../../assets/icons/estela.svg";
import {
    Spin,
    insecurePasswordNotification,
    nonExistentUserNotification,
    passwordChangedNotification,
} from "../../shared";
import { Link } from "react-router-dom";
const { Text } = Typography;
const { Content } = Layout;

interface ChangePasswordPageProps {
    location: {
        search: string;
    };
    form: {
        resetFields: () => void;
    };
}

interface ChangePasswordState {
    loaded: boolean;
    token: string;
    pair: string;
    successfullyChanged: boolean;
    invalidToken: boolean;
}

export class ChangePasswordPage extends Component<ChangePasswordPageProps, ChangePasswordState> {
    state = {
        token: "",
        pair: "",
        loaded: false,
        successfullyChanged: false,
        invalidToken: false,
    };
    private formRef = React.createRef<FormInstance>();
    apiService = ApiService();
    componentDidMount(): void {
        const query = new URLSearchParams(this.props.location.search);
        if (!query.get("token") || !query.get("pair")) {
            return;
        }

        const requestParameters: ApiAccountChangePasswordValidateRequest = {
            token: query.get("token") || "",
            pair: query.get("pair") || "",
        };

        this.apiService
            .apiAccountChangePasswordValidate(requestParameters)
            .then(() => {
                this.setState({
                    token: query.get("token") || "",
                    pair: query.get("pair") || "",
                    loaded: true,
                });
            })
            .catch(() => {
                this.setState({
                    invalidToken: true,
                    loaded: true,
                });
            });
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

    validatePasswords(oldPassword: string, newPassword: string, newPasswordConfirm: string): boolean {
        if (
            !this.validatePassword(oldPassword) ||
            !this.validatePassword(newPassword) ||
            !this.validatePassword(newPasswordConfirm)
        ) {
            return false;
        }
        if (oldPassword == newPassword) {
            insecurePasswordNotification("Your new password must be different from your current password.");
            return false;
        }
        if (newPassword != newPasswordConfirm) {
            insecurePasswordNotification("Your new passwords do not match.");
            return false;
        }
        return true;
    }

    handleSubmit = (data: { oldPassword: string; newPassword: string; newPasswordConfirm: string }): void => {
        if (!this.validatePasswords(data.oldPassword, data.newPassword, data.newPasswordConfirm)) return;
        const requestParameters: ApiAccountChangePasswordConfirmRequest = {
            data,
            token: this.state.token,
            pair: this.state.pair,
        };

        this.apiService
            .apiAccountChangePasswordConfirm(requestParameters)
            .then(() => {
                passwordChangedNotification();
                this.setState({ successfullyChanged: true, invalidToken: false });
            })
            .catch(() => {
                nonExistentUserNotification();
                this.formRef.current?.resetFields();
            });
    };

    render(): JSX.Element {
        const { loaded, successfullyChanged, invalidToken } = this.state;
        return loaded ? (
            <Content className="h-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                <Content className="flex h-fit lg:ml-36 sm:h-fit md:h-full lg:h-full m-auto justify-center items-center p-14 sm:p-auto md:p-auto">
                    <Content className="">
                        <Bitmaker className="w-64 h-48" />
                        <p className="text-5xl font-bold">Change your password</p>
                        <p className="text-3xl font-normal py-6 sm:p-auto">
                            Remember to use uppercase, numbers and special characters.
                        </p>
                        <Space className="my-4">
                            <Text className="text-sm font-normal">Powered by&nbsp;</Text>
                            <Estela className="w-24 h-8" />
                        </Space>
                    </Content>
                </Content>
                <Content className="flex h-fit lg:mr-36 sm:h-fit md:h-full lg:h-full justify-center items-center p-6 sm:p-auto">
                    {!successfullyChanged && !invalidToken && (
                        <Form ref={this.formRef} onFinish={this.handleSubmit} layout="vertical" className="p-2 w-96">
                            <Content>
                                <Form.Item
                                    label="Current password"
                                    name="oldPassword"
                                    required
                                    rules={[{ required: true, message: "Please input current password" }]}
                                >
                                    <Input.Password
                                        autoComplete="current-password"
                                        className="border-estela rounded-md"
                                    />
                                </Form.Item>
                                <Form.Item
                                    label="New password"
                                    name="newPassword"
                                    required
                                    rules={[{ required: true, message: "Please input your new password" }]}
                                >
                                    <Input.Password autoComplete="new-password" className="border-estela rounded-md" />
                                </Form.Item>
                                <Form.Item
                                    label="New password"
                                    name="newPasswordConfirm"
                                    required
                                    rules={[{ required: true, message: "Please input your new password again" }]}
                                >
                                    <Input.Password
                                        autoComplete="new-password-confirm"
                                        className="border-estela rounded-md"
                                    />
                                </Form.Item>
                            </Content>
                            <Button
                                block
                                htmlType="submit"
                                className="border-estela bg-estela hover:border-estela hover:text-estela text-white rounded-md text-sm"
                            >
                                Reset password
                            </Button>
                        </Form>
                    )}
                    {successfullyChanged && (
                        <div className="p-2 w-96">
                            <p className="text-4xl font-bold text-center">Successful password change!</p>
                            <p className="text-xl font-normal py-2 my-10 sm:p-auto text-center">
                                You can now use your new password to log in to your account!
                            </p>
                            <Link to="/login">
                                <Button
                                    block
                                    className="border-estela bg-estela hover:border-estela hover:text-estela text-white rounded-md text-sm h-12"
                                >
                                    Login
                                </Button>
                            </Link>
                        </div>
                    )}
                    {invalidToken && (
                        <div className="p-2 w-96">
                            <p className="text-4xl font-bold text-center">Expired link!</p>
                            <p className="text-xl font-normal py-2 my-10 sm:p-auto text-center">
                                The link you are trying to enter seems to have expired. Remember that you only have{" "}
                                <span className="font-bold"> 3 minutes. </span>
                            </p>
                            <Link to="/settings/password">
                                <Button
                                    block
                                    className="border-estela bg-estela hover:border-estela hover:text-estela text-white rounded-md text-sm h-12"
                                >
                                    Resend request
                                </Button>
                            </Link>
                        </div>
                    )}
                </Content>
            </Content>
        ) : (
            <Spin />
        );
    }
}
