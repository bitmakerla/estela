import React from "react";
import ReactDOM from "react-dom";
import "antd/dist/antd.css";

import "./assets/scss/index.scss";
import { MainRoutes } from "./routes";

ReactDOM.render(
    <React.StrictMode>
        <MainRoutes />
    </React.StrictMode>,
    document.getElementById("root"),
);
