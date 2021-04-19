# Bitmaker Scraping Product

## Set-up

You need to add environment file (.env) in root directory.

```sh
$ make build
$ make up  # Retry if necessary until DB is ready

# Open other window and run
$ make migrate
$ make createsuperuser
```

## Testing

```sh
$ make test
```

## Requirements

```sh
$ pip install -r requirements/dev.txt
```

## Update Migrations

```sh
$ make makemigrations
```

## Django Admin

Go to [Django Admin](http://localhost:8000/admin) and login with your user (superuser) credentials.


## Set-up AWS EKS Cluster

To create a simple cluster you can use config/cluster.yaml configuration. You need installed
[eksctl](https://docs.aws.amazon.com/emr/latest/EMR-on-EKS-DevelopmentGuide/setting-up-eksctl.html) client
to run the next commands.

```sh
$ eksctl create cluster -f cluster.yaml  # Create cluster
$ eksctl delete cluster test --wait --region ***REMOVED***  # Delete cluster
```

After that, you need to put your AWS credentials and Cluster API server endpoint in the environment file (.env)
