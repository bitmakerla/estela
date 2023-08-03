# estela Documentation

### Requirements

You should have installed Ruby with the specified version inside the `.ruby_version` file.

### Build and run locally

Install Bundler and Jekyll (if you haven't)

```bash
$ gem install bundler jekyll
```

Install Redoc CLI (if you haven't)

```bash
$ yarn global add redoc-cli@0.13.16
```

Install the gems if it's the first time you build the project

```bash
$ bundle install
```

Build the swagger specification

```bash
$ redoc-cli build ../estela-api/docs/api.yaml -t ./assets/swagger-template.hbs --options.hideDownloadButton -o ./estela/api/endpoints.html
```

Then, build and run the site

```bash
$ bundle exec jekyll serve
```

By default, the site runs in the [localhost](http://localhost:4000/) and is built in a new folder named `_site`.
Preview 2
