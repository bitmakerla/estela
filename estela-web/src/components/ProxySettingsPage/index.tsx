/* eslint-disable @typescript-eslint/no-unused-vars */

import React, { useEffect, useState } from "react";
import { Row, Space, Button, Tag, Tooltip, Checkbox, Input, Popover, Modal, Form } from "antd";
import type { CheckboxChangeEvent } from "antd/es/checkbox";
import { Link } from "react-router-dom";

import "./styles.scss";
//import Add from "../../assets/icons/add.svg";
import Menu from "../../assets/icons/menu.svg";
import { ApiService } from "../../services";
import {
    ApiProjectsUpdateRequest,
    ProjectUpdate,
    SpiderUpdate,
    SpiderJobEnvVar,
    ApiProjectsSpidersUpdateRequest,
} from "../../services/api";
import { ProxyForm } from "./ProxyForm";
import { ProjectEnvVar, ProxySettingsProps, ProxyTagProps } from "./types";
import { invalidDataNotification } from "../../shared";
import { handleInvalidDataError } from "../../utils";
import { Content } from "antd/lib/layout/layout";
import { env } from "process";

export const ProxySettings: React.FC<ProjectEnvVar> = ({
    projectId,
    spiderId,
    envVarsData,
    level,
    setEnvVarsOnParent,
}) => {
    const [newEnvVarMasked, setNewEnvVarMasked] = useState(false);
    const [newEnvVarName, setNewEnvVarName] = useState("");
    const [newEnvVarValue, setNewEnvVarValue] = useState("");
    const [envVars, setEnvVars] = useState<SpiderJobEnvVar[]>(envVarsData);
    const [submitted, setSubmitted] = useState(false);
    const [shouldDeleteEnvVars, setShouldDeleteEnvVars] = useState(false);
    //const [proxyExist, setProxyExist] = useState(false);
    const [openProxyUserModal, setOpenProxyUserModal] = useState(false);
    const [proxySettings, setProxySettings] = useState<ProxySettingsProps>({
        ESTELA_PROXY_URL: "",
        ESTELA_PROXY_PORT: "",
        ESTELA_PROXY_USER: "",
        ESTELA_PROXY_PASS: "",
        ESTELA_PROXY_NAME: "",
    });
    const [openModal, setOpenModal] = useState(false);
    const [activeUpdateButton, setActiveUpdateButton] = useState(false);

    const apiService = ApiService();

    const ProxyTag: React.FC<ProxyTagProps> = ({ children, id, proxySettings }) => {
        const [proxyEnvVars, setProxyEnvVars] = useState<SpiderJobEnvVar[]>(proxySettings);
        const [openEditModal, setOpenEditModal] = useState(false);
        const [openDeleteModal, setOpenDeleteModal] = useState(false);
        const [renderTag, setRenderTag] = useState(true);
        const [openPopover, setOpenPopover] = useState(false);

        const handleChangeProxyEnv = (e: React.ChangeEvent<HTMLInputElement>): void => {
            setProxyEnvVars({ ...proxyEnvVars, [e.target.name]: e.target.value });
        };
        //     console.log({ proxySettings });
        //     console.log(proxySettings);
        //     if (validProxySettings(proxySettings)) {
        //         setActiveUpdateButton(true);
        //     } else {
        //         setActiveUpdateButton(false);
        //     }
        // };

        useEffect(() => {
            setEnvVarsOnParent && setEnvVarsOnParent(envVars);
        }, [envVars]);

        const SettingContent = (
            <div className="grid">
                <Button
                    size="large"
                    onClick={() => {
                        setOpenEditModal(true);
                        setOpenPopover(false);
                    }}
                    className="text-estela-black-medium border-0 hover:bg-estela-blue-low hover:text-estela-blue-full rounded-lg"
                >
                    Edit
                </Button>
                <Modal
                    open={openEditModal}
                    width={400}
                    title={<p className="text-center text-base">Edit Proxy Settings</p>}
                    onCancel={() => setOpenEditModal(false)}
                    footer={null}
                >
                    <div className="bg-white my-4">
                        <Content>
                            <ProxyForm
                                projectId={projectId}
                                spiderId={spiderId}
                                envVarsData={envVars}
                                level={level}
                                type="Edit"
                                closeModal={() => setOpenEditModal(false)}
                                setParentEnvVars={setEnvVars}
                            ></ProxyForm>
                        </Content>
                    </div>
                </Modal>
                <Button
                    size="large"
                    onClick={() => {
                        setOpenDeleteModal(true);
                        setOpenPopover(false);
                    }}
                    className="text-estela-black-medium border-0 hover:bg-estela-blue-low hover:text-estela-blue-full rounded-lg"
                >
                    Delete
                </Button>
                <Modal
                    open={openDeleteModal}
                    width={490}
                    title={<p className="text-center">CONFIRM ACTION</p>}
                    onCancel={() => setOpenDeleteModal(false)}
                    footer={null}
                >
                    <>
                        <p className="text-center text-base text-estela-black-full mb-4">
                            Are you sure you want to delete this environment variable
                        </p>
                        <div className="flex gap-4 w-full">
                            <Button
                                onClick={() => {
                                    setRenderTag(false);
                                    handleRemoveProxy();
                                    setOpenDeleteModal(false);
                                    setOpenPopover(false);
                                }}
                                className="bg-estela-blue-full text-base border-estela-blue-full hover:border-estela-blue-full text-white rounded-lg hover:text-estela-blue-full hover:bg-estela-blue-low h-14 w-full"
                            >
                                Confirm
                            </Button>
                            <Button
                                className="border-estela-blue-full hover:border-estela-blue-full hover:text-estela-blue-full text-estela-blue-full text-base rounded-lg h-14 w-full"
                                onClick={() => setOpenDeleteModal(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                    </>
                </Modal>
            </div>
        );

        const tagStyle =
            "w-1/2 h-24 flex items-center justify-between text-base pr-2 py-1 pl-3 border-estela-blue-low text-estela-blue-full bg-estela-blue-low hover:border-estela-blue-full rounded-xl";

        return (
            <>
                {renderTag && (
                    <Tag key={id} className={tagStyle}>
                        <div className="flex flex-col justify-center">
                            <span>{children}</span>
                            <span className="text-sm text-gray-600">You are using your own proxy.</span>
                        </div>
                        <div className="flex items-center">
                            <Popover
                                onOpenChange={(open) => setOpenPopover(open)}
                                open={openPopover}
                                className="padding-0 rounded-lg"
                                content={SettingContent}
                                trigger="click"
                                showArrow={false}
                                placement="right"
                            >
                                <Button
                                    className="flex items-center justify-right w-4 ml-1 rounded-2xl bg-estela-blue-low border-0 hover:bg-estela-blue-low"
                                    icon={<Menu />}
                                ></Button>
                            </Popover>
                        </div>
                    </Tag>
                )}
            </>
        );
    };

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        const {
            target: { value, name },
        } = event;
        if (name === "newEnvVarName") {
            setNewEnvVarName(value);
        } else if (name === "newEnvVarValue") {
            setNewEnvVarValue(value);
        }
    };

    const getProxyValue = (envVarName: string): string => {
        const proxyNameObj = envVars.find((obj) => obj.name === envVarName);
        return proxyNameObj ? proxyNameObj.value : "";
    };
    const checkIfProxyExist = (): boolean => {
        const propertiesToFind: Array<string> = [
            "ESTELA_PROXY_URL",
            "ESTELA_PROXY_PORT",
            "ESTELA_PROXY_USER",
            "ESTELA_PROXY_PASS",
            "ESTELA_PROXY_NAME",
        ];
        // console.log(envVars);
        // console.log(propertiesToFind.every((property) => envVars.some((obj) => obj.name === property)));
        return propertiesToFind.every((property) => envVars.some((obj) => obj.name === property));
    };

    const onChangeEnvVarMasked = (e: CheckboxChangeEvent) => {
        setNewEnvVarMasked(e.target.checked);
    };

    const addEnvVar = (): void => {
        if (newEnvVarName && newEnvVarValue && newEnvVarName.indexOf(" ") == -1) {
            envVars.push({ name: newEnvVarName, value: newEnvVarValue, masked: newEnvVarMasked });
            setEnvVars(envVars);
            setNewEnvVarName("");
            setNewEnvVarValue("");
            setNewEnvVarMasked(false);
            setOpenModal(false);
            setActiveUpdateButton(true);
        } else {
            invalidDataNotification("Invalid environment variable name/value pair.");
        }
    };
    // Debo validar que los proxies esten bien
    const updateProxySettings = (): void => {
        console.log("Nada");
    };

    const validProxySettings = (proxySettings: ProxySettingsProps): boolean => {
        return (
            proxySettings.ESTELA_PROXY_PASS != "" &&
            proxySettings.ESTELA_PROXY_URL != "" &&
            proxySettings.ESTELA_PROXY_PORT != "" &&
            proxySettings.ESTELA_PROXY_USER != "" &&
            proxySettings.ESTELA_PROXY_NAME != ""
        );
    };

    const handleChangeProxy = (e: React.ChangeEvent<HTMLInputElement>): void => {
        setProxySettings({ ...proxySettings, [e.target.name]: e.target.value });
        console.log({ proxySettings });
        // console.log(proxySettings);
        // if (validProxySettings(proxySettings)) {
        //     setActiveUpdateButton(true);
        // } else {
        //     setActiveUpdateButton(false);
        // }
    };

    const updateEnvVars = (): void => {
        if (level === "project") {
            updateProjectEnvVars();
        } else if (level === "spider") {
            updateSpiderEnvVars();
        }
    };

    const updateSpiderEnvVars = (): void => {
        const requestData: SpiderUpdate = {
            envVars: envVars,
        };
        const request: ApiProjectsSpidersUpdateRequest = {
            data: requestData,
            pid: projectId,
            sid: Number(spiderId),
        };
        apiService.apiProjectsSpidersUpdate(request).then(
            (response: SpiderUpdate) => {
                let envVars = response.envVars || [];
                envVars = envVars.map((envVar: SpiderJobEnvVar) => {
                    return {
                        name: envVar.name,
                        value: envVar.masked ? "__MASKED__" : envVar.value,
                        masked: envVar.masked,
                    };
                });
                setEnvVars(envVars);
                setActiveUpdateButton(false);
            },
            (error: unknown) => {
                console.error(error);
            },
        );
    };

    const deleteProjectEnvVars = (): void => {
        const requestData: SpiderUpdate = {
            envVars: envVars,
        };
        const request: ApiProjectsUpdateRequest = {
            data: requestData,
            pid: projectId,
        };
        apiService.apiProjectsUpdate(request).then(
            (response: ProjectUpdate) => {
                let envVars = response.envVars || [];
                envVars = envVars.map((envVar: SpiderJobEnvVar) => {
                    return {
                        name: envVar.name,
                        value: envVar.masked ? "__MASKED__" : envVar.value,
                        masked: envVar.masked,
                    };
                });
                setEnvVars(envVars);
                setActiveUpdateButton(true);
            },
            (error: unknown) => {
                handleInvalidDataError(error);
            },
        );
    };

    const deleteSpiderEnvVars = (): void => {
        const requestData: SpiderUpdate = {
            envVars: envVars,
        };
        const request: ApiProjectsSpidersUpdateRequest = {
            data: requestData,
            pid: projectId,
            sid: Number(spiderId),
        };
        apiService.apiProjectsSpidersUpdate(request).then(
            (response: SpiderUpdate) => {
                let envVars = response.envVars || [];
                envVars = envVars.map((envVar: SpiderJobEnvVar) => {
                    return {
                        name: envVar.name,
                        value: envVar.masked ? "__MASKED__" : envVar.value,
                        masked: envVar.masked,
                    };
                });
                setEnvVars(envVars);
                setActiveUpdateButton(true);
            },
            (error: unknown) => {
                handleInvalidDataError(error);
            },
        );
    };

    const updateProjectEnvVars = (): void => {
        console.log({ proxySettings });
        const envVarsList: SpiderJobEnvVar[] = Object.entries(proxySettings).map(([key, value]) => {
            return {
                name: key,
                value: value,
                masked: false,
            };
        });
        envVarsList.push({
            name: "CUSTOM_PROXIES_ENABLED",
            value: "true",
            masked: false,
        });
        console.log({ envVarsList });
        const requestData: ProjectUpdate = {
            envVars: envVarsList,
        };
        const request: ApiProjectsUpdateRequest = {
            data: requestData,
            pid: projectId,
        };
        apiService.apiProjectsUpdate(request).then(
            (response: ProjectUpdate) => {
                let envVars = response.envVars || [];
                envVars = envVars.map((envVar: SpiderJobEnvVar) => {
                    return {
                        name: envVar.name,
                        value: envVar.masked ? "__MASKED__" : envVar.value,
                        masked: envVar.masked,
                    };
                });
                setEnvVars(envVars);
                setActiveUpdateButton(false);
            },
            (error: unknown) => {
                handleInvalidDataError(error);
            },
        );
    };

    const handleRemoveProxy = (): void => {
        const propertiesToFind: Array<string> = [
            "ESTELA_PROXY_URL",
            "ESTELA_PROXY_PORT",
            "ESTELA_PROXY_USER",
            "ESTELA_PROXY_PASS",
            "ESTELA_PROXY_NAME",
            "CUSTOM_PROXIES_ENABLED",
        ];
        const filteredEnvVars = envVars.filter((obj) => !propertiesToFind.includes(obj.name));
        console.log({ filteredEnvVars });
        setEnvVars(filteredEnvVars);
        setShouldDeleteEnvVars(true);
    };

    useEffect(() => {
        if (shouldDeleteEnvVars) {
            if (level == "project") {
                deleteProjectEnvVars();
            } else if (level === "spider") {
                deleteSpiderEnvVars();
            }
            setShouldDeleteEnvVars(false);
        }
    }, [envVars, shouldDeleteEnvVars]);

    return (
        <div>
            {checkIfProxyExist() ? (
                <Row className="bg-white rounded-lg my-4">
                    <Space direction="vertical" className="lg:m-8 md:mx-6 m-4 w-full">
                        <div className="flex flex-col">
                            <p className="text-2xl text-black">Proxy Settings</p>
                            <p className="text-estela-black-medium text-sm">
                                Control and configure your proxies effortlessly.
                            </p>
                            <ProxyTag key="123" id={123} proxySettings={envVars}>
                                {getProxyValue("ESTELA_PROXY_NAME")}
                            </ProxyTag>
                        </div>
                    </Space>
                </Row>
            ) : (
                <Row className="bg-white rounded-lg my-4">
                    <Space direction="vertical" className="lg:m-8 md:mx-6 m-4 w-full">
                        <div className="flex flex-col">
                            <p className="text-2xl text-black">Proxy Settings</p>
                            <p className="text-estela-black-medium text-sm">
                                Control and configure your proxies effortlessly.
                            </p>
                            <div className="mt-4">
                                <div className="">
                                    <Row className="flex flex-col space-y-4">
                                        <Button
                                            onClick={() => {
                                                setOpenProxyUserModal(true);
                                            }}
                                            size="large"
                                            className="text-estela-blue-full w-96 h-24 border-0 bg-estela-blue-low text-base rounded estela-border-proxy"
                                        >
                                            <span className="text-center font-semibold">Manual configuration</span>
                                            <p className="text-xs text-estela-black-full">Configure your own proxy</p>
                                        </Button>
                                        <Button
                                            size="large"
                                            className="text-estela-blue-full w-96 h-24 border-0 bg-estela-blue-low text-base rounded estela-border-proxy"
                                        >
                                            <span className="text-center font-semibold">BMC Proxy</span>
                                            <p className="text-xs text-estela-black-full">Recommended</p>
                                        </Button>
                                    </Row>
                                    <Modal
                                        open={openProxyUserModal}
                                        className="w-1/2"
                                        title={<p className="text-center text-base">New proxy configuration</p>}
                                        onCancel={() => setOpenProxyUserModal(false)}
                                        footer={null}
                                    >
                                        <div className="bg-white my-4">
                                            <Content>
                                                <ProxyForm
                                                    projectId={projectId}
                                                    spiderId={spiderId}
                                                    envVarsData={envVars}
                                                    level={level}
                                                    type="Add"
                                                    closeModal={() => setOpenProxyUserModal(false)}
                                                    setParentEnvVars={setEnvVars}
                                                ></ProxyForm>
                                            </Content>
                                        </div>
                                    </Modal>
                                </div>
                            </div>
                        </div>
                    </Space>
                </Row>
            )}
        </div>
    );
};
