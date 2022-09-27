import React from "react";
import ReactDOM from "react-dom";
import "antd/dist/antd.min.css";

import "./assets/scss/index.scss";
import "./assets/index.css";
import { MainRoutes } from "./routes";

ReactDOM.render(
    <React.StrictMode>
        <MainRoutes />
    </React.StrictMode>,
    document.getElementById("root"),
);
