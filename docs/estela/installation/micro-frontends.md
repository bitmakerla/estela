---
layout: page
title: Micro-Frontends Guide
parent: Installation
grand_parent: estela
---

# estela Micro-Frontends Guide (Optional)

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
- The micro-frontends must have and expose a component named DropdownComponent
    ```js
    // example
    import { Menu } from "antd";
    export default function DropdowComponent() : JSX.Element{
    return (
            <Menu>  
                <Menu.Item key="/Page">
                    <div>
                        <Link to={`/Page`}   >
                            Page
                        </Link>
                    </div>
                </Menu.Item>
            </Menu>
    );
    }
    ```

## estela configuration
* Create a webpack.config.mf.js file using estela-web/webpack.config.mf.js.example.txt file.
    - On  `DropdownComponent: "<<name_module>>@<<http://url>>/remoteEntry.js`, replace with the name of the micro-frontend and add the location of the remoteEntry.
    ```json
        plugins: [
        new ModuleFederationPlugin({
        name: "estela-web",
        filename: "remoteEntry.js",
        remotes: {
            DropdownComponent: "testMF@localhost:5000/remoteEntry.js",
        },
        ...
        }),
    ```
* Finally, use scripts to build and run estela-web.
    ```json
        "scripts": {
            ...
            "mf:build": "webpack --mode production --config webpack.config.mf.js",
            "mfe:start": "webpack serve --open --mode development --config webpack.config.mf.js",
            ...
        },
    ```
