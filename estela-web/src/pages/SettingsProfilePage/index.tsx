import React, { Component } from "react";
import { UserContext, UserContextProps } from "../../context";
import { Button, Layout, Space, Row, Input, Form } from "antd";
import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import { ApiAuthProfileUpdateRequest, UserProfile } from "../../services/api";
import { invalidDataNotification, Spin } from "../../shared";

const { Content } = Layout;

interface ProfileSettingsPageState {
    loaded: boolean;
    updatedProfile: boolean;
    username: string;
    email: string;
}

export class SettingsProfilePage extends Component<unknown, ProfileSettingsPageState> {
    state: ProfileSettingsPageState = {
        loaded: false,
        updatedProfile: false,
        username: "Loading...",
        email: "Loading...",
    };

    static contextType = UserContext;
    apiService = ApiService();

    async componentDidMount(): Promise<void> {
        this.setProfileData();
    }

    setProfileData() {
        this.setState({ username: this.getUsername(), email: this.getEmail(), loaded: true });
    }

    getUsername() {
        let { username } = this.context as UserContextProps;
        if (username === "") username = AuthService.getUserUsername() ?? "";
        return username;
    }

    getEmail() {
        let { email } = this.context as UserContextProps;
        if (email === "") email = AuthService.getUserEmail() ?? "";
        return email;
    }

    onProfileFormValuesChangeHandler = ({ username, email }: { username: string; email: string }): void => {
        if (!this.state.updatedProfile) this.setState({ updatedProfile: true });
        if (username) this.setState({ username: username });
        if (email) this.setState({ email: email });
    };

    onFinishProfileFormHandler = (): void => {
        const { username, email } = this.state;
        const newUserProfileData: UserProfile = { username: username, email: email };
        const requestParams: ApiAuthProfileUpdateRequest = { username: this.getUsername(), data: newUserProfileData };
        this.apiService.apiAuthProfileUpdate(requestParams).then(
            (user: UserProfile) => {
                const { updateUsername, updateEmail } = this.context as UserContextProps;
                updateUsername(user.username);
                updateEmail(user.email);
                AuthService.setUserUsername(user.username);
                AuthService.setUserEmail(user.email);
                this.setState({ updatedProfile: false });
            },
            async (error) => {
                try {
                    const data = await error.json();
                    if (data.non_field_errors && data.non_field_errors.length > 0) {
                        invalidDataNotification(data.non_field_errors[0]);
                    }
                } catch (err) {
                    invalidDataNotification("An unexpected error ocurred, try again later.");
                }
            },
        );
    };

    render(): JSX.Element {
        const { username, email, loaded, updatedProfile } = this.state;
        return (
            <>
                {loaded ? (
                    <Content className="mx-6 px-14 bg-white">
                        <Row className="w-full my-4">
                            <div className="float-left">
                                <p className="text-3xl">Profile settings</p>
                            </div>
                        </Row>
                        <Form
                            labelCol={{ span: 24 }}
                            wrapperCol={{ span: 24 }}
                            initialValues={{
                                username: username,
                                email: email,
                            }}
                            onFinish={this.onFinishProfileFormHandler}
                            onValuesChange={this.onProfileFormValuesChangeHandler}
                            className="grid grid-cols-3"
                        >
                            <Space direction="vertical" className="w-full 2xl:w-9/12 my-2 col-span-2">
                                <Form.Item label="Username" name="username">
                                    <Input className="input_profile" />
                                </Form.Item>
                                <Form.Item label="Email address" name="email">
                                    <Input className="input_profile" />
                                </Form.Item>
                                <Form.Item className="col-span-2">
                                    <Row className="w-full 2xl:w-9/12 my-8 ">
                                        <div className="float-left  w-full">
                                            <Button
                                                className="btn_profile"
                                                htmlType="submit"
                                                disabled={!updatedProfile}
                                            >
                                                Save changes
                                            </Button>
                                        </div>
                                    </Row>
                                </Form.Item>
                            </Space>
                        </Form>
                    </Content>
                ) : (
                    <div className="mx-auto">
                        <Spin />
                    </div>
                )}
            </>
        );
    }
}
