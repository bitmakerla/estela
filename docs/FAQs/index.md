---
layout: home
title: FAQs
nav_order: 6
---

# Estela FAQs  
Check the list of common questions and issues in Estela, check the topics (e.g.**[Installation]**) and choose your question.

## Estela Installation
### Q: How to start again installation process if I had mistakes in the [*resources guide*]({% link estela/installation/resources.md %}){:target="_blank"}  
**Ans:** If you had some mistakes, such as the ones listed in this section, during the installation process and want to start again you can use this command `$minikube delete --all --purge` to clean all the corrupted images generated and start again the process, this applies also If you have had troubles after [*variables guide*]({% link estela/installation/helm-variables.md %}){:target="_blank"}.

### Q: How to solve the following error during `make resources` step:  
```
E1109 18:46:36.969158    6835 logs.go:192] command /bin/bash -c "sudo /var/lib/minikube/
binaries/v1.25.3/kubectl describe nodes --kubeconfig=/var/lib/minikube/kubeconfig" failed
 with error: /bin/bash -c "sudo /var/lib/minikube/binaries/v1.25.3/kubectl describe nodes
  --kubeconfig=/var/lib/minikube/kubeconfig": Process exited with status 1
stdout:
stderr:
The connection to the server localhost:8443 was refused - did you specify the right host or port?
 output: "\n** stderr ** \nThe connection to the server localhost:8443 was refused - did you specify the right host or port?\n\n** /stderr **"
❗  unable to fetch logs for: describe nodes
```
**Ans:** In some systems the following option `--feature-gates="TTLAfterFinished=true"`  on the `installation/Makefile` document gives an error, we will fix it soon, just delete the selected line.
```
28    -. ./local/.env && minikube start \
29	           --feature-gates="TTLAfterFinished=true" \  <-- delete this line
30		   --insecure-registry=$${HOST_REGISTRY} \
31		   --cpus="2" \
32                   --memory="2500mb" \
33		   --disk-size="20000mb"
34	-minikube addons enable metrics-server
```