import React, { Component } from "react";
import { Button, Radio, Layout, Form, Typography, Row, Input, Select, Space } from "antd";
import { RouteComponentProps, Link } from "react-router-dom";

import "./styles.scss";
import history from "../../history";
import { ApiService, AuthService } from "../../services";
import {
    ApiProjectsReadRequest,
    Project,
    ProjectUpdate,
    ProjectUpdatePermissionEnum,
    ApiProjectsUpdateRequest,
    ApiProjectsDeleteRequest,
} from "../../services/api";
import { authNotification, resourceNotAllowedNotification, ProjectSidenav } from "../../shared";
import { Permission } from "../../services/api/generated-api/models/Permission";
import { handleInvalidDataError } from "../../utils";

const { Content } = Layout;
const { Option } = Select;

interface ProjectSettingsPageState {
    name: string;
    user: string;
    users: Permission[];
    loaded: boolean;
    newUser: string;
    permission: ProjectUpdatePermissionEnum;
    showModal: boolean;
    deletable: boolean;
    detailsChanged: boolean;
    persistenceChanged: boolean;
    persistenceValue: string;
}

interface RouteParams {
    projectId: string;
}

export class ProjectSettingsPage extends Component<RouteComponentProps<RouteParams>, ProjectSettingsPageState> {
    state: ProjectSettingsPageState = {
        name: "",
        user: "",
        users: [],
        loaded: false,
        newUser: "",
        permission: ProjectUpdatePermissionEnum.Viewer,
        showModal: false,
        deletable: false,
        detailsChanged: false,
        persistenceChanged: false,
        persistenceValue: "",
    };
    apiService = ApiService();
    projectId: string = this.props.match.params.projectId;

    closeModal = (): void => {
        this.setState({ showModal: false });
    };

    openModal = (): void => {
        this.setState({ showModal: true });
    };

    updateInfo = (): void => {
        const requestParams: ApiProjectsReadRequest = { pid: this.projectId };
        this.apiService.apiProjectsRead(requestParams).then(
            (response: Project) => {
                let users = response.users;
                if (users === undefined) {
                    users = [];
                }
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

    changeName = (): void => {
        console.log("new name is", this.state.name);
        const requestData: ProjectUpdate = {
            permission: this.state.permission,
            name: this.state.name,
        };
        const request: ApiProjectsUpdateRequest = {
            data: requestData,
            pid: this.projectId,
        };
        this.apiService.apiProjectsUpdate(request).then(
            () => {
                this.updateInfo();
            },
            (error: unknown) => {
                handleInvalidDataError(error);
            },
        );
    };

    deleteProject = (): void => {
        const request: ApiProjectsDeleteRequest = {
            pid: this.projectId,
        };
        this.apiService.apiProjectsDelete(request).then(
            () => {
                history.push(`/projects`);
            },
            (error: unknown) => {
                handleInvalidDataError(error);
            },
        );
    };

    handlePersistenceChange = (test: string): void => {
        this.setState({ persistenceChanged: true });
        this.setState({ persistenceValue: test });
    };

    handleNameChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        const {
            target: { value },
        } = event;
        this.setState({ detailsChanged: true });
        this.setState({ name: value });
    };

    checkDeletable = (event: React.ChangeEvent<HTMLInputElement>): void => {
        const {
            target: { value },
        } = event;
        if (value === this.state.name) {
            this.setState({ deletable: true });
        } else {
            this.setState({ deletable: false });
        }
    };

    handleSelectChange = (value: ProjectUpdatePermissionEnum): void => {
        this.setState({ permission: value });
    };

    render(): JSX.Element {
        const { showModal, detailsChanged, persistenceChanged } = this.state;
        return (
            <Layout>
                <Layout className="bg-white">
                    <ProjectSidenav projectId={this.projectId} path={"/settings"} />
                    <Content className="bg-metal rounded-2xl">
                        <div className="lg:m-10 md:mx-6 m-6">
                            <Row className="font-medium my-6">
                                <p className="text-xl text-silver">PROJECT SETTING</p>
                            </Row>
                            <Row className="bg-white rounded-lg">
                                <div className="lg:m-8 md:mx-6 m-4">
                                    <p className="text-2xl text-estela-black-full ">Details</p>
                                    <div className="bg-white my-4">
                                        <Content>
                                            <Form layout="vertical" className="w-96">
                                                <div className="">
                                                    <Form.Item
                                                        label={
                                                            <div className="text-base text-estela-black-full">
                                                                Project Name
                                                            </div>
                                                        }
                                                        name="projectname"
                                                    >
                                                        <Input
                                                            style={{ fontSize: 14 }}
                                                            size="large"
                                                            placeholder={this.state.name}
                                                            onChange={this.handleNameChange}
                                                            className="border-estela placeholder:text-estela-black-full"
                                                        />
                                                    </Form.Item>
                                                    <Form.Item label="Category" name="category">
                                                        <Select
                                                            style={{ fontSize: 14 }}
                                                            size="large"
                                                            className="rounded-lg border-estela"
                                                            placeholder="Select ..."
                                                        >
                                                            <Option
                                                                className="text-estela-black-medium hover:bg-button-hover selection:border-estela selection:text-estela"
                                                                value="notspecified"
                                                            >
                                                                Not Specified
                                                            </Option>
                                                            <Option
                                                                className="text-estela-black-medium hover:bg-button-hover selection:border-estela selection:text-estela"
                                                                value="ecommerce"
                                                            >
                                                                E-commerce
                                                            </Option>
                                                            <Option
                                                                className="text-estela-black-medium hover:bg-button-hover selection:border-estela selection:text-estela"
                                                                value="logistics"
                                                            >
                                                                Logistics
                                                            </Option>
                                                            <Option
                                                                className="text-estela-black-medium hover:bg-button-hover selection:border-estela selection:text-estela"
                                                                value="finance"
                                                            >
                                                                Finance
                                                            </Option>
                                                            <Option
                                                                className="text-estela-black-medium hover:bg-button-hover selection:border-estela selection:text-estela"
                                                                value="educational"
                                                            >
                                                                Educational
                                                            </Option>
                                                            <Option
                                                                className="text-estela-black-medium hover:bg-button-hover selection:border-estela selection:text-estela"
                                                                value="technology"
                                                            >
                                                                Technology
                                                            </Option>
                                                            <Option
                                                                className="text-estela-black-medium hover:bg-button-hover selection:border-estela selection:text-estela"
                                                                value="other"
                                                            >
                                                                Other Category
                                                            </Option>
                                                        </Select>
                                                    </Form.Item>
                                                </div>
                                                <div className="h-12 w-72">
                                                    <Button
                                                        block
                                                        disabled={!detailsChanged}
                                                        htmlType="submit"
                                                        onClick={this.changeName}
                                                        className="border-estela bg-estela hover:border-estela hover:text-estela text-white rounded-md text-base  min-h-full"
                                                    >
                                                        <Link to={`/projects/${this.projectId}/dashboard`}>
                                                            Save Changes
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </Form>
                                        </Content>
                                    </div>
                                </div>
                            </Row>
                            <Row className="bg-white rounded-lg my-4">
                                <div className="lg:m-8 md:mx-6 m-4">
                                    <p className="text-2xl text-black">Data persistence</p>
                                    <p className="text-sm my-2 text-estela-black-medium">
                                        New projects you create will have this data persistence by default to retain
                                        data in Bitmaker Cloud
                                    </p>
                                    <Content>
                                        <Radio.Group className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2 lg:my-6 my-4">
                                            <Radio.Button
                                                value="1 day"
                                                onClick={() => {
                                                    this.handlePersistenceChange("1 day");
                                                }}
                                            >
                                                1 day
                                            </Radio.Button>
                                            <Radio.Button
                                                value="1 week"
                                                onClick={() => {
                                                    this.handlePersistenceChange("1 week");
                                                }}
                                            >
                                                1 week
                                            </Radio.Button>
                                            <Radio.Button
                                                value="1 month"
                                                onClick={() => {
                                                    this.handlePersistenceChange("1 month");
                                                }}
                                            >
                                                1&nbsp;month
                                            </Radio.Button>
                                            <Radio.Button
                                                value="3 months"
                                                onClick={() => {
                                                    this.handlePersistenceChange("3 months");
                                                }}
                                            >
                                                3&nbsp;months
                                            </Radio.Button>
                                            <Radio.Button
                                                value="6 months"
                                                onClick={() => {
                                                    this.handlePersistenceChange("6 months");
                                                }}
                                            >
                                                6&nbsp;months
                                            </Radio.Button>
                                            <Radio.Button
                                                value="1 year"
                                                onClick={() => {
                                                    this.handlePersistenceChange("1 year");
                                                }}
                                            >
                                                1 year
                                            </Radio.Button>
                                            <Radio.Button
                                                value="forever"
                                                onClick={() => {
                                                    this.handlePersistenceChange("forever");
                                                }}
                                            >
                                                Forever
                                            </Radio.Button>
                                        </Radio.Group>
                                    </Content>
                                    <div className="h-12 w-72">
                                        <Button
                                            block
                                            disabled={!persistenceChanged}
                                            htmlType="submit"
                                            className="border-estela bg-estela hover:border-estela hover:text-estela text-white rounded-md text-base  min-h-full"
                                        >
                                            Save Changes
                                        </Button>
                                    </div>
                                </div>
                            </Row>
                            <Row className="bg-white rounded-lg">
                                <Space direction="vertical" className="lg:m-8 md:mx-6 m-4">
                                    <Typography className="text-2xl text-black">Delete</Typography>
                                    <Typography className="mb-2 text-sm text-estela-black-medium">
                                        This action cannot be undone
                                    </Typography>
                                    <div className="h-12 w-72">
                                        <Button
                                            block
                                            disabled={false}
                                            htmlType="submit"
                                            onClick={() => this.openModal()}
                                            className="border-estela-red-full bg-estela-red-full hover:border-estela-red-full hover:text-estela-red-full text-white rounded-md text-base min-h-full"
                                        >
                                            Delete Project
                                        </Button>
                                    </div>
                                </Space>
                            </Row>
                            <div className="">
                                {showModal ? (
                                    <>
                                        <Row className="inset-x-1/3 inset-y-1/3 lg:w-4/12 md:w-1/2 sm:w-1/2 align-middle items-center fixed z-50">
                                            <Layout className="bg-white align-middle object-center items-center text-center p-8 rounded-2xl">
                                                <Typography className="text-xl">CONFIRM ACTION</Typography>
                                                <Typography className="text-left text-base my-4">
                                                    Enter the name of the project to delete it
                                                </Typography>
                                                <Space direction="vertical" className="bg-white w-full">
                                                    <Form className="items-center align-middle">
                                                        <Form.Item name="deletingproject">
                                                            <p className="text-left text-base text-estela-black-full mb-2">
                                                                Project Name
                                                            </p>
                                                            <Input
                                                                onChange={this.checkDeletable}
                                                                placeholder={this.state.name}
                                                                className="h-12 rounded-lg border-2 border-estela"
                                                            />
                                                        </Form.Item>
                                                    </Form>
                                                </Space>
                                                <Row className="grid grid-cols-2 w-full items-center bg-white">
                                                    <div className="h-12 mr-2 align-middle">
                                                        <Button
                                                            block
                                                            disabled={!this.state.deletable}
                                                            htmlType="submit"
                                                            onClick={() => this.deleteProject()}
                                                            className="border-estela-red-full bg-estela-red-full hover:border-estela-red-full hover:text-estela-red-full text-white rounded-md text-base  min-h-full"
                                                        >
                                                            <Link to={`/`}>Delete</Link>
                                                        </Button>
                                                    </div>
                                                    <div className="h-12 ml-2 align-middle">
                                                        <Button
                                                            block
                                                            disabled={false}
                                                            htmlType="submit"
                                                            onClick={() => this.closeModal()}
                                                            className="border-estela bg-white hover:bg-estela hover:border-white hover:text-white text-estela rounded-md text-base  min-h-full"
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </Row>
                                            </Layout>
                                        </Row>
                                        <div className="opacity-25 fixed inset-0 z-40 bg-black"></div>
                                    </>
                                ) : null}
                            </div>
                        </div>
                    </Content>
                </Layout>
            </Layout>
        );
    }
}
