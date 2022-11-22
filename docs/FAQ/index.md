---
layout: home
title: FAQ
nav_order: 6
---

# estela's Frequently Asked Questions  
Below you will find answers to the questions we get asked the most about different estela topics.  

## estela Installation
### Q: How do I restart the installation process?  
**Answer:** You may face some problems if the installation guides are not followed in order. If you think you missed a critical step and want to start over, you should remove all the deployed resources.
If you are working with local resources, you can remove them by running the following commands:  
```bash
$ minikube delete --all --purge
```
Look for the local docker images and delete them. If you already passed the [Helm deployment step]({% link estela/installation/helm-variables.md %}){:target="_blank"}, some docker volumes were created, delete them too.