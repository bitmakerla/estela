---
layout: page
title: Components
parent: Web
grand_parent: estela
---

# Components
estela has five important general categories of **components**:

## Auth
estela web contains components to log in and to register. When registering, the user will need to verify their email before being allowed to log in.

## Projects 🗄
Projects work like a container for spiders and jobs, and essentially represent a scraping project per se. The **Project** contains **Spiders** and **Jobs**.
estela web contains components for the creation, detail, and list view of projects.

## Spiders 🕷
A **Spider** is a class that defines a class with methods to scrape a website. A project can contain several **spiders**.
estela web contains components for the detail and list view of spiders per project. Creating spiders is not something manual
in the frontend, and must be done via [estela-cli](https://github.com/bitmakerla/estela-cli) by deploying a project. The project's spiders will then appear
in the graphical interface for the project.

## Jobs 📂
A **Job** is an instance of an spider that will be run. The **job** records and stores the data extracted by the spider.
estela web contains components for the creation, detail, list view of jobs per spider, and list view of jobs per project.

## Cron jobs 🗓

A **cron job** defines a **PeriodicTask** that will be run in the API. The scheduler is in charge to launch a job on schedule.
estela web contains components for the creation, detail, and list view of cron jobs per spider.

