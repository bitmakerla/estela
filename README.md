# Bitmaker Scraping Product

## Set-up

You need to add enviroment file (.env) in root directory.

```sh
$ make build
$ make up  # Retry if neccesary until DB is ready

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
