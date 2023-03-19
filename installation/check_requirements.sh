#!/bin/bash


function check_version {
  local package="$1"
  local cmd="$2"
  local expected_version="$3"
  local version=$cmd
 
  IFS='.' read -ra version_arr <<< "$version"
  local major=${version_arr[0]#v}
  local minor=${version_arr[1]}
  
  IFS='.' read -ra e_version_arr <<< "$expected_version"
  local expected_major=${e_version_arr[0]}
  local expected_minor=${e_version_arr[1]}
  
  if [ "$major" -lt "$expected_major" ] || [ "$minor" -lt "$expected_minor" ]; then
    echo "Warning: $package version is incorrect. Expected $expected_version but got $version"
  else
    echo "$package version is correct: $version"
  fi
}

check_version "docker" `(docker --version 2>&1 | awk '{print $3}')` "20.10"
check_version "kubectl" `(kubectl version --short 2>&1 | awk '/Client/{print $3}')` "1.23"
check_version "helm" `(helm version --short | awk '{print $1}')` "3.9"
check_version "yarn" `(yarn --version | awk '{print $1}')` "1.22"
check_version "node" `node -v` "18.0"
check_version "python" `(python -V | awk '{print $2}')` "3.9"
check_version "minikube" `minikube version --short` "1.25"
