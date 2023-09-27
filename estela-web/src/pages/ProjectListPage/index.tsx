import React, { Component, Fragment, ReactElement } from "react";
import { Link } from "react-router-dom";
import { Button, Layout, Pagination, Space, Typography, Row, Col, Tag, Table, Modal, Input, Select } from "antd";

import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import Add from "../../assets/icons/add.svg";
import Bug from "../../assets/icons/bug.svg";
import FolderDotted from "../../assets/icons/folderDotted.svg";
import WelcomeProjects from "../../assets/images/welcomeProjects.svg";
import history from "../../history";
import {
    ApiProjectsCreateRequest,
    ApiProjectsSearchRequest,
    Project,
    ProjectSearch,
    ProjectCategoryEnum,
} from "../../services/api";
import { incorrectDataNotification, Spin, PaginationItem } from "../../shared";
import { UserContext, UserContextProps } from "../../context/UserContext";

const { Content } = Layout;
const { Option } = Select;
const { Text, Paragraph } = Typography;

interface ProjectList {
    name: string;
    category?: string;
    pid: string | undefined;
    role: string;
    framework: string | undefined;
    key: number;
}

interface ProjectsPageState {
    projects: ProjectList[];
    recentProjects: ProjectList[];
    recentProjectsLoaded: boolean;
    username: string;
    loaded: boolean;
    loadedProjects: boolean;
    count: number;
    current: number;
    query: string;
    modalNewProject: boolean;
    modalWelcome: boolean;
    newProjectName: string;
    newProjectCategory: ProjectCategoryEnum;
}

export class ProjectListPage extends Component<unknown, ProjectsPageState> {
    PAGE_SIZE = 3;
    totalProjects = 0;

    state: ProjectsPageState = {
        projects: [],
        recentProjects: [],
        recentProjectsLoaded: false,
        username: "",
        loaded: false,
        loadedProjects: false,
        count: 0,
        current: 0,
        query: "",
        modalNewProject: false,
        modalWelcome: true,
        newProjectName: "",
        newProjectCategory: ProjectCategoryEnum.NotSpecified,
    };

    apiService = ApiService();
    static contextType = UserContext;

    columns = [
        {
            title: "NAME",
            dataIndex: "name",
            key: "name",
            render: (name: string, project: ProjectList): ReactElement => (
                <Link
                    className="text-sm font-medium hover:text-estela"
                    to={`/projects/${project.pid}/dashboard`}
                    onClick={() => {
                        this.setUserRole(project.role);
                        AuthService.setFramework(String(project.framework));
                    }}
                >
                    {name}
                </Link>
            ),
        },
        {
            title: "PID",
            dataIndex: "pid",
            key: "pid",
            render: (pid: string): ReactElement => <p className="font-courier">{pid}</p>,
        },
        {
            title: "FRAMEWORK",
            dataIndex: "framework",
            key: "framework",
            render: (framework: string): ReactElement => (
                <Tag className="border-estela-blue-full rounded-md text-estela-blue-full p-1">{framework}</Tag>
            ),
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
        <Content className="flex flex-col items-center justify-center text-estela-black-medium">
            <FolderDotted className="w-20 h-20" />
            <p>No projects</p>
        </Content>
    );

    async componentDidMount(): Promise<void> {
        const { updateRole } = this.context as UserContextProps;
        updateRole && updateRole("");
        AuthService.removeFramework();
        this.updateFilteredProjects(this.state.query, 1);
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

    projectManagement = (data: { name: string; category: ProjectCategoryEnum }): void => {
        const request: ApiProjectsCreateRequest = { data };
        this.apiService.apiProjectsCreate(request).then(
            (response: Project) => {
                const { updateRole } = this.context as UserContextProps;
                if (response.users && response.users.length > 0) {
                    updateRole && updateRole(response.users[0].permission ?? "");
                }
                history.push(`/projects/${response.pid}/deploys`);
                AuthService.setFramework(String(response.framework));
            },
            (error: unknown) => {
                error;
                incorrectDataNotification();
            },
        );
    };

    setUserRole = (role: string): void => {
        AuthService.setUserRole(role);
        const { updateRole } = this.context as UserContextProps;
        updateRole && updateRole(role);
    };

    getUser = (): string => {
        return String(AuthService.getUserUsername());
    };

    formatProjectData = (response: Project[]): void => {
        const projectData: ProjectList[] = response.map((project: Project, id: number) => {
            return {
                name: project.name,
                pid: project.pid,
                framework: project.framework,
                role:
                    project.users?.find((user) => user.user?.username === AuthService.getUserUsername())?.permission ||
                    "ADMIN",
                key: id,
            };
        });
        if (!this.state.recentProjectsLoaded) {
            this.setState({
                recentProjects: [...projectData],
                recentProjectsLoaded: true,
                modalWelcome: projectData.length === 0,
            });
        }
        this.setState({
            projects: [...projectData],
            loaded: true,
        });
    };

    updateFilteredProjects = async (query: string, page: number): Promise<void> => {
        const requestParams: ApiProjectsSearchRequest = { search: query, page: page, pageSize: this.PAGE_SIZE };
        this.apiService.apiProjectsSearch(requestParams).then((response: ProjectSearch) => {
            this.formatProjectData(response.results);
            this.setState({
                count: response.count,
                current: page,
                loadedProjects: true,
            });
        });
    };

    onPageChange = async (page: number): Promise<void> => {
        this.setState({ loadedProjects: false });
        this.updateFilteredProjects(this.state.query, page);
    };

    onQueryChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        this.setState({ loadedProjects: false });
        const {
            target: { value, name },
        } = event;
        if (name === "query") {
            this.updateFilteredProjects(value, 1);
        }
        this.setState({ query: value });
    };

    render(): JSX.Element {
        const {
            projects,
            recentProjects,
            count,
            current,
            loaded,
            loadedProjects,
            modalNewProject,
            modalWelcome,
            newProjectName,
            newProjectCategory,
            query,
        } = this.state;
        return (
            <>
                {loaded ? (
                    <Fragment>
                        <Content className="mx-auto w-full lg:px-10">
                            <Modal
                                open={modalWelcome}
                                footer={false}
                                width={880}
                                onCancel={() => {
                                    this.setState({ modalWelcome: false });
                                }}
                            >
                                <Row className="py-8 px-4" align="middle">
                                    <Col span={14}>
                                        <Text className="text-estela font-bold text-4xl mx-3">WELCOME SCRAPER!</Text>
                                        <Paragraph className="text-xl mt-6 mx-3">
                                            Start by creating a <Text strong>project</Text> to be able to deploy your
                                            spiders and start with your scraping.
                                        </Paragraph>
                                        <Paragraph className="text-lg font-bold mx-3">
                                            Remember to install the&nbsp;
                                            <a
                                                target="_blank"
                                                href="https://estela-cli.bitmaker.la/installation/"
                                                rel="noreferrer"
                                            >
                                                <Text className="text-estela underline">estela CLI</Text>
                                            </a>
                                            &nbsp;to be able to deploy your spiders!
                                        </Paragraph>
                                        <Button
                                            className="my-2 w-96 text-lg h-14 mx-3 rounded-md bg-estela text-white hover:border-estela hover:text-estela"
                                            onClick={() => {
                                                this.setState({ modalWelcome: false, modalNewProject: true });
                                            }}
                                        >
                                            Start new project
                                        </Button>
                                    </Col>
                                    <Col span={10} className="flex justify-center">
                                        <WelcomeProjects className="w-72 h-72" />
                                    </Col>
                                </Row>
                            </Modal>
                            <Space direction="vertical" className="w-full">
                                <Content className="float-left">
                                    <Text className="text-3xl">
                                        Welcome home&nbsp;
                                        <span className="text-estela">{this.getUser()}</span>!
                                    </Text>
                                </Content>
                                <Content className="bg-white rounded-md p-6 mx-4">
                                    <Row className="flow-root items-center">
                                        <Col className="float-left">
                                            <Text className="text-silver text-base font-medium">RECENT PROJECTS</Text>
                                        </Col>
                                    </Row>
                                    <Row className="flex-row gap-3 mt-4">
                                        {recentProjects.map((project: ProjectList, index) => {
                                            return index < 4 ? (
                                                <Button
                                                    key={project.key}
                                                    onClick={() => {
                                                        const { updateRole } = this.context as UserContextProps;
                                                        AuthService.setUserRole(project.role);
                                                        AuthService.setFramework(String(project.framework));
                                                        updateRole && updateRole(project.role);
                                                        history.push(`/projects/${project.pid}/dashboard`);
                                                    }}
                                                    className="bg-white rounded-md w-fit h-fit px-4 py-3 hover:border-none border-none hover:bg-estela-blue-low hover:text-estela-blue-full"
                                                >
                                                    <Row className="gap-4">
                                                        <Text className="text-sm font-bold">{project.name}</Text>
                                                        {(index === 0 || index === 1) && (
                                                            <Tag className="text-estela bg-estela-blue-low border-none font-medium rounded-md">
                                                                New
                                                            </Tag>
                                                        )}
                                                    </Row>
                                                    <Row className="rounded-md my-3">
                                                        <Text className="text-xs font-courier">{project.pid}</Text>
                                                    </Row>
                                                    <Row className="w-full justify-between">
                                                        <Tag className="bg-white border-white rounded-md">
                                                            {project.role}
                                                        </Tag>
                                                        <Tag className="border-estela-blue-full text-estela-blue-full rounded-md">
                                                            {project.framework}
                                                        </Tag>
                                                    </Row>
                                                </Button>
                                            ) : (
                                                <Content key={project.key}></Content>
                                            );
                                        })}
                                    </Row>
                                </Content>
                                <Content className="bg-white rounded-md p-6 mx-4">
                                    <Row className="py-2">
                                        <p className="text-silver text-base font-medium">MY PROJECTS</p>
                                    </Row>
                                    <Row className="grid grid-cols-4 my-2">
                                        <Col className="col-span-3 w-full">
                                            <Input
                                                className="rounded-lg border-black-low w-full"
                                                name="query"
                                                value={query}
                                                onChange={this.onQueryChange}
                                                placeholder="Find a project..."
                                            />
                                        </Col>
                                        <Col className="grid justify-end mr-4">
                                            <Button
                                                icon={<Add className="mr-2" width={15} />}
                                                className="flex items-center text-sm font-medium stroke-estela border-white text-estela hover:bg-button-hover hover:text-estela hover:border-estela rounded-md"
                                                onClick={() => this.setState({ modalNewProject: true })}
                                            >
                                                Start new project
                                            </Button>
                                            <Modal
                                                width={500}
                                                open={modalNewProject}
                                                title={
                                                    <p className="text-xl text-center text-estela-black-medium font-normal">
                                                        CREATE NEW PROJECT
                                                    </p>
                                                }
                                                onCancel={() => this.setState({ modalNewProject: false })}
                                                footer={null}
                                            >
                                                <Content className="mx-2">
                                                    <p className="mb-3 text-base">Name</p>
                                                    <Input
                                                        style={{ borderRadius: "8px" }}
                                                        className="border-estela rounded"
                                                        size="large"
                                                        name="newProjectName"
                                                        placeholder="Enter project name"
                                                        value={newProjectName}
                                                        onChange={this.handleInputChange}
                                                    />
                                                    <p className="mt-4 mb-3 text-base">Category (optional)</p>
                                                    <Select
                                                        className="w-full"
                                                        size="large"
                                                        defaultValue={ProjectCategoryEnum.NotSpecified}
                                                        onChange={this.handleSelectChange}
                                                    >
                                                        <Option
                                                            key={1}
                                                            className="hover:bg-button-hover hover:text-estela"
                                                            value={ProjectCategoryEnum.NotSpecified}
                                                        >
                                                            Not Specified
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
                                                    <p className="my-4 text-estela-black-medium">
                                                        Your project will be created with a data persistence of
                                                        <span className="text-estela-black-full font-bold">
                                                            {" "}
                                                            1 week{" "}
                                                        </span>
                                                        you want to change it, enter here.
                                                    </p>
                                                    <Row className="mt-6 grid grid-cols-2 gap-2" justify="center">
                                                        <Button
                                                            size="large"
                                                            className="bg-estela text-white border-estela hover:text-estela hover:border-estela rounded"
                                                            onClick={() => {
                                                                this.setState({ modalNewProject: false });
                                                                this.projectManagement({
                                                                    name: newProjectName,
                                                                    category: newProjectCategory,
                                                                });
                                                            }}
                                                        >
                                                            Create
                                                        </Button>
                                                        <Button
                                                            size="large"
                                                            className="border-estela hover:border-estela hover:bg-estela-blue-low text-estela hover:text-estela rounded"
                                                            onClick={() => this.setState({ modalNewProject: false })}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </Row>
                                                </Content>
                                            </Modal>
                                        </Col>
                                    </Row>
                                    {loadedProjects ? (
                                        <Row className="flex flex-col w-full">
                                            <Table
                                                showHeader={false}
                                                className="rounded-2xl"
                                                columns={this.columns}
                                                dataSource={projects}
                                                pagination={false}
                                                size="middle"
                                                locale={{ emptyText: this.emptyText }}
                                            />
                                            <Pagination
                                                className="pagination"
                                                defaultCurrent={1}
                                                total={count}
                                                current={current}
                                                pageSize={this.PAGE_SIZE}
                                                onChange={this.onPageChange}
                                                showSizeChanger={false}
                                                itemRender={PaginationItem}
                                            />
                                        </Row>
                                    ) : (
                                        <Spin />
                                    )}
                                    {this.totalProjects === 0 && (
                                        <Row className="flex my-4">
                                            <Col>
                                                <Bug className="m-4 w-10 h-10 stroke-black" />
                                            </Col>
                                            <Col className="my-auto ml-4">
                                                <Text className="font-bold text-lg text-estela-black-full">
                                                    Get started
                                                </Text>
                                                <br />
                                                <Text className="text-sm text-estela-black-medium">
                                                    Create a new project to begin the experience
                                                </Text>
                                            </Col>
                                        </Row>
                                    )}
                                </Content>
                            </Space>
                        </Content>
                    </Fragment>
                ) : (
                    <Spin />
                )}
            </>
        );
    }
}
