import React, { Component } from "react";
import { Button, Layout, Form, Typography, Row, Input, Select } from "antd";
import { RouteComponentProps, Link } from "react-router-dom";

import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import {
    ApiProjectsReadRequest,
    Project,
    ProjectUpdate,
    ProjectUpdatePermissionEnum,
    ApiProjectsUpdateRequest,
    ApiProjectsDeleteRequest,
} from "../../services/api";
import { authNotification, resourceNotAllowedNotification, Header, ProjectSidenav } from "../../shared";
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
        console.log("new name is", this.state.name);
        const request: ApiProjectsDeleteRequest = {
            pid: this.projectId,
        };
        this.apiService.apiProjectsDelete(request).then(
            () => {
                this.updateInfo();
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
            <Layout className="bg-white">
                <Header />
                <Layout>
                    <ProjectSidenav projectId={this.projectId} path={"/settings"} />
                    <Content className="bg-white">
                        <Layout className="bg-white w-full flex pl-10 pt-12 pb-11">
                            <Typography className="font-sans text-xl text-estela-black-medium">
                                PROJECT SETTING
                            </Typography>
                        </Layout>
                        <Layout className="bg-white flex pl-10">
                            <Typography className=" pt-10 pl-10 font-sans text-2xl text-black">Details</Typography>
                            <Layout>
                                <Content className="flex pl-10 bg-white">
                                    <Form layout="vertical" className="pt-7 w-96">
                                        <div className="">
                                            <Form.Item
                                                label={<div className="text-base">Project Name</div>}
                                                name="projectname"
                                            >
                                                <Input
                                                    onChange={this.handleNameChange}
                                                    className="h-14 rounded-lg border-estela"
                                                />
                                            </Form.Item>
                                            <Form.Item label="Category" name="category">
                                                <Select
                                                    className="h-14 rounded-lg border border-estela"
                                                    placeholder={<div className="">Select...</div>}
                                                >
                                                    <>
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
                                                    </>
                                                </Select>
                                            </Form.Item>
                                        </div>
                                        <div className="h-14 w-72">
                                            <Button
                                                block
                                                disabled={!detailsChanged}
                                                htmlType="submit"
                                                onClick={this.changeName}
                                                className="border-estela bg-estela hover:border-estela hover:text-estela text-white rounded-md text-base  min-h-full"
                                            >
                                                <Link to={`/projects/${this.projectId}`}>Save Changes</Link>
                                            </Button>
                                        </div>
                                    </Form>
                                </Content>
                            </Layout>
                        </Layout>
                        <Layout className="bg-white pt-14 pl-20 w-5/12">
                            <Typography className="pt-10 font-sans text-2xl text-black">Data persistence</Typography>
                            <Typography className="pt-4 pb-8 font-sans text-sm text-estela-black-medium">
                                New projects you create will have this data persistence by default to retain data in
                                Bitmaker Cloud
                            </Typography>
                            <Layout className="auto-cols-auto grid grid-flow-col bg-white pb-10">
                                <Button
                                    block
                                    onClick={() => {
                                        this.handlePersistenceChange("1 day");
                                    }}
                                    className="h-9 w-20 border-button-hover bg-button-hover hover:border-button-hover hover:text-estela text-silver selection:border-estela selection:text-estela rounded-2xl text-sm  min-h-full"
                                >
                                    1 day
                                </Button>
                                <Button
                                    block
                                    onClick={() => {
                                        this.handlePersistenceChange("1 week");
                                    }}
                                    className="h-9 w-20 border-button-hover bg-button-hover hover:border-button-hover hover:text-estela text-silver selection:border-estela selection:text-estela rounded-2xl text-sm  min-h-full"
                                >
                                    1 week
                                </Button>
                                <Button
                                    block
                                    onClick={() => {
                                        this.handlePersistenceChange("1 month");
                                    }}
                                    className="h-9 w-20 border-button-hover bg-button-hover hover:border-button-hover hover:text-estela text-silver selection:border-estela selection:text-estela rounded-2xl text-sm  min-h-full"
                                >
                                    1 month
                                </Button>
                                <Button
                                    block
                                    onClick={() => {
                                        this.handlePersistenceChange("3 months");
                                    }}
                                    className="h-9 w-20 border-button-hover bg-button-hover hover:border-button-hover hover:text-estela text-silver selection:border-estela selection:text-estela rounded-2xl text-sm  min-h-full"
                                >
                                    3 months
                                </Button>
                                <Button
                                    block
                                    onClick={() => {
                                        this.handlePersistenceChange("6 months");
                                    }}
                                    className="h-9 w-20 border-button-hover bg-button-hover hover:border-button-hover hover:text-estela text-silver selection:border-estela selection:text-estela rounded-2xl text-sm  min-h-full"
                                >
                                    6 months
                                </Button>
                                <Button
                                    block
                                    onClick={() => {
                                        this.handlePersistenceChange("1 year");
                                    }}
                                    className="h-9 w-20 border-button-hover bg-button-hover hover:border-button-hover hover:text-estela text-silver selection:border-estela selection:text-estela rounded-2xl text-sm  min-h-full"
                                >
                                    1 year
                                </Button>
                                <Button
                                    block
                                    onClick={() => {
                                        this.handlePersistenceChange("Forever");
                                    }}
                                    className="h-9 w-20 border-button-hover bg-button-hover hover:border-button-hover hover:text-estela text-silver selection:border-estela selection:text-estela rounded-2xl text-sm  min-h-full"
                                >
                                    Forever
                                </Button>
                            </Layout>
                            <div className="h-14 w-72">
                                <Button
                                    block
                                    disabled={!persistenceChanged}
                                    htmlType="submit"
                                    className="border-estela bg-estela hover:border-estela hover:text-estela text-white rounded-md text-base  min-h-full"
                                >
                                    Save Changes
                                </Button>
                            </div>
                        </Layout>
                        <Layout className="bg-white pl-20 py-14">
                            <Typography className="pt-10 font-sans text-2xl text-black">Delete</Typography>
                            <Typography className="pt-4 pb-8 font-sans text-sm text-estela-black-medium">
                                This action cannot be undone
                            </Typography>
                            <div className="h-14 w-72">
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
                        </Layout>
                        <div className="">
                            {showModal ? (
                                <>
                                    <Row className="inset-x-1/3 inset-y-1/3 w-4/12 align-middle items-center fixed z-50 bg-none">
                                        <Layout className="bg-white align-middle object-center bg-none items-center text-center p-10 rounded-2xl">
                                            <Typography className="text-xl">CONFIRM ACTION</Typography>
                                            <Typography className="text-base pt-5">
                                                Enter the name of the project to delete it
                                            </Typography>
                                            <Content className="bg-white w-9/12">
                                                <Form
                                                    layout="vertical"
                                                    className="pt-7 items-center align-middle w-min-full"
                                                >
                                                    <div className="">
                                                        <Form.Item
                                                            label={<div className="text-base">Project Name</div>}
                                                            name="deletingproject"
                                                        >
                                                            <Input
                                                                onChange={this.checkDeletable}
                                                                className="h-14 rounded-lg border-estela"
                                                            />
                                                        </Form.Item>
                                                    </div>
                                                </Form>
                                            </Content>
                                            <Layout className="grid grid-cols-2 items-center bg-white">
                                                <div className="h-14 w-56 px-4 align-middle">
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
                                                <div className="h-14 w-56  px-4">
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
                                            </Layout>
                                        </Layout>
                                    </Row>
                                    <div className="opacity-25 fixed inset-0 z-40 bg-black"></div>
                                </>
                            ) : null}
                        </div>
                    </Content>
                </Layout>
            </Layout>
        );
    }
}
