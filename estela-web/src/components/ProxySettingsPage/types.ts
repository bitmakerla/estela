/* eslint-disable @typescript-eslint/no-unused-vars */

import React, { useEffect, useState } from "react";
import { Row, Space, Button, Tag, Tooltip, Checkbox, Input, Popover, Modal, Form } from "antd";
import type { CheckboxChangeEvent } from "antd/es/checkbox";
import { Link } from "react-router-dom";
import { SpiderJobEnvVar } from "../../services";

export interface ProjectEnvVar {
    projectId: string;
    spiderId: string;
    envVarsData: SpiderJobEnvVar[];
    level: string;
    setEnvVarsOnParent?: (envVars: SpiderJobEnvVar[]) => void;
}

export interface ProxySettingsProps {
    ESTELA_PROXY_URL: string;
    ESTELA_PROXY_PORT: string;
    ESTELA_PROXY_USER: string;
    ESTELA_PROXY_PASS: string;
    ESTELA_PROXY_NAME: string;
}

export interface ProxyTagProps {
    children: React.ReactNode;
    id: number;
    proxySettings: SpiderJobEnvVar[];
}
