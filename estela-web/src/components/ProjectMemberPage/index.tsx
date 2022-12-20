import React, { Component, Fragment, ReactElement } from "react";
import { Button, Layout, Space, Table, Row, Col, Tag, Modal, Input, Select, Typography } from "antd";
import { RouteComponentProps } from "react-router-dom";

import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import User from "../../assets/icons/user.svg";
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
const { Text } = Typography;

interface MemberState {
    key: number;
    username: string | undefined;
    email: string | undefined;
    role: string | undefined;
    status: string | undefined;
}

interface ProjectMemberPageState {
    name: string;
    user: string;
    users: Permission[];
    selectedRows: MemberState[];
    loaded: boolean;
    modalAddMember: boolean;
    modalUpdateMember: boolean;
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
        modalAddMember: false,
        modalUpdateMember: false,
        selectedRows: [],
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
            render: (status: string, member: MemberState): ReactElement => (
                <Tag className="text-estela border-0 rounded bg-button-hover" key={member.key}>
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
                const memberList: MemberState[] = users.map((user: Permission, id: number) => {
                    return {
                        key: id,
                        username: user.user?.username,
                        email: user.user?.email,
                        role: user.permission,
                        status: "In Project",
                    };
                });
                this.setState({ name: response.name, users: users, members: memberList, loaded: true });
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

    userManagement = (email: string, option: number): void => {
        const action =
            option == 0
                ? ProjectUpdateActionEnum.Remove
                : option == 1
                ? ProjectUpdateActionEnum.Add
                : ProjectUpdateActionEnum.Update;
        const user_email = this.state.users.find((item) => item.user?.username === AuthService.getUserUsername())?.user
            ?.email;
        const requestData: ProjectUpdate = {
            user: user_email,
            email: email,
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
    };

    rowSelection = {
        onChange: (selectedRowKeys: React.Key[], selectedRows: MemberState[]) => {
            this.setState({ selectedRows: selectedRows });
        },
        getCheckboxProps: (record: MemberState) => ({
            disabled: record.username === AuthService.getUserUsername(),
        }),
    };

    handleDeleteRow = (): void => {
        this.state.selectedRows.map((row) => {
            this.userManagement(String(row.email), 0);
        });
        this.setState({ selectedRows: [] });
    };

    render(): JSX.Element {
        const { loaded, members, newUser, selectedRows, modalAddMember, modalUpdateMember } = this.state;
        return (
            <Layout>
                <Header />
                <Layout className="bg-white">
                    {loaded ? (
                        <Fragment>
                            <ProjectSidenav projectId={this.projectId} path={"members"} />
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
                                                className="flex items-center stroke-white border-estela hover:stroke-estela bg-estela text-white hover:text-estela text-sm hover:border-estela rounded-md"
                                                onClick={() => this.setState({ modalAddMember: true })}
                                            >
                                                Add new member
                                            </Button>
                                            <Modal
                                                open={modalAddMember}
                                                width={400}
                                                title={<h2 className="text-center">ADD NEW MEMBER</h2>}
                                                onCancel={() => this.setState({ modalAddMember: false })}
                                                footer={null}
                                            >
                                                <Content>
                                                    <Text>Email</Text>
                                                    <Input
                                                        size="large"
                                                        style={{ borderRadius: "8px" }}
                                                        className="border-estela rounded my-2"
                                                        name="newUser"
                                                        placeholder="Please input the email"
                                                        value={newUser}
                                                        onChange={this.handleInputChange}
                                                    />
                                                    <Text>Role</Text>
                                                    <Select
                                                        size="large"
                                                        className="w-full my-2"
                                                        defaultValue={ProjectUpdatePermissionEnum.Viewer}
                                                        onChange={this.handleSelectChange}
                                                    >
                                                        <Option
                                                            key={1}
                                                            className="hover:bg-button-hover hover:text-estela"
                                                            value={ProjectUpdatePermissionEnum.Admin}
                                                        >
                                                            Admin
                                                        </Option>
                                                        <Option
                                                            key={2}
                                                            className="hover:bg-button-hover hover:text-estela"
                                                            value={ProjectUpdatePermissionEnum.Developer}
                                                        >
                                                            Developer
                                                        </Option>
                                                        <Option
                                                            key={3}
                                                            className="hover:bg-button-hover hover:text-estela"
                                                            value={ProjectUpdatePermissionEnum.Viewer}
                                                        >
                                                            Viewer
                                                        </Option>
                                                    </Select>
                                                    <Row className="mt-4 w-full grid grid-cols-2" justify="center">
                                                        <Button
                                                            size="large"
                                                            className="mr-2 sm:mr-1 bg-estela text-white border-estela hover:text-estela hover:border-estela rounded"
                                                            onClick={() => {
                                                                this.setState({ modalAddMember: false });
                                                                this.userManagement(newUser, 1);
                                                            }}
                                                        >
                                                            Add
                                                        </Button>
                                                        <Button
                                                            size="large"
                                                            className="ml-2 sm:ml-1 border-estela hover:border-estela text-estela hover:text-estela rounded"
                                                            onClick={() => this.setState({ modalAddMember: false })}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </Row>
                                                </Content>
                                            </Modal>
                                        </Col>
                                    </Row>
                                    <Row className="bg-white rounded-lg">
                                        <Content className="m-4">
                                            <Space direction="vertical">
                                                <p className="text-silver text-lg font-medium">Members</p>
                                                <Table
                                                    tableLayout="fixed"
                                                    className="rounded-2xl"
                                                    rowSelection={this.rowSelection}
                                                    columns={this.columns}
                                                    dataSource={members}
                                                    pagination={false}
                                                    size="middle"
                                                />
                                            </Space>
                                        </Content>
                                    </Row>
                                    <Row>
                                        <Space direction="horizontal">
                                            <Button
                                                disabled={selectedRows.length === 0}
                                                onClick={this.handleDeleteRow}
                                                className="bg-estela-red-low border-estela-red-low text-estela-red-full hover:bg-estela-red-low hover:text-estela-red-full hover:border-estela-red-full rounded-2xl"
                                            >
                                                Delete
                                            </Button>
                                            <Button
                                                disabled={selectedRows.length !== 1}
                                                onClick={() => {
                                                    this.setState({
                                                        modalUpdateMember: true,
                                                        newUser: String(selectedRows[0].email),
                                                    });
                                                }}
                                                className="bg-estela-blue-low border-estela-blue-low text-estela-blue-full hover:bg-estela-blue-low hover:text-estela-blue-full hover:border-estela-blue-full rounded-2xl"
                                            >
                                                Change role
                                            </Button>
                                            <Modal
                                                open={modalUpdateMember}
                                                width={400}
                                                title={<p className="text-center">UPDATE MEMBER</p>}
                                                onCancel={() => this.setState({ modalUpdateMember: false })}
                                                footer={null}
                                            >
                                                <Content className="mx-3">
                                                    <p className="py-3">Email</p>
                                                    <Text className="bg-estela-blue-low p-1 text-base text-estela-blue-full rounded">
                                                        {newUser}
                                                    </Text>
                                                    <p className="py-3">Role</p>
                                                    <Select
                                                        size="large"
                                                        className="w-full"
                                                        defaultValue={ProjectUpdatePermissionEnum.Viewer}
                                                        onChange={this.handleSelectChange}
                                                    >
                                                        <Option
                                                            key={1}
                                                            className="hover:bg-button-hover hover:text-estela"
                                                            value={ProjectUpdatePermissionEnum.Admin}
                                                        >
                                                            Admin
                                                        </Option>
                                                        <Option
                                                            key={2}
                                                            className="hover:bg-button-hover hover:text-estela"
                                                            value={ProjectUpdatePermissionEnum.Developer}
                                                        >
                                                            Developer
                                                        </Option>
                                                        <Option
                                                            key={3}
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
                                                                this.setState({ modalUpdateMember: false });
                                                                this.userManagement(newUser, 2);
                                                            }}
                                                        >
                                                            Update
                                                        </Button>
                                                        <Button
                                                            size="large"
                                                            className="ml-2 sm:ml-1 border-estela hover:border-estela text-estela hover:text-estela"
                                                            onClick={() => this.setState({ modalUpdateMember: false })}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </Row>
                                                </Content>
                                            </Modal>
                                        </Space>
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
