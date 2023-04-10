import React, { Component } from "react";
import { UserContext, UserContextProps } from "../../context";
import { Button, Layout, Space, Row, Col, Input, Form, Modal, Typography } from "antd";
import type { FormInstance } from "antd/es/form/Form";
import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import { ApiAuthProfileUpdateRequest, UserProfile, UserProfileUpdate } from "../../services/api";
import { invalidDataNotification, Spin } from "../../shared";

const { Content } = Layout;
const { Text } = Typography;

interface ProfileSettingsPageState {
    loaded: boolean;
    updatedProfile: boolean;
    showPasswordModal: boolean;
    username: string;
    email: string;
}

export class SettingsProfilePage extends Component<unknown, ProfileSettingsPageState> {
    state: ProfileSettingsPageState = {
        loaded: false,
        updatedProfile: false,
        showPasswordModal: false,
        username: "Loading...",
        email: "Loading...",
    };

    static contextType = UserContext;
    apiService = ApiService();
    passwordFormRef = React.createRef<
        FormInstance<{
            password: string;
        }>
    >();

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
        this.setState({ showPasswordModal: true });
    };

    onFinishPasswordFormHandler = ({ password }: { password: string }): void => {
        const { username, email } = this.state;
        const newUserProfileData: UserProfileUpdate = { username: username, email: email, password: password };
        const requestParams: ApiAuthProfileUpdateRequest = { username: this.getUsername(), data: newUserProfileData };
        this.apiService.apiAuthProfileUpdate(requestParams).then(
            (user: UserProfile) => {
                const { updateUsername, updateEmail } = this.context as UserContextProps;
                updateUsername(user.username);
                updateEmail(user.email);
                AuthService.setUserUsername(user.username);
                AuthService.setUserEmail(user.email);
                this.passwordFormRef.current?.resetFields();
                this.setState({ showPasswordModal: false, updatedProfile: false });
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
        const { username, email, loaded, updatedProfile, showPasswordModal } = this.state;
        return (
            <>
                {loaded ? (
                    <Content className="mx-6 px-14 bg-white">
                        <Row className="w-full my-4">
                            <div className="float-left">
                                <p className="text-3xl">Profile settings</p>
                            </div>
                        </Row>
                        <Modal
                            open={showPasswordModal}
                            footer={false}
                            width={600}
                            title={
                                <p className="text-xl text-center text-estela-black-medium font-normal">
                                    CONFIRM ACTION
                                </p>
                            }
                            onCancel={() => {
                                this.setState({ showPasswordModal: false });
                            }}
                        >
                            <div className="p-2 grid justify-items-center">
                                <Text className="text-estela-black-full text-base">
                                    Enter your password to save your changes.
                                </Text>
                            </div>
                            <div className="py-4 px-8">
                                <Form
                                    labelCol={{ span: 24 }}
                                    wrapperCol={{ span: 24 }}
                                    onFinish={this.onFinishPasswordFormHandler}
                                    ref={this.passwordFormRef}
                                >
                                    <Form.Item
                                        label={<p className="text-estela-black-full text-base">Password</p>}
                                        name="password"
                                        rules={[{ required: true, message: "Please input your Password!" }]}
                                    >
                                        <Input className="input_profile" type="password" />
                                    </Form.Item>
                                    <Row className="mt-4 grid grid-cols-2 gap-2" align="middle" justify="center">
                                        <Col>
                                            <Button
                                                size="large"
                                                className="w-full h-12 items-center stroke-white border-estela hover:stroke-estela bg-estela text-white hover:text-estela text-sm hover:border-estela rounded-md"
                                                htmlType="submit"
                                            >
                                                Confirm
                                            </Button>
                                        </Col>
                                        <Col>
                                            <Button
                                                size="large"
                                                className="w-full h-12 ml-1 bg-white text-estela-blue-full border-estela-blue-full hover:text-estela-blue-full hover:border-estela-blue-full hover:bg-estela-blue-low rounded-lg"
                                                onClick={() => this.setState({ showPasswordModal: false })}
                                            >
                                                Cancel
                                            </Button>
                                        </Col>
                                    </Row>
                                </Form>
                            </div>
                        </Modal>
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
