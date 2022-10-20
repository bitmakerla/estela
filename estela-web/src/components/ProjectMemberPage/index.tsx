import React, { Component, Fragment, ReactElement } from "react";
import { Button, Layout, Space, Table, Row, Col, Tag } from "antd";
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
            render: (status: string): ReactElement => <Tag key={1}>{status}</Tag>,
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
                users.map((user: Permission) => {
                    this.state.members.push({
                        username: user.user?.username,
                        email: user.user?.email,
                        role: user.permission,
                        status: "In Project",
                    });
                });
                this.setState({ name: response.name, users: users, loaded: true });
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
        const { loaded, members } = this.state;
        return (
            <Layout className="">
                <Header />
                <Layout className="bg-white">
                    {loaded ? (
                        <Fragment>
                            <ProjectSidenav projectId={this.projectId} path={"/members"} />
                            <Content className="bg-metal rounded-2xl h-screen">
                                <div className="lg:m-10">
                                    <Row className="flow-root my-6">
                                        <Col className="float-left">
                                            <p className="text-xl font-medium text-silver float-left">
                                                Project Members
                                            </p>
                                        </Col>
                                        <Col className="float-right">
                                            <Button
                                                icon={<User className="mr-2" width={19} />}
                                                size="large"
                                                className="flex items-center stroke-white hover:stroke-estela bg-estela text-white hover:text-estela text-sm hover:border-estela rounded-md"
                                            >
                                                Add new member
                                            </Button>
                                        </Col>
                                    </Row>
                                    <Row className="bg-white rounded-lg">
                                        <div className="m-4">
                                            <Space direction="vertical" className="">
                                                <p className="text-silver text-lg font-medium">Members</p>
                                                {/* {users.map((users: Permission, id) => (
                                                    <Descriptions key={id}>
                                                        <Descriptions.Item label="UserName">
                                                            {users.user?.username}
                                                        </Descriptions.Item>
                                                        <Descriptions.Item label="Email">
                                                            {users.user?.email}
                                                        </Descriptions.Item>
                                                        <Descriptions.Item label="Permission">
                                                            {users.permission}
                                                        </Descriptions.Item>
                                                    </Descriptions>
                                                ))} */}
                                                <Table
                                                    className="rounded-2xl"
                                                    rowSelection={{
                                                        type: "checkbox",
                                                    }}
                                                    columns={this.columns}
                                                    dataSource={members}
                                                    pagination={false}
                                                    size="middle"
                                                />
                                                {/* <Input
                                                    name="newUser"
                                                    placeholder="email"
                                                    value={newUser}
                                                    onChange={this.handleInputChange}
                                                /> */}
                                                {/* <Select
                                                    defaultValue={ProjectUpdatePermissionEnum.Viewer}
                                                    style={{ width: 120 }}
                                                    onChange={this.handleSelectChange}
                                                >
                                                    <Option value={ProjectUpdatePermissionEnum.Admin}>Admin</Option>
                                                    <Option value={ProjectUpdatePermissionEnum.Developer}>
                                                        Developer
                                                    </Option>
                                                    <Option value={ProjectUpdatePermissionEnum.Viewer}>Viewer</Option>
                                                </Select> */}
                                            </Space>
                                        </div>
                                        {/* <Button className="job-create-button" onClick={this.addUser}>
                                            Add User
                                        </Button>
                                        <Button className="job-create-button" onClick={this.removeUser}>
                                            Remove User
                                        </Button> */}
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
