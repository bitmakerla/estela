import React, { useEffect, useState } from "react";
import { Button, Input, Form } from "antd";

import "./styles.scss";
import { SpiderJobEnvVar } from "../../services/api";
import { ProjectEnvVar } from "./types";

interface FormType {
    type: string;
    closeModal: () => void;
}

interface ProxyFormProps extends ProjectEnvVar, FormType {}

export const ProxyForm: React.FC<ProxyFormProps> = ({ envVars, setEnvVars, type, closeModal }) => {
    const propertiesToFind: Array<string> = [
        "ESTELA_PROXY_URL",
        "ESTELA_PROXY_PORT",
        "ESTELA_PROXY_USER",
        "ESTELA_PROXY_PASS",
        "ESTELA_PROXY_NAME",
    ];

    const [activeUpdateButton, setActiveUpdateButton] = useState(false);
    // Initialize the state with the filtered envVarsData
    const [proxyEnvVars, setProxyEnvVars] = useState<SpiderJobEnvVar[]>(
        envVars.filter((envVar) => propertiesToFind.includes(envVar.name)),
    );

    useEffect(() => {
        if (validProxySettings()) {
            setActiveUpdateButton(true);
        } else {
            setActiveUpdateButton(false);
        }
    }, [proxyEnvVars]);

    const getProxyValue = (envVarName: string): string => {
        if (envVarName == "ESTELA_PROXY_PASS") {
            return "";
        }
        const proxyNameObj = envVars.find((obj) => obj.name === envVarName);
        return proxyNameObj ? proxyNameObj.value : "";
    };

    const validProxySettings = (): boolean => {
        return propertiesToFind.every((property) =>
            proxyEnvVars.some((obj) => obj.name === property && obj.value != ""),
        );
    };

    const handleChangeProxy = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const proxyEnvVar = {
            name: e.target.name,
            value: e.target.value,
            masked: false,
        };
        const nameExists = proxyEnvVars.some((envVar) => envVar.name === proxyEnvVar.name);

        // If the name exists, update the value; otherwise, add the new element
        const updatedProxyEnvVars = nameExists
            ? proxyEnvVars.map((envVar) => (envVar.name === proxyEnvVar.name ? proxyEnvVar : envVar))
            : [...proxyEnvVars, proxyEnvVar];

        setProxyEnvVars(updatedProxyEnvVars);
    };

    const updateEnvVars = (): void => {
        // Enable proxies
        const enableProxyEnvVar = {
            name: "ESTELA_PROXIES_ENABLED",
            value: "true",
            masked: false,
        };
        setEnvVars([...envVars, ...proxyEnvVars, enableProxyEnvVar]);
        closeModal();
    };

    return (
        <Form layout="vertical">
            <div className="">
                <Form.Item label="Username" name="proxy_username">
                    <Input
                        size="large"
                        placeholder="Username"
                        name="ESTELA_PROXY_USER"
                        defaultValue={getProxyValue("ESTELA_PROXY_USER")}
                        onChange={handleChangeProxy}
                        className="input-proxy-form border-estela placeholder:text-estela-black-low"
                    />
                </Form.Item>
                <Form.Item label="Password" name="proxy_password">
                    <Input.Password
                        size="large"
                        placeholder="Password"
                        name="ESTELA_PROXY_PASS"
                        onChange={handleChangeProxy}
                        defaultValue=""
                        className="input-proxy-form border-estela placeholder:text-estela-black-low"
                    />
                </Form.Item>
                <Form.Item label="Proxy Address" name="proxy_address">
                    <Input
                        size="large"
                        placeholder="E.g. 10.80.4.176"
                        name="ESTELA_PROXY_URL"
                        defaultValue={getProxyValue("ESTELA_PROXY_URL")}
                        onChange={handleChangeProxy}
                        className="input-proxy-form border-estela placeholder:text-estela-black-low"
                    />
                </Form.Item>
                <Form.Item label="Proxy Port" name="proxy_port">
                    <Input
                        size="large"
                        placeholder="E.g. 8080"
                        name="ESTELA_PROXY_PORT"
                        defaultValue={getProxyValue("ESTELA_PROXY_PORT")}
                        onChange={handleChangeProxy}
                        className="input-proxy-form border-estela placeholder:text-estela-black-low"
                    />
                </Form.Item>
                <Form.Item label="Proxy Name" name="proxy_name">
                    <Input
                        size="large"
                        placeholder="E.g. my_proxy"
                        name="ESTELA_PROXY_NAME"
                        onChange={handleChangeProxy}
                        defaultValue={getProxyValue("ESTELA_PROXY_NAME")}
                        className="input-proxy-form border-estela placeholder:text-estela-black-low"
                    />
                </Form.Item>
            </div>
            <div className="h-12 w-100 button-container">
                <Button
                    block
                    disabled={!activeUpdateButton}
                    htmlType="submit"
                    onClick={updateEnvVars}
                    className="border-estela bg-estela hover:border-estela hover:text-estela text-white rounded-md text-base  min-h-full button-spacing"
                >
                    {type}
                </Button>
                <Button
                    block
                    htmlType="submit"
                    onClick={closeModal}
                    className="border-estela hover:border-estela hover:text-estela text-estela rounded-md text-base  min-h-full button-spacing"
                >
                    Cancel
                </Button>
            </div>
        </Form>
    );
};
