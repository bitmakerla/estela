import React, { useState } from "react";
import { Row, Space, Button, Tag, Tooltip, Checkbox, Input, Popover, Modal } from "antd";
import type { CheckboxChangeEvent } from "antd/es/checkbox";

import "./styles.scss";
import Add from "../../assets/icons/add.svg";
import Menu from "../../assets/icons/menu.svg";
import { ApiService } from "../../services";
import {
    ApiProjectsUpdateRequest,
    SpiderJobEnvVar,
    ProjectUpdate,
    SpiderUpdate,
    ApiProjectsSpidersUpdateRequest,
} from "../../services/api";
import { invalidDataNotification } from "../../shared";
import { handleInvalidDataError, getFilteredEnvVars } from "../../utils";

interface ProjectEnvVar {
    projectId: string;
    spiderId: string;
    envVarsData: SpiderJobEnvVar[];
    level: string;
}

interface CustomTagProps {
    children: React.ReactNode;
    id: number;
    envVar: SpiderJobEnvVar;
}

export const EnvVarsSetting: React.FC<ProjectEnvVar> = ({ projectId, spiderId, envVarsData, level }) => {
    const [newEnvVarMasked, setNewEnvVarMasked] = useState(false);
    const [newEnvVarName, setNewEnvVarName] = useState("");
    const [newEnvVarValue, setNewEnvVarValue] = useState("");
    const [envVars, setEnvVars] = useState<SpiderJobEnvVar[]>(envVarsData);
    const [openModal, setOpenModal] = useState(false);
    const [activeUpdateButton, setActiveUpdateButton] = useState(false);

    const CustomTag: React.FC<CustomTagProps> = ({ children, id, envVar }) => {
        const [openEditModal, setOpenEditModal] = useState(false);
        const [openDeleteModal, setOpenDeleteModal] = useState(false);
        const [openPopover, setOpenPopover] = useState(false);
        const [envVarName, setEnvVarName] = useState(envVar.name);
        const [envVarValue, setEnvVarValue] = useState(envVar.value);
        const [envVarMasked, setEnvVarMasked] = useState(envVar.masked);
        const [renderTag, setRenderTag] = useState(true);

        const onEditEnvVarMasked = (e: CheckboxChangeEvent) => {
            const { checked } = e.target;
            setEnvVarMasked(checked);
        };

        const onEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const { name, value } = e.target;
            if (name === "envVarName") {
                setEnvVarName(value);
            } else if (name === "envVarValue") {
                setEnvVarValue(value);
            }
        };

        const handleEditEnvVar = () => {
            const envVarUpdated = [...envVars];
            envVarUpdated[id].name = envVarName;
            envVarUpdated[id].value = envVarValue;
            envVarUpdated[id].masked = envVarMasked;
            setEnvVars(envVarUpdated);
            setActiveUpdateButton(true);
            setOpenEditModal(false);
        };

        const handleRemoveEnvVar = (): void => {
            envVars.splice(id, 1);
            setEnvVars(envVars);
            setRenderTag(false);
            setActiveUpdateButton(true);
        };

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
                    title={<p className="text-center text-base">Edit environment variable</p>}
                    onCancel={() => setOpenEditModal(false)}
                    footer={null}
                >
                    <div className="grid gap-4">
                        <div>
                            <p className="text-base text-estela-black-full mb-2">Name</p>
                            <Input
                                size="large"
                                className="border-estela-blue-full rounded-lg"
                                name="envVarName"
                                placeholder={envVarName}
                                value={envVarName}
                                onChange={onEditInputChange}
                            />
                        </div>
                        <div>
                            <p className="text-base text-estela-black-full mb-2">Value</p>
                            <Input
                                size="large"
                                className="border-estela-blue-full rounded-lg"
                                name="envVarValue"
                                placeholder={envVarValue}
                                value={envVarValue}
                                onChange={onEditInputChange}
                            />
                        </div>
                        <Checkbox checked={envVarMasked} onChange={onEditEnvVarMasked}>
                            Add as masked environment variable
                        </Checkbox>
                        <div className="flex gap-4 w-full mt-2">
                            <Button
                                className="bg-estela-blue-full text-base border-estela-blue-full hover:border-estela-blue-full text-white rounded-lg hover:text-estela-blue-full hover:bg-estela-blue-low h-14 w-full"
                                onClick={() => handleEditEnvVar()}
                            >
                                Edit
                            </Button>
                            <Button
                                className="border-estela-blue-full hover:border-estela-blue-full hover:text-estela-blue-full text-estela-blue-full text-base rounded-lg h-14 w-full"
                                onClick={() => setOpenEditModal(false)}
                            >
                                Cancel
                            </Button>
                        </div>
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
                                    handleRemoveEnvVar();
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
            "flex items-center justify-center text-base pr-2 py-1 pl-3 border-estela-blue-low text-estela-blue-full bg-estela-blue-low hover:border-estela-blue-full rounded-xl";

        return (
            <>
                {renderTag && (
                    <Tag key={id} className={tagStyle}>
                        {children}
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
                                className="flex items-center justify-center w-4 ml-1 rounded-2xl bg-estela-blue-low border-0 hover:bg-estela-blue-low"
                                icon={<Menu />}
                            ></Button>
                        </Popover>
                    </Tag>
                )}
            </>
        );
    };

    const apiService = ApiService();

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

    const updateProjectEnvVars = (): void => {
        const requestData: ProjectUpdate = {
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
                setActiveUpdateButton(false);
            },
            (error: unknown) => {
                handleInvalidDataError(error);
            },
        );
    };

    return (
        <Row className="bg-white rounded-lg my-4">
            <Space direction="vertical" className="lg:m-8 md:mx-6 m-4 w-full">
                <div className="flex justify-between">
                    <p className="text-2xl text-black">Environment variable</p>
                    <Button
                        size="large"
                        icon={<Add className="mr-2" />}
                        onClick={() => setOpenModal(true)}
                        className="flex items-center order-last bg-estela-blue-full border-estela-blue-full stroke-white hover:bg-white hover:border-estela-blue-full hover:stroke-estela-blue-full text-white hover:text-estela-blue-full rounded-md text-base"
                    >
                        New variable
                    </Button>
                    <Modal
                        open={openModal}
                        width={400}
                        title={<p className="text-center text-base">New environment variable</p>}
                        onCancel={() => setOpenModal(false)}
                        footer={null}
                    >
                        <div className="grid gap-4">
                            <div>
                                <p className="text-base text-estela-black-full mb-2">Name</p>
                                <Input
                                    size="large"
                                    className="border-estela-blue-full rounded-lg"
                                    name="newEnvVarName"
                                    placeholder="name"
                                    value={newEnvVarName}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div>
                                <p className="text-base text-estela-black-full mb-2">Value</p>
                                <Input
                                    size="large"
                                    className="border-estela-blue-full rounded-lg"
                                    name="newEnvVarValue"
                                    placeholder="value"
                                    value={newEnvVarValue}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <Checkbox checked={newEnvVarMasked} onChange={onChangeEnvVarMasked}>
                                Add as masked environment variable
                            </Checkbox>
                            <div className="flex gap-4 w-full mt-2">
                                <Button
                                    className="bg-estela-blue-full text-base border-estela-blue-full hover:border-estela-blue-full text-white rounded-lg hover:text-estela-blue-full hover:bg-estela-blue-low h-14 w-full"
                                    onClick={addEnvVar}
                                >
                                    Add
                                </Button>
                                <Button
                                    className="border-estela-blue-full hover:border-estela-blue-full hover:text-estela-blue-full text-estela-blue-full text-base rounded-lg h-14 w-full"
                                    onClick={() => setOpenModal(false)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </Modal>
                </div>
                <p className="text-sm my-2 text-estela-black-medium">
                    Environment variables will be set to all jobs in this project.
                </p>
                <Space direction="horizontal">
                    {getFilteredEnvVars(envVars).map((envVar: SpiderJobEnvVar, id: number) =>
                        envVar.masked ? (
                            <Tooltip title="Masked variable" showArrow={false} overlayClassName="tooltip" key={id}>
                                <>
                                    <CustomTag key={id} id={id} envVar={envVar}>
                                        {envVar.name}
                                    </CustomTag>
                                </>
                            </Tooltip>
                        ) : (
                            <CustomTag key={id} id={id} envVar={envVar}>
                                {envVar.name}: {envVar.value}
                            </CustomTag>
                        ),
                    )}
                </Space>
                <div className="h-12 w-72">
                    <Button
                        disabled={!activeUpdateButton}
                        block
                        onClick={() => updateEnvVars()}
                        className="border-estela bg-estela hover:border-estela hover:text-estela text-white rounded-md text-base h-full"
                    >
                        Save variables
                    </Button>
                </div>
            </Space>
        </Row>
    );
};
