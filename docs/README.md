# estela Documentation

### Build and run locally

Install Bundler and Jekyll (if you haven't)
```bash
$ gem install bundler jekyll
```
Install Redoc CLI (if you haven't)
```bash
$ yarn global add redoc-cli
```
Install the gems if it's the first time you build the project
```bash
$ bundle install
```
Build the swagger specification
```bash
$ redoc-cli build ../estela-api/docs/api.yaml --options='{"hideDownloadButton": true}'
$ echo "---\ntitle: Endpoints\nparent: API\ngrand_parent: estela\n---" > ./estela/api/endpoints.html && echo | cat redoc-static.html >> ./estela/api/endpoints.html
$ rm redoc-static.html
```
Then, build and run the site
```bash
$ bundle exec jekyll serve
```
By default, the site runs in the [localhost](http://localhost:4000/) and is built in a new folder named `_site`.
