import React, { Component, Fragment, ReactElement } from "react";
import { Link } from "react-router-dom";
import { Button, Layout, Space, Row, Col, Tag, Table, Modal, Input, Select } from "antd";

import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import Add from "../../assets/icons/add.svg";
import Bug from "../../assets/icons/bug.svg";
import FolderDotted from "../../assets/icons/folderDotted.svg";
import history from "../../history";
import { ApiProjectsListRequest, ApiProjectsCreateRequest, Project, ProjectCategoryEnum } from "../../services/api";
import { authNotification, incorrectDataNotification, Header, Spin } from "../../shared";

const { Content } = Layout;
const { Option } = Select;

interface ProjectList {
    name: string;
    category?: string;
    pid: string | undefined;
    role: string;
    key: number;
}

interface ProjectsPageState {
    projects: ProjectList[];
    username: string;
    loaded: boolean;
    count: number;
    current: number;
    modalNewProject: boolean;
    newProjectName: string;
    newProjectCategory: ProjectCategoryEnum;
}

export class ProjectListPage extends Component<unknown, ProjectsPageState> {
    PAGE_SIZE = 10;
    totalProjects = 0;

    state: ProjectsPageState = {
        projects: [],
        username: "",
        loaded: false,
        count: 0,
        current: 0,
        modalNewProject: false,
        newProjectName: "",
        newProjectCategory: ProjectCategoryEnum.NotEspecified,
    };

    apiService = ApiService();

    columns = [
        {
            title: "NAME",
            dataIndex: "name",
            key: "name",
            render: (name: string, project: ProjectList): ReactElement => (
                <Link
                    className="text-sm font-medium hover:text-estela"
                    to={`/projects/${project.pid}/dashboard`}
                    onClick={() => this.setUserRole(project.role)}
                >
                    {name}
                </Link>
            ),
        },
        {
            title: "PID",
            dataIndex: "pid",
            key: "pid",
            render: (pid: string): ReactElement => <p className="font-courier">ID: {pid}</p>,
        },
        {
            title: "ROLE",
            dataIndex: "role",
            key: "role",
            render: (role: string, project: ProjectList): ReactElement => (
                <Tag className="text-estela border-0 rounded bg-button-hover float-right" key={project.key}>
                    {role}
                </Tag>
            ),
        },
    ];

    emptyText = (): ReactElement => (
        <div className="flex flex-col items-center justify-center text-gray-400">
            <FolderDotted className="w-20 h-20" />
            <p>No proyects yet.</p>
        </div>
    );
    async componentDidMount(): Promise<void> {
        if (!AuthService.getAuthToken()) {
            authNotification();
        } else {
            const data = await this.getProjects(1);
            const projectData: ProjectList[] = data.data.map((project: Project, id: number) => {
                return {
                    name: project.name,
                    category: project.category,
                    pid: project.pid,
                    role:
                        project.users?.find((user) => user.user?.username === AuthService.getUserUsername())
                            ?.permission || "Admin",
                    key: id,
                };
            });
            this.setState({ projects: [...projectData], count: data.count, current: data.current, loaded: true });
        }
    }

    handleInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        const {
            target: { value, name },
        } = event;
        if (name === "newProjectName") {
            this.setState({ newProjectName: value });
        }
    };

    handleSelectChange = (value: ProjectCategoryEnum): void => {
        this.setState({ newProjectCategory: value });
    };

    projectManagment = (data: { name: string; category: ProjectCategoryEnum }): void => {
        const request: ApiProjectsCreateRequest = { data };
        this.apiService.apiProjectsCreate(request).then(
            (response: Project) => {
                history.push(`/projects/${response.pid}/dashboard`);
                window.location.reload();
            },
            (error: unknown) => {
                console.error(error);
                incorrectDataNotification();
            },
        );
    };

    setUserRole = (role: string): void => {
        AuthService.setUserRole(role);
    };

    getUser = (): string => {
        return String(AuthService.getUserUsername());
    };

    async getProjects(page: number): Promise<{ data: Project[]; count: number; current: number }> {
        const requestParams: ApiProjectsListRequest = { page, pageSize: this.PAGE_SIZE };
        const data = await this.apiService.apiProjectsList(requestParams);
        this.totalProjects = data.count;
        return { data: data.results, count: data.count, current: page };
    }

    onPageChange = async (page: number): Promise<void> => {
        this.setState({ loaded: false });
        const data = await this.getProjects(page);
        const projectData: ProjectList[] = data.data.map((project: Project, id: number) => {
            return {
                name: project.name,
                pid: project.pid,
                role:
                    project.users?.find((user) => user.user?.username === AuthService.getUserUsername())?.permission ||
                    "Admin",
                key: id,
            };
        });
        this.setState({
            projects: [...projectData],
            count: data.count,
            current: data.current,
            loaded: true,
        });
    };

    render(): JSX.Element {
        const { projects, loaded, modalNewProject, newProjectName, newProjectCategory } = this.state;
        return (
            <Layout className="h-screen">
                <Header />
                <Layout className="bg-metal p-6">
                    {loaded ? (
                        <Fragment>
                            <Content className="mx-4">
                                <Space direction="vertical" className="mx-8">
                                    <div className="float-left">
                                        <p className="text-3xl">
                                            Welcome home&nbsp;
                                            <span className="text-estela">{this.getUser()}</span>!
                                        </p>
                                    </div>
                                    <div className="bg-white rounded-md p-6 mx-4">
                                        <Row className="flow-root items-center my-2">
                                            <Col className="float-left">
                                                <p className="text-silver text-base font-medium">RECENT PROJECTS</p>
                                            </Col>
                                        </Row>
                                        <Row className="gap-3">
                                            <Col className="bg-[#F6FAFD] rounded-md p-3">
                                                <Row className="gap-3">
                                                    <p className="font-bold">My first project</p>
                                                    <p className="text-estela font-semibold">New</p>
                                                </Row>
                                                <p className="font-courier">
                                                    ID: 23ea584d-f39c-85bd-74c1-9b725ffcab1d7
                                                </p>
                                                <Row className="float-right mt-2 bg-white rounded-md">
                                                    <p>Admin</p>
                                                </Row>
                                            </Col>
                                            <Col className="rounded-md p-3">
                                                <Row className="gap-3">
                                                    <p className="font-bold">My first project</p>
                                                </Row>
                                                <p className="font-courier">
                                                    ID: 23ea584d-f39c-85bd-74c1-9b725ffcab1d7
                                                </p>
                                                <Row className="float-right mt-2">
                                                    <p>Admin</p>
                                                </Row>
                                            </Col>
                                            <Col className="rounded-md p-3">
                                                <Row className="gap-3">
                                                    <p className="font-bold">My first project</p>
                                                </Row>
                                                <p className="font-courier">
                                                    ID: 23ea584d-f39c-85bd-74c1-9b725ffcab1d7
                                                </p>
                                                <Row className="float-right mt-2">
                                                    <p>Admin</p>
                                                </Row>
                                            </Col>
                                        </Row>
                                    </div>
                                    <div className="bg-white rounded-md p-6 mx-4">
                                        <Row className="flow-root items-center my-2">
                                            <Col className="float-left">
                                                <p className="text-silver text-base font-medium">MY PROJECTS</p>
                                            </Col>
                                            <Col className="float-right">
                                                <Button
                                                    icon={<Add className="mr-2" width={15} />}
                                                    className="flex items-center text-sm font-medium stroke-estela border-white text-estela hover:bg-button-hover hover:text-estela hover:border-estela rounded-md"
                                                    onClick={() => this.setState({ modalNewProject: true })}
                                                >
                                                    Start new project
                                                </Button>
                                                <Modal
                                                    open={modalNewProject}
                                                    title={<p className="text-center">CREATE NEW PROJECT</p>}
                                                    onCancel={() => this.setState({ modalNewProject: false })}
                                                    footer={null}
                                                >
                                                    <div className="mx-3">
                                                        <p className="py-3">Name</p>
                                                        <Input
                                                            style={{ borderRadius: "8px" }}
                                                            className="border-estela rounded"
                                                            name="newProjectName"
                                                            placeholder="Enter project name"
                                                            value={newProjectName}
                                                            onChange={this.handleInputChange}
                                                        />
                                                        <p className="py-3">Category (optional)</p>
                                                        <Select
                                                            className="w-full"
                                                            defaultValue={ProjectCategoryEnum.NotEspecified}
                                                            onChange={this.handleSelectChange}
                                                        >
                                                            <Option
                                                                key={1}
                                                                className="hover:bg-button-hover hover:text-estela"
                                                                value={ProjectCategoryEnum.NotEspecified}
                                                            >
                                                                Not Especified
                                                            </Option>
                                                            <Option
                                                                key={2}
                                                                className="hover:bg-button-hover hover:text-estela"
                                                                value={ProjectCategoryEnum.ECommerce}
                                                            >
                                                                E-commerce
                                                            </Option>
                                                            <Option
                                                                key={3}
                                                                className="hover:bg-button-hover hover:text-estela"
                                                                value={ProjectCategoryEnum.Logistics}
                                                            >
                                                                Logistics
                                                            </Option>
                                                            <Option
                                                                key={4}
                                                                className="hover:bg-button-hover hover:text-estela"
                                                                value={ProjectCategoryEnum.Finance}
                                                            >
                                                                Finance
                                                            </Option>
                                                            <Option
                                                                key={5}
                                                                className="hover:bg-button-hover hover:text-estela"
                                                                value={ProjectCategoryEnum.Educational}
                                                            >
                                                                Educational
                                                            </Option>
                                                            <Option
                                                                key={6}
                                                                className="hover:bg-button-hover hover:text-estela"
                                                                value={ProjectCategoryEnum.Technology}
                                                            >
                                                                Technology
                                                            </Option>
                                                            <Option
                                                                key={7}
                                                                className="hover:bg-button-hover hover:text-estela"
                                                                value={ProjectCategoryEnum.OtherCategory}
                                                            >
                                                                Other category
                                                            </Option>
                                                        </Select>
                                                        <p className="my-3 text-gray-500">
                                                            Your project will be created with a data persistence of
                                                            <span className="text-gray-700 font-bold"> 1 week </span>
                                                            you want to change it, enter here.
                                                        </p>
                                                        <Row className="mt-6 w-full grid grid-cols-2" justify="center">
                                                            <Button
                                                                size="large"
                                                                className="mr-2 sm:mr-1 bg-estela text-white border-estela hover:text-estela hover:border-estela rounded"
                                                                onClick={() => {
                                                                    this.setState({ modalNewProject: false });
                                                                    this.projectManagment({
                                                                        name: newProjectName,
                                                                        category: newProjectCategory,
                                                                    });
                                                                }}
                                                            >
                                                                Create
                                                            </Button>
                                                            <Button
                                                                size="large"
                                                                className="ml-2 sm:ml-1 border-estela hover:border-estela text-estela hover:text-estela"
                                                                onClick={() =>
                                                                    this.setState({ modalNewProject: false })
                                                                }
                                                            >
                                                                Cancel
                                                            </Button>
                                                        </Row>
                                                    </div>
                                                </Modal>
                                            </Col>
                                        </Row>
                                        <Row>
                                            <Table
                                                showHeader={false}
                                                tableLayout="fixed"
                                                className="rounded-2xl"
                                                columns={this.columns}
                                                dataSource={projects}
                                                pagination={false}
                                                size="middle"
                                            />
                                        </Row>
                                        {this.totalProjects === 0 && (
                                            <Row className="flex">
                                                <Col>
                                                    <Bug className="m-4 w-10 h-10" />
                                                </Col>
                                                <Col>
                                                    <p className="font-bold">Get started</p>
                                                    <Col>
                                                        <Row className="text-gray-400">
                                                            Lorem ipsum, dolor sit amet consectetur adipisicing elit.
                                                            Itaque aliquam reiciendis ea expedita.
                                                        </Row>
                                                    </Col>
                                                </Col>
                                            </Row>
                                        )}
                                    </div>
                                </Space>
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
