import React, { useState, useEffect } from "react";
import { Modal, Button, message, Row, Select, Space, Input, Tag, Checkbox, Tooltip } from "antd";
import type { CheckboxChangeEvent } from "antd/es/checkbox";
import {
    ApiProjectsSpidersJobsCreateRequest,
    ApiProjectsSpidersListRequest,
    ApiProjectsSpidersReadRequest,
    ApiProjectsReadRequest,
    SpiderDataStatusEnum,
    SpiderJobCreate,
    SpiderJobEnvVar,
    Project,
    Spider,
} from "../../services/api";
import { getFilteredEnvVars } from "../../utils";
import history from "../../history";
import { ApiService } from "../../services";
import { ProxySettings } from "../../components/ProxySettingsPage";
import { resourceNotAllowedNotification, invalidDataNotification, incorrectDataNotification } from "../../shared";
import { checkExternalError } from "../../defaultComponents";

import Run from "../../assets/icons/play.svg";
import Add from "../../assets/icons/add.svg";

const { Option } = Select;

interface JobCreateModalProps {
    openModal: boolean;
    spider: Spider | null;
    projectId: string;
    initialArgs?: ArgsData[];
    initialEnvVars?: SpiderJobEnvVar[];
    initialTags?: TagsData[];
    onClose?: () => void;
    hideRunButton?: boolean;
}

interface MaskedTagProps {
    children: React.ReactNode;
    id: number;
    level: boolean;
}

interface ArgsData {
    name: string;
    value: string;
    key: number;
}

interface EnvVarsData {
    name: string;
    value: string;
    key: number;
    masked: boolean;
}

interface TagsData {
    name: string;
}

interface Tags {
    name: string;
    key: number;
}

interface JobData {
    args: ArgsData[];
    envVars: EnvVarsData[];
    tags: TagsData[];
    dataStatus: SpiderDataStatusEnum | undefined;
    dataExpiryDays: number | null | undefined;
}

interface Variable {
    newArgName: string;
    newArgValue: string;
    newEnvVarName: string;
    newEnvVarValue: string;
    newEnvVarMasked: boolean;
    newTagName: string;
    newTags: Tags[];
}

interface Request {
    pid: string;
    sid: string;
}

interface OptionDataPersistance {
    label: string;
    key: number;
    value: number;
}

const dataPersistenceOptions = [
    { label: "1 day", key: 1, value: 1 },
    { label: "1 week", key: 2, value: 7 },
    { label: "1 month", key: 3, value: 30 },
    { label: "3 months", key: 4, value: 90 },
    { label: "6 months", key: 5, value: 180 },
    { label: "1 year", key: 6, value: 365 },
    { label: "Forever", key: 7, value: 720 },
];

export default function JobCreateModal({
    openModal,
    spider,
    projectId,
    initialArgs = [],
    initialEnvVars = [],
    initialTags = [],
    onClose,
    hideRunButton,
}: JobCreateModalProps) {
    const PAGE_SIZE = 15;
    const apiService = ApiService();
    const [open, setOpen] = useState(openModal);
    const [loading, setLoading] = useState(false);
    const [countKey, setCountKey] = useState(0);
    const [spiders, setSpiders] = useState<Spider[]>([]);
    const [isLoadingSpiders, setIsLoadingSpiders] = useState<boolean>(true);
    const [isLoadingMoreSpiders, setIsLoadingMoreSpiders] = useState<boolean>(false);
    const [hasMoreSpiders, setHasMoreSpiders] = useState<boolean>(true);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [externalComponent, setExternalComponent] = useState<React.ReactNode>(<></>);
    const [jobData, setJobData] = useState<JobData>({
        args: initialArgs.map((arg, index) => ({ ...arg, key: index })),
        envVars: initialEnvVars.map((envVar, index) => ({
            name: envVar.name,
            value: envVar.masked ? "__MASKED__" : envVar.value,
            masked: envVar.masked || false,
            key: index,
        })),
        tags: initialTags,
        dataStatus: spider ? spider.dataStatus : undefined,
        dataExpiryDays: spider ? spider.dataExpiryDays : 1,
    });
    const [noProxy, setNoProxy] = useState<boolean>(true);
    const [newProxyFormActivate, setNewProxyFormActivate] = useState<boolean>(false);
    const [projectEnvVars, setProjectEnvVars] = useState<SpiderJobEnvVar[]>([]);
    const [spiderEnvVars, setSpiderEnvVars] = useState<SpiderJobEnvVar[]>([]);
    const [jobProxy, setJobProxy] = useState<SpiderJobEnvVar[]>([]);
    const [variable, setVariable] = useState<Variable>({
        newArgName: "",
        newArgValue: "",
        newEnvVarName: "",
        newEnvVarValue: "",
        newEnvVarMasked: false,
        newTagName: "",
        newTags: [],
    });
    const [request, setRequest] = useState<Request>({
        pid: projectId,
        sid: "",
    });

    const MaskedTag: React.FC<MaskedTagProps> = ({ children, id, level }) => {
        return (
            <Tooltip placement="top" title="Masked variable" showArrow={false} className="tooltip">
                <Tag
                    closable
                    className="bg-estela-blue-low border-none text-estela-blue-full rounded"
                    onClose={() => handleRemoveProjectEnvVar(id, level)}
                >
                    {children}
                </Tag>
            </Tooltip>
        );
    };

    useEffect(() => {
        // If a spider is provided, use it as initial search term
        if (spider) {
            getProjectSpiders(1, false, spider.name);
        } else {
            getProjectSpiders(1);
        }

        const requestParams: ApiProjectsReadRequest = { pid: request.pid };
        apiService.apiProjectsRead(requestParams).then(
            (response: Project) => {
                const envVars = response.envVars || [];
                setProjectEnvVars(
                    envVars.map((envVar: SpiderJobEnvVar) => {
                        return {
                            evid: envVar.evid,
                            name: envVar.name,
                            value: envVar.masked ? "__MASKED__" : envVar.value,
                            masked: envVar.masked,
                        };
                    }),
                );
            },
            (error: unknown) => {
                error;
                resourceNotAllowedNotification();
            },
        );
    }, []);

    const getSpiderEnvVars = (sid: number) => {
        const requestParams: ApiProjectsSpidersReadRequest = { pid: request.pid, sid: sid };
        apiService.apiProjectsSpidersRead(requestParams).then(
            async (response: Spider) => {
                const envVars = response.envVars || [];
                setSpiderEnvVars(
                    envVars.map((envVar: SpiderJobEnvVar) => {
                        return {
                            evid: envVar.evid,
                            name: envVar.name,
                            value: envVar.masked ? "__MASKED__" : envVar.value,
                            masked: envVar.masked,
                        };
                    }),
                );
                // setProxyName(
                //     envVars.find((envVar: SpiderJobEnvVar) => envVar.name === "ESTELA_PROXY_NAME")?.value || "",
                // );
            },
            (error: unknown) => {
                error;
                resourceNotAllowedNotification();
            },
        );
    };

    const getProjectSpiders = async (page: number, isLoadMore = false, search?: string): Promise<void> => {
        if (isLoadMore) {
            setIsLoadingMoreSpiders(true);
        } else {
            setIsLoadingSpiders(true);
        }

        // Type assertion needed since search is a custom parameter
        const requestParams = {
            pid: projectId,
            page,
            pageSize: PAGE_SIZE,
            search,
        } as ApiProjectsSpidersListRequest;

        console.log("Searching spiders with params:", requestParams);

        try {
            const results = await apiService.apiProjectsSpidersList(requestParams);
            console.log("Search results:", results);
            const spiderList = results.results;
            setHasMoreSpiders(spiderList.length === PAGE_SIZE);

            if (spiderList.length === 0) {
                setIsLoadingSpiders(false);
                setIsLoadingMoreSpiders(false);
                return;
            }

            // Always select the first spider from the results
            if (spiderList.length > 0 && page === 1) {
                // If we have a specific spider and it's in the results, select it
                let selectedIndex = 0;

                if (spider) {
                    const index = spiderList.findIndex((s) => s.sid === spider.sid);
                    if (index >= 0) {
                        selectedIndex = index;
                    }
                }

                setRequest({ ...request, sid: String(spiderList[selectedIndex].sid) });
                const envVars = spiderList[selectedIndex].envVars || [];
                setSpiderEnvVars(
                    envVars.map((envVar: SpiderJobEnvVar) => ({
                        evid: envVar.evid,
                        name: envVar.name,
                        value: envVar.masked ? "__MASKED__" : envVar.value,
                        masked: envVar.masked,
                    })),
                );
                setJobData({
                    ...jobData,
                    dataStatus: spiderList[selectedIndex].dataStatus,
                    dataExpiryDays: spiderList[selectedIndex].dataExpiryDays,
                });
            }

            setSpiders((prev) => (isLoadMore ? [...prev, ...spiderList] : spiderList));
            setCurrentPage(page);
        } catch (error) {
            console.log(error);
            resourceNotAllowedNotification();
        } finally {
            setIsLoadingSpiders(false);
            setIsLoadingMoreSpiders(false);
        }
    };

    const loadMoreSpiders = (): void => {
        if (!isLoadingMoreSpiders && hasMoreSpiders) {
            getProjectSpiders(currentPage + 1, true);
        }
    };

    const handleSpiderChange = (value: string): void => {
        const spiderId = spiders.find((spider) => {
            return spider.name === value;
        });
        if (spiderId) {
            getSpiderEnvVars(Number(spiderId.sid));
        }
        setRequest({ ...request, sid: String(spiderId?.sid) });
    };

    const handleSpiderSearch = (value: string): void => {
        if (value.trim() !== "") {
            setSpiders([]);
            setCurrentPage(1);
            getProjectSpiders(1, false, value);
        }
    };

    const handlePersistenceChange = (value: number): void => {
        if (value == 720) {
            setJobData({ ...jobData, dataStatus: SpiderDataStatusEnum.Persistent });
        } else {
            setJobData({ ...jobData, dataExpiryDays: value });
        }
    };

    const handleRemoveArg = (id: number): void => {
        const args = [...jobData.args];
        args.splice(id, 1);
        setJobData({ ...jobData, args: [...args] });
    };

    const handleRemoveEnvVar = (id: number): void => {
        const envVars = [...jobData.envVars];
        envVars.splice(id, 1);
        setJobData({ ...jobData, envVars: [...envVars] });
    };

    const handleRemoveProjectEnvVar = (id: number, level: boolean): void => {
        if (level) {
            const envVars = [...projectEnvVars];
            envVars.splice(id, 1);
            setProjectEnvVars(envVars);
        } else {
            const envVars = [...spiderEnvVars];
            envVars.splice(id, 1);
            setSpiderEnvVars(envVars);
        }
    };

    const handleRemoveTag = (id: number): void => {
        const tags = [...jobData.tags];
        tags.splice(id, 1);
        setJobData({ ...jobData, tags: [...tags] });
    };

    const addArgument = (): void => {
        const args = [...jobData.args];
        const newArgName = variable.newArgName.trim();
        const newArgValue = variable.newArgValue.trim();
        if (newArgName && newArgValue && newArgName.indexOf(" ") == -1) {
            args.push({ name: newArgName, value: newArgValue, key: countKey });
            setCountKey(countKey + 1);
            setJobData({ ...jobData, args: [...args] });
            setVariable({ ...variable, newArgName: "", newArgValue: "" });
        } else {
            invalidDataNotification("Invalid argument name/value pair.");
        }
    };

    const addEnvVar = (): void => {
        const envVars = [...jobData.envVars];
        const newEnvVarName = variable.newEnvVarName.trim();
        const newEnvVarValue = variable.newEnvVarValue.trim();
        if (newEnvVarName && newEnvVarValue && newEnvVarName.indexOf(" ") == -1) {
            envVars.push({
                name: newEnvVarName,
                value: newEnvVarValue,
                masked: variable.newEnvVarMasked,
                key: countKey,
            });
            setCountKey(countKey + 1);
            setJobData({ ...jobData, envVars: [...envVars] });
            setVariable({ ...variable, newEnvVarName: "", newEnvVarValue: "", newEnvVarMasked: false });
        } else {
            invalidDataNotification("Invalid environment variable name/value pair.");
        }
    };

    const addTag = (): void => {
        const tags = [...jobData.tags];
        const newTags = [...variable.newTags];
        const newTagName = variable.newTagName.trim();
        if (newTagName && newTagName.indexOf(" ") == -1) {
            newTags.push({ name: newTagName, key: countKey });
            setCountKey(countKey + 1);
            tags.push({ name: newTagName });
            setJobData({ ...jobData, tags: [...tags] });
            setVariable({ ...variable, newTags: [...newTags], newTagName: "" });
        } else {
            invalidDataNotification("Invalid tag name.");
        }
    };

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        const {
            target: { value, name },
        } = event;
        if (name === "newArgName") {
            setVariable({ ...variable, newArgName: value });
        } else if (name === "newArgValue") {
            setVariable({ ...variable, newArgValue: value });
        } else if (name === "newEnvVarName") {
            setVariable({ ...variable, newEnvVarName: value });
        } else if (name === "newEnvVarValue") {
            setVariable({ ...variable, newEnvVarValue: value });
        } else if (name === "newTagName") {
            setVariable({ ...variable, newTagName: value });
        }
    };

    const onChangeEnvVarMasked = (e: CheckboxChangeEvent) => {
        const { checked } = e.target;
        setVariable({ ...variable, newEnvVarMasked: checked });
    };

    const handleSubmit = (): void => {
        setLoading(true);
        const { args, tags, dataStatus, dataExpiryDays } = jobData;
        const { pid, sid } = request;

        const envVarsData = projectEnvVars.map((envVar: SpiderJobEnvVar) => {
            return envVar;
        });
        spiderEnvVars.map((envVar: SpiderJobEnvVar) => {
            const index = envVarsData.findIndex((element: SpiderJobEnvVar) => element.name === envVar.name);
            if (index != -1) {
                envVarsData[index] = envVar;
            } else {
                envVarsData.push(envVar);
            }
        });

        jobData.envVars.map((envVar: EnvVarsData) => {
            const index = envVarsData.findIndex((element: SpiderJobEnvVar) => element.name === envVar.name);
            if (index != -1) {
                envVarsData[index] = {
                    name: envVar.name,
                    value: envVar.value,
                    masked: envVar.masked,
                };
            } else {
                envVarsData.push({
                    name: envVar.name,
                    value: envVar.value,
                    masked: envVar.masked,
                });
            }
        });

        const Data = {
            args: [...args],
            envVars: [...envVarsData],
            tags: [...tags],
            dataStatus: String(dataStatus),
            dataExpiryDays: Number(dataExpiryDays),
        };
        const requests: ApiProjectsSpidersJobsCreateRequest = {
            data: Data,
            pid: pid,
            sid: sid,
        };
        apiService.apiProjectsSpidersJobsCreate(requests).then(
            (response: SpiderJobCreate) => {
                setLoading(false);
                // Force a complete page reload by using window.location.href directly
                window.location.href = `/projects/${pid}/spiders/${sid}/jobs/${response.jid}`;
            },
            async (error) => {
                setLoading(false);
                const data = await error.json();
                const [errorComponent, err] = checkExternalError(data);
                if (err) {
                    invalidDataNotification(data.detail);
                    setExternalComponent(errorComponent);
                } else {
                    incorrectDataNotification();
                }
                setOpen(false);
            },
        );
    };

    const handleRemoveProxy = (): void => {
        setNoProxy(true);
        const filteredProjectEnvVars = getFilteredEnvVars(projectEnvVars);
        const filteredSpiderEnvVars = getFilteredEnvVars(spiderEnvVars);
        const filteredJobEnvVars = getFilteredEnvVars(jobData.envVars);
        const newEnvVars: EnvVarsData[] = filteredJobEnvVars.map((envVar) => {
            setCountKey(countKey + 1); // Increment the key
            return {
                name: envVar.name,
                value: envVar.value,
                key: countKey,
                masked: envVar.masked ? envVar.masked : false, // If 'masked' is not defined, default to false
            };
        });
        setProjectEnvVars(filteredProjectEnvVars);
        setSpiderEnvVars(filteredSpiderEnvVars);
        setJobData({ ...jobData, envVars: newEnvVars });
    };

    const handleJobCreateProxy = (envVars: SpiderJobEnvVar[]): void => {
        const proxyEnvVars: SpiderJobEnvVar[] = getFilteredEnvVars(envVars, false);
        const newEnvVars: EnvVarsData[] = proxyEnvVars.map((envVar) => {
            setCountKey(countKey + 1); // Increment the key
            return {
                name: envVar.name,
                value: envVar.value,
                key: countKey,
                masked: envVar.masked ? envVar.masked : false, // If 'masked' is not defined, default to false
            };
        });
        setJobData({ ...jobData, envVars: [...jobData.envVars, ...newEnvVars] });
        setNewProxyFormActivate(false);
    };
    const addNewProxy = (): void => {
        setNewProxyFormActivate(true);
    };

    useEffect(() => {
        const getProxyEnvVars = (): SpiderJobEnvVar[] => {
            const jobProxyName = jobData.envVars.find(
                (envVar: SpiderJobEnvVar) => envVar.name === "ESTELA_PROXY_NAME",
            )?.value;
            const spiderProxyName = spiderEnvVars.find(
                (envVar: SpiderJobEnvVar) => envVar.name === "ESTELA_PROXY_NAME",
            )?.value;
            const projectProxyName = projectEnvVars.find(
                (envVar: SpiderJobEnvVar) => envVar.name === "ESTELA_PROXY_NAME",
            )?.value;
            return jobProxyName
                ? getFilteredEnvVars(jobData.envVars, false)
                : spiderProxyName
                ? getFilteredEnvVars(spiderEnvVars, false)
                : projectProxyName
                ? getFilteredEnvVars(projectEnvVars, false)
                : [];
        };
        const newProxyJob: SpiderJobEnvVar[] = getProxyEnvVars();
        if (newProxyJob.length > 0) {
            setNoProxy(false);
            setJobProxy(newProxyJob);
        } else {
            setNoProxy(true);
        }
    }, [projectEnvVars, spiderEnvVars, jobData]);

    return (
        <>
            {!hideRunButton && (
                <Button
                    icon={<Run className="mr-2" width={19} />}
                    size="large"
                    className="flex items-center stroke-white border-estela hover:stroke-estela bg-estela text-white hover:text-estela text-sm hover:border-estela rounded-md"
                    onClick={() => {
                        if (spiders.length == 0) {
                            message.error("No spiders found. Please make a new deploy.");
                            history.push(`/projects/${projectId}/deploys`);
                        } else {
                            setOpen(true);
                        }
                    }}
                    loading={isLoadingSpiders}
                    disabled={isLoadingSpiders}
                >
                    {isLoadingSpiders ? "Loading spiders..." : "Run new job"}
                </Button>
            )}
            {externalComponent}
            <Modal
                style={{
                    overflow: "hidden",
                    padding: 0,
                }}
                open={open}
                onCancel={() => {
                    setOpen(false);
                    if (onClose) onClose();
                }}
                width={460}
                title={<p className="text-xl text-center font-normal">NEW JOB</p>}
                footer={null}
            >
                <Row>
                    <p className="my-2 text-base">Spider</p>
                    <Select
                        style={{ borderRadius: 16 }}
                        size="large"
                        className="w-full"
                        defaultValue={spider ? spider.name : spiders[0] ? spiders[0].name : ""}
                        onChange={handleSpiderChange}
                        showSearch
                        onSearch={handleSpiderSearch}
                        filterOption={false}
                        notFoundContent={isLoadingSpiders ? "Loading..." : "No spiders found"}
                        dropdownRender={(menu) => (
                            <>
                                {menu}
                                {hasMoreSpiders && (
                                    <div
                                        style={{ padding: "8px", textAlign: "center", cursor: "pointer" }}
                                        onClick={loadMoreSpiders}
                                    >
                                        {isLoadingMoreSpiders ? "Loading more..." : "Load more"}
                                    </div>
                                )}
                            </>
                        )}
                    >
                        {spiders.map((spider: Spider) => (
                            <Option key={spider.sid} value={spider.name}>
                                {spider.name}
                            </Option>
                        ))}
                    </Select>
                </Row>
                <Row>
                    <p className="text-base my-2">Data persistence</p>
                    <Select
                        onChange={handlePersistenceChange}
                        className="w-full"
                        size="large"
                        defaultValue={jobData.dataStatus === "PERSISTENT" ? 720 : jobData.dataExpiryDays}
                    >
                        {dataPersistenceOptions.map((option: OptionDataPersistance) => (
                            <Option className="text-sm" key={option.key} value={option.value}>
                                {option.label}
                            </Option>
                        ))}
                    </Select>
                </Row>
                <Row>
                    <p className="text-base my-2">Arguments</p>
                    <Space direction="vertical">
                        <Space direction="horizontal">
                            {jobData.args.map((arg: ArgsData, id: number) => (
                                <Tag
                                    className="text-estela-blue-full border-0 bg-estela-blue-low"
                                    closable
                                    key={id}
                                    onClose={() => handleRemoveArg(id)}
                                >
                                    {arg.name}: {arg.value}
                                </Tag>
                            ))}
                        </Space>
                        <Space direction="horizontal">
                            <Input
                                size="large"
                                className="border-estela-blue-full rounded-l-lg"
                                name="newArgName"
                                placeholder="name"
                                value={variable.newArgName}
                                onChange={handleInputChange}
                            />
                            <Input
                                size="large"
                                className="border-estela-blue-full rounded-r-lg"
                                name="newArgValue"
                                placeholder="value"
                                value={variable.newArgValue}
                                onChange={handleInputChange}
                            />
                            <Button
                                shape="circle"
                                size="small"
                                icon={<Add />}
                                className="flex items-center justify-center bg-estela-blue-full border-estela-blue-full stroke-white hover:bg-estela-blue-full hover:border-estela-blue-full hover:stroke-white"
                                onClick={addArgument}
                            ></Button>
                        </Space>
                    </Space>
                </Row>
                <Row>
                    <p className="text-base my-2">Environment Variables</p>
                    <Space direction="vertical">
                        <div className="flex gap-2 mt-1">
                            {getFilteredEnvVars(projectEnvVars).length > 0 && <p className="text-sm">Project</p>}
                            <div className="flex gap-2">
                                {getFilteredEnvVars(projectEnvVars).map((envVar: SpiderJobEnvVar, id: number) =>
                                    envVar.masked ? (
                                        <MaskedTag key={id} id={id} level={true}>
                                            {envVar.name}
                                        </MaskedTag>
                                    ) : (
                                        <Tag
                                            className="text-estela-blue-full border-0 bg-estela-blue-low"
                                            closable
                                            key={id}
                                            onClose={() => handleRemoveProjectEnvVar(id, true)}
                                        >
                                            {envVar.name}: {envVar.value}
                                        </Tag>
                                    ),
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2 my-2">
                            {getFilteredEnvVars(spiderEnvVars).length > 0 && <p className="text-sm">Spider</p>}
                            <div className="flex gap-2">
                                {getFilteredEnvVars(spiderEnvVars).map((envVar: SpiderJobEnvVar, id: number) =>
                                    envVar.masked ? (
                                        <MaskedTag key={id} id={id} level={false}>
                                            {envVar.name}
                                        </MaskedTag>
                                    ) : (
                                        <Tag
                                            className="text-estela-blue-full border-0 bg-estela-blue-low"
                                            closable
                                            key={id}
                                            onClose={() => handleRemoveProjectEnvVar(id, false)}
                                        >
                                            {envVar.name}: {envVar.value}
                                        </Tag>
                                    ),
                                )}
                            </div>
                        </div>
                        <Space direction="horizontal" className="mb-2">
                            {jobData.envVars.map((envVar: EnvVarsData, id: number) =>
                                envVar.masked ? (
                                    <Tooltip key={id} placement="top" title="Masked variable" showArrow={false}>
                                        <Tag
                                            className="text-estela-blue-full border-0 bg-estela-blue-low"
                                            closable
                                            onClose={() => handleRemoveEnvVar(id)}
                                        >
                                            {envVar.name}
                                        </Tag>
                                    </Tooltip>
                                ) : (
                                    <Tag
                                        className="text-estela-blue-full border-0 bg-estela-blue-low"
                                        closable
                                        key={id}
                                        onClose={() => handleRemoveEnvVar(id)}
                                    >
                                        {envVar.name}: {envVar.value}
                                    </Tag>
                                ),
                            )}
                        </Space>
                        <Space direction="horizontal">
                            <Input
                                size="large"
                                className="border-estela-blue-full rounded-l-lg"
                                name="newEnvVarName"
                                placeholder="name"
                                value={variable.newEnvVarName}
                                onChange={handleInputChange}
                            />
                            <Input
                                size="large"
                                className="border-estela-blue-full rounded-r-lg"
                                name="newEnvVarValue"
                                placeholder="value"
                                value={variable.newEnvVarValue}
                                onChange={handleInputChange}
                            />
                            <Checkbox checked={variable.newEnvVarMasked} onChange={onChangeEnvVarMasked}>
                                Masked
                            </Checkbox>
                            <Button
                                shape="circle"
                                size="small"
                                icon={<Add />}
                                className="flex items-center justify-center bg-estela-blue-full border-estela-blue-full stroke-white hover:bg-estela-blue-full hover:border-estela-blue-full hover:stroke-white"
                                onClick={addEnvVar}
                            ></Button>
                        </Space>
                    </Space>
                </Row>
                <Row>
                    <Modal
                        open={newProxyFormActivate}
                        width={600}
                        className="w-90"
                        title={<p className="text-center text-base">New proxy configuration</p>}
                        onCancel={() => setNewProxyFormActivate(false)}
                        footer={null}
                    >
                        <ProxySettings envVars={[]} setEnvVars={handleJobCreateProxy} />
                    </Modal>
                    <Space direction="horizontal">
                        <p className="text-base">Proxy</p>
                        {noProxy ? (
                            <Button
                                shape="circle"
                                size="small"
                                icon={<Add />}
                                className="flex items-center justify-center bg-estela-blue-full border-estela-blue-full stroke-white hover:bg-estela-blue-full hover:border-estela-blue-full hover:stroke-white"
                                onClick={addNewProxy}
                            ></Button>
                        ) : (
                            <Space direction="vertical" className="my-2">
                                <div className="flex gap-2 my-2">
                                    <div className="flex gap-2">
                                        <Tag
                                            className="text-estela-blue-full border-0 bg-estela-blue-low"
                                            closable
                                            onClose={() => handleRemoveProxy()}
                                        >
                                            proxy_name:{" "}
                                            {jobProxy.find(
                                                (envVar: SpiderJobEnvVar) => envVar.name === "ESTELA_PROXY_NAME",
                                            )?.value || "none"}
                                        </Tag>
                                    </div>
                                </div>
                            </Space>
                        )}
                    </Space>
                </Row>
                <Space direction="vertical" className="my-2">
                    <p className="text-base">Tags</p>
                    <Space direction="horizontal">
                        {jobData.tags.map((tag: TagsData, id) => (
                            <Tag
                                className="text-estela-blue-full border-0 bg-estela-blue-low"
                                closable
                                key={id}
                                onClose={() => handleRemoveTag(id)}
                            >
                                {tag.name}
                            </Tag>
                        ))}
                    </Space>
                    <Space direction="horizontal">
                        <Input
                            size="large"
                            className="border-estela-blue-full rounded-lg"
                            name="newTagName"
                            placeholder="name"
                            value={variable.newTagName}
                            onChange={handleInputChange}
                        />
                        <Button
                            shape="circle"
                            size="small"
                            icon={<Add />}
                            className="flex items-center justify-center bg-estela-blue-full border-estela-blue-full stroke-white hover:bg-estela-blue-full hover:border-estela-blue-full hover:stroke-white"
                            onClick={addTag}
                        ></Button>
                    </Space>
                </Space>
                <Row className="flow-root mt-4">
                    <Button
                        loading={loading}
                        onClick={handleSubmit}
                        size="large"
                        className="float-left w-48 h-12 bg-estela-blue-full text-white hover:text-estela-blue-full hover:border-estela-blue-full rounded-lg"
                    >
                        Create
                    </Button>
                    <Button
                        size="large"
                        className="float-right w-48 h-12 bg-white text-estela-blue-full border-estela-blue-full hover:text-estela-blue-full hover:border-estela-blue-full hover:bg-estela-blue-low rounded-lg"
                        onClick={() => setOpen(false)}
                    >
                        Cancel
                    </Button>
                </Row>
            </Modal>
        </>
    );
}
