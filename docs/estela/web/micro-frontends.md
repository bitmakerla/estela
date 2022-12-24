---
layout: page
title: Micro-Frontends Guide
parent: Web
grand_parent: estela
---

# estela Micro-Frontends Guide

The main goal of micro frontends in estela-web is to be able to use external components. This allows the use of custom components.

estela allows the use of Micro-Frontends only in the user dropdown. This is achieved with the use of [Module Federation](https://webpack.js.org/concepts/module-federation/).

## Requirements
- The micro-frontends must use [Module Federation](https://webpack.js.org/concepts/module-federation/)
- The micro-frontends must have and expose their routes with the name of ComponentRoutes
    ```js
    // example
    export default class ComponentRoutes extends Component<unknown, unknown> {
        render(): JSX.Element {
            return (
                <>
                    <Route path="/Page" component={Page} exact />
                </>
            );
        }
    }
    ```
- The micro-frontend must have a MenuProps array.
    ```js
    // example
    import type { MenuProps } from "antd";
    import { Layout } from "antd";

    const { Content } = Layout;

    const userDropdownSidenavItems: MenuProps["items"] = [
        {
            key: "/3",
            label: (
                <Content>
                    <Link to={"/page"} >
                        page
                    </Link>
                </Content>
            ),
            style: { backgroundColor: "white" },
        },
    ];

    export default userDropdownSidenavItems;
    ```

## estela configuration
* To use Micro-frontend configuration, you need to run the command

    ```bash
    $ yarn mf:start --env remoteURL=<MICRO-FRONTEND-URL>
    ```

    Where `<MICRO-FRONTEND-URL>` is the location of the micro-frontend. Example:

    ```bash
    $ yarn mf:start --env remoteURL=http://localhost:3006/
    ```
* For production, you need to run the command

    ```bash
    $ yarn mf:build --env remoteURL=<MICRO-FRONTEND-URL>
    ```

