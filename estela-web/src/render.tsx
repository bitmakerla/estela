import React from "react";
import ReactDOM from "react-dom";
import "antd/dist/antd.min.css";

import "./assets/scss/index.scss";
import "./assets/index.css";
import { App } from "./app";

ReactDOM.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
    document.getElementById("root"),
);
