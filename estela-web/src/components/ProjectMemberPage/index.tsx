import React, { Component, Fragment, ReactElement } from "react";
import { Button, Layout, Space, Table, Row, Col, Tag, Modal, Input, Select } from "antd";
import { RouteComponentProps } from "react-router-dom";

import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import { ReactComponent as User } from "../../assets/icons/user.svg";
import {
    ApiProjectsReadRequest,
    Project,
    ProjectUpdate,
    ProjectUpdateActionEnum,
    ProjectUpdatePermissionEnum,
    ApiProjectsUpdateRequest,
} from "../../services/api";
import {
    authNotification,
    resourceNotAllowedNotification,
    Header,
    ProjectSidenav,
    Spin,
    nonExistentUserNotification,
} from "../../shared";
import { Permission } from "../../services/api/generated-api/models/Permission";
import { handleInvalidDataError } from "../../utils";

const { Content } = Layout;
const { Option } = Select;

interface MemberState {
    username: string | undefined;
    email: string | undefined;
    role: string | undefined;
    status: string | undefined;
}

interface ProjectMemberPageState {
    name: string;
    user: string;
    users: Permission[];
    loaded: boolean;
    modal: boolean;
    newUser: string;
    members: MemberState[];
    permission: ProjectUpdatePermissionEnum;
}

interface RouteParams {
    projectId: string;
}

export class ProjectMemberPage extends Component<RouteComponentProps<RouteParams>, ProjectMemberPageState> {
    state: ProjectMemberPageState = {
        name: "",
        user: "",
        modal: false,
        users: [],
        loaded: false,
        newUser: "",
        permission: ProjectUpdatePermissionEnum.Viewer,
        members: [],
    };
    apiService = ApiService();
    projectId: string = this.props.match.params.projectId;

    columns = [
        {
            title: "USERNAME",
            dataIndex: "username",
            key: "username",
        },
        {
            title: "EMAIL",
            dataIndex: "email",
            key: "email",
        },
        {
            title: "ROLE",
            dataIndex: "role",
            key: "role",
        },
        {
            title: "STATUS",
            dataIndex: "status",
            key: "status",
            render: (status: string): ReactElement => (
                <Tag className="text-estela border-0 rounded bg-button-hover" key={1}>
                    {status}
                </Tag>
            ),
        },
    ];

    updateInfo = (): void => {
        const requestParams: ApiProjectsReadRequest = { pid: this.projectId };
        this.apiService.apiProjectsRead(requestParams).then(
            (response: Project) => {
                let users = response.users;
                if (users === undefined) {
                    users = [];
                }
                const membersList: MemberState[] = [];
                users.map((user: Permission) => {
                    membersList.push({
                        username: user.user?.username,
                        email: user.user?.email,
                        role: user.permission,
                        status: "In Project",
                    });
                });
                this.setState({ name: response.name, users: users, members: membersList, loaded: true });
            },
            (error: unknown) => {
                console.error(error);
                resourceNotAllowedNotification();
            },
        );
    };

    async componentDidMount(): Promise<void> {
        if (!AuthService.getAuthToken()) {
            authNotification();
        } else {
            this.updateInfo();
        }
    }

    addUser = (): void => {
        const action = ProjectUpdateActionEnum.Add;
        const user_email = this.state.users.find((item) => item.user?.username === AuthService.getUserUsername())?.user
            ?.email;
        const requestData: ProjectUpdate = {
            user: user_email,
            email: this.state.newUser,
            action: action,
            permission: this.state.permission,
            name: this.state.name,
        };

        const request: ApiProjectsUpdateRequest = {
            data: requestData,
            pid: this.projectId,
        };
        this.apiService.apiProjectsUpdate(request).then(
            (response: ProjectUpdate) => {
                if (response.email == "User does not exist.") {
                    nonExistentUserNotification();
                }
                this.setState({ newUser: "" });
                this.updateInfo();
            },
            (error: unknown) => {
                handleInvalidDataError(error);
            },
        );
    };

    removeUser = (): void => {
        const user_email = this.state.users.find((item) => item.user?.username === AuthService.getUserUsername())?.user
            ?.email;
        const requestData: ProjectUpdate = {
            user: user_email,
            email: this.state.newUser,
            action: ProjectUpdateActionEnum.Remove,
            name: this.state.name,
        };
        const request: ApiProjectsUpdateRequest = {
            data: requestData,
            pid: this.projectId,
        };
        this.apiService.apiProjectsUpdate(request).then(
            (response: ProjectUpdate) => {
                if (response.email == "User does not exist.") {
                    nonExistentUserNotification();
                }
                this.setState({ newUser: "" });
                this.updateInfo();
            },
            (error: unknown) => {
                handleInvalidDataError(error);
            },
        );
    };

    handleInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        const {
            target: { value, name },
        } = event;
        if (name === "newUser") {
            this.setState({ newUser: value });
        }
    };

    handleSelectChange = (value: ProjectUpdatePermissionEnum): void => {
        this.setState({ permission: value });
        console.log(value);
    };

    render(): JSX.Element {
        const { loaded, members, newUser } = this.state;
        return (
            <Layout>
                <Header />
                <Layout className="bg-white">
                    {loaded ? (
                        <Fragment>
                            <ProjectSidenav projectId={this.projectId} path={"/members"} />
                            <Content className="bg-metal rounded-2xl">
                                <div className="lg:m-10 md:mx-6 mx-2">
                                    <Row className="flow-root my-6">
                                        <Col className="float-left">
                                            <p className="text-xl font-medium text-silver float-left">
                                                PROJECT MEMBERS
                                            </p>
                                        </Col>
                                        <Col className="float-right">
                                            <Button
                                                icon={<User className="mr-2" width={19} />}
                                                size="large"
                                                className="flex items-center stroke-white hover:stroke-estela bg-estela text-white hover:text-estela text-sm hover:border-estela rounded-md"
                                                onClick={() => this.setState({ modal: true })}
                                            >
                                                Add new member
                                            </Button>
                                            <Modal
                                                visible={this.state.modal}
                                                title={<p className="text-center m-2">ADD NEW MEMBER</p>}
                                                onCancel={() => this.setState({ modal: false })}
                                                footer={[<></>]}
                                            >
                                                <div className="lg:mx-8 md:mx-8">
                                                    <p className="lg:pb-4 py-2">Email</p>
                                                    <Input
                                                        className="border-estela rounded"
                                                        name="newUser"
                                                        placeholder="Please input your email"
                                                        value={newUser}
                                                        onChange={this.handleInputChange}
                                                    />
                                                    <p className="lg:py-4 py-2">Role</p>
                                                    <Select
                                                        className="w-full"
                                                        defaultValue={ProjectUpdatePermissionEnum.Viewer}
                                                        onChange={this.handleSelectChange}
                                                    >
                                                        <Option
                                                            className="hover:bg-button-hover hover:text-estela"
                                                            value={ProjectUpdatePermissionEnum.Admin}
                                                        >
                                                            Admin
                                                        </Option>
                                                        <Option
                                                            className="hover:bg-button-hover hover:text-estela"
                                                            value={ProjectUpdatePermissionEnum.Developer}
                                                        >
                                                            Developer
                                                        </Option>
                                                        <Option
                                                            className="hover:bg-button-hover hover:text-estela"
                                                            value={ProjectUpdatePermissionEnum.Viewer}
                                                        >
                                                            Viewer
                                                        </Option>
                                                    </Select>
                                                    <Row className="mt-6 w-full grid grid-cols-2" justify="center">
                                                        <Button
                                                            size="large"
                                                            className="mr-2 sm:mr-1 bg-estela text-white border-estela hover:text-estela hover:border-estela rounded"
                                                            onClick={() => {
                                                                this.setState({ modal: false });
                                                                this.addUser();
                                                            }}
                                                        >
                                                            Add
                                                        </Button>
                                                        <Button
                                                            size="large"
                                                            className="ml-2 sm:ml-1 border-estela hover:border-estela text-estela hover:text-estela"
                                                            onClick={() => this.setState({ modal: false })}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </Row>
                                                </div>
                                            </Modal>
                                        </Col>
                                    </Row>
                                    <Row className="bg-white rounded-lg">
                                        <div className="m-4">
                                            <Space direction="vertical" className="">
                                                <p className="text-silver text-lg font-medium">Members</p>
                                                <Table
                                                    tableLayout="fixed"
                                                    className="rounded-2xl"
                                                    rowSelection={{
                                                        type: "checkbox",
                                                    }}
                                                    columns={this.columns}
                                                    dataSource={members}
                                                    pagination={false}
                                                    size="middle"
                                                />
                                            </Space>
                                        </div>
                                    </Row>
                                </div>
                            </Content>
                        </Fragment>
                    ) : (
                        <Spin />
                    )}
                </Layout>
            </Layout>
        );
    }
}
