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
If you are working with local resources, you can remove them by running the following command in the installation folder:  
```bash
$ make delete-resources
```
Look for the local docker images and delete them. If you already passed the [Helm deployment step]({% link estela/installation/installation.md %}#3-helm-deployment){:target="_blank"}, some docker volumes were created, delete them too.