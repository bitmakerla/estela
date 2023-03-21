import React, { Component } from "react";
import { Button, Layout, Space } from "antd";

import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import { ApiAccountChangePasswordRequestRequest } from "../../services/api";
import { Spin } from "../../shared";

const { Content } = Layout;

interface PasswordSettingsPageState {
    loaded: boolean;
    email: string;
    requestSended: boolean;
}

export class SettingsPasswordPage extends Component<unknown, PasswordSettingsPageState> {
    state: PasswordSettingsPageState = {
        loaded: false,
        email: "",
        requestSended: false,
    };

    apiService = ApiService();

    async componentDidMount(): Promise<void> {
        this.setState({ loaded: true, email: AuthService.getUserEmail() || "" });
    }

    sendRequest = () => {
        const requestParameters: ApiAccountChangePasswordRequestRequest = {
            data: { email: this.state.email },
        };
        this.apiService.apiAccountChangePasswordRequest(requestParameters).then(
            (response) => {
                if (response) {
                    this.setState({ requestSended: true });
                }
            },
            (error) => {
                console.log(error);
            },
        );
    };

    render(): JSX.Element {
        const { loaded, requestSended, email } = this.state;
        return (
            <>
                {loaded ? (
                    <Content className="mx-6 px-14 bg-white">
                        <Space direction="vertical" className="w-full 2xl:w-9/12 my-4">
                            <div className="">
                                <p className="text-3xl">Change password</p>
                                <p className="mt-4 text-base text-estela-black-medium">
                                    If you want to reset your password, request a password change sending an email to{" "}
                                    {"***".concat(email.slice(3))}
                                </p>
                            </div>
                            {!requestSended ? (
                                <Button className="my-8 btn_password" onClick={this.sendRequest}>
                                    Send request
                                </Button>
                            ) : (
                                <button className="my-8 btn_sendRequest">Request sended</button>
                            )}
                        </Space>
                    </Content>
                ) : (
                    <Spin />
                )}
            </>
        );
    }
}
