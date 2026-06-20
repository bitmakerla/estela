import React, { Component, Fragment, ReactElement } from "react";
import { Link } from "react-router-dom";
import {
    Button,
    Layout,
    Pagination,
    Space,
    Typography,
    Row,
    Col,
    Tag,
    Table,
    Modal,
    Input,
    Select,
    Dropdown,
    Menu,
    message,
} from "antd";
import { SettingOutlined, EditOutlined, TagsOutlined, TeamOutlined, DeleteOutlined } from "@ant-design/icons";

import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import Add from "../../assets/icons/add.svg";
import Bug from "../../assets/icons/bug.svg";
import Copy from "../../assets/icons/copy.svg";
import FolderDotted from "../../assets/icons/folderDotted.svg";
import WelcomeProjects from "../../assets/images/welcomeProjects.svg";
import history from "../../history";
import {
    ApiProjectsListRequest,
    ApiProjectsCreateRequest,
    ApiProjectsDeleteRequest,
    Project,
    ProjectCategoryEnum,
} from "../../services/api";
import { incorrectDataNotification, Spin, PaginationItem } from "../../shared";
import { UserContext, UserContextProps } from "../../context/UserContext";

const { Content } = Layout;
const { Option } = Select;
const { Text, Paragraph } = Typography;

type SortOrder = "asc" | "desc" | null;
type SortField = "name" | "framework" | "category" | "created" | "lastModified" | "role" | null;

interface ProjectList {
    name: string;
    category?: string;
    pid: string | undefined;
    role: string;
    framework: string | undefined;
    created?: string;
    lastModified?: string;
    key: number;
}

interface ProjectsPageState {
    projects: ProjectList[];
    username: string;
    loaded: boolean;
    count: number;
    current: number;
    modalNewProject: boolean;
    modalWelcome: boolean;
    newProjectName: string;
    newProjectCategory: ProjectCategoryEnum;
    searchText: string;
    sortField: SortField;
    sortOrder: SortOrder;
    deleteModal: boolean;
    deleteTargetPid: string | undefined;
    deleteTargetName: string;
    deleteConfirmText: string;
    copiedPid: string | undefined;
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
        modalWelcome: false,
        newProjectName: "",
        newProjectCategory: ProjectCategoryEnum.NotSpecified,
        searchText: "",
        sortField: null,
        sortOrder: null,
        deleteModal: false,
        deleteTargetPid: undefined,
        deleteTargetName: "",
        deleteConfirmText: "",
        copiedPid: undefined,
    };

    apiService = ApiService();
    static contextType = UserContext;
    runSearch = async (search: string): Promise<void> => {
        const data = await this.getProjects(1, search);
        const projectData = data.data.map((project: Project, id: number) => ({
            name: project.name,
            pid: project.pid,
            framework: project.framework,
            category: project.category,
            created: project.created,
            lastModified: project.lastModified,
            role:
                project.users?.find((user) => user.user?.username === AuthService.getUserUsername())?.permission ||
                "ADMIN",
            key: id,
        }));
        this.setState({ projects: projectData, count: data.count, current: 1 });
    };

    formatDate = (date?: string): string => {
        if (!date) return "—";
        return new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    };

    handleSort = (field: SortField): void => {
        const { sortField, sortOrder } = this.state;
        if (sortField !== field) {
            this.setState({ sortField: field, sortOrder: "desc" });
        } else if (sortOrder === "desc") {
            this.setState({ sortOrder: "asc" });
        } else {
            this.setState({ sortField: null, sortOrder: null });
        }
    };

    getSortIcon = (field: SortField): string => {
        const { sortField, sortOrder } = this.state;
        if (sortField !== field) return "";
        return sortOrder === "asc" ? " ↑" : " ↓";
    };

    getSortedAndFilteredProjects = (): ProjectList[] => {
        const { projects, sortField, sortOrder } = this.state;

        if (!sortField || !sortOrder) return projects;

        return [...projects].sort((a, b) => {
            let valA: string | number = "";
            let valB: string | number = "";

            if (sortField === "name") {
                valA = a.name;
                valB = b.name;
            } else if (sortField === "framework") {
                valA = a.framework ?? "";
                valB = b.framework ?? "";
            } else if (sortField === "category") {
                valA = a.category ?? "";
                valB = b.category ?? "";
            } else if (sortField === "role") {
                valA = a.role;
                valB = b.role;
            } else if (sortField === "created") {
                valA = a.created ? new Date(a.created).getTime() : 0;
                valB = b.created ? new Date(b.created).getTime() : 0;
            } else if (sortField === "lastModified") {
                valA = a.lastModified
                    ? new Date(a.lastModified).getTime()
                    : a.created
                    ? new Date(a.created).getTime()
                    : 0;
                valB = b.lastModified
                    ? new Date(b.lastModified).getTime()
                    : b.created
                    ? new Date(b.created).getTime()
                    : 0;
            }

            if (valA < valB) return sortOrder === "asc" ? -1 : 1;
            if (valA > valB) return sortOrder === "asc" ? 1 : -1;
            return 0;
        });
    };

    confirmDelete = (pid: string | undefined, name: string): void => {
        this.setState({ deleteModal: true, deleteTargetPid: pid, deleteTargetName: name, deleteConfirmText: "" });
    };

    deleteProject = (): void => {
        const { deleteTargetPid } = this.state;
        if (!deleteTargetPid) return;
        const request: ApiProjectsDeleteRequest = { pid: deleteTargetPid };
        this.apiService.apiProjectsDelete(request).then(
            () => {
                this.setState({
                    deleteModal: false,
                    deleteTargetPid: undefined,
                    deleteTargetName: "",
                    deleteConfirmText: "",
                });
                this.onPageChange(1);
            },
            () => incorrectDataNotification(),
        );
    };

    getActionMenu = (project: ProjectList): ReactElement => (
        <Menu>
            <Menu.Item
                key="edit"
                icon={<EditOutlined />}
                onClick={() => history.push(`/projects/${project.pid}/settings`)}
            >
                Edit project
            </Menu.Item>
            <Menu.Item
                key="tags"
                icon={<TagsOutlined />}
                onClick={() => history.push(`/projects/${project.pid}/settings`)}
            >
                Manage tags
            </Menu.Item>
            <Menu.Item
                key="members"
                icon={<TeamOutlined />}
                onClick={() => history.push(`/projects/${project.pid}/members`)}
            >
                Team permissions
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item
                key="delete"
                icon={<DeleteOutlined />}
                danger
                onClick={() => this.confirmDelete(project.pid, project.name)}
            >
                Delete project
            </Menu.Item>
        </Menu>
    );

    getColumns = () => [
        {
            title: (
                <span className="cursor-pointer select-none" onClick={() => this.handleSort("name")}>
                    NAME{this.getSortIcon("name")}
                </span>
            ),
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
            render: (pid: string): ReactElement => {
                const copied = this.state.copiedPid === pid;
                return (
                    <span className="flex items-center gap-1">
                        <span className="font-courier text-sm">{pid ? `${pid.slice(0, 8)}...` : ""}</span>
                        <Button
                            type="text"
                            size="small"
                            icon={<Copy className="w-4 h-4" style={{ stroke: copied ? "#059669" : "#9CA3AF" }} />}
                            className={`p-0 border-none transition-colors ${
                                copied ? "bg-green-50" : "hover:bg-button-hover"
                            }`}
                            onClick={() => {
                                navigator.clipboard.writeText(pid);
                                message.success("PID copied to clipboard");
                                this.setState({ copiedPid: pid });
                                setTimeout(() => this.setState({ copiedPid: undefined }), 1500);
                            }}
                        />
                    </span>
                );
            },
        },
        {
            title: (
                <span className="cursor-pointer select-none" onClick={() => this.handleSort("framework")}>
                    FRAMEWORK{this.getSortIcon("framework")}
                </span>
            ),
            dataIndex: "framework",
            key: "framework",
            render: (framework: string): ReactElement => (
                <Tag className="border-estela-blue-full rounded-md text-estela-blue-full p-1">{framework}</Tag>
            ),
        },
        {
            title: (
                <span className="cursor-pointer select-none" onClick={() => this.handleSort("category")}>
                    INDUSTRY{this.getSortIcon("category")}
                </span>
            ),
            dataIndex: "category",
            key: "category",
            render: (category: string): ReactElement => (
                <Tag className="border-estela-blue-full rounded-md text-estela-blue-full p-1">{category ?? "—"}</Tag>
            ),
        },
        {
            title: (
                <span className="cursor-pointer select-none" onClick={() => this.handleSort("created")}>
                    CREATED{this.getSortIcon("created")}
                </span>
            ),
            dataIndex: "created",
            key: "created",
            render: (created: string): ReactElement => <span>{this.formatDate(created)}</span>,
        },
        {
            title: (
                <span className="cursor-pointer select-none" onClick={() => this.handleSort("lastModified")}>
                    LAST MODIFIED{this.getSortIcon("lastModified")}
                </span>
            ),
            dataIndex: "lastModified",
            key: "lastModified",
            render: (lastModified: string): ReactElement => <span>{this.formatDate(lastModified)}</span>,
        },
        {
            title: (
                <span className="cursor-pointer select-none" onClick={() => this.handleSort("role")}>
                    ROLE{this.getSortIcon("role")}
                </span>
            ),
            dataIndex: "role",
            key: "role",
            render: (role: string, project: ProjectList): ReactElement => {
                const roleStyles: Record<string, React.CSSProperties> = {
                    OWNER: { background: "#EDE9FE", color: "#5B21B6" },
                    ADMIN: { background: "#FEF3C7", color: "#B45309" },
                    DEVELOPER: { background: "#D1FAE5", color: "#065F46" },
                    VIEWER: { background: "#F3F4F6", color: "#374151" },
                };
                const style = roleStyles[role] ?? roleStyles["VIEWER"];
                return (
                    <span
                        key={project.key}
                        style={{
                            ...style,
                            borderRadius: "9999px",
                            padding: "4px 12px",
                            fontWeight: 600,
                            fontSize: "0.75rem",
                        }}
                    >
                        {role}
                    </span>
                );
            },
        },
        {
            title: "",
            key: "actions",
            render: (_: unknown, project: ProjectList): ReactElement => (
                <Dropdown overlay={this.getActionMenu(project)} trigger={["click"]} placement="bottomRight">
                    <Button
                        type="text"
                        icon={<SettingOutlined />}
                        className="text-estela-black-medium hover:text-estela hover:bg-button-hover"
                        onClick={(e) => e.stopPropagation()}
                    />
                </Dropdown>
            ),
        },
    ];

    emptyText = (): ReactElement => (
        <Content className="flex flex-col items-center justify-center text-estela-black-medium">
            <FolderDotted className="w-20 h-20" />
            <p>No projects yet.</p>
        </Content>
    );

    async componentDidMount(): Promise<void> {
        const { updateRole } = this.context as UserContextProps;
        updateRole && updateRole("");
        AuthService.removeFramework();
        const data = await this.getProjects(1);
        const projectData: ProjectList[] = data.data.map((project: Project, id: number) => {
            return {
                name: project.name,
                category: project.category,
                framework: project.framework,
                pid: project.pid,
                created: project.created,
                lastModified: project.lastModified,
                role:
                    project.users?.find((user) => user.user?.username === AuthService.getUserUsername())?.permission ||
                    "ADMIN",
                key: id,
            };
        });
        this.setState({
            projects: [...projectData],
            count: data.count,
            current: data.current,
            loaded: true,
            modalWelcome: data.count === 0,
        });
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

    async getProjects(page: number, search?: string): Promise<{ data: Project[]; count: number; current: number }> {
        const requestParams: ApiProjectsListRequest = { page, pageSize: this.PAGE_SIZE, search };
        const data = await this.apiService.apiProjectsList(requestParams);
        this.totalProjects = data.count;
        return { data: data.results, count: data.count, current: page };
    }

    onPageChange = async (page: number): Promise<void> => {
        this.setState({ loaded: false });
        const data = await this.getProjects(page, this.state.searchText);
        const projectData: ProjectList[] = data.data.map((project: Project, id: number) => {
            return {
                name: project.name,
                pid: project.pid,
                framework: project.framework,
                category: project.category,
                created: project.created,
                lastModified: project.lastModified,
                role:
                    project.users?.find((user) => user.user?.username === AuthService.getUserUsername())?.permission ||
                    "ADMIN",
                key: id,
            };
        });
        this.setState({
            projects: [...projectData],
            count: data.count,
            current: data.current,
            loaded: true,
            modalWelcome: data.count === 0,
        });
    };

    render(): JSX.Element {
        const {
            count,
            current,
            loaded,
            modalNewProject,
            modalWelcome,
            newProjectName,
            newProjectCategory,
            searchText,
            deleteModal,
            deleteTargetName,
            deleteConfirmText,
        } = this.state;

        const displayProjects = this.getSortedAndFilteredProjects();

        return (
            <>
                {loaded ? (
                    <Fragment>
                        <Content className="mx-auto w-full lg:px-10">
                            <Modal
                                open={modalWelcome}
                                footer={false}
                                width={990}
                                onCancel={() => {
                                    this.setState({ modalWelcome: false });
                                }}
                            >
                                <Row className="py-8 px-4" align="middle">
                                    <Col span={16}>
                                        <Text className="text-estela font-bold text-4xl">WELCOME SCRAPER!</Text>
                                        <Paragraph className="text-xl mt-6">
                                            Start by creating a <Text strong>project</Text> to be able to deploy your
                                            spiders and start with your scraping.
                                        </Paragraph>
                                        <Paragraph className="text-lg font-bold">
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
                                            className="mt-6 w-96 h-14 rounded-md bg-estela text-white hover:border-estela hover:text-estela"
                                            onClick={() => {
                                                this.setState({ modalWelcome: false, modalNewProject: true });
                                            }}
                                        >
                                            Start new project
                                        </Button>
                                    </Col>
                                    <Col span={8}>
                                        <WelcomeProjects className="w-72 h-72" />
                                    </Col>
                                </Row>
                            </Modal>
                            <Modal
                                open={deleteModal}
                                title="Delete project"
                                onCancel={() => this.setState({ deleteModal: false, deleteConfirmText: "" })}
                                footer={[
                                    <Button
                                        key="cancel"
                                        onClick={() => this.setState({ deleteModal: false, deleteConfirmText: "" })}
                                    >
                                        Cancel
                                    </Button>,
                                    <Button
                                        key="delete"
                                        danger
                                        type="primary"
                                        disabled={deleteConfirmText !== deleteTargetName}
                                        onClick={this.deleteProject}
                                    >
                                        Delete
                                    </Button>,
                                ]}
                            >
                                <p className="mb-3">
                                    This action <strong>cannot be undone</strong>. Type{" "}
                                    <strong className="text-red-500">{deleteTargetName}</strong> to confirm.
                                </p>
                                <Input
                                    placeholder={deleteTargetName}
                                    value={deleteConfirmText}
                                    onChange={(e) => this.setState({ deleteConfirmText: e.target.value })}
                                    onPressEnter={() => {
                                        if (deleteConfirmText === deleteTargetName) this.deleteProject();
                                    }}
                                />
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
                                        {[...this.state.projects]
                                            .sort((a, b) => {
                                                const ta = a.lastModified
                                                    ? new Date(a.lastModified).getTime()
                                                    : a.created
                                                    ? new Date(a.created).getTime()
                                                    : 0;
                                                const tb = b.lastModified
                                                    ? new Date(b.lastModified).getTime()
                                                    : b.created
                                                    ? new Date(b.created).getTime()
                                                    : 0;
                                                return tb - ta;
                                            })
                                            .slice(0, 5)
                                            .map((project: ProjectList) => (
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
                                                    </Row>
                                                    <Row className="rounded-md my-3">
                                                        <Text className="text-xs font-courier">{project.pid}</Text>
                                                    </Row>
                                                    <Row className="w-full justify-between gap-2">
                                                        <Tag className="bg-white border-white rounded-md">
                                                            {project.role}
                                                        </Tag>
                                                        {project.category && (
                                                            <Tag className="border-estela-blue-full text-estela-blue-full rounded-md">
                                                                {project.category}
                                                            </Tag>
                                                        )}
                                                    </Row>
                                                </Button>
                                            ))}
                                    </Row>
                                </Content>
                                <Content className="bg-white rounded-md p-6 mx-4">
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
                                    <Row className="mb-4">
                                        <Input.Search
                                            placeholder="Search by name"
                                            value={searchText}
                                            onChange={(e) => this.setState({ searchText: e.target.value })}
                                            onSearch={this.runSearch}
                                            className="border-estela-blue-low rounded-md"
                                            style={{ maxWidth: 400 }}
                                        />
                                    </Row>
                                    <Row className="flex flex-col w-full">
                                        <Table
                                            showHeader={true}
                                            className="rounded-2xl"
                                            columns={this.getColumns()}
                                            dataSource={displayProjects}
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
