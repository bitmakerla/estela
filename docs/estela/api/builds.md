---
layout: page
title: Builds
parent: API
grand_parent: estela
---

# Builds

Estela build docker images for projects in each deploy. The `Build` class and its implementations determine how this building process is carried out. It's possible to define different types of builds, whether you want to build locally, in the cloud, or using any other method.

Currently, we provide implementations for a default build (`DefaultBuild`) and builds using Google Cloud Platform (`GCPBuild`). However, we encourage users to define and add their own implementations if they need a customized building process.

## Defining a New Build

To define a new type of build, create a new class inheriting from the base `Build` class. This new class should at least define two attributes:

- **name**: The name of the build. This is purely informational.
- **filename**: Indicates the file that will be used to carry out the build process.

Example of a new implementation:

```python
from builds import Build

class MyCustomBuild(Build):
    name = "my_custom_build"
    filename = "my_custom_build_script.py"
```

## Current Implementations

### DefaultBuild

This is the standard build and relies on the `build.py` file for constructing images.

### GCPBuild

Constructs images using Google Cloud Platform and relies on the `gcp_build.py` file.

## Base Class: Build

This is the class all implementations should inherit from and looks like this:

```python
class Build():
    name = ""
    filename = ""
```

If you decide to add more functionalities or methods to your builds, make sure to add them in this base class and document their purpose and usage.
